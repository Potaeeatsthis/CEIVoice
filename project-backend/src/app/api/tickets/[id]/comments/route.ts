// src/app/api/tickets/[id]/comments/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { sendNewMessageNotification } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value || 'USER';

    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { content, is_internal } = body;

    if (!content) return NextResponse.json({ error: 'Content is required' }, { status: 400 });

    // 1. Mark Sender as Online
    await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    // 2. Insert Comment
    const isStaff = userRole === 'ADMIN' || userRole === 'ASSIGNEE';
    const finalIsInternal = isStaff ? (is_internal || false) : false;

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        ticket_id: id,
        user_id: userId,
        message: content,
        is_internal: finalIsInternal,
      })
      .select('*, user:users(full_name, email)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // 3. Mark Ticket as Read for Sender
    await supabaseAdmin
      .from('ticket_reads')
      .upsert({ ticket_id: id, user_id: userId, last_read_at: new Date().toISOString() });

    // 4. NOTIFICATION LOGIC (Offline + Cooldown)
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select(`
        id, title, assigned_to, created_by, last_email_sent_at,
        created_by_user:users!tickets_created_by_fkey(id, email, last_seen_at),
        assigned_to_user:users!tickets_assigned_to_fkey(id, email, last_seen_at)
      `)
      .eq('id', id)
      .single();

    if (ticket) {
      const isSenderAssignee = userId === ticket.assigned_to;
      const recipient = isSenderAssignee ? ticket.created_by_user : ticket.assigned_to_user;

      if (recipient && recipient.email) {
        const now = new Date();
        const lastSeen = recipient.last_seen_at ? new Date(recipient.last_seen_at) : new Date(0);
        const lastEmail = ticket.last_email_sent_at ? new Date(ticket.last_email_sent_at) : new Date(0);

        const isOffline = (now.getTime() - lastSeen.getTime()) > (5 * 60 * 1000); 
        const isCooldownOver = (now.getTime() - lastEmail.getTime()) > (10 * 60 * 1000);

        if (isOffline && isCooldownOver) {
          console.log(`📧 Sending Batch Notification to ${recipient.email}`);
          await sendNewMessageNotification(
            recipient.email,
            ticket.id.toString(),
            ticket.title || "Untitled",
            comment.user?.full_name || "Support",
            content
          );
          await supabaseAdmin
            .from('tickets')
            .update({ last_email_sent_at: now.toISOString() })
            .eq('id', id);
        } else {
          console.log(`🔕 Skipped Email: Offline=${isOffline}, CooldownOver=${isCooldownOver}`);
        }
      }
    }

    return NextResponse.json(comment);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


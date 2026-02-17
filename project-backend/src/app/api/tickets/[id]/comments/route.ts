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
    const { content, is_internal, attachments } = body; 

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
    }

    // Update Last Seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    const isStaff = userRole === 'ADMIN' || userRole === 'ASSIGNEE';
    const finalIsInternal = isStaff ? (is_internal || false) : false;

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        ticket_id: id,
        user_id: userId,
        message: content || '',
        is_internal: finalIsInternal,
        attachments: attachments || [],
      })
      .select('*, user:users(full_name, email)')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Mark as Read
    await supabaseAdmin
      .from('ticket_reads')
      .upsert({ ticket_id: id, user_id: userId, last_read_at: new Date().toISOString() });

    // Notification Logic
    const { data: ticket } = await supabaseAdmin.from('tickets').select('*, created_by_user:users!tickets_created_by_fkey(*), assigned_to_user:users!tickets_assigned_to_fkey(*)').eq('id', id).single();
    
    if (ticket) {
      const isSenderAssignee = userId === ticket.assigned_to;
      const recipient = isSenderAssignee ? ticket.created_by_user : ticket.assigned_to_user;
      
      if (recipient?.email) {
        const now = new Date();
        const lastSeen = recipient.last_seen_at ? new Date(recipient.last_seen_at) : new Date(0);
        const lastEmail = ticket.last_email_sent_at ? new Date(ticket.last_email_sent_at) : new Date(0);
        
        const isOffline = (now.getTime() - lastSeen.getTime()) > (5 * 60 * 1000); 
        const isCooldownOver = (now.getTime() - lastEmail.getTime()) > (10 * 60 * 1000);

        if (isOffline && isCooldownOver) {
          await sendNewMessageNotification(
            recipient.email,
            ticket.id.toString(),
            ticket.title || "Untitled",
            comment.user?.full_name || "Support",
            content || (attachments?.length ? "[Sent an attachment]" : "Sent a message")
          );
          await supabaseAdmin.from('tickets').update({ last_email_sent_at: now.toISOString() }).eq('id', id);
        }
      }
    }

    return NextResponse.json(comment);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

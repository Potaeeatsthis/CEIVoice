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
    
    // [LOG] Incoming Request
    console.log(`\n--- [Comment API] Processing Ticket #${id} ---`);

    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value || 'USER';

    if (!userId) {
      console.log('❌ Unauthorized: No user_id cookie');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, is_internal, attachments } = body; 

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
    }

    // 1. Update Sender's Last Seen
    await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    const isStaff = userRole === 'ADMIN' || userRole === 'ASSIGNEE';
    const finalIsInternal = isStaff ? (is_internal || false) : false;

    // 2. Insert the Comment
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

    if (error) {
      console.error('❌ Database Error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Comment created (ID: ${comment.id})`);

    // 3. Mark Ticket as Read for Sender
    await supabaseAdmin
      .from('ticket_reads')
      .upsert({ ticket_id: id, user_id: userId, last_read_at: new Date().toISOString() });

    // 4. Notification Logic
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('*, created_by_user:users!tickets_created_by_fkey(*), assigned_to_user:users!tickets_assigned_to_fkey(*)')
      .eq('id', id)
      .single();
    
    if (ticket) {
      // Determine Recipient
      const isSenderAssignee = userId === ticket.assigned_to;
      const recipient = isSenderAssignee ? ticket.created_by_user : ticket.assigned_to_user;
      
      console.log(`🔍 Notification Check: Sender is ${isSenderAssignee ? 'Assignee' : 'User'}. Recipient is ${recipient?.email || 'Unknown'}`);

      if (recipient?.email) {
        const now = new Date();
        const lastSeen = recipient.last_seen_at ? new Date(recipient.last_seen_at) : new Date(0);
        const lastEmail = ticket.last_email_sent_at ? new Date(ticket.last_email_sent_at) : new Date(0);
        
        // Time Calculations
        const diffSeen = now.getTime() - lastSeen.getTime();
        const diffEmail = now.getTime() - lastEmail.getTime();
        
        // CHECK 1: Is user "Offline"? (Inactive > 5 mins)
        const isOffline = diffSeen > (5 * 60 * 1000); 
        
        // CHECK 2: Is Cooldown Over? (Last email > 10 mins ago)
        const isCooldownOver = diffEmail > (10 * 60 * 1000);

        // [LOG] Debugging the Logic
        console.log(`📊 Logic Stats for ${recipient.email}:`);
        console.log(`   - Last Seen: ${Math.floor(diffSeen / 1000 / 60)} mins ago (Offline? ${isOffline})`);
        console.log(`   - Last Email: ${Math.floor(diffEmail / 1000 / 60)} mins ago (Cooldown Over? ${isCooldownOver})`);

        if (isOffline && isCooldownOver) {
          console.log(`📧 Sending Email Notification to ${recipient.email}...`);
          
          await sendNewMessageNotification(
            recipient.email,
            ticket.id.toString(),
            ticket.title || "Untitled",
            comment.user?.full_name || "Support",
            content || (attachments?.length ? "[Sent an attachment]" : "Sent a message")
          );
          
          await supabaseAdmin
            .from('tickets')
            .update({ last_email_sent_at: now.toISOString() })
            .eq('id', id);
            
          console.log(`✅ Email sent & timestamp updated.`);
        } else {
          console.log(`🚫 Email Skipped.`);
          if (!isOffline) console.log(`   Reason: User is ONLINE (Active within last 5 mins).`);
          else if (!isCooldownOver) console.log(`   Reason: COOLDOWN ACTIVE (Last email sent < 10 mins ago).`);
        }
      }
    }

    return NextResponse.json(comment);

  } catch (error: any) {
    console.error('❌ Server Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

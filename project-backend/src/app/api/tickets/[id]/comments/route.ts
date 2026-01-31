// src/app/api/tickets/[id]/comments/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { publishToQueue } from '@/lib/rabbitmq';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value || 'USER';

    // 1. Check Auth
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized: No User ID' }, { status: 401 });
    }

    const body = await request.json();
    const { content, is_internal } = body;

    // 2. Validate Input
    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // 3. Presence Lite: Update Sender's "Last Seen"
    // This ensures the system knows the sender is online right now.
    await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    // 4. Insert Comment
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

    if (error) {
      console.error('Supabase Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 5. Update Sender's Read Status
    // Since they just wrote a comment, they have "read" the ticket.
    await supabaseAdmin
      .from('ticket_reads')
      .upsert({ 
        ticket_id: id, 
        user_id: userId, 
        last_read_at: new Date().toISOString() 
      });

    // 6. RabbitMQ: Offload Notification Logic
    // We send a generic "new_message" event. The Worker determines if emails are needed.
    const taskPayload = {
      type: 'new_message',
      ticket_id: id,
      comment_id: comment.id,
      sender_id: userId,
      sender_role: userRole,
      content: content,
      is_internal: finalIsInternal,
      created_at: comment.created_at
    };

    // Ensure 'notifications' queue matches your consumer/worker script
    await publishToQueue('notifications', JSON.stringify(taskPayload));

    return NextResponse.json(comment);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

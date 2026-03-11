// src/app/api/tickets/route.ts 
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { publishToQueue } from '@/lib/rabbitmq';
import { sendTicketReceivedEmail } from '@/lib/email';

export async function GET(request: Request) {
  try {
    const now = new Date().toISOString();

    // 1️⃣ Get overdue tickets first (debug safe way)
    const { data: overdueTickets, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('id, deadline, status')
      .lt('deadline', now)
      .not('deadline', 'is', null)
      .in('status', ['NEW', 'IN PROGRESS']); // only fail active tickets

    if (fetchError) {
      console.error("Fetch overdue error:", fetchError);
    }

    // 2️⃣ Update them to FAILED
    let failedTickets: any[] = [];

    if (overdueTickets && overdueTickets.length > 0) {
      const ids = overdueTickets.map(t => t.id);

      const { data: updated, error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({
          status: 'FAILED',
          failed_at: now
        })
        .in('id', ids)
        .select('id');

      if (updateError) {
        console.error("Update failed error:", updateError);
      }

      failedTickets = updated || [];
      console.log("Tickets marked FAILED:", failedTickets);
    }

    // 3️⃣ Insert system comment
    if (failedTickets.length > 0) {
      const systemComments = failedTickets.map(ticket => ({
        ticket_id: ticket.id,
        type: 'system',
        is_internal: false,
        created_at: now
      }));

      const { error: commentError } = await supabaseAdmin
        .from('comments')
        .insert(systemComments);

      if (commentError) {
        console.error("Insert comment error:", commentError);
      }
    }

    // 4️⃣ Return updated tickets list
    const { data: tickets, error } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(tickets);

  } catch (error: any) {
    console.error('GET Tickets Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Request body cannot be empty' },
        { status: 400 }
      );
    }

    const { email, message, title, img } = body;
    const userId = request.headers.get('x-user-id');

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        description: message,
        status: 'DRAFT',
        created_by: userId || null,
        user_email: email,
        origin: 'web',
        title: title || null,
        img: img || null
      })
      .select()
      .single();

    if (error) throw error;

    // Send confirmation email (non-blocking)
    const recipientEmail = email || (userId ? await supabaseAdmin
      .from('users')
      .select('email')
      .eq('id', userId)
      .single()
      .then(({ data }) => data?.email)
      : null);

    if (recipientEmail) {
      // Fetch user details for name and role if logged in
      let recipientName = 'User';
      let recipientRole = 'USER';

      if (userId) {
        const { data: userRow } = await supabaseAdmin
          .from('users')
          .select('full_name, role')
          .eq('id', userId)
          .single();

        if (userRow) {
          recipientName = userRow.full_name || 'User';
          recipientRole = userRow.role || 'USER';
        }
      }

      sendTicketReceivedEmail(
        recipientEmail,
        recipientName,
        ticket.id,
        ticket.title || `Ticket #${ticket.id}`,
        ticket.description,
        recipientRole
      ).catch((err) => console.error('[Ticket Received Email] Failed:', err));
    }

    const QUEUE_NAME = 'ticket_processing_queue';

    const payload = JSON.stringify({
      ticket_id: ticket.id,
      description: ticket.description
    });

    await publishToQueue(QUEUE_NAME, payload);

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      message: 'Ticket submitted successfully.'
    });

  } catch (error: any) {
    console.error('Submit Error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

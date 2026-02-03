// src/app/api/tickets/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { publishToQueue } from '@/lib/rabbitmq';

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Request body cannot be empty' }, { status: 400 });
    }

    const { email, message, title } = body;
    const userId = request.headers.get('x-user-id');

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        description: message,
        status: 'DRAFT',
        created_by: userId || null, 
        user_email: email, 
        origin: 'web',
        title: title || null
      })
      .select()
      .single();

    if (error) throw error;

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

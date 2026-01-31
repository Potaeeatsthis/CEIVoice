// src/app/api/tickets/route.ts

import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { publishToQueue } from '@/lib/rabbitmq';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');

  // Get Role and ID from headers (set by middleware)
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- USE RPC for Unread Counts ---
  // We call the Postgres function to get ticket data + unread_count in one go
  let query = supabaseAdmin.rpc('get_tickets_with_stats', { 
    current_user_id: userId 
  });

  // --- ROLE RESTRICTION ---
  if (userRole === 'USER') {
    // Users can ONLY see tickets they created
    query = query.eq('created_by', userId);
  } else {
    // Admins/Assignees can filter manually
    if (assignee) query = query.eq('assigned_to', assignee);

    // Default: If I am an Assignee and I didn't ask for a specific filter,
    // show me MY tickets.
    if (userRole === 'ASSIGNEE' && !assignee && !status) {
       query = query.eq('assigned_to', userId);
    }
  }

  // Optional: Filter by Status
  if (status) query = query.eq('status', status);

  // Sort by newest first
  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("Supabase Fetch Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

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


    await publishToQueue(ticket.id.toString(), ticket.description);


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

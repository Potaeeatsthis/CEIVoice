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

  // ✅ FIX 1: Use Explicit Foreign Key Constraint Names
  // We use 'tickets_created_by_fkey' and 'tickets_assigned_to_fkey' so Supabase
  // knows exactly which relationship to use.
  // We alias them (e.g. 'assigned_to_user:') so the frontend gets the name it expects.
  let query = supabase.from('tickets').select(`
    *,
    created_by_user:users!tickets_created_by_fkey (full_name, email),
    assigned_to_user:users!tickets_assigned_to_fkey (full_name)
  `);

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
  // ------------------------

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

    // ✅ FIX 2: Correctly map inputs to Database Columns
    // Frontend sends 'email' -> DB expects 'user_email'
    // Frontend sends 'message' -> DB expects 'description'
    const { email, message, title } = body; 
    const userId = request.headers.get('x-user-id');

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        description: message,       // Map message -> description
        status: 'DRAFT',
        created_by: userId || null, // Authenticated ID or null
        user_email: email,          // Map email -> user_email
        origin: 'web',
      })
      .select()
      .single();

    if (error) throw error;

    // Trigger AI processing via RabbitMQ
    await publishToQueue(ticket.id, ticket.description);

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

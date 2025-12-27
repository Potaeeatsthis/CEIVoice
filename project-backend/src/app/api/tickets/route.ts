// src/app/api/tickets/route.ts
import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { publishToQueue } from '@/lib/rabbitmq';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');

  // Get Role and ID from Middleware
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id');

  let query = supabase.from('tickets').select(`
    *,
    users!created_by (full_name, email),
    assigned_to_user:users!assigned_to (full_name)
  `);

  // --- ROLE RESTRICTION ---
  if (userRole === 'USER') {
    // Users can ONLY see tickets they created
    query = query.eq('created_by', userId);
  } else {
    // Admins/Assignees can filter manually
    if (assignee) query = query.eq('assigned_to', assignee);
    // (Optional) Assignees usually default to seeing their own tickets
    if (userRole === 'ASSIGNEE' && !assignee && !status) {
       query = query.eq('assigned_to', userId); 
    }
  }
  // ------------------------

  if (status) query = query.eq('status', status);

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
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

    const { email, message } = body; 
    const userId = request.headers.get('x-user-id');

    if (!email || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .insert({
        description: message,
        status: 'DRAFT',
        created_by: userId || null, 
      })
      .select()
      .single();

    if (error) throw error;

    await publishToQueue(ticket.id, ticket.description);

    return NextResponse.json({ 
      success: true, 
      ticketId: ticket.id, 
      message: 'Ticket submitted.' 
    });

  } catch (error: any) {
    console.error('Submit Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/tickets/[id]/comments/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET: Fetch comments
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userRole = request.headers.get('x-user-role');

  let query = supabase
    .from('comments')
    .select('*, users(full_name, email, role)')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  // --- ROLE RESTRICTION ---
  if (userRole === 'USER') {
    // Users cannot see Internal notes
    query = query.eq('type', 'PUBLIC');
  }
  // ------------------------

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  return NextResponse.json({ data });
}

// POST: Add comment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  let body;
  try {
    body = await request.json();
  } catch(e) {
    return NextResponse.json({ error: 'Body required' }, { status: 400 });
  }

  let { message, type } = body; 

  if (!message) {
    return NextResponse.json({ error: 'Message required' }, { status: 400 });
  }

  // --- ROLE RESTRICTION ---
  // Users can ONLY post Public comments
  if (userRole === 'USER') {
    type = 'PUBLIC'; 
  } else {
    // Staff defaults to PUBLIC if not specified, but can be INTERNAL
    type = type || 'PUBLIC';
  }
  // ------------------------

  const { data, error } = await supabase
    .from('comments')
    .insert({
      ticket_id: parseInt(id),
      user_id: userId,
      message,
      type
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, data });
}

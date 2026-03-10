// src/app/api/tickets/[id]/follow/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
  }

  // Upsert — safe to call even if already following
  const { error } = await supabaseAdmin
    .from('ticket_followers')
    .upsert(
      { ticket_id: ticketId, user_id: userId },
      { onConflict: 'ticket_id,user_id', ignoreDuplicates: true }
    );

  if (error) {
    console.error('Follow error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, following: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const ticketId = parseInt(id, 10);
  if (isNaN(ticketId)) {
    return NextResponse.json({ error: 'Invalid ticket ID' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('ticket_followers')
    .delete()
    .eq('ticket_id', ticketId)
    .eq('user_id', userId);

  if (error) {
    console.error('Unfollow error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, following: false });
}

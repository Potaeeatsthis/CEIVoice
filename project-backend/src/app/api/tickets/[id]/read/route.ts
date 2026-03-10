// src/app/api/tickets/[id]/read/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Update Activity (Presence Lite)
  // This tells the system "I am online right now"
  await supabaseAdmin
    .from('users')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', userId);

  // 2. Mark Ticket as Read
  // This clears the unread badge for this specific ticket
  const { error } = await supabaseAdmin
    .from('ticket_reads')
    .upsert({ 
        ticket_id: id, 
        user_id: userId, 
        last_read_at: new Date().toISOString() 
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

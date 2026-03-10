// src/app/api/tickets/[id]/logs/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // If USER role, verify they own the ticket before showing logs
  if (userRole === 'USER') {
    const { data: ticket } = await supabaseAdmin
      .from('tickets')
      .select('created_by')
      .eq('id', id)
      .single();

    if (!ticket || ticket.created_by !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const { data, error } = await supabaseAdmin
    .from('audit_logs')
    .select('*, users(full_name)')
    .eq('ticket_id', id)
    .order('timestamp', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
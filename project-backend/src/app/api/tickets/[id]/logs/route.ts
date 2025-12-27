// src/app/api/tickets/[id]/logs/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userRole = request.headers.get('x-user-role');

  // --- ROLE RESTRICTION ---
  if (userRole === 'USER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ------------------------

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, users(full_name)')
    .eq('ticket_id', id)
    .order('timestamp', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

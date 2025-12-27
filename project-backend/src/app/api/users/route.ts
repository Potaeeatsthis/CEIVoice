// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const userRole = request.headers.get('x-user-role');

  // --- ROLE RESTRICTION ---
  if (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ------------------------

  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  let query = supabase.from('users').select('id, full_name, email, role, scope');

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

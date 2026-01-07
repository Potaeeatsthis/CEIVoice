// src/app/api/admin/drafts/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  const userRole = request.headers.get('x-user-role');

  // --- ROLE RESTRICTION ---
  // Only Admins can view the draft queue 
  if (userRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ------------------------

  // Fetch tickets specifically with 'Draft' status
  // Requirement: Display AI-suggested Title, original email, and time 
  const { data, error } = await supabase
    .from('tickets')
    .select('id, title, user_email, created_at, category, ai_summary')
    .eq('status', 'Draft')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}

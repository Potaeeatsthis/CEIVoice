// src/app/api/reports/leaderboard/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select('assigned_to_user:users!tickets_assigned_to_fkey(full_name)')
      .eq('status', 'SOLVED');

    if (error) throw error;

    const counts: Record<string, number> = {};
    (data || []).forEach((t: any) => {
      const name = t.assigned_to_user?.full_name;
      if (name) counts[name] = (counts[name] || 0) + 1;
    });

    const leaderboard = Object.entries(counts)
      .map(([full_name, solved]) => ({ full_name, solved }))
      .sort((a, b) => b.solved - a.solved)
      .slice(0, 6);

    return NextResponse.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard fetch error:', err);
    return NextResponse.json({ error: 'Failed to fetch leaderboard' }, { status: 500 });
  }
}

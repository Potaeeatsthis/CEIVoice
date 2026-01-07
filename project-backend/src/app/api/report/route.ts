// src/app/api/reports/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  // 1. Get User Context from Headers (set by Middleware/Client)
  const userRole = request.headers.get('x-user-role');
  const userId = request.headers.get('x-user-id'); // We need the ID for personal stats

  if (!userRole || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // --- SCENARIO A: ADMIN REPORT (Global Stats) [EP06-ST003] ---
    if (userRole === 'ADMIN') {
      // 1. Total Volume
      const { count: totalTickets } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true });

      // 2. Tickets by Status (Breakdown)
      const { data: tickets } = await supabase
        .from('tickets')
        .select('status, category');

      // Simple aggregation in JS (for speed without complex SQL functions)
      const statusBreakdown = tickets?.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const categoryBreakdown = tickets?.reduce((acc: any, t) => {
        acc[t.category || 'Uncategorized'] = (acc[t.category || 'Uncategorized'] || 0) + 1;
        return acc;
      }, {});

      return NextResponse.json({
        type: 'ADMIN_GLOBAL',
        metrics: {
          total_volume: totalTickets,
          by_status: statusBreakdown,
          by_category: categoryBreakdown,
          // Note: "Avg Resolution Time" usually requires a dedicated SQL function or calculating 
          // difference between created_at and updated_at for all solved tickets.
        }
      });
    }

    // --- SCENARIO B: ASSIGNEE REPORT (Personal Stats) [EP06-ST004] ---
    if (userRole === 'ASSIGNEE') {
      // 1. Current Workload (Active tickets assigned to me)
      const { count: currentWorkload } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .neq('status', 'SOLVED')
        .neq('status', 'FAILED');

      // 2. Performance (Solved in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { count: solvedRecently } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to', userId)
        .in('status', ['SOLVED', 'FAILED'])
        .gte('updated_at', thirtyDaysAgo.toISOString());

      return NextResponse.json({
        type: 'ASSIGNEE_PERSONAL',
        metrics: {
          current_active_tickets: currentWorkload,
          solved_last_30_days: solvedRecently
        }
      });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

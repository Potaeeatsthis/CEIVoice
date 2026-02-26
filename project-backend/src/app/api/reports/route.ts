// src/app/api/reports/route.ts

	import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  try {
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (user?.role === 'ADMIN') {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startDateIso = startDate.toISOString();

      const { data: tickets, error } = await supabaseAdmin
        .from('tickets')
        .select(`
          created_at, 
          updated_at, 
          status, 
          category,
          ai_solution,
          assigned_to_user:users!tickets_assigned_to_fkey(full_name)
        `)
        .neq('status', 'DRAFT')
        .gte('created_at', startDateIso);

      if (error) throw error;

      // Calculations
      const totalTickets = tickets.length;

      const statusBreakdown = tickets.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const categoryBreakdown = tickets.reduce((acc: any, t) => {
        const cat = t.category || 'Uncategorized';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      const volumeByDate = tickets.reduce((acc: any, t) => {
        const date = t.created_at.split('T')[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

      const volumeTimeline = Object.keys(volumeByDate).sort().map(date => ({
        date, count: volumeByDate[date]
      }));

      // Assignee Performance Logic
      const assigneeStats: Record<string, any> = {};
      tickets.forEach(t => {
        const assigneeName = t.assigned_to_user?.full_name || 'Unassigned';
        if (!assigneeStats[assigneeName]) {
          assigneeStats[assigneeName] = { name: assigneeName, solved: 0, pending: 0, total: 0 };
        }
        assigneeStats[assigneeName].total += 1;
        if (t.status === 'SOLVED') {
          assigneeStats[assigneeName].solved += 1;
        } else if (t.status === 'NEW' || t.status === 'IN_PROGRESS') {
          assigneeStats[assigneeName].pending += 1;
        }
      });
      const assigneePerformance = Object.values(assigneeStats).sort((a: any, b: any) => b.total - a.total);

      let aiAssisted = 0;
      let manual = 0;

      tickets.forEach(t => {
        // If an AI solution exists and isn't just empty space, it's AI-assisted
        if (t.ai_solution && t.ai_solution.trim() !== '') {
          aiAssisted++;
        } else {
          manual++;
        }
      });

      const aiPerformance = {
        assisted: aiAssisted,
        manual: manual,
        automation_rate: totalTickets > 0 ? Math.round((aiAssisted / totalTickets) * 100) : 0
      };

      const solvedTickets = tickets.filter(t => t.status === 'SOLVED' && t.updated_at && t.created_at);
      let totalTimeMs = 0;
      solvedTickets.forEach(t => {
        totalTimeMs += (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
      });
      const avgResolutionHrs = solvedTickets.length > 0 
        ? Math.round((totalTimeMs / solvedTickets.length) / (1000 * 60 * 60)) 
        : 0;

      return NextResponse.json({
        type: 'ADMIN_GLOBAL',
        metrics: {
          period_days: days,
          total_volume: totalTickets,
          avg_resolution_hrs: avgResolutionHrs,
          pending_backlog: (statusBreakdown['NEW'] || 0) + (statusBreakdown['IN_PROGRESS'] || 0),
          by_status: statusBreakdown,
          by_category: categoryBreakdown,
          volume_timeline: volumeTimeline,
          assignee_performance: assigneePerformance,
          ai_performance: aiPerformance
        }
      });
    }

    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

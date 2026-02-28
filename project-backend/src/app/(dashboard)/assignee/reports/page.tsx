// src/app/(dashboard)/assignee/reports/page.tsx

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function AssigneeReportsPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  if (!userId || userRole !== 'ASSIGNEE') {
    redirect('/login');
  }

  const { data: tickets } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('assigned_to', userId);

  const safeTickets = tickets || [];

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // Workload
  const currentlyAssigned = safeTickets.filter((t: any) => t.status === 'NEW' || t.status === 'IN_PROGRESS');
  const newCount = safeTickets.filter((t: any) => t.status === 'NEW').length;
  const inProgressCount = safeTickets.filter((t: any) => t.status === 'IN_PROGRESS').length;

  // Resolutions
  const solvedCount = safeTickets.filter((t: any) => t.status === 'SOLVED').length;
  const failedCount = safeTickets.filter((t: any) => t.status === 'FAILED').length;
  const resolvedTickets = safeTickets.filter((t: any) => t.status === 'SOLVED' || t.status === 'FAILED');

  const resolvedLast30Days = resolvedTickets.filter((t: any) => {
    const actionDate = new Date(t.updated_at || t.created_at);
    return actionDate >= thirtyDaysAgo;
  }).length;

  const solvedLast30Days = safeTickets.filter((t: any) => {
    if (t.status !== 'SOLVED') return false;
    const actionDate = new Date(t.updated_at || t.created_at);
    return actionDate >= thirtyDaysAgo;
  }).length;

  const failedLast30Days = safeTickets.filter((t: any) => {
    if (t.status !== 'FAILED') return false;
    const actionDate = new Date(t.updated_at || t.created_at);
    return actionDate >= thirtyDaysAgo;
  }).length;

  // Rates
  const completionRate = resolvedTickets.length > 0
    ? Math.round((solvedCount / resolvedTickets.length) * 100)
    : 0;

  const completionBarWidth = completionRate;

  // Avg Resolution Time
  let avgResolutionTime = 'N/A';
  let avgResolutionSub = 'No resolved tickets yet';
  if (resolvedTickets.length > 0) {
    let validResolutions = 0;
    const totalMs = resolvedTickets.reduce((acc: number, t: any) => {
      if (!t.updated_at) return acc;
      validResolutions++;
      return acc + (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime());
    }, 0);

    if (validResolutions > 0) {
      const avgMs = totalMs / validResolutions;
      const hours = Math.floor(avgMs / (1000 * 60 * 60));
      const days = Math.floor(hours / 24);
      if (days > 0) { avgResolutionTime = `${days}d ${hours % 24}h`; }
      else if (hours > 0) { avgResolutionTime = `${hours}h`; }
      else { avgResolutionTime = '< 1h'; }
      avgResolutionSub = 'Average from open to close';
    } else {
      avgResolutionTime = '—';
      avgResolutionSub = 'Timestamps pending';
    }
  }

  const statusBreakdown = [
    { label: 'New', count: newCount, color: 'bg-blue-500', textColor: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/10' },
    { label: 'In Progress', count: inProgressCount, color: 'bg-amber-500', textColor: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10' },
    { label: 'Solved', count: solvedCount, color: 'bg-emerald-500', textColor: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { label: 'Failed', count: failedCount, color: 'bg-red-500', textColor: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10' },
  ];

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-end justify-between pb-5 border-b border-zinc-800">
        <div>
          <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1">Assignee</p>
          <h1 className="text-3xl font-bold text-white tracking-tight">My Performance</h1>
          <p className="text-sm text-zinc-400 mt-1">Personal metrics and workload analytics</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-600">Report window</p>
          <p className="text-sm font-medium text-zinc-400">Last 30 days</p>
        </div>
      </div>

      {/* ── Top KPI Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Active Workload */}
        <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Active Now</p>
          <p className="text-5xl font-black text-white mt-2 mb-4 tabular-nums">{currentlyAssigned.length}</p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-1 rounded-lg">
              {newCount} New
            </span>
            <span className="text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-1 rounded-lg">
              {inProgressCount} In Progress
            </span>
          </div>
        </div>

        {/* Resolved Last 30 Days */}
        <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent pointer-events-none" />
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Closed (30d)</p>
          <p className="text-5xl font-black text-white mt-2 mb-4 tabular-nums">{resolvedLast30Days}</p>
          <div className="flex gap-2 flex-wrap">
            <span className="text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-lg">
              {solvedLast30Days} Solved
            </span>
            <span className="text-[11px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded-lg">
              {failedLast30Days} Failed
            </span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Success Rate</p>
          <p className="text-5xl font-black text-emerald-400 mt-2 mb-3 tabular-nums">{completionRate}%</p>
          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
              style={{ width: `${completionBarWidth}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-600">{solvedCount} solved of {resolvedTickets.length} closed</p>
        </div>

        {/* Avg Resolution */}
        <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Avg Resolution</p>
          <p className="text-5xl font-black text-white mt-2 mb-4 tabular-nums leading-none">{avgResolutionTime}</p>
          <p className="text-[11px] text-zinc-500">{avgResolutionSub}</p>
        </div>

      </div>

      {/* ── Status Breakdown + Historical ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Status Breakdown */}
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-5">Status Breakdown</h2>
          <div className="space-y-4">
            {statusBreakdown.map(({ label, count, color, textColor }) => {
              const pct = safeTickets.length > 0 ? Math.round((count / safeTickets.length) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-zinc-400">{label}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold tabular-nums ${textColor}`}>{count}</span>
                      <span className="text-[11px] text-zinc-600 w-8 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${color} rounded-full opacity-80`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* All-Time Summary */}
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-white mb-5">All-Time Summary</h2>
          <div className="flex flex-col gap-3">

            <div className="flex items-center justify-between bg-zinc-900/50 border border-zinc-800/60 rounded-xl px-4 py-3">
              <div>
                <p className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">Total Assigned</p>
                <p className="text-2xl font-black text-white tabular-nums mt-0.5">{safeTickets.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between bg-emerald-950/20 border border-emerald-900/30 rounded-xl px-4 py-3">
              <div>
                <p className="text-[11px] text-emerald-500/70 uppercase tracking-wider font-semibold">Lifetime Solved</p>
                <p className="text-2xl font-black text-emerald-400 tabular-nums mt-0.5">{solvedCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between bg-red-950/20 border border-red-900/30 rounded-xl px-4 py-3">
              <div>
                <p className="text-[11px] text-red-500/70 uppercase tracking-wider font-semibold">Lifetime Failed</p>
                <p className="text-2xl font-black text-red-400 tabular-nums mt-0.5">{failedCount}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}

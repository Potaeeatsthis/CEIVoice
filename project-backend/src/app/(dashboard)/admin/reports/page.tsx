// src/app/(dashboard)/admin/reports/page.tsx

'use client';

import { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

export default function AdminReportsPage() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const res = await fetch(`/api/reports?days=${period}`);
      const json = await res.json();
      if (json.metrics) setData(json.metrics);
      setLoading(false);
    };
    fetchReports();
  }, [period]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 gap-3">
      <div className="w-5 h-5 border-2 border-zinc-700 border-t-zinc-300 rounded-full animate-spin" />
      <span className="text-sm text-zinc-500">Loading metrics...</span>
    </div>
  );
  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <span className="text-sm text-red-400">Failed to load reports.</span>
    </div>
  );

  const categoryData = Object.keys(data.by_category).map(key => ({ name: key, value: data.by_category[key] }));
  const statusData = Object.keys(data.by_status).map(key => ({ name: key.replace('_', ' '), value: data.by_status[key] }));
  const aiData = [
    { name: 'AI Assisted', value: data.ai_performance.assisted },
    { name: 'Manual', value: data.ai_performance.manual }
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
  const AI_COLORS = ['#8b5cf6', '#3f3f46'];
  const STATUS_COLORS: Record<string, string> = {
    'NEW': '#3b82f6', 'IN PROGRESS': '#f59e0b', 'SOLVED': '#10b981',
    'FAILED': '#ef4444', 'MERGED': '#8b5cf6', 'DRAFT': '#71717a'
  };

  const tooltipStyle = {
    contentStyle: { backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff', fontSize: '12px' },
    itemStyle: { color: '#fff' },
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            aside { display: none !important; }
            main { padding: 0 !important; overflow: visible !important; background: white !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        `
      }} />

      <div className="space-y-6 w-full">

        {/* ── Header ── */}
        <div className="flex items-end justify-between pb-5 border-b border-zinc-800 print:border-zinc-200 print:pb-4">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-1 print:hidden">Admin</p>
            <h1 className="text-3xl font-bold text-white tracking-tight print:text-black">System Reports</h1>
            <p className="text-sm text-zinc-400 mt-1 print:text-zinc-500">Monitor ticket volume, resolution times, and current backlogs.</p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 hover:text-white text-sm font-medium rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Export PDF
            </button>
            <select
              value={period}
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl px-4 py-2 text-sm text-white outline-none transition-all cursor-pointer"
            >
              <option value={7}>Last 7 Days</option>
              <option value={15}>Last 15 Days</option>
              <option value={30}>Last 30 Days</option>
            </select>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">

          <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors print:bg-zinc-50 print:border-zinc-200 break-inside-avoid">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest print:text-zinc-500">Total Volume</p>
            <p className="text-3xl font-black text-white mt-2 mb-1 tabular-nums print:text-black">{data.total_volume}</p>
            <p className="text-[11px] text-zinc-600">Tickets created in period</p>
          </div>

          <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors print:bg-zinc-50 print:border-zinc-200 break-inside-avoid">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest print:text-zinc-500">Avg Resolution</p>
            <p className="text-3xl font-black text-emerald-400 mt-2 mb-1 tabular-nums print:text-emerald-600">
              {data.avg_resolution_hrs}<span className="ml-2">hrs</span>
            </p>
            <p className="text-[11px] text-zinc-600">Time from New to Solved</p>
          </div>

          <div className="relative bg-zinc-950/60 border border-zinc-800 rounded-2xl p-5 overflow-hidden hover:border-zinc-700 transition-colors print:bg-zinc-50 print:border-zinc-200 break-inside-avoid">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest print:text-zinc-500">Pending Backlog</p>
            <p className="text-3xl font-black text-amber-400 mt-2 mb-1 tabular-nums print:text-amber-600">{data.pending_backlog}</p>
            <p className="text-[11px] text-zinc-600">New & In Progress tickets</p>
          </div>

        </div>

        {/* ── Volume Timeline (full width) ── */}
        <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors print:bg-white print:border-zinc-200 print:border break-inside-avoid">
          <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Ticket Volume Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.volume_timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" stroke="#52525b" fontSize={11} tickMargin={10} />
                <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2.5} dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Charts 2-col grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 print:grid-cols-2">

          {/* Category Breakdown */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Tickets by Category</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={75} paddingAngle={4} dataKey="value" activeOuterRadiusOffset={0}>
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center mt-3">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name} <span className="text-zinc-600">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Current Status Breakdown</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 8, left: 48, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                  <XAxis type="number" stroke="#52525b" fontSize={11} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#52525b" fontSize={11} tick={{ fill: '#71717a' }} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={20}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assignee Workload */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Assignee Workload</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.assignee_performance} margin={{ top: 0, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#52525b" fontSize={11} tickMargin={10} />
                  <YAxis stroke="#52525b" fontSize={11} allowDecimals={false} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: '#27272a', opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '12px', color: '#71717a' }} />
                  <Bar dataKey="solved" name="Solved" stackId="a" fill="#10b981" maxBarSize={40} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Involvement */}
          <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <div className="flex items-start justify-between mb-6">
              <h3 className="text-sm font-bold text-zinc-300 print:text-black">AI Involvement</h3>
              <span className="text-[11px] font-bold bg-violet-500/10 text-violet-400 border border-violet-500/20 px-2 py-1 rounded-lg">
                {data.ai_performance.automation_rate}% Automation
              </span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={aiData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="value" activeOuterRadiusOffset={0}>
                    {aiData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={AI_COLORS[index % AI_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip {...tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center mt-3">
              {aiData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: AI_COLORS[index % AI_COLORS.length] }} />
                  {entry.name} <span className="text-zinc-600">({entry.value})</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

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

  if (loading) return <div className="text-zinc-400 p-8 flex items-center gap-3"><div className="w-5 h-5 border-2 border-zinc-500 border-t-white rounded-full animate-spin"></div> Loading metrics...</div>;
  if (!data) return <div className="text-red-400 p-8">Failed to load reports.</div>;

  const categoryData = Object.keys(data.by_category).map(key => ({ name: key, value: data.by_category[key] }));
  const statusData = Object.keys(data.by_status).map(key => ({ name: key.replace('_', ' '), value: data.by_status[key] }));
  
  // NEW: Setup Data for the AI Pie Chart
  const aiData = [
    { name: 'AI Assisted', value: data.ai_performance.assisted },
    { name: 'Manual', value: data.ai_performance.manual }
  ];
  const AI_COLORS = ['#8b5cf6', '#3f3f46']; // Purple for AI, Dark Gray for Manual
  
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'];
  
  const STATUS_COLORS: Record<string, string> = {
    'NEW': '#3b82f6',
    'IN PROGRESS': '#f59e0b',
    'SOLVED': '#10b981',
    'FAILED': '#ef4444',
    'MERGED': '#8b5cf6',
    'DRAFT': '#71717a'
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

      <div className="space-y-8 animate-in fade-in duration-500 print:space-y-6 print:m-0 print:p-0 print:bg-white print:text-black w-full">
        
        {/* Header */}
        <div className="flex justify-between items-center print:border-b print:border-zinc-200 print:pb-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white print:text-black">System Reports</h2>
            <p className="text-zinc-400 mt-1 print:text-zinc-500">Monitor ticket volume, resolution times, and current backlogs.</p>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-4 print:hidden">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 hover:text-white text-zinc-300 text-sm font-medium rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Export PDF
            </button>
            <select 
              value={period} 
              onChange={(e) => setPeriod(Number(e.target.value))}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-zinc-700"
            >
              <option value={7}>Last 7 Days</option>
              <option value={30}>Last 30 Days</option>
              <option value={90}>Last 90 Days</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-6">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-zinc-50 print:border-zinc-200 print:shadow-none break-inside-avoid">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 print:text-zinc-500">Total Volume</div>
            <div className="text-4xl font-bold text-white print:text-black">{data.total_volume}</div>
            <div className="text-xs text-zinc-500 mt-2">Tickets created in period</div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-zinc-50 print:border-zinc-200 print:shadow-none break-inside-avoid">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 print:text-zinc-500">Avg Resolution Time</div>
            <div className="text-4xl font-bold text-emerald-400 print:text-emerald-600">{data.avg_resolution_hrs} <span className="text-xl">hrs</span></div>
            <div className="text-xs text-zinc-500 mt-2">Time from New to Solved</div>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-zinc-50 print:border-zinc-200 print:shadow-none break-inside-avoid">
            <div className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2 print:text-zinc-500">Pending Backlog</div>
            <div className="text-4xl font-bold text-amber-400 print:text-amber-600">{data.pending_backlog}</div>
            <div className="text-xs text-zinc-500 mt-2">New & In Progress tickets</div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2 print:gap-6">
          
          {/* Volume Timeline */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 lg:col-span-2 print:col-span-2 print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Ticket Volume Over Time</h3>
            <div className="h-72 print:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.volume_timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.2} />
                  <XAxis dataKey="date" stroke="#71717a" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Tickets by Category</h3>
            <div className="h-64 print:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {categoryData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs text-zinc-400 print:text-zinc-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Current Status Breakdown</h3>
            <div className="h-64 print:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.2} horizontal={true} vertical={false} />
                  <XAxis type="number" stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" stroke="#71717a" fontSize={12} tick={{ fill: '#71717a' }} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.1 }} 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }} 
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Assignee Performance */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <h3 className="text-sm font-bold text-zinc-300 mb-6 print:text-black">Assignee Workload</h3>
            <div className="h-64 print:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.assignee_performance} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" strokeOpacity={0.2} vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickMargin={10} />
                  <YAxis stroke="#71717a" fontSize={12} allowDecimals={false} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.1 }} 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="solved" name="Solved Tickets" stackId="a" fill="#10b981" maxBarSize={40} />
                  <Bar dataKey="pending" name="Pending (New / In Progress)" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* NEW: AI Involvement */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 print:bg-white print:border-zinc-200 print:border break-inside-avoid">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-sm font-bold text-zinc-300 print:text-black">AI Involvement</h3>
              <span className="text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-1 rounded">
                {data.ai_performance.automation_rate}% Automation
              </span>
            </div>
            <div className="h-52 print:h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={aiData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                    {aiData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={AI_COLORS[index % AI_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }} 
                    itemStyle={{ color: '#fff' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {aiData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2 text-xs text-zinc-400 print:text-zinc-600">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: AI_COLORS[index % AI_COLORS.length] }} />
                  {entry.name} ({entry.value})
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

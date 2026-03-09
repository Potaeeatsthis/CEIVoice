// src/app/(dashboard)/assignee/tickets/page.tsx

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import AssigneeTicketTable from '@/components/AssigneeTicketTable';

async function getTickets(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      deadline,
      created_at,
      assigned_to,
      assigned_to_user:users!tickets_assigned_to_fkey (full_name),
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `)
    .eq('assigned_to', userId)
    .in('status', ['NEW', 'IN_PROGRESS', 'SOLVED', 'FAILED'])
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((ticket) => ({
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    priority: ticket.priority,
    deadline: ticket.deadline,
    assignee_name: ticket.assigned_to_user?.full_name ?? null,
  }));
}

export default async function AssigneeTicketsPage() {
  const cookieStore = await cookies();
  // ✅ Read userId once here on the server and pass it down as a prop
  const userId = cookieStore.get('user_id')?.value ?? null;

  const tickets = userId ? await getTickets(userId) : [];

  const stats = {
    total: tickets.length,
    new: tickets.filter((t) => t.status === 'NEW').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    solved: tickets.filter((t) => t.status === 'SOLVED').length,
    failed: tickets.filter((t) => t.status === 'FAILED').length,
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">My Dashboard</h2>
          <p className="text-zinc-400 mt-1">All tickets assigned to me.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="New" value={stats.new} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard label="Solved" value={stats.solved} color="emerald" />
        <StatCard label="Failed" value={stats.failed} color="rose" />
      </div>

      {/* ✅ Pass userId from server so the client doesn't need to re-fetch it */}
      <div className="flex-1 min-h-0">
        <AssigneeTicketTable initialTickets={tickets} userId={userId} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "zinc" }: any) {
  const styles: any = {
    zinc:    { card: "border-zinc-800/60 bg-zinc-900/40", value: "text-white", icon: "text-zinc-500" },
    blue:    { card: "border-blue-900/40 bg-blue-950/10", value: "text-blue-400", icon: "text-blue-500/60" },
    amber:   { card: "border-amber-900/40 bg-amber-950/10", value: "text-amber-400", icon: "text-amber-500/60" },
    emerald: { card: "border-emerald-900/40 bg-emerald-950/10", value: "text-emerald-400", icon: "text-emerald-500/60" },
    rose:    { card: "border-rose-900/40 bg-rose-950/10", value: "text-rose-400", icon: "text-rose-500/60" },
  };
  const icons: any = {
    zinc:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>,
    blue:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
    amber:   <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
    emerald: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    rose:    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };
  const s = styles[color] || styles.zinc;
  return (
    <div className={`rounded-xl border p-4 backdrop-blur-sm ${s.card} transition-colors duration-200 hover:border-zinc-700/60`}>
      <div className="flex items-center justify-between mb-2">
        <span className={`${s.icon}`}>{icons[color] || icons.zinc}</span>
      </div>
      <div className={`text-2xl font-bold tracking-tight ${s.value}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mt-1">{label}</div>
    </div>
  );
}

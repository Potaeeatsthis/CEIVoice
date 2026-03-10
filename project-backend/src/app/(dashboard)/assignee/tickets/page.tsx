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
    created_at: ticket.created_at,
    assigned_to_user: ticket.assigned_to_user ?? null,
    created_by_user: ticket.created_by_user ?? null,
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
        <AssigneeTicketTable initialTickets={tickets as any} userId={userId} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "zinc" }: any) {
  const styles: any = {
    zinc:    { card: "border-zinc-800/60 bg-zinc-900/40", value: "text-white" },
    blue:    { card: "border-blue-900/40 bg-blue-950/10", value: "text-blue-400" },
    amber:   { card: "border-amber-900/40 bg-amber-950/10", value: "text-amber-400" },
    emerald: { card: "border-emerald-900/40 bg-emerald-950/10", value: "text-emerald-400" },
    rose:    { card: "border-rose-900/40 bg-rose-950/10", value: "text-rose-400" },
  };
  const s = styles[color] || styles.zinc;
  return (
    <div className={`rounded-xl border p-4 backdrop-blur-sm ${s.card} transition-colors duration-200 hover:border-zinc-700/60`}>
      <div className={`text-2xl font-bold tracking-tight ${s.value}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mt-1">{label}</div>
    </div>
  );
}

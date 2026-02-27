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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">My Dashboard</h2>
          <p className="text-zinc-400 mt-1">All tickets assigned to me.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="New" value={stats.new} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard label="Solved" value={stats.solved} color="emerald" />
        <StatCard label="Failed" value={stats.failed} color="red" />
      </div>

      {/* ✅ Pass userId from server so the client doesn't need to re-fetch it */}
      <AssigneeTicketTable initialTickets={tickets} userId={userId} />
    </div>
  );
}

function StatCard({ label, value, color = "zinc" }: any) {
  const colors: any = {
    zinc: "text-white border-zinc-800 bg-zinc-950/30",
    blue: "text-blue-400 border-blue-900/50 bg-blue-950/10",
    amber: "text-amber-400 border-amber-900/50 bg-amber-950/10",
    emerald: "text-emerald-400 border-emerald-900/50 bg-emerald-950/10",
    red: "text-red-400 border-red-900/50 bg-red-950/10",
    purple: "text-purple-400 border-purple-900/50 bg-purple-950/10"
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[color] || colors.zinc}`}>
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}

// src/app/(dashboard)/tickets/page.tsx

import Link from 'next/link';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import PersonalTicketTable from '@/components/PersonalTicketTable';

export type Ticket = {
  id: string;
  title: string | null;
  description: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  deadline: string | null;
};

/* ---------------- Fetch ONLY current user's tickets ---------------- */
async function getUserTickets(): Promise<Ticket[]> {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) return [];

  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error.message);
    return [];
  }

  return data || [];
}

/* ---------------- Page ---------------- */
export default async function TicketsPage() {
  const tickets = await getUserTickets();

  // Calculate Statistics
  const total = tickets.length;
  const inProgress = tickets.filter(t => t.status === 'IN_PROGRESS').length;
  const solved = tickets.filter(t => t.status === 'SOLVED').length;
  const overdue = tickets.filter(t => {
    if (!t.deadline || ['SOLVED', 'MERGED', 'FAILED', 'DRAFT'].includes(t.status)) return false;
    return new Date(t.deadline) < new Date();
  }).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            My Tickets
          </h1>
          <p className="text-zinc-400 mt-1">
            Track and manage your support requests.
          </p>
        </div>
      </div>

      {/* Stats Highlight Boxes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Tickets" value={total} color="text-white" border="border-zinc-800" />
        <StatCard title="In Progress" value={inProgress} color="text-amber-400" border="border-amber-900/50" bg="bg-amber-950/10" />
        <StatCard title="Overdue" value={overdue} color="text-red-400" border="border-red-900/50" bg="bg-red-950/10" />
        <StatCard title="Solved" value={solved} color="text-emerald-400" border="border-emerald-900/50" bg="bg-emerald-950/10" />
      </div>

      {/* Interactive Client Table */}
      <PersonalTicketTable tickets={tickets} />
    </div>
  );
}

function StatCard({ title, value, color, border, bg = "bg-zinc-950/40" }: { title: string, value: number, color: string, border: string, bg?: string }) {
  return (
    <div className={`p-5 rounded-xl border ${border} ${bg} backdrop-blur-sm flex flex-col justify-center`}>
      <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">{title}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

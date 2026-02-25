// src/app/(dashboard)/admin/tickets/page.tsx

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import AdminTicketTable from '@/components/AdminTicketTable'; 
import TicketToolbar from '@/components/TicketToolbar';
import PaginationControls from '@/components/PaginationControls';

const PAGE_SIZE = 5;

// Global Stats
async function getGlobalStats() {
  const { data, error } = await supabaseAdmin.from('tickets').select('status').neq('status', 'DRAFT');
  if (error || !data) return { total: 0, pending: 0, inProgress: 0, solved: 0 };
  return {
    total: data.length,
    pending: data.filter((t) => t.status === 'NEW').length,
    inProgress: data.filter((t) => t.status === 'IN_PROGRESS').length,
    solved: data.filter((t) => t.status === 'SOLVED').length,
  };
}

// Fetch Filtered & Paginated Tickets
async function getTickets(searchParams: { [key: string]: string | undefined }) {
  const query = searchParams?.q || '';
  const status = searchParams?.status;
  const priority = searchParams?.priority;
  const page = Number(searchParams?.page) || 1;

  // Pagination Math
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let supabaseQuery = supabaseAdmin
    .from('tickets')
    .select(`
      id, title, description, status, priority, deadline, created_at,
      assigned_to_user:users!tickets_assigned_to_fkey (full_name),
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `, { count: 'exact' })
    .neq('status', status === 'MERGED' ? 'IGNORE_THIS_FILTER' : 'MERGED')
    .neq('status', 'DRAFT')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) supabaseQuery = supabaseQuery.eq('status', status);
  if (priority) supabaseQuery = supabaseQuery.eq('priority', priority);

  if (query) {
    if (!isNaN(Number(query))) {
      supabaseQuery = supabaseQuery.eq('id', query);
    } else {
      supabaseQuery = supabaseQuery.ilike('title', `%${query}%`);
    }
  }

  const { data, error, count } = await supabaseQuery;

  if (error) {
    console.error("❌ Admin Query Error:", error.message);
    return { tickets: [], count: 0 };
  }

  return { 
    tickets: (data as any[]) || [], 
    count: count || 0 
  };
}

export default async function AdminTicketsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await props.searchParams;

  // Get userId from cookies
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value || '';

  // Parallel Fetching
  const [{ tickets, count }, stats] = await Promise.all([
    getTickets(params),
    getGlobalStats()
  ]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Admin Queue</h2>
          <p className="text-zinc-400 mt-1">Global view of all system tickets.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard label="Solved" value={stats.solved} color="emerald" />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="p-4">
            <TicketToolbar />
            <AdminTicketTable initialTickets={tickets} userId={userId} />
        </div>

        <PaginationControls totalCount={count} pageSize={PAGE_SIZE} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color = "zinc" }: any) {
  const colors: any = {
    zinc: "text-white border-zinc-800",
    blue: "text-blue-400 border-blue-900/50 bg-blue-950/10",
    amber: "text-amber-400 border-amber-900/50 bg-amber-950/10",
    emerald: "text-emerald-400 border-emerald-900/50 bg-emerald-950/10"
  };
  return (
    <div className={`rounded-md border p-4 ${colors[color]} bg-zinc-900/30`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mt-1">{label}</div>
    </div>
  );
}

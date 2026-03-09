// src/app/(dashboard)/tickets/page.tsx

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import PersonalTicketTable from '@/components/PersonalTicketTable';

export type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED' | 'MERGED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline: string | null;
  created_at: string;
  assigned_to_user: { full_name: string } | null;
};

const PAGE_SIZE = 5;

async function getUserTickets(searchParams: { [key: string]: string | undefined }) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  if (!userId) return { tickets: [], userId: '', count: 0 };

  const page     = Number(searchParams?.page) || 1;
  const from     = (page - 1) * PAGE_SIZE;
  const to       = from + PAGE_SIZE - 1;
  const query    = searchParams?.q || '';
  const status   = searchParams?.status;
  const priority = searchParams?.priority;

  let q = supabaseAdmin
    .from('tickets')
    .select(
      'id, title, description, status, priority, deadline, created_at, assigned_to_user:users!tickets_assigned_to_fkey(full_name)',
      { count: 'exact' }
    )
    .eq('created_by', userId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status)   q = q.eq('status', status);
  if (priority) q = q.eq('priority', priority);
  if (query) {
    if (!isNaN(Number(query))) q = q.eq('id', query);
    else q = q.ilike('title', `%${query}%`);
  }

  const { data, error, count } = await q;
  if (error) { console.error(error.message); return { tickets: [], userId, count: 0 }; }
  return { tickets: (data as any[]) || [], userId, count: count || 0 };
}

async function getStats(userId: string) {
  const { data } = await supabaseAdmin
    .from('tickets').select('status, deadline').eq('created_by', userId);
  if (!data) return { total: 0, inProgress: 0, solved: 0, overdue: 0 };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    total:      data.length,
    inProgress: data.filter(t => t.status === 'IN_PROGRESS').length,
    solved:     data.filter(t => t.status === 'SOLVED').length,
    overdue:    data.filter(t => {
      if (!t.deadline || ['SOLVED','MERGED','FAILED','DRAFT'].includes(t.status)) return false;
      return new Date(t.deadline) < today;
    }).length,
  };
}

export default async function TicketsPage(props: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params     = await props.searchParams;
  const { tickets, userId, count } = await getUserTickets(params);
  const stats      = userId ? await getStats(userId) : { total: 0, inProgress: 0, solved: 0, overdue: 0 };
  const page       = Number(params?.page) || 1;
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));
  const startItem  = count === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const endItem    = Math.min(page * PAGE_SIZE, count);

  // Preserve existing params when paginating
  const buildPageUrl = (p: number) => {
    const sp = new URLSearchParams();
    if (params?.q)        sp.set('q',        params.q);
    if (params?.status)   sp.set('status',   params.status);
    if (params?.priority) sp.set('priority', params.priority);
    sp.set('page', String(p));
    return `?${sp.toString()}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">My Tickets</h1>
          <p className="text-zinc-400 mt-1">Track and manage your support requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Tickets" value={stats.total}      color="zinc" />
        <StatCard label="In Progress"   value={stats.inProgress} color="amber" />
        <StatCard label="Overdue"       value={stats.overdue}    color="rose" />
        <StatCard label="Solved"        value={stats.solved}     color="emerald" />
      </div>

      {/* Outer card — fills remaining height, matches admin exactly */}
      <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-0 backdrop-blur-sm">
        <div className="p-5 flex-1 overflow-auto min-h-0">
          <PersonalTicketTable tickets={tickets} userId={userId} />
        </div>

        {/* Pagination pinned outside scroll area, matches admin */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm shrink-0">
          <p className="text-[13px] text-zinc-500">
            Showing <span className="font-medium text-zinc-300">{startItem}</span> to{' '}
            <span className="font-medium text-zinc-300">{endItem}</span> of{' '}
            <span className="font-medium text-zinc-300">{count}</span> results
          </p>
          <nav className="flex items-center gap-1.5">
            <a
              href={page <= 1 ? undefined : buildPageUrl(page - 1)}
              aria-disabled={page <= 1}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 ${
                page <= 1 ? 'text-zinc-700 pointer-events-none' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
              Page {page} of {totalPages}
            </span>
            <a
              href={page >= totalPages ? undefined : buildPageUrl(page + 1)}
              aria-disabled={page >= totalPages}
              className={`inline-flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 ${
                page >= totalPages ? 'text-zinc-700 pointer-events-none' : 'text-zinc-500 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const styles: Record<string, { card: string; value: string }> = {
    zinc:    { card: 'border-zinc-800/60 bg-zinc-900/40',       value: 'text-white' },
    rose:    { card: 'border-rose-900/40 bg-rose-950/10',       value: 'text-rose-400' },
    amber:   { card: 'border-amber-900/40 bg-amber-950/10',     value: 'text-amber-400' },
    emerald: { card: 'border-emerald-900/40 bg-emerald-950/10', value: 'text-emerald-400' },
  };
  const s = styles[color] || styles.zinc;
  return (
    <div className={`rounded-xl border p-4 backdrop-blur-sm ${s.card} transition-colors duration-200 hover:border-zinc-700/60`}>
      <div className={`text-2xl font-bold tracking-tight ${s.value}`}>{value}</div>
      <div className="text-[11px] text-zinc-500 uppercase tracking-wider font-medium mt-1">{label}</div>
    </div>
  );
}
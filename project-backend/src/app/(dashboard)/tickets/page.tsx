// src/app/(dashboard)/tickets/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED' | 'MERGED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  assigned_to_user: { full_name: string } | null;
  created_by_user: { full_name: string; email: string } | null;
};

async function getTickets() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value || 'USER';

  let query = supabaseAdmin.from('tickets').select(`
    *,
    assigned_to_user:users!tickets_assigned_to_fkey (full_name),
    created_by_user:users!tickets_created_by_fkey (full_name, email)
  `);

  if (userRole === 'USER' && userId) {
    query = query.eq('created_by', userId);
  }

  // ✅ SORTING: Priority (High First) -> Then Newest Date
  const { data, error } = await query
    .order('priority', { ascending: false }) 
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ DB Query Error:", error.message);
    return [];
  }
  
  return (data as any[]) || [];
}

export default async function TicketsPage() {
  const tickets: Ticket[] = await getTickets();

  // ✅ REAL-TIME STATS CALCULATION
  const stats = {
    total: tickets.length,
    pending: tickets.filter(t => t.status === 'NEW').length,
    inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
    solved: tickets.filter(t => t.status === 'SOLVED').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Tickets</h2>
          <p className="text-zinc-400 mt-1">Overview of current support requests.</p>
        </div>
        <Link 
          href="/tickets/create" 
          className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 py-2 text-sm font-medium text-black shadow hover:bg-zinc-200 transition-colors"
        >
          Create Ticket
        </Link>
      </div>

      {/* ✅ STATS CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tickets" value={stats.total} />
        <StatCard label="Pending (New)" value={stats.pending} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard label="Solved" value={stats.solved} color="emerald" />
      </div>

      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              <th className="px-6 py-3 font-medium">ID</th>
              <th className="px-6 py-3 font-medium">Subject</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Priority</th>
              <th className="px-6 py-3 font-medium">Assignee</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className="group hover:bg-zinc-900/30 transition-colors">
                <td className="px-6 py-4 text-zinc-500 font-mono">#{ticket.id}</td>
                <td className="px-6 py-4">
                  <span className="font-medium text-zinc-200 group-hover:text-white block">
                    {ticket.title || 'Untitled Ticket'}
                  </span>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px] block">
                    {ticket.description}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={ticket.status} />
                </td>
                <td className="px-6 py-4">
                  <PriorityBadge priority={ticket.priority} />
                </td>
                <td className="px-6 py-4 text-zinc-400">
                  {ticket.assigned_to_user ? (
                    <span className="flex items-center gap-2">
                      <span className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] border border-zinc-700">
                        {ticket.assigned_to_user.full_name.charAt(0)}
                      </span>
                      {ticket.assigned_to_user.full_name}
                    </span>
                  ) : (
                    <span className="text-zinc-600 italic">Unassigned</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={`/tickets/${ticket.id}`} 
                    className="text-zinc-400 hover:text-white hover:underline underline-offset-4"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tickets.length === 0 && (
          <div className="p-12 text-center text-zinc-500 border-t border-zinc-800">
            No tickets found in the database.
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper Components ---

function StatCard({ label, value, color = "zinc" }: { label: string, value: number, color?: string }) {
  const colors: any = {
    zinc: "text-white border-zinc-800",
    blue: "text-blue-400 border-blue-900/50 bg-blue-950/10",
    amber: "text-amber-400 border-amber-900/50 bg-amber-950/10",
    emerald: "text-emerald-400 border-emerald-900/50 bg-emerald-950/10"
  };

  return (
    <div className={`rounded-md border p-4 ${colors[color] || colors.zinc} bg-zinc-900/30`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-zinc-500 uppercase tracking-wider font-medium mt-1">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-950/30 text-blue-400 border-blue-900",
    IN_PROGRESS: "bg-amber-950/30 text-amber-400 border-amber-900",
    SOLVED: "bg-emerald-950/30 text-emerald-400 border-emerald-900",
    MERGED: "bg-purple-950/30 text-purple-400 border-purple-900",
    FAILED: "bg-red-950/30 text-red-400 border-red-900",
    DRAFT: "bg-zinc-900 text-zinc-500 border-zinc-800"
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = 
    priority === 'HIGH' ? 'text-red-400 font-bold' : 
    priority === 'MEDIUM' ? 'text-orange-400 font-medium' : 'text-zinc-500';

  return (
    <span className={`text-xs ${color}`}>
      {priority}
    </span>
  );
}

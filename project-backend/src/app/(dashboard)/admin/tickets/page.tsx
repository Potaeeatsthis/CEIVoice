// src/app/(dashboard)/admin/tickets/page.tsx
import { supabaseAdmin } from '@/lib/supabase';
import AdminTicketTable from '@/components/AdminTicketTable'; // Make sure to import the new component

async function getTickets() {
  const { data, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      assigned_to_user:users!tickets_assigned_to_fkey (full_name),
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `)
    .order('created_at', { ascending: false }); // Default sort from DB

  if (error) {
    console.error("❌ Admin Query Error:", error.message);
    return [];
  }
  
  return (data as any[]) || [];
}

export default async function AdminTicketsPage() {
  const tickets = await getTickets();

  // Calculate stats on the server side
  const stats = {
    total: tickets.length,
    pending: tickets.filter((t) => t.status === 'NEW').length,
    inProgress: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    solved: tickets.filter((t) => t.status === 'SOLVED').length,
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Admin Queue</h2>
          <p className="text-zinc-400 mt-1">Global view of all system tickets.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Pending" value={stats.pending} color="blue" />
        <StatCard label="In Progress" value={stats.inProgress} color="amber" />
        <StatCard label="Solved" value={stats.solved} color="emerald" />
      </div>

      {/* Render the Client Component which handles the sorting */}
      <AdminTicketTable initialTickets={tickets} />
    </div>
  );
}

// StatCard is static so it can stay here
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

import Link from 'next/link';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import PriorityIcon from '@/components/PriorityIcon'; // ✅ use your shared component

type Ticket = {
  id: string;
  title: string | null;
  description: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
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

        <Link
          href="/tickets/create"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium transition-colors"
        >
          + New Ticket
        </Link>
      </div>

      {/* Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              <th className="px-6 py-3 font-medium">Subject</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Priority</th>
              <th className="px-6 py-3 font-medium text-right">Date</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-800">
            {tickets.map((ticket) => (
              <tr
                key={ticket.id}
                className="group hover:bg-zinc-900/30 transition-colors"
              >
                {/* Subject */}
                <td className="px-6 py-4">
                  <span className="font-medium text-zinc-200 block">
                    {ticket.title || 'Untitled Ticket'}
                  </span>
                  <span className="text-xs text-zinc-500 truncate max-w-[260px] block">
                    {ticket.description}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <StatusBadge status={ticket.status} />
                </td>

                {/* ✅ Priority using icon */}
                <td className="px-6 py-4">
                  <PriorityIcon priority={ticket.priority} />
                </td>

                {/* Date */}
                <td className="px-6 py-4 text-right text-zinc-500">
                  {new Date(ticket.created_at).toLocaleString()}
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="text-blue-400 hover:text-blue-300 hover:underline"
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
            You haven’t created any tickets yet.
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Status Badge ---------------- */

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-950/30 text-blue-400 border-blue-900',
    IN_PROGRESS: 'bg-amber-950/30 text-amber-400 border-amber-900',
    SOLVED: 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
    FAILED: 'bg-red-950/30 text-red-400 border-red-900',
    MERGED: 'bg-purple-950/30 text-purple-400 border-purple-900',
    DRAFT: 'bg-zinc-900 text-zinc-500 border-zinc-800',
  };

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium border ${
        styles[status] || styles.DRAFT
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

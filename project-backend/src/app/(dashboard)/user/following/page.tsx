// src/app/(dashboard)/user/following/page.tsx

import Link from 'next/link';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import PriorityIcon from '@/components/PriorityIcon';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  category: string | null;
};

async function getFollowedTickets(userId: string): Promise<Ticket[]> {
  // Get ticket IDs the user follows
  const { data: follows, error: followError } = await supabaseAdmin
    .from('ticket_followers')
    .select('ticket_id')
    .eq('user_id', userId);

  if (followError) {
    console.error('Following fetch error:', followError.message);
    return [];
  }

  if (!follows || follows.length === 0) return [];

  const ticketIds = follows.map((f: { ticket_id: number }) => f.ticket_id);

  const { data: tickets, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select('id, title, description, status, priority, created_at, category')
    .in('id', ticketIds)
    .order('created_at', { ascending: false });

  if (ticketError) {
    console.error('Followed ticket details error:', ticketError.message);
    return [];
  }

  return (tickets as Ticket[]) || [];
}

export default async function FollowingPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return (
      <div className="p-12 text-center text-zinc-500">
        You must be logged in to view your followed tickets.
      </div>
    );
  }

  const tickets = await getFollowedTickets(userId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Following</h1>
        <p className="text-zinc-400 mt-1">
          Tickets you're following.{' '}
          <Link href="/user/community" className="text-blue-400 hover:text-blue-300 underline">
            Browse community tickets
          </Link>{' '}
          to follow more.
        </p>
      </div>

      {/* Table */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              <th className="px-6 py-3 font-medium">Subject</th>
              <th className="px-6 py-3 font-medium">Category</th>
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
                  <span className="text-xs text-zinc-500 truncate max-w-[240px] block">
                    {ticket.description}
                  </span>
                </td>

                {/* Category */}
                <td className="px-6 py-4">
                  <span className="text-xs text-zinc-400">
                    {ticket.category || '—'}
                  </span>
                </td>

                {/* Status */}
                <td className="px-6 py-4">
                  <StatusBadge status={ticket.status} />
                </td>

                {/* Priority */}
                <td className="px-6 py-4">
                  <PriorityIcon priority={ticket.priority} />
                </td>

                {/* Date */}
                <td className="px-6 py-4 text-right text-zinc-500 text-xs whitespace-nowrap">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>

                {/* Action */}
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="text-blue-400 hover:text-blue-300 hover:underline text-sm"
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
            You're not following any tickets yet.{' '}
            <Link href="/user/community" className="text-blue-400 hover:text-blue-300 underline">
              Browse community tickets
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}

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

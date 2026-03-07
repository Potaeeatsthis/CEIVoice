// src/components/CommunityTicketTable.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
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

type Props = {
  tickets: Ticket[];
  initialFollowedIds: number[];
};

export default function CommunityTicketTable({ tickets, initialFollowedIds }: Props) {
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set(initialFollowedIds));
  const [loadingIds,  setLoadingIds]  = useState<Set<number>>(new Set());

  async function toggleFollow(ticketId: number) {
    const isFollowing = followedIds.has(ticketId);
    setLoadingIds((prev) => new Set(prev).add(ticketId));

    try {
      const res = await fetch(`/api/tickets/${ticketId}/follow`, {
        method: isFollowing ? 'DELETE' : 'POST',
      });
      if (!res.ok) return;

      setFollowedIds((prev) => {
        const next = new Set(prev);
        isFollowing ? next.delete(ticketId) : next.add(ticketId);
        return next;
      });
    } catch (err) {
      console.error('Follow toggle error:', err);
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  }

  if (tickets.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
        No community tickets available right now.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <th className="px-6 py-3 font-medium">Subject</th>
            <th className="px-6 py-3 font-medium">Category</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 font-medium">Priority</th>
            <th className="px-6 py-3 font-medium text-right">Date</th>
            <th className="px-6 py-3 font-medium text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {tickets.map((ticket) => {
            const isFollowing = followedIds.has(ticket.id);
            const isLoading   = loadingIds.has(ticket.id);

            return (
              <tr key={ticket.id} className="group hover:bg-zinc-900/30 transition-colors">

                {/* Subject — title is a clickable link */}
                <td className="px-6 py-4">
                  <Link
                    href={`/tickets/${ticket.id}`}
                    className="font-medium text-zinc-200 hover:text-white hover:underline block transition-colors"
                  >
                    {ticket.title || 'Untitled Ticket'}
                  </Link>
                  <span className="text-xs text-zinc-500 truncate max-w-[240px] block mt-0.5">
                    {ticket.description}
                  </span>
                </td>

                <td className="px-6 py-4">
                  <span className="text-xs text-zinc-400">{ticket.category || '—'}</span>
                </td>

                <td className="px-6 py-4">
                  <StatusBadge status={ticket.status} />
                </td>

                <td className="px-6 py-4">
                  <PriorityIcon priority={ticket.priority} />
                </td>

                <td className="px-6 py-4 text-right text-zinc-500 text-xs whitespace-nowrap">
                  {new Date(ticket.created_at).toLocaleDateString()}
                </td>

                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => toggleFollow(ticket.id)}
                      disabled={isLoading}
                      className={`text-xs font-medium px-2.5 py-1 rounded border transition-all duration-150
                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                        ${isFollowing
                          ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                          : 'bg-blue-950/40 text-blue-400 border-blue-900 hover:bg-blue-900/40 hover:text-blue-300'
                        }`}
                    >
                      {isLoading ? '…' : isFollowing ? 'Unfollow' : '+ Follow'}
                    </button>
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="text-blue-400 hover:text-blue-300 hover:underline text-xs"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW:         'bg-blue-950/30 text-blue-400 border-blue-900',
    IN_PROGRESS: 'bg-amber-950/30 text-amber-400 border-amber-900',
    SOLVED:      'bg-emerald-950/30 text-emerald-400 border-emerald-900',
    FAILED:      'bg-red-950/30 text-red-400 border-red-900',
    MERGED:      'bg-purple-950/30 text-purple-400 border-purple-900',
    DRAFT:       'bg-zinc-900 text-zinc-500 border-zinc-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] ?? styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

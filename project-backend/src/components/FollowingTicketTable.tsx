// src/components/FollowingTicketTable.tsx

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Ticket } from '@/app/(dashboard)/user/following/page';

export default function FollowingTicketTable({ tickets }: { tickets: Ticket[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [unfollowingIds, setUnfollowingIds] = useState<Set<number>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  async function handleUnfollow(ticketId: number, e: React.MouseEvent) {
    e.preventDefault();
    setUnfollowingIds((prev) => new Set(prev).add(ticketId));
    try {
      const res = await fetch(`/api/tickets/${ticketId}/follow`, { method: 'DELETE' });
      if (res.ok) {
        setRemovedIds((prev) => new Set(prev).add(ticketId));
      }
    } catch (err) {
      console.error('Unfollow error:', err);
    } finally {
      setUnfollowingIds((prev) => {
        const next = new Set(prev);
        next.delete(ticketId);
        return next;
      });
    }
  }

  const visibleTickets = tickets.filter((t) => !removedIds.has(t.id));

  const processedTickets = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return visibleTickets.filter((t) =>
      (t.title?.toLowerCase() || '').includes(search) ||
      (t.description?.toLowerCase() || '').includes(search) ||
      (t.category?.toLowerCase() || '').includes(search) ||
      (t.status?.toLowerCase() || '').includes(search)
    );
  }, [visibleTickets, searchQuery]);

  if (visibleTickets.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
        You&apos;re not following any tickets yet.{' '}
        <Link href="/user/community" className="text-blue-400 hover:text-blue-300 underline">
          Browse the public feed
        </Link>{' '}
        to follow some.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar — full width, matching community style */}
      <div className="relative w-full">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search followed tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {processedTickets.map((ticket) => {
          const isUnfollowing = unfollowingIds.has(ticket.id);
          const displayDate = ticket.updated_at || ticket.created_at;

          return (
            <Link key={ticket.id} href={`/tickets/${ticket.id}?ref=following`} className="block">
              <div className="relative border border-zinc-800 rounded-lg bg-zinc-950/60 hover:bg-zinc-900/60 hover:border-zinc-700 transition-all duration-150 p-5">
                {/* Status badge top-right */}
                <div className="absolute top-4 right-4">
                  <StatusBadge status={ticket.status} />
                </div>

                {/* Title */}
                {ticket.title && ticket.title !== 'Untitled Ticket' && (
                  <h3 className="text-white font-semibold text-base mb-2 pr-16">
                    {ticket.title}
                  </h3>
                )}

                {/* Description */}
                {ticket.description && (
                  <p className="text-zinc-400 text-sm leading-relaxed mb-4 pr-16">
                    &ldquo;{ticket.description}&rdquo;
                  </p>
                )}

                {/* Footer metadata */}
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {/* Date */}
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Updated {new Date(displayDate).toLocaleDateString('en-US', {
                      month: 'numeric', day: 'numeric', year: 'numeric'
                    })}
                  </span>

                  {/* Priority */}
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {ticket.priority}
                  </span>

                  {/* Unfollow button */}
                  <button
                    onClick={(e) => handleUnfollow(ticket.id, e)}
                    disabled={isUnfollowing}
                    className={`ml-auto whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded border transition-all duration-150
                      ${isUnfollowing ? 'opacity-50 cursor-not-allowed' : ''}
                      bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white`}
                  >
                    {isUnfollowing ? '…' : 'Unfollow'}
                  </button>
                </div>
              </div>
            </Link>
          );
        })}

        {processedTickets.length === 0 && (
          <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
            No tickets match your search.
          </div>
        )}
      </div>
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
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border ${styles[status] ?? styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
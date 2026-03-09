// src/components/FollowingTicketTable.tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import type { Ticket } from '@/app/(dashboard)/user/following/page';

const PAGE_SIZE = 5;

export default function FollowingTicketTable({ tickets }: { tickets: Ticket[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [unfollowingIds, setUnfollowingIds] = useState<Set<number>>(new Set());
  const [removedIds, setRemovedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

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

  const totalPages = Math.max(1, Math.ceil(processedTickets.length / PAGE_SIZE));
  const paginatedTickets = processedTickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const startItem = processedTickets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const endItem   = Math.min(currentPage * PAGE_SIZE, processedTickets.length);

  if (visibleTickets.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
          <SearchBar value={searchQuery} onChange={setSearchQuery} />
        </div>
        <div className="p-12 text-center text-zinc-500">
          You're not following any tickets yet.{' '}
          <Link href="/user/community" className="text-blue-400 hover:text-blue-300 underline">
            Browse the public feed
          </Link>{' '}
          to follow some.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">

      {/* ── Search bar ── */}
      <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
        <SearchBar value={searchQuery} onChange={setSearchQuery} />
      </div>

      {/* ── Ticket cards ── */}
      <div className="divide-y divide-zinc-800/60">
        {paginatedTickets.map((ticket) => {
          const isUnfollowing = unfollowingIds.has(ticket.id);
          const displayDate = ticket.updated_at || ticket.created_at;

          return (
            <Link key={ticket.id} href={`/tickets/${ticket.id}?ref=following`} className="block">
              <div className="relative hover:bg-zinc-900/40 transition-all duration-150 px-5 py-4">
                {/* Status badge */}
                <div className="absolute top-4 right-4">
                  <StatusBadge status={ticket.status} />
                </div>

                {/* ID + title */}
                <div className="flex items-center gap-2 mb-1.5 pr-16">
                  <span className="text-xs text-blue-400 font-mono font-semibold">#{ticket.id}</span>
                  {ticket.title && ticket.title !== 'Untitled Ticket' && (
                    <span className="text-white font-semibold text-base">{ticket.title}</span>
                  )}
                </div>

                {/* Description */}
                {ticket.description && (
                  <p className="text-zinc-400 text-sm leading-relaxed mb-3 pr-16 line-clamp-2">
                    &ldquo;{ticket.description}&rdquo;
                  </p>
                )}

                {/* Footer */}
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Updated {new Date(displayDate).toLocaleDateString('en-US', {
                      month: 'numeric', day: 'numeric', year: 'numeric'
                    })}
                  </span>

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

        {paginatedTickets.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500">
            No tickets match your search.
          </div>
        )}
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-900/30">
        <span className="text-xs text-zinc-500">
          Showing <span className="text-zinc-300 font-medium">{startItem}</span> to{' '}
          <span className="text-zinc-300 font-medium">{endItem}</span> of{' '}
          <span className="text-zinc-300 font-medium">{processedTickets.length}</span> results
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700 hover:text-white transition-colors"
            aria-label="Previous page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <span className="px-3 py-1 text-xs font-semibold rounded border border-zinc-600 bg-zinc-800 text-white min-w-[80px] text-center">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded border border-zinc-700 bg-zinc-800 text-zinc-400 disabled:opacity-40 hover:bg-zinc-700 hover:text-white transition-colors"
            aria-label="Next page"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Search followed tickets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
      />
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
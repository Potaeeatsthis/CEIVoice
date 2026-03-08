// src/components/CommunityTicketTable.tsx

'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';

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

const PAGE_SIZE = 7;

export default function CommunityTicketTable({ tickets, initialFollowedIds }: Props) {
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set(initialFollowedIds));
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  async function toggleFollow(ticketId: number, e: React.MouseEvent) {
    e.preventDefault();
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

  const processedTickets = useMemo(() => {
    const search = searchQuery.toLowerCase();
    return tickets.filter((t) =>
      (t.title?.toLowerCase() || '').includes(search) ||
      (t.description?.toLowerCase() || '').includes(search) ||
      (t.category?.toLowerCase() || '').includes(search)
    );
  }, [tickets, searchQuery]);

  const totalPages = Math.ceil(processedTickets.length / PAGE_SIZE);
  const paginatedTickets = processedTickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (tickets.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
        No community tickets available right now.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar — full width */}
      <div className="relative w-full">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search community tickets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-zinc-950/40 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-600 focus:ring-1 focus:ring-zinc-600 transition-all"
        />
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {paginatedTickets.map((ticket) => {
          const isFollowing = followedIds.has(ticket.id);
          const isLoading = loadingIds.has(ticket.id);
          const refParam = isFollowing ? 'following' : 'community';

          return (
            <Link
              key={ticket.id}
              href={`/tickets/${ticket.id}?ref=${refParam}`}
              className="block"
            >
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
                <p className="text-zinc-400 text-sm leading-relaxed mb-4 pr-16">
                  &ldquo;{ticket.description}&rdquo;
                </p>

                {/* Footer metadata */}
                <div className="flex items-center gap-4 text-xs text-zinc-500">
                  {/* Date */}
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {new Date(ticket.created_at).toLocaleDateString('en-US', {
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

                  {/* Follow button */}
                  <button
                    onClick={(e) => toggleFollow(ticket.id, e)}
                    disabled={isLoading}
                    className={`ml-auto whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded border transition-all duration-150
                      ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                      ${isFollowing
                        ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                        : 'bg-white text-black border-white hover:bg-zinc-200 shadow-sm shadow-white/10'
                      }`}
                  >
                    {isLoading ? '…' : isFollowing ? 'Unfollow' : '+ Follow'}
                  </button>
                </div>
              </div>
            </Link>
          );
        })}

        {paginatedTickets.length === 0 && (
          <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
            No tickets match your search.
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-500">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, processedTickets.length)} of {processedTickets.length}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-xs font-medium rounded border border-zinc-700 bg-zinc-800 text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-xs font-medium rounded border border-zinc-700 bg-zinc-800 text-zinc-300 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
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
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

type SortConfig = { key: keyof Ticket; direction: 'asc' | 'desc' } | null;

const PAGE_SIZE = 5;

export default function CommunityTicketTable({ tickets, initialFollowedIds }: Props) {
  const [followedIds, setFollowedIds] = useState<Set<number>>(new Set(initialFollowedIds));
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  
  // Search, Sort, and Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset to page 1 when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

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

  const handleSort = (key: keyof Ticket) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedTickets = useMemo(() => {
    // 1. Filter
    const filtered = tickets.filter((t) => {
      const search = searchQuery.toLowerCase();
      return (
        (t.title?.toLowerCase() || '').includes(search) ||
        (t.description?.toLowerCase() || '').includes(search) ||
        (t.category?.toLowerCase() || '').includes(search)
      );
    });

    // 2. Sort
    if (!sortConfig) return filtered;
    
    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      
      if (key === 'created_at') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      const aVal = String(a[key] || '').toLowerCase();
      const bVal = String(b[key] || '').toLowerCase();
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tickets, searchQuery, sortConfig]);

  // Pagination Logic
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
      {/* Search Bar */}
      <div className="relative max-w-md">
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

      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
                <SortableHeader label="Subject" sortKey="title" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Category" sortKey="category" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Date" sortKey="created_at" currentSort={sortConfig} onSort={handleSort} align="right" />
                <th className="px-6 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {paginatedTickets.map((ticket) => {
                const isFollowing = followedIds.has(ticket.id);
                const isLoading   = loadingIds.has(ticket.id);
                const refParam    = isFollowing ? 'following' : 'community';

                return (
                  <tr key={ticket.id} className="group hover:bg-zinc-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link
                        href={`/tickets/${ticket.id}?ref=${refParam}`}
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
                    <td className="px-6 py-4 text-right text-zinc-500 text-xs whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => toggleFollow(ticket.id)}
                          disabled={isLoading}
                          className={`whitespace-nowrap text-xs font-medium px-2.5 py-1 rounded border transition-all duration-150
                            ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                            ${isFollowing
                              ? 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'
                              : 'bg-white text-black border-white hover:bg-zinc-200 hover:border-zinc-200 shadow-sm shadow-white/10'
                            }`}
                        >
                          {isLoading ? '…' : isFollowing ? 'Unfollow' : '+ Follow'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {paginatedTickets.length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-6 py-12 text-center text-zinc-500">
                     No tickets match your search.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-800 bg-zinc-900/30">
            <span className="text-xs text-zinc-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, processedTickets.length)} of {processedTickets.length}
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
    </div>
  );
}

function SortableHeader({ label, sortKey, currentSort, onSort, align = 'left' }: any) {
  const isActive = currentSort?.key === sortKey;
  
  const getSortIcon = () => {
    if (!isActive) return <span className="text-zinc-600">↕</span>;
    return currentSort.direction === 'asc' ? <span className="text-white">↑</span> : <span className="text-white">↓</span>;
  };

  return (
    <th 
      className={`px-6 py-3 font-medium cursor-pointer hover:text-white transition-colors group ${align === 'right' ? 'text-right' : 'text-left'}`} 
      onClick={() => onSort(sortKey)}
    >
      <div className={`flex items-center gap-1.5 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label} {getSortIcon()}
      </div>
    </th>
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

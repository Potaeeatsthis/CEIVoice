// src/components/PersonalTicketTable.tsx

'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PriorityIcon from '@/components/PriorityIcon';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Ticket } from '@/app/(dashboard)/tickets/page';

type SortConfig = { key: keyof Ticket; direction: 'asc' | 'desc' } | null;

const PAGE_SIZE = 5;

export default function PersonalTicketTable({ tickets, userId }: { tickets: Ticket[]; userId?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabaseBrowser.rpc('get_unread_stats', { current_user_id: userId });
    if (data && !error) {
      const counts: Record<string, number> = {};
      data.forEach((item: any) => {
        counts[String(item.ticket_id)] = Number(item.unread_count);
      });
      setUnreadCounts(counts);
    }
  }, [userId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig]);

  useEffect(() => {
    if (!userId) return;

    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('refresh-unread-stats', fetchUnread);

    const channel = supabaseBrowser
      .channel('personal-unread-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => fetchUnread())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_reads' }, () => fetchUnread())
      .subscribe();

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('refresh-unread-stats', fetchUnread);
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, fetchUnread]);

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
        (t.status?.toLowerCase() || '').includes(search)
      );
    });

    // 2. Sort
    if (!sortConfig) return filtered;
    
    return [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      
      if (key === 'created_at' || key === 'deadline') {
        const dateA = a[key] ? new Date(a[key]!).getTime() : 0;
        const dateB = b[key] ? new Date(b[key]!).getTime() : 0;
        return direction === 'asc' ? dateA - dateB : dateB - dateA;
      }

      if (key === 'priority') {
        const weight = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
        const aVal = weight[a.priority] || 0;
        const bVal = weight[b.priority] || 0;
        return direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const aVal = String(a[key] || '').toLowerCase();
      const bVal = String(b[key] || '').toLowerCase();
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tickets, searchQuery, sortConfig]);

  const totalPages = Math.ceil(processedTickets.length / PAGE_SIZE);
  const paginatedTickets = processedTickets.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  if (tickets.length === 0) {
    return (
      <div className="p-12 text-center text-zinc-500 border border-zinc-800 rounded-md bg-zinc-950/40">
        You haven’t created any tickets yet.
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
          placeholder="Search my tickets..."
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
                <SortableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Priority" sortKey="priority" currentSort={sortConfig} onSort={handleSort} />
                <SortableHeader label="Date" sortKey="created_at" currentSort={sortConfig} onSort={handleSort} align="right" />
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {paginatedTickets.map((ticket) => (
                <tr key={ticket.id} className="group hover:bg-zinc-900/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="font-medium text-zinc-200 hover:text-white hover:underline block transition-colors"
                      >
                        {ticket.title || 'Untitled Ticket'}
                      </Link>
                      {unreadCounts[String(ticket.id)] > 0 && (
                        <span className="flex-shrink-0 flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                          Unread
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 truncate max-w-[300px] block mt-0.5">
                      {ticket.description}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-6 py-4">
                    <PriorityIcon priority={ticket.priority} />
                  </td>
                  <td className="px-6 py-4 text-right text-zinc-500 whitespace-nowrap">
                    {new Date(ticket.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {paginatedTickets.length === 0 && (
                 <tr>
                   <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
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
    NEW: 'bg-blue-950/30 text-blue-400 border-blue-900',
    IN_PROGRESS: 'bg-amber-950/30 text-amber-400 border-amber-900',
    SOLVED: 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
    FAILED: 'bg-red-950/30 text-red-400 border-red-900',
    MERGED: 'bg-purple-950/30 text-purple-400 border-purple-900',
    DRAFT: 'bg-zinc-900 text-zinc-500 border-zinc-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

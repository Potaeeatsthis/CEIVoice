// src/components/AssigneeTicketTable.tsx

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import PriorityIcon from './PriorityIcon';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline: string | null;
  created_at: string;
  assigned_to_user: { full_name: string } | null;
  created_by_user: { full_name: string; email: string } | null;
};

const priorityRank: Record<string, number> = {
  URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-');
};

export default function AssigneeTicketTable({
  initialTickets,
  userId,
}: {
  initialTickets: Ticket[];
  userId: string | null;
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 20;

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabaseBrowser.rpc('get_unread_stats', { current_user_id: userId });
    if (data && !error) {
      const counts: Record<number, number> = {};
      data.forEach((item: any) => {
        counts[Number(item.ticket_id)] = Number(item.unread_count);
      });
      setUnreadCounts(counts);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;

    fetchUnread();

    const interval = setInterval(fetchUnread, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Manual refresh trigger
    window.addEventListener('refresh-unread-stats', fetchUnread);

    const channel = supabaseBrowser
      .channel('assignee-unread-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => fetchUnread())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_reads' }, () => fetchUnread())
      .subscribe((status) => {
        console.log('📡 Assignee realtime status:', status);
      });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('refresh-unread-stats', fetchUnread);
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, fetchUnread]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const statusMatch = statusFilter === 'ALL' || ticket.status === statusFilter;
      const priorityMatch = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
      const searchMatch = !searchTerm ||
        ticket.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.id.toString().includes(searchTerm);
      return statusMatch && priorityMatch && searchMatch;
    });
  }, [tickets, statusFilter, priorityFilter, searchTerm]);

  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    const sortedData = [...tickets].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];
      if (key === 'priority') return (priorityRank[a.priority] - priorityRank[b.priority]) * (direction === 'asc' ? 1 : -1);
      if (key === 'deadline') { if (!aValue) return 1; if (!bValue) return -1; }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });
    setTickets(sortedData);
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: string) => {
    if (sortConfig?.key !== name) return <span className="text-zinc-600">↕</span>;
    return sortConfig.direction === 'asc'
      ? <span className="text-white">↑</span>
      : <span className="text-white">↓</span>;
  };

  return (
    <div className="flex flex-col h-full">
      {/* ================= TOOLBAR ================= */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by ID or Title..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg pl-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 outline-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
          >
            <option value="ALL">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SOLVED">Solved</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setCurrentPage(1); }}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 outline-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL') && (
            <button onClick={() => { setSearchTerm(''); setStatusFilter('ALL'); setPriorityFilter('ALL'); setCurrentPage(1); }}
              className="px-3 py-2.5 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/50 rounded-lg transition-all">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ================= TABLE ================= */}
      <div className="flex-1 min-h-0 rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
                <th className="px-6 py-3 w-20 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort('id')}>
                  <div className="flex items-center gap-1.5">ID {getSortIcon('id')}</div>
                </th>
                <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
                  <div className="flex items-center gap-1.5">Subject {getSortIcon('title')}</div>
                </th>
                <th className="px-6 py-3 w-32 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1.5">Status {getSortIcon('status')}</div>
                </th>
                <th className="px-6 py-3 w-32 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort('priority')}>
                  <div className="flex items-center gap-1.5">Priority {getSortIcon('priority')}</div>
                </th>
                <th className="px-6 py-3 w-36 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort('deadline')}>
                  <div className="flex items-center gap-1.5">Deadline {getSortIcon('deadline')}</div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-800">
              {paginatedTickets.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-zinc-500">No tickets match your filters.</td></tr>
              ) : paginatedTickets.map((ticket, index) => (
                <tr key={ticket.id} className={`group hover:bg-zinc-900/30 transition-colors ${index === paginatedTickets.length - 1 ? 'border-b border-zinc-800' : ''}`}>
                  <td className="px-6 py-4 text-zinc-500 font-mono whitespace-nowrap">#{ticket.id}</td>

                  <td className="px-6 py-4 w-full max-w-0">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <Link href={`/assignee/tickets/${ticket.id}`} className="font-medium text-zinc-200 hover:text-white hover:underline block truncate transition-colors">
                          {ticket.title || 'Untitled Ticket'}
                        </Link>
                        {unreadCounts[Number(ticket.id)] > 0 && (
                          <span className="flex-shrink-0 flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider animate-in fade-in zoom-in duration-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Unread
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-zinc-500 truncate block mt-0.5">{ticket.description}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center"><PriorityIcon priority={ticket.priority} /></div>
                  </td>
                  <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                    {ticket.deadline ? (
                      <span className="text-zinc-300 font-mono text-xs">{formatDate(ticket.deadline)}</span>
                    ) : (
                      <span className="text-zinc-700">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ================= PAGINATION ================= */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm">
          <p className="text-[13px] text-zinc-500">
            Showing <span className="font-medium text-zinc-300">{filteredTickets.length === 0 ? 0 : (currentPage - 1) * ticketsPerPage + 1}</span> to{' '}
            <span className="font-medium text-zinc-300">{Math.min(currentPage * ticketsPerPage, filteredTickets.length)}</span> of{' '}
            <span className="font-medium text-zinc-300">{filteredTickets.length}</span> results
          </p>
          <nav className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage <= 1}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
              aria-label="Previous page"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <span className="inline-flex items-center px-3.5 py-1.5 text-xs font-medium text-zinc-300 bg-zinc-800/60 rounded-lg border border-zinc-700/50">
              Page {currentPage} of {totalPages || 1}
            </span>

            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage >= totalPages}
              className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
              aria-label="Next page"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-950/30 text-blue-400 border-blue-900",
    IN_PROGRESS: "bg-amber-950/30 text-amber-400 border-amber-900",
    SOLVED: "bg-emerald-950/30 text-emerald-400 border-emerald-900",
    FAILED: "bg-red-950/30 text-red-400 border-red-900",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap font-medium border ${styles[status] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

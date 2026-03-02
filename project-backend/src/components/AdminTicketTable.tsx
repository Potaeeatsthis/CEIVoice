// src/components/AdminTicketTable.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PriorityIcon from './PriorityIcon';
import MergeTicketModal from './MergeTicketModal';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED' | 'MERGED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline: string | null;
  created_at: string;
  assigned_to_user: { full_name: string } | null;
  created_by_user: { full_name: string; email: string } | null;
};

const priorityRank: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  }).replace(/\//g, '-');
};

export default function AdminTicketTable({ initialTickets, userId }: { initialTickets: Ticket[], userId: string }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    setTickets(initialTickets);
    setSelectedIds([]);
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

    // Poll every 15s as base fallback
    const interval = setInterval(fetchUnread, 15000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') fetchUnread();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Manual refresh trigger
    window.addEventListener('refresh-unread-stats', fetchUnread);

    const channel = supabaseBrowser
      .channel('admin-unread-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, () => fetchUnread())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_reads' }, () => fetchUnread())
      .subscribe((status) => {
        console.log('📡 Admin realtime status:', status);
      });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('refresh-unread-stats', fetchUnread);
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, fetchUnread]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    const sortedData = [...tickets].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];
      if (key === 'assignee') { aValue = a.assigned_to_user?.full_name || ''; bValue = b.assigned_to_user?.full_name || ''; }
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
    return sortConfig.direction === 'asc' ? <span className="text-white">↑</span> : <span className="text-white">↓</span>;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === tickets.length) setSelectedIds([]);
    else setSelectedIds(tickets.map(t => t.id));
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  return (
    <div className="relative">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[1000px]">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              <th className="px-6 py-3 w-12 text-left">
                <input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer" checked={tickets.length > 0 && selectedIds.length === tickets.length} onChange={toggleSelectAll} />
              </th>
              <th className="px-6 py-3 w-20 cursor-pointer hover:text-white group text-left whitespace-nowrap" onClick={() => handleSort('id')}>
                <div className="flex items-center gap-1.5">ID {getSortIcon('id')}</div>
              </th>
              <th className="px-6 py-3 cursor-pointer hover:text-white group text-left" onClick={() => handleSort('title')}>
                <div className="flex items-center gap-1.5">Subject {getSortIcon('title')}</div>
              </th>
              <th className="px-6 py-3 w-32 cursor-pointer hover:text-white group text-left whitespace-nowrap" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1.5">Status {getSortIcon('status')}</div>
              </th>
              <th className="px-6 py-3 w-32 cursor-pointer hover:text-white group text-left whitespace-nowrap" onClick={() => handleSort('priority')}>
                <div className="flex items-center gap-1.5">Priority {getSortIcon('priority')}</div>
              </th>
              <th className="px-6 py-3 w-36 cursor-pointer hover:text-white group text-left whitespace-nowrap" onClick={() => handleSort('deadline')}>
                <div className="flex items-center gap-1.5">Deadline {getSortIcon('deadline')}</div>
              </th>
              <th className="px-6 py-3 w-40 cursor-pointer hover:text-white group text-left whitespace-nowrap" onClick={() => handleSort('assignee')}>
                <div className="flex items-center gap-1.5">Assignee {getSortIcon('assignee')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className={`group transition-colors ${selectedIds.includes(ticket.id) ? 'bg-emerald-950/10' : 'hover:bg-zinc-900/30'}`}>
                <td className="px-6 py-4">
                  <input type="checkbox" className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer" checked={selectedIds.includes(ticket.id)} onChange={() => toggleSelect(ticket.id)} />
                </td>
                <td className="px-6 py-4 text-zinc-500 font-mono whitespace-nowrap">#{ticket.id}</td>
                <td className="px-6 py-4 w-full max-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/tickets/${ticket.id}`}
 			className="font-medium text-zinc-200 hover:text-white hover:underline block truncate transition-colors"
		      > {ticket.title || 'Untitled Ticket'}
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
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><PriorityIcon priority={ticket.priority} /></div></td>
                <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">{ticket.deadline ? <span className="text-zinc-300 font-mono text-xs">{formatDate(ticket.deadline)}</span> : '-'}</td>
                <td className="px-6 py-4 text-zinc-400 truncate whitespace-nowrap">{ticket.assigned_to_user?.full_name || 'Unassigned'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-sm font-medium text-white">
            <span className="text-emerald-400 font-bold">{selectedIds.length}</span> tickets selected
          </div>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button onClick={() => setIsMergeModalOpen(true)} disabled={selectedIds.length < 2} className="text-sm font-medium text-zinc-200 hover:text-white hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            Merge Selected
          </button>
          <button onClick={() => setSelectedIds([])} className="text-zinc-500 hover:text-zinc-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {isMergeModalOpen && (
        <MergeTicketModal isOpen={isMergeModalOpen} onClose={() => setIsMergeModalOpen(false)} selectedTicketIds={selectedIds} onSuccess={() => { setIsMergeModalOpen(false); setSelectedIds([]); window.location.reload(); }} />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-950/30 text-blue-400 border-blue-900",
    IN_PROGRESS: "bg-amber-950/30 text-amber-400 border-amber-900",
    SOLVED: "bg-emerald-950/30 text-emerald-400 border-emerald-900",
    MERGED: "bg-purple-950/30 text-purple-400 border-purple-900",
    FAILED: "bg-red-950/30 text-red-400 border-red-900",
    DRAFT: "bg-zinc-800 text-zinc-400 border-zinc-700"
  };
  return <span className={`px-2 py-0.5 rounded text-xs whitespace-nowrap font-medium border ${styles[status] || styles.DRAFT}`}>{status.replace('_', ' ')}</span>;
}

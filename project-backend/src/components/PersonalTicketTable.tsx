// src/components/PersonalTicketTable.tsx

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import PriorityIcon from '@/components/PriorityIcon';
import { supabaseBrowser } from '@/lib/supabase-browser';
import type { Ticket } from '@/app/(dashboard)/tickets/page';

export default function PersonalTicketTable({ tickets, userId }: { tickets: Ticket[]; userId?: string }) {
  const searchParams = useSearchParams();
  const pathname     = usePathname();
  const { replace }  = useRouter();
  const [sortConfig,   setSortConfig]   = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  const handleFilter = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value); else params.delete(key);
    params.set('page', '1');
    replace(`${pathname}?${params.toString()}`);
  }, [searchParams, pathname, replace]);

  const fetchUnread = useCallback(async () => {
    if (!userId) return;
    const { data, error } = await supabaseBrowser.rpc('get_unread_stats', { current_user_id: userId });
    if (data && !error) {
      const counts: Record<string, number> = {};
      data.forEach((item: any) => { counts[String(item.ticket_id)] = Number(item.unread_count); });
      setUnreadCounts(counts);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    const onVis = () => { if (document.visibilityState === 'visible') fetchUnread(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('refresh-unread-stats', fetchUnread);
    const channel = supabaseBrowser
      .channel('personal-unread-watch')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' },    () => fetchUnread())
      .on('postgres_changes', { event: '*',      schema: 'public', table: 'ticket_reads' }, () => fetchUnread())
      .subscribe();
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('refresh-unread-stats', fetchUnread);
      supabaseBrowser.removeChannel(channel);
    };
  }, [userId, fetchUnread]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig?.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return <span className="text-zinc-600">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="text-white">↑</span> : <span className="text-white">↓</span>;
  };

  const sorted = sortConfig
    ? [...tickets].sort((a: any, b: any) => {
        const { key, direction } = sortConfig;
        const mul = direction === 'asc' ? 1 : -1;
        if (key === 'priority') {
          const w: Record<string, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return ((w[a.priority] || 0) - (w[b.priority] || 0)) * mul;
        }
        if (key === 'assignee') {
          const aV = a.assigned_to_user?.full_name || '';
          const bV = b.assigned_to_user?.full_name || '';
          return aV < bV ? -mul : aV > bV ? mul : 0;
        }
        if (a[key] < b[key]) return -mul;
        if (a[key] > b[key]) return  mul;
        return 0;
      })
    : tickets;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search by ID or Title..."
            defaultValue={searchParams.get('q') ?? ''}
            onChange={(e) => { const v = e.target.value; setTimeout(() => handleFilter('q', v), 300); }}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm rounded-lg pl-4 py-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-2">
          <select
            defaultValue={searchParams.get('status') ?? ''}
            onChange={(e) => handleFilter('status', e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 outline-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
          >
            <option value="">All Statuses</option>
            <option value="NEW">New</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SOLVED">Solved</option>
            <option value="FAILED">Failed</option>
            <option value="MERGED">Merged</option>
            <option value="DRAFT">Draft</option>
          </select>
          <select
            defaultValue={searchParams.get('priority') ?? ''}
            onChange={(e) => handleFilter('priority', e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg px-3 py-2.5 focus:border-emerald-500 outline-none cursor-pointer hover:bg-zinc-800/50 transition-colors"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {(searchParams.get('q') || searchParams.get('status') || searchParams.get('priority')) && (
            <button onClick={() => replace(pathname)}
              className="px-3 py-2.5 text-xs font-bold text-zinc-500 hover:text-red-400 hover:bg-red-950/20 border border-transparent hover:border-red-900/50 rounded-lg transition-all">
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table — with inner border box preserved */}
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-x-auto">
        <table className="w-full text-left text-sm min-w-[900px]">
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
              <th className="px-6 py-3 w-44 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort('created_at')}>
                <div className="flex items-center gap-1.5">Date Created {getSortIcon('created_at')}</div>
              </th>
              <th className="px-6 py-3 w-40 cursor-pointer hover:text-white whitespace-nowrap" onClick={() => handleSort('assignee')}>
                <div className="flex items-center gap-1.5">Assignee {getSortIcon('assignee')}</div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sorted.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-12 text-center text-zinc-500">No tickets match your filters.</td></tr>
            ) : sorted.map((ticket) => (
              <tr key={ticket.id} className="group hover:bg-zinc-900/30 transition-colors">
                <td className="px-6 py-4 text-zinc-500 font-mono whitespace-nowrap">#{ticket.id}</td>
                <td className="px-6 py-4 w-full max-w-0">
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <Link href={`/tickets/${ticket.id}`} className="font-medium text-zinc-200 hover:text-white hover:underline block truncate transition-colors">
                        {ticket.title || 'Untitled Ticket'}
                      </Link>
                      {unreadCounts[String(ticket.id)] > 0 && (
                        <span className="flex-shrink-0 flex items-center gap-1 bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                          Unread
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 truncate block mt-0.5">{ticket.description}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={ticket.status} /></td>
                <td className="px-6 py-4 whitespace-nowrap"><PriorityIcon priority={ticket.priority} /></td>
                <td className="px-6 py-4 text-zinc-500 whitespace-nowrap">
                  {new Date(ticket.created_at).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                  {ticket.assigned_to_user?.full_name || <span className="text-zinc-600">Unassigned</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap border ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
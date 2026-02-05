// src/components/AdminTicketTable.tsx

'use client';

import { useState } from 'react';
import Link from 'next/link';
import PriorityIcon from './PriorityIcon';
import MergeTicketModal from './MergeTicketModal';

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

// ✨ NEW: Helper function for DD-MM-YYYY format
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, '-');
};

export default function AdminTicketTable({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  
  // Selection State
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);

  // --- Sorting Logic ---
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';

    const sortedData = [...tickets].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'assignee') {
        aValue = a.assigned_to_user?.full_name || '';
        bValue = b.assigned_to_user?.full_name || '';
      }
      if (key === 'priority') {
        return (priorityRank[a.priority] - priorityRank[b.priority]) * (direction === 'asc' ? 1 : -1);
      }
      if (key === 'deadline') {
        if (!aValue) return 1; 
        if (!bValue) return -1;
      }
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setTickets(sortedData);
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: string) => {
    if (sortConfig?.key !== name) return <span className="ml-1 text-zinc-600">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-white">↑</span> : <span className="ml-1 text-white">↓</span>;
  };

  // --- Selection Logic ---
  const toggleSelectAll = () => {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(tickets.map(t => t.id));
    }
  };

  const toggleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="relative">
      <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
              {/* Checkbox Column */}
              <th className="px-6 py-3 w-10">
                <input 
                  type="checkbox" 
                  className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"
                  checked={tickets.length > 0 && selectedIds.length === tickets.length}
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>ID {getSortIcon('id')}</th>
              <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>Subject {getSortIcon('title')}</th>
              <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('status')}>Status {getSortIcon('status')}</th>
              <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('priority')}>Priority {getSortIcon('priority')}</th>
              <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('deadline')}>Deadline {getSortIcon('deadline')}</th>
              <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('assignee')}>Assignee {getSortIcon('assignee')}</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {tickets.map((ticket) => (
              <tr key={ticket.id} className={`group transition-colors ${selectedIds.includes(ticket.id) ? 'bg-emerald-950/10' : 'hover:bg-zinc-900/30'}`}>
                {/* Row Checkbox */}
                <td className="px-6 py-4">
                  <input 
                    type="checkbox" 
                    className="rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-0 cursor-pointer"
                    checked={selectedIds.includes(ticket.id)}
                    onChange={() => toggleSelect(ticket.id)}
                  />
                </td>
                <td className="px-6 py-4 text-zinc-500 font-mono">#{ticket.id}</td>
                <td className="px-6 py-4">
                  <span className="font-medium text-zinc-200 group-hover:text-white block">{ticket.title || 'Untitled Ticket'}</span>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px] block">{ticket.description}</span>
                </td>
                <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
                <td className="px-6 py-4"><div className="flex items-center"><PriorityIcon priority={ticket.priority} /></div></td>
                
                {/* ✨ UPDATED: Apply formatDate here */}
                <td className="px-6 py-4 text-zinc-400">
                  {ticket.deadline ? (
                      <span className="text-zinc-300 font-mono text-xs">
                        {formatDate(ticket.deadline)}
                      </span>
                  ) : <span className="text-zinc-700">-</span>}
                </td>

                <td className="px-6 py-4 text-zinc-400">
                  {ticket.assigned_to_user?.full_name || <span className="text-zinc-600 italic">Unassigned</span>}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link 
                    href={ticket.status === 'DRAFT' ? `/admin/drafts/${ticket.id}` : `/admin/tickets/${ticket.id}`} 
                    className="text-zinc-400 hover:text-white hover:underline"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {tickets.length === 0 && <div className="p-12 text-center text-zinc-500 border-t border-zinc-800">No tickets found.</div>}
      </div>

      {/* Bulk Action Bar (Floating) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-zinc-900 border border-zinc-700 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-sm font-medium text-white">
            <span className="text-emerald-400 font-bold">{selectedIds.length}</span> tickets selected
          </div>
          <div className="h-4 w-px bg-zinc-700"></div>
          <button 
             onClick={() => setIsMergeModalOpen(true)}
             disabled={selectedIds.length < 2}
             className="text-sm font-medium text-zinc-200 hover:text-white hover:underline disabled:opacity-50 disabled:no-underline flex items-center gap-2"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
             Merge Selected
          </button>
          <button 
             onClick={() => setSelectedIds([])}
             className="text-zinc-500 hover:text-zinc-300"
          >
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Merge Modal */}
      {isMergeModalOpen && (
        <MergeTicketModal 
          isOpen={isMergeModalOpen}
          onClose={() => setIsMergeModalOpen(false)}
          selectedTicketIds={selectedIds}
          onSuccess={() => {
            setIsMergeModalOpen(false);
            setSelectedIds([]);
            window.location.reload(); 
          }}
        />
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
    DRAFT: "bg-zinc-800 text-zinc-400 border-zinc-700"
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.DRAFT}`}>{status.replace('_', ' ')}</span>;
}

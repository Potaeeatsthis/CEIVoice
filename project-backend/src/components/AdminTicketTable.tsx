// src/components/AdminTicketTable.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';

// Reuse your Ticket type
type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'DRAFT' | 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED' | 'MERGED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  assigned_to_user: { full_name: string } | null;
  created_by_user: { full_name: string; email: string } | null;
};

// Priority Rank for Sorting (High to Low)
const priorityRank = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export default function AdminTicketTable({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    // Toggle direction if clicking the same header
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sortedData = [...tickets].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

      // Custom Handling for specific columns
      if (key === 'assignee') {
        aValue = a.assigned_to_user?.full_name || '';
        bValue = b.assigned_to_user?.full_name || '';
      }
      if (key === 'priority') {
        // @ts-ignore
        return (priorityRank[a.priority] - priorityRank[b.priority]) * (direction === 'asc' ? 1 : -1);
      }
      
      // Standard String/Number comparison
      if (aValue < bValue) return direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setTickets(sortedData);
    setSortConfig({ key, direction });
  };

  // Helper to render sort arrow
  const getSortIcon = (name: string) => {
    if (sortConfig?.key !== name) return <span className="ml-1 text-zinc-600">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1 text-white">↑</span> : <span className="ml-1 text-white">↓</span>;
  };

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            {/* Clickable Headers */}
            <th className="px-6 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('id')}>
              ID {getSortIcon('id')}
            </th>
            <th className="px-6 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('title')}>
              Subject {getSortIcon('title')}
            </th>
            <th className="px-6 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('status')}>
              Status {getSortIcon('status')}
            </th>
            <th className="px-6 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('priority')}>
              Priority {getSortIcon('priority')}
            </th>
            <th className="px-6 py-3 font-medium cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('assignee')}>
              Assignee {getSortIcon('assignee')}
            </th>
            <th className="px-6 py-3 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {tickets.map((ticket) => (
            <tr key={ticket.id} className="group hover:bg-zinc-900/30 transition-colors">
              <td className="px-6 py-4 text-zinc-500 font-mono">#{ticket.id}</td>
              <td className="px-6 py-4">
                <span className="font-medium text-zinc-200 group-hover:text-white block">
                  {ticket.title || 'Untitled Ticket'}
                </span>
                <span className="text-xs text-zinc-500 truncate max-w-[200px] block">
                  {ticket.description}
                </span>
              </td>
              <td className="px-6 py-4"><StatusBadge status={ticket.status} /></td>
              <td className="px-6 py-4"><PriorityBadge priority={ticket.priority} /></td>
              <td className="px-6 py-4 text-zinc-400">
                {ticket.assigned_to_user?.full_name || <span className="text-zinc-600 italic">Unassigned</span>}
              </td>
              <td className="px-6 py-4 text-right">
                <Link href={`/admin/tickets/${ticket.id}`} className="text-zinc-400 hover:text-white hover:underline">
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tickets.length === 0 && (
        <div className="p-12 text-center text-zinc-500 border-t border-zinc-800">
          No tickets found.
        </div>
      )}
    </div>
  );
}

// --- Helper Components (Moved here so they can be used by the client component) ---

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: "bg-blue-950/30 text-blue-400 border-blue-900",
    IN_PROGRESS: "bg-amber-950/30 text-amber-400 border-amber-900",
    SOLVED: "bg-emerald-950/30 text-emerald-400 border-emerald-900",
    MERGED: "bg-purple-950/30 text-purple-400 border-purple-900",
    DRAFT: "bg-zinc-900 text-zinc-500 border-zinc-800"
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${styles[status] || styles.DRAFT}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const color = priority === 'HIGH' ? 'text-red-400 font-bold' : priority === 'MEDIUM' ? 'text-orange-400 font-medium' : 'text-zinc-500';
  return <span className={`text-xs ${color}`}>{priority}</span>;
}

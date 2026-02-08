'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import PriorityIcon from './PriorityIcon';

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
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
};

// Helper for DD-MM-YYYY format
const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString)
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    .replace(/\//g, '-');
};

export default function AssigneeTicketTable({ initialTickets }: { initialTickets: Ticket[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sortedData = [...tickets].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

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
    return sortConfig.direction === 'asc'
      ? <span className="ml-1 text-white">↑</span>
      : <span className="ml-1 text-white">↓</span>;
  };

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
              ID {getSortIcon('id')}
            </th>
            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
              Subject {getSortIcon('title')}
            </th>

            {/* ⬇️ WIDER STATUS COLUMN */}
            <th
              className="px-6 py-3 cursor-pointer hover:text-white min-w-[180px]"
              onClick={() => handleSort('status')}
            >
              Status {getSortIcon('status')}
            </th>

            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('priority')}>
              Priority {getSortIcon('priority')}
            </th>

            {/* ⬇️ WIDER DEADLINE COLUMN */}
            <th
              className="px-6 py-3 cursor-pointer hover:text-white min-w-[170px]"
              onClick={() => handleSort('deadline')}
            >
              Deadline {getSortIcon('deadline')}
            </th>

            <th className="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800">
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="group transition-colors hover:bg-zinc-900/30"
            >
              <td className="px-6 py-4 text-zinc-500 font-mono">
                #{ticket.id}
              </td>

              <td className="px-6 py-4">
                <span className="font-medium text-zinc-200 group-hover:text-white block">
                  {ticket.title || 'Untitled Ticket'}
                </span>
                <span className="text-xs text-zinc-500 truncate max-w-[220px] block">
                  {ticket.description}
                </span>
              </td>

              {/* ⬇️ STATUS CELL – NO WRAP */}
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={ticket.status} />
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center">
                  <PriorityIcon priority={ticket.priority} />
                </div>
              </td>

              {/* ⬇️ DEADLINE CELL – NO WRAP */}
              <td className="px-6 py-4 text-zinc-400 whitespace-nowrap">
                {ticket.deadline ? (
                  <span className="text-zinc-300 font-mono text-xs">
                    {formatDate(ticket.deadline)}
                  </span>
                ) : (
                  <span className="text-zinc-700">-</span>
                )}
              </td>

              <td className="px-6 py-4 text-right">
                <Link
                  href={`/assignee/tickets/${ticket.id}`}
                  className="text-zinc-400 hover:text-white hover:underline"
                >
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

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEW: 'bg-blue-950/30 text-blue-400 border-blue-900',
    IN_PROGRESS: 'bg-amber-950/30 text-amber-400 border-amber-900',
    SOLVED: 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
    FAILED: 'bg-red-950/30 text-red-400 border-red-900',
  };

  return (
    <span
      className={`px-3 py-1 rounded text-xs font-medium border whitespace-nowrap ${styles[status] || styles.DRAFT}`}
    >
      {status.replace('_', ' ')}
    </span>
  );
}

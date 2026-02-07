'use client';

import { useState } from 'react';
import Link from 'next/link';
import PriorityIcon from './PriorityIcon';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'NEW' | 'IN_PROGRESS' | 'SOLVED' | 'FAILED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline: string | null;
  assignee_name?: string | null;
};

const priorityRank: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const statusStyles: Record<string, string> = {
  NEW: 'bg-blue-950/30 text-blue-400 border-blue-900',
  IN_PROGRESS: 'bg-amber-950/30 text-amber-400 border-amber-900',
  SOLVED: 'bg-emerald-950/30 text-emerald-400 border-emerald-900',
  FAILED: 'bg-red-950/30 text-red-400 border-red-900',
};

export default function AssigneeTicketTable({
  initialTickets,
}: {
  initialTickets: Ticket[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Ticket;
    direction: 'asc' | 'desc';
  } | null>(null);

  // ---------- Sorting ----------
  const handleSort = (key: keyof Ticket) => {
    let direction: 'asc' | 'desc' = 'asc';

    if (sortConfig?.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sorted = [...tickets].sort((a: any, b: any) => {
      if (key === 'priority') {
        return (
          (priorityRank[a.priority] - priorityRank[b.priority]) *
          (direction === 'asc' ? 1 : -1)
        );
      }

      if (!a[key]) return 1;
      if (!b[key]) return -1;

      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setTickets(sorted);
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: keyof Ticket) => {
    if (sortConfig?.key !== name)
      return <span className="ml-1 text-zinc-600">↕</span>;
    return sortConfig.direction === 'asc' ? (
      <span className="ml-1 text-white">↑</span>
    ) : (
      <span className="ml-1 text-white">↓</span>
    );
  };

  // ---------- UI ----------
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <th
              className="px-6 py-3 cursor-pointer hover:text-white"
              onClick={() => handleSort('id')}
            >
              ID {getSortIcon('id')}
            </th>

            <th
              className="px-6 py-3 cursor-pointer hover:text-white"
              onClick={() => handleSort('title')}
            >
              Subject {getSortIcon('title')}
            </th>

            <th
              className="px-6 py-3 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('status')}
            >
              Status {getSortIcon('status')}
            </th>

            <th
              className="px-6 py-3 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('priority')}
            >
              Priority {getSortIcon('priority')}
            </th>

            <th
              className="px-6 py-3 text-center cursor-pointer hover:text-white"
              onClick={() => handleSort('deadline')}
            >
              Deadline {getSortIcon('deadline')}
            </th>

            <th className="px-6 py-3 text-center">Assignee</th>

            <th className="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800">
          {tickets.map((ticket) => (
            <tr
              key={ticket.id}
              className="hover:bg-zinc-900/40 transition-colors"
            >
              {/* ID */}
              <td className="px-6 py-4 font-mono text-zinc-500">
                #{ticket.id}
              </td>

              {/* Subject */}
              <td className="px-6 py-4">
                <div className="font-medium text-zinc-200">
                  {ticket.title || 'Untitled'}
                </div>
                <div className="text-xs text-zinc-500 truncate max-w-[260px]">
                  {ticket.description}
                </div>
              </td>

              {/* Status (READ-ONLY) */}
              <td className="px-6 py-4 text-center">
                <span
                  className={`inline-block border rounded px-3 py-1 text-xs font-medium ${statusStyles[ticket.status]}`}
                >
                  {ticket.status.replace('_', ' ')}
                </span>
              </td>

              {/* Priority */}
              <td className="px-6 py-4 text-center">
                <PriorityIcon priority={ticket.priority} />
              </td>

              {/* Deadline */}
              <td className="px-6 py-4 text-center text-xs text-zinc-400">
                {ticket.deadline
                  ? new Date(ticket.deadline).toLocaleDateString()
                  : '—'}
              </td>

              {/* Assignee */}
              <td className="px-6 py-4 text-center text-xs text-zinc-300">
                {ticket.assignee_name || 'Unassigned'}
              </td>

              {/* Action */}
              <td className="px-6 py-4 text-right">
                <Link
                  href={`/assignee/tickets/${ticket.id}`}
                  className="text-purple-400 hover:text-purple-300 hover:underline text-xs font-medium"
                >
                  Manage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {tickets.length === 0 && (
        <div className="p-10 text-center text-zinc-500">
          No tickets assigned to you.
        </div>
      )}
    </div>
  );
}

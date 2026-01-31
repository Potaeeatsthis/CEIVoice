'use client';

import { useState } from 'react';
import Link from 'next/link';
import PriorityIcon from './PriorityIcon';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: 'NEW' |'IN_PROGRESS' | 'SOLVED' | 'FAILED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
};

const priorityRank: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/* ✅ colored when CLOSED only */
const statusStyles: Record<string, string> = {
    NEW: "bg-blue-950/30 text-blue-400 border-blue-900",
    IN_PROGRESS: "bg-amber-950/30 text-amber-400 border-amber-900",
    SOLVED: "bg-emerald-950/30 text-emerald-400 border-emerald-900",
    MERGED: "bg-purple-950/30 text-purple-400 border-purple-900",
    DRAFT: "bg-zinc-900 text-zinc-500 border-zinc-800"
  };

export default function AssigneeTicketTable({
  initialTickets,
}: {
  initialTickets: Ticket[];
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  } | null>(null);

  // ---------- Sorting ----------
  const handleSort = (key: string) => {
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

      if (a[key] < b[key]) return direction === 'asc' ? -1 : 1;
      if (a[key] > b[key]) return direction === 'asc' ? 1 : -1;
      return 0;
    });

    setTickets(sorted);
    setSortConfig({ key, direction });
  };

  const getSortIcon = (name: string) => {
  if (sortConfig?.key !== name) return <span className="ml-1 text-zinc-600">↕</span>;
  return sortConfig.direction === 'asc' ? <span className="ml-1 text-white">↑</span> : <span className="ml-1 text-white">↓</span>;
};

  // ---------- Status Update ----------
  const updateStatus = async (id: number, newStatus: string) => {
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus as any } : t))
    );
  };

  // ---------- UI ----------
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
              ID {getSortIcon('id')}
            </th>

            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
              Subject {getSortIcon('title')}
            </th>

            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('priority')}>
              Priority {getSortIcon('priority')}
            </th>

            <th className="px-6 py-3 text-center cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
              Status {getSortIcon('status')}
            </th>

            <th className="px-6 py-3 text-right cursor-pointer hover:text-white" onClick={() => handleSort('created_at')}>
              Created {getSortIcon('created_at)}')}
            </th>

            {/* ✅ NEW COLUMN */}
            <th className="px-6 py-3 text-right"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800">
          {tickets.map((ticket) => {
            const date = new Date(ticket.created_at);

            return (
              <tr key={ticket.id} className="hover:bg-zinc-900/40 transition-colors">
                <td className="px-6 py-4 text-zinc-500 font-mono">
                  #{ticket.id}
                </td>

                <td className="px-6 py-4">
                  <div className="font-medium text-zinc-200">
                    {ticket.title || 'Untitled'}
                  </div>
                  <div className="text-xs text-zinc-500 truncate max-w-[260px]">
                    {ticket.description}
                  </div>
                </td>

                <td className="px-6 py-4 text-center">
                  <PriorityIcon priority={ticket.priority} />
                </td>

                {/* Status dropdown */}
                <td className="px-6 py-4 text-center">
                  <select
                    value={ticket.status}
                    onChange={(e) => updateStatus(ticket.id, e.target.value)}
                    className={`
                      border rounded px-3 py-1 text-xs font-medium
                      focus:outline-none
                      ${statusStyles[ticket.status]}
                    `}
                  >
                    <option className="bg-zinc-900 text-white" value="NEW">
                      NEW
                    </option>
                    <option className="bg-zinc-900 text-white" value="IN_PROGRESS">
                      IN PROGRESS
                    </option>
                    <option className="bg-zinc-900 text-white" value="SOLVED">
                      SOLVED
                    </option>
                    <option className="bg-zinc-900 text-white" value="FAILED">
                      FAILED
                    </option>
                  </select>
                </td>

                {/* ✅ Date + Time */}
                <td className="px-6 py-4 text-right text-xs text-zinc-400">
                  <div>{date.toLocaleDateString()}</div>
                  <div className="text-zinc-600">
                    {date.toLocaleTimeString()}
                  </div>
                </td>

                {/* ✅ Edit link */}
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/assignee/tickets/${ticket.id}`}
                    className="text-purple-400 hover:text-purple-300 hover:underline text-xs font-medium"
                  >
                    Manage
                  </Link>
                </td>
              </tr>
            );
          })}
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

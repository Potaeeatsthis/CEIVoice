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
  created_at: string;
};

const priorityRank: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

const statusStyles: Record<Ticket['status'], string> = {
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
  const [tickets] = useState(initialTickets);

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 overflow-hidden">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <th className="px-6 py-3">ID</th>
            <th className="px-6 py-3">Subject</th>
            <th className="px-6 py-3 text-center">Priority</th>
            <th className="px-6 py-3 text-center">Status</th>
            <th className="px-6 py-3 text-right">Created</th>
            <th className="px-6 py-3 text-right"></th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800">
          {tickets.map((ticket) => {
            const date = new Date(ticket.created_at);

            return (
              <tr
                key={ticket.id}
                className="hover:bg-zinc-900/40 transition-colors"
              >
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

                {/* ✅ READ-ONLY STATUS BADGE */}
                <td className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-md text-xs font-medium border ${statusStyles[ticket.status]}`}
                  >
                    {ticket.status.replace('_', ' ')}
                  </span>
                </td>

                <td className="px-6 py-4 text-right text-xs text-zinc-400">
                  <div>{date.toLocaleDateString()}</div>
                  <div className="text-zinc-600">
                    {date.toLocaleTimeString()}
                  </div>
                </td>

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

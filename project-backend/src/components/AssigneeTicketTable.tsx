'use client';

import { useState, useEffect, useMemo } from 'react';
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

  // 🔎 Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 📄 Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ticketsPerPage = 20;

  useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  // ================= FILTER + SEARCH + OVERDUE =================
  const filteredTickets = useMemo(() => {
    const today = new Date();

    return tickets.filter((ticket) => {
      const statusMatch =
        statusFilter === 'ALL' || ticket.status === statusFilter;

      const priorityMatch =
        priorityFilter === 'ALL' || ticket.priority === priorityFilter;

      const searchMatch =
        !searchTerm ||
        ticket.title?.toLowerCase().includes(searchTerm.toLowerCase());

      return statusMatch && priorityMatch && searchMatch;
    });
  }, [tickets, statusFilter, priorityFilter, searchTerm]);

  // ================= PAGINATION =================
  const totalPages = Math.ceil(filteredTickets.length / ticketsPerPage);

  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * ticketsPerPage,
    currentPage * ticketsPerPage
  );

  // ================= SORT =================
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }

    const sortedData = [...tickets].sort((a: any, b: any) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'priority') {
        return (priorityRank[a.priority] - priorityRank[b.priority]) *
          (direction === 'asc' ? 1 : -1);
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
    if (sortConfig?.key !== name)
      return <span className="ml-1 text-zinc-600">↕</span>;
    return sortConfig.direction === 'asc'
      ? <span className="ml-1 text-white">↑</span>
      : <span className="ml-1 text-white">↓</span>;
  };

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/40 backdrop-blur-sm overflow-hidden">

      {/* ================= FILTER BAR ================= */}
      <div className="flex flex-wrap gap-4 p-4 border-b border-zinc-800 bg-zinc-900/40">

        {/* 🔎 Search */}
        <input
          type="text"
          placeholder="Search by title..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-zinc-900 border border-zinc-700 text-sm px-3 py-2 w-[75%] rounded w-52"
        />

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-zinc-900 border border-zinc-700 text-sm px-3 py-2 rounded"
        >
          <option value="ALL">All Status</option>
          <option value="NEW">NEW</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="SOLVED">SOLVED</option>
          <option value="FAILED">FAILED</option>
        </select>

        {/* Priority */}
        <select
          value={priorityFilter}
          onChange={(e) => {
            setPriorityFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-zinc-900 border border-zinc-700 text-sm px-3 py-2 rounded"
        >
          <option value="ALL">All Priority</option>
          <option value="URGENT">URGENT</option>
          <option value="HIGH">HIGH</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="LOW">LOW</option>
        </select>

      </div>

      {/* ================= TABLE ================= */}
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50 text-zinc-400">
            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('id')}>
              ID {getSortIcon('id')}
            </th>
            <th className="px-6 py-4 w-[35%] cursor-pointer hover:text-white" onClick={() => handleSort('title')}>
              Subject {getSortIcon('title')}
            </th>
            <th className="px-6 py-3 min-w-[180px] cursor-pointer hover:text-white" onClick={() => handleSort('status')}>
              Status {getSortIcon('status')}
            </th>
            <th className="px-6 py-3 cursor-pointer hover:text-white" onClick={() => handleSort('priority')}>
              Priority {getSortIcon('priority')}
            </th>
            <th className="px-6 py-3 min-w-[170px] cursor-pointer hover:text-white" onClick={() => handleSort('deadline')}>
              Deadline {getSortIcon('deadline')}
            </th>
            <th className="px-6 py-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-zinc-800">
          {paginatedTickets.map((ticket) => (
            <tr key={ticket.id} className="group hover:bg-zinc-900/30">
              <td className="px-6 py-4 text-zinc-500 font-mono">#{ticket.id}</td>
              <td className="px-6 py-4">
                <span className="font-medium text-zinc-200 group-hover:text-white block">
                  {ticket.title || 'Untitled Ticket'}
                </span>
                <span className="text-xs text-zinc-500 truncate max-w-[220px] block">
                  {ticket.description}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={ticket.status} />
              </td>
              <td className="px-6 py-4">
                <PriorityIcon priority={ticket.priority} />
              </td>
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

      {/* ================= PAGINATION ================= */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border border-zinc-700 rounded disabled:opacity-40"
          >
            ←
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded border ${
                currentPage === i + 1
                  ? 'bg-zinc-700 border-zinc-500 text-white'
                  : 'border-zinc-700 text-zinc-400'
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border border-zinc-700 rounded disabled:opacity-40"
          >
            →
          </button>
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
    <span className={`px-3 py-1 rounded text-xs font-medium border whitespace-nowrap ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

// --- Types ---
interface Ticket {
  id: string;
  title: string;
  user_email: string;
  category: string;
  ai_summary: string | null;
  created_at: string;
}

export default function AdminDraftsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrafts();
  }, []);

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/drafts');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setTickets(json.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Draft Queue</h2>
          <p className="text-muted-foreground text-zinc-400">
            Review and approve AI-generated drafts before they are sent.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={fetchDrafts} disabled={loading} variant="outline">
            {loading ? (
              <RefreshCwIcon className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCwIcon className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-sm">
        <div className="p-6 flex flex-col space-y-1.5 border-b border-zinc-800">
          <h3 className="font-semibold leading-none tracking-tight">Pending Tickets</h3>
          <p className="text-sm text-zinc-400">
            There are {tickets.length} drafts waiting for your review.
          </p>
        </div>
        
        <div className="relative w-full overflow-auto">
          <table className="w-full caption-bottom text-sm text-left">
            <thead className="[&_tr]:border-b [&_tr]:border-zinc-800">
              <tr className="border-b border-zinc-800 transition-colors hover:bg-zinc-900/50">
                <th className="h-12 px-4 align-middle font-medium text-zinc-400 w-[100px]">
                  ID
                </th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">
                  Subject & Summary
                </th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">
                  Category
                </th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400">
                  Requester
                </th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400 text-right">
                  Date
                </th>
                <th className="h-12 px-4 align-middle font-medium text-zinc-400 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {loading ? (
                // Loading Skeleton Rows
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-zinc-800">
                    <td className="p-4"><div className="h-4 w-12 bg-zinc-800 rounded animate-pulse" /></td>
                    <td className="p-4">
                      <div className="space-y-2">
                        <div className="h-4 w-48 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-32 bg-zinc-800 rounded animate-pulse" />
                      </div>
                    </td>
                    <td className="p-4"><div className="h-5 w-20 bg-zinc-800 rounded-full animate-pulse" /></td>
                    <td className="p-4"><div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" /></td>
                    <td className="p-4" colSpan={2} />
                  </tr>
                ))
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center align-middle text-zinc-500">
                    No drafts found. Good job!
                  </td>
                </tr>
              ) : (
                tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="border-b border-zinc-800 transition-colors hover:bg-zinc-900/50"
                  >
                    <td className="p-4 align-middle font-mono text-xs text-zinc-500">
                      {ticket.id.slice(0, 8)}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="flex flex-col space-y-1">
                        <span className="font-medium text-zinc-200">
                          {ticket.title}
                        </span>
                        {ticket.ai_summary && (
                          <span className="text-xs text-zinc-400 line-clamp-1 max-w-[400px]">
                            <span className="font-semibold text-indigo-400/80 mr-1">AI:</span> 
                            {ticket.ai_summary}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 align-middle">
                      <Badge category={ticket.category} />
                    </td>
                    <td className="p-4 align-middle text-zinc-300">
                      <div className="flex items-center space-x-2">
                        <span className="truncate">{ticket.user_email}</span>
                      </div>
                    </td>
                    <td className="p-4 align-middle text-right text-zinc-400 whitespace-nowrap">
                      {new Date(ticket.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <Link
                        href={`/admin/drafts/${ticket.id}`}
                        className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 shadow transition-colors hover:bg-zinc-200/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- Inline "Shadcn-like" Components ---

// 1. Badge Component
function Badge({ category }: { category: string }) {
  const getStyle = (cat: string) => {
    switch (cat?.toLowerCase()) {
      case 'billing': 
        return 'border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20';
      case 'technical': 
        return 'border-blue-500/20 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20';
      case 'account': 
        return 'border-purple-500/20 bg-purple-500/10 text-purple-500 hover:bg-purple-500/20';
      default: 
        return 'border-zinc-800 bg-zinc-800 text-zinc-400 hover:bg-zinc-700';
    }
  };

  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2 ${getStyle(category)}`}>
      {category || 'General'}
    </div>
  );
}

// 2. Button Component (Simplified)
function Button({ 
  children, 
  variant = 'default', 
  className = '', 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'default' | 'outline' }) {
  
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 px-4 py-2";
  
  const variants = {
    default: "bg-zinc-50 text-zinc-900 hover:bg-zinc-50/90",
    outline: "border border-zinc-800 bg-zinc-950 hover:bg-zinc-800 hover:text-zinc-50 text-zinc-100"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// 3. Icons (Lucide style SVGs)
function RefreshCwIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}

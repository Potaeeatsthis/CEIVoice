// src/app/(dashboard)/user/tickets/[id]/page.tsx
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import PriorityIcon from '@/components/PriorityIcon';

async function getData(ticketId: number) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) return { authorized: false };

  const { data: ticket } = await supabaseAdmin
    .from('tickets')
    .select('*, assignee:assigned_to(full_name)')
    .eq('id', ticketId)
    .eq('created_by', userId)
    .single();

  if (!ticket) return null;

  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  return { authorized: true, ticket, comments: comments || [] };
}

export default async function UserTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getData(Number(params.id));

  if (!data || data.authorized === false) {
    redirect('/tickets');
  }

  const { ticket, comments = [] } = data;

  const isClosed =
    ticket.status === 'FAILED' ||
    ticket.status === 'RESOLVED' ||
    ticket.status === 'CLOSED';

  return (
    <div className="space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
      >
        ← Back
      </Link>

      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">
          {ticket.title || 'Untitled'}
        </h1>
        <span
          className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-full border ${
            ticket.status === 'FAILED'
              ? 'bg-red-500/10 text-red-400 border-red-500/30'
              : ticket.status === 'RESOLVED'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : ticket.status === 'CLOSED'
              ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
              : ticket.status === 'IN_PROGRESS'
              ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
          }`}
        >
          {ticket.status}
        </span>
      </div>

      <PriorityIcon priority={ticket.priority} />

      {/* ── Failure reason banner ── */}
      {ticket.status === 'FAILED' && ticket.failure_reason && (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
          <span className="mt-0.5 text-red-400 shrink-0">✕</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-0.5">
              Failure Reason
            </p>
            <p className="text-sm text-red-300">{ticket.failure_reason}</p>
          </div>
        </div>
      )}

      {/* ── Resolution note banner ── */}
      {ticket.status === 'RESOLVED' && ticket.failure_reason && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
          <span className="mt-0.5 text-emerald-400 shrink-0">✓</span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400 mb-0.5">
              Resolution Note
            </p>
            <p className="text-sm text-emerald-300">{ticket.failure_reason}</p>
          </div>
        </div>
      )}

      <p className="text-zinc-400 whitespace-pre-wrap">{ticket.description}</p>

      {/* Comments */}
      {comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((c: any) => (
            <div
              key={c.id}
              className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-300">
                  {c.user?.full_name || 'Support'}
                </span>
                <span className="text-xs text-zinc-600 font-mono">
                  {new Date(c.created_at).toLocaleString([], {
                    year: 'numeric',
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-zinc-400 whitespace-pre-wrap">
                {c.message}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Closed notice */}
      {isClosed && (
        <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-500">
          <span>⚠</span>
          <span>
            This ticket is{' '}
            <span
              className={
                ticket.status === 'FAILED'
                  ? 'text-red-400 font-semibold'
                  : ticket.status === 'RESOLVED'
                  ? 'text-emerald-400 font-semibold'
                  : 'text-zinc-400 font-semibold'
              }
            >
              {ticket.status}
            </span>{' '}
            — no further replies are allowed.
          </span>
        </div>
      )}
    </div>
  );
}
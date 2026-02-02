import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import PriorityIcon from '@/components/PriorityIcon';

async function getData(ticketId: number) {
  const cookieStore = await cookies();

  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  if (!userId) return { authorized: false };

  /* ---------------- Role-based ticket query ---------------- */

  let query = supabaseAdmin
  .from('tickets')
  .select('*')
  .eq('id', ticketId);


  // USER → only own tickets
  if (userRole === 'USER') {
    query = query.eq('created_by', userId);
  }

  // ASSIGNEE → only assigned tickets
  if (userRole === 'ASSIGNEE') {
    query = query.eq('assigned_to', userId); // ⚠️ ensure column name matches DB
  }

  // ADMIN → no extra filter

  const { data: ticket } = await query.maybeSingle();

  if (!ticket) return { authorized: false };

  /* ---------------- Comments ---------------- */

  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  return {
    authorized: true,
    ticket,
    comments: comments || [],
    isReadOnly: userRole === 'ASSIGNEE',
  };
}

export default async function UserTicketDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const data = await getData(Number(params.id));

  if (!data?.authorized) {
    redirect('/tickets');
  }

  const { ticket, comments, isReadOnly } = data;

  return (
    <div className="space-y-8">

      {/* header */}
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-6">
        <Link
          href="/tickets"
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400"
        >
          ←
        </Link>

        <h1 className="text-xl font-bold text-white">
          Ticket #{ticket.id}
        </h1>
      </div>

      {/* info */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4">
        <PriorityIcon priority={ticket.priority} />

        <div className="text-white font-medium">
          {ticket.title}
        </div>

        <p className="text-zinc-400 whitespace-pre-wrap">
          {ticket.description}
        </p>

        {isReadOnly && (
          <div className="text-xs text-amber-400">
            Read-only (Assignee cannot modify this ticket)
          </div>
        )}
      </div>

      {/* comments */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-3">
        {comments.map((c: any) => (
          <div key={c.id} className="text-sm text-zinc-300">
            <span className="text-zinc-500">{c.user?.full_name}:</span>{' '}
            {c.message}
          </div>
        ))}
      </div>

    </div>
  );
}

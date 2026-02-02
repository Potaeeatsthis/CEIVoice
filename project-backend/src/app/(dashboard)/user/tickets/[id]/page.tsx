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
    .select('*')
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

  // ✅ FIXED redirect path
  if (!data || data.authorized === false) {
    redirect('/tickets');
  }

  const { ticket, comments } = data;

  return (
    <div className="space-y-6">
      {/* ✅ FIXED back link */}
      <Link href="/tickets">← Back</Link>

      <h1 className="text-2xl font-bold text-white">
        {ticket.title || 'Untitled'}
      </h1>

      <PriorityIcon priority={ticket.priority} />

      <p className="text-zinc-400 whitespace-pre-wrap">
        {ticket.description}
      </p>

      <div className="text-sm text-zinc-500">
        Read-only ticket
      </div>

      {comments.map((c) => (
        <div key={c.id}>{c.message}</div>
      ))}
    </div>
  );
}

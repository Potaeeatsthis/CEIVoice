// src/app/(dashboard)/tickets/[id]/page.tsx

import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import UserTicketDetailView from '@/components/UserTicketDetailView';

async function getData(ticketId: string) {
  const cookieStore = await cookies();
  const userId   = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  if (!userId || userRole !== 'USER') return { authorized: false };

  // Fetch the ticket — no created_by filter so community tickets work too
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `)
    .eq('id', ticketId)
    .not('status', 'eq', 'DRAFT') // never expose drafts to users
    .single();

  if (error || !ticket) return null;

  // Public comments only for users (no internal notes)
  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  // Fetch current user's name for the chat
  const { data: currentUserRecord } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

  const isOwner = ticket.created_by === userId;

  return {
    authorized: true,
    ticket,
    comments: comments || [],
    isOwner,
    currentUser: {
      id:   userId,
      name: currentUserRecord?.full_name || 'You',
    },
  };
}

export default async function UserTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data   = await getData(id);

  if (data && data.authorized === false) redirect('/tickets');
  if (!data || !data.ticket) {
    return (
      <div className="p-12 text-center border border-zinc-800 rounded-xl bg-zinc-950/40">
        <p className="text-zinc-400 text-lg font-medium mb-1">Ticket not found</p>
        <p className="text-zinc-600 text-sm mb-6">This ticket may have been removed or is not visible.</p>
        <Link href="/tickets" className="text-blue-400 hover:text-blue-300 hover:underline text-sm">
          ← Back to My Tickets
        </Link>
      </div>
    );
  }

  const { ticket, comments, isOwner, currentUser } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-5 border-b border-zinc-800">
        <Link
          href={isOwner ? '/tickets' : '/user/community'}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>

        <div className="flex items-center gap-3 min-w-0">
          <span className="text-zinc-600 font-mono text-sm flex-shrink-0">#{ticket.id}</span>
          <h1 className="text-xl font-bold text-white truncate">
            {ticket.title || 'Untitled Request'}
          </h1>
        </div>

        {!isOwner && (
          <span className="ml-auto flex-shrink-0 text-xs text-zinc-500 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
            Following
          </span>
        )}
      </div>

      {/* Detail view */}
      <UserTicketDetailView
        ticket={ticket}
        initialComments={comments}
        currentUser={currentUser}
        isOwner={isOwner}
      />
    </div>
  );
}

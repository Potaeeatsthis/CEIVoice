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

  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `)
    .eq('id', ticketId)
    .single();

  if (error || !ticket) return null;

  const isOwner = ticket.created_by === userId;

  if (ticket.status === 'DRAFT' && !isOwner) return null;

  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  const { data: currentUserRecord } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', userId)
    .single();

  const { data: followData } = await supabaseAdmin
    .from('ticket_followers')
    .select('ticket_id')
    .eq('ticket_id', ticketId)
    .eq('user_id', userId)
    .maybeSingle();

  const isFollowing = !!followData;

  return {
    authorized: true,
    ticket,
    comments: comments || [],
    isOwner,
    isFollowing,
    currentUser: {
      id:   userId,
      name: currentUserRecord?.full_name || 'You',
    },
  };
}

const STATUS_STYLES: Record<string, string> = {
  NEW:         'bg-blue-950/40 text-blue-400 border-blue-900',
  IN_PROGRESS: 'bg-amber-950/40 text-amber-400 border-amber-900',
  SOLVED:      'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  FAILED:      'bg-red-950/40 text-red-400 border-red-900',
  MERGED:      'bg-purple-950/40 text-purple-400 border-purple-900',
  DRAFT:       'bg-zinc-900 text-zinc-500 border-zinc-800',
};

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

  const { ticket, comments, isOwner, isFollowing, currentUser } = data;
  const backHref = isOwner ? '/tickets' : '/user/community';

  return (
    <div className="space-y-6">
      {/* Header — matches admin style exactly */}
      <div className="flex items-center gap-3 pb-5 border-b border-zinc-800">
        {/* Circular back button */}
        <Link
          href={backHref}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0"
        >
          &larr;
        </Link>

        {/* Ticket number */}
        <span className="text-zinc-500 font-mono text-sm flex-shrink-0">#{ticket.id}</span>

        {/* Title */}
        <h1 className="text-xl font-bold text-white truncate">
          {ticket.title || 'Untitled Request'}
        </h1>

        {/* Status badge — same as admin header */}
        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded text-xs font-semibold border ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.DRAFT}`}>
          {ticket.status.replace('_', ' ')}
        </span>

        {/* Following badge on the right */}
        {!isOwner && (
          <span className="ml-auto flex-shrink-0 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
            {isFollowing ? 'Following' : 'Community Ticket'}
          </span>
        )}
      </div>

      {/* Detail view */}
      <UserTicketDetailView
        ticket={ticket}
        initialComments={comments}
        currentUser={currentUser}
        isOwner={isOwner}
        isFollowing={isFollowing}
      />
    </div>
  );
}
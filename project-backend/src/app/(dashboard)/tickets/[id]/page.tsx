// src/app/(dashboard)/tickets/[id]/page.tsx

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import UserTicketDetailView from '@/components/UserTicketDetailView';

const STATUS_STYLES: Record<string, string> = {
  NEW:         'bg-blue-950/40 text-blue-400 border-blue-900',
  IN_PROGRESS: 'bg-amber-950/40 text-amber-400 border-amber-900',
  SOLVED:      'bg-emerald-950/40 text-emerald-400 border-emerald-900',
  FAILED:      'bg-red-950/40 text-red-400 border-red-900',
  MERGED:      'bg-purple-950/40 text-purple-400 border-purple-900',
  DRAFT:       'bg-zinc-900 text-zinc-500 border-zinc-800',
};

async function getData(ticketId: string) {
  const cookieStore = await cookies();
  const userId   = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  const isGuest = !userId;

  // Fetch ticket with assignee info
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      created_by_user:users!tickets_created_by_fkey (full_name, email),
      assignee:users!tickets_assigned_to_fkey (id, full_name, email, role)
    `)
    .eq('id', ticketId)
    .single();

  if (error || !ticket) return null;

  const isOwner = userId ? ticket.created_by === userId : false;
  if (ticket.status === 'DRAFT' && !isGuest && !isOwner) return null;

  // Fetch followers for this ticket
  const { data: followersData } = await supabaseAdmin
    .from('ticket_followers')
    .select('user_id, user:users(id, full_name, email)')
    .eq('ticket_id', ticketId);

  const followers = (followersData || []).map((f: any) => f.user).filter(Boolean);

  if (isGuest) {
    return {
      isGuest: true,
      ticket,
      comments: [],
      isOwner: false,
      isFollowing: false,
      currentUser: { id: '', name: 'Guest' },
      followers,
    };
  }

  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .eq('is_internal', false)
    .order('created_at', { ascending: true });

  const { data: currentUserRecord } = await supabaseAdmin
    .from('users')
    .select('full_name')
    .eq('id', userId!)
    .single();

  const { data: followData } = await supabaseAdmin
    .from('ticket_followers')
    .select('ticket_id')
    .eq('ticket_id', ticketId)
    .eq('user_id', userId!)
    .maybeSingle();

  return {
    isGuest: false,
    ticket,
    comments: comments || [],
    isOwner,
    isFollowing: !!followData,
    currentUser: {
      id:   userId!,
      name: currentUserRecord?.full_name || 'You',
    },
    followers,
  };
}

export default async function UserTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data   = await getData(id);

  if (!data || !data.ticket) {
    return (
      <div className="p-12 text-center border border-zinc-800 rounded-xl bg-zinc-950/40">
        <p className="text-zinc-400 text-lg font-medium mb-1">Ticket not found</p>
        <p className="text-zinc-600 text-sm mb-6">This ticket may have been removed or is not visible.</p>
        <Link href="/login" className="text-blue-400 hover:text-blue-300 hover:underline text-sm">
          ← Sign in
        </Link>
      </div>
    );
  }

  const { ticket, comments, isOwner, isFollowing, currentUser, isGuest, followers } = data;
  const backHref = isGuest ? '/login' : isOwner ? '/tickets' : '/user/community';

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Guest banner */}
      {isGuest && (
        <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-blue-900/50 bg-blue-950/20">
          <div className="flex items-center gap-2 text-sm text-blue-300">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            You're viewing this ticket as a guest. Sign in to reply and track updates.
          </div>
          <Link
            href={`/login?redirect=/tickets/${id}`}
            className="flex-shrink-0 ml-4 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 pb-5 border-b border-zinc-800">
        <Link
          href={backHref}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all flex-shrink-0"
        >
          &larr;
        </Link>

        <span className="text-zinc-500 font-mono text-sm flex-shrink-0">#{ticket.id}</span>

        <h1 className="text-xl font-bold text-white truncate">
          {ticket.title || 'Untitled Request'}
        </h1>

        <span className={`flex-shrink-0 px-2.5 py-0.5 rounded text-xs font-semibold border ${STATUS_STYLES[ticket.status] ?? STATUS_STYLES.DRAFT}`}>
          {ticket.status.replace('_', ' ')}
        </span>

        {!isOwner && !isGuest && (
          <span className="ml-auto flex-shrink-0 text-xs text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-full">
            {isFollowing ? 'Following' : 'Community Ticket'}
          </span>
        )}
      </div>

      {/* Detail view */}
      <div className="flex-1 min-h-0">
        <UserTicketDetailView
          ticket={ticket}
          initialComments={comments}
          currentUser={currentUser}
          isOwner={isOwner}
          isFollowing={isFollowing}
          isGuest={isGuest}
          followers={followers}
        />
      </div>
    </div>
  );
}
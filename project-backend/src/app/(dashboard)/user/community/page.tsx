// src/app/(dashboard)/user/community/page.tsx

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import CommunityTicketTable from '@/components/CommunityTicketTable';

type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  category: string | null;
};

async function getCommunityData(userId: string): Promise<{
  tickets: Ticket[];
  followedIds: number[];
}> {
  // All visible tickets NOT owned by the current user, excluding DRAFT and MERGED
  const { data: tickets, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select('id, title, description, status, priority, created_at, category')
    .neq('created_by', userId)
    .not('status', 'in', '("DRAFT","MERGED")')
    .order('created_at', { ascending: false });

  if (ticketError) {
    console.error('Community tickets error:', ticketError.message);
  }

  // Tickets the user already follows
  const { data: followed, error: followError } = await supabaseAdmin
    .from('ticket_followers')
    .select('ticket_id')
    .eq('user_id', userId);

  if (followError) {
    console.error('Followed tickets error:', followError.message);
  }

  const followedIds = (followed || []).map((f: { ticket_id: number }) => f.ticket_id);

  return {
    tickets: (tickets as Ticket[]) || [],
    followedIds,
  };
}

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return (
      <div className="p-12 text-center text-zinc-500">
        You must be logged in to view community tickets.
      </div>
    );
  }

  const { tickets, followedIds } = await getCommunityData(userId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Community Tickets
        </h1>
        <p className="text-zinc-400 mt-1">
          Browse open tickets from the community. Follow ones you're interested in.
        </p>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-sm text-zinc-500">
        <span>
          <span className="text-white font-medium">{tickets.length}</span> tickets visible
        </span>
        <span className="text-zinc-700">·</span>
        <span>
          <span className="text-blue-400 font-medium">{followedIds.length}</span> followed
        </span>
      </div>

      {/* Table */}
      <CommunityTicketTable tickets={tickets} initialFollowedIds={followedIds} />
    </div>
  );
}

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
  const { data: tickets, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select('id, title, description, status, priority, created_at, category')
    .neq('created_by', userId)
    .not('status', 'in', '("DRAFT","MERGED")')
    .order('created_at', { ascending: false });

  if (ticketError) {
    console.error('Community tickets error:', ticketError.message);
  }

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
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Public Feed
        </h1>
        <div className="grid grid-cols-3 gap-4">
          <div className="border border-zinc-800 rounded-lg bg-zinc-950/60 px-5 py-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Total Tickets</p>
            <p className="text-2xl font-bold text-white">{tickets.length}</p>
          </div>
          <div className="border border-zinc-800 rounded-lg bg-zinc-950/60 px-5 py-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">New Tickets</p>
            <p className="text-2xl font-bold text-blue-400">{tickets.filter(t => t.status === 'NEW').length}</p>
          </div>
          <div className="border border-zinc-800 rounded-lg bg-zinc-950/60 px-5 py-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Following</p>
            <p className="text-2xl font-bold text-emerald-400">{followedIds.length}</p>
          </div>
        </div>
      </div>

      {/* Card list */}
      <CommunityTicketTable tickets={tickets} initialFollowedIds={followedIds} />
    </div>
  );
}
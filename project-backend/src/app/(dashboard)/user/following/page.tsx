// src/app/(dashboard)/user/following/page.tsx

import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import FollowingTicketTable from '@/components/FollowingTicketTable';

export type Ticket = {
  id: number;
  title: string | null;
  description: string;
  status: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  created_at: string;
  updated_at: string;
  category: string | null;
};

async function getFollowedTickets(userId: string): Promise<Ticket[]> {
  const { data: follows, error: followError } = await supabaseAdmin
    .from('ticket_followers')
    .select('ticket_id')
    .eq('user_id', userId);

  if (followError) {
    console.error('Following fetch error:', followError.message);
    return [];
  }

  if (!follows || follows.length === 0) return [];

  const ticketIds = follows.map((f: { ticket_id: number }) => f.ticket_id);

  const { data: tickets, error: ticketError } = await supabaseAdmin
    .from('tickets')
    .select('id, title, description, status, priority, created_at, updated_at, category')
    .in('id', ticketIds)
    .order('created_at', { ascending: false });

  if (ticketError) {
    console.error('Followed ticket details error:', ticketError.message);
    return [];
  }

  return (tickets as Ticket[]) || [];
}

export default async function FollowingPage() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;

  if (!userId) {
    return (
      <div className="p-12 text-center text-zinc-500">
        You must be logged in to view your followed tickets.
      </div>
    );
  }

  const tickets = await getFollowedTickets(userId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Following</h1>
        <div className="mt-4 inline-block border border-zinc-800 rounded-lg bg-zinc-950/60 px-5 py-4 min-w-[140px]">
          <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium mb-1">Solved</p>
          <p className="text-2xl font-bold text-emerald-400">{tickets.filter(t => t.status === 'SOLVED').length}</p>
        </div>
      </div>
      <FollowingTicketTable tickets={tickets} />
    </div>
  );
}
// src/app/(dashboard)/user/following/page.tsx

import Link from 'next/link';
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
    .select('id, title, description, status, priority, created_at, category')
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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Following</h1>
        <p className="text-zinc-400 mt-1">
          Tickets you're following.{' '}
          <Link href="/user/community" className="text-blue-400 hover:text-blue-300 underline">
            Browse community tickets
          </Link>{' '}
          to follow more.
        </p>
      </div>

      {/* Interactive Client Table */}
      <FollowingTicketTable tickets={tickets} />
    </div>
  );
}

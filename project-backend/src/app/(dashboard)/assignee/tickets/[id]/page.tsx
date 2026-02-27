// src/app/(dashboard)/assignee/tickets/[id]/page.tsx

import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import TicketDetailView from '@/components/TicketDetailView';

async function getData(ticketId: string) {
  const cookieStore = await cookies();

  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value;

  // 🔒 Only ASSIGNEE allowed
  if (!userId || userRole !== 'ASSIGNEE') {
    return { authorized: false };
  }

  // 🔒 Only THEIR ticket
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      assigned_to_user:users!tickets_assigned_to_fkey (full_name),
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `)
    .eq('id', ticketId)
    .eq('assigned_to', userId)
    .single();

  if (error || !ticket) return null;

  // comments
  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  // ✅ staff list for reassignment
  const { data: staffUsers } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .eq('role', 'ASSIGNEE');

  return {
    authorized: true,
    ticket,
    comments: comments || [],
    currentUser: { id: userId, role: userRole },
    allUsers: staffUsers || []
  };
}

export default async function AssigneeTicketPage({ params }: { params: { id: string } }) {
  const { id } = await params;

  const data = await getData(id);

  // 🔒 security redirect
  if (data && data.authorized === false) {
    redirect('/assignee/tickets');
  }

  // 404
  if (!data || !data.ticket) {
    return (
      <div className="p-12 text-center border border-zinc-800 rounded-lg bg-zinc-950/40">
        <h1 className="text-2xl font-bold text-white mb-2">Ticket Not Found</h1>
        <Link href="/assignee/tickets" className="text-blue-400 hover:underline">
          ← Back to My Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
        <Link
          href="/assignee/tickets"
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition"
        >
          ←
        </Link>

        <div className="flex items-center gap-3">
          <span className="text-zinc-500 font-mono">#{data.ticket.id}</span>
          <h1 className="text-2xl font-bold text-white">
            {data.ticket.title || 'Untitled Request'}
          </h1>
        </div>
      </div>

      {/* Main view (status + reassign allowed) */}
      <TicketDetailView
        ticket={data.ticket}
        comments={data.comments}
        currentUser={data.currentUser}
        allUsers={data.allUsers}
      />
    </div>
  );
}

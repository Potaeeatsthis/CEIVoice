// src/app/(dashboard)/admin/tickets/[id]/page.tsx

import { cookies } from 'next/headers';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase';
import TicketDetailView from '@/components/TicketDetailView';
import MergeTicketModal from '@/components/MergeTicketModal';

// Helper to fetch data safely
async function getData(ticketId: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value || 'USER';

  // 0. Security Check: Ensure only Staff can view this page
  if (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
    return { authorized: false };
  }

  // 1. Fetch the Ticket
  const { data: ticket, error } = await supabaseAdmin
    .from('tickets')
    .select(`
      *,
      assigned_to_user:users!tickets_assigned_to_fkey (full_name),
      created_by_user:users!tickets_created_by_fkey (full_name, email)
    `)
    .eq('id', ticketId)
    .single();

  if (error || !ticket) return null;

  // 2. Fetch Comments
  const { data: comments } = await supabaseAdmin
    .from('comments')
    .select('*, user:users(full_name)')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  // 3. Fetch All Staff (For Assignee Dropdown)
  // Since this is the Admin View, we need the list of staff to assign tickets to
  const { data: staffUsers } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .neq('role', 'USER'); 
  
  return { 
    authorized: true,
    ticket, 
    comments: comments || [], 
    currentUser: { id: userId, role: userRole },
    allUsers: staffUsers || [] 
  };
}

export default async function AdminTicketPage({ params }: { params: { id: string } }) {
  // Await params for Next.js 15+ compatibility
  const { id } = await params;
  const data = await getData(id);

  // Handle Security Redirect
  if (data && data.authorized === false) {
    redirect('/user/tickets');
  }

  // Handle 404
  if (!data || !data.ticket) {
    return (
      <div className="p-12 text-center border border-zinc-800 rounded-lg bg-zinc-950/40">
        <h1 className="text-2xl font-bold text-white mb-2">Ticket Not Found</h1>
        <p className="text-zinc-400 mb-6">This ticket does not exist or has been deleted.</p>
        <Link href="/admin/tickets" className="text-blue-400 hover:underline">
          &larr; Back to Admin Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          {/* Back Button */}
          <Link 
            href="/admin/tickets" 
            className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
          >
            &larr;
          </Link>
          
          {/* Title & ID */}
          <div>
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-mono text-lg">#{data.ticket.id}</span>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                {data.ticket.title || "Untitled Request"}
              </h1>
              {/* Status Badge (Static display for header) */}
              <span className={`px-2 py-0.5 rounded text-xs font-medium border
                ${data.ticket.status === 'NEW' ? 'bg-blue-950/30 text-blue-400 border-blue-900' : 
                  data.ticket.status === 'SOLVED' ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900' :
                  'bg-zinc-900 text-zinc-500 border-zinc-800'}`
              }>
                {data.ticket.status}
              </span>
            </div>
          </div>
        </div>
        
        {/* Action Buttons: Merge */}
        <div className="flex items-center gap-2">
           <MergeTicketModal parentTicketId={data.ticket.id} />
        </div>
      </div>

      {/* Main Interactive View */}
      <TicketDetailView 
        ticket={data.ticket}
        comments={data.comments}
        currentUser={data.currentUser}
        allUsers={data.allUsers}
      />
    </div>
  );
}

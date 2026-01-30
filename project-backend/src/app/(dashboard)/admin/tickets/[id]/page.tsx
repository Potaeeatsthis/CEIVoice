// src/app/(dashboard)/admin/tickets/[id]/page.tsx
import { cookies } from 'next/headers';
import Link from 'next/link';
import { supabaseAdmin } from '@/lib/supabase';
import TicketDetailView from '@/components/TicketDetailView';

// Helper to fetch data safely
async function getData(ticketId: string) {
  const cookieStore = await cookies();
  const userId = cookieStore.get('user_id')?.value;
  const userRole = cookieStore.get('user_role')?.value || 'USER';

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

  // 3. Fetch All Users (For Admin Assignee Dropdown)
  let allUsers: any[] = [];
  // Since this is the Admin Page, we always fetch staff users for assignment
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, full_name, role')
    .neq('role', 'USER'); // Only fetch staff members
  
  allUsers = data || [];

  return { 
    ticket, 
    comments: comments || [], 
    currentUser: { id: userId, role: userRole },
    allUsers 
  };
}

export default async function AdminTicketPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const data = await getData(id);

  if (!data || !data.ticket) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Ticket Not Found</h1>
        {/* Updated Link to Admin Dashboard */}
        <Link href="/admin/tickets" className="text-blue-400 hover:underline">
          &larr; Back to Admin Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {/* Updated Back Button to point to /admin/tickets */}
        <Link 
          href="/admin/tickets" 
          className="h-8 w-8 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 transition-all"
        >
          &larr;
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <span className="text-zinc-500 font-mono text-lg">#{data.ticket.id}</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              {data.ticket.title || "Untitled Request"}
            </h1>
          </div>
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

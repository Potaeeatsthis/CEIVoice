// src/app/api/tickets/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { sendTicketNotification } from '@/lib/email'; // 👈 Import the helper

<<<<<<< HEAD
function formatStatus(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SOLVED: 'Solved',
    FAILED: 'Failed',
    MERGED: 'Merged',
  };
=======
// 1. GET: Fetch a single ticket
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; 
    
    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
>>>>>>> 6abd8a141546702f4a4d3a546d7a606914cb5bbd

  return map[status] || status;
}

<<<<<<< HEAD

=======
// 2. PATCH: Update Ticket Details
>>>>>>> 6abd8a141546702f4a4d3a546d7a606914cb5bbd
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
<<<<<<< HEAD
    const { status, priority, assigned_to } = body;

    // 🔹 get old ticket + assignee names
    const { data: oldTicket } = await supabaseAdmin
      .from('tickets')
      .select(`
        status,
        assigned_to,
        assigned_to_user:users!tickets_assigned_to_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    const logs: any[] = [];

    // ========================
    // STATUS CHANGE
    // ========================
    if (status && status !== oldTicket?.status) {
      updates.status = status;

      logs.push({
        ticket_id: id,
        action: `Status changed: ${formatStatus(oldTicket.status)} → ${formatStatus(status)}`,
        changed_by: userId,
});

    }

    // ========================
    // REASSIGN
    // ========================
    let newAssignee = assigned_to;

    if (assigned_to === '') newAssignee = null;

    if (newAssignee !== undefined && newAssignee !== oldTicket?.assigned_to) {
      updates.assigned_to = newAssignee;

      // get new name
      let newName = 'Unassigned';

      if (newAssignee) {
        const { data: newUser } = await supabaseAdmin
          .from('users')
          .select('full_name')
          .eq('id', newAssignee)
          .single();

        newName = newUser?.full_name || 'Unknown';
      }

      const oldName =
        oldTicket?.assigned_to_user?.full_name || 'Unassigned';

      logs.push({
        ticket_id: id,
        action: `Reassigned: ${oldName} → ${newName}`,
        changed_by: userId,
      });
    }

    if (priority) updates.priority = priority;

    // ========================
    // UPDATE TICKET
    // ========================
    const { data, error } = await supabaseAdmin
=======
    
    // Extract all editable fields
    const { 
      title, 
      description, 
      status, 
      priority, 
      category, 
      deadline, 
      assigned_to 
    } = body;

    // Start with the updated_at timestamp
    const updates: any = { updated_at: new Date().toISOString() };
    
    // Conditionally add fields to the update object if they exist in the request
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    
    // Handle Deadline (Allow null to clear it)
    if (deadline !== undefined) updates.deadline = deadline;
    
    // Handle Assignee (Allow null to unassign)
    if (assigned_to === '') {
        updates.assigned_to = null;
    } else if (assigned_to) {
        updates.assigned_to = assigned_to;
    }

    // Perform the update
    // ✨ CRITICAL: We fetch 'email' for creator and assignee so we can send notifications
    const { data: ticket, error } = await supabaseAdmin
>>>>>>> 6abd8a141546702f4a4d3a546d7a606914cb5bbd
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!tickets_created_by_fkey(email, full_name),
        assigned_to_user:users!tickets_assigned_to_fkey(email, full_name)
      `)
      .single();

    if (error) throw error;

<<<<<<< HEAD
    // ========================
    // INSERT LOGS
    // ========================
    if (logs.length > 0) {
      await supabaseAdmin.from('audit_logs').insert(logs);
    }

    return NextResponse.json({ success: true, ticket: data });
=======
    // ✨ EMAIL NOTIFICATION LOGIC (Fire & Forget)
    const triggerEmails = async () => {
        // 1. SOLVED
        if (status === 'SOLVED') {
            await sendTicketNotification('SOLVED', ticket);
        }
        // 2. MERGED
        if (status === 'MERGED') {
            await sendTicketNotification('MERGED', ticket);
        }
        // 3. DEADLINE UPDATED (Check if present in body and is valid)
        if (deadline && deadline !== '') {
             // We notify if a deadline was sent (assuming UI only sends if changed)
             await sendTicketNotification('DEADLINE', ticket);
        }
        // 4. ASSIGNEE UPDATED (Notify both parties)
        if (assigned_to && ticket.assigned_to_user) {
             await sendTicketNotification('ASSIGNED', ticket);
        }
    };

    triggerEmails(); // Run in background to keep UI fast

    return NextResponse.json({ success: true, ticket });
>>>>>>> 6abd8a141546702f4a4d3a546d7a606914cb5bbd

  } catch (error: any) {
    console.error('PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// src/app/api/tickets/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';

function formatStatus(status: string) {
  const map: Record<string, string> = {
    DRAFT: 'Draft',
    NEW: 'New',
    IN_PROGRESS: 'In Progress',
    SOLVED: 'Solved',
    FAILED: 'Failed',
    MERGED: 'Merged',
  };

  return map[status] || status;
}


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
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // ========================
    // INSERT LOGS
    // ========================
    if (logs.length > 0) {
      await supabaseAdmin.from('audit_logs').insert(logs);
    }

    return NextResponse.json({ success: true, ticket: data });

  } catch (error: any) {
    console.error('PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

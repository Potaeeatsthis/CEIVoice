import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { sendTicketNotification } from '@/lib/email';

/* -------------------------------- helpers -------------------------------- */

const humanize = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

const formatDate = (date: string | null) => {
  if (!date) return 'None';
  return new Date(date)
    .toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    .replace(/\//g, '-');
};

/* -------------------------------- GET -------------------------------- */

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        assigned_to_user:users!tickets_assigned_to_fkey (id, full_name),
        created_by_user:users!tickets_created_by_fkey (id, full_name, email)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/* -------------------------------- PATCH -------------------------------- */

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value;

    if (!userId || (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, status, priority, category, deadline, assigned_to } = body;

    /* -------- fetch current ticket (with assignee name) -------- */
    const { data: oldTicket, error: oldError } = await supabaseAdmin
      .from('tickets')
      .select(`
        *,
        assigned_to_user:users!tickets_assigned_to_fkey(full_name)
      `)
      .eq('id', id)
      .single();

    if (oldError) throw oldError;

    /* ------------------------------------------------------------------ */
    /* 🔒 ASSIGNEE MUST COMMENT BEFORE SOLVED / FAILED (ENFORCED HERE) */
    /* ------------------------------------------------------------------ */
    if (
      userRole === 'ASSIGNEE' &&
      (status === 'SOLVED' || status === 'FAILED') &&
      status !== oldTicket.status
    ) {
      const { data: assigneeComment } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('ticket_id', id)
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (!assigneeComment) {
        return NextResponse.json(
          {
            error:
              'You must add a final comment before marking the ticket as Solved or Failed.'
          },
          { status: 400 }
        );
      }
    }

    /* -------- fetch actor name -------- */
    const { data: actor } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();

    const actorName = actor?.full_name || 'System';

    /* -------- build update object -------- */
    const updates: any = { updated_at: new Date().toISOString() };

    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (deadline !== undefined) updates.deadline = deadline;

    if (assigned_to === '') {
      updates.assigned_to = null;
    } else if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to;
    }

    /* -------- update ticket -------- */
    const { data: ticket, error } = await supabaseAdmin
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

    /* -------- audit logs (ONLY changed parts) -------- */
    const auditActions: string[] = [];

    if (status !== undefined && status !== oldTicket.status) {
      auditActions.push(
        `Status changed from ${humanize(oldTicket.status)} → ${humanize(status)}`
      );
    }

    if (priority !== undefined && priority !== oldTicket.priority) {
      auditActions.push(
        `Priority changed from ${humanize(oldTicket.priority)} → ${humanize(priority)}`
      );
    }

    if (
      deadline !== undefined &&
      formatDate(deadline) !== formatDate(oldTicket.deadline)
    ) {
      auditActions.push(
        `Deadline changed from ${formatDate(oldTicket.deadline)} → ${formatDate(deadline)}`
      );
    }

    if (assigned_to !== undefined && assigned_to !== oldTicket.assigned_to) {
      auditActions.push(
        `Assignee changed from ${
          oldTicket.assigned_to_user?.full_name || 'Unassigned'
        } → ${
          ticket.assigned_to_user?.full_name || 'Unassigned'
        }`
      );
    }

    if (auditActions.length > 0) {
      await supabaseAdmin.from('audit_logs').insert(
        auditActions.map(action => ({
          ticket_id: id,
          action,
          changed_by: userId,
          timestamp: new Date().toISOString()
        }))
      );
    }

    /* -------- email notifications (fire & forget) -------- */
    const triggerEmails = async () => {
      if (status === 'SOLVED') {
        await sendTicketNotification('SOLVED', ticket);
      }


      if (deadline !== undefined && deadline !== oldTicket.deadline) {
        await sendTicketNotification('DEADLINE', ticket);
      }

      if (assigned_to !== undefined && assigned_to !== oldTicket.assigned_to) {
        await sendTicketNotification('ASSIGNED', ticket);
      }
    };

    triggerEmails();

    return NextResponse.json({ success: true, ticket });
  } catch (error: any) {
    console.error('PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

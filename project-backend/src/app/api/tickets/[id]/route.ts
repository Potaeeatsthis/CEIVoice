// src/app/api/tickets/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import {
  sendTicketNotification,
  sendTicketStatusUpdate,
  sendTicketPriorityUpdate,
  type TicketFollower,
} from '@/lib/email';

// 1. GET: Fetch a single ticket
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

    const now = new Date().toISOString();

    const { data: ticketToFail, error: checkError } = await supabaseAdmin
      .from('tickets')
      .select('id, status, deadline')
      .eq('id', id)
      .lt('deadline', now)
      .not('deadline', 'is', null)
      .in('status', ['NEW', 'IN PROGRESS'])
      .maybeSingle();

    if (checkError) {
      console.error('Auto-fail check error:', checkError);
    }

    let failedTicket = null;

    if (ticketToFail) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ status: 'FAILED', failed_at: now })
        .eq('id', id)
        .select('id')
        .single();

      if (updateError) {
        console.error('Auto-fail update error:', updateError);
      } else {
        failedTicket = updated;
      }
    }

    if (failedTicket) {
      const { data: existingSystemComment } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('ticket_id', id)
        .eq('type', 'system')
        .maybeSingle();

      if (!existingSystemComment) {
        await supabaseAdmin.from('comments').insert({
          ticket_id: id,
          type: 'system',
          is_internal: false,
          created_by: null,
          created_at: now
        });
      }
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

    if (error) {
      if (error.code === 'PGRST116') return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
      throw error;
    }

    return NextResponse.json(data);

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
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

    if (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: existingTicket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('status, failure_reason, priority, deadline, assigned_to')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
        
    if (userRole !== 'ADMIN') {
      const isFullyLocked =
        existingTicket.status === 'SOLVED' ||
        (existingTicket.status === 'FAILED' && existingTicket.failure_reason);

      if (isFullyLocked) {
        return NextResponse.json(
          { error: 'This ticket is locked and cannot be modified.' },
          { status: 400 }
        );
      }
    }

    const body = await request.json();
    
    const { 
      title, 
      description, 
      status, 
      priority, 
      category, 
      deadline, 
      assigned_to,
      failure_reason,
      ai_solution
    } = body;

    const updates: any = { updated_at: new Date().toISOString() };
    
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;
    if (failure_reason !== undefined) updates.failure_reason = failure_reason;
    if (ai_solution !== undefined) updates.ai_solution = ai_solution;
    if (deadline !== undefined) updates.deadline = deadline;
    
    if (assigned_to === '') {
      updates.assigned_to = null;
    } else if (assigned_to) {
      updates.assigned_to = assigned_to;
    }

    // Fetch actor name for email (the admin/assignee making the change)
    const { data: actorUser } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', userId!)
      .single();
    const actorName = actorUser?.full_name || 'Support Team';

    const { data: ticket, error } = await supabaseAdmin
      .from('tickets')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        created_by_user:users!tickets_created_by_fkey(id, email, full_name, role),
        assigned_to_user:users!tickets_assigned_to_fkey(id, email, full_name, role)
      `)
      .single();

    if (error) throw error;
      
    if (status === 'SOLVED') {
      const { data: existing } = await supabaseAdmin
        .from('comments')
        .select('id')
        .eq('ticket_id', id)
        .eq('type', 'final_resolution')
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from('comments').insert({
          ticket_id: id,
          content: ai_solution ? `Final Resolution: ${ai_solution}` : 'Final Resolution: This issue has been resolved.',
          type: 'final_resolution',
          is_internal: false,
          created_by: userId,
          created_at: new Date().toISOString()
        });
      }
    }
      
    if (status === 'FAILED') {
      await supabaseAdmin.from('comments').insert({
        ticket_id: id,
        content: `Failure Reason: ${failure_reason}`,
        type: 'failure_reason',
        is_internal: false,
        created_by: userId,
        created_at: new Date().toISOString()
      });
    }

    // AUDIT LOG
    const auditActions: string[] = [];
    if (status !== undefined && status !== existingTicket.status) auditActions.push(`Status changed to ${status}`);
    if (assigned_to !== undefined) auditActions.push(assigned_to ? `Assigned to user` : `Assignee removed`);
    if (priority !== undefined) auditActions.push(`Priority set to ${priority}`);
    if (deadline !== undefined) auditActions.push(deadline ? `Deadline set to ${new Date(deadline).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}` : `Deadline cleared`);
    if (category !== undefined) auditActions.push(`Category set to ${category}`);

    if (auditActions.length > 0) {
      await supabaseAdmin.from('audit_logs').insert(
        auditActions.map((action) => ({
          ticket_id: Number(id),
          action,
          changed_by: userId,
        }))
      );
    }

    // EMAIL NOTIFICATIONS (Fire & Forget)
    const triggerEmails = async () => {
      // Fetch all followers of this ticket
      const { data: followerRows } = await supabaseAdmin
        .from('ticket_followers')
        .select('user:users!ticket_followers_user_id_fkey(id, email, full_name, role)')
        .eq('ticket_id', Number(id));

      const followers: TicketFollower[] = (followerRows || [])
        .map((r: any) => r.user)
        .filter((u: any) => u?.email);

      const emailPromises = [];

      // Status-specific emails
      if (status !== undefined && status !== existingTicket.status) {
        if (status === 'SOLVED') {
          emailPromises.push(sendTicketNotification('SOLVED', ticket, actorName, followers));
        } else if (status === 'FAILED') {
          emailPromises.push(sendTicketNotification('FAILED', ticket, actorName, followers));
        } else if (status === 'MERGED') {
          emailPromises.push(sendTicketNotification('MERGED', ticket, actorName, followers));
        } else {
          // NEW, IN_PROGRESS, or any other status change → notify user + followers
          emailPromises.push(sendTicketStatusUpdate(ticket, status, actorName, followers));
        }
      }

      // Priority changed → notify user + followers (only if actually different)
      if (priority !== undefined && priority !== existingTicket.priority) {
        emailPromises.push(sendTicketPriorityUpdate(ticket, priority, actorName, followers));
      }

      // Deadline updated → notify user + followers (only if actually different)
      if (deadline !== undefined && deadline !== '' && deadline !== existingTicket.deadline) {
        emailPromises.push(sendTicketNotification('DEADLINE', ticket, actorName, followers));
      }

      // Assigned → notify user + staff + followers (only if actually different)
      if (assigned_to && assigned_to !== existingTicket.assigned_to && ticket.assigned_to_user) {
        emailPromises.push(sendTicketNotification('ASSIGNED', ticket, actorName, followers));
      }

      await Promise.allSettled(emailPromises);
    };

    triggerEmails().catch((err) => console.error('[Email Error]', err));

    return NextResponse.json({ success: true, ticket });

  } catch (error: any) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
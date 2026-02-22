// src/app/api/tickets/[id]/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { sendTicketNotification } from '@/lib/email'; // 👈 Import the helper

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
      .in('status', ['NEW', 'IN PROGRESS'])   // ✅ safer than .not in
      .maybeSingle();

    if (checkError) {
      console.error('Auto-fail check error:', checkError);
    }

    let failedTicket = null;

    if (ticketToFail) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({
          status: 'FAILED',
          failed_at: now
        })
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

    // 🔎 Fetch updated ticket
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Auth Check
    const cookieStore = await cookies();
    const userRole = cookieStore.get('user_role')?.value;
    const userId = cookieStore.get('user_id')?.value;

    if (userRole !== 'ADMIN' && userRole !== 'ASSIGNEE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: existingTicket, error: fetchError } = await supabaseAdmin
      .from('tickets')
      .select('status, failure_reason')
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
    
    // Extract all editable fields
    const { 
      title, 
      description, 
      status, 
      priority, 
      category, 
      deadline, 
      assigned_to,
      failure_reason, 
    } = body;

    // Start with the updated_at timestamp
    const updates: any = { updated_at: new Date().toISOString() };
    
    // Conditionally add fields to the update object if they exist in the request
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority) updates.priority = priority;
    if (category) updates.category = category;

    if (failure_reason !== undefined) {
      updates.failure_reason = failure_reason;
    }

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
              content: 'Final Resolution: This issue has been resolved.',
              type: 'final_resolution',
              is_internal: false,
              created_by: userId,   // ✅ ADD THIS LINE
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

    // ✨ EMAIL NOTIFICATION LOGIC (Fire & Forget)
    const triggerEmails = async () => {
        // 1. SOLVED
        if (status === 'SOLVED') {
            await sendTicketNotification('SOLVED', ticket);
        }
        if (status === 'FAILED') {
            await sendTicketNotification('FAILED', ticket);
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

  } catch (error: any) {
    console.error("PATCH Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
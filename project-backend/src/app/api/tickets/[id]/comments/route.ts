// src/app/api/tickets/[id]/comments/route.ts

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { sendNewMessageNotification } from '@/lib/email';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    console.log(`\n--- [Comment API] Processing Ticket #${id} ---`);

    const cookieStore = await cookies();
    const userId = cookieStore.get('user_id')?.value;
    const userRole = cookieStore.get('user_role')?.value || 'USER';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { content, is_internal, attachments } = body;

    if (!content && (!attachments || attachments.length === 0)) {
      return NextResponse.json(
        { error: 'Message or attachment is required' },
        { status: 400 }
      );
    }

    await supabaseAdmin
      .from('users')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', userId);

    const isStaff = userRole === 'ADMIN' || userRole === 'ASSIGNEE';
    const finalIsInternal = isStaff ? is_internal || false : false;

    // Skip email for internal notes entirely
    if (finalIsInternal) {
      console.log('🔕 Internal note — skipping email notification.');
    }

    const { data: comment, error } = await supabaseAdmin
      .from('comments')
      .insert({
        ticket_id: id,
        user_id: userId,
        message: content || '',
        is_internal: finalIsInternal,
        attachments: attachments || [],
      })
      .select('*, user:users(full_name, email)')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await supabaseAdmin
      .from('ticket_reads')
      .upsert({
        ticket_id: id,
        user_id: userId,
        last_read_at: new Date().toISOString(),
      });

    // ── NOTIFICATION LOGIC ────────────────────────────────────────────────────

    // Don't send email notifications for internal notes
    if (!finalIsInternal) {
      const { data: ticket } = await supabaseAdmin
        .from('tickets')
        .select(`
          id, title, assigned_to, created_by, last_email_sent_at,
          created_by_user:users!tickets_created_by_fkey(id, email, full_name, role, last_seen_at),
          assigned_to_user:users!tickets_assigned_to_fkey(id, email, full_name, role, last_seen_at)
        `)
        .eq('id', id)
        .single();

      console.log(`📋 Ticket data:`, {
        ticketId: ticket?.id,
        createdBy: ticket?.created_by,
        assignedTo: ticket?.assigned_to,
        lastEmailSentAt: ticket?.last_email_sent_at,
        senderUserId: userId,
        senderRole: userRole,
      });

      if (ticket) {
        const isSenderCreator = userId === ticket.created_by;
        const isSenderAssignee = userId === ticket.assigned_to;

        console.log(`👤 Sender context:`, { isSenderCreator, isSenderAssignee, isStaff });

        const recipients: {
          email: string;
          name: string;
          role: string;
          last_seen_at: string | null;
        }[] = [];

        // ── Case 1: Staff (admin/assignee) sent the message → notify ticket creator
        const creatorUser = ticket.created_by_user as any;
        if (isStaff && !isSenderCreator && creatorUser?.email) {
          console.log(`➕ Adding creator as recipient: ${creatorUser.email}`);
          recipients.push({
            email: creatorUser.email,
            name: creatorUser.full_name || 'User',
            role: creatorUser.role || 'USER',
            last_seen_at: creatorUser.last_seen_at,
          });
        }

        // ── Case 2: Creator sent message → notify assignee (if assigned)
        const assigneeUser = ticket.assigned_to_user as any;
        if (isSenderCreator && assigneeUser?.email && !isSenderAssignee) {
          console.log(`➕ Adding assignee as recipient: ${assigneeUser.email}`);
          recipients.push({
            email: assigneeUser.email,
            name: assigneeUser.full_name || 'Team Member',
            role: assigneeUser.role || 'ASSIGNEE',
            last_seen_at: assigneeUser.last_seen_at,
          });
        }

        // ── Case 3: Creator sent message, ticket is unassigned → notify all admins
        if (isSenderCreator && !ticket.assigned_to) {
          const { data: admins } = await supabaseAdmin
            .from('users')
            .select('id, email, full_name, role, last_seen_at')
            .eq('role', 'ADMIN')
            .neq('id', userId);

          console.log(`➕ Unassigned ticket — notifying ${admins?.length ?? 0} admin(s)`);

          if (admins) {
            for (const admin of admins) {
              if (admin.email) {
                recipients.push({
                  email: admin.email,
                  name: admin.full_name || 'Admin',
                  role: 'ADMIN',
                  last_seen_at: admin.last_seen_at,
                });
              }
            }
          }
        }

        // ── Cooldown check (30 sec) ─────────────────────────────────────────────
        const now = new Date();
        const lastEmail = ticket.last_email_sent_at
          ? new Date(ticket.last_email_sent_at)
          : new Date(0);
        const minutesSinceLastEmail = (now.getTime() - lastEmail.getTime()) / 1000 / 60;
        const isCooldownOver = minutesSinceLastEmail > 0.5;

        console.log(`⏱️  Last email: ${ticket.last_email_sent_at ?? 'never'} (${minutesSinceLastEmail.toFixed(1)} min ago)`);
        console.log(`📬 Recipients: ${recipients.length}, Cooldown over: ${isCooldownOver}`);

        if (isCooldownOver && recipients.length > 0) {
          console.log(`📧 Sending notifications to ${recipients.length} recipient(s)...`);

          const results = await Promise.allSettled(
            recipients.map((r) =>
              sendNewMessageNotification(
                r.email,
                ticket.id.toString(),
                ticket.title || 'Untitled',
                comment.user?.full_name || 'Support',
                content || (attachments?.length ? '[Sent an attachment]' : 'Sent a message'),
                r.name,
                r.role,
              )
            )
          );

          results.forEach((result, i) => {
            if (result.status === 'rejected') {
              console.error(`❌ Failed to send to ${recipients[i].email}:`, result.reason);
            } else {
              console.log(`✅ Sent to ${recipients[i].email}`);
            }
          });

          await supabaseAdmin
            .from('tickets')
            .update({ last_email_sent_at: now.toISOString() })
            .eq('id', id);

        } else if (!isCooldownOver) {
          console.log(`🚫 Email skipped — cooldown active (${minutesSinceLastEmail.toFixed(1)} min since last email, need 0.5 min).`);
        } else {
          console.log(`🚫 Email skipped — no recipients found.`);
        }
      }
    }

    return NextResponse.json(comment);

  } catch (error: any) {
    console.error('❌ Server Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
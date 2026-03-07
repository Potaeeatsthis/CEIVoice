// src/lib/email.ts

import { Resend } from 'resend';
import TicketUpdateEmail from '@/components/emails/TicketUpdateEmail';
import NotificationEmail from '@/components/emails/NotificationEmail';
import { NewMessageEmail } from '@/components/emails/NewMessageEmail';
import { RoleUpdatedEmail } from '@/components/emails/RoleUpdatedEmail';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { ResetPasswordEmail } from '@/components/emails/ResetPasswordEmail';
import { PasswordChangedEmail } from '@/components/emails/PasswordChangedEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type TriggerType = 'SOLVED' | 'FAILED' | 'MERGED' | 'DEADLINE' | 'ASSIGNED';

// ── Role-aware URL helpers ────────────────────────────────────────────────────

function ticketUrlForRole(role: string, ticketId: string | number): string {
  if (role === 'ADMIN')    return `${APP_URL}/admin/tickets/${ticketId}`;
  if (role === 'ASSIGNEE') return `${APP_URL}/assignee/tickets/${ticketId}`;
  return `${APP_URL}/tickets/${ticketId}`;
}

function dashboardUrlForRole(role: string): string {
  if (role === 'ADMIN')    return `${APP_URL}/admin/tickets`;
  if (role === 'ASSIGNEE') return `${APP_URL}/assignee/tickets`;
  return `${APP_URL}/tickets`;
}

// ── Ticket lifecycle notifications ───────────────────────────────────────────

export async function sendTicketNotification(
  trigger: TriggerType,
  ticket: any,
  actorName: string = 'Support'
) {
  if (!process.env.RESEND_API_KEY) return;

  const emailPromises = [];
  const baseProps = {
    ticketId: ticket.id,
    ticketTitle: ticket.title || 'Untitled Ticket',
    actorName,
  };

  // A) SOLVED, FAILED, MERGED, DEADLINE → ticket creator
  if (['SOLVED', 'FAILED', 'MERGED', 'DEADLINE'].includes(trigger)) {
    const creator = ticket.created_by_user;
    if (creator?.email) {
      emailPromises.push(
        resend.emails.send({
          from: 'CEiVoice Support <support@ceivoice.com>',
          to: creator.email,
          subject: `[Update] Ticket #${ticket.id} Notification`,
          react: TicketUpdateEmail({
            ...baseProps,
            type: trigger,
            recipientName: creator.full_name || 'User',
            link: ticketUrlForRole(creator.role || 'USER', ticket.id),
            newValue:
              trigger === 'DEADLINE' && ticket.deadline
                ? new Date(ticket.deadline).toLocaleDateString('en-GB')
                : trigger === 'FAILED'
                ? ticket.failure_reason
                : undefined,
          }),
        })
      );
    }
  }

  // B) ASSIGNED → notify creator + staff
  if (trigger === 'ASSIGNED') {
    const creator  = ticket.created_by_user;
    const staffUser = ticket.assigned_to_user;

    if (creator?.email && staffUser) {
      emailPromises.push(
        resend.emails.send({
          from: 'CEiVoice Support <support@ceivoice.com>',
          to: creator.email,
          subject: `[Update] Ticket #${ticket.id} Assigned`,
          react: TicketUpdateEmail({
            ...baseProps,
            type: 'ASSIGNED',
            recipientName: creator.full_name || 'User',
            link: ticketUrlForRole(creator.role || 'USER', ticket.id),
            newValue: staffUser.full_name,
          }),
        })
      );
    }

    // ✅ Use staff member's actual role for the link — not hardcoded /admin/
    if (staffUser?.email) {
      emailPromises.push(
        resend.emails.send({
          from: 'CEiVoice System <support@ceivoice.com>',
          to: staffUser.email,
          subject: `[Action Required] Assigned Ticket #${ticket.id}`,
          react: TicketUpdateEmail({
            ...baseProps,
            type: 'ASSIGNED_STAFF',
            recipientName: staffUser.full_name || 'Team Member',
            link: ticketUrlForRole(staffUser.role || 'ASSIGNEE', ticket.id),
          }),
        })
      );
    }
  }

  await Promise.allSettled(emailPromises);
}

// ── Deadline reminder (assigned staff) ───────────────────────────────────────

export async function sendDeadlineReminder(ticket: any) {
  if (!process.env.RESEND_API_KEY) return;

  const staffUser = ticket.assigned_to_user;
  if (!staffUser?.email) return;

  await resend.emails.send({
    from: 'CEiVoice Reminder <support@ceivoice.com>',
    to: staffUser.email,
    subject: `Reminder: Ticket #${ticket.id} Due Tomorrow`,
    react: NotificationEmail({
      userName:     staffUser.full_name || 'Team Member',
      ticketTitle:  ticket.title || 'Untitled Ticket',
      deadline:     ticket.deadline
        ? new Date(ticket.deadline).toLocaleDateString('en-GB')
        : 'N/A',
      ticketUrl: ticketUrlForRole(staffUser.role || 'ASSIGNEE', ticket.id),
    }),
  });
}

// ── New message notification ──────────────────────────────────────────────────
// NOTE: The 10-minute throttle is enforced in the caller (comments route).
// Do NOT add throttle logic here.

export async function sendNewMessageNotification(
  userEmail: string,
  ticketId: string,
  ticketTitle: string,
  senderName: string,
  messageContent: string,
  recipientName: string = 'User',
  recipientRole: string = 'USER'    // ✅ caller passes role for correct URL
) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: 'CEiVoice Notification <support@ceivoice.com>',
    to: userEmail,
    subject: `New message in Ticket #${ticketId}`,
    react: NewMessageEmail({
      recipientName,
      senderName,
      ticketId,
      ticketTitle,
      messageContent,
      ticketUrl: ticketUrlForRole(recipientRole, ticketId),
    }),
  });
}

// ── Role updated notification ─────────────────────────────────────────────────

export async function sendRoleUpdatedEmail(
  userEmail: string,
  userName: string,
  newRole: string
) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: 'CEiVoice System <support@ceivoice.com>',
    to: userEmail,
    subject: 'Your CEiVoice account role has been updated',
    react: RoleUpdatedEmail({
      userName,
      newRole,
      dashboardUrl: dashboardUrlForRole(newRole),  // ✅ role-aware, uses APP_URL
    }),
  });
}

// ── Welcome email ─────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  userEmail: string,
  fullName: string,
  role: string
) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: 'CEiVoice System <support@ceivoice.com>',
    to: userEmail,
    subject: 'Welcome to CEiVoice',
    react: WelcomeEmail({ fullName, role }),
  });
}

// ── Password reset email ──────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  userEmail: string,
  name: string,
  link: string
) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const { data, error } = await resend.emails.send({
    from: 'CEiVoice Security <support@ceivoice.com>',
    to: userEmail,
    subject: 'Reset your CEiVoice password',
    react: ResetPasswordEmail({ name, link }),
  });

  if (error) {
    console.error('Resend API error (password reset):', error);
    throw new Error(`Failed to send reset email: ${error.message}`);
  }

  return data;
}

// ── Password changed notification ─────────────────────────────────────────────

export async function sendPasswordChangedEmail(
  userEmail: string,
  name: string
) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: 'CEiVoice Security <support@ceivoice.com>',
    to: userEmail,
    subject: 'Your CEiVoice password was changed',
    react: PasswordChangedEmail({ name }),
  });
}

// src/lib/email.ts

import React from 'react';
import { Resend } from 'resend';

// React 19 FC return type includes Promise<ReactNode>; cast to ReactElement for Resend
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const re = (el: any): React.ReactElement => el;
import TicketUpdateEmail from '@/components/emails/TicketUpdateEmail';
import TicketCreatedEmail from '@/components/emails/TicketCreatedEmail';
import NotificationEmail from '@/components/emails/NotificationEmail';
import { NewMessageEmail } from '@/components/emails/NewMessageEmail';
import { RoleUpdatedEmail } from '@/components/emails/RoleUpdatedEmail';
import { WelcomeEmail } from '@/components/emails/WelcomeEmail';
import { ResetPasswordEmail } from '@/components/emails/ResetPasswordEmail';
import { PasswordChangedEmail } from '@/components/emails/PasswordChangedEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type TriggerType = 'SOLVED' | 'FAILED' | 'MERGED' | 'DEADLINE' | 'ASSIGNED';

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

  if (trigger === 'ASSIGNED') {
    const creator   = ticket.created_by_user;
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

// ── NEW: Status change notification to ticket creator ─────────────────────────

export async function sendTicketStatusUpdate(
  ticket: any,
  newStatus: string,
  actorName: string = 'Support'
) {
  if (!process.env.RESEND_API_KEY) return;

  const creator = ticket.created_by_user;
  if (!creator?.email) return;

  // Don't double-send for SOLVED/FAILED — those are handled by sendTicketNotification
  if (newStatus === 'SOLVED' || newStatus === 'FAILED') return;

  await resend.emails.send({
    from: 'CEiVoice Support <support@ceivoice.com>',
    to: creator.email,
    subject: `[Ticket #${ticket.id}] Status updated to ${newStatus}`,
    react: TicketUpdateEmail({
      ticketId: ticket.id,
      ticketTitle: ticket.title || 'Untitled Ticket',
      actorName,
      type: 'STATUS_CHANGED',
      recipientName: creator.full_name || 'User',
      link: ticketUrlForRole(creator.role || 'USER', ticket.id),
      newValue: newStatus,
    }),
  });
}

// ── NEW: Priority change notification to ticket creator ───────────────────────

export async function sendTicketPriorityUpdate(
  ticket: any,
  newPriority: string,
  actorName: string = 'Support'
) {
  if (!process.env.RESEND_API_KEY) return;

  const creator = ticket.created_by_user;
  if (!creator?.email) return;

  await resend.emails.send({
    from: 'CEiVoice Support <support@ceivoice.com>',
    to: creator.email,
    subject: `[Ticket #${ticket.id}] Priority updated to ${newPriority}`,
    react: TicketUpdateEmail({
      ticketId: ticket.id,
      ticketTitle: ticket.title || 'Untitled Ticket',
      actorName,
      type: 'PRIORITY_CHANGED',
      recipientName: creator.full_name || 'User',
      link: ticketUrlForRole(creator.role || 'USER', ticket.id),
      newValue: newPriority,
    }),
  });
}

// ── Everything below is unchanged ─────────────────────────────────────────────

export async function sendDeadlineReminder(ticket: any) {
  if (!process.env.RESEND_API_KEY) return;

  const staffUser = ticket.assigned_to_user;
  if (!staffUser?.email) return;

  await resend.emails.send({
    from: 'CEiVoice Reminder <support@ceivoice.com>',
    to: staffUser.email,
    subject: `Reminder: Ticket #${ticket.id} Due Tomorrow`,
    react: NotificationEmail({
      userName:    staffUser.full_name || 'Team Member',
      ticketTitle: ticket.title || 'Untitled Ticket',
      deadline:    ticket.deadline
        ? new Date(ticket.deadline).toLocaleDateString('en-GB')
        : 'N/A',
      ticketUrl: ticketUrlForRole(staffUser.role || 'ASSIGNEE', ticket.id),
    }),
  });
}

export async function sendNewMessageNotification(
  userEmail: string,
  ticketId: string,
  ticketTitle: string,
  senderName: string,
  messageContent: string,
  recipientName: string = 'User',
  recipientRole: string = 'USER'
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
    react: re(RoleUpdatedEmail({
      userName,
      newRole,
      dashboardUrl: dashboardUrlForRole(newRole),
    })),
  });
}

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
    react: re(WelcomeEmail({ fullName, role })),
  });
}

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
    react: re(ResetPasswordEmail({ name, link })),
  });

  if (error) {
    console.error('Resend API error (password reset):', error);
    throw new Error(`Failed to send reset email: ${error.message}`);
  }

  return data;
}

export async function sendPasswordChangedEmail(
  userEmail: string,
  name: string
) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: 'CEiVoice Security <support@ceivoice.com>',
    to: userEmail,
    subject: 'Your CEiVoice password was changed',
    react: re(PasswordChangedEmail({ name })),
  });
}

export async function sendTicketCreatedEmail(
  userEmail: string,
  recipientName: string,
  ticketId: string | number,
  ticketTitle: string,
  ticketDescription: string,
  userRole: string = 'USER',
  ticketPriority?: string,
) {
  if (!process.env.RESEND_API_KEY) return;

  const link = ticketUrlForRole(userRole, ticketId);

  await resend.emails.send({
    from: 'CEiVoice Support <support@ceivoice.com>',
    to: userEmail,
    subject: `[Ticket #${ticketId}] Your ticket is now active`,
    react: TicketCreatedEmail({
      recipientName,
      ticketId,
      ticketTitle,
      ticketDescription,
      ticketPriority,
      link,
    }),
  });
}
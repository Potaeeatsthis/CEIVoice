// src/lib/email.ts

import { Resend } from 'resend';
import TicketUpdateEmail from '@/components/emails/TicketUpdateEmail';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

type TriggerType = 'SOLVED' | 'MERGED' | 'DEADLINE' | 'ASSIGNED';

export async function sendTicketNotification(
  trigger: TriggerType, 
  ticket: any, 
  actorName: string = "Support"
) {
  if (!process.env.RESEND_API_KEY) return;

  const emailPromises = [];
  const baseProps = {
    ticketId: ticket.id,
    ticketTitle: ticket.title || "Untitled Ticket",
    actorName,
    link: `${APP_URL}/user/tickets/${ticket.id}`
  };

  if (['SOLVED', 'MERGED', 'DEADLINE'].includes(trigger) && ticket.created_by_user?.email) {
    emailPromises.push(resend.emails.send({
      from: 'CEiVoice Support <onboarding@resend.dev>',
      to: ticket.created_by_user.email,
      subject: `[Update] Ticket #${ticket.id} Notification`,
      react: TicketUpdateEmail({
        ...baseProps,
        type: trigger,
        recipientName: ticket.created_by_user.full_name,
        newValue: trigger === 'DEADLINE' && ticket.deadline ? new Date(ticket.deadline).toLocaleDateString('en-GB') : undefined
      })
    }));
  }

  if (trigger === 'ASSIGNED') {
    const staffUser = ticket.assigned_to_user;
    if (ticket.created_by_user?.email && staffUser) {
      emailPromises.push(resend.emails.send({
        from: 'CEiVoice Support <onboarding@resend.dev>',
        to: ticket.created_by_user.email,
        subject: `[Update] Ticket #${ticket.id} Assigned`,
        react: TicketUpdateEmail({
          ...baseProps,
          type: 'ASSIGNED',
          recipientName: ticket.created_by_user.full_name,
          newValue: staffUser.full_name
        })
      }));
    }
    if (staffUser?.email) {
      emailPromises.push(resend.emails.send({
        from: 'CEiVoice System <onboarding@resend.dev>',
        to: staffUser.email,
        subject: `[Action Required] Assigned Ticket #${ticket.id}`,
        react: TicketUpdateEmail({
          ...baseProps,
          type: 'ASSIGNED_STAFF',
          recipientName: staffUser.full_name,
          link: `${APP_URL}/admin/tickets/${ticket.id}`
        })
      }));
    }
  }
  await Promise.allSettled(emailPromises);
}

export async function sendNewMessageNotification(
  userEmail: string, 
  ticketId: string, 
  ticketTitle: string, 
  senderName: string,
  messageContent: string
) {
  if (!process.env.RESEND_API_KEY) return;

  await resend.emails.send({
    from: 'CEiVoice Notification <onboarding@resend.dev>',
    to: userEmail,
    subject: `New messages in Ticket #${ticketId}`,
    html: `
      <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #10b981;">New Activity</h2>
        <p><strong>${senderName}</strong> sent you a message regarding ticket <strong>#${ticketId}: ${ticketTitle}</strong>.</p>
        <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #333; font-size: 14px; font-style: italic;">"${messageContent}"</p>
        </div>
        <p style="font-size: 12px; color: #666;">(To reduce inbox clutter, we won't email you again for this ticket for at least 10 minutes.)</p>
        <div style="margin-top: 24px;">
          <a href="${APP_URL}/user/tickets/${ticketId}" 
             style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
             View Conversation
          </a>
        </div>
      </div>
    `
  });
}

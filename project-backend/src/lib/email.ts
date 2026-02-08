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

  // 1. Base Properties for Email Template
  const baseProps = {
    ticketId: ticket.id,
    ticketTitle: ticket.title || "Untitled Ticket",
    actorName,
    link: `${APP_URL}/user/tickets/${ticket.id}`
  };

  // --- LOGIC PER TRIGGER ---

  // A) SOLVED, MERGED, DEADLINE -> Send to Ticket Creator
  if (['SOLVED', 'MERGED', 'DEADLINE'].includes(trigger)) {
    if (ticket.created_by_user?.email) {
      emailPromises.push(resend.emails.send({
        from: 'CEiVoice Support <onboarding@resend.dev>', // Update this in production
        to: ticket.created_by_user.email,
        subject: `[Update] Ticket #${ticket.id} Notification`,
        react: TicketUpdateEmail({
          ...baseProps,
          type: trigger,
          recipientName: ticket.created_by_user.full_name,
          newValue: trigger === 'DEADLINE' && ticket.deadline 
            ? new Date(ticket.deadline).toLocaleDateString('en-GB') 
            : undefined
        })
      }));
    }
  }

  // B) ASSIGNED -> Send to TWO people (Creator & New Staff)
  if (trigger === 'ASSIGNED') {
    const staffUser = ticket.assigned_to_user;
    
    // 1. Notify Creator ("Assigned to Bob")
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

    // 2. Notify Staff ("You have been assigned")
    if (staffUser?.email) {
      emailPromises.push(resend.emails.send({
        from: 'CEiVoice System <onboarding@resend.dev>',
        to: staffUser.email,
        subject: `[Action Required] Assigned Ticket #${ticket.id}`,
        react: TicketUpdateEmail({
          ...baseProps,
          type: 'ASSIGNED_STAFF',
          recipientName: staffUser.full_name,
          link: `${APP_URL}/admin/tickets/${ticket.id}` // Link to Admin Console
        })
      }));
    }
  }

  // Execute all sends
  await Promise.allSettled(emailPromises);
}
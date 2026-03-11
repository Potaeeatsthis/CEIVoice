// src/components/emails/TicketUpdateEmail.tsx

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';

type TicketUpdateEmailProps = {
  ticketId: string;
  ticketTitle: string;
  actorName: string;
  recipientName: string;
  type:
    | 'SOLVED'
    | 'FAILED'
    | 'MERGED'
    | 'DEADLINE'
    | 'ASSIGNED'
    | 'ASSIGNED_STAFF'
    | 'REASSIGNED_STAFF'
    | 'STATUS_CHANGED'
    | 'PRIORITY_CHANGED';
  newValue?: string;
  link: string;
};

export default function TicketUpdateEmail({
  ticketId,
  ticketTitle,
  actorName,
  recipientName,
  type,
  newValue,
  link,
}: TicketUpdateEmailProps) {
  const previews: Record<string, string> = {
    SOLVED:           'Your ticket has been solved',
    FAILED:           'Your ticket has been marked as failed',
    MERGED:           'Your ticket has been merged',
    DEADLINE:         'Ticket deadline updated',
    ASSIGNED:         'Your ticket has been assigned',
    ASSIGNED_STAFF:   'You have been assigned a ticket',
    REASSIGNED_STAFF: 'A ticket has been reassigned to you',
    STATUS_CHANGED:   `Your ticket status has been updated to ${newValue}`,
    PRIORITY_CHANGED: `Your ticket priority has been updated to ${newValue}`,
  };

  const headings: Record<string, string> = {
    SOLVED:           'Ticket Solved',
    FAILED:           'Ticket Marked as Failed',
    MERGED:           'Ticket Merged',
    DEADLINE:         'Deadline Updated',
    ASSIGNED:         'Ticket Assigned',
    ASSIGNED_STAFF:   'New Ticket Assigned',
    REASSIGNED_STAFF: 'Ticket Reassigned',
    STATUS_CHANGED:   'Ticket Status Updated',
    PRIORITY_CHANGED: 'Ticket Priority Updated',
  };

  const descriptions: Record<string, string> = {
    SOLVED:           `${actorName} marked this ticket as solved.`,
    FAILED:           newValue
      ? `${actorName} marked this ticket as failed. Reason: ${newValue}`
      : `${actorName} marked this ticket as failed.`,
    MERGED:           `${actorName} merged this ticket.`,
    DEADLINE:         `The deadline has been updated to ${newValue}.`,
    ASSIGNED:         `Your ticket has been assigned to ${newValue}.`,
    ASSIGNED_STAFF:   'You are now responsible for this ticket.',
    REASSIGNED_STAFF: 'This ticket has been reassigned to you.',
    STATUS_CHANGED:   `${actorName} updated your ticket status to ${newValue}.`,
    PRIORITY_CHANGED: `${actorName} updated your ticket priority to ${newValue}.`,
  };

  // Badge color per type
  const badgeColors: Record<string, { bg: string; text: string }> = {
    SOLVED:           { bg: '#004d28', text: '#00e676' },
    FAILED:           { bg: '#4d0000', text: '#ff5252' },
    MERGED:           { bg: '#1a2e4d', text: '#448aff' },
    DEADLINE:         { bg: '#4d3800', text: '#ffd740' },
    ASSIGNED:         { bg: '#004d28', text: '#00e676' },
    ASSIGNED_STAFF:   { bg: '#004d28', text: '#00e676' },
    REASSIGNED_STAFF: { bg: '#1a2e4d', text: '#448aff' },
    STATUS_CHANGED:   { bg: '#1a2e4d', text: '#448aff' },
    PRIORITY_CHANGED: { bg: '#4d3800', text: '#ffd740' },
  };

  const badgeColor = badgeColors[type] || { bg: '#004d28', text: '#00e676' };

  return (
    <Html>
      <Head />
      <Preview>{previews[type]}</Preview>

      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>CEIVOICE SUPPORT</Text>
          </Section>

          <Section style={body}>
            <Text style={{
              ...badge,
              backgroundColor: badgeColor.bg,
              color: badgeColor.text,
            }}>
              {type.replace(/_/g, ' ')}
            </Text>

            <Heading style={title}>{headings[type]}</Heading>

            <Text style={text}>Hello {recipientName},</Text>
            <Text style={text}>{descriptions[type]}</Text>

            <Section style={detailsBox}>
              <Text style={detailLabel}>TICKET ID</Text>
              <Text style={detailValue}>#{ticketId}</Text>

              <Text style={detailLabel}>SUBJECT</Text>
              <Text style={detailValueLast}>{ticketTitle || `Ticket #${ticketId}`}</Text>

              {newValue && (type === 'STATUS_CHANGED' || type === 'PRIORITY_CHANGED') && (
                <>
                  <Text style={{ ...detailLabel, marginTop: '20px' }}>
                    {type === 'STATUS_CHANGED' ? 'NEW STATUS' : 'NEW PRIORITY'}
                  </Text>
                  <Text style={{ ...detailValueLast, color: badgeColor.text, fontWeight: 'bold' }}>
                    {newValue}
                  </Text>
                </>
              )}
            </Section>

            <Section style={{ marginTop: '24px', marginBottom: '32px' }}>
              <Button href={link} style={button}>
                View Ticket
              </Button>
            </Section>

            <Text style={{ ...text, fontSize: '14px', color: '#6b7280' }}>
              You will be notified via email when there are further updates to your request.
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              © 2026 CEiVoice System. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: '#0a0a0a',
  fontFamily: 'Helvetica, Arial, sans-serif',
  padding: '40px 20px',
};
const container = {
  maxWidth: '600px',
  margin: '0 auto',
  backgroundColor: '#1a1a1a',
  borderRadius: '8px',
  overflow: 'hidden',
};
const header = {
  backgroundColor: '#000000',
  padding: '24px',
  textAlign: 'center' as const,
};
const headerText = {
  margin: 0,
  color: '#00e676',
  fontSize: '18px',
  fontWeight: 'bold',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
};
const body = {
  padding: '32px',
};
const badge = {
  display: 'inline-block',
  backgroundColor: '#004d28',
  color: '#00e676',
  padding: '6px 14px',
  borderRadius: '9999px',
  fontSize: '13px',
  fontWeight: 'bold',
  marginBottom: '24px',
};
const title = {
  margin: '0 0 24px 0',
  color: '#ffffff',
  fontSize: '26px',
  fontWeight: 'bold',
};
const text = {
  margin: '0 0 16px 0',
  color: '#a3a3a3',
  fontSize: '15px',
  lineHeight: '1.6',
};
const detailsBox = {
  backgroundColor: '#262626',
  borderRadius: '6px',
  padding: '24px',
  borderLeft: '4px solid #00e676',
  margin: '32px 0',
};
const detailLabel = {
  margin: '0 0 6px 0',
  color: '#737373',
  fontSize: '12px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
};
const detailValue = {
  margin: '0 0 20px 0',
  color: '#ffffff',
  fontSize: '16px',
};
const detailValueLast = {
  margin: 0,
  color: '#ffffff',
  fontSize: '16px',
};
const button = {
  backgroundColor: '#00e676',
  color: '#000000',
  padding: '12px 20px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: 'bold',
  display: 'inline-block',
};
const footer = {
  backgroundColor: '#000000',
  padding: '24px',
  textAlign: 'center' as const,
};
const footerText = {
  margin: 0,
  color: '#525252',
  fontSize: '13px',
};
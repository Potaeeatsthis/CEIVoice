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
    | 'MERGED'
    | 'DEADLINE'
    | 'ASSIGNED'
    | 'ASSIGNED_STAFF'
    | 'REASSIGNED_STAFF';
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
    SOLVED: 'Your ticket has been solved',
    MERGED: 'Your ticket has been merged',
    DEADLINE: 'Ticket deadline updated',
    ASSIGNED: 'Your ticket has been assigned',
    ASSIGNED_STAFF: 'You have been assigned a ticket',
    REASSIGNED_STAFF: 'A ticket has been reassigned to you',
  };

  const headings: Record<string, string> = {
    SOLVED: 'Ticket Solved ✅',
    MERGED: 'Ticket Merged 🔀',
    DEADLINE: 'Deadline Updated ⏰',
    ASSIGNED: 'Ticket Assigned 👤',
    ASSIGNED_STAFF: 'New Ticket Assigned 🎫',
    REASSIGNED_STAFF: 'Ticket Reassigned 🔄',
  };

  const descriptions: Record<string, string> = {
    SOLVED: `${actorName} marked this ticket as solved.`,
    MERGED: `${actorName} merged this ticket.`,
    DEADLINE: `The deadline has been updated to ${newValue}.`,
    ASSIGNED: `Your ticket has been assigned to ${newValue}.`,
    ASSIGNED_STAFF: 'You are now responsible for this ticket.',
    REASSIGNED_STAFF: 'This ticket has been reassigned to you.',
  };

  return (
    <Html>
      <Head />
      <Preview>{previews[type]}</Preview>

      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Arial' }}>
        <Container style={{ backgroundColor: '#ffffff', padding: '24px' }}>
          <Heading>{headings[type]}</Heading>

          <Text>Hi {recipientName},</Text>

          <Text>
            <strong>{ticketTitle || `Ticket #${ticketId}`}</strong>
          </Text>

          <Text>{descriptions[type]}</Text>

          <Section style={{ marginTop: '24px' }}>
            <Button
              href={link}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 20px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              View Ticket
            </Button>
          </Section>

          <Text style={{ marginTop: '24px', fontSize: '12px', color: '#6b7280' }}>
            CEIVoice Support System
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

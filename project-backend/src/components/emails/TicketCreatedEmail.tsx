// src/components/emails/TicketCreatedEmail.tsx

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

type TicketCreatedEmailProps = {
  recipientName: string;
  ticketId: string | number;
  ticketTitle: string;
  ticketDescription: string;
  link: string;
};

export default function TicketCreatedEmail({
  recipientName,
  ticketId,
  ticketTitle,
  ticketDescription,
  link,
}: TicketCreatedEmailProps) {
  const preview = `Your ticket #${ticketId} has been received — we're on it!`;

  // Truncate description to 200 chars for the email preview
  const shortDescription =
    ticketDescription.length > 200
      ? ticketDescription.slice(0, 200).trimEnd() + '…'
      : ticketDescription;

  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>

      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerText}>CEIVOICE SUPPORT</Text>
          </Section>

          {/* Body */}
          <Section style={body}>
            <Text style={badge}>Ticket Received</Text>

            <Heading style={title}>We've got your request!</Heading>

            <Text style={text}>Hello {recipientName},</Text>

            <Text style={text}>
              Thank you for reaching out. Your support ticket has been
              successfully submitted and our team will review it shortly.
            </Text>

            {/* Ticket details box */}
            <Section style={detailsBox}>
              <Text style={detailLabel}>TICKET ID</Text>
              <Text style={detailValue}>#{ticketId}</Text>

              <Text style={detailLabel}>SUBJECT</Text>
              <Text style={detailValue}>{ticketTitle || `Ticket #${ticketId}`}</Text>

              <Text style={detailLabel}>YOUR MESSAGE</Text>
              <Text style={detailValueLast}>{shortDescription}</Text>
            </Section>

            <Section style={{ marginTop: '24px', marginBottom: '32px' }}>
              <Button href={link} style={button}>
                View Your Ticket
              </Button>
            </Section>

            <Text style={noteText}>
              You will receive email updates as your ticket progresses. If you
              have additional information to add, please reply directly in the
              ticket.
            </Text>
          </Section>

          {/* Footer */}
          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} CEiVoice System. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  fontSize: '15px',
  lineHeight: '1.6',
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
const noteText = {
  margin: '0 0 16px 0',
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '1.6',
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

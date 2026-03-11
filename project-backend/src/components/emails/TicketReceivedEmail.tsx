// src/components/emails/TicketReceivedEmail.tsx

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

type TicketReceivedEmailProps = {
  recipientName: string;
  ticketId: string | number;
  ticketTitle: string;
  ticketDescription: string;
  link: string;
};

export default function TicketReceivedEmail({
  recipientName,
  ticketId,
  ticketTitle,
  ticketDescription,
  link,
}: TicketReceivedEmailProps) {
  const preview = `We've received your ticket #${ticketId} — our team will review it shortly`;

  const shortDescription =
    ticketDescription && ticketDescription.length > 200
      ? ticketDescription.slice(0, 200).trimEnd() + '…'
      : ticketDescription || '';

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

            <Heading style={title}>We&apos;ve received your request!</Heading>

            <Text style={text}>
              Hello {recipientName}, thank you for reaching out. Your ticket has
              been submitted and is currently under review by our support team.
              You will receive another email once your ticket has been activated.
            </Text>

            {/* Ticket details box */}
            <Section style={detailsBox}>
              <Text style={detailLabel}>STATUS</Text>
              <Text style={detailValue}>
                <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>PENDING REVIEW</span>
              </Text>

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
              Our team typically reviews new submissions within a few hours. Once
              approved, your ticket will be activated and you&apos;ll receive a
              confirmation email with the updated status.
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
  backgroundColor: '#4d3800',
  color: '#fbbf24',
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
  borderLeft: '4px solid #fbbf24',
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
  backgroundColor: '#fbbf24',
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

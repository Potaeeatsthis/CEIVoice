// src/components/emails/NewMessageEmail.tsx

import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface NewMessageEmailProps {
  recipientName: string;
  senderName: string;
  ticketId: string;
  ticketTitle: string;
  messageContent: string;
  ticketUrl: string;
}

export const NewMessageEmail = ({
  recipientName,
  senderName,
  ticketId,
  ticketTitle,
  messageContent,
  ticketUrl,
}: NewMessageEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>New message in Ticket #{ticketId} from {senderName}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>CEIVOICE SUPPORT</Text>
          </Section>

          <Section style={body}>
            <Text style={badge}>New Message</Text>

            <Text style={title}>You have a new message</Text>

            <Text style={text}>Hello {recipientName},</Text>

            <Text style={text}>
              <strong style={{ color: '#ffffff' }}>{senderName}</strong> sent a
              new message on your ticket.
            </Text>

            {/* Ticket details */}
            <Section style={detailsBox}>
              <Text style={detailLabel}>TICKET ID</Text>
              <Text style={detailValue}>#{ticketId}</Text>

              <Text style={detailLabel}>SUBJECT</Text>
              <Text style={detailValue}>{ticketTitle}</Text>

              <Text style={detailLabel}>MESSAGE</Text>
              <Text style={messageBox}>"{messageContent}"</Text>
            </Section>

            <Section style={{ marginTop: '24px', marginBottom: '32px' }}>
              <Button href={ticketUrl} style={button}>
                View Conversation
              </Button>
            </Section>

            <Text style={subtext}>
              To reduce inbox clutter, we won't email you again for this ticket
              for at least 10 minutes.
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
};

export default NewMessageEmail;

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
const body = { padding: '32px' };
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
const subtext = {
  margin: '0 0 16px 0',
  color: '#6b7280',
  fontSize: '13px',
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
  fontSize: '15px',
};
const messageBox = {
  margin: 0,
  color: '#d4d4d4',
  fontSize: '15px',
  fontStyle: 'italic',
  lineHeight: '1.6',
  backgroundColor: '#1a1a1a',
  padding: '12px 16px',
  borderRadius: '4px',
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
const footerText = { margin: 0, color: '#525252', fontSize: '13px' };

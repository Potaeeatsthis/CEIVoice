// src/components/emails/NotificationEmail.tsx

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

interface NotificationEmailProps {
  userName: string;
  ticketTitle: string;
  deadline: string;
  ticketUrl: string;
}

export const NotificationEmail = ({
  userName,
  ticketTitle,
  deadline,
  ticketUrl,
}: NotificationEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reminder: Ticket deadline is tomorrow</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>CEIVOICE SYSTEM</Text>
          </Section>

          <Section style={body}>
            <Text style={badge}>Deadline Reminder</Text>

            <Text style={title}>Upcoming Ticket Deadline</Text>

            <Text style={text}>Hello {userName},</Text>

            <Text style={text}>
              This is a reminder that the following ticket is due in{' '}
              <strong style={{ color: '#ffffff' }}>1 day</strong>. Please
              ensure it is completed before the deadline to avoid automatic
              failure.
            </Text>

            <Section style={detailsBox}>
              <Text style={detailLabel}>TICKET SUBJECT</Text>
              <Text style={detailValue}>{ticketTitle}</Text>

              <Text style={detailLabel}>DEADLINE</Text>
              <Text style={detailValueLast}>{deadline}</Text>
            </Section>

            <Section style={{ marginTop: '24px', marginBottom: '32px' }}>
              <Button href={ticketUrl} style={button}>
                View Ticket
              </Button>
            </Section>

            <Text style={subtext}>
              This is an automated reminder from CEIVoice. If you have already
              handled this ticket, please disregard this message.
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

export default NotificationEmail;

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
  color: '#fbbf24',
  fontSize: '16px',
  fontWeight: 'bold',
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

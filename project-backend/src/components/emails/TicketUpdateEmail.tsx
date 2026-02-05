// src/components/emails/TicketUpdateEmail.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components';
import * as React from 'react';

type NotificationType = 'SOLVED' | 'MERGED' | 'DEADLINE' | 'ASSIGNED' | 'ASSIGNED_STAFF';

interface TicketUpdateEmailProps {
  type: NotificationType;
  recipientName: string;
  ticketId: string | number;
  ticketTitle: string;
  newValue?: string; 
  actorName?: string;
  link: string;
}

export const TicketUpdateEmail = ({
  type,
  recipientName,
  ticketId,
  ticketTitle,
  newValue,
  actorName = "Support Team",
  link,
}: TicketUpdateEmailProps) => {

  const contentMap = {
    SOLVED: {
      headline: "Ticket Solved",
      msg: `Good news! Your ticket has been marked as resolved by ${actorName}.`,
      btn: "View Ticket",
      badge: "SOLVED"
    },
    MERGED: {
      headline: "Ticket Merged",
      msg: `Your ticket has been merged into a master ticket to help us resolve the issue faster.`,
      btn: "View Status",
      badge: "MERGED"
    },
    DEADLINE: {
      headline: "Deadline Updated",
      msg: `The estimated completion date for your ticket has been updated to **${newValue}**.`,
      btn: "View Ticket",
      badge: "UPDATED"
    },
    ASSIGNED: {
      headline: "New Assignee",
      msg: `Your ticket is now being handled by **${newValue}**. They will review your request shortly.`,
      btn: "View Ticket",
      badge: "ASSIGNED"
    },
    ASSIGNED_STAFF: {
      headline: "New Assignment",
      msg: `You have been assigned to this ticket. Please review it as soon as possible.`,
      btn: "Open Admin Console",
      badge: "ACTION REQUIRED"
    }
  };

  const content = contentMap[type];

  return (
    <Html>
      <Head />
      <Preview>{`[Ticket #${ticketId}] ${content.headline}`}</Preview>
      <Body style={main}>
        <Container style={container}>
          
          {/* Header */}
          <Section style={header}>
            <Text style={logoText}>CEiVoice</Text>
          </Section>

          {/* Main Content */}
          <Section style={box}>
            <Text style={greeting}>{content.headline}</Text>
            <Text style={paragraph}>Hi {recipientName},</Text>
            <Text style={paragraph}>{content.msg}</Text>
            
            {/* Status Badge Area */}
            <Section style={badgeContainer}>
               <Text style={badgeLabel}>STATUS UPDATE</Text>
               <div style={badge}>{content.badge}</div>
            </Section>

            {/* Ticket Info Card */}
            <Section style={card}>
              <Text style={cardLabel}>TICKET DETAILS</Text>
              <Text style={cardTitle}>#{ticketId} - {ticketTitle}</Text>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={button} href={link}>
                {content.btn}
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              If you have any questions, you can reply directly to this email.<br/>
              © {new Date().getFullYear()} CEiVoice Support.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default TicketUpdateEmail;

// --- Styles (Matched to WelcomeEmail.tsx) ---

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '580px',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
};

const header = {
  padding: '0 48px',
  marginTop: '32px',
  marginBottom: '24px',
  borderBottom: '1px solid #e6ebf1',
};

const logoText = {
  color: '#004dfc', // Brand Blue
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  paddingBottom: '20px',
};

const box = {
  padding: '0 48px',
};

const greeting = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#484848',
  marginBottom: '16px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
  margin: '16px 0',
};

const badgeContainer = {
  background: '#f0f5ff',
  padding: '16px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const badgeLabel = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const badge = {
  display: 'inline-block',
  background: '#004dfc', // Brand Blue
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '4px',
  fontSize: '14px',
  fontWeight: 'bold',
  letterSpacing: '0.5px',
};

const card = {
  border: '1px solid #e6ebf1',
  borderRadius: '6px',
  padding: '16px',
  marginBottom: '24px',
  backgroundColor: '#fafafa'
};

const cardLabel = {
  fontSize: '11px',
  fontWeight: 'bold',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  marginBottom: '4px',
  display: 'block'
};

const cardTitle = {
  fontSize: '15px',
  fontWeight: '500',
  color: '#333',
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  marginBottom: '24px',
};

const button = {
  backgroundColor: '#004dfc', // Brand Blue
  borderRadius: '4px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 24px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '20px',
  textAlign: 'center' as const,
};

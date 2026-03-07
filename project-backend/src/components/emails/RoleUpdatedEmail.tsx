// src/components/emails/RoleUpdatedEmail.tsx

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

interface RoleUpdatedEmailProps {
  userName: string;
  newRole: string;
  dashboardUrl: string; // passed in from email.ts — role-aware
}

export const RoleUpdatedEmail = ({
  userName,
  newRole,
  dashboardUrl,
}: RoleUpdatedEmailProps) => {
  const isStaff = newRole === 'ADMIN' || newRole === 'ASSIGNEE';

  // Per-role accent colours
  const roleAccent =
    newRole === 'ADMIN'
      ? '#f87171'      // red
      : newRole === 'ASSIGNEE'
      ? '#fbbf24'      // amber
      : '#60a5fa';     // blue for USER

  const roleBg =
    newRole === 'ADMIN'
      ? '#4d0000'
      : newRole === 'ASSIGNEE'
      ? '#4d3800'
      : '#00204d';

  return (
    <Html>
      <Head />
      <Preview>Your CEiVoice account permissions have been updated</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>CEIVOICE SYSTEM</Text>
          </Section>

          <Section style={body}>
            {/* Dynamic badge colour per role */}
            <Text
              style={{
                ...badge,
                backgroundColor: roleBg,
                color: roleAccent,
              }}
            >
              Role Updated
            </Text>

            <Text style={title}>Account Permissions Changed</Text>

            <Text style={text}>Hello {userName},</Text>

            <Text style={text}>
              Your account permissions on <strong style={{ color: '#ffffff' }}>CEiVoice</strong> have been updated by an administrator.
            </Text>

            <Section
              style={{
                ...detailsBox,
                borderLeft: `4px solid ${roleAccent}`,
              }}
            >
              <Text style={detailLabel}>NEW ROLE</Text>
              <Text
                style={{
                  ...detailValueLast,
                  color: roleAccent,
                }}
              >
                {newRole}
              </Text>
            </Section>

            <Text style={text}>
              {isStaff
                ? 'You now have access to internal staff tools. Please log in to view your dashboard.'
                : 'Your previous staff privileges have been revoked. You can still access the platform as a standard user.'}
            </Text>

            <Section style={{ marginTop: '24px', marginBottom: '32px' }}>
              <Button href={dashboardUrl} style={button}>
                Go to Dashboard
              </Button>
            </Section>

            <Text style={subtext}>
              If you did not expect this change, please contact your system
              administrator immediately.
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

export default RoleUpdatedEmail;

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
const detailValueLast = {
  margin: 0,
  fontSize: '20px',
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

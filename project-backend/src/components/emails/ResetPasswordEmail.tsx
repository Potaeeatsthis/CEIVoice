// src/components/emails/ResetPasswordEmail.tsx

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

interface ResetPasswordEmailProps {
  name?: string;
  link: string;
}

export const ResetPasswordEmail = ({
  name = 'User',
  link,
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Reset your CEiVoice password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerText}>CEIVOICE SECURITY</Text>
          </Section>

          <Section style={body}>
            <Text style={{ ...badge, backgroundColor: '#4d0000', color: '#ff4d4d' }}>
              Action Required
            </Text>

            <Text style={title}>Password Reset Request</Text>

            <Text style={text}>Hi {name},</Text>

            <Text style={text}>
              Someone recently requested a password change for your CEiVoice
              account. If this was you, you can set a new password here:
            </Text>
            
            <Section style={buttonContainer}>
              <Button style={button} href={link}>
                Reset Password
              </Button>
            </Section>

            <Text style={text}>
              If you don't want to change your password or didn't request this,
              just ignore and delete this message.
            </Text>
            
            <Text style={{ ...text, marginTop: '24px', fontSize: '13px', color: '#6b7280' }}>
              To keep your account secure, please don't forward this email to anyone.
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

export default ResetPasswordEmail;

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
const buttonContainer = {
  margin: '32px 0',
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

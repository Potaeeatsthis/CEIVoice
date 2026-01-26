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
  Hr,
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
          <Section>
            <Text style={heading}>Password Reset Request</Text>
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
            
            <Hr style={hr} />
            
            <Text style={footer}>
              To keep your account secure, please don't forward this email to anyone.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

// --- Styles ---
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '24px',
  fontWeight: '600',
  color: '#484848',
  padding: '0 48px',
};

const text = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
  padding: '0 48px',
};

const buttonContainer = {
  padding: '27px 0 27px',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5F51E8', // Your brand color here
  borderRadius: '3px',
  color: '#fff',
  fontSize: '16px',
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
  lineHeight: '16px',
  padding: '0 48px',
};

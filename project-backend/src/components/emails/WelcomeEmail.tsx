// src/components/emails/WelcomeEmail.tsx
import * as React from 'react';

interface WelcomeEmailProps {
  fullName: string;
  role: string;
}

export const WelcomeEmail: React.FC<WelcomeEmailProps> = ({
  fullName,
  role,
}) => (
  <div style={main}>
    <div style={container}>
      {/* Header / Logo Area */}
      <div style={header}>
        <h1 style={logoText}>CEiVoice</h1>
      </div>

      {/* Main Content */}
      <div style={content}>
        <h2 style={greeting}>Welcome, {fullName}!</h2>
        <p style={paragraph}>
          Thank you for joining <strong>CEiVoice</strong>. Your account has been successfully created and is ready to use.
        </p>
        
        {/* Role Badge */}
        <div style={roleContainer}>
          <p style={label}>Assigned Role:</p>
          <div style={roleBadge}>{role}</div>
        </div>

        <p style={paragraph}>
          You can now log in to the system to submit support tickets, track status updates, and collaborate with our team.
        </p>

        {/* Call to Action Button */}
        <div style={buttonContainer}>
          <a href="https://ceivoice.com/login" style={button}>
            Log In to Dashboard
          </a>
        </div>
        
        <p style={paragraph}>
          If you have any questions, simply reply to this email.
        </p>
      </div>

      {/* Footer */}
      <div style={footer}>
        <p style={footerText}>
          © {new Date().getFullYear()} CEiVoice Support System. <br />
          Bangkok, Thailand
        </p>
      </div>
    </div>
  </div>
);

// --- STYLES (The "Decoration") ---
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '40px 0',
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
  marginBottom: '24px',
  borderBottom: '1px solid #e6ebf1',
};

const logoText = {
  color: '#004dfc', // Professional Blue
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  paddingBottom: '20px',
};

const content = {
  padding: '0 48px',
};

const greeting = {
  fontSize: '24px',
  lineHeight: '1.3',
  fontWeight: '700',
  color: '#484848',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
  margin: '24px 0',
};

const roleContainer = {
  background: '#f0f5ff',
  padding: '16px',
  borderRadius: '6px',
  textAlign: 'center' as const,
  margin: '24px 0',
};

const label = {
  fontSize: '12px',
  fontWeight: '600',
  color: '#8898aa',
  textTransform: 'uppercase' as const,
  margin: '0 0 8px',
};

const roleBadge = {
  display: 'inline-block',
  background: '#004dfc',
  color: '#ffffff',
  padding: '8px 16px',
  borderRadius: '4px',
  fontSize: '16px',
  fontWeight: 'bold',
  letterSpacing: '0.5px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 30px',
};

const footer = {
  padding: '0 48px',
  borderTop: '1px solid #e6ebf1',
  marginTop: '32px',
  paddingTop: '32px',
};

const footerText = {
  fontSize: '12px',
  lineHeight: '20px',
  color: '#9ca299',
  textAlign: 'center' as const,
};

// src/components/emails/PasswordChangedEmail.tsx

import React from 'react';

interface PasswordChangedEmailProps {
  name: string;
}

export const PasswordChangedEmail: React.FC<Readonly<PasswordChangedEmailProps>> = ({
  name,
}) => {
  return (
    <div style={styles.wrapper}>
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <h1 style={styles.headerText}>CEIVOICE SYSTEM</h1>
        </div>

        {/* Body */}
        <div style={styles.body}>
          {/* Badge */}
          <div style={styles.badge}>
            Security Alert
          </div>

          <h2 style={styles.title}>Password Changed</h2>

          <p style={styles.text}>Hello {name},</p>

          <p style={styles.text}>
            This is a confirmation that the password for your CEiVoice account was successfully updated. 
          </p>

          {/* Details Box for emphasis */}
          <div style={styles.detailsBox}>
            <p style={{ margin: 0, color: '#ffffff', fontSize: '15px', lineHeight: '1.6' }}>
              <strong>Did you make this change?</strong><br />
              If you authorized this change, no further action is needed. If you did <strong>not</strong> authorize this change, please contact a system administrator immediately to secure your account.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            © {new Date().getFullYear()} CEiVoice System. All rights reserved.<br/>
            Please do not reply to this automated message.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Email-Safe Inline Styles ---
const styles = {
  wrapper: {
    backgroundColor: '#0a0a0a',
    padding: '40px 20px',
    fontFamily: 'Helvetica, Arial, sans-serif',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#000000',
    padding: '24px',
    textAlign: 'center' as const,
  },
  headerText: {
    margin: 0,
    color: '#00e676', // Neon green matching the theme
    fontSize: '18px',
    fontWeight: 'bold',
    letterSpacing: '2px',
    textTransform: 'uppercase' as const,
  },
  body: {
    padding: '32px',
  },
  badge: {
    display: 'inline-block',
    backgroundColor: '#004d28', // Dark green background
    color: '#00e676',           // Light green text
    padding: '6px 14px',
    borderRadius: '9999px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  title: {
    margin: '0 0 24px 0',
    color: '#ffffff',
    fontSize: '26px',
    fontWeight: 'bold',
  },
  text: {
    margin: '0 0 16px 0',
    color: '#a3a3a3',
    fontSize: '15px',
    lineHeight: '1.6',
  },
  detailsBox: {
    backgroundColor: '#262626',
    borderRadius: '6px',
    padding: '24px',
    borderLeft: '4px solid #00e676', // The signature green border
    margin: '32px 0',
  },
  footer: {
    backgroundColor: '#000000',
    padding: '24px',
    textAlign: 'center' as const,
  },
  footerText: {
    margin: '0 0 8px 0',
    color: '#525252',
    fontSize: '13px',
    lineHeight: '1.5',
  },
};

export default PasswordChangedEmail;

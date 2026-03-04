// src/components/emails/WelcomeEmail.tsx

import React from 'react';

interface WelcomeEmailProps {
  fullName: string;
  role: string;
}

export const WelcomeEmail: React.FC<Readonly<WelcomeEmailProps>> = ({
  fullName,
  role,
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
            New Account
          </div>

          <h2 style={styles.title}>Welcome to CEiVoice</h2>

          <p style={styles.text}>Hello {fullName},</p>

          <p style={styles.text}>
            We have successfully set up your account. Our system has registered your credentials and assigned your access level.
          </p>

          {/* Details Box */}
          <div style={styles.detailsBox}>
            <div style={styles.detailItem}>
              <p style={styles.detailLabel}>ACCOUNT NAME</p>
              <p style={styles.detailValue}>{fullName}</p>
            </div>
            
            <div style={styles.detailItem}>
              <p style={styles.detailLabel}>ASSIGNED ROLE</p>
              <p style={styles.detailValue}>{role}</p>
            </div>

            <div style={{ ...styles.detailItem, marginBottom: 0 }}>
              <p style={styles.detailLabel}>STATUS</p>
              <p style={styles.detailValue}>Active & Ready</p>
            </div>
          </div>

          <p style={styles.text}>
            You can now log in to the system and begin using your workspace. If you run into any issues, please reach out to our support team.
          </p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            © 2026 CEiVoice System. All rights reserved.
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
    color: '#00e676', // Neon green matching the image
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
  detailItem: {
    marginBottom: '20px',
  },
  detailLabel: {
    margin: '0 0 6px 0',
    color: '#737373',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '1px',
    textTransform: 'uppercase' as const,
  },
  detailValue: {
    margin: 0,
    color: '#ffffff',
    fontSize: '16px',
  },
  footer: {
    backgroundColor: '#000000',
    padding: '24px',
    textAlign: 'center' as const,
  },
  footerText: {
    margin: 0,
    color: '#525252',
    fontSize: '13px',
  },
};

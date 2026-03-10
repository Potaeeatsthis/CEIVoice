// src/components/emails/ResetPasswordEmail.tsx

import React from 'react';

interface ResetPasswordEmailProps {
  name: string;
  link: string;
}

export const ResetPasswordEmail: React.FC<Readonly<ResetPasswordEmailProps>> = ({
  name,
  link,
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
            Security Action
          </div>

          <h2 style={styles.title}>Reset Your Password</h2>

          <p style={styles.text}>Hello {name},</p>

          <p style={styles.text}>
            We received a request to reset the password for your CEiVoice account. If you made this request, please click the button below to set a new password:
          </p>

          {/* Details Box / Action Button */}
          <div style={styles.detailsBox}>
             <a href={link} style={styles.button}>
               RESET PASSWORD
             </a>
          </div>

          <p style={styles.text}>
            If you did not request a password reset, you can safely ignore this email. Your current password will remain secure and unchanged.
          </p>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            © {new Date().getFullYear()} CEiVoice System. All rights reserved.
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
    padding: '32px 24px',
    borderLeft: '4px solid #00e676', // The signature green border
    margin: '32px 0',
    textAlign: 'center' as const,
  },
  button: {
    backgroundColor: '#00e676',
    color: '#000000', // Black text for high contrast on green
    padding: '14px 28px',
    borderRadius: '4px',
    fontSize: '15px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '1px',
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

export default ResetPasswordEmail;

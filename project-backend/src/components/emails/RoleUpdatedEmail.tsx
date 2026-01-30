import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Section,
  Button,
} from "@react-email/components";
import * as React from "react";

interface RoleUpdatedEmailProps {
  userName: string;
  newRole: string;
}

export const RoleUpdatedEmail = ({ userName, newRole }: RoleUpdatedEmailProps) => {
  const isPromoted = newRole === 'ADMIN' || newRole === 'ASSIGNEE';
  
  return (
    <Html>
      <Head />
      <Preview>Your permissions have been updated</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Role Update Notification</Heading>
          <Text style={text}>Hello {userName},</Text>
          <Text style={text}>
            Your account permissions on <strong>CEIVoice</strong> have been updated.
          </Text>
          
          <Section style={highlightSection}>
            <Text style={highlightText}>
              New Role: <strong>{newRole}</strong>
            </Text>
          </Section>

          <Text style={text}>
            {isPromoted 
              ? "You now have access to internal staff tools. Please log in to view your dashboard."
              : "Your previous staff privileges have been revoked. You can still access the platform as a standard user."}
          </Text>

          {isPromoted && (
            <Button style={button} href="https://ceivoice.com/admin/tickets">
              Go to Admin Console
            </Button>
          )}
          
          <Text style={footer}>
            If you did not expect this change, please contact your system administrator.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default RoleUpdatedEmail;

// Styles
const main = { backgroundColor: "#ffffff", fontFamily: "sans-serif" };
const container = { margin: "0 auto", padding: "20px 0 48px", maxWidth: "580px" };
const h1 = { fontSize: "24px", fontWeight: "bold", color: "#1a1a1a" };
const text = { fontSize: "16px", lineHeight: "26px", color: "#333" };
const highlightSection = { padding: "24px", backgroundColor: "#f4f4f5", borderRadius: "8px", margin: "24px 0" };
const highlightText = { fontSize: "18px", textAlign: "center" as const, margin: "0", color: "#1a1a1a" };
const button = { backgroundColor: "#000", color: "#fff", padding: "12px 20px", borderRadius: "5px", textDecoration: "none", display: "inline-block", marginTop: "20px" };
const footer = { fontSize: "12px", color: "#666", marginTop: "40px" };

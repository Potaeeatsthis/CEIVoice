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
          <Heading style={h1}>Upcoming Ticket Deadline</Heading>

          <Text style={text}>Hello {userName},</Text>

          <Text style={text}>
            This is a reminder that the following ticket is due in <strong>1 day</strong>.
          </Text>

          <Section style={highlightSection}>
            <Text style={highlightText}>
              <strong>{ticketTitle}</strong>
            </Text>
            <Text style={{ ...highlightText, fontSize: "14px", marginTop: "8px" }}>
              Deadline: <strong>{deadline}</strong>
            </Text>
          </Section>

          <Text style={text}>
            Please ensure the ticket is completed before the deadline to avoid automatic failure.
          </Text>

          <Button style={button} href={ticketUrl}>
            View Ticket
          </Button>

          <Text style={footer}>
            This is an automated reminder from CEIVoice.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default NotificationEmail;

// Styles
const main = { backgroundColor: "#ffffff", fontFamily: "sans-serif" };
const container = { margin: "0 auto", padding: "20px 0 48px", maxWidth: "580px" };
const h1 = { fontSize: "24px", fontWeight: "bold", color: "#1a1a1a" };
const text = { fontSize: "16px", lineHeight: "26px", color: "#333" };
const highlightSection = {
  padding: "24px",
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  margin: "24px 0",
};
const highlightText = {
  fontSize: "18px",
  textAlign: "center" as const,
  margin: "0",
  color: "#1a1a1a",
};
const button = {
  backgroundColor: "#000",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: "5px",
  textDecoration: "none",
  display: "inline-block",
  marginTop: "20px",
};
const footer = { fontSize: "12px", color: "#666", marginTop: "40px" };

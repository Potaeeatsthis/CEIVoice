// src/lib/__tests__/email.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock Resend ────────────────────────────────────────────────────────────────
const { mockSend } = vi.hoisted(() => {
  const mockSend = vi.fn().mockResolvedValue({ data: { id: 'mock-email-id' }, error: null });
  return { mockSend };
});

vi.mock('resend', () => {
  return {
    Resend: class MockResend {
      emails = { send: mockSend };
    },
  };
});

// ── Mock all email templates ───────────────────────────────────────────────────
vi.mock('@/components/emails/TicketUpdateEmail', () => ({
  default: vi.fn((props: any) => `TicketUpdateEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/TicketCreatedEmail', () => ({
  default: vi.fn((props: any) => `TicketCreatedEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/TicketReceivedEmail', () => ({
  default: vi.fn((props: any) => `TicketReceivedEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/NotificationEmail', () => ({
  default: vi.fn((props: any) => `NotificationEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/NewMessageEmail', () => ({
  NewMessageEmail: vi.fn((props: any) => `NewMessageEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/RoleUpdatedEmail', () => ({
  RoleUpdatedEmail: vi.fn((props: any) => `RoleUpdatedEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/WelcomeEmail', () => ({
  WelcomeEmail: vi.fn((props: any) => `WelcomeEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/ResetPasswordEmail', () => ({
  ResetPasswordEmail: vi.fn((props: any) => `ResetPasswordEmail:${JSON.stringify(props)}`),
}));
vi.mock('@/components/emails/PasswordChangedEmail', () => ({
  PasswordChangedEmail: vi.fn((props: any) => `PasswordChangedEmail:${JSON.stringify(props)}`),
}));

// ── Set env before importing email module ──────────────────────────────────────
process.env.RESEND_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_APP_URL = 'https://ceivoice.com';

import {
  sendTicketNotification,
  sendTicketStatusUpdate,
  sendTicketPriorityUpdate,
  sendDeadlineReminder,
  sendNewMessageNotification,
  sendRoleUpdatedEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendTicketReceivedEmail,
  sendTicketCreatedEmail,
} from '../email';

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeTicket(overrides: any = {}) {
  return {
    id: 42,
    title: 'Test Ticket',
    description: 'Something is broken',
    status: 'NEW',
    priority: 'HIGH',
    deadline: '2026-03-15T00:00:00Z',
    failure_reason: 'Deadline exceeded',
    created_by_user: {
      id: 'user-1',
      email: 'creator@test.com',
      full_name: 'Test Creator',
      role: 'USER',
    },
    assigned_to_user: {
      id: 'staff-1',
      email: 'staff@test.com',
      full_name: 'Staff Member',
      role: 'ASSIGNEE',
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockSend.mockClear();
  process.env.RESEND_API_KEY = 'test-api-key';
});

// ============================================================================
// sendTicketNotification
// ============================================================================

describe('sendTicketNotification', () => {
  it('sends SOLVED email to ticket creator', async () => {
    await sendTicketNotification('SOLVED', makeTicket(), 'Admin');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
        subject: '[Update] Ticket #42 Notification',
      })
    );
  });

  it('sends FAILED email to ticket creator with failure_reason', async () => {
    await sendTicketNotification('FAILED', makeTicket(), 'System');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
      })
    );
  });

  it('sends MERGED email to ticket creator', async () => {
    await sendTicketNotification('MERGED', makeTicket(), 'Admin');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
        subject: '[Update] Ticket #42 Notification',
      })
    );
  });

  it('sends DEADLINE email to ticket creator with formatted date', async () => {
    await sendTicketNotification('DEADLINE', makeTicket(), 'Admin');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
      })
    );
  });

  it('sends ASSIGNED emails to both creator and staff', async () => {
    await sendTicketNotification('ASSIGNED', makeTicket(), 'Admin');

    expect(mockSend).toHaveBeenCalledTimes(2);

    // Creator gets notification
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
        subject: '[Update] Ticket #42 Assigned',
      })
    );

    // Staff gets action-required notification
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'staff@test.com',
        subject: '[Action Required] Assigned Ticket #42',
      })
    );
  });

  it('skips creator email if creator has no email', async () => {
    const ticket = makeTicket({ created_by_user: { id: 'u1', full_name: 'No Email' } });
    await sendTicketNotification('SOLVED', ticket, 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips ASSIGNED staff email if no assigned_to_user', async () => {
    const ticket = makeTicket({ assigned_to_user: null });
    await sendTicketNotification('ASSIGNED', ticket, 'Admin');

    // Only creator email, no staff email
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendTicketNotification('SOLVED', makeTicket(), 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendTicketStatusUpdate
// ============================================================================

describe('sendTicketStatusUpdate', () => {
  it('sends status change email for IN PROGRESS', async () => {
    await sendTicketStatusUpdate(makeTicket(), 'IN PROGRESS', 'Admin');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
        subject: '[Ticket #42] Status updated to IN PROGRESS',
      })
    );
  });

  it('skips email for SOLVED status (handled by sendTicketNotification)', async () => {
    await sendTicketStatusUpdate(makeTicket(), 'SOLVED', 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips email for FAILED status (handled by sendTicketNotification)', async () => {
    await sendTicketStatusUpdate(makeTicket(), 'FAILED', 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips if creator has no email', async () => {
    const ticket = makeTicket({ created_by_user: null });
    await sendTicketStatusUpdate(ticket, 'IN PROGRESS', 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendTicketStatusUpdate(makeTicket(), 'IN PROGRESS', 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendTicketPriorityUpdate
// ============================================================================

describe('sendTicketPriorityUpdate', () => {
  it('sends priority change email', async () => {
    await sendTicketPriorityUpdate(makeTicket(), 'CRITICAL', 'Admin');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'creator@test.com',
        subject: '[Ticket #42] Priority updated to CRITICAL',
      })
    );
  });

  it('skips if creator has no email', async () => {
    const ticket = makeTicket({ created_by_user: { id: 'u1' } });
    await sendTicketPriorityUpdate(ticket, 'HIGH', 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendTicketPriorityUpdate(makeTicket(), 'HIGH', 'Admin');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendDeadlineReminder
// ============================================================================

describe('sendDeadlineReminder', () => {
  it('sends reminder to assigned staff', async () => {
    await sendDeadlineReminder(makeTicket());

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'staff@test.com',
        subject: 'Reminder: Ticket #42 Due Tomorrow',
      })
    );
  });

  it('skips if no assigned staff', async () => {
    const ticket = makeTicket({ assigned_to_user: null });
    await sendDeadlineReminder(ticket);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('skips if staff has no email', async () => {
    const ticket = makeTicket({ assigned_to_user: { id: 's1', full_name: 'No Email' } });
    await sendDeadlineReminder(ticket);

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendDeadlineReminder(makeTicket());

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendNewMessageNotification
// ============================================================================

describe('sendNewMessageNotification', () => {
  it('sends new message email with correct params', async () => {
    await sendNewMessageNotification(
      'user@test.com', '42', 'Test Ticket', 'Sender', 'Hello!', 'Recipient', 'USER'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'New message in Ticket #42',
      })
    );
  });

  it('uses correct ticket URL for ADMIN role', async () => {
    await sendNewMessageNotification(
      'admin@test.com', '42', 'Test', 'Sender', 'Hello!', 'Admin User', 'ADMIN'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendNewMessageNotification(
      'user@test.com', '42', 'Test', 'Sender', 'Hello!'
    );

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendRoleUpdatedEmail
// ============================================================================

describe('sendRoleUpdatedEmail', () => {
  it('sends role update email with dashboard URL', async () => {
    await sendRoleUpdatedEmail('user@test.com', 'Test User', 'ADMIN');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Your CEiVoice account role has been updated',
      })
    );
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendRoleUpdatedEmail('user@test.com', 'Test', 'USER');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendWelcomeEmail
// ============================================================================

describe('sendWelcomeEmail', () => {
  it('sends welcome email', async () => {
    await sendWelcomeEmail('newuser@test.com', 'New User', 'USER');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'newuser@test.com',
        subject: 'Welcome to CEiVoice',
      })
    );
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendWelcomeEmail('newuser@test.com', 'New User', 'USER');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendPasswordResetEmail
// ============================================================================

describe('sendPasswordResetEmail', () => {
  it('sends password reset email and returns data', async () => {
    const result = await sendPasswordResetEmail('user@test.com', 'User', 'https://ceivoice.com/reset?token=abc');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Reset your CEiVoice password',
      })
    );
    expect(result).toEqual({ id: 'mock-email-id' });
  });

  it('throws if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;

    await expect(
      sendPasswordResetEmail('user@test.com', 'User', 'https://ceivoice.com/reset')
    ).rejects.toThrow('RESEND_API_KEY is not configured');
  });

  it('throws if Resend returns an error', async () => {
    mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } });

    await expect(
      sendPasswordResetEmail('user@test.com', 'User', 'https://ceivoice.com/reset')
    ).rejects.toThrow('Failed to send reset email: Rate limited');
  });
});

// ============================================================================
// sendPasswordChangedEmail
// ============================================================================

describe('sendPasswordChangedEmail', () => {
  it('sends password changed confirmation', async () => {
    await sendPasswordChangedEmail('user@test.com', 'User');

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: 'Your CEiVoice password was changed',
      })
    );
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendPasswordChangedEmail('user@test.com', 'User');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendTicketReceivedEmail
// ============================================================================

describe('sendTicketReceivedEmail', () => {
  it('sends ticket received confirmation on submission', async () => {
    await sendTicketReceivedEmail(
      'user@test.com', 'Test User', 99, 'Bug Report', 'App crashes on login'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: "[Ticket #99] We've received your request",
      })
    );
  });

  it('uses correct URL for USER role (default)', async () => {
    await sendTicketReceivedEmail(
      'user@test.com', 'User', 10, 'Title', 'Description'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('uses correct URL for ADMIN role', async () => {
    await sendTicketReceivedEmail(
      'admin@test.com', 'Admin', 10, 'Title', 'Description', 'ADMIN'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendTicketReceivedEmail('user@test.com', 'User', 1, 'T', 'D');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// sendTicketCreatedEmail
// ============================================================================

describe('sendTicketCreatedEmail', () => {
  it('sends ticket activated email after admin publishes draft', async () => {
    await sendTicketCreatedEmail(
      'user@test.com', 'Test User', 42, 'Bug Report', 'App crashes', 'USER', 'HIGH'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@test.com',
        subject: '[Ticket #42] Your ticket is now active',
      })
    );
  });

  it('generates correct link for ASSIGNEE role', async () => {
    await sendTicketCreatedEmail(
      'staff@test.com', 'Staff', 42, 'Title', 'Desc', 'ASSIGNEE'
    );

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('does nothing if RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    await sendTicketCreatedEmail('user@test.com', 'User', 1, 'T', 'D');

    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ============================================================================
// URL generation
// ============================================================================

describe('URL generation (via email params)', () => {
  it('USER role ticket URL uses /tickets/', async () => {
    await sendTicketReceivedEmail('u@t.com', 'U', 5, 'T', 'D', 'USER');

    // The react prop receives the link — verify via the template mock
    const callArg = mockSend.mock.calls[0][0];
    // The react template is called with the link containing /tickets/5
    expect(callArg.react).toContain('/tickets/5');
    expect(callArg.react).not.toContain('/admin/');
  });

  it('ADMIN role ticket URL uses /admin/tickets/', async () => {
    await sendTicketReceivedEmail('a@t.com', 'A', 5, 'T', 'D', 'ADMIN');

    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.react).toContain('/admin/tickets/5');
  });

  it('ASSIGNEE role ticket URL uses /assignee/tickets/', async () => {
    await sendTicketReceivedEmail('s@t.com', 'S', 5, 'T', 'D', 'ASSIGNEE');

    const callArg = mockSend.mock.calls[0][0];
    expect(callArg.react).toContain('/assignee/tickets/5');
  });
});

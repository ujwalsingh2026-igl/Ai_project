import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from '../App';
import { api } from '../api/client';

describe('End-to-End User Flow (Login -> Chat -> Approval Card -> Approve -> Execution)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    api.logout();
  });

  it('completes the entire authentication, chat, and inline approval resolution flow', async () => {
    // 1. Mock API endpoints
    vi.spyOn(api, 'checkHealth').mockResolvedValue({ status: 'ok' });
    vi.spyOn(api, 'getStatus').mockResolvedValue({
      status: 'ok',
      ai: { provider: 'echo', model: 'echo-v1' },
      pending_approvals_count: 1,
    });
    vi.spyOn(api, 'getConversations').mockResolvedValue([]);
    vi.spyOn(api, 'getPendingApprovals').mockResolvedValue([]);
    vi.spyOn(api, 'getAuditLogs').mockResolvedValue([]);

    const loginSpy = vi.spyOn(api, 'login').mockImplementation(async () => {
      api.setToken('test-alice-token-xyz');
      return { token: 'test-alice-token-xyz' };
    });

    const chatSpy = vi.spyOn(api, 'chat').mockResolvedValue({
      conversation_id: 'conv-1111',
      reply: {
        id: 101,
        role: 'assistant',
        content: 'I need your explicit confirmation to inspect system information.',
        created_at: new Date().toISOString(),
        metadata: {
          intent: 'tool',
          tool: 'system_information',
          decision: 'ask',
          tool_status: 'needs_approval',
          pending_action_id: 'pending-action-999',
          pending_expires_at: new Date(Date.now() + 300000).toISOString(),
        },
      },
    });

    const confirmSpy = vi.spyOn(api, 'confirm').mockResolvedValue({
      status: 'executed',
      message: 'System info: Windows 11, x86_64, Python 3.14.',
      reply: {
        id: 102,
        role: 'assistant',
        content: 'System info: Windows 11, x86_64, Python 3.14.',
        created_at: new Date().toISOString(),
        metadata: {
          intent: 'tool',
          tool: 'system_information',
          tool_status: 'executed',
          approval: 'approve',
        },
      },
    });

    // 2. Render App (starts at LoginView because not authenticated)
    render(<App />);

    expect(screen.getByRole('heading', { name: /AEGIS \/\/ AUTHENTICATION/i })).toBeInTheDocument();

    // 3. User fills in credentials and logs in
    const usernameInput = screen.getByLabelText(/Operator Username/i);
    const passwordInput = screen.getByLabelText(/Password/i);
    const submitBtn = screen.getByRole('button', { name: /INITIALIZE SESSION/i });

    fireEvent.change(usernameInput, { target: { value: 'alice' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith('alice', 'password123');
    });

    // 4. Cockpit workspace is rendered
    await waitFor(() => {
      expect(screen.getByText(/AEGIS \/\/ COCKPIT/i)).toBeInTheDocument();
      expect(screen.getByText(/COCKPIT ASSISTANT RUNTIME/i)).toBeInTheDocument();
    });

    // 5. Send message requiring approval
    const chatInput = screen.getByPlaceholderText(/Send instruction or query/i);
    fireEvent.change(chatInput, { target: { value: 'What system am I running?' } });

    const sendBtn = screen.getByRole('button', { name: /Send message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(chatSpy).toHaveBeenCalledWith({
        message: 'What system am I running?',
        conversation_id: undefined,
      });
    });

    // 6. Inline Approval Card appears in conversation
    await waitFor(() => {
      expect(screen.getByText(/\[SECURITY APPROVAL REQUIRED\]/i)).toBeInTheDocument();
      expect(screen.getByText('system_information')).toBeInTheDocument();
      expect(screen.getByText('pending-action-999')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /APPROVE ACTION/i })).toBeInTheDocument();
    });

    // 7. User clicks APPROVE ACTION
    const approveBtn = screen.getByRole('button', { name: /APPROVE ACTION/i });
    fireEvent.click(approveBtn);

    // 8. Confirm API executes and approved response is displayed
    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith({
        action_id: 'pending-action-999',
        decision: 'approve',
      });
      expect(screen.getByText('ACTION APPROVED')).toBeInTheDocument();
    });

    // 9. Tool execution reply is added to the conversation
    await waitFor(() => {
      expect(screen.getAllByText(/Windows 11, x86_64, Python 3.14/i).length).toBeGreaterThanOrEqual(1);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ApprovalCard } from '../components/ApprovalCard';
import { api } from '../api/client';
import { ApiError } from '../api/types';

describe('ApprovalCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pending security approval details correctly', () => {
    render(
      <ApprovalCard
        actionId="test-action-1234"
        toolName="system_information"
        riskLevel={2}
      />
    );

    expect(screen.getByText(/\[SECURITY APPROVAL REQUIRED\]/i)).toBeInTheDocument();
    expect(screen.getByText(/LVL 2: ASK/i)).toBeInTheDocument();
    expect(screen.getByText('system_information')).toBeInTheDocument();
    expect(screen.getByText('test-action-1234')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /APPROVE ACTION/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /DENY ACTION/i })).toBeInTheDocument();
  });

  it('handles approve action confirmation correctly', async () => {
    const confirmSpy = vi.spyOn(api, 'confirm').mockResolvedValueOnce({
      status: 'executed',
      message: 'Tool executed successfully.',
    });

    const onResolved = vi.fn();

    render(
      <ApprovalCard
        actionId="action-approve-test"
        toolName="system_information"
        onResolved={onResolved}
      />
    );

    const approveBtn = screen.getByRole('button', { name: /APPROVE ACTION/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith({
        action_id: 'action-approve-test',
        decision: 'approve',
      });
      expect(screen.getByText('ACTION APPROVED')).toBeInTheDocument();
      expect(screen.getByText('Tool executed successfully.')).toBeInTheDocument();
      expect(onResolved).toHaveBeenCalled();
    });
  });

  it('handles deny action confirmation correctly', async () => {
    const confirmSpy = vi.spyOn(api, 'confirm').mockResolvedValueOnce({
      status: 'denied',
      message: 'Action was denied by user.',
    });

    render(
      <ApprovalCard
        actionId="action-deny-test"
        toolName="quarantine_file"
        riskLevel={4}
      />
    );

    const denyBtn = screen.getByRole('button', { name: /DENY ACTION/i });
    fireEvent.click(denyBtn);

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledWith({
        action_id: 'action-deny-test',
        decision: 'deny',
      });
      expect(screen.getByText('ACTION DENIED')).toBeInTheDocument();
      expect(screen.getByText('Action was denied by user.')).toBeInTheDocument();
    });
  });

  it('handles conflict (409 already used) error gracefully', async () => {
    vi.spyOn(api, 'confirm').mockRejectedValueOnce(
      new ApiError(409, 'approval_conflict', 'Action already resolved')
    );

    render(
      <ApprovalCard
        actionId="action-conflict-test"
        toolName="system_information"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /APPROVE ACTION/i }));

    await waitFor(() => {
      expect(screen.getByText('RESOLUTION ERROR')).toBeInTheDocument();
      expect(screen.getByText('Action was already resolved.')).toBeInTheDocument();
    });
  });

  it('handles expired (410 expired) error gracefully', async () => {
    vi.spyOn(api, 'confirm').mockRejectedValueOnce(
      new ApiError(410, 'approval_expired', 'Action expired')
    );

    render(
      <ApprovalCard
        actionId="action-expired-test"
        toolName="system_information"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /APPROVE ACTION/i }));

    await waitFor(() => {
      expect(screen.getByText('ACTION EXPIRED')).toBeInTheDocument();
      expect(screen.getByText('Action expired before it could be confirmed.')).toBeInTheDocument();
    });
  });
});

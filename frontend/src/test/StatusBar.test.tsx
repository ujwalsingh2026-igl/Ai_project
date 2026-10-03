import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBar } from '../components/StatusBar';

describe('StatusBar Component', () => {
  it('renders backend online status and AI provider telemetry', () => {
    render(
      <StatusBar
        isBackendOnline={true}
        statusData={{
          status: 'ok',
          ai: { provider: 'local', model: 'llama3.2' },
          pending_approvals_count: 2,
        }}
        pendingApprovalsCount={2}
        openAlertsCount={1}
        micState="standby"
      />
    );

    expect(screen.getByText(/BACKEND 8001: ONLINE/i)).toBeInTheDocument();
    expect(screen.getByText('local')).toBeInTheDocument();
    expect(screen.getByText('[llama3.2]')).toBeInTheDocument();
    expect(screen.getByText(/APPROVALS: 2/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('renders backend offline state when connection fails', () => {
    render(
      <StatusBar
        isBackendOnline={false}
        pendingApprovalsCount={0}
      />
    );

    expect(screen.getByText(/BACKEND: OFFLINE/i)).toBeInTheDocument();
  });
});

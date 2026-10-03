import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncidentsTab } from '../components/security/IncidentsTab';
import { FirewallTab } from '../components/security/FirewallTab';
import { api } from '../api/client';
import { SecurityIncident, FirewallRuleItem } from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    getIncidents: vi.fn(),
    getIncident: vi.fn(),
    updateIncident: vi.fn(),
    runThreatDetector: vi.fn(),
    killProcess: vi.fn(),
    blockIp: vi.fn(),
    getFirewallRules: vi.fn(),
    rollbackFirewallRule: vi.fn(),
    confirm: vi.fn(),
  },
}));

const mockIncidentProcess: SecurityIncident = {
  id: 1,
  title: 'Masquerading Process Detected: svch0st.exe (PID 4500)',
  description: 'Process svch0st.exe has a name designed to mimic a legitimate system executable.',
  severity: 'high',
  category: 'suspicious_process',
  status: 'open',
  source_type: 'process',
  source_val: 'PID 4500 (svch0st.exe)',
  evidence: [
    {
      fact: 'Process mimics svchost.exe',
      inference: 'Masquerading as system executable',
      confidence: 'high',
    },
  ],
  mitre_tactics: ['T1036'],
  playbook_id: 'pb-suspicious-process',
  playbook_progress: ['step_1'],
  notes: 'Investigating anomaly.',
  timeline: [
    {
      id: 1,
      incident_id: 1,
      action: 'incident_created',
      actor: 'ThreatDetector',
      details: {},
      created_at: '2026-10-02T12:00:00Z',
    },
  ],
  created_at: '2026-10-02T12:00:00Z',
  updated_at: '2026-10-02T12:00:00Z',
  resolved_at: null,
};

const mockIncidentIp: SecurityIncident = {
  id: 2,
  title: 'Brute Force Authentication Pattern from 198.51.100.44',
  description: 'Multiple consecutive failed access attempts detected originating from IP address 198.51.100.44.',
  severity: 'critical',
  category: 'brute_force',
  status: 'open',
  source_type: 'ip',
  source_val: '198.51.100.44',
  evidence: [
    {
      fact: '5 failed login attempts',
      inference: 'Credential stuffing attack',
      confidence: 'high',
    },
  ],
  mitre_tactics: ['T1110'],
  playbook_id: 'pb-brute-force',
  playbook_progress: [],
  notes: '',
  timeline: [],
  created_at: '2026-10-02T12:05:00Z',
  updated_at: '2026-10-02T12:05:00Z',
  resolved_at: null,
};

const mockFirewallRule: FirewallRuleItem = {
  id: 10,
  rule_name: 'AegisBlock_198_51_100_44',
  ip_address: '198.51.100.44',
  direction: 'inbound',
  action: 'block',
  status: 'active',
  rollback_cmd: 'netsh advfirewall firewall delete rule name="AegisBlock_198_51_100_44"',
  notes: 'Defensive incident response block',
  created_at: '2026-10-02T12:10:00Z',
  removed_at: null,
};

const createTestWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('Defensive Incident Response & Threat Triage UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.getIncidents as ReturnType<typeof vi.fn>).mockResolvedValue([mockIncidentProcess, mockIncidentIp]);
    (api.getIncident as ReturnType<typeof vi.fn>).mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(mockIncidentProcess);
      if (id === 2) return Promise.resolve(mockIncidentIp);
      return Promise.reject(new Error('Not found'));
    });
    (api.getFirewallRules as ReturnType<typeof vi.fn>).mockResolvedValue([mockFirewallRule]);
  });

  it('renders incidents log with severity indicators and MITRE badges', async () => {
    const Wrapper = createTestWrapper();
    render(<IncidentsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Masquerading Process Detected/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Brute Force Authentication Pattern/i)).toBeInTheDocument();

    // Check MITRE badges
    expect(screen.getByText('T1036')).toBeInTheDocument();
    expect(screen.getByText('T1110')).toBeInTheDocument();
  });

  it('opens incident triage modal and displays playbook checklist', async () => {
    const Wrapper = createTestWrapper();
    render(<IncidentsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Masquerading Process Detected/i)).toBeInTheDocument();
    });

    const triageButtons = screen.getAllByRole('button', { name: /Triage & Playbook/i });
    fireEvent.click(triageButtons[0]);

    await waitFor(() => {
      expect(screen.getByText(/Suspicious Process Remediation Playbook/i)).toBeInTheDocument();
    });

    // Verify playbook steps
    expect(screen.getByText(/Inspect Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText(/Verify Executable Path/i)).toBeInTheDocument();
    expect(screen.getByText(/Terminate Process Tree/i)).toBeInTheDocument();
  });

  it('toggles playbook step progress via API update', async () => {
    (api.updateIncident as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...mockIncidentProcess,
      playbook_progress: ['step_1', 'step_2'],
    });

    const Wrapper = createTestWrapper();
    render(<IncidentsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Masquerading Process Detected/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Triage & Playbook/i })[0]);

    await waitFor(() => {
      expect(screen.getByText(/Verify Executable Path/i)).toBeInTheDocument();
    });

    // Click step 2
    fireEvent.click(screen.getByText(/Verify Executable Path/i));

    await waitFor(() => {
      expect(api.updateIncident).toHaveBeenCalledWith(1, {
        playbook_progress: expect.arrayContaining(['step_1', 'step_2']),
      });
    });
  });

  it('requests Level 4 approval for process termination and renders inline ApprovalCard', async () => {
    (api.killProcess as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'needs_approval',
      decision: 'ask',
      pending_action_id: 'action-kill-4500',
      pending_expires_at: new Date(Date.now() + 300000).toISOString(),
    });

    const Wrapper = createTestWrapper();
    render(<IncidentsTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText(/Masquerading Process Detected/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: /Triage & Playbook/i })[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Terminate Suspicious Process Tree/i })).toBeInTheDocument();
    });

    // Trigger mitigation
    fireEvent.click(screen.getByRole('button', { name: /Terminate Suspicious Process Tree/i }));

    await waitFor(() => {
      expect(api.killProcess).toHaveBeenCalledWith(4500, undefined, 1);
      // Approval Card should appear
      expect(screen.getByText(/SECURITY APPROVAL REQUIRED/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /APPROVE ACTION/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /DENY ACTION/i })).toBeInTheDocument();
    });
  });

  it('renders firewall tab with active block rules and rollback commands', async () => {
    const Wrapper = createTestWrapper();
    render(<FirewallTab />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(screen.getByText('AegisBlock_198_51_100_44')).toBeInTheDocument();
    });

    expect(screen.getByText('198.51.100.44')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rollback Cmd/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Remove Block/i })).toBeInTheDocument();
  });
});

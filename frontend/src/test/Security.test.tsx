import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecurityView } from '../views/SecurityView';
import { api } from '../api/client';
import {
  SecurityPostureData,
  ProcessInspectData,
  ListeningPortsData,
  SecuritySelfTestData,
} from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    getSecurityPosture: vi.fn(),
    inspectProcesses: vi.fn(),
    getListeningPorts: vi.fn(),
    runSecuritySelfTest: vi.fn(),
    getScanFindings: vi.fn().mockResolvedValue([]),
    getQuarantineItems: vi.fn().mockResolvedValue([]),
    getSecuritySummary: vi.fn().mockResolvedValue({
      open_incidents: 0,
      critical_incidents: 0,
      high_incidents: 0,
      total_incidents: 0,
      quarantined_files: 0,
      scanned_files: 0,
    }),
    getIncidents: vi.fn().mockResolvedValue([]),
    getFirewallRules: vi.fn().mockResolvedValue([]),
  },
}));

const mockPosture: SecurityPostureData = {
  total_score: 85,
  max_score: 100,
  grade: 'B',
  checks: [
    {
      id: 'firewall',
      title: 'Windows Firewall Active',
      status: 'PASS',
      score: 15,
      max_score: 15,
      details: 'All firewall profiles active (Domain, Private, Public).',
      meaning: 'Packet filtering active across network interfaces.',
      rationale: 'Blocks unauthorized inbound probes.',
      remediation: 'netsh advfirewall set allprofiles state on',
    },
    {
      id: 'antivirus',
      title: 'Real-Time Antivirus Protection',
      status: 'PASS',
      score: 20,
      max_score: 20,
      details: 'Windows Defender Real-time Protection active.',
      meaning: 'Memory and write scanner enabled.',
      rationale: 'Stops malware droppers.',
      remediation: 'Turn on Real-time protection in Windows Security.',
    },
    {
      id: 'uac',
      title: 'User Account Control (UAC)',
      status: 'WARN',
      score: 8,
      max_score: 15,
      details: 'Elevation configured but not at highest level.',
      meaning: 'Prompts before administrative changes.',
      rationale: 'Prevents silent privilege escalation.',
      remediation: 'Set UAC slider to Always Notify in Control Panel.',
    },
  ],
};

const mockProcesses: ProcessInspectData = {
  total_processes: 2,
  flagged_count: 1,
  processes: [
    {
      pid: 101,
      name: 'svch0st.exe',
      exe: 'C:\\Windows\\Temp\\svch0st.exe',
      ppid: 1,
      parent_name: 'services.exe',
      username: 'SYSTEM',
      cpu_percent: 0.1,
      memory_mb: 12.4,
      listening_ports: [4444],
      flags: [
        {
          rule: 'TYPOSQUATTING_NAME',
          severity: 'high',
          title: 'Suspicious Process Typosquatting',
          reason: "Process name 'svch0st.exe' mimics core binary 'svchost.exe'.",
        },
      ],
    },
    {
      pid: 202,
      name: 'python.exe',
      exe: 'C:\\Python314\\python.exe',
      ppid: 50,
      parent_name: 'cmd.exe',
      username: 'Alice',
      cpu_percent: 1.2,
      memory_mb: 45.0,
      listening_ports: [8001],
      flags: [],
    },
  ],
};

const mockPorts: ListeningPortsData = {
  count: 2,
  ports: [
    {
      port: 8001,
      protocol: 'TCP',
      bind_ip: '127.0.0.1',
      pid: 202,
      process_name: 'python.exe',
      is_public: false,
    },
    {
      port: 4444,
      protocol: 'TCP',
      bind_ip: '0.0.0.0',
      pid: 101,
      process_name: 'svch0st.exe',
      is_public: true,
    },
  ],
};

const mockSelfTest: SecuritySelfTestData = {
  test_name: 'EICAR Standard AV Detection Self-Test',
  status: 'PASSED_VERIFIED',
  threat_name: 'EICAR-Standard-AV-Test-File (Benign Test Artifact)',
  hash_matched: true,
  signature_matched: true,
  explanation: 'The detection engine identified the 68-byte benign EICAR signature.',
};

describe('SecurityView Component', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.getSecurityPosture).mockResolvedValue(mockPosture);
    vi.mocked(api.inspectProcesses).mockResolvedValue(mockProcesses);
    vi.mocked(api.getListeningPorts).mockResolvedValue(mockPorts);
    vi.mocked(api.runSecuritySelfTest).mockResolvedValue(mockSelfTest);
  });

  it('renders posture score gauge and checklist items', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SecurityView />
      </QueryClientProvider>
    );

    // Header check
    expect(screen.getByText(/DEFENSIVE SECURITY CENTER/i)).toBeInTheDocument();

    // Score and grade
    await waitFor(() => {
      expect(screen.getByText('85')).toBeInTheDocument();
      expect(screen.getByText(/GRADE: B/i)).toBeInTheDocument();
      expect(screen.getByText('Windows Firewall Active')).toBeInTheDocument();
      expect(screen.getByText('Real-Time Antivirus Protection')).toBeInTheDocument();
    });
  });

  it('expands checklist item to view remediation and copies command', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SecurityView />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Windows Firewall Active')).toBeInTheDocument();
    });

    // Click item to expand drawer
    fireEvent.click(screen.getByText('Windows Firewall Active'));

    await waitFor(() => {
      expect(screen.getByText(/WHAT IT MEANS/i)).toBeInTheDocument();
      expect(screen.getByText(/WHY IT MATTERS/i)).toBeInTheDocument();
      expect(screen.getByText(/HOW TO FIX/i)).toBeInTheDocument();
      expect(screen.getByText('netsh advfirewall set allprofiles state on')).toBeInTheDocument();
    });

    // Copy remediation
    const copyBtn = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyBtn);
    expect(screen.getByText('COPIED')).toBeInTheDocument();
  });

  it('navigates to Process Inspector, shows anomalies, and opens process telemetry modal', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SecurityView />
      </QueryClientProvider>
    );

    // Switch to Process Inspector tab
    const procTab = screen.getByRole('button', { name: /process inspector/i });
    fireEvent.click(procTab);

    await waitFor(() => {
      expect(screen.getByText('svch0st.exe')).toBeInTheDocument();
      expect(screen.getByText('python.exe')).toBeInTheDocument();
      expect(screen.getByText(/TYPOSQUATTING NAME/i)).toBeInTheDocument();
    });

    // Click suspicious process row to open modal
    fireEvent.click(screen.getByText('svch0st.exe'));

    await waitFor(() => {
      expect(screen.getByText(/PROCESS TELEMETRY: svch0st.exe/i)).toBeInTheDocument();
      expect(screen.getByText(/HEURISTIC ANOMALY LEADS/i)).toBeInTheDocument();
      expect(screen.getByText(/mimics core binary/i)).toBeInTheDocument();
    });

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
  });

  it('navigates to Listening Ports and audits sockets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SecurityView />
      </QueryClientProvider>
    );

    const portsTab = screen.getByRole('button', { name: /listening ports/i });
    fireEvent.click(portsTab);

    await waitFor(() => {
      expect(screen.getByText('8001')).toBeInTheDocument();
      expect(screen.getByText('4444')).toBeInTheDocument();
      expect(screen.getByText('PUBLIC (0.0.0.0)')).toBeInTheDocument();
      expect(screen.getByText('LOCAL (127.0.0.1)')).toBeInTheDocument();
    });
  });

  it('runs EICAR self-test and displays verified detection card', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <SecurityView />
      </QueryClientProvider>
    );

    // Click Run Self-Test in header
    const selfTestBtn = screen.getByRole('button', { name: /run self-test/i });
    fireEvent.click(selfTestBtn);

    await waitFor(() => {
      expect(api.runSecuritySelfTest).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/SELF-TEST VERIFIED: PASSED_VERIFIED/i)).toBeInTheDocument();
      expect(screen.getByText(/YES \(EICAR_SIG_001\)/i)).toBeInTheDocument();
      expect(screen.getByText(/YES \(SHA-256 Validated\)/i)).toBeInTheDocument();
    });
  });
});

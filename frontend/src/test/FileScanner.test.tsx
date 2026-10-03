import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FileScannerTab } from '../components/security/FileScannerTab';
import { QuarantineVaultTab } from '../components/security/QuarantineVaultTab';
import { api } from '../api/client';
import { ScanFindingItem, QuarantineItem } from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    scanFile: vi.fn(),
    getScanFindings: vi.fn(),
    getQuarantineItems: vi.fn(),
    quarantineFile: vi.fn(),
    restoreQuarantinedFile: vi.fn(),
    deleteQuarantinedFile: vi.fn(),
    confirm: vi.fn(),
    lookupHash: vi.fn(),
  },
}));

const mockFindingClean: ScanFindingItem = {
  id: 1,
  file_path: 'C:/projects/clean_script.py',
  file_name: 'clean_script.py',
  file_size: 1024,
  sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  md5: 'd41d8cd98f00b204e9800998ecf8427e',
  entropy: 4.25,
  verdict: 'clean',
  threat_score: 5,
  evidence: [
    {
      fact: 'Normal Shannon entropy: 4.25 / 8.0',
      source: 'Entropy Calculator',
      inference: 'Text and instructions show standard human-readable distribution.',
      confidence: 'high',
      severity: 'info',
    },
  ],
  file_metadata: {
    disclaimer: 'Heuristic scan only. Never executes binary instructions.',
  },
  is_quarantined: false,
  created_at: '2026-10-02T12:00:00Z',
};

const mockFindingMalicious: ScanFindingItem = {
  id: 2,
  file_path: 'C:/Users/dell/Downloads/eicar_test.com',
  file_name: 'eicar_test.com',
  file_size: 68,
  sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
  md5: '44d88612fea8a8f36de82e1278abb02f',
  entropy: 5.6,
  verdict: 'likely_malicious',
  threat_score: 95,
  evidence: [
    {
      fact: 'Matched signature rule: Standard EICAR Antivirus Verification Sample',
      source: 'YARA Heuristic Rule Engine',
      inference: 'File matches standard harmless antivirus verification test pattern.',
      confidence: 'high',
      severity: 'high',
    },
  ],
  file_metadata: {
    pe_info: {
      is_pe: true,
      machine_type: 'Intel 386 / x86',
      sections_count: 2,
      sections: [
        {
          name: 'UPX0',
          virtual_size: 4096,
          raw_size: 512,
          entropy: 7.8,
          characteristics: 0,
        },
      ],
      suspicious_imports_found: ['VirtualAllocEx', 'WriteProcessMemory'],
    },
    disclaimer: 'Static heuristic scan only. Never executes binaries.',
  },
  is_quarantined: false,
  created_at: '2026-10-02T12:05:00Z',
};

const mockQuarantineItems: QuarantineItem[] = [
  {
    id: 10,
    original_path: 'C:/temp/dropper.exe',
    quarantine_filename: '275a021b_dropper.exe.quarantine',
    quarantine_path: 'C:/ai-assistant/backend/data/quarantine/275a021b_dropper.exe.quarantine',
    sha256: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
    file_size: 2048,
    verdict: 'quarantined',
    status: 'quarantined',
    notes: 'Suspicious entropy and packer detected',
    created_at: '2026-10-02T12:10:00Z',
  },
];

describe('File Threat Scanner & Quarantine Vault', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.mocked(api.getScanFindings).mockResolvedValue([mockFindingClean]);
    vi.mocked(api.getQuarantineItems).mockResolvedValue(mockQuarantineItems);
  });

  it('renders scanner boundary disclosures and loads harmless EICAR sample', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <FileScannerTab />
      </QueryClientProvider>
    );

    // Verify defensive boundary notice
    expect(screen.getByText(/Defensive Static Threat Scanner/i)).toBeInTheDocument();
    expect(screen.getByText(/Static analysis only/i)).toBeInTheDocument();

    // Verify history table has clean script
    await waitFor(() => {
      expect(screen.getByText('clean_script.py')).toBeInTheDocument();
      expect(screen.getAllByText(/clean/i).length).toBeGreaterThanOrEqual(1);
    });

    // Click Load EICAR Sample button
    const loadEicarBtn = screen.getByRole('button', { name: /load harmless eicar sample/i });
    fireEvent.click(loadEicarBtn);

    // Should indicate the eicar sample file is ready
    expect(screen.getByText(/eicar_antivirus_test_sample.com/i)).toBeInTheDocument();
  });

  it('executes defensive scan and renders malicious finding report with PE sections', async () => {
    vi.mocked(api.scanFile).mockResolvedValue(mockFindingMalicious);

    render(
      <QueryClientProvider client={queryClient}>
        <FileScannerTab />
      </QueryClientProvider>
    );

    // Enter file path and submit scan
    const pathInput = screen.getByPlaceholderText(/target\.exe/i);
    fireEvent.change(pathInput, { target: { value: 'C:/Users/dell/Downloads/eicar_test.com' } });
    await waitFor(() => {
      expect(pathInput).toHaveValue('C:/Users/dell/Downloads/eicar_test.com');
    });

    const scanBtn = screen.getByRole('button', { name: /execute defensive scan/i });
    expect(scanBtn).not.toBeDisabled();
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(api.scanFile).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('eicar_test.com')).toBeInTheDocument();
    });

    expect(screen.getByText(/likely malicious/i)).toBeInTheDocument();
    expect(screen.getByText('95 / 100')).toBeInTheDocument();
    expect(screen.getByText(/Matched signature rule: Standard EICAR/i)).toBeInTheDocument();
    expect(screen.getByText('UPX0')).toBeInTheDocument();
    expect(screen.getByText('VirtualAllocEx')).toBeInTheDocument();
    expect(screen.getByText('WriteProcessMemory')).toBeInTheDocument();
    expect(screen.getByText(/Static heuristic scan only. Never executes binaries./i)).toBeInTheDocument();
  });

  it('initiates quarantine, triggers Level 4 approval card, and confirms quarantine', async () => {
    vi.mocked(api.scanFile).mockResolvedValue(mockFindingMalicious);
    vi.mocked(api.quarantineFile).mockResolvedValue({
      status: 'needs_approval',
      decision: 'ask',
      pending_action_id: 'pending-act-999',
      pending_expires_at: '2026-10-02T13:00:00Z',
    });
    vi.mocked(api.confirm).mockResolvedValue({
      status: 'executed',
      message: 'Quarantine completed',
      reply: null,
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FileScannerTab />
      </QueryClientProvider>
    );

    // Scan file first to display report
    const pathInput = screen.getByPlaceholderText(/target\.exe/i);
    fireEvent.change(pathInput, { target: { value: 'C:/Users/dell/Downloads/eicar_test.com' } });
    await waitFor(() => {
      expect(pathInput).toHaveValue('C:/Users/dell/Downloads/eicar_test.com');
    });

    const scanBtn = screen.getByRole('button', { name: /execute defensive scan/i });
    expect(scanBtn).not.toBeDisabled();
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /quarantine file/i })).toBeInTheDocument();
    });

    // Click Quarantine File
    fireEvent.click(screen.getByRole('button', { name: /quarantine file/i }));

    // Approval card should appear
    await waitFor(() => {
      expect(screen.getByText(/Approval Required: Move to Quarantine Vault/i)).toBeInTheDocument();
      expect(screen.getByText(/Action ID: pending-act-999/i)).toBeInTheDocument();
    });

    // Confirm approval
    fireEvent.click(screen.getByRole('button', { name: /approve & quarantine/i }));

    await waitFor(() => {
      expect(api.confirm).toHaveBeenCalledWith({
        action_id: 'pending-act-999',
        decision: 'approve',
      });
      expect(screen.getByText(/Approval granted: File moved into quarantine vault./i)).toBeInTheDocument();
    });
  });

  it('performs local hash reputation lookup', async () => {
    vi.mocked(api.lookupHash).mockResolvedValue({
      status: 'found',
      source: 'known_signatures_database',
      hash: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f',
      description: 'Standard EICAR Harmless Antivirus Verification Test String',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <FileScannerTab />
      </QueryClientProvider>
    );

    const hashInput = screen.getByPlaceholderText(/enter sha-256 or md5 hash/i);
    fireEvent.change(hashInput, {
      target: { value: '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f' },
    });

    const lookupBtn = screen.getByRole('button', { name: /^lookup$/i });
    fireEvent.click(lookupBtn);

    await waitFor(() => {
      expect(api.lookupHash).toHaveBeenCalledWith(
        '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f'
      );
      expect(screen.getByText(/Standard EICAR Harmless Antivirus Verification Test String/i)).toBeInTheDocument();
    });
  });

  it('renders QuarantineVaultTab and triggers approval on restore action', async () => {
    vi.mocked(api.restoreQuarantinedFile).mockResolvedValue({
      status: 'needs_approval',
      pending_action_id: 'restore-act-101',
    });

    render(
      <QueryClientProvider client={queryClient}>
        <QuarantineVaultTab />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('C:/temp/dropper.exe')).toBeInTheDocument();
      expect(screen.getByText('275a021b_dropper.exe.quarantine')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /restore/i })).toBeInTheDocument();
    });

    // Trigger Restore
    fireEvent.click(screen.getByRole('button', { name: /restore/i }));

    await waitFor(() => {
      expect(screen.getByText(/Approve File Restoration \(Risk Level 4\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Action ID: restore-act-101/i)).toBeInTheDocument();
    });
  });
});

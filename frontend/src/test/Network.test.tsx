import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NetworkView } from '../views/NetworkView';
import { api } from '../api/client';
import {
  SubnetInfo,
  NetworkDeviceItem,
  NetworkAlertItem,
  DnsQueryLogItem,
} from '../api/types';

vi.mock('../api/client', () => ({
  api: {
    getSubnets: vi.fn(),
    confirmSubnet: vi.fn(),
    getNetworkDevices: vi.fn(),
    getNetworkDevice: vi.fn(),
    updateNetworkDevice: vi.fn(),
    deleteNetworkDevice: vi.fn(),
    scanNetwork: vi.fn(),
    getNetworkAlerts: vi.fn(),
    ackNetworkAlert: vi.fn(),
    ackAllNetworkAlerts: vi.fn(),
    getDnsLogs: vi.fn(),
    lookupDns: vi.fn(),
    importDnsLogs: vi.fn(),
    exportNetworkData: vi.fn(),
    clearNetworkData: vi.fn(),
  },
}));

const mockSubnets: SubnetInfo[] = [
  {
    interface: 'Wi-Fi',
    ip: '10.227.244.161',
    netmask: '255.255.255.0',
    subnet: '10.227.244.0/24',
    gateway: '10.227.244.14',
    mac: '2C:33:58:DE:AE:5E',
    confirmed: true,
    confirmed_at: '2026-10-02T12:00:00Z',
  },
];

const mockDevices: NetworkDeviceItem[] = [
  {
    id: 1,
    mac_address: '2C:33:58:DE:AE:5E',
    ip_address: '10.227.244.161',
    hostname: 'UJJWAL-LAPTOP',
    vendor: 'Intel',
    label: 'mine',
    notes: 'Primary workstation',
    first_seen: '2026-10-02T10:00:00Z',
    last_seen: '2026-10-02T12:30:00Z',
    is_online: true,
    sightings_count: 5,
  },
  {
    id: 2,
    mac_address: 'AA:B9:72:C7:74:CD',
    ip_address: '10.227.244.14',
    hostname: 'router.home',
    vendor: 'Apple',
    label: 'mine',
    notes: 'Default Gateway',
    first_seen: '2026-10-02T10:00:00Z',
    last_seen: '2026-10-02T12:30:00Z',
    is_online: true,
    sightings_count: 12,
  },
];

const mockAlerts: NetworkAlertItem[] = [
  {
    id: 1,
    device: 1,
    device_hostname: 'UJJWAL-LAPTOP',
    device_mac: '2C:33:58:DE:AE:5E',
    alert_type: 'new_device',
    severity: 'info',
    message: 'New device discovered: UJJWAL-LAPTOP [2C:33:58:DE:AE:5E]',
    is_acknowledged: false,
    created_at: '2026-10-02T10:00:00Z',
  },
];

const mockDnsLogs: DnsQueryLogItem[] = [
  {
    id: 1,
    domain: 'github.com',
    client_ip: '10.227.244.161',
    query_type: 'A',
    response: '140.82.121.4',
    timestamp: '2026-10-02T12:00:00Z',
    source: 'lookup',
    created_at: '2026-10-02T12:00:00Z',
  },
];

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <NetworkView />
    </QueryClientProvider>
  );
};

describe('NetworkView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.getSubnets).mockResolvedValue(mockSubnets);
    vi.mocked(api.getNetworkDevices).mockResolvedValue(mockDevices);
    vi.mocked(api.getNetworkAlerts).mockResolvedValue(mockAlerts);
    vi.mocked(api.getDnsLogs).mockResolvedValue(mockDnsLogs);
  });

  it('renders network command center header, stats, and device table', async () => {
    renderComponent();

    // Verify header & defensive badge
    expect(await screen.findByText('Network & DNS Inventory')).toBeInTheDocument();
    expect(screen.getByText('Defensive Only')).toBeInTheDocument();

    // Await devices to load asynchronously
    expect(await screen.findByText('UJJWAL-LAPTOP')).toBeInTheDocument();

    // Verify KPI stats
    expect(screen.getByText('Known Devices')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1); // total devices & badge
    expect(screen.getAllByText(/10.227.244.0\/24/).length).toBeGreaterThanOrEqual(1);

    // Verify devices listed in table
    expect(screen.getByText('10.227.244.161')).toBeInTheDocument();
    expect(screen.getByText('2C:33:58:DE:AE:5E')).toBeInTheDocument();
    expect(screen.getByText('Intel')).toBeInTheDocument();
    expect(screen.getByText('router.home')).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
  });

  it('renders safety boundary banner and opens modal if subnet is unconfirmed', async () => {
    vi.mocked(api.getSubnets).mockResolvedValue([
      {
        ...mockSubnets[0],
        confirmed: false,
        confirmed_at: null,
      },
    ]);

    renderComponent();

    // Verify safety banner
    expect(
      await screen.findByText(/DEFENSIVE BOUNDARY: Subnet Ownership Not Confirmed/i)
    ).toBeInTheDocument();

    // Click "Verify Ownership"
    const verifyBtn = screen.getByRole('button', { name: /Verify Ownership/i });
    fireEvent.click(verifyBtn);

    // Modal opens
    expect(screen.getByText('Subnet Ownership Confirmation')).toBeInTheDocument();
    expect(screen.getByText(/Mandatory Defensive Safety Gate/i)).toBeInTheDocument();
  });

  it('allows confirming subnet ownership from modal', async () => {
    vi.mocked(api.confirmSubnet).mockResolvedValue({
      ...mockSubnets[0],
      confirmed: true,
    });

    renderComponent();

    // Click Subnet status button in header to open modal
    const subnetBadge = await screen.findByText(/Subnet: 10.227.244.0\/24/i);
    fireEvent.click(subnetBadge);

    expect(screen.getByText('Subnet Ownership Confirmation')).toBeInTheDocument();

    // Click Confirm Ownership
    const confirmBtn = screen.getByRole('button', { name: 'Confirm Ownership' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.confirmSubnet).toHaveBeenCalledWith({
        subnet: '10.227.244.0/24',
        gateway_ip: '10.227.244.14',
        interface_name: 'Wi-Fi',
        confirmed: true,
      });
    });
  });

  it('triggers defensive scan when user clicks Scan Subnet', async () => {
    vi.mocked(api.scanNetwork).mockResolvedValue({
      status: 'success',
      subnet: '10.227.244.0/24',
      devices_found: 2,
      new_devices_count: 0,
      devices: [],
      alerts_generated: 0,
      message: 'Scanned confirmed subnet 10.227.244.0/24.',
    });

    renderComponent();

    // Await confirmed subnet to load into state
    await screen.findByText(/Subnet: 10.227.244.0\/24/i);

    const scanBtn = await screen.findByRole('button', { name: /Scan Subnet/i });
    fireEvent.click(scanBtn);

    await waitFor(() => {
      expect(api.scanNetwork).toHaveBeenCalledWith('10.227.244.0/24');
    });
  });

  it('updates device label inline via dropdown', async () => {
    vi.mocked(api.updateNetworkDevice).mockResolvedValue({
      ...mockDevices[0],
      label: 'family',
    });

    renderComponent();

    await screen.findByText('UJJWAL-LAPTOP');
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);

    fireEvent.change(selects[0], { target: { value: 'family' } });

    await waitFor(() => {
      expect(api.updateNetworkDevice).toHaveBeenCalledWith(1, { label: 'family' });
    });
  });

  it('switches to Network Alerts tab and acknowledges alert', async () => {
    vi.mocked(api.ackNetworkAlert).mockResolvedValue({
      ...mockAlerts[0],
      is_acknowledged: true,
    });

    renderComponent();

    const alertsTab = await screen.findByRole('button', { name: /Network Alerts/i });
    fireEvent.click(alertsTab);

    expect(await screen.findByText(/New device discovered: UJJWAL-LAPTOP/i)).toBeInTheDocument();

    const ackBtn = screen.getByRole('button', { name: 'Acknowledge' });
    fireEvent.click(ackBtn);

    await waitFor(() => {
      expect(api.ackNetworkAlert).toHaveBeenCalledWith(1);
    });
  });

  it('switches to DNS Explorer tab and performs a DNS lookup', async () => {
    vi.mocked(api.lookupDns).mockResolvedValue({
      query: 'github.com',
      query_type: 'A',
      status: 'success',
      results: ['140.82.121.4'],
      message: 'Resolved github.com to 1 IP address.',
    });

    renderComponent();

    const dnsTab = await screen.findByRole('button', { name: /DNS Explorer & Logs/i });
    fireEvent.click(dnsTab);

    expect(await screen.findByText('Safe DNS & Reverse PTR Resolver')).toBeInTheDocument();
    expect(screen.getByText('github.com')).toBeInTheDocument();

    const input = screen.getByPlaceholderText(/Enter domain \(e.g. google.com\)/i);
    fireEvent.change(input, { target: { value: 'github.com' } });

    const resolveBtn = screen.getByRole('button', { name: /Resolve Query/i });
    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(api.lookupDns).toHaveBeenCalledWith('github.com');
    });

    expect(await screen.findByText('Resolved github.com to 1 IP address.')).toBeInTheDocument();
  });
});

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Network,
  Shield,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Search,
  Wifi,
  Globe,
  Radio,
  Clock,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Tag,
  Laptop,
  X,
} from 'lucide-react';
import { api } from '../api/client';
import { NetworkDeviceItem } from '../api/types';

type NetworkTab = 'devices' | 'alerts' | 'dns' | 'settings';

export const NetworkView: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<NetworkTab>('devices');

  // Filter states
  const [deviceSearch, setDeviceSearch] = useState('');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [dnsSearch, setDnsSearch] = useState('');
  const [dnsSourceFilter, setDnsSourceFilter] = useState('all');
  const [alertFilter, setAlertFilter] = useState<'all' | 'unread'>('unread');

  // Modals & Drawers
  const [showSubnetShieldModal, setShowSubnetShieldModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<NetworkDeviceItem | null>(null);
  const [deviceEditNotes, setDeviceEditNotes] = useState('');
  const [deviceEditHostname, setDeviceEditHostname] = useState('');
  const [showDnsImportModal, setShowDnsImportModal] = useState(false);
  const [dnsImportText, setDnsImportText] = useState('');
  const [dnsImportType, setDnsImportType] = useState<'json' | 'csv'>('json');
  const [dnsQueryInput, setDnsQueryInput] = useState('');
  const [dnsQueryResult, setDnsQueryResult] = useState<{
    query: string;
    query_type: string;
    status: string;
    results: string[];
    message: string;
  } | null>(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearScope, setClearScope] = useState<'prune_90_days' | 'devices' | 'alerts' | 'dns' | 'all'>('prune_90_days');
  const [bannerMessage, setBannerMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Queries
  const { data: subnets = [], refetch: refetchSubnets } = useQuery({
    queryKey: ['network-subnets'],
    queryFn: () => api.getSubnets(),
  });

  const { data: devices = [], isLoading: devicesLoading } = useQuery({
    queryKey: ['network-devices', labelFilter, onlineOnly, deviceSearch],
    queryFn: () => api.getNetworkDevices(labelFilter, onlineOnly ? true : undefined, deviceSearch),
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ['network-alerts', alertFilter],
    queryFn: () => api.getNetworkAlerts(alertFilter === 'unread' ? false : undefined),
  });

  const { data: dnsLogs = [], isLoading: dnsLogsLoading } = useQuery({
    queryKey: ['network-dns', dnsSearch, dnsSourceFilter],
    queryFn: () => api.getDnsLogs(dnsSearch, dnsSourceFilter),
  });

  // Derived state: confirmed subnet
  const confirmedSubnet = subnets.find((s) => s.confirmed);
  const hasConfirmedSubnet = !!confirmedSubnet;

  // Mutations
  const confirmSubnetMutation = useMutation({
    mutationFn: (data: { subnet: string; gateway_ip?: string; interface_name?: string; confirmed: boolean }) =>
      api.confirmSubnet(data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['network-subnets'] });
      setBannerMessage({
        text: updated.confirmed
          ? `Subnet ${updated.subnet} confirmed. Device discovery is now authorized.`
          : `Subnet ${updated.subnet} ownership revoked. Scanning blocked.`,
        type: updated.confirmed ? 'success' : 'info',
      });
      setShowSubnetShieldModal(false);
    },
    onError: (err: any) => {
      setBannerMessage({ text: err.message || 'Failed to update subnet status.', type: 'error' });
    },
  });

  const scanMutation = useMutation({
    mutationFn: (targetSubnet?: string) => api.scanNetwork(targetSubnet),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['network-devices'] });
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
      setBannerMessage({
        text: res.message || `Scan completed: ${res.devices_found} devices found (${res.new_devices_count} new).`,
        type: 'success',
      });
    },
    onError: (err: any) => {
      if (err.code === 'SUBNET_NOT_CONFIRMED' || err.status === 403) {
        setShowSubnetShieldModal(true);
      }
      setBannerMessage({
        text: err.message || 'Scanning failed due to safety policy.',
        type: 'error',
      });
    },
  });

  const updateDeviceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NetworkDeviceItem> }) =>
      api.updateNetworkDevice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-devices'] });
      setSelectedDevice(null);
      setBannerMessage({ text: 'Device updated successfully.', type: 'success' });
    },
  });

  const deleteDeviceMutation = useMutation({
    mutationFn: (id: number) => api.deleteNetworkDevice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-devices'] });
      setSelectedDevice(null);
      setBannerMessage({ text: 'Device removed from inventory.', type: 'info' });
    },
  });

  const ackAlertMutation = useMutation({
    mutationFn: (id: number) => api.ackNetworkAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
    },
  });

  const ackAllAlertsMutation = useMutation({
    mutationFn: () => api.ackAllNetworkAlerts(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
      setBannerMessage({ text: `Acknowledged ${res.acknowledged_count} alerts.`, type: 'success' });
    },
  });

  const dnsLookupMutation = useMutation({
    mutationFn: (query: string) => api.lookupDns(query),
    onSuccess: (res) => {
      setDnsQueryResult(res);
      queryClient.invalidateQueries({ queryKey: ['network-dns'] });
    },
    onError: (err: any) => {
      setBannerMessage({ text: err.message || 'DNS lookup failed.', type: 'error' });
    },
  });

  const importDnsMutation = useMutation({
    mutationFn: () => {
      if (dnsImportType === 'json') {
        const parsed = JSON.parse(dnsImportText);
        return api.importDnsLogs({ entries: parsed });
      } else {
        return api.importDnsLogs({ csv_content: dnsImportText });
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['network-dns'] });
      setShowDnsImportModal(false);
      setDnsImportText('');
      setBannerMessage({ text: res.message, type: 'success' });
    },
    onError: (err: any) => {
      setBannerMessage({ text: `Import failed: ${err.message}`, type: 'error' });
    },
  });

  const clearDataMutation = useMutation({
    mutationFn: (scope: 'prune_90_days' | 'devices' | 'alerts' | 'dns' | 'all') =>
      api.clearNetworkData(scope),
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['network-devices'] });
      queryClient.invalidateQueries({ queryKey: ['network-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['network-dns'] });
      setShowClearModal(false);
      setBannerMessage({
        text: res.message || 'Network retention / wipe action completed.',
        type: 'success',
      });
    },
  });

  const handleExportJson = async () => {
    try {
      const data = await api.exportNetworkData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `network_inventory_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setBannerMessage({ text: `Export failed: ${e.message}`, type: 'error' });
    }
  };

  const handleTriggerScan = () => {
    if (!hasConfirmedSubnet) {
      setShowSubnetShieldModal(true);
      return;
    }
    scanMutation.mutate(confirmedSubnet?.subnet);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-theme-bg overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Top Banner / Notification */}
      {bannerMessage && (
        <div
          className={`p-3 rounded-lg flex items-center justify-between text-xs font-mono transition-all ${
            bannerMessage.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-400'
              : bannerMessage.type === 'error'
              ? 'bg-rose-950/40 border border-rose-500/40 text-rose-400'
              : 'bg-sky-950/40 border border-sky-500/40 text-sky-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {bannerMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : bannerMessage.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <Shield className="w-4 h-4 shrink-0" />
            )}
            <span>{bannerMessage.text}</span>
          </div>
          <button
            onClick={() => setBannerMessage(null)}
            className="p-1 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Safety Boundary Banner (if unconfirmed) */}
      {!hasConfirmedSubnet && (
        <div className="p-4 rounded-xl border border-amber-500/50 bg-amber-950/20 text-amber-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold tracking-wide">
                DEFENSIVE BOUNDARY: Subnet Ownership Not Confirmed
              </h4>
              <p className="text-xs text-amber-200/80 mt-1 max-w-2xl leading-relaxed">
                Aegis strictly enforces defensive boundaries. Device discovery and active probing are
                blocked until you confirm that you own or administer this local network.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowSubnetShieldModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg transition-colors flex items-center gap-2 shrink-0 shadow-lg shadow-amber-500/10"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify Ownership
          </button>
        </div>
      )}

      {/* Header & Cockpit Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-theme-border">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-6 h-6 text-theme-accent" />
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-theme-text">
              Network & DNS Inventory
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider bg-theme-accent/10 border border-theme-accent/30 text-theme-accent font-semibold uppercase">
              Defensive Only
            </span>
          </div>
          <p className="text-xs font-mono text-theme-muted mt-1">
            Own Network Only • Host ARP Discovery • Local Reverse DNS • 90-Day Sightings History
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowSubnetShieldModal(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-2 border transition-all ${
              hasConfirmedSubnet
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/40'
                : 'bg-amber-950/30 border-amber-500/40 text-amber-400 hover:bg-amber-900/40'
            }`}
          >
            {hasConfirmedSubnet ? (
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>{hasConfirmedSubnet ? `Subnet: ${confirmedSubnet?.subnet}` : 'Subnet: Unverified'}</span>
          </button>

          <button
            onClick={handleTriggerScan}
            disabled={scanMutation.isPending}
            className="px-3.5 py-1.5 bg-theme-accent hover:bg-theme-accent-hover text-black font-semibold text-xs rounded-lg transition-all flex items-center gap-2 shadow-md shadow-theme-accent/15 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanMutation.isPending ? 'animate-spin' : ''}`} />
            <span>{scanMutation.isPending ? 'Scanning...' : 'Scan Subnet'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-3 py-1.5 bg-theme-surface hover:bg-theme-surface-hover text-theme-text text-xs rounded-lg border border-theme-border flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-theme-muted" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-mono">
            <span>Known Devices</span>
            <Laptop className="w-4 h-4 text-theme-accent" />
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text mt-2">
            {devices.length}
          </div>
          <div className="text-[11px] font-mono text-emerald-400 mt-1 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
            {devices.filter((d) => d.is_online).length} online now
          </div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-mono">
            <span>Active Subnet</span>
            <Wifi className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-sm md:text-base font-bold font-mono text-theme-text mt-2 truncate">
            {confirmedSubnet ? confirmedSubnet.subnet : 'None Confirmed'}
          </div>
          <div className="text-[11px] font-mono text-theme-muted mt-1">
            Gateway: {confirmedSubnet?.gateway || 'N/A'}
          </div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-mono">
            <span>Network Alerts</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text mt-2">
            {alerts.filter((a) => !a.is_acknowledged).length}
          </div>
          <div className="text-[11px] font-mono text-theme-muted mt-1">
            {alerts.length} total recorded
          </div>
        </div>

        <div className="bg-theme-surface border border-theme-border rounded-xl p-4">
          <div className="flex items-center justify-between text-xs text-theme-muted font-mono">
            <span>DNS Queries Logged</span>
            <Globe className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-theme-text mt-2">
            {dnsLogs.length}
          </div>
          <div className="text-[11px] font-mono text-theme-muted mt-1">
            Local lookups & Pi-hole
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-theme-border space-x-1">
        {[
          { key: 'devices', label: 'Device Inventory', icon: Laptop, count: devices.length },
          {
            key: 'alerts',
            label: 'Network Alerts',
            icon: AlertTriangle,
            count: alerts.filter((a) => !a.is_acknowledged).length,
          },
          { key: 'dns', label: 'DNS Explorer & Logs', icon: Globe, count: dnsLogs.length },
          { key: 'settings', label: 'Subnet & Data Controls', icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as NetworkTab)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-mono font-medium border-b-2 transition-all ${
                isActive
                  ? 'border-theme-accent text-theme-accent bg-theme-accent/5'
                  : 'border-transparent text-theme-muted hover:text-theme-text hover:border-theme-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    tab.key === 'alerts'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-theme-surface border border-theme-border text-theme-muted'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Device Inventory */}
      {activeTab === 'devices' && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-theme-muted" />
              <input
                type="text"
                placeholder="Search by hostname, IP, MAC, or vendor..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs font-mono text-theme-text focus:outline-none focus:border-theme-accent"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 bg-theme-surface border border-theme-border p-1 rounded-lg text-xs font-mono">
                <span className="text-theme-muted px-2">Label:</span>
                {['all', 'mine', 'family', 'guest', 'unknown'].map((lbl) => (
                  <button
                    key={lbl}
                    onClick={() => setLabelFilter(lbl)}
                    className={`px-2 py-0.5 rounded capitalize transition-colors ${
                      labelFilter === lbl
                        ? 'bg-theme-accent text-black font-semibold'
                        : 'text-theme-muted hover:text-theme-text'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              <label className="flex items-center gap-2 text-xs font-mono text-theme-muted cursor-pointer select-none bg-theme-surface border border-theme-border px-3 py-1.5 rounded-lg hover:border-theme-accent/50">
                <input
                  type="checkbox"
                  checked={onlineOnly}
                  onChange={(e) => setOnlineOnly(e.target.checked)}
                  className="rounded border-theme-border text-theme-accent focus:ring-0"
                />
                <span>Online Only</span>
              </label>
            </div>
          </div>

          {/* Devices Table */}
          {devicesLoading ? (
            <div className="p-12 text-center text-xs font-mono text-theme-muted">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-theme-accent" />
              Loading device inventory...
            </div>
          ) : devices.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-theme-border rounded-xl bg-theme-surface/50">
              <Laptop className="w-10 h-10 text-theme-muted mx-auto mb-3 opacity-40" />
              <h3 className="text-sm font-semibold text-theme-text font-mono">
                No Devices Discovered Yet
              </h3>
              <p className="text-xs text-theme-muted mt-1 max-w-sm mx-auto">
                {hasConfirmedSubnet
                  ? 'Click "Scan Subnet" to query the local ARP table and identify active hosts.'
                  : 'Verify your subnet ownership above, then initiate your first defensive scan.'}
              </p>
              {hasConfirmedSubnet && (
                <button
                  onClick={handleTriggerScan}
                  className="mt-4 px-4 py-2 bg-theme-accent hover:bg-theme-accent-hover text-black font-semibold text-xs rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Scan Subnet Now
                </button>
              )}
            </div>
          ) : (
            <div className="border border-theme-border rounded-xl overflow-hidden bg-theme-surface">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-theme-bg/60 border-b border-theme-border text-theme-muted uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Device / Hostname</th>
                      <th className="py-3 px-4">IP Address</th>
                      <th className="py-3 px-4">MAC Address</th>
                      <th className="py-3 px-4">Vendor</th>
                      <th className="py-3 px-4">Label</th>
                      <th className="py-3 px-4">Last Seen</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/60">
                    {devices.map((device) => (
                      <tr
                        key={device.id}
                        className="hover:bg-theme-surface-hover/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedDevice(device)}
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full ${
                                device.is_online
                                  ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                                  : 'bg-zinc-600'
                              }`}
                            />
                            <span className="text-[11px] text-theme-muted capitalize">
                              {device.is_online ? 'online' : 'offline'}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-theme-text">
                            {device.hostname || 'Unknown Host'}
                          </div>
                          {device.notes && (
                            <div className="text-[10px] text-theme-muted truncate max-w-xs">
                              {device.notes}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4 text-theme-text font-bold">
                          {device.ip_address}
                        </td>

                        <td className="py-3 px-4 text-theme-muted">
                          <span className="px-1.5 py-0.5 bg-theme-bg rounded border border-theme-border/60 text-[11px]">
                            {device.mac_address}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide ${
                              device.vendor.includes('Apple')
                                ? 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                                : device.vendor.includes('Intel')
                                ? 'bg-blue-950/40 text-blue-400 border border-blue-500/30'
                                : device.vendor.includes('Google')
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30'
                                : device.vendor.includes('Raspberry Pi')
                                ? 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                                : device.vendor.includes('Randomized')
                                ? 'bg-purple-950/40 text-purple-400 border border-purple-500/30'
                                : 'bg-theme-bg text-theme-muted border border-theme-border'
                            }`}
                          >
                            {device.vendor}
                          </span>
                        </td>

                        <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={device.label}
                            onChange={(e) =>
                              updateDeviceMutation.mutate({
                                id: device.id,
                                data: { label: e.target.value as any },
                              })
                            }
                            className="bg-theme-bg border border-theme-border text-theme-text rounded px-2 py-1 text-xs font-mono focus:border-theme-accent focus:outline-none capitalize"
                          >
                            <option value="mine">Mine</option>
                            <option value="family">Family</option>
                            <option value="guest">Guest</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </td>

                        <td className="py-3 px-4 text-theme-muted text-[11px]">
                          {new Date(device.last_seen).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          <span className="text-[10px] opacity-75">
                            ({device.sightings_count || 1} sightings)
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setSelectedDevice(device);
                              setDeviceEditHostname(device.hostname);
                              setDeviceEditNotes(device.notes);
                            }}
                            className="p-1 hover:text-theme-accent transition-colors mr-1"
                            title="Edit Device Details"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteDeviceMutation.mutate(device.id)}
                            className="p-1 hover:text-rose-400 transition-colors"
                            title="Remove Device"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Network Alerts */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-theme-muted">Filter:</span>
              <button
                onClick={() => setAlertFilter('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  alertFilter === 'unread'
                    ? 'bg-theme-accent text-black font-semibold'
                    : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'
                }`}
              >
                Unread Only
              </button>
              <button
                onClick={() => setAlertFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-mono transition-colors ${
                  alertFilter === 'all'
                    ? 'bg-theme-accent text-black font-semibold'
                    : 'bg-theme-surface text-theme-muted hover:text-theme-text border border-theme-border'
                }`}
              >
                All Alerts
              </button>
            </div>

            {alerts.some((a) => !a.is_acknowledged) && (
              <button
                onClick={() => ackAllAlertsMutation.mutate()}
                className="px-3 py-1 bg-theme-surface hover:bg-theme-surface-hover text-theme-text text-xs font-mono rounded-lg border border-theme-border flex items-center gap-1.5 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acknowledge All</span>
              </button>
            )}
          </div>

          {alertsLoading ? (
            <div className="p-8 text-center text-xs font-mono text-theme-muted">
              Loading security alerts...
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-theme-border rounded-xl bg-theme-surface/50">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-semibold text-theme-text font-mono">
                Zero Active Network Alerts
              </h3>
              <p className="text-xs text-theme-muted mt-1 max-w-sm mx-auto">
                No unauthorized new devices, MAC changes, or anomalies detected on your confirmed subnet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                    alert.is_acknowledged
                      ? 'bg-theme-surface/60 border-theme-border/60 opacity-60'
                      : alert.severity === 'high'
                      ? 'bg-rose-950/20 border-rose-500/40 text-rose-300'
                      : alert.severity === 'medium'
                      ? 'bg-amber-950/20 border-amber-500/40 text-amber-300'
                      : 'bg-theme-surface border-theme-border text-theme-text'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {alert.severity === 'high' ? (
                        <AlertTriangle className="w-4 h-4 text-rose-400" />
                      ) : alert.severity === 'medium' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Radio className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-xs font-semibold">{alert.message}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                            alert.severity === 'high'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : alert.severity === 'medium'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          }`}
                        >
                          {alert.severity}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-theme-muted mt-1 flex items-center gap-3">
                        <span>Type: {alert.alert_type}</span>
                        <span>•</span>
                        <span>{new Date(alert.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {!alert.is_acknowledged && (
                    <button
                      onClick={() => ackAlertMutation.mutate(alert.id)}
                      className="px-2.5 py-1 bg-theme-bg hover:bg-theme-surface-hover text-theme-text rounded border border-theme-border text-xs font-mono transition-colors shrink-0"
                    >
                      Acknowledge
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: DNS Explorer & Logs */}
      {activeTab === 'dns' && (
        <div className="space-y-6">
          {/* Real-Time Lookup Card */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-4 md:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-4 h-4 text-theme-accent" />
              <h3 className="text-sm font-semibold font-mono text-theme-text">
                Safe DNS & Reverse PTR Resolver
              </h3>
            </div>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="text"
                placeholder="Enter domain (e.g. google.com) or IP (e.g. 1.1.1.1)..."
                value={dnsQueryInput}
                onChange={(e) => setDnsQueryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && dnsQueryInput.trim()) {
                    dnsLookupMutation.mutate(dnsQueryInput.trim());
                  }
                }}
                className="flex-1 px-3 py-2 bg-theme-bg border border-theme-border rounded-lg text-xs font-mono text-theme-text focus:outline-none focus:border-theme-accent"
              />
              <button
                onClick={() => dnsQueryInput.trim() && dnsLookupMutation.mutate(dnsQueryInput.trim())}
                disabled={dnsLookupMutation.isPending || !dnsQueryInput.trim()}
                className="px-4 py-2 bg-theme-accent hover:bg-theme-accent-hover text-black font-semibold text-xs font-mono rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{dnsLookupMutation.isPending ? 'Resolving...' : 'Resolve Query'}</span>
              </button>
              <button
                onClick={() => setShowDnsImportModal(true)}
                className="px-3 py-2 bg-theme-surface hover:bg-theme-surface-hover text-theme-text border border-theme-border text-xs font-mono rounded-lg transition-colors flex items-center justify-center gap-2 shrink-0"
              >
                <Upload className="w-3.5 h-3.5 text-theme-muted" />
                <span>Import Pi-hole / Logs</span>
              </button>
            </div>

            {dnsQueryResult && (
              <div className="mt-4 p-3 rounded-lg bg-theme-bg border border-theme-border text-xs font-mono">
                <div className="flex items-center justify-between text-theme-muted pb-2 border-b border-theme-border/50">
                  <span>
                    Query: <strong className="text-theme-text">{dnsQueryResult.query}</strong> ({dnsQueryResult.query_type})
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                      dnsQueryResult.status === 'success'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {dnsQueryResult.status}
                  </span>
                </div>
                <div className="mt-2 text-theme-text">
                  {dnsQueryResult.message}
                </div>
                {dnsQueryResult.results.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dnsQueryResult.results.map((res, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-theme-surface border border-theme-border text-theme-accent text-[11px]"
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DNS Query History Table */}
          <div className="space-y-3">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-center">
              <h4 className="text-xs font-mono font-semibold text-theme-muted uppercase tracking-wider">
                Historical Query Logs ({dnsLogs.length})
              </h4>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  type="text"
                  placeholder="Filter domain or client IP..."
                  value={dnsSearch}
                  onChange={(e) => setDnsSearch(e.target.value)}
                  className="px-3 py-1 bg-theme-surface border border-theme-border rounded text-xs font-mono text-theme-text focus:outline-none focus:border-theme-accent"
                />
                <select
                  value={dnsSourceFilter}
                  onChange={(e) => setDnsSourceFilter(e.target.value)}
                  className="bg-theme-surface border border-theme-border rounded px-2 py-1 text-xs font-mono text-theme-text focus:outline-none"
                >
                  <option value="all">All Sources</option>
                  <option value="lookup">Manual Lookup</option>
                  <option value="pihole_import">Pi-hole Import</option>
                  <option value="router_import">Router Import</option>
                </select>
              </div>
            </div>

            {dnsLogsLoading ? (
              <div className="p-8 text-center text-xs font-mono text-theme-muted">
                Loading DNS queries...
              </div>
            ) : dnsLogs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-theme-border rounded-xl text-xs font-mono text-theme-muted">
                No DNS logs recorded. Run a query above or import logs from Pi-hole.
              </div>
            ) : (
              <div className="border border-theme-border rounded-xl overflow-hidden bg-theme-surface">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-theme-bg/60 border-b border-theme-border text-theme-muted uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Domain</th>
                      <th className="py-2.5 px-3">Resolved IP / Answer</th>
                      <th className="py-2.5 px-3">Client</th>
                      <th className="py-2.5 px-3">Source</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-theme-border/60">
                    {dnsLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-theme-surface-hover/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-theme-bg border border-theme-border text-[10px] font-bold text-sky-400">
                            {log.query_type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-theme-text">
                          {log.domain}
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400">
                          {log.response || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-theme-muted">
                          {log.client_ip || '127.0.0.1'}
                        </td>
                        <td className="py-2.5 px-3 text-theme-muted capitalize">
                          <span className="px-1.5 py-0.2 rounded bg-theme-bg text-[10px]">
                            {log.source.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-theme-muted text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Subnet & Data Controls */}
      {activeTab === 'settings' && (
        <div className="space-y-6 max-w-4xl">
          {/* Subnets List */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="text-sm font-semibold font-mono text-theme-text">
                  Local Network Subnet Authorizations
                </h3>
                <p className="text-xs text-theme-muted font-mono mt-0.5">
                  Confirm ownership to authorize passive ARP cache and reverse-DNS hostname checks.
                </p>
              </div>
              <button
                onClick={() => refetchSubnets()}
                className="p-1.5 hover:text-theme-accent transition-colors"
                title="Refresh interfaces"
              >
                <RefreshCw className="w-4 h-4 text-theme-muted" />
              </button>
            </div>

            <div className="space-y-3">
              {subnets.map((sub, i) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    sub.confirmed
                      ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-theme-bg border-theme-border text-theme-muted'
                  }`}
                >
                  <div className="space-y-1 font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-theme-text">{sub.subnet}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-theme-surface border border-theme-border text-theme-muted uppercase">
                        {sub.interface}
                      </span>
                    </div>
                    <div className="text-xs text-theme-muted flex gap-4 flex-wrap">
                      <span>Host IP: {sub.ip}</span>
                      <span>Gateway: {sub.gateway}</span>
                      <span>MAC: {sub.mac}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() =>
                        confirmSubnetMutation.mutate({
                          subnet: sub.subnet,
                          gateway_ip: sub.gateway,
                          interface_name: sub.interface,
                          confirmed: !sub.confirmed,
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-all ${
                        sub.confirmed
                          ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-400 text-black'
                      }`}
                    >
                      {sub.confirmed ? 'Revoke Authorization' : 'Authorize & Confirm'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retention & Privacy Controls */}
          <div className="bg-theme-surface border border-theme-border rounded-xl p-5 space-y-4">
            <div className="pb-3 border-b border-theme-border">
              <h3 className="text-sm font-semibold font-mono text-theme-text">
                Retention & Data Privacy Policies
              </h3>
              <p className="text-xs text-theme-muted font-mono mt-0.5">
                All network sightings and alerts are strictly stored on your local machine.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-theme-bg border border-theme-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-theme-text">
                  <Clock className="w-4 h-4 text-theme-accent" />
                  <span>90-Day Retention Prune</span>
                </div>
                <p className="text-xs text-theme-muted font-mono leading-relaxed">
                  Prunes historical sightings, alerts, and DNS logs older than 90 days while preserving
                  known device identity records.
                </p>
                <button
                  onClick={() => clearDataMutation.mutate('prune_90_days')}
                  disabled={clearDataMutation.isPending}
                  className="mt-2 px-3 py-1.5 bg-theme-surface hover:bg-theme-surface-hover text-theme-text border border-theme-border rounded text-xs font-mono transition-colors"
                >
                  Run 90-Day Prune Now
                </button>
              </div>

              <div className="p-4 rounded-lg bg-theme-bg border border-theme-border space-y-2">
                <div className="flex items-center gap-2 text-xs font-mono font-semibold text-rose-400">
                  <Trash2 className="w-4 h-4" />
                  <span>Data Wipe Controls</span>
                </div>
                <p className="text-xs text-theme-muted font-mono leading-relaxed">
                  Permanently clear device sightings, alert logs, or wipe all network intelligence.
                </p>
                <button
                  onClick={() => setShowClearModal(true)}
                  className="mt-2 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-500/40 rounded text-xs font-mono transition-colors"
                >
                  Manage Data Wipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subnet Ownership Shield Modal */}
      {showSubnetShieldModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-amber-500/50 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/40 shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-text font-mono">
                  Subnet Ownership Confirmation
                </h3>
                <p className="text-xs text-amber-400 font-mono mt-0.5 uppercase tracking-wider">
                  Mandatory Defensive Safety Gate
                </p>
              </div>
            </div>

            <div className="text-xs text-theme-muted font-mono space-y-3 leading-relaxed bg-theme-bg p-4 rounded-xl border border-theme-border">
              <p>
                Aegis is an authorized defensive security command center. It is strictly forbidden to scan,
                probe, or monitor networks or devices that you do not own or administer.
              </p>
              <p>
                By proceeding, you explicitly affirm under the application safety rules that:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-theme-text">
                <li>You own or are authorized to administer the detected local network subnet.</li>
                <li>Zero packet sniffing or ARP spoofing will be conducted.</li>
                <li>Scans are restricted to host ARP cache enumeration and local reverse DNS.</li>
              </ul>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-mono text-theme-muted">Select Target Subnet:</span>
              {subnets.map((sub, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border border-theme-border bg-theme-bg text-xs font-mono"
                >
                  <div>
                    <span className="font-bold text-theme-text">{sub.subnet}</span>
                    <span className="text-theme-muted ml-2">({sub.interface})</span>
                  </div>
                  <button
                    onClick={() =>
                      confirmSubnetMutation.mutate({
                        subnet: sub.subnet,
                        gateway_ip: sub.gateway,
                        interface_name: sub.interface,
                        confirmed: true,
                      })
                    }
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded text-xs transition-colors"
                  >
                    Confirm Ownership
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
              <button
                onClick={() => setShowSubnetShieldModal(false)}
                className="px-4 py-2 bg-theme-surface hover:bg-theme-surface-hover text-theme-text rounded-lg text-xs font-mono border border-theme-border"
              >
                Cancel / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Device Details / Sightings History Modal */}
      {selectedDevice && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="text-base font-bold text-theme-text font-mono">
                  {selectedDevice.hostname || 'Device Telemetry'}
                </h3>
                <span className="text-xs font-mono text-theme-muted">
                  MAC: {selectedDevice.mac_address} • Vendor: {selectedDevice.vendor}
                </span>
              </div>
              <button
                onClick={() => setSelectedDevice(null)}
                className="p-1 hover:text-white text-theme-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="text-theme-muted block mb-1">Friendly Hostname:</label>
                <input
                  type="text"
                  value={deviceEditHostname}
                  onChange={(e) => setDeviceEditHostname(e.target.value)}
                  placeholder="e.g. Living Room Smart TV"
                  className="w-full px-3 py-1.5 bg-theme-bg border border-theme-border rounded text-theme-text focus:border-theme-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="text-theme-muted block mb-1">Device Notes:</label>
                <textarea
                  rows={2}
                  value={deviceEditNotes}
                  onChange={(e) => setDeviceEditNotes(e.target.value)}
                  placeholder="Additional context or asset tags..."
                  className="w-full px-3 py-1.5 bg-theme-bg border border-theme-border rounded text-theme-text focus:border-theme-accent focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-theme-muted pt-2">
                <span>First Seen: {new Date(selectedDevice.first_seen).toLocaleString()}</span>
                <span>Last Seen: {new Date(selectedDevice.last_seen).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-theme-border">
              <button
                onClick={() => deleteDeviceMutation.mutate(selectedDevice.id)}
                className="px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 rounded text-xs font-mono transition-colors"
              >
                Delete Device
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDevice(null)}
                  className="px-3 py-1.5 bg-theme-surface hover:bg-theme-surface-hover text-theme-text text-xs font-mono rounded border border-theme-border"
                >
                  Cancel
                </button>
                <button
                  onClick={() =>
                    updateDeviceMutation.mutate({
                      id: selectedDevice.id,
                      data: {
                        hostname: deviceEditHostname,
                        notes: deviceEditNotes,
                      },
                    })
                  }
                  className="px-4 py-1.5 bg-theme-accent hover:bg-theme-accent-hover text-black font-semibold text-xs font-mono rounded"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DNS Import Modal */}
      {showDnsImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-theme-border rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between pb-3 border-b border-theme-border">
              <div>
                <h3 className="text-base font-bold text-theme-text font-mono">
                  Import Pi-hole / Router DNS Logs
                </h3>
                <p className="text-xs text-theme-muted font-mono mt-0.5">
                  Paste JSON queries export or standard CSV log lines.
                </p>
              </div>
              <button onClick={() => setShowDnsImportModal(false)} className="text-theme-muted hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2 font-mono text-xs">
              <button
                onClick={() => setDnsImportType('json')}
                className={`px-3 py-1 rounded transition-colors ${
                  dnsImportType === 'json'
                    ? 'bg-theme-accent text-black font-bold'
                    : 'bg-theme-bg text-theme-muted border border-theme-border'
                }`}
              >
                JSON Array
              </button>
              <button
                onClick={() => setDnsImportType('csv')}
                className={`px-3 py-1 rounded transition-colors ${
                  dnsImportType === 'csv'
                    ? 'bg-theme-accent text-black font-bold'
                    : 'bg-theme-bg text-theme-muted border border-theme-border'
                }`}
              >
                CSV Lines
              </button>
            </div>

            <textarea
              rows={8}
              value={dnsImportText}
              onChange={(e) => setDnsImportText(e.target.value)}
              placeholder={
                dnsImportType === 'json'
                  ? '[\n  {\n    "domain": "tracker.example.com",\n    "client_ip": "192.168.1.15",\n    "query_type": "A",\n    "response": "0.0.0.0"\n  }\n]'
                  : 'domain,client_ip,query_type,response\ngoogle.com,192.168.1.5,A,142.250.190.46\npi.hole,192.168.1.1,A,192.168.1.2'
              }
              className="w-full p-3 bg-theme-bg border border-theme-border rounded-lg text-xs font-mono text-theme-text focus:border-theme-accent focus:outline-none"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-theme-border">
              <button
                onClick={() => setShowDnsImportModal(false)}
                className="px-3 py-1.5 bg-theme-surface text-theme-text text-xs font-mono rounded border border-theme-border"
              >
                Cancel
              </button>
              <button
                onClick={() => importDnsMutation.mutate()}
                disabled={!dnsImportText.trim() || importDnsMutation.isPending}
                className="px-4 py-1.5 bg-theme-accent hover:bg-theme-accent-hover text-black font-semibold text-xs font-mono rounded disabled:opacity-50"
              >
                {importDnsMutation.isPending ? 'Importing...' : 'Start Import'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear / Wipe Modal */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-theme-surface border border-rose-500/50 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-theme-text font-mono">
                  Wipe Network Data
                </h3>
                <p className="text-xs text-rose-400 font-mono mt-0.5">
                  Destructive action • Cannot be undone
                </p>
              </div>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <span className="text-theme-muted block">Select Target Scope:</span>
              {[
                { key: 'prune_90_days', label: 'Prune records older than 90 days' },
                { key: 'devices', label: 'Wipe all devices inventory' },
                { key: 'alerts', label: 'Wipe all network alert logs' },
                { key: 'dns', label: 'Wipe all DNS queries' },
                { key: 'all', label: 'Wipe EVERYTHING (all network data)' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer ${
                    clearScope === opt.key
                      ? 'bg-rose-950/20 border-rose-500 text-rose-300'
                      : 'bg-theme-bg border-theme-border text-theme-muted'
                  }`}
                >
                  <input
                    type="radio"
                    name="clearScope"
                    value={opt.key}
                    checked={clearScope === opt.key}
                    onChange={() => setClearScope(opt.key as any)}
                    className="text-rose-500"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-theme-border">
              <button
                onClick={() => setShowClearModal(false)}
                className="px-3 py-1.5 bg-theme-surface text-theme-text text-xs font-mono rounded border border-theme-border"
              >
                Cancel
              </button>
              <button
                onClick={() => clearDataMutation.mutate(clearScope)}
                disabled={clearDataMutation.isPending}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs font-mono rounded"
              >
                {clearDataMutation.isPending ? 'Wiping...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

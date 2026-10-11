import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Mail,
  Search,
  RefreshCw,
  Lock,
  Globe,
  Apple,
} from 'lucide-react';
import { api } from '../api/client';
import { PlatformUser } from '../api/types';
import { useAuth } from '../context/AuthContext';

export const UsersDirectoryView: React.FC = () => {
  const { isSuperuser, currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterRole, setFilterRole] = useState<string>('all');

  const {
    data: directoryData,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['users-directory'],
    queryFn: () => api.getUsersDirectory(),
    enabled: isSuperuser,
    refetchInterval: 10000,
  });

  if (!isSuperuser) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-cockpit-base font-sans">
        <div className="p-4 rounded-full bg-severity-high/10 border border-severity-high text-severity-high mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="font-mono text-base font-bold uppercase text-cockpit-text mb-2">
          SUPERUSER CLEARANCE REQUIRED
        </h2>
        <p className="font-mono text-xs text-cockpit-muted max-w-md mb-4">
          Access to the dynamic platform identity directory is strictly restricted to authorized platform administrators (
          <code className="text-cockpit-accent">ujwalsingh12</code>,{' '}
          <code className="text-cockpit-accent">ujwalsingh123</code>).
        </p>
        <div className="px-3 py-1.5 rounded bg-cockpit-surface border border-cockpit-border font-mono text-xs text-cockpit-muted">
          Your Account Role: <span className="text-severity-low font-bold">{currentUser?.role || 'STANDARD_USER'}</span>
        </div>
      </div>
    );
  }

  const users: PlatformUser[] = directoryData?.users || [];

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProvider =
      filterProvider === 'all' || u.auth_provider === filterProvider;

    const matchesRole =
      filterRole === 'all' ||
      (filterRole === 'superuser' && u.is_superuser) ||
      (filterRole === 'standard' && !u.is_superuser);

    return matchesSearch && matchesProvider && matchesRole;
  });

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return <Globe className="w-4 h-4 text-[#4285F4]" />;
      case 'apple':
        return <Apple className="w-4 h-4 text-white" />;
      case 'email':
        return <Mail className="w-4 h-4 text-severity-info" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-cockpit-accent" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-cockpit-base font-sans select-none">
      {/* Top Header */}
      <header className="h-14 border-b border-cockpit-border bg-cockpit-surface px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/30 text-cockpit-accent">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-mono text-xs font-bold tracking-wide uppercase text-cockpit-text">
              PLATFORM IDENTITY & USER DIRECTORY
            </h2>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] text-cockpit-accent font-semibold">
                SUPERUSER CLEARANCE LEVEL 4
              </span>
              <span className="text-cockpit-border">|</span>
              <span className="font-mono text-[10px] text-cockpit-muted">
                {directoryData?.total_users ?? 0} PERSONS REGISTERED
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          className="p-2 rounded text-cockpit-muted hover:text-cockpit-text hover:bg-cockpit-elevated transition-colors"
          title="Refresh User Directory"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded bg-cockpit-surface border border-cockpit-border">
            <span className="block font-mono text-[10px] text-cockpit-muted uppercase">TOTAL USERS</span>
            <span className="font-mono text-xl font-bold text-cockpit-text">
              {directoryData?.total_users ?? 0}
            </span>
          </div>
          <div className="p-3 rounded bg-cockpit-surface border border-cockpit-border">
            <span className="block font-mono text-[10px] text-cockpit-accent uppercase">SUPERUSER ADMINS</span>
            <span className="font-mono text-xl font-bold text-cockpit-accent">
              {directoryData?.superusers_count ?? 0}
            </span>
          </div>
          <div className="p-3 rounded bg-cockpit-surface border border-cockpit-border">
            <span className="block font-mono text-[10px] text-severity-low uppercase">STANDARD USERS</span>
            <span className="font-mono text-xl font-bold text-severity-low">
              {directoryData?.standard_users_count ?? 0}
            </span>
          </div>
          <div className="p-3 rounded bg-cockpit-surface border border-cockpit-border">
            <span className="block font-mono text-[10px] text-[#4285F4] uppercase">GOOGLE / APPLE ID</span>
            <span className="font-mono text-xl font-bold text-cockpit-text">
              {(directoryData?.providers_breakdown?.google ?? 0) + (directoryData?.providers_breakdown?.apple ?? 0)}
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {isError && (
          <div className="p-3 rounded bg-severity-high/10 border border-severity-high flex items-center gap-2 text-xs font-mono text-severity-high">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Failed to fetch user directory. Verify superuser clearance and network connectivity.</span>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-cockpit-surface p-3 rounded border border-cockpit-border">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-cockpit-muted absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by username, email, or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded bg-cockpit-base border border-cockpit-border font-mono text-xs text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
            />
          </div>

          {/* Filters: Provider & Role */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="font-mono text-[11px] text-cockpit-muted uppercase whitespace-nowrap">Auth:</span>
              {['all', 'google', 'apple', 'email', 'local'].map((prov) => (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setFilterProvider(prov)}
                  className={`px-2 py-1 rounded text-xs font-mono uppercase transition-colors whitespace-nowrap ${
                    filterProvider === prov
                      ? 'bg-cockpit-accent text-black font-bold'
                      : 'bg-cockpit-elevated border border-cockpit-border text-cockpit-muted hover:text-cockpit-text'
                  }`}
                >
                  {prov}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto ml-1">
              <span className="font-mono text-[11px] text-cockpit-muted uppercase whitespace-nowrap">Role:</span>
              {[
                { id: 'all', label: 'ALL' },
                { id: 'superuser', label: 'ADMIN' },
                { id: 'standard', label: 'USER' },
              ].map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setFilterRole(role.id)}
                  className={`px-2 py-1 rounded text-xs font-mono uppercase transition-colors whitespace-nowrap ${
                    filterRole === role.id
                      ? 'bg-cockpit-accent text-black font-bold'
                      : 'bg-cockpit-elevated border border-cockpit-border text-cockpit-muted hover:text-cockpit-text'
                  }`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="rounded border border-cockpit-border bg-cockpit-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-cockpit-base/80 border-b border-cockpit-border text-cockpit-muted uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Identity / Person</th>
                  <th className="py-2.5 px-3">Email Address</th>
                  <th className="py-2.5 px-3">Auth Source</th>
                  <th className="py-2.5 px-3">Platform Role</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Registered Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cockpit-border/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-cockpit-muted">
                      No matching registered users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-cockpit-elevated/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded bg-cockpit-elevated border border-cockpit-border">
                            {getProviderIcon(u.auth_provider)}
                          </div>
                          <div>
                            <span className="font-bold text-cockpit-text block">
                              {u.username}
                            </span>
                            {u.full_name && u.full_name !== u.username && (
                              <span className="text-[10px] text-cockpit-muted block">
                                {u.full_name}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-cockpit-text">
                        {u.email}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] bg-cockpit-base border border-cockpit-border text-cockpit-muted">
                          {getProviderIcon(u.auth_provider)}
                          <span>{u.provider_display}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        {u.is_superuser ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-cockpit-accent/15 border border-cockpit-accent text-cockpit-accent">
                            <ShieldCheck className="w-3 h-3" />
                            SUPERUSER_ADMIN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-severity-low/10 border border-severity-low/30 text-severity-low">
                            <UserCheck className="w-3 h-3" />
                            STANDARD_USER
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="inline-flex items-center gap-1.5 text-[11px]">
                          <span className={`w-2 h-2 rounded-full ${u.is_active ? 'bg-severity-low shadow-glow' : 'bg-severity-high'}`} />
                          <span className={u.is_active ? 'text-cockpit-text' : 'text-severity-high'}>
                            {u.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-[11px] text-cockpit-muted">
                        {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Security Disclosure */}
        <div className="p-3 rounded bg-cockpit-surface border border-cockpit-border flex items-start gap-2 text-xs font-mono text-cockpit-muted">
          <Lock className="w-4 h-4 text-cockpit-accent shrink-0 mt-0.5" />
          <span>
            <strong>AIR-GAPPED IDENTITY ENFORCEMENT:</strong> Only platform superusers (<code>ujwalsingh12</code>, <code>ujwalsingh123</code>, <code>admin</code>) have authorization to inspect user registrations across Email, Google Sign-In, and Apple ID. Standard users operate within isolated, scoped boundaries.
          </span>
        </div>
      </div>
    </div>
  );
};

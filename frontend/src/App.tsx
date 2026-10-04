import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { AlertCircle, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { VoiceProvider, useVoice } from './context/VoiceContext';
import { api } from './api/client';
import { Sidebar, ActiveView } from './components/Sidebar';
import { StatusBar } from './components/StatusBar';
import { TacticalPanel } from './components/TacticalPanel';
import { CommandPalette } from './components/CommandPalette';
import { ShortcutsModal } from './components/ShortcutsModal';
import { LoginView } from './views/LoginView';
import { AssistantView } from './views/AssistantView';
import { AuditView } from './views/AuditView';
import { SettingsView } from './views/SettingsView';
import { DailyView } from './views/DailyView';
import { SecurityView } from './views/SecurityView';
import { NetworkView } from './views/NetworkView';
import { MemoryView } from './views/MemoryView';
import { MobileHeader } from './components/MobileHeader';
import { MobileNavBar } from './components/MobileNavBar';
import { MobileNavDrawer } from './components/MobileNavDrawer';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <VoiceProvider>
            <CockpitRoot />
          </VoiceProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

const CockpitRoot: React.FC = () => {
  const { isAuthenticated, rateLimitWarning, clearRateLimit } = useAuth();
  const { micState, globalMicOff } = useVoice();
  const [activeView, setActiveView] = useState<ActiveView>('assistant');
  const [tacticalOpen, setTacticalOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined);

  // Poll backend health & status every 10 seconds
  const { data: healthData, isError: healthError } = useQuery({
    queryKey: ['backend-health'],
    queryFn: () => api.checkHealth(),
    refetchInterval: 10000,
  });

  const { data: statusData, refetch: refetchStatus } = useQuery({
    queryKey: ['assistant-status'],
    queryFn: () => api.getStatus(),
    enabled: isAuthenticated,
    refetchInterval: 8000,
  });

  // Query pending approvals for current user
  const { data: pendingApprovals = [], refetch: refetchApprovals } = useQuery({
    queryKey: ['pending-approvals'],
    queryFn: () => api.getPendingApprovals('pending'),
    enabled: isAuthenticated,
    refetchInterval: 5000,
  });

  // Query recent audit logs
  const { data: auditLogs = [], refetch: refetchAudit } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => api.getAuditLogs(),
    enabled: isAuthenticated,
    refetchInterval: 8000,
  });

  // Query security summary for open alerts count
  const { data: secSummary, refetch: refetchSummary } = useQuery({
    queryKey: ['security-summary'],
    queryFn: () => api.getSecuritySummary(),
    enabled: isAuthenticated,
    refetchInterval: 10000,
  });

  const refreshAll = () => {
    refetchStatus();
    refetchApprovals();
    refetchAudit();
    refetchSummary();
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea (except Ctrl+K / Ctrl+/)
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      } else if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        setTacticalOpen((prev) => !prev);
      } else if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (commandPaletteOpen) setCommandPaletteOpen(false);
        if (shortcutsOpen) setShortcutsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commandPaletteOpen, shortcutsOpen]);

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const isBackendOnline = !healthError && healthData?.status === 'ok';

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-cockpit-base text-cockpit-text font-sans">
      {/* Mobile Top App Header */}
      <MobileHeader
        activeView={activeView}
        isBackendOnline={isBackendOnline}
        pendingApprovalsCount={pendingApprovals.length}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
        onToggleTactical={() => setTacticalOpen((prev) => !prev)}
      />

      {/* Rate Limit Warning Banner */}
      {rateLimitWarning && (
        <div
          role="alert"
          className="bg-severity-med/20 border-b border-severity-med px-4 py-2 text-xs font-mono text-severity-med flex items-center justify-between z-30"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>RATE LIMIT ENGAGED (HTTP 429):</strong> {rateLimitWarning}
            </span>
          </div>
          <button
            type="button"
            onClick={clearRateLimit}
            aria-label="Dismiss Rate Limit Warning"
            className="p-1 hover:text-cockpit-text"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Cockpit Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail Sidebar (Desktop) */}
        <Sidebar
          activeView={activeView}
          onSelectView={setActiveView}
          pendingApprovalsCount={pendingApprovals.length}
        />

        {/* Center Main Stage */}
        <main role="main" className="flex-1 flex flex-col overflow-hidden relative pb-14 md:pb-0">
          {activeView === 'assistant' && (
            <AssistantView
              initialPrompt={pendingPrompt}
              onClearInitialPrompt={() => setPendingPrompt(undefined)}
              onRefreshData={refreshAll}
              onNavigate={(view) => setActiveView(view)}
            />
          )}

          {activeView === 'audit' && <AuditView />}

          {activeView === 'settings' && <SettingsView />}

          {activeView === 'daily' && <DailyView />}

          {activeView === 'security' && <SecurityView />}

          {activeView === 'network' && <NetworkView />}

          {activeView === 'memory' && <MemoryView />}
        </main>

        {/* Right Tactical Drawer */}
        <TacticalPanel
          isOpen={tacticalOpen}
          onClose={() => setTacticalOpen(false)}
          pendingApprovals={pendingApprovals}
          auditLogs={auditLogs}
          onRefresh={refreshAll}
          onApprovalResolved={refreshAll}
        />
      </div>

      {/* Persistent Bottom Status Bar (Desktop) */}
      <StatusBar
        isBackendOnline={isBackendOnline}
        statusData={statusData}
        pendingApprovalsCount={pendingApprovals.length}
        openAlertsCount={secSummary?.open_incidents ?? 0}
        micState={micState}
        onMicOff={globalMicOff}
        onToggleTacticalPanel={() => setTacticalOpen((prev) => !prev)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      {/* Mobile Bottom Navigation Bar (Phones) */}
      <MobileNavBar
        activeView={activeView}
        onSelectView={setActiveView}
        onOpenDrawer={() => setMobileDrawerOpen(true)}
        pendingApprovalsCount={pendingApprovals.length}
      />

      {/* Mobile Slide-Out Navigation Drawer */}
      <MobileNavDrawer
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeView={activeView}
        onSelectView={setActiveView}
        pendingApprovalsCount={pendingApprovals.length}
      />

      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={(view) => setActiveView(view as ActiveView)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        onSendSystemQuery={(query) => {
          setActiveView('assistant');
          setPendingPrompt(query);
        }}
      />

      {/* Shortcuts Cheat Sheet Modal (?) */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />
    </div>
  );
};

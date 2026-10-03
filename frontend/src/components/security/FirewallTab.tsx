import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock,
  Unlock,
  Shield,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Info,
} from 'lucide-react';
import { api } from '../../api/client';
import { ApprovalCard } from '../ApprovalCard';

interface FirewallTabProps {
  onApprovalResolved?: () => void;
}

export const FirewallTab: React.FC<FirewallTabProps> = ({ onApprovalResolved }) => {
  const queryClient = useQueryClient();
  const [manualIp, setManualIp] = useState<string>('');
  const [manualReason, setManualReason] = useState<string>('');
  const [copiedRuleId, setCopiedRuleId] = useState<number | null>(null);

  // Active pending approval state for Level 4 block IP action
  const [activeApproval, setActiveApproval] = useState<{
    id: string;
    tool_name: string;
    args: Record<string, unknown>;
    expires_at: string;
    title: string;
    description: string;
  } | null>(null);

  // Query active firewall rules
  const { data: rules = [], isLoading, refetch } = useQuery({
    queryKey: ['firewall-rules'],
    queryFn: () => api.getFirewallRules('active'),
  });

  // Rollback mutation
  const rollbackMutation = useMutation({
    mutationFn: (ruleId: number) => api.rollbackFirewallRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firewall-rules'] });
    },
  });

  // Block IP mutation (Level 4 response action)
  const blockIpMutation = useMutation({
    mutationFn: ({ ip, reason }: { ip: string; reason?: string }) =>
      api.blockIp(ip, 'inbound', reason),
    onSuccess: (res, vars) => {
      if (res.status === 'needs_approval' && res.pending_action_id) {
        setActiveApproval({
          id: res.pending_action_id,
          tool_name: 'security_block_ip',
          args: { ip_address: vars.ip, direction: 'inbound', reason: vars.reason },
          expires_at: res.pending_expires_at || new Date(Date.now() + 300000).toISOString(),
          title: `Block Remote IP (${vars.ip})`,
          description: `Level 4 Response: Add host firewall inbound block rule for ${vars.ip}.`,
        });
      } else {
        setManualIp('');
        setManualReason('');
        refetch();
      }
    },
  });

  const handleCopyRollback = (ruleId: number, cmd: string) => {
    navigator.clipboard.writeText(cmd);
    setCopiedRuleId(ruleId);
    setTimeout(() => setCopiedRuleId(null), 2000);
  };

  const handleManualBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    blockIpMutation.mutate({
      ip: manualIp.trim(),
      reason: manualReason.trim() || 'Manual defensive firewall block',
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview & Defensive Boundaries Banner */}
      <div className="p-4 bg-cockpit-panel border border-cockpit-border rounded-lg space-y-2">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cockpit-accent" />
          <span className="text-xs font-mono font-bold text-cockpit-text uppercase tracking-wider">
            Defensive Host Firewall Manager
          </span>
        </div>
        <p className="text-xs text-cockpit-muted">
          Active network protection rules configured via the Aegis defensive response engine. Rules target malicious
          or brute-forcing remote IP addresses on your host machine. Critical addresses (loopback <code className="text-cockpit-text">127.0.0.1</code> and private gateways) are permanently protected against lockout.
        </p>
      </div>

      {/* Manual Block IP Form with Level 4 Approval Gate */}
      <div className="p-4 bg-cockpit-panel border border-cockpit-border rounded-lg space-y-3">
        <div className="text-xs font-mono font-bold text-cockpit-text uppercase flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-cockpit-accent" /> Add Host Firewall Inbound Block Rule
        </div>

        <form onSubmit={handleManualBlock} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-mono text-cockpit-muted mb-1">
                Remote IP Address (IPv4 or IPv6) *
              </label>
              <input
                type="text"
                placeholder="e.g. 198.51.100.25"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                className="w-full px-3 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs font-mono text-cockpit-text focus:outline-none focus:border-cockpit-accent"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-cockpit-muted mb-1">
                Justification / Reason (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Repeated SSH port knock attempt"
                value={manualReason}
                onChange={(e) => setManualReason(e.target.value)}
                className="w-full px-3 py-1.5 bg-cockpit-base border border-cockpit-border rounded text-xs font-mono text-cockpit-text focus:outline-none focus:border-cockpit-accent"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="text-[11px] font-mono text-cockpit-muted flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>Requires Risk Level 4 Single-Use Approval Card confirmation</span>
            </div>

            <button
              type="submit"
              disabled={!manualIp.trim() || blockIpMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-cockpit-accent hover:bg-cockpit-accent/90 text-cockpit-base text-xs font-mono font-bold rounded transition-colors disabled:opacity-50"
            >
              <Lock className="w-3.5 h-3.5" />
              {blockIpMutation.isPending ? 'REQUESTING APPROVAL...' : 'BLOCK INBOUND IP'}
            </button>
          </div>
        </form>

        {/* Inline Level 4 Approval Card */}
        {activeApproval && (
          <div className="pt-2">
            <ApprovalCard
              actionId={activeApproval.id}
              toolName={activeApproval.tool_name}
              riskLevel={4}
              expiresAt={activeApproval.expires_at}
              onResolved={() => {
                setActiveApproval(null);
                setManualIp('');
                setManualReason('');
                refetch();
                onApprovalResolved?.();
              }}
            />
          </div>
        )}
      </div>

      {/* Active Firewall Rules Table */}
      <div className="border border-cockpit-border rounded-lg bg-cockpit-panel overflow-hidden">
        <div className="px-4 py-3 bg-cockpit-base border-b border-cockpit-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-cockpit-accent" />
            <span className="text-xs font-mono font-bold text-cockpit-text uppercase tracking-wider">
              Active Host Block Rules ({rules.length})
            </span>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            className="p-1 text-cockpit-muted hover:text-cockpit-text transition-colors"
            title="Refresh rules"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-cockpit-muted">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-cockpit-accent" />
            Loading active firewall rules...
          </div>
        ) : rules.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-cockpit-muted space-y-1">
            <Shield className="w-7 h-7 text-cockpit-muted mx-auto opacity-50 mb-1" />
            <div className="font-semibold text-cockpit-text">No active IP block rules configured</div>
            <p className="text-cockpit-muted">
              Inbound block rules created during incident triage will be catalogued here with full rollback commands.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-cockpit-base text-cockpit-muted border-b border-cockpit-border">
                <tr>
                  <th className="px-4 py-2.5 font-medium">RULE NAME</th>
                  <th className="px-4 py-2.5 font-medium">REMOTE IP</th>
                  <th className="px-4 py-2.5 font-medium">DIRECTION</th>
                  <th className="px-4 py-2.5 font-medium">ACTION</th>
                  <th className="px-4 py-2.5 font-medium">CREATED</th>
                  <th className="px-4 py-2.5 font-medium text-right">ROLLBACK & ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cockpit-border/40">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-cockpit-base/40 transition-colors">
                    <td className="px-4 py-3 text-cockpit-text font-bold flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      {r.rule_name}
                    </td>
                    <td className="px-4 py-3 text-cockpit-accent font-bold">{r.ip_address}</td>
                    <td className="px-4 py-3 text-cockpit-muted uppercase">{r.direction}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-severity-high/20 text-severity-high border border-severity-high/30">
                        {r.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-cockpit-muted">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.rollback_cmd && (
                        <button
                          type="button"
                          onClick={() => handleCopyRollback(r.id, r.rollback_cmd)}
                          className="px-2 py-1 bg-cockpit-base hover:bg-cockpit-border text-cockpit-muted hover:text-cockpit-text rounded border border-cockpit-border transition-colors text-[11px] inline-flex items-center gap-1"
                          title="Copy rollback command"
                        >
                          {copiedRuleId === r.id ? <Check className="w-3 h-3 text-severity-low" /> : <Copy className="w-3 h-3" />}
                          Rollback Cmd
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => rollbackMutation.mutate(r.id)}
                        disabled={rollbackMutation.isPending}
                        className="px-2 py-1 bg-red-950/20 hover:bg-red-950/40 text-severity-high rounded border border-severity-high/30 transition-colors text-[11px] inline-flex items-center gap-1"
                      >
                        <Unlock className="w-3 h-3" />
                        Remove Block
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

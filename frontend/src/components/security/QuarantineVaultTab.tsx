import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Lock,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Check,
  Copy,
  Archive,
} from 'lucide-react';
import { api } from '../../api/client';

export const QuarantineVaultTab: React.FC = () => {
  const queryClient = useQueryClient();
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [activeApproval, setActiveApproval] = useState<{
    actionId: string;
    title: string;
    description: string;
    expiresAt: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Fetch quarantine items
  const { data: items = [], isLoading, refetch } = useQuery({
    queryKey: ['security-quarantine'],
    queryFn: () => api.getQuarantineItems(),
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (id: number) => api.restoreQuarantinedFile(id),
    onSuccess: (res) => {
      if (res.status === 'needs_approval' && res.pending_action_id) {
        setActiveApproval({
          actionId: res.pending_action_id,
          title: 'Approve File Restoration',
          description:
            'Restoring a file moves it from isolated quarantine back to its original filesystem location and restores standard user permissions. This action requires explicit approval.',
          expiresAt: res.pending_expires_at || '',
        });
      } else if (res.status === 'executed') {
        setActionFeedback('File successfully restored to original location.');
        refetch();
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteQuarantinedFile(id),
    onSuccess: (res) => {
      if (res.status === 'needs_approval' && res.pending_action_id) {
        setActiveApproval({
          actionId: res.pending_action_id,
          title: 'Approve Permanent File Deletion',
          description:
            'Permanent deletion physically removes the quarantined file from disk. This cannot be undone. This action requires explicit approval.',
          expiresAt: res.pending_expires_at || '',
        });
      } else if (res.status === 'executed') {
        setActionFeedback('File permanently deleted from quarantine vault.');
        refetch();
      }
    },
  });

  // Confirm approval mutation
  const confirmMutation = useMutation({
    mutationFn: (args: { actionId: string; decision: 'approve' | 'deny' }) =>
      api.confirm({ action_id: args.actionId, decision: args.decision }),
    onSuccess: (_res, variables) => {
      if (variables.decision === 'approve') {
        setActionFeedback('Approval verified: Requested quarantine operation executed successfully.');
      } else {
        setActionFeedback('Action denied by user.');
      }
      setActiveApproval(null);
      refetch();
      queryClient.invalidateQueries({ queryKey: ['security-findings'] });
    },
  });

  const copyToClipboard = (text: string, id: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
    setCopiedHash(id);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Vault Info Banner */}
      <div className="border border-brand-high/30 bg-brand-high/5 p-4 rounded-md">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-brand-high mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <div className="font-mono font-semibold text-brand-high uppercase tracking-wider">
              Isolated Quarantine Storage Vault
            </div>
            <p className="text-brand-muted">
              Quarantined files are moved out of original paths and isolated in storage with read-only permissions
              (chmod 0400). Execution rights are stripped. All quarantine, restoration, and deletion operations are
              Risk Level 4 sensitive actions that require cryptographic single-use approval.
            </p>
          </div>
        </div>
      </div>

      {/* Action Notification */}
      {actionFeedback && (
        <div className="p-3 bg-brand-accent/10 border border-brand-accent/30 rounded text-xs text-brand-accent font-mono flex items-center justify-between">
          <span>{actionFeedback}</span>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-brand-muted hover:text-brand-text text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inline Approval Confirmation Card */}
      {activeApproval && (
        <div className="p-4 bg-brand-surface border-2 border-brand-high rounded-md space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-high shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-brand-high uppercase tracking-wider">
                {activeApproval.title} (Risk Level 4)
              </div>
              <p className="text-xs text-brand-text">{activeApproval.description}</p>
              <div className="text-[10px] font-mono text-brand-muted">
                Action ID: {activeApproval.actionId} | Expires: {activeApproval.expiresAt || 'in 5 minutes'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() =>
                confirmMutation.mutate({
                  actionId: activeApproval.actionId,
                  decision: 'deny',
                })
              }
              disabled={confirmMutation.isPending}
              className="px-3 py-1 text-xs font-mono border border-brand-border text-brand-muted hover:text-brand-text rounded"
            >
              Deny
            </button>
            <button
              onClick={() =>
                confirmMutation.mutate({
                  actionId: activeApproval.actionId,
                  decision: 'approve',
                })
              }
              disabled={confirmMutation.isPending}
              className="px-4 py-1 text-xs font-mono font-semibold bg-brand-high text-brand-bg rounded hover:bg-brand-high/90 flex items-center gap-1.5"
            >
              {confirmMutation.isPending ? 'Verifying...' : 'Approve Action'}
            </button>
          </div>
        </div>
      )}

      {/* Quarantined Items List */}
      <div className="bg-brand-surface border border-brand-border rounded-md overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-wider text-brand-text flex items-center gap-2">
            <Archive className="w-4 h-4 text-brand-accent" />
            <span>Vault Items ({items.length})</span>
          </div>
          <button
            onClick={() => refetch()}
            className="text-xs font-mono text-brand-muted hover:text-brand-accent flex items-center gap-1"
          >
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-xs font-mono text-brand-muted">Loading quarantine vault...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-brand-muted space-y-1">
            <div>Quarantine vault is empty.</div>
            <div className="text-[10px] text-brand-muted/70">
              Suspicious files quarantined from the Threat Scanner will appear here.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-[10px] text-left bg-brand-bg/50">
                  <th className="p-3">Original Path</th>
                  <th className="p-3">Isolated Name</th>
                  <th className="p-3">SHA-256</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Quarantined At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-brand-accent/5 transition-colors">
                    <td className="p-3 text-brand-text font-semibold max-w-[200px] truncate" title={item.original_path}>
                      {item.original_path}
                    </td>
                    <td className="p-3 text-brand-muted max-w-[180px] truncate" title={item.quarantine_filename}>
                      {item.quarantine_filename}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-brand-text text-[11px] font-mono">
                          {item.sha256.substring(0, 10)}...
                        </span>
                        <button
                          onClick={() => copyToClipboard(item.sha256, String(item.id))}
                          className="text-brand-muted hover:text-brand-text"
                          title="Copy SHA-256"
                        >
                          {copiedHash === String(item.id) ? (
                            <Check className="w-3 h-3 text-brand-accent" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-brand-muted">{formatFileSize(item.file_size)}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          item.status === 'quarantined'
                            ? 'bg-brand-high/20 text-brand-high'
                            : item.status === 'restored'
                            ? 'bg-brand-accent/20 text-brand-accent'
                            : 'bg-brand-border text-brand-muted'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="p-3 text-brand-muted text-[11px]">
                      {new Date(item.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      {item.status === 'quarantined' && (
                        <>
                          <button
                            onClick={() => restoreMutation.mutate(item.id)}
                            disabled={restoreMutation.isPending}
                            className="px-2 py-1 text-xs border border-brand-accent/40 text-brand-accent hover:bg-brand-accent/10 rounded transition-colors inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Restore</span>
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(item.id)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 text-xs border border-brand-critical/40 text-brand-critical hover:bg-brand-critical/10 rounded transition-colors inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </>
                      )}
                      {item.status === 'restored' && (
                        <span className="text-[10px] text-brand-muted">Restored to disk</span>
                      )}
                      {item.status === 'deleted' && (
                        <span className="text-[10px] text-brand-muted">Purged permanently</span>
                      )}
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

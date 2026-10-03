import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Upload,
  FileCode,
  Copy,
  Check,
  Clock,
  Lock,
  Search,
  Info,
} from 'lucide-react';
import { api } from '../../api/client';
import { ScanFindingItem, HashLookupResponse } from '../../api/types';

const EICAR_SAMPLE_TEXT = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

export const FileScannerTab: React.FC = () => {
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [manualPath, setManualPath] = useState('');
  const [activeFinding, setActiveFinding] = useState<ScanFindingItem | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [quarantineApproval, setQuarantineApproval] = useState<{
    actionId: string;
    path: string;
    expiresAt: string;
  } | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Hash lookup state
  const [lookupHashInput, setLookupHashInput] = useState('');
  const [hashLookupResult, setHashLookupResult] = useState<HashLookupResponse | null>(null);

  // Fetch past findings
  const { data: findings = [], isLoading: findingsLoading, refetch: refetchFindings } = useQuery({
    queryKey: ['security-findings'],
    queryFn: () => api.getScanFindings(),
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: (args: { file?: File; path?: string }) => api.scanFile(args),
    onSuccess: (data) => {
      setActiveFinding(data);
      refetchFindings();
      setActionFeedback(null);
      setQuarantineApproval(null);
    },
  });

  // Quarantine mutation
  const quarantineMutation = useMutation({
    mutationFn: (path: string) => api.quarantineFile(path),
    onSuccess: (res, path) => {
      if (res.status === 'needs_approval' && res.pending_action_id) {
        setQuarantineApproval({
          actionId: res.pending_action_id,
          path,
          expiresAt: res.pending_expires_at || '',
        });
      } else if (res.status === 'executed') {
        setActionFeedback('File successfully quarantined into isolated storage.');
        queryClient.invalidateQueries({ queryKey: ['security-quarantine'] });
        refetchFindings();
      }
    },
  });

  // Confirm approval mutation
  const confirmMutation = useMutation({
    mutationFn: (args: { actionId: string; decision: 'approve' | 'deny' }) =>
      api.confirm({ action_id: args.actionId, decision: args.decision }),
    onSuccess: (_res, variables) => {
      if (variables.decision === 'approve') {
        setActionFeedback('Approval granted: File moved into quarantine vault.');
      } else {
        setActionFeedback('Quarantine request was denied.');
      }
      setQuarantineApproval(null);
      queryClient.invalidateQueries({ queryKey: ['security-quarantine'] });
      refetchFindings();
    },
  });

  // Hash lookup mutation
  const lookupMutation = useMutation({
    mutationFn: (hash: string) => api.lookupHash(hash),
    onSuccess: (data) => {
      setHashLookupResult(data);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setManualPath('');
    }
  };

  const loadEicarSample = () => {
    const file = new File([EICAR_SAMPLE_TEXT], 'eicar_antivirus_test_sample.com', {
      type: 'application/octet-stream',
    });
    setSelectedFile(file);
    setManualPath('');
  };

  const handleScanSubmit = (e?: React.SyntheticEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (selectedFile) {
      scanMutation.mutate({ file: selectedFile });
    } else if (manualPath.trim()) {
      scanMutation.mutate({ path: manualPath.trim() });
    }
  };

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
      {/* Defensive Boundary & Scope Disclosure */}
      <div className="border border-brand-accent/20 bg-brand-accent/5 p-4 rounded-md">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-brand-accent mt-0.5 shrink-0" />
          <div className="text-xs space-y-1">
            <div className="font-mono font-semibold text-brand-accent uppercase tracking-wider">
              Defensive Static Threat Scanner
            </div>
            <p className="text-brand-muted">
              Static analysis only: aegis inspects binary PE structures, Shannon entropy, macro signatures, and script
              heuristics without executing files. Scans occur strictly on files you explicitly select or confirm. Silent
              disk crawling is strictly prohibited.
            </p>
          </div>
        </div>
      </div>

      {/* Target Selector & Quick Actions */}
      <div className="bg-brand-surface border border-brand-border p-5 rounded-md space-y-4">
        <div className="flex items-center justify-between border-b border-brand-border pb-3">
          <div className="font-mono text-xs uppercase tracking-wider text-brand-text flex items-center gap-2">
            <Upload className="w-4 h-4 text-brand-accent" />
            <span>Select Target File</span>
          </div>
          <button
            type="button"
            onClick={loadEicarSample}
            className="text-xs font-mono bg-brand-accent/10 border border-brand-accent/30 text-brand-accent px-3 py-1 rounded hover:bg-brand-accent/20 transition-colors flex items-center gap-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Load Harmless EICAR Sample</span>
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* File Upload Box */}
            <div className="border border-dashed border-brand-border hover:border-brand-accent/60 transition-colors p-4 rounded-md text-center bg-brand-bg/50">
              <input
                type="file"
                id="file-upload"
                onChange={handleFileChange}
                className="hidden"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center justify-center space-y-2 py-3"
              >
                <Upload className="w-6 h-6 text-brand-muted group-hover:text-brand-accent" />
                <span className="text-xs font-mono text-brand-text">
                  {selectedFile ? selectedFile.name : 'Click to select a local file to upload'}
                </span>
                <span className="text-[10px] text-brand-muted">
                  {selectedFile ? formatFileSize(selectedFile.size) : 'Executable, script, document, or zip archive'}
                </span>
              </label>
            </div>

            {/* Local Path Input */}
            <div className="flex flex-col justify-center space-y-2 p-4 border border-brand-border rounded-md bg-brand-bg/50">
              <label htmlFor="local-path-input" className="text-xs font-mono text-brand-muted">
                Or enter absolute local file path:
              </label>
              <input
                id="local-path-input"
                type="text"
                value={manualPath}
                onChange={(e) => {
                  setManualPath(e.target.value);
                  if (e.target.value) setSelectedFile(null);
                }}
                placeholder="C:\Users\dell\Downloads\target.exe"
                className="bg-brand-surface border border-brand-border px-3 py-1.5 rounded text-xs font-mono text-brand-text focus:outline-none focus:border-brand-accent"
              />
              <span className="text-[10px] text-brand-muted">
                Requires read access. File remains on your local filesystem.
              </span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {(selectedFile || manualPath) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedFile(null);
                  setManualPath('');
                }}
                className="px-3 py-1.5 text-xs font-mono text-brand-muted hover:text-brand-text border border-brand-border rounded"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={handleScanSubmit}
              disabled={(!selectedFile && !manualPath) || scanMutation.isPending}
              className="px-4 py-1.5 text-xs font-mono font-semibold bg-brand-accent text-brand-bg rounded hover:bg-brand-accent/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {scanMutation.isPending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-brand-bg border-t-transparent rounded-full animate-spin" />
                  <span>Scanning Structure...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Execute Defensive Scan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {scanMutation.isError && (
          <div className="p-3 bg-brand-critical/10 border border-brand-critical/30 rounded text-xs text-brand-critical font-mono">
            Scan Failed: {(scanMutation.error as Error)?.message || 'Internal analysis error'}
          </div>
        )}
      </div>

      {/* Action Feedback Notification */}
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

      {/* Pending Approval Flow Card (Level 4 Sensitive Action) */}
      {quarantineApproval && (
        <div className="p-4 bg-brand-surface border-2 border-brand-high/60 rounded-md space-y-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-brand-high shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="text-xs font-mono font-bold text-brand-high uppercase tracking-wider">
                Approval Required: Move to Quarantine Vault (Risk Level 4)
              </div>
              <p className="text-xs text-brand-text">
                Quarantining will strip execute permissions and move{' '}
                <span className="font-mono text-brand-accent">{quarantineApproval.path}</span> into the isolated
                quarantine directory. This sensitive response requires explicit authorization.
              </p>
              <div className="text-[10px] font-mono text-brand-muted">
                Action ID: {quarantineApproval.actionId} | Expires: {quarantineApproval.expiresAt || 'in 5 minutes'}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() =>
                confirmMutation.mutate({
                  actionId: quarantineApproval.actionId,
                  decision: 'deny',
                })
              }
              disabled={confirmMutation.isPending}
              className="px-3 py-1 text-xs font-mono border border-brand-border text-brand-muted hover:text-brand-text rounded"
            >
              Deny Action
            </button>
            <button
              onClick={() =>
                confirmMutation.mutate({
                  actionId: quarantineApproval.actionId,
                  decision: 'approve',
                })
              }
              disabled={confirmMutation.isPending}
              className="px-4 py-1 text-xs font-mono font-semibold bg-brand-high text-brand-bg rounded hover:bg-brand-high/90 flex items-center gap-1.5"
            >
              {confirmMutation.isPending ? 'Confirming...' : 'Approve & Quarantine'}
            </button>
          </div>
        </div>
      )}

      {/* Active Scan Finding Report */}
      {activeFinding && (
        <div className="bg-brand-surface border border-brand-border rounded-md overflow-hidden space-y-0">
          {/* Header Verdict Bar */}
          <div
            className={`p-4 border-b flex flex-wrap items-center justify-between gap-4 ${
              activeFinding.verdict === 'likely_malicious'
                ? 'bg-brand-critical/10 border-brand-critical/40'
                : activeFinding.verdict === 'suspicious'
                ? 'bg-brand-high/10 border-brand-high/40'
                : 'bg-brand-accent/10 border-brand-accent/40'
            }`}
          >
            <div className="flex items-center gap-3">
              {activeFinding.verdict === 'likely_malicious' ? (
                <Flame className="w-6 h-6 text-brand-critical" />
              ) : activeFinding.verdict === 'suspicious' ? (
                <AlertTriangle className="w-6 h-6 text-brand-high" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-brand-accent" />
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-brand-text">{activeFinding.file_name}</span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase font-semibold ${
                      activeFinding.verdict === 'likely_malicious'
                        ? 'bg-brand-critical text-brand-bg'
                        : activeFinding.verdict === 'suspicious'
                        ? 'bg-brand-high text-brand-bg'
                        : 'bg-brand-accent text-brand-bg'
                    }`}
                  >
                    {activeFinding.verdict.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-xs font-mono text-brand-muted mt-0.5">
                  Size: {formatFileSize(activeFinding.file_size)} | Inspected:{' '}
                  {new Date(activeFinding.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-[10px] font-mono text-brand-muted uppercase">Defensive Threat Score</div>
                <div
                  className={`text-xl font-mono font-bold ${
                    activeFinding.threat_score >= 70
                      ? 'text-brand-critical'
                      : activeFinding.threat_score >= 30
                      ? 'text-brand-high'
                      : 'text-brand-accent'
                  }`}
                >
                  {activeFinding.threat_score} / 100
                </div>
              </div>

              {/* Quarantine Action Trigger */}
              {!activeFinding.is_quarantined && activeFinding.threat_score > 20 && (
                <button
                  type="button"
                  onClick={() => quarantineMutation.mutate(activeFinding.file_path)}
                  disabled={quarantineMutation.isPending}
                  className="px-3 py-1.5 text-xs font-mono font-semibold bg-brand-high/20 border border-brand-high/40 text-brand-high hover:bg-brand-high/30 rounded transition-colors flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Quarantine File</span>
                </button>
              )}
            </div>
          </div>

          <div className="p-5 space-y-6">
            {/* Entropy & Cryptographic Hashes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Shannon Entropy */}
              <div className="bg-brand-bg/50 border border-brand-border p-3.5 rounded space-y-2">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-brand-muted">Shannon Entropy (Randomness):</span>
                  <span
                    className={`font-bold ${
                      activeFinding.entropy > 7.2 ? 'text-brand-high' : 'text-brand-text'
                    }`}
                  >
                    {activeFinding.entropy.toFixed(2)} / 8.00
                  </span>
                </div>
                <div className="w-full bg-brand-border h-2 rounded overflow-hidden">
                  <div
                    className={`h-full ${
                      activeFinding.entropy > 7.2
                        ? 'bg-brand-high'
                        : activeFinding.entropy > 6.0
                        ? 'bg-brand-accent'
                        : 'bg-brand-muted'
                    }`}
                    style={{ width: `${(activeFinding.entropy / 8.0) * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-brand-muted">
                  {activeFinding.entropy > 7.2
                    ? 'High entropy indicates compression, encryption, or code packing (UPX/ASPack).'
                    : 'Normal entropy distribution typical for uncompressed text or code.'}
                </div>
              </div>

              {/* Hashes */}
              <div className="bg-brand-bg/50 border border-brand-border p-3.5 rounded space-y-2 text-xs font-mono">
                <div>
                  <div className="flex items-center justify-between text-brand-muted">
                    <span>SHA-256</span>
                    <button
                      onClick={() => copyToClipboard(activeFinding.sha256, 'sha256')}
                      className="text-brand-muted hover:text-brand-text flex items-center gap-1 text-[10px]"
                    >
                      {copiedHash === 'sha256' ? <Check className="w-3 h-3 text-brand-accent" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="text-brand-text text-[11px] truncate select-all">{activeFinding.sha256}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-brand-muted">
                    <span>MD5</span>
                    <button
                      onClick={() => copyToClipboard(activeFinding.md5, 'md5')}
                      className="text-brand-muted hover:text-brand-text flex items-center gap-1 text-[10px]"
                    >
                      {copiedHash === 'md5' ? <Check className="w-3 h-3 text-brand-accent" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  </div>
                  <div className="text-brand-text text-[11px] truncate select-all">{activeFinding.md5 || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* PE Structure / Sections (if PE binary) */}
            {activeFinding.file_metadata?.pe_info?.is_pe && (
              <div className="border border-brand-border rounded p-4 bg-brand-bg/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-mono font-semibold text-brand-text flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-brand-accent" />
                    <span>PE Header & Section Inspector</span>
                  </div>
                  <span className="text-[10px] font-mono text-brand-muted">
                    {activeFinding.file_metadata.pe_info.machine_type} |{' '}
                    {activeFinding.file_metadata.pe_info.sections_count} sections
                  </span>
                </div>

                {/* PE Sections Table */}
                {activeFinding.file_metadata.pe_info.sections && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="border-b border-brand-border text-brand-muted text-[10px] text-left">
                          <th className="pb-1">Section</th>
                          <th className="pb-1">Virtual Size</th>
                          <th className="pb-1">Raw Size</th>
                          <th className="pb-1">Entropy</th>
                          <th className="pb-1">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border/40 text-[11px]">
                        {activeFinding.file_metadata.pe_info.sections.map((sec, idx) => (
                          <tr key={idx}>
                            <td className="py-1 text-brand-accent font-semibold">{sec.name}</td>
                            <td className="py-1 text-brand-muted">{sec.virtual_size.toLocaleString()} B</td>
                            <td className="py-1 text-brand-muted">{sec.raw_size.toLocaleString()} B</td>
                            <td className="py-1">
                              <span
                                className={sec.entropy > 7.2 ? 'text-brand-high font-bold' : 'text-brand-text'}
                              >
                                {sec.entropy.toFixed(2)}
                              </span>
                            </td>
                            <td className="py-1 text-[10px]">
                              {sec.entropy > 7.3 ? (
                                <span className="text-brand-high">Packed/Encrypted</span>
                              ) : (
                                <span className="text-brand-muted">Normal</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Suspicious Imports */}
                {activeFinding.file_metadata.pe_info.suspicious_imports_found &&
                  activeFinding.file_metadata.pe_info.suspicious_imports_found.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-brand-border">
                      <div className="text-[11px] font-mono text-brand-high font-semibold mb-1">
                        Suspicious API Imports Flagged:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {activeFinding.file_metadata.pe_info.suspicious_imports_found.map((imp, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-2 py-0.5 bg-brand-high/10 border border-brand-high/30 text-brand-high rounded"
                          >
                            {imp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Structured Evidence Checklist */}
            <div className="space-y-2">
              <div className="text-xs font-mono font-semibold uppercase tracking-wider text-brand-text">
                Evidence & Heuristic Detections ({activeFinding.evidence.length})
              </div>
              <div className="space-y-2">
                {activeFinding.evidence.map((item, idx) => (
                  <div
                    key={idx}
                    className="border border-brand-border bg-brand-bg/40 p-3 rounded text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-mono font-semibold text-brand-text flex items-center gap-2">
                        {item.severity === 'high' ? (
                          <Flame className="w-3.5 h-3.5 text-brand-critical" />
                        ) : item.severity === 'medium' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-brand-high" />
                        ) : (
                          <Info className="w-3.5 h-3.5 text-brand-accent" />
                        )}
                        <span>{item.fact}</span>
                      </div>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-brand-border text-brand-muted uppercase">
                        {item.confidence} confidence
                      </span>
                    </div>
                    <p className="text-brand-muted text-[11px] pl-5.5">{item.inference}</p>
                    <div className="text-[10px] font-mono text-brand-muted/70 pl-5.5">Source: {item.source}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Honest Defensive Limits Disclosure */}
            <div className="p-3 bg-brand-bg border border-brand-border rounded text-[11px] text-brand-muted space-y-1">
              <div className="font-mono font-semibold text-brand-muted uppercase text-[10px]">
                Defensive Limitations Disclosure
              </div>
              <p>
                {activeFinding.file_metadata?.disclaimer ||
                  'Heuristic static scan only. Never executes binary instructions. Does not replace complete defense-in-depth, behavioral monitoring, or full endpoint detection.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Offline Hash Reputation Lookup */}
      <div className="bg-brand-surface border border-brand-border p-4 rounded-md space-y-3">
        <div className="text-xs font-mono uppercase tracking-wider text-brand-text flex items-center gap-2">
          <Search className="w-4 h-4 text-brand-accent" />
          <span>Local Hash Reputation Lookup</span>
        </div>
        <p className="text-xs text-brand-muted">
          Check a SHA-256 or MD5 hash against local signatures and your previous scan database. (Note: external cloud
          uploads are strictly disabled for privacy).
        </p>

        <div className="flex gap-2">
          <input
            type="text"
            value={lookupHashInput}
            onChange={(e) => setLookupHashInput(e.target.value)}
            placeholder="Enter SHA-256 or MD5 hash..."
            className="flex-1 bg-brand-bg border border-brand-border px-3 py-1.5 rounded text-xs font-mono text-brand-text focus:outline-none focus:border-brand-accent"
          />
          <button
            type="button"
            onClick={() => lookupMutation.mutate(lookupHashInput.trim())}
            disabled={!lookupHashInput.trim() || lookupMutation.isPending}
            className="px-3 py-1.5 text-xs font-mono bg-brand-border hover:bg-brand-accent hover:text-brand-bg text-brand-text rounded transition-colors disabled:opacity-50"
          >
            {lookupMutation.isPending ? 'Looking up...' : 'Lookup'}
          </button>
        </div>

        {hashLookupResult && (
          <div className="p-3 bg-brand-bg border border-brand-border rounded text-xs font-mono space-y-1 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-brand-muted">Lookup Status:</span>
              <span
                className={`font-semibold uppercase ${
                  hashLookupResult.status === 'found' ? 'text-brand-accent' : 'text-brand-muted'
                }`}
              >
                {hashLookupResult.status}
              </span>
            </div>
            {hashLookupResult.description && (
              <div className="text-brand-text">{hashLookupResult.description}</div>
            )}
            {hashLookupResult.message && (
              <div className="text-brand-muted text-[11px]">{hashLookupResult.message}</div>
            )}
          </div>
        )}
      </div>

      {/* Past Scan Findings History */}
      <div className="bg-brand-surface border border-brand-border rounded-md overflow-hidden">
        <div className="p-4 border-b border-brand-border flex items-center justify-between">
          <div className="font-mono text-xs uppercase tracking-wider text-brand-text flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-accent" />
            <span>Scan History ({findings.length})</span>
          </div>
          <button
            onClick={() => refetchFindings()}
            className="text-xs font-mono text-brand-muted hover:text-brand-accent flex items-center gap-1"
          >
            <span>Refresh</span>
          </button>
        </div>

        {findingsLoading ? (
          <div className="p-8 text-center text-xs font-mono text-brand-muted">Loading scan history...</div>
        ) : findings.length === 0 ? (
          <div className="p-8 text-center text-xs font-mono text-brand-muted">
            No files scanned yet. Select a file above to begin defensive analysis.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-[10px] text-left bg-brand-bg/50">
                  <th className="p-3">File Name</th>
                  <th className="p-3">Verdict</th>
                  <th className="p-3">Threat Score</th>
                  <th className="p-3">Entropy</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Scanned At</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border">
                {findings.map((f) => (
                  <tr key={f.id} className="hover:bg-brand-accent/5 transition-colors">
                    <td className="p-3 text-brand-text font-semibold">{f.file_name}</td>
                    <td className="p-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                          f.verdict === 'likely_malicious'
                            ? 'bg-brand-critical/20 text-brand-critical'
                            : f.verdict === 'suspicious'
                            ? 'bg-brand-high/20 text-brand-high'
                            : 'bg-brand-accent/20 text-brand-accent'
                        }`}
                      >
                        {f.verdict.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3">
                      <span
                        className={
                          f.threat_score >= 70
                            ? 'text-brand-critical font-bold'
                            : f.threat_score >= 30
                            ? 'text-brand-high'
                            : 'text-brand-accent'
                        }
                      >
                        {f.threat_score} / 100
                      </span>
                    </td>
                    <td className="p-3 text-brand-muted">{f.entropy.toFixed(2)}</td>
                    <td className="p-3 text-[10px]">
                      {f.is_quarantined ? (
                        <span className="text-brand-high font-semibold">Quarantined</span>
                      ) : (
                        <span className="text-brand-muted">Active</span>
                      )}
                    </td>
                    <td className="p-3 text-brand-muted text-[11px]">
                      {new Date(f.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setActiveFinding(f)}
                        className="text-brand-accent hover:underline text-xs"
                      >
                        View Report
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

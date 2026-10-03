import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, XCircle, Clock, AlertTriangle, Lock } from 'lucide-react';
import { api } from '../api/client';
import { ApiError, ConfirmResponse } from '../api/types';

interface ApprovalCardProps {
  actionId: string;
  toolName?: string;
  riskLevel?: number;
  expiresAt?: string;
  onResolved?: (response: ConfirmResponse) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  actionId,
  toolName = 'system_action',
  riskLevel = 2,
  expiresAt,
  onResolved,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'denied' | 'expired' | 'error'>('pending');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  // Countdown timer if expiresAt is provided
  useEffect(() => {
    if (!expiresAt || status !== 'pending') return;

    const updateTimer = () => {
      const remainingMs = new Date(expiresAt).getTime() - Date.now();
      if (remainingMs <= 0) {
        setTimeLeft('EXPIRED');
        setStatus('expired');
        setStatusMessage('This pending action has expired.');
      } else {
        const seconds = Math.floor((remainingMs / 1000) % 60);
        const minutes = Math.floor(remainingMs / (1000 * 60));
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, status]);

  const handleDecision = async (decision: 'approve' | 'deny') => {
    if (loading || status !== 'pending') return;

    setLoading(true);
    setStatusMessage(null);

    try {
      const result = await api.confirm({
        action_id: actionId,
        decision,
      });

      if (decision === 'approve') {
        setStatus('approved');
        setStatusMessage(result.message || 'Action approved and executed.');
      } else {
        setStatus('denied');
        setStatusMessage(result.message || 'Action denied.');
      }

      if (onResolved) {
        onResolved(result);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setStatus('error');
          setStatusMessage('Action was already resolved.');
        } else if (err.statusCode === 410) {
          setStatus('expired');
          setStatusMessage('Action expired before it could be confirmed.');
        } else if (err.statusCode === 404) {
          setStatus('error');
          setStatusMessage('Action not found or belongs to another user.');
        } else {
          setStatus('error');
          setStatusMessage(err.message || 'Failed to process confirmation.');
        }
      } else {
        setStatus('error');
        setStatusMessage('Network error while resolving action.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="region"
      aria-label="Pending Security Approval"
      className="my-3 rounded border border-severity-med/40 bg-cockpit-surface p-4 shadow-sm font-sans"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-cockpit-border pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-severity-med" />
          <span className="font-mono text-xs font-bold tracking-wider uppercase text-severity-med">
            [SECURITY APPROVAL REQUIRED]
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-cockpit-muted">
          <span className="px-1.5 py-0.5 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-text">
            LVL {riskLevel}: ASK
          </span>
          {timeLeft && (
            <span className="flex items-center gap-1 text-[11px] text-cockpit-muted">
              <Clock className="w-3.5 h-3.5" />
              {timeLeft}
            </span>
          )}
        </div>
      </div>

      {/* Action Details */}
      <div className="space-y-1.5 text-xs font-mono mb-4 text-cockpit-text">
        <div className="flex items-baseline gap-2">
          <span className="text-cockpit-muted text-[11px] uppercase tracking-wide">TOOL:</span>
          <span className="font-semibold text-cockpit-accent">{toolName}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-cockpit-muted text-[11px] uppercase tracking-wide">ACTION ID:</span>
          <span className="text-[11px] text-cockpit-muted break-all select-all">{actionId}</span>
        </div>
        <div className="flex items-center gap-1.5 text-cockpit-muted pt-1">
          <Lock className="w-3 h-3 text-cockpit-muted" />
          <span className="text-[11px]">
            Single-use • Owner-verified • Deliberate click required (Voice disabled)
          </span>
        </div>
      </div>

      {/* Outcome Banner if already resolved */}
      {status !== 'pending' && (
        <div
          role="status"
          className={`flex items-start gap-2 p-2.5 rounded text-xs font-mono mb-2 ${
            status === 'approved'
              ? 'bg-severity-low/10 border border-severity-low text-severity-low'
              : status === 'denied'
              ? 'bg-severity-high/10 border border-severity-high text-severity-high'
              : 'bg-severity-med/10 border border-severity-med text-severity-med'
          }`}
        >
          {status === 'approved' && <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />}
          {status === 'denied' && <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
          {(status === 'expired' || status === 'error') && <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
          <div>
            <div className="font-bold uppercase tracking-wide">
              {status === 'approved' && 'ACTION APPROVED'}
              {status === 'denied' && 'ACTION DENIED'}
              {status === 'expired' && 'ACTION EXPIRED'}
              {status === 'error' && 'RESOLUTION ERROR'}
            </div>
            {statusMessage && <div className="text-[11px] mt-0.5 text-cockpit-text">{statusMessage}</div>}
          </div>
        </div>
      )}

      {/* Interactive Controls: Deliberate Click */}
      {status === 'pending' && (
        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDecision('approve')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-severity-low/20 border border-severity-low text-severity-low hover:bg-severity-low/30 active:bg-severity-low/40 font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-severity-low"
          >
            <CheckCircle2 className="w-4 h-4" />
            {loading ? 'PROCESSING...' : 'APPROVE ACTION'}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleDecision('deny')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-severity-high/20 border border-severity-high text-severity-high hover:bg-severity-high/30 active:bg-severity-high/40 font-mono text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-severity-high"
          >
            <XCircle className="w-4 h-4" />
            {loading ? 'PROCESSING...' : 'DENY ACTION'}
          </button>
        </div>
      )}
    </div>
  );
};

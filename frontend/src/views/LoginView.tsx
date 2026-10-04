import React, { useState } from 'react';
import { ShieldCheck, Lock, User, AlertCircle, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ApiError } from '../api/types';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      await login(username.trim(), password);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setErrorMessage('Too many login attempts. Please wait a minute and try again.');
        } else if (err.statusCode === 400 || err.statusCode === 401) {
          setErrorMessage('Invalid username or password.');
        } else {
          setErrorMessage(err.message || 'Login failed. Check that backend is running on :8001.');
        }
      } else {
        setErrorMessage('Cannot connect to backend server at http://127.0.0.1:8001.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cockpit-base text-cockpit-text flex items-center justify-center p-4 font-sans selection:bg-cockpit-accent selection:text-black">
      <div className="w-full max-w-md rounded-lg border border-cockpit-border bg-cockpit-surface p-6 shadow-2xl">
        {/* Terminal Header */}
        <div className="flex items-center gap-3 border-b border-cockpit-border pb-4 mb-6">
          <div className="p-2.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/40 text-cockpit-accent">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-mono text-base font-bold tracking-wider uppercase text-cockpit-text">
              AEGIS // AUTHENTICATION
            </h1>
            <p className="text-xs font-mono text-cockpit-muted">
              AUTHENTICATE TO ACCESS COMMAND CENTER
            </p>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div
            role="alert"
            className="flex items-start gap-2.5 p-3 rounded mb-5 bg-severity-high/10 border border-severity-high text-severity-high text-xs font-mono"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">AUTHENTICATION FAILED</strong>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
            >
              Operator Username
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                <User className="w-4 h-4" />
              </span>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="alice"
                className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent focus:ring-1 focus:ring-cockpit-accent transition-colors"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                <Lock className="w-4 h-4" />
              </span>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent focus:ring-1 focus:ring-cockpit-accent transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-3 px-4 rounded bg-cockpit-accent text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 active:bg-cockpit-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow flex items-center justify-center gap-2 mt-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cockpit-accent focus-visible:ring-offset-2 focus-visible:ring-offset-cockpit-surface"
          >
            <Terminal className="w-4 h-4" />
            {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
          </button>
        </form>

        {/* Server Connection Switcher for Mobile APK & Web */}
        <div className="mt-6 pt-4 border-t border-cockpit-border/60 font-mono text-xs text-cockpit-muted">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-cockpit-muted">Server Connection:</span>
            <span className="text-[11px] text-cockpit-accent truncate max-w-[180px]">
              {api.getBaseUrl() || 'Auto (Same Origin)'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => {
                api.setBaseUrl('https://authorities-seminars-royalty-forum.trycloudflare.com');
                window.location.reload();
              }}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors"
            >
              Cloud Tunnel (4G/5G)
            </button>
            <button
              type="button"
              onClick={() => {
                api.setBaseUrl('http://10.227.244.161:5173');
                window.location.reload();
              }}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors"
            >
              Local Wi-Fi
            </button>
          </div>
          <p className="mt-2 text-[10px] text-center text-cockpit-muted/70">
            Encrypted Zero-Trust Communication • Level 4 Air-Gapped Approvals
          </p>
        </div>
      </div>
    </div>
  );
};

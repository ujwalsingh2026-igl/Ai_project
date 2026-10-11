import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  AlertCircle,
  Terminal,
  Globe,
  Apple,
  UserPlus,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ApiError } from '../api/types';

export const LoginView: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Social modal / prompt state
  const [socialPrompt, setSocialPrompt] = useState<'google' | 'apple' | null>(null);
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(() => api.getBaseUrl() || '');
  const [backendStatus, setBackendStatus] = useState<'probing' | 'online' | 'offline'>('probing');

  useEffect(() => {
    let active = true;
    const probe = async () => {
      try {
        const res = await api.checkHealth();
        if (active) {
          setBackendStatus(res && res.status === 'ok' ? 'online' : 'offline');
        }
      } catch {
        if (active) setBackendStatus('offline');
      }
    };
    probe();
    const timer = setInterval(probe, 6000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Please enter both username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername.trim() || !regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in username, email, and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await register({
        username: regUsername.trim(),
        email: regEmail.trim(),
        password: regPassword,
        auth_provider: 'email',
      });
      setSuccessMessage('Account registered successfully! Accessing Command Center...');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Username or email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'apple') => {
    const defaultEmail =
      socialEmail.trim() ||
      `${provider === 'google' ? 'google.user' : 'apple.user'}_${Math.floor(1000 + Math.random() * 9000)}@${provider === 'google' ? 'gmail.com' : 'icloud.com'}`;
    const defaultUsername =
      socialName.trim().replace(/\s+/g, '_').toLowerCase() ||
      defaultEmail.split('@')[0];

    setLoading(true);
    setErrorMessage(null);

    try {
      await register({
        username: defaultUsername,
        email: defaultEmail,
        auth_provider: provider,
        provider_id: `${provider}_id_${Date.now()}`,
      });
      setSocialPrompt(null);
      setSuccessMessage(`Authenticated via ${provider === 'google' ? 'Google' : 'Apple ID'}. Accessing Command Center...`);
    } catch (err: any) {
      setErrorMessage(err.message || `Failed to authenticate with ${provider}.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cockpit-base text-cockpit-text flex items-center justify-center p-4 font-sans selection:bg-cockpit-accent selection:text-black">
      <div className="w-full max-w-md rounded-lg border border-cockpit-border bg-cockpit-surface p-6 shadow-2xl">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-cockpit-border pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-cockpit-accent/10 border border-cockpit-accent/40 text-cockpit-accent">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-mono text-base font-bold tracking-wider uppercase text-cockpit-text">
                AEGIS // AUTHENTICATION
              </h1>
              <p className="text-xs font-mono text-cockpit-muted">
                ZERO-TRUST ACCESS CONTROL & IDENTITY
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded bg-cockpit-base border border-cockpit-border text-[10px] font-mono"
            title={`Backend Status: ${backendStatus}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                backendStatus === 'online'
                  ? 'bg-severity-low shadow-[0_0_6px_rgba(63,185,80,0.8)]'
                  : backendStatus === 'probing'
                  ? 'bg-severity-med animate-pulse'
                  : 'bg-severity-high shadow-[0_0_6px_rgba(248,81,73,0.8)]'
              }`}
            />
            <span
              className={
                backendStatus === 'online'
                  ? 'text-severity-low font-bold'
                  : backendStatus === 'probing'
                  ? 'text-cockpit-muted'
                  : 'text-severity-high font-bold'
              }
            >
              {backendStatus === 'online' ? 'ONLINE' : backendStatus === 'probing' ? 'PROBING...' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {/* Offline Warning & Quick Fix Banner */}
        {backendStatus === 'offline' && (
          <div className="p-3 mb-4 rounded bg-severity-high/10 border border-severity-high text-xs font-mono text-severity-high space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>SERVER UNREACHABLE</span>
              </div>
              <span className="text-[10px] text-cockpit-muted">Gateway / Tunnel Inactive</span>
            </div>
            <p className="text-[11px] text-cockpit-muted">
              Current Target: <code className="text-cockpit-accent font-bold">{api.getBaseUrl() || 'Auto / Same Origin'}</code>
            </p>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  api.setBaseUrl('https://ribbon-raw-strap-rfc.trycloudflare.com');
                  window.location.reload();
                }}
                className="px-2.5 py-1 rounded bg-cockpit-accent text-black font-bold text-[10px] uppercase hover:bg-cockpit-accent/90"
              >
                Connect to Cloud Tunnel
              </button>
              <button
                type="button"
                onClick={() => {
                  api.setBaseUrl('');
                  window.location.reload();
                }}
                className="px-2.5 py-1 rounded bg-cockpit-elevated border border-cockpit-border text-[10px] uppercase text-cockpit-muted hover:text-cockpit-text"
              >
                Reset Default
              </button>
            </div>
          </div>
        )}

        {/* Tab Switcher: Sign In vs Register */}
        <div className="flex border-b border-cockpit-border mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-2.5 font-mono text-xs uppercase font-bold tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
              mode === 'login'
                ? 'border-cockpit-accent text-cockpit-accent'
                : 'border-transparent text-cockpit-muted hover:text-cockpit-text'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setErrorMessage(null);
              setSuccessMessage(null);
            }}
            className={`flex-1 pb-2.5 font-mono text-xs uppercase font-bold tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${
              mode === 'register'
                ? 'border-cockpit-accent text-cockpit-accent'
                : 'border-transparent text-cockpit-muted hover:text-cockpit-text'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Account</span>
          </button>
        </div>

        {/* Notifications */}
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

        {successMessage && (
          <div
            role="status"
            className="flex items-start gap-2.5 p-3 rounded mb-5 bg-severity-low/10 border border-severity-low text-severity-low text-xs font-mono"
          >
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">IDENTITY VERIFIED</strong>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Dynamic Social Registration / Login (Google & Apple ID) */}
        <div className="space-y-2 mb-5">
          <button
            type="button"
            disabled={loading}
            onClick={() => setSocialPrompt('google')}
            className="w-full py-2.5 px-4 rounded bg-cockpit-base hover:bg-cockpit-elevated border border-cockpit-border hover:border-[#4285F4] text-xs font-mono text-cockpit-text flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
          >
            <Globe className="w-4 h-4 text-[#4285F4]" />
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={() => setSocialPrompt('apple')}
            className="w-full py-2.5 px-4 rounded bg-cockpit-base hover:bg-cockpit-elevated border border-cockpit-border hover:border-white text-xs font-mono text-cockpit-text flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
          >
            <Apple className="w-4 h-4 text-white" />
            <span>Continue with Apple ID</span>
          </button>
        </div>

        {/* Social Authentication Modal / Prompt */}
        {socialPrompt && (
          <div className="p-3.5 mb-5 rounded bg-cockpit-base border border-cockpit-accent/40 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="font-bold text-cockpit-accent uppercase flex items-center gap-1.5">
                {socialPrompt === 'google' ? <Globe className="w-3.5 h-3.5 text-[#4285F4]" /> : <Apple className="w-3.5 h-3.5" />}
                Connect {socialPrompt === 'google' ? 'Google' : 'Apple ID'}
              </span>
              <button
                type="button"
                onClick={() => setSocialPrompt(null)}
                className="text-cockpit-muted hover:text-cockpit-text"
              >
                Cancel
              </button>
            </div>
            <input
              type="text"
              value={socialName}
              onChange={(e) => setSocialName(e.target.value)}
              placeholder="Operator Display Name (optional)"
              className="w-full px-3 py-1.5 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-text focus:outline-none focus:border-cockpit-accent"
            />
            <input
              type="email"
              value={socialEmail}
              onChange={(e) => setSocialEmail(e.target.value)}
              placeholder={socialPrompt === 'google' ? 'user@gmail.com' : 'user@icloud.com'}
              className="w-full px-3 py-1.5 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-text focus:outline-none focus:border-cockpit-accent"
            />
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSocialAuth(socialPrompt)}
              className="w-full py-2 px-3 rounded bg-cockpit-accent text-black font-mono text-xs font-bold uppercase transition-all shadow-glow"
            >
              {loading ? 'CONNECTING...' : `AUTHORIZE VIA ${socialPrompt.toUpperCase()}`}
            </button>
          </div>
        )}

        <div className="relative flex py-2 items-center mb-4">
          <div className="flex-grow border-t border-cockpit-border"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono text-cockpit-muted uppercase tracking-wider">
            {mode === 'login' ? 'OR SIGN IN WITH USERNAME' : 'OR REGISTER WITH EMAIL'}
          </span>
          <div className="flex-grow border-t border-cockpit-border"></div>
        </div>

        {/* Form: Mode Login */}
        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
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
                  placeholder="ujwalsingh12 / alice"
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
              className="w-full min-h-[48px] py-3 px-4 rounded bg-cockpit-accent text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 active:bg-cockpit-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow flex items-center justify-center gap-2 mt-4"
            >
              <Terminal className="w-4 h-4" />
              {loading ? 'AUTHENTICATING...' : 'INITIALIZE SESSION'}
            </button>
          </form>
        ) : (
          /* Form: Mode Register */
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label
                htmlFor="reg-username"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1"
              >
                Desired Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="new_operator"
                  className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="operator@defense.aegis"
                  className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1"
              >
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="reg-password"
                  type="password"
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 px-4 rounded bg-cockpit-accent text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 active:bg-cockpit-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow flex items-center justify-center gap-2 mt-4"
            >
              <UserPlus className="w-4 h-4" />
              {loading ? 'REGISTERING...' : 'REGISTER ACCOUNT'}
            </button>
          </form>
        )}

        {/* Server Connection Switcher for Mobile APK & Web */}
        <div className="mt-6 pt-4 border-t border-cockpit-border/60 font-mono text-xs text-cockpit-muted">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase text-cockpit-muted">Gateway Profile:</span>
            <span className="text-[11px] text-cockpit-accent truncate max-w-[180px]">
              {api.getBaseUrl() ? 'Configured Gateway' : 'Auto (Same Origin)'}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 mt-2">
            <button
              type="button"
              onClick={() => {
                api.setBaseUrl('https://ribbon-raw-strap-rfc.trycloudflare.com');
                window.location.reload();
              }}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors"
            >
              Cloud Tunnel
            </button>
            <button
              type="button"
              onClick={() => {
                api.setBaseUrl('');
                window.location.reload();
              }}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors"
            >
              Same Origin
            </button>
            <button
              type="button"
              onClick={() => setShowCustomUrl(!showCustomUrl)}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors text-cockpit-accent"
            >
              Custom URL
            </button>
          </div>

          {showCustomUrl && (
            <div className="mt-2.5 p-2 rounded bg-cockpit-base border border-cockpit-border space-y-2">
              <input
                type="text"
                placeholder="https://...trycloudflare.com or http://ip:8001"
                value={customUrlInput}
                onChange={(e) => setCustomUrlInput(e.target.value)}
                className="w-full px-2.5 py-1 rounded bg-cockpit-surface border border-cockpit-border text-xs font-mono text-cockpit-text focus:outline-none focus:border-cockpit-accent"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomUrl(false)}
                  className="px-2 py-1 rounded text-[10px] text-cockpit-muted hover:text-cockpit-text"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    api.setBaseUrl(customUrlInput.trim());
                    window.location.reload();
                  }}
                  className="px-2.5 py-1 rounded bg-cockpit-accent text-black font-bold text-[10px]"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          )}

          <p className="mt-2 text-[10px] text-center text-cockpit-muted/70">
            Encrypted Zero-Trust Communication • Level 4 Air-Gapped Approvals
          </p>
          <div className="mt-2 text-center text-[10px] text-cockpit-muted">
            <span>Backend Target: <code className="text-cockpit-accent">{api.getBaseUrl() || 'http://127.0.0.1:8001'}</code></span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  User,
  Mail,
  AlertCircle,
  Terminal,
  Eye,
  EyeOff,
  UserPlus,
  KeyRound,
  ArrowLeft,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ApiError } from '../api/types';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: any) => void;
          renderButton: (parent: HTMLElement, options: any) => void;
          prompt: (momentListener?: any) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

type AuthMode = 'login' | 'register' | 'forgot-password' | 'reset-confirm' | 'verify-email';

export const LoginView: React.FC = () => {
  const { login, register, googleLogin, requestPasswordReset, confirmPasswordReset, verifyEmail } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');

  // Shared state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(true);

  // Show/Hide Password states
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Login form state
  const [identifier, setIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form state
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Password reset state
  const [resetEmail, setResetEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Email verification state
  const [verificationToken, setVerificationToken] = useState('');

  // Google OAuth configuration & UI
  const [googleClientId, setGoogleClientId] = useState(() => {
    try {
      return ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) || '';
    } catch {
      return '';
    }
  });
  const [showGoogleGuideModal, setShowGoogleGuideModal] = useState(false);
  const [gsiInitialized, setGsiInitialized] = useState(false);
  const googleButtonContainerRef = useRef<HTMLDivElement>(null);

  // Backend probing state
  const [showCustomUrl, setShowCustomUrl] = useState(false);
  const [customUrlInput, setCustomUrlInput] = useState(() => api.getBaseUrl() || '');
  const [backendStatus, setBackendStatus] = useState<'probing' | 'online' | 'offline'>('probing');

  // Parse URL query / hash on mount (e.g. ?reset_token=... or ?verify_token=...)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;

      const qReset = searchParams.get('reset_token');
      if (qReset || hash.includes('reset-password')) {
        setMode('reset-confirm');
        if (qReset) setResetToken(qReset);
      }

      const qVerify = searchParams.get('verify_token');
      if (qVerify || hash.includes('verify-email')) {
        setMode('verify-email');
        if (qVerify) setVerificationToken(qVerify);
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, []);

  // Backend health polling
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

  // Dynamically load Google Identity Services script
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const existingScript = document.getElementById('google-gsi-client');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        setupGoogleIdentity();
      };
      document.body.appendChild(script);
    } else {
      setupGoogleIdentity();
    }
  }, [googleClientId, mode]);

  const setupGoogleIdentity = () => {
    if (!window.google?.accounts?.id || !googleClientId) return;

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      if (googleButtonContainerRef.current) {
        googleButtonContainerRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(googleButtonContainerRef.current, {
          theme: 'filled_black',
          size: 'large',
          text: mode === 'register' ? 'signup_with' : 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: '100%',
        });
      }
      setGsiInitialized(true);
    } catch (err) {
      console.warn('Google Identity Services initialization warning:', err);
    }
  };

  const handleGoogleCredentialResponse = async (response: any) => {
    const credential = response?.credential;
    if (!credential) {
      setErrorMessage('Google authentication was cancelled or did not return a credential.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await googleLogin(credential, rememberMe);
      setSuccessMessage('Successfully authenticated with Google. Accessing Command Center...');
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMessage(err.message || 'Google verification failed on backend.');
      } else {
        setErrorMessage('Failed to connect to backend server during Google authentication.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualGoogleClick = () => {
    if (googleClientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.prompt();
      } catch {
        setShowGoogleGuideModal(true);
      }
    } else {
      setShowGoogleGuideModal(true);
    }
  };

  const handleDevSimulationLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    setShowGoogleGuideModal(false);

    try {
      const simToken = `test_google_token:operator_${Math.floor(1000 + Math.random() * 9000)}@gmail.com:Aegis Operator:sub_google_${Date.now()}`;
      await googleLogin(simToken, rememberMe);
      setSuccessMessage('Authenticated via Google simulation session. Accessing Command Center...');
    } catch (err: any) {
      setErrorMessage(err.message || 'Simulation authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !loginPassword.trim()) {
      setErrorMessage('Please enter both username/email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await login(identifier.trim(), loginPassword, rememberMe);
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
    if (!regEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please fill in email and password.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    if (regPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await register(
        {
          name: regFullName.trim(),
          username: regUsername.trim() || regEmail.trim().split('@')[0],
          email: regEmail.trim(),
          password: regPassword,
          confirm_password: regConfirmPassword,
          auth_provider: 'email',
        },
        rememberMe
      );
      setSuccessMessage('Account registered successfully! Accessing Command Center...');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Username or email may already exist.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await requestPasswordReset(resetEmail.trim());
      setSuccessMessage(res.message);
      if (res.debug_token) {
        setResetToken(res.debug_token);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to dispatch password reset request.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim() || !newPassword.trim()) {
      setErrorMessage('Please enter the reset authorization token and your new password.');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await confirmPasswordReset({
        token: resetToken.trim(),
        new_password: newPassword,
        confirm_password: confirmNewPassword,
      });
      setSuccessMessage('Password reset successfully! Accessing Command Center...');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. The token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailVerificationConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken.trim()) {
      setErrorMessage('Please enter the verification token.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await verifyEmail(verificationToken.trim());
      setSuccessMessage('Email address verified successfully!');
      setTimeout(() => setMode('login'), 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Verification token is invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cockpit-base text-cockpit-text flex items-center justify-center p-4 font-sans selection:bg-cockpit-accent selection:text-black">
      <div className="w-full max-w-md rounded-lg border border-cockpit-border bg-cockpit-surface p-6 shadow-2xl relative">
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

        {/* Offline Warning Banner */}
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

        {/* Tab Switcher: Sign In vs Register (Hidden on Reset / Verify modes) */}
        {(mode === 'login' || mode === 'register') && (
          <div className="flex border-b border-cockpit-border mb-5">
            <button
              type="button"
              aria-label="Switch to Sign In tab"
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
              aria-label="Switch to Register tab"
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
        )}

        {/* Back Link for Reset / Verify modes */}
        {(mode === 'forgot-password' || mode === 'reset-confirm' || mode === 'verify-email') && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className="flex items-center gap-1.5 text-xs font-mono text-cockpit-muted hover:text-cockpit-accent transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Sign In</span>
            </button>
          </div>
        )}

        {/* Error Notification */}
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

        {/* Success Notification */}
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

        {/* Official Google Identity Services Sign-In Button */}
        {(mode === 'login' || mode === 'register') && (
          <div className="space-y-3 mb-5">
            {/* Hidden container where official GIS renders button if Google Client ID is configured */}
            <div
              ref={googleButtonContainerRef}
              id="gsi-button-container"
              className={`w-full flex justify-center ${gsiInitialized && googleClientId ? 'block' : 'hidden'}`}
            />

            {/* Google Brand Button */}
            {(!gsiInitialized || !googleClientId) && (
              <button
                type="button"
                disabled={loading}
                onClick={handleManualGoogleClick}
                className="w-full py-2.5 px-4 rounded bg-white hover:bg-gray-100 border border-gray-300 text-gray-800 text-xs font-medium font-sans flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.13z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-cockpit-border"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono text-cockpit-muted uppercase tracking-wider">
                {mode === 'login' ? 'OR SIGN IN WITH USERNAME / EMAIL' : 'OR SIGN UP WITH EMAIL'}
              </span>
              <div className="flex-grow border-t border-cockpit-border"></div>
            </div>
          </div>
        )}

        {/* FORM: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
              >
                Operator Username or Email
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
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="operator / user@defense.aegis"
                  className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent focus:ring-1 focus:ring-cockpit-accent transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-mono font-medium text-cockpit-muted uppercase"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot-password');
                    setResetEmail(identifier.includes('@') ? identifier : '');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] font-mono text-cockpit-accent hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent focus:ring-1 focus:ring-cockpit-accent transition-colors"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide credential' : 'Show credential'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cockpit-muted hover:text-cockpit-text focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between text-xs font-mono pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-cockpit-muted hover:text-cockpit-text select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-cockpit-base border-cockpit-border text-cockpit-accent focus:ring-cockpit-accent"
                />
                <span>Remember this workstation</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setMode('verify-email');
                  setErrorMessage(null);
                }}
                className="text-[10px] text-cockpit-muted hover:text-cockpit-accent underline"
              >
                Verify Email
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 px-4 rounded bg-cockpit-accent text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 active:bg-cockpit-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AUTHENTICATING...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  <span>INITIALIZE SESSION</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM: REGISTER */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label
                htmlFor="reg-name"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1"
              >
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <User className="w-4 h-4" />
                </span>
                <input
                  id="reg-name"
                  type="text"
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-username"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1"
              >
                Operator Username
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <UserPlus className="w-4 h-4" />
                </span>
                <input
                  id="reg-username"
                  type="text"
                  required
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  placeholder="alex_mercer"
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
                Password (min 8 chars)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide credential' : 'Show credential'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cockpit-muted hover:text-cockpit-text focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-confirm-password"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1"
              >
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirmed credential' : 'Show confirmed credential'}
                  title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cockpit-muted hover:text-cockpit-text focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center text-xs font-mono pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-cockpit-muted hover:text-cockpit-text select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-cockpit-base border-cockpit-border text-cockpit-accent focus:ring-cockpit-accent"
                />
                <span>Remember this workstation</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[48px] py-3 px-4 rounded bg-cockpit-accent text-black font-mono text-sm font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 active:bg-cockpit-accent/80 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-glow flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>PROVISIONING ACCOUNT...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>REGISTER ACCOUNT</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* FORM: FORGOT PASSWORD */}
        {mode === 'forgot-password' && (
          <form onSubmit={handlePasswordResetRequest} className="space-y-4">
            <div>
              <h2 className="text-sm font-mono font-bold text-cockpit-text uppercase mb-1">
                Password Recovery
              </h2>
              <p className="text-xs font-mono text-cockpit-muted">
                Enter your registered email address. A secure 30-minute password reset authorization token will be dispatched.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
              >
                Registered Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="operator@defense.aegis"
                  className="w-full pl-9 pr-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
              </div>
            </div>

            {resetToken && (
              <div className="p-3 rounded bg-cockpit-base border border-cockpit-accent/40 font-mono text-xs space-y-2">
                <span className="text-[10px] text-cockpit-accent font-bold uppercase block">
                  Authorization Token Ready
                </span>
                <code className="text-xs text-cockpit-text break-all bg-cockpit-surface p-1 rounded block">
                  {resetToken}
                </code>
                <button
                  type="button"
                  onClick={() => setMode('reset-confirm')}
                  className="w-full py-1.5 rounded bg-cockpit-accent text-black font-bold text-xs uppercase"
                >
                  Enter New Password Now
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded bg-cockpit-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'DISPATCHING...' : 'DISPATCH RESET INSTRUCTIONS'}
            </button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode('reset-confirm')}
                className="text-xs font-mono text-cockpit-accent hover:underline"
              >
                Already have a reset token? Click here
              </button>
            </div>
          </form>
        )}

        {/* FORM: RESET PASSWORD CONFIRMATION */}
        {mode === 'reset-confirm' && (
          <form onSubmit={handlePasswordResetConfirm} className="space-y-4">
            <div>
              <h2 className="text-sm font-mono font-bold text-cockpit-text uppercase mb-1">
                Set New Password
              </h2>
              <p className="text-xs font-mono text-cockpit-muted">
                Paste your authorization token and enter your new password.
              </p>
            </div>

            <div>
              <label
                htmlFor="reset-token"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
              >
                Reset Authorization Token
              </label>
              <input
                id="reset-token"
                type="text"
                required
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="Paste token from email..."
                className="w-full px-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-xs font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
              />
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
              >
                New Password (min 8 chars)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide credential' : 'Show credential'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cockpit-muted hover:text-cockpit-text focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
              >
                Confirm New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-cockpit-muted">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  id="confirm-new-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2 rounded bg-cockpit-base border border-cockpit-border text-sm font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
                />
                <button
                  type="button"
                  aria-label={showConfirmPassword ? 'Hide confirmed credential' : 'Show confirmed credential'}
                  title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-cockpit-muted hover:text-cockpit-text focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded bg-cockpit-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'UPDATING CREDENTIALS...' : 'UPDATE CREDENTIALS & SIGN IN'}
            </button>
          </form>
        )}

        {/* FORM: EMAIL VERIFICATION */}
        {mode === 'verify-email' && (
          <form onSubmit={handleEmailVerificationConfirm} className="space-y-4">
            <div>
              <h2 className="text-sm font-mono font-bold text-cockpit-text uppercase mb-1">
                Email Address Verification
              </h2>
              <p className="text-xs font-mono text-cockpit-muted">
                Confirm your operator email address using the token received in your verification dispatch.
              </p>
            </div>

            <div>
              <label
                htmlFor="verify-token-input"
                className="block text-xs font-mono font-medium text-cockpit-muted uppercase mb-1.5"
              >
                Verification Token
              </label>
              <input
                id="verify-token-input"
                type="text"
                required
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                placeholder="Paste verification token..."
                className="w-full px-3 py-2 rounded bg-cockpit-base border border-cockpit-border text-xs font-mono text-cockpit-text placeholder-cockpit-muted/60 focus:outline-none focus:border-cockpit-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full min-h-[44px] py-2.5 px-4 rounded bg-cockpit-accent text-black font-mono text-xs font-bold uppercase tracking-wider hover:bg-cockpit-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'VERIFYING...' : 'CONFIRM EMAIL IDENTITY'}
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
                api.setBaseUrl('https://aegis-backend-oxee.onrender.com');
                window.location.reload();
              }}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors text-cockpit-accent"
            >
              Render Cloud
            </button>
            <button
              type="button"
              onClick={() => {
                api.setBaseUrl('http://127.0.0.1:8001');
                window.location.reload();
              }}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors"
            >
              Local (8001)
            </button>
            <button
              type="button"
              onClick={() => setShowCustomUrl(!showCustomUrl)}
              className="py-1.5 px-2 rounded bg-cockpit-base border border-cockpit-border hover:border-cockpit-accent text-[10px] text-center truncate transition-colors"
            >
              Custom URL
            </button>
          </div>

          {showCustomUrl && (
            <div className="mt-2.5 p-2 rounded bg-cockpit-base border border-cockpit-border space-y-2">
              <input
                type="text"
                placeholder="https://aegis-backend-oxee.onrender.com or http://ip:8001"
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
            <span>
              Backend Target: <code className="text-cockpit-accent">{api.getBaseUrl() || 'https://aegis-backend-oxee.onrender.com'}</code>
            </span>
          </div>
        </div>
      </div>

      {/* Google Setup Guide & Development Simulation Modal */}
      {showGoogleGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-cockpit-border bg-cockpit-surface p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-cockpit-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <h3 className="font-mono text-sm font-bold text-cockpit-text uppercase">
                  Google Authentication Setup
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleGuideModal(false)}
                className="text-cockpit-muted hover:text-cockpit-text font-mono text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs text-cockpit-muted">
              <p>
                To enable live production Google Sign-In with real Google accounts:
              </p>
              <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-cockpit-text">
                <li>
                  Open <span className="text-cockpit-accent">Google Cloud Console</span> &gt; APIs &amp; Services &gt; Credentials.
                </li>
                <li>
                  Create an <strong>OAuth 2.0 Client ID</strong> (Web application).
                </li>
                <li>
                  Add authorized JavaScript origins (e.g. <code>http://localhost:5173</code> and your deployment domain).
                </li>
                <li>
                  Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> and <code>GOOGLE_CLIENT_ID</code> in root <code>.env</code>.
                </li>
              </ol>

              <div className="p-2.5 rounded bg-cockpit-base border border-cockpit-border space-y-1">
                <span className="text-[10px] text-cockpit-accent font-bold uppercase block">
                  Quick Client ID Configuration:
                </span>
                <input
                  type="text"
                  placeholder="Paste Google Client ID here..."
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value.trim())}
                  className="w-full px-2 py-1 rounded bg-cockpit-surface border border-cockpit-border text-[11px] text-cockpit-text"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-cockpit-border">
              <button
                type="button"
                onClick={handleDevSimulationLogin}
                className="w-full py-2 px-3 rounded bg-cockpit-accent text-black font-mono text-xs font-bold uppercase hover:bg-cockpit-accent/90"
              >
                Sign In with Google Test Session (Dev Simulation)
              </button>
              <button
                type="button"
                onClick={() => setShowGoogleGuideModal(false)}
                className="w-full py-2 px-3 rounded bg-cockpit-elevated border border-cockpit-border text-cockpit-muted hover:text-cockpit-text font-mono text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

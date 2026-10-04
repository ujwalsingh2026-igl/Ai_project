import React, { useState } from 'react';
import { useAuth } from '../../auth';
import type { AuthProviderType } from '../../types';
import { Modal, Button, Input } from '../ui';
import {
  Globe,
  Mail,
  Smartphone,
  Key,
  AtSign,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { authService } from '../../services/authService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  initialProvider?: AuthProviderType;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  initialProvider = 'google',
}) => {
  const {
    loginWithGoogle,
    loginWithGmail,
    loginWithApple,
    loginWithLiteraId,
    sendPhoneOTP,
    verifyPhoneOTP,
    loginWithSecretCode,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [activeProvider, setActiveProvider] = useState<AuthProviderType>(initialProvider);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [literaHandle, setLiteraHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [secretCodeInput, setSecretCodeInput] = useState('');

  // Status & loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setMode(initialMode);
      setErrorMsg(null);
      setSuccessMsg(null);
      setOtpSent(false);
      setOtpCode('');
    }
  }, [isOpen, initialMode]);

  const handleGoogleAuth = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithGoogle();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Google authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAppleAuth = async () => {
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithApple();
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Apple ID authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your G-mail address.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithGmail(email.trim(), password);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'G-mail sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLiteraIdAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!literaHandle.trim()) {
      setErrorMsg('Please enter a Litera ID handle (e.g. @author).');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithLiteraId(literaHandle.trim(), displayName.trim() || undefined);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Litera ID sign in failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      setErrorMsg('Please enter a valid phone number.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      const res = await sendPhoneOTP(phoneNumber.trim());
      setOtpSent(true);
      setSuccessMsg(`Verification code sent! (Demo OTP: ${res.simulatedOTP})`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send OTP.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setErrorMsg('Please enter the 6-digit OTP.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await verifyPhoneOTP(phoneNumber.trim(), otpCode.trim());
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid OTP code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSecretCodeAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretCodeInput.trim()) {
      setErrorMsg('Please enter a secret vault passcode.');
      return;
    }
    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await loginWithSecretCode(secretCodeInput.trim());
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid secret code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateNewSecretCode = () => {
    const code = authService.generateSecretCode();
    setSecretCodeInput(code);
  };

  const PROVIDERS: Array<{
    id: AuthProviderType;
    label: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    { id: 'google', label: 'Google', icon: <Globe className="w-4 h-4 text-blue-500" /> },
    { id: 'gmail', label: 'G-Mail', icon: <Mail className="w-4 h-4 text-rose-500" /> },
    { id: 'apple', label: 'Apple ID', icon: <span className="text-sm font-bold"></span> },
    { id: 'litera_id', label: 'Litera ID', icon: <AtSign className="w-4 h-4 text-amber-500" />, badge: 'Official' },
    { id: 'phone', label: 'Mobile No', icon: <Smartphone className="w-4 h-4 text-emerald-500" /> },
    { id: 'secret_code', label: 'Secret Code', icon: <Key className="w-4 h-4 text-purple-500" />, badge: 'Vault' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <div className="space-y-5">
        {/* Header Branding & Mode Toggle */}
        <div className="text-center space-y-2 pt-1">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto ring-1 ring-amber-500/20">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-stone-900 dark:text-stone-100">
              {mode === 'signin' ? 'Access Portable Studio' : 'Create Portable Author Account'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto">
              Sync manuscripts seamlessly across desktop, laptop, mobile, and web.
            </p>
          </div>

          {/* Sign In vs Sign Up Pills */}
          <div className="inline-flex p-1 rounded-xl bg-stone-100 dark:bg-stone-800 text-xs font-medium mt-1">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={cn(
                'px-4 py-1.5 rounded-lg transition-all',
                mode === 'signin'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
              }}
              className={cn(
                'px-4 py-1.5 rounded-lg transition-all',
                mode === 'signup'
                  ? 'bg-amber-600 text-white shadow-xs font-semibold'
                  : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              )}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* 6 Authentication Methods Selector */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 p-1 bg-stone-100/70 dark:bg-stone-800/50 rounded-xl">
          {PROVIDERS.map((p) => {
            const isActive = activeProvider === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setActiveProvider(p.id);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={cn(
                  'flex flex-col items-center justify-center p-2 rounded-lg text-[11px] font-medium transition-all relative',
                  isActive
                    ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-xs font-bold ring-1 ring-amber-500/40'
                    : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
                )}
              >
                {p.icon}
                <span className="mt-1 truncate max-w-[55px]">{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error / Success Feedback */}
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Dynamic Form Area Based on Active Provider */}
        <div className="pt-1">
          {/* 1. GOOGLE */}
          {activeProvider === 'google' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-xs text-stone-500">
                {mode === 'signin'
                  ? 'Sign in with your Google Account for single sign-on portability.'
                  : 'Create your portable LITERIA account instantly with Google.'}
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 flex items-center justify-center gap-2 border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
              >
                <Globe className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-xs">
                  {isSubmitting ? 'Authenticating...' : 'Continue with Google'}
                </span>
              </Button>
            </div>
          )}

          {/* 2. G-MAIL */}
          {activeProvider === 'gmail' && (
            <form onSubmit={handleGmailAuth} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  G-mail Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="author@gmail.com"
                  required
                  autoFocus
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Password
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !email.trim()}
                className="w-full py-2.5 text-xs font-semibold"
              >
                {isSubmitting
                  ? 'Verifying...'
                  : mode === 'signin'
                  ? 'Sign In with G-Mail'
                  : 'Sign Up with G-Mail'}
              </Button>
            </form>
          )}

          {/* 3. APPLE ID */}
          {activeProvider === 'apple' && (
            <div className="space-y-4 text-center py-2">
              <p className="text-xs text-stone-500">
                Sign in with Apple ID using Touch ID, Face ID, or your Apple password.
              </p>
              <Button
                type="button"
                variant="primary"
                onClick={handleAppleAuth}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-black hover:bg-stone-900 text-white flex items-center justify-center gap-2"
              >
                <span className="text-base font-bold"></span>
                <span className="font-medium text-xs">
                  {isSubmitting ? 'Authenticating...' : 'Continue with Apple ID'}
                </span>
              </Button>
            </div>
          )}

          {/* 4. LITERA ID */}
          {activeProvider === 'litera_id' && (
            <form onSubmit={handleLiteraIdAuth} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Litera ID Handle (@username)
                </label>
                <Input
                  value={literaHandle}
                  onChange={(e) => setLiteraHandle(e.target.value)}
                  placeholder="@author_name"
                  required
                  autoFocus
                />
              </div>

              {mode === 'signup' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Display Name / Pen Name
                  </label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Evelyn Vance"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                  Password / Passcode
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !literaHandle.trim()}
                className="w-full py-2.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isSubmitting
                  ? 'Connecting...'
                  : mode === 'signin'
                  ? 'Sign In with Litera ID'
                  : 'Create Litera ID (@handle)'}
              </Button>
            </form>
          )}

          {/* 5. MOBILE NO (OTP) */}
          {activeProvider === 'phone' && (
            <div className="space-y-3">
              {!otpSent ? (
                <form onSubmit={handleSendPhoneOTP} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      Mobile Phone Number
                    </label>
                    <Input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 019-2834"
                      required
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !phoneNumber.trim()}
                    className="w-full py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? 'Sending Code...' : 'Send Verification Code (OTP)'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyPhoneOTP} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                      Enter 6-Digit OTP Code
                    </label>
                    <Input
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="123456"
                      maxLength={6}
                      className="font-mono text-center tracking-widest text-base"
                      required
                      autoFocus
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting || !otpCode.trim()}
                    className="w-full py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify OTP & Complete Sign In'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setOtpSent(false)}
                    className="text-[11px] text-stone-500 hover:underline w-full text-center"
                  >
                    ← Change Phone Number
                  </button>
                </form>
              )}
            </div>
          )}

          {/* 6. SECRET CODE */}
          {activeProvider === 'secret_code' && (
            <form onSubmit={handleSecretCodeAuth} className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-stone-700 dark:text-stone-300">
                    Portable Vault Secret Code
                  </label>
                  <button
                    type="button"
                    onClick={generateNewSecretCode}
                    className="text-[11px] text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Code</span>
                  </button>
                </div>
                <Input
                  value={secretCodeInput}
                  onChange={(e) => setSecretCodeInput(e.target.value.toUpperCase())}
                  placeholder="LITERIA-XXXX-XXXX"
                  className="font-mono text-xs tracking-wider uppercase"
                  required
                  autoFocus
                />
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed">
                Secret codes enable 100% anonymous, encrypted access across any device without requiring email or phone numbers.
              </p>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || !secretCodeInput.trim()}
                className="w-full py-2.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white"
              >
                {isSubmitting ? 'Decrypting Vault...' : 'Unlock Vault with Secret Code'}
              </Button>
            </form>
          )}
        </div>

        {/* Footer Security Note */}
        <div className="pt-2 border-t border-stone-200/60 dark:border-stone-800 text-[11px] text-stone-400 text-center flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>End-to-End Encrypted Portable Author Vault</span>
        </div>
      </div>
    </Modal>
  );
};

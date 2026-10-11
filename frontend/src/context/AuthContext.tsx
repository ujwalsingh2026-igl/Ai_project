import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import {
  UserProfile,
  RegisterRequest,
  PasswordResetConfirmRequest,
  PasswordResetResponse,
} from '../api/types';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  currentUser: UserProfile | null;
  isSuperuser: boolean;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<void>;
  googleLogin: (credential: string, rememberMe?: boolean) => Promise<void>;
  register: (payload: RegisterRequest, rememberMe?: boolean) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<PasswordResetResponse>;
  confirmPasswordReset: (payload: PasswordResetConfirmRequest) => Promise<void>;
  verifyEmail: (token: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  updatePreferences: (preferences: Record<string, unknown>) => Promise<void>;
  logout: () => Promise<void>;
  rateLimitWarning: string | null;
  clearRateLimit: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!api.getToken()) {
      setCurrentUser(null);
      return;
    }
    try {
      const profile = await api.getUserProfile();
      setCurrentUser(profile);
    } catch {
      // Fallback if profile fetch fails temporarily
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
    } else {
      setCurrentUser(null);
    }

    const unsubAuth = api.onAuthChange((isAuth) => {
      const currentToken = isAuth ? api.getToken() : null;
      setToken(currentToken);
      if (isAuth) {
        fetchProfile();
      } else {
        setCurrentUser(null);
      }
    });

    const unsubRate = api.onRateLimit((isRateLimited, msg) => {
      if (isRateLimited) {
        setRateLimitWarning(msg || 'Rate limit active. Please slow down.');
      } else {
        setRateLimitWarning(null);
      }
    });

    return () => {
      unsubAuth();
      unsubRate();
    };
  }, []);

  const login = async (identifier: string, pass: string, rememberMe?: boolean) => {
    const res = rememberMe === false ? await api.login(identifier, pass, false) : await api.login(identifier, pass);
    setToken(res.token);
    await fetchProfile();
  };

  const googleLogin = async (credential: string, rememberMe = true) => {
    const res = await api.googleAuth(credential, rememberMe);
    setToken(res.token);
    if (res.user) {
      setCurrentUser(res.user);
    } else {
      await fetchProfile();
    }
  };

  const register = async (payload: RegisterRequest, rememberMe = true) => {
    const res = await api.register(payload, rememberMe);
    setToken(res.token);
    if (res.user) {
      setCurrentUser(res.user);
    } else {
      await fetchProfile();
    }
  };

  const requestPasswordReset = async (email: string) => {
    return api.requestPasswordReset(email);
  };

  const confirmPasswordReset = async (payload: PasswordResetConfirmRequest) => {
    const res = await api.confirmPasswordReset(payload);
    setToken(res.token);
    if (res.user) {
      setCurrentUser(res.user);
    } else {
      await fetchProfile();
    }
  };

  const verifyEmail = async (verificationToken: string) => {
    const res = await api.confirmEmailVerification(verificationToken);
    if (res.user) {
      setCurrentUser(res.user);
    } else {
      await fetchProfile();
    }
  };

  const sendVerificationEmail = async () => {
    await api.sendEmailVerification();
  };

  const updatePreferences = async (prefs: Record<string, unknown>) => {
    await api.updatePreferences(prefs);
    await fetchProfile();
  };

  const logout = async () => {
    await api.logout();
    setToken(null);
    setCurrentUser(null);
  };

  const clearRateLimit = () => {
    setRateLimitWarning(null);
  };

  const isSuperuser = !!(
    currentUser?.is_superuser ||
    currentUser?.role === 'SUPERUSER_ADMIN' ||
    (currentUser?.username && ['ujwalsingh12', 'ujwalsingh123', 'admin'].includes(currentUser.username))
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        currentUser,
        isSuperuser,
        login,
        googleLogin,
        register,
        requestPasswordReset,
        confirmPasswordReset,
        verifyEmail,
        sendVerificationEmail,
        updatePreferences,
        logout,
        rateLimitWarning,
        clearRateLimit,
        refreshProfile: fetchProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

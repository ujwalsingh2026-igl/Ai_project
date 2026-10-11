import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import { UserProfile, RegisterRequest } from '../api/types';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  currentUser: UserProfile | null;
  isSuperuser: boolean;
  login: (username: string, pass: string) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  logout: () => void;
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

  const login = async (username: string, pass: string) => {
    const res = await api.login(username, pass);
    setToken(res.token);
    await fetchProfile();
  };

  const register = async (payload: RegisterRequest) => {
    const res = await api.register(payload);
    setToken(res.token);
    if (res.user) {
      setCurrentUser(res.user);
    } else {
      await fetchProfile();
    }
  };

  const logout = () => {
    api.logout();
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
        register,
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

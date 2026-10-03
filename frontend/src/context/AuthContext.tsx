import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  rateLimitWarning: string | null;
  clearRateLimit: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => api.getToken());
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);

  useEffect(() => {
    const unsubAuth = api.onAuthChange((isAuth) => {
      setToken(isAuth ? api.getToken() : null);
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
  };

  const logout = () => {
    api.logout();
    setToken(null);
  };

  const clearRateLimit = () => {
    setRateLimitWarning(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token,
        token,
        login,
        logout,
        rateLimitWarning,
        clearRateLimit,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

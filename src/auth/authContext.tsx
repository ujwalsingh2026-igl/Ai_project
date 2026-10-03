import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginGuest: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>({
    id: 'local_author',
    email: 'author@local.literia',
    displayName: 'Local Writer',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  const [isLoading] = useState<boolean>(false);

  const loginGuest = () => {
    setUser({
      id: 'local_author',
      email: 'author@local.literia',
      displayName: 'Local Writer',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loginGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

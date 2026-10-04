import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, AuthProviderType } from '../types';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authModalOpen: boolean;
  profileModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  openAuthModal: (defaultMode?: 'signin' | 'signup', defaultProvider?: AuthProviderType) => void;
  
  // Auth actions
  loginWithGoogle: () => Promise<User>;
  loginWithGmail: (email: string, password?: string) => Promise<User>;
  loginWithApple: () => Promise<User>;
  loginWithLiteraId: (handle: string, displayName?: string) => Promise<User>;
  sendPhoneOTP: (phoneNumber: string) => Promise<{ success: boolean; simulatedOTP: string }>;
  verifyPhoneOTP: (phoneNumber: string, otp: string) => Promise<User>;
  loginWithSecretCode: (secretCode: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [profileModalOpen, setProfileModalOpen] = useState<boolean>(false);

  useEffect(() => {
    // Restore session on app load
    const current = authService.getCurrentUser();
    setUser(current);
    setIsLoading(false);
  }, []);

  const openAuthModal = (_mode: 'signin' | 'signup' = 'signin', _provider?: AuthProviderType) => {
    setAuthModalOpen(true);
  };

  const loginWithGoogle = async (): Promise<User> => {
    const newUser = await authService.signInWithGoogle();
    setUser(newUser);
    return newUser;
  };

  const loginWithGmail = async (email: string, password?: string): Promise<User> => {
    const newUser = await authService.signInWithGmail(email, password);
    setUser(newUser);
    return newUser;
  };

  const loginWithApple = async (): Promise<User> => {
    const newUser = await authService.signInWithApple();
    setUser(newUser);
    return newUser;
  };

  const loginWithLiteraId = async (handle: string, displayName?: string): Promise<User> => {
    const newUser = await authService.signInWithLiteraId(handle, displayName);
    setUser(newUser);
    return newUser;
  };

  const sendPhoneOTP = async (phoneNumber: string) => {
    return authService.sendPhoneOTP(phoneNumber);
  };

  const verifyPhoneOTP = async (phoneNumber: string, otp: string): Promise<User> => {
    const newUser = await authService.verifyPhoneOTP(phoneNumber, otp);
    setUser(newUser);
    return newUser;
  };

  const loginWithSecretCode = async (secretCode: string): Promise<User> => {
    const newUser = await authService.signInWithSecretCode(secretCode);
    setUser(newUser);
    return newUser;
  };

  const logout = () => {
    authService.clearSession();
    setUser({
      id: 'local_author',
      displayName: 'Local Author',
      email: 'author@local.literia',
      provider: 'guest',
      isCloudSynced: false,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    setProfileModalOpen(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.provider !== 'guest',
        isLoading,
        authModalOpen,
        profileModalOpen,
        setAuthModalOpen,
        setProfileModalOpen,
        openAuthModal,
        loginWithGoogle,
        loginWithGmail,
        loginWithApple,
        loginWithLiteraId,
        sendPhoneOTP,
        verifyPhoneOTP,
        loginWithSecretCode,
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

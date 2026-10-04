import type { User } from '../types';

const STORAGE_KEY = 'literia_auth_user';
const VAULT_CODE_KEY = 'literia_secret_vault_code';

export class AuthService {
  /**
   * Get currently persisted user session
   */
  getCurrentUser(): User | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load user session:', e);
    }
    // Default guest session for local offline writing
    return {
      id: 'local_author',
      displayName: 'Local Author',
      email: 'author@local.literia',
      provider: 'guest',
      isCloudSynced: false,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Persist user session to localStorage
   */
  saveUserSession(user: User): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to persist user session:', e);
    }
  }

  /**
   * Clear user session (Logout)
   */
  clearSession(): void {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * 1. Google Sign-In / Sign-Up
   */
  async signInWithGoogle(): Promise<User> {
    // Simulated Google OAuth authentication flow
    await new Promise((res) => setTimeout(res, 600));
    const user: User = {
      id: `google_${crypto.randomUUID().slice(0, 8)}`,
      email: 'writer.author@gmail.com',
      displayName: 'Google Author',
      avatarUrl: 'https://lh3.googleusercontent.com/a/default-user',
      avatarColor: '#4285F4',
      provider: 'google',
      isCloudSynced: true,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveUserSession(user);
    return user;
  }

  /**
   * 2. G-Mail Email & Password Sign-In
   */
  async signInWithGmail(email: string, _password?: string): Promise<User> {
    await new Promise((res) => setTimeout(res, 500));
    if (!email.includes('@')) {
      throw new Error('Please enter a valid G-mail address.');
    }
    const namePart = email.split('@')[0];
    const user: User = {
      id: `gmail_${crypto.randomUUID().slice(0, 8)}`,
      email,
      displayName: namePart.charAt(0).toUpperCase() + namePart.slice(1),
      avatarColor: '#EA4335',
      provider: 'gmail',
      isCloudSynced: true,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveUserSession(user);
    return user;
  }

  /**
   * 3. Apple ID Sign-In / Sign-Up
   */
  async signInWithApple(): Promise<User> {
    await new Promise((res) => setTimeout(res, 600));
    const user: User = {
      id: `apple_${crypto.randomUUID().slice(0, 8)}`,
      email: 'author@privaterelay.appleid.com',
      displayName: 'Apple Author',
      avatarColor: '#000000',
      provider: 'apple',
      isCloudSynced: true,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveUserSession(user);
    return user;
  }

  /**
   * 4. Litera ID Sign-In / Sign-Up (@handle)
   */
  async signInWithLiteraId(handle: string, displayName?: string): Promise<User> {
    await new Promise((res) => setTimeout(res, 500));
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    const user: User = {
      id: `litera_${cleanHandle.replace('@', '')}`,
      literaHandle: cleanHandle,
      displayName: displayName || cleanHandle.replace('@', ''),
      email: `${cleanHandle.replace('@', '')}@litera.io`,
      avatarColor: '#D97706', // amber
      provider: 'litera_id',
      isCloudSynced: true,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveUserSession(user);
    return user;
  }

  /**
   * 5. Mobile Phone Number & OTP Verification
   */
  async sendPhoneOTP(phoneNumber: string): Promise<{ success: boolean; simulatedOTP: string }> {
    await new Promise((res) => setTimeout(res, 400));
    if (!phoneNumber || phoneNumber.length < 7) {
      throw new Error('Please enter a valid mobile phone number.');
    }
    return {
      success: true,
      simulatedOTP: '123456',
    };
  }

  async verifyPhoneOTP(phoneNumber: string, otp: string): Promise<User> {
    await new Promise((res) => setTimeout(res, 500));
    if (otp !== '123456' && otp.length !== 6) {
      throw new Error('Invalid OTP code. For demo, enter 123456.');
    }
    const user: User = {
      id: `phone_${phoneNumber.replace(/\D/g, '')}`,
      phoneNumber,
      displayName: `Author (${phoneNumber.slice(-4)})`,
      avatarColor: '#10B981',
      provider: 'phone',
      isCloudSynced: true,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveUserSession(user);
    return user;
  }

  /**
   * 6. Secret Vault Passcode / Recovery Key
   */
  generateSecretCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'LITERIA-';
    for (let i = 0; i < 12; i++) {
      if (i > 0 && i % 4 === 0) code += '-';
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async signInWithSecretCode(secretCode: string): Promise<User> {
    await new Promise((res) => setTimeout(res, 500));
    const cleanCode = secretCode.trim().toUpperCase();
    if (cleanCode.length < 8) {
      throw new Error('Secret code must be a valid 12-character passcode (e.g. LITERIA-XXXX-XXXX).');
    }
    localStorage.setItem(VAULT_CODE_KEY, cleanCode);
    const user: User = {
      id: `secret_${cleanCode.replace(/[^A-Z0-9]/g, '').slice(0, 10)}`,
      displayName: 'Secret Vault Author',
      secretCode: cleanCode,
      avatarColor: '#8B5CF6',
      provider: 'secret_code',
      isCloudSynced: true,
      lastLoginAt: Date.now(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.saveUserSession(user);
    return user;
  }
}

export const authService = new AuthService();

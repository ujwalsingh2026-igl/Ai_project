import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginView } from '../views/LoginView';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../api/client';

describe('Professional Authentication Flow & Interactions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    api.logout();
  });

  it('switches seamlessly between Sign In and Register tabs', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Initial state is Sign In
    expect(screen.getByRole('button', { name: /INITIALIZE SESSION/i })).toBeInTheDocument();

    // Click Register tab
    const registerTab = screen.getByLabelText(/Switch to Register tab/i);
    fireEvent.click(registerTab);

    // Register fields are displayed
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /REGISTER ACCOUNT/i })).toBeInTheDocument();

    // Switch back to Sign In
    const signInTab = screen.getByLabelText(/Switch to Sign In tab/i);
    fireEvent.click(signInTab);

    expect(screen.getByRole('button', { name: /INITIALIZE SESSION/i })).toBeInTheDocument();
  });

  it('toggles password visibility with eye button', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe('password');

    // Click show password button
    const toggleButton = screen.getByLabelText(/Show credential/i);
    fireEvent.click(toggleButton);

    expect(passwordInput.type).toBe('text');

    // Click hide password button
    const hideButton = screen.getByLabelText(/Hide credential/i);
    fireEvent.click(hideButton);

    expect(passwordInput.type).toBe('password');
  });

  it('validates password mismatch on registration', async () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Switch to Register
    fireEvent.click(screen.getByLabelText(/Switch to Register tab/i));

    fireEvent.change(screen.getByLabelText(/Operator Username/i), { target: { value: 'sarah_c' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'sarah@defense.aegis' } });
    fireEvent.change(screen.getByLabelText(/Password \(min 8 chars\)/i), { target: { value: 'Pass1234!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'DifferentPass1234!' } });

    fireEvent.click(screen.getByRole('button', { name: /REGISTER ACCOUNT/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('executes successful registration with full name and credentials', async () => {
    const registerSpy = vi.spyOn(api, 'register').mockResolvedValueOnce({
      message: 'Successfully registered via Email Registration.',
      token: 'token-reg-123',
      user: {
        id: 42,
        username: 'sarah_c',
        email: 'sarah@defense.aegis',
        full_name: 'Sarah Connor',
        is_superuser: false,
        role: 'STANDARD_USER',
        auth_provider: 'email',
        provider_label: 'Email Registration',
        date_joined: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    fireEvent.click(screen.getByLabelText(/Switch to Register tab/i));

    fireEvent.change(screen.getByLabelText(/Full Name/i), { target: { value: 'Sarah Connor' } });
    fireEvent.change(screen.getByLabelText(/Operator Username/i), { target: { value: 'sarah_c' } });
    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: 'sarah@defense.aegis' } });
    fireEvent.change(screen.getByLabelText(/^Password/i), { target: { value: 'Resistance2026!' } });
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), { target: { value: 'Resistance2026!' } });

    fireEvent.click(screen.getByRole('button', { name: /REGISTER ACCOUNT/i }));

    await waitFor(() => {
      expect(registerSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sarah Connor',
          username: 'sarah_c',
          email: 'sarah@defense.aegis',
          password: 'Resistance2026!',
          confirm_password: 'Resistance2026!',
        }),
        true
      );
      expect(screen.getByText(/Account registered successfully!/i)).toBeInTheDocument();
    });
  });

  it('navigates to Forgot Password and dispatches reset request', async () => {
    const resetSpy = vi.spyOn(api, 'requestPasswordReset').mockResolvedValueOnce({
      message: 'If an account with that email exists, password reset instructions have been dispatched.',
      debug_token: 'test-reset-token-xyz',
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Click Forgot Password link
    fireEvent.click(screen.getByRole('button', { name: /Forgot Password\?/i }));

    expect(screen.getByText(/Password Recovery/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Registered Email Address/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Registered Email Address/i), {
      target: { value: 'alex@defense.aegis' },
    });

    fireEvent.click(screen.getByRole('button', { name: /DISPATCH RESET INSTRUCTIONS/i }));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith('alex@defense.aegis');
      expect(screen.getByText(/password reset instructions have been dispatched/i)).toBeInTheDocument();
      expect(screen.getByText(/Enter New Password Now/i)).toBeInTheDocument();
    });
  });

  it('opens Google setup guide when client ID is missing and supports dev simulation', async () => {
    const googleSpy = vi.spyOn(api, 'googleAuth').mockResolvedValueOnce({
      message: 'Successfully authenticated via Google Identity Services.',
      token: 'google-test-token-777',
      user: {
        id: 99,
        username: 'google_operator',
        email: 'operator@gmail.com',
        full_name: 'Google Operator',
        is_superuser: false,
        role: 'STANDARD_USER',
        auth_provider: 'google',
        provider_label: 'Google Sign-In',
        date_joined: new Date().toISOString(),
      },
    });

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    // Click Google button
    const googleBtn = screen.getByRole('button', { name: /Continue with Google/i });
    fireEvent.click(googleBtn);

    // Modal pops up
    expect(screen.getByText(/Google Authentication Setup/i)).toBeInTheDocument();

    // Click dev simulation login button
    const devSimBtn = screen.getByRole('button', { name: /Sign In with Google Test Session/i });
    fireEvent.click(devSimBtn);

    await waitFor(() => {
      expect(googleSpy).toHaveBeenCalledWith(expect.stringContaining('test_google_token:'), true);
    });
  });

  it('manages Remember Workstation persistence checkbox state', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const checkbox = screen.getByLabelText(/Remember this workstation/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(true);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(false);

    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});

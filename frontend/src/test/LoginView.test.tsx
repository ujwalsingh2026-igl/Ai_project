import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginView } from '../views/LoginView';
import { AuthProvider } from '../context/AuthContext';
import { api } from '../api/client';
import { ApiError } from '../api/types';

describe('LoginView Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    api.logout();
  });

  it('renders login fields and targets port 8001 notice', () => {
    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { name: /AEGIS \/\/ AUTHENTICATION/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Operator Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /INITIALIZE SESSION/i })).toBeInTheDocument();
    expect(screen.getByText(/http:\/\/127.0.0.1:8001/i)).toBeInTheDocument();
  });

  it('shows error banner when credentials are empty or invalid', async () => {
    vi.spyOn(api, 'login').mockRejectedValueOnce(
      new ApiError(400, 'invalid_credentials', 'Invalid credentials.')
    );

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    const userInput = screen.getByLabelText(/Operator Username/i);
    const passInput = screen.getByLabelText(/Password/i);
    fireEvent.change(userInput, { target: { value: 'wronguser' } });
    fireEvent.change(passInput, { target: { value: 'badpass' } });

    fireEvent.click(screen.getByRole('button', { name: /INITIALIZE SESSION/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Invalid username or password/i)).toBeInTheDocument();
    });
  });

  it('displays rate limiting warning if HTTP 429 received', async () => {
    vi.spyOn(api, 'login').mockRejectedValueOnce(
      new ApiError(429, 'rate_limited', 'Too many requests.')
    );

    render(
      <AuthProvider>
        <LoginView />
      </AuthProvider>
    );

    fireEvent.change(screen.getByLabelText(/Operator Username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /INITIALIZE SESSION/i }));

    await waitFor(() => {
      expect(screen.getByText(/Too many login attempts/i)).toBeInTheDocument();
    });
  });
});

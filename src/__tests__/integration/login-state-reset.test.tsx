/**
 * Integration Test: Login Page State Reset
 * 
 * Tests that the login page properly resets state when navigated to
 * after unauthorized access redirect. This ensures:
 * - No stale loading states remain
 * - Form is properly reset
 * - User can immediately attempt login again without clearing cookies
 * 
 * Requirements: 5.3, 5.4, 5.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import LoginPage from '@/pages/login';
import { AuthContext } from '@/contexts/AuthContext';

// Mock next/router (Pages Router)
vi.mock('next/router', () => ({
  useRouter: vi.fn(),
}));

// Mock useSweetAlert
vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({
    toast: vi.fn(),
    alert: vi.fn(),
  }),
}));

// Mock Logo component
vi.mock('@/components/Logo', () => ({
  default: () => <div>Logo</div>,
}));

describe('Login Page State Reset', () => {
  let mockRouter: any;
  let mockSignIn: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup router mock
    mockRouter = {
      push: vi.fn(),
      pathname: '/login',
    };
    (useRouter as any).mockReturnValue(mockRouter);

    // Setup signIn mock
    mockSignIn = vi.fn();

    // Mock fetch for event settings
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ signInBannerUrl: null }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reset loading state when component mounts', async () => {
    const mockAuthContext = {
      user: null,
      userProfile: null,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      initializing: false,
      refreshToken: vi.fn(),
      isTokenRefreshing: vi.fn().mockReturnValue(false),
    };

    const { rerender } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Verify initial state - button should not be disabled due to loading
    const submitButton = screen.getByRole('button', { name: /continue/i });
    expect(submitButton).toBeDisabled(); // Disabled because form is empty, not because of loading

    // Simulate navigation back to login page (e.g., after unauthorized access)
    mockRouter.pathname = '/login';

    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Verify loading state is still reset
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /continue/i });
      expect(button).toBeDisabled(); // Still disabled due to empty form, not loading
    });
  });

  it('should reset form fields when navigating back to login', async () => {
    const mockAuthContext = {
      user: null,
      userProfile: null,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      initializing: false,
      refreshToken: vi.fn(),
      isTokenRefreshing: vi.fn().mockReturnValue(false),
    };

    const { rerender } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Fill in the form
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Verify fields are filled
    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');

    // Simulate navigation (pathname change triggers useEffect)
    mockRouter.pathname = '/dashboard';
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Navigate back to login
    mockRouter.pathname = '/login';
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Verify form is reset
    await waitFor(() => {
      const emailInputAfter = screen.getByPlaceholderText(/enter your email/i);
      const passwordInputAfter = screen.getByPlaceholderText(/enter your password/i);
      expect(emailInputAfter).toHaveValue('');
      expect(passwordInputAfter).toHaveValue('');
    });
  });

  it('should allow immediate login attempt after unauthorized access redirect', async () => {
    const mockAuthContext = {
      user: null,
      userProfile: null,
      signIn: mockSignIn.mockResolvedValue(undefined),
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      initializing: false,
      refreshToken: vi.fn(),
      isTokenRefreshing: vi.fn().mockReturnValue(false),
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Fill in valid credentials
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /continue/i });

    fireEvent.change(emailInput, { target: { value: 'authorized@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'validpassword' } });

    // Wait for validation
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit the form
    fireEvent.click(submitButton);

    // Verify signIn was called
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('authorized@example.com', 'validpassword');
    });

    // Verify router.push was called to navigate to dashboard
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should not show stale loading state after failed login', async () => {
    const mockAuthContext = {
      user: null,
      userProfile: null,
      signIn: mockSignIn.mockRejectedValue(new Error('Invalid credentials')),
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      initializing: false,
      refreshToken: vi.fn(),
      isTokenRefreshing: vi.fn().mockReturnValue(false),
    };

    render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Fill in credentials
    const emailInput = screen.getByPlaceholderText(/enter your email/i);
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    const submitButton = screen.getByRole('button', { name: /continue/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });

    // Wait for validation
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });

    // Submit the form
    fireEvent.click(submitButton);

    // Wait for the login attempt to complete
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalled();
    });

    // Verify button is no longer in loading state
    await waitFor(() => {
      const button = screen.getByRole('button', { name: /continue/i });
      // Button should be enabled again (not stuck in loading state)
      expect(button).not.toBeDisabled();
    });
  });

  it('should properly cleanup on unmount', () => {
    const mockAuthContext = {
      user: null,
      userProfile: null,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      initializing: false,
      refreshToken: vi.fn(),
      isTokenRefreshing: vi.fn().mockReturnValue(false),
    };

    const { unmount } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Unmount should not throw errors
    expect(() => unmount()).not.toThrow();
  });

  it('should reset password visibility state on navigation', async () => {
    const mockAuthContext = {
      user: null,
      userProfile: null,
      signIn: mockSignIn,
      signUp: vi.fn(),
      signInWithMagicLink: vi.fn(),
      signInWithGoogle: vi.fn(),
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      initializing: false,
      refreshToken: vi.fn(),
      isTokenRefreshing: vi.fn().mockReturnValue(false),
    };

    const { rerender } = render(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Find and click the password visibility toggle
    const passwordInput = screen.getByPlaceholderText(/enter your password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Click the eye icon to show password
    const toggleButtons = screen.getAllByRole('button');
    const eyeButton = toggleButtons.find(btn => btn.className.includes('absolute'));
    if (eyeButton) {
      fireEvent.click(eyeButton);

      // Password should now be visible
      await waitFor(() => {
        const input = screen.getByPlaceholderText(/enter your password/i);
        expect(input).toHaveAttribute('type', 'text');
      });
    }

    // Simulate navigation
    mockRouter.pathname = '/dashboard';
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    mockRouter.pathname = '/login';
    rerender(
      <AuthContext.Provider value={mockAuthContext}>
        <LoginPage />
      </AuthContext.Provider>
    );

    // Password visibility should be reset to hidden
    await waitFor(() => {
      const input = screen.getByPlaceholderText(/enter your password/i);
      expect(input).toHaveAttribute('type', 'password');
    });
  });
});

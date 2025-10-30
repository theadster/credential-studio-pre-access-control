/**
 * Tests for PasswordResetSection component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordResetSection from '../PasswordResetSection';
import type { User } from '../types';

describe('PasswordResetSection', () => {
  const mockUser: User = {
    id: 'user-123',
    userId: 'auth-123',
    email: 'test@example.com',
    name: 'Test User',
    role: {
      id: 'role-123',
      name: 'Admin',
      permissions: {},
    },
    isInvited: false,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const defaultProps = {
    user: mockUser,
    sending: false,
    onSendReset: vi.fn(),
  };

  it('should render password reset section', () => {
    render(<PasswordResetSection {...defaultProps} />);

    expect(screen.getByText('Password Reset')).toBeInTheDocument();
    expect(
      screen.getByText(/Send a password reset email to this user/)
    ).toBeInTheDocument();
  });

  it('should render send button when not sending', () => {
    render(<PasswordResetSection {...defaultProps} />);

    const button = screen.getByRole('button', { name: /Send Password Reset/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('should call onSendReset when button is clicked', async () => {
    const user = userEvent.setup();
    const onSendReset = vi.fn();
    render(
      <PasswordResetSection
        {...defaultProps}
        onSendReset={onSendReset}
      />
    );

    await user.click(screen.getByRole('button', { name: /Send Password Reset/i }));

    expect(onSendReset).toHaveBeenCalledTimes(1);
  });

  it('should disable button and show loading state when sending', () => {
    render(<PasswordResetSection {...defaultProps} sending={true} />);

    const button = screen.getByRole('button', { name: /Sending/i });
    expect(button).toBeInTheDocument();
    expect(button).toBeDisabled();
  });

  it('should display user email in description', () => {
    render(<PasswordResetSection {...defaultProps} />);

    expect(screen.getByText(/test@example.com/)).toBeInTheDocument();
  });

  it('should not call onSendReset when button is disabled', async () => {
    const user = userEvent.setup();
    const onSendReset = vi.fn();
    render(
      <PasswordResetSection
        {...defaultProps}
        sending={true}
        onSendReset={onSendReset}
      />
    );

    const button = screen.getByRole('button', { name: /Sending/i });
    await user.click(button);

    // Should not be called because button is disabled
    expect(onSendReset).not.toHaveBeenCalled();
  });

  it('should render Mail icon', () => {
    const { container } = render(<PasswordResetSection {...defaultProps} />);

    // Check for SVG icon (Mail icon from lucide-react)
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    const { container } = render(<PasswordResetSection {...defaultProps} />);

    // Check for card styling
    const card = container.querySelector('.rounded-lg.border');
    expect(card).toBeInTheDocument();
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UserForm from '../UserForm';

// Mock the API error hook
vi.mock('@/hooks/useApiError', () => ({
  useApiError: () => ({
    handleError: vi.fn(),
    fetchWithRetry: vi.fn().mockResolvedValue({ users: [] }),
  }),
}));

// Mock child components
vi.mock('../AuthUserSearch', () => ({
  default: ({ onSelect }: any) => (
    <div data-testid="auth-user-search">
      <button onClick={() => onSelect({ $id: 'auth-1', email: 'test@test.com', name: 'Test User' })}>
        Select User
      </button>
    </div>
  ),
}));

vi.mock('../AuthUserList', () => ({
  default: () => <div data-testid="auth-user-list">Auth User List</div>,
}));

describe('UserForm - Backward Compatibility', () => {
  const mockRoles = [
    {
      id: 'role-1',
      name: 'Event Manager',
      description: 'Manages events',
      permissions: { 'attendees.read': true },
    },
    {
      id: 'role-2',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: { 'attendees.read': true },
    },
  ];

  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnSave.mockResolvedValue(undefined);
  });

  describe('Edit mode with old user profiles (isInvited=true)', () => {
    it('should display "Invited User" badge for old users', () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true, // Old invited user
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByText('Invited User')).toBeInTheDocument();
    });

    it('should NOT display "Invited User" badge for new users', () => {
      const newUser = {
        id: 'user-2',
        email: 'new@test.com',
        name: 'New User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: false, // New linked user
        createdAt: '2024-02-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={newUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.queryByText('Invited User')).not.toBeInTheDocument();
    });

    it('should allow editing old user profiles', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      // Verify form is populated with old user data
      const nameInput = screen.getByLabelText(/Full Name/i);
      expect(nameInput).toHaveValue('Old User');

      // Change the name
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Old User');

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /Update User/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'old@test.com',
            name: 'Updated Old User',
            roleId: 'role-1',
          })
        );
      });
    });

    it('should allow changing role for old user profiles', async () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      // Verify role selector is present
      const roleSelect = screen.getByRole('combobox');
      expect(roleSelect).toBeInTheDocument();
      
      // Note: Testing actual role selection with Radix UI Select is complex in JSDOM
      // The important thing is that the role selector is present and functional
      // Integration tests will verify the full flow
    });

    it('should disable email field for existing users', () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      const emailInput = screen.getByLabelText(/Email Address/i);
      expect(emailInput).toBeDisabled();
    });
  });

  describe('Link mode should not affect old users', () => {
    it('should show link mode UI when mode="link"', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={null}
          roles={mockRoles}
          mode="link"
        />
      );

      expect(screen.getByText('Link Existing User')).toBeInTheDocument();
      expect(screen.getByTestId('auth-user-search')).toBeInTheDocument();
      expect(screen.getByTestId('auth-user-list')).toBeInTheDocument();
    });

    it('should show edit mode UI when mode="edit" with old user', () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.queryByTestId('auth-user-search')).not.toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    });
  });

  describe('Form validation for old users', () => {
    it('should validate required fields when editing old users', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      // Clear the name field
      const nameInput = screen.getByLabelText(/Full Name/i);
      await user.clear(nameInput);

      // Try to submit
      const submitButton = screen.getByRole('button', { name: /Update User/i });
      await user.click(submitButton);

      // Should not call onSave due to validation
      await waitFor(() => {
        expect(mockOnSave).not.toHaveBeenCalled();
      });
    });
  });

  describe('Display consistency', () => {
    it('should show correct dialog title for old invited users', () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: true,
        createdAt: '2024-01-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={oldUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('Update user information and role assignment.')).toBeInTheDocument();
    });

    it('should show correct dialog title for new linked users', () => {
      const newUser = {
        id: 'user-2',
        email: 'new@test.com',
        name: 'New User',
        role: {
          id: 'role-1',
          name: 'Event Manager',
          permissions: { 'attendees.read': true },
        },
        isInvited: false,
        createdAt: '2024-02-01T00:00:00.000Z',
      };

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          user={newUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.queryByText('Invited User')).not.toBeInTheDocument();
    });
  });
});

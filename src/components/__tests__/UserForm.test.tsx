import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserForm from '../UserForm';
import { useToast } from '@/components/ui/use-toast';

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock the toast hook
vi.mock('@/components/ui/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

// Mock fetch
global.fetch = vi.fn();

const mockRoles = [
  {
    id: 'role-1',
    name: 'Administrator',
    description: 'Full system access',
    permissions: {},
  },
  {
    id: 'role-2',
    name: 'Staff',
    description: 'Limited access',
    permissions: {},
  },
];

const mockAuthUsers = [
  {
    $id: 'auth-1',
    email: 'test@example.com',
    name: 'Test User',
    $createdAt: '2024-01-01T00:00:00.000Z',
    emailVerification: true,
    phoneVerification: false,
    isLinked: false,
  },
  {
    $id: 'auth-2',
    email: 'linked@example.com',
    name: 'Linked User',
    $createdAt: '2024-01-01T00:00:00.000Z',
    emailVerification: true,
    phoneVerification: false,
    isLinked: true,
  },
];

describe('UserForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        users: mockAuthUsers,
        pagination: {
          page: 1,
          limit: 25,
          total: 2,
          totalPages: 1,
        },
      }),
    });
  });

  describe('Link Mode', () => {
    it('should render link mode with correct title and description', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
          mode="link"
        />
      );

      expect(screen.getByText('Link Existing User')).toBeInTheDocument();
      expect(
        screen.getByText('Search for and select an existing Appwrite auth user to link to your application.')
      ).toBeInTheDocument();
    });

    it('should display auth user search component in link mode', async () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
          mode="link"
        />
      );

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search by email or name')).toBeInTheDocument();
      });
    });

    it('should show validation error when no user is selected', async () => {
      const mockToast = vi.fn();
      (useToast as any).mockReturnValue({ toast: mockToast });

      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
          mode="link"
        />
      );

      const submitButton = screen.getByRole('button', { name: /link user/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Error',
          description: 'Please select a user to link',
        });
      });
    });

    it('should show validation error when no role is selected', async () => {
      const mockToast = vi.fn();
      (useToast as any).mockReturnValue({ toast: mockToast });

      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
          mode="link"
        />
      );

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Select a user
      const userCard = screen.getByText('test@example.com').closest('div');
      if (userCard) {
        fireEvent.click(userCard);
      }

      // Try to submit without selecting a role
      const submitButton = screen.getByRole('button', { name: /link user/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: 'destructive',
          title: 'Error',
          description: 'Please select a role for this user',
        });
      });
    });

    it('should display selected user card when user is selected', async () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
          mode="link"
        />
      );

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Select a user
      const userCard = screen.getByText('test@example.com').closest('div');
      if (userCard) {
        fireEvent.click(userCard);
      }

      // Check for selected user card
      await waitFor(() => {
        expect(screen.getByText('Selected User')).toBeInTheDocument();
      });
    });

    it('should show team membership checkbox when team ID is configured', () => {
      process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID = 'team-123';

      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
          mode="link"
        />
      );

      expect(screen.getByText('Add to project team')).toBeInTheDocument();
      expect(
        screen.getByText('Grant this user access to project resources through team membership')
      ).toBeInTheDocument();

      delete process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
    });

    it('should call onSave with correct data structure in link mode', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          roles={mockRoles}
          mode="link"
        />
      );

      // Wait for users to load
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      // Select a user
      const userCard = screen.getByText('test@example.com').closest('div');
      if (userCard) {
        fireEvent.click(userCard);
      }

      // Select a role
      await waitFor(() => {
        const roleSelect = screen.getByRole('combobox');
        fireEvent.click(roleSelect);
      });

      // Submit form
      const submitButton = screen.getByRole('button', { name: /link user/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith({
          authUserId: 'auth-1',
          roleId: expect.any(String),
          addToTeam: false,
        });
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });

  describe('Edit Mode', () => {
    const mockUser = {
      id: 'user-1',
      email: 'existing@example.com',
      name: 'Existing User',
      role: {
        id: 'role-1',
        name: 'Administrator',
        permissions: {},
      },
      isInvited: false,
      createdAt: '2024-01-01T00:00:00.000Z',
    };

    it('should render edit mode with correct title', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          user={mockUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByText('Update user information and role assignment.')).toBeInTheDocument();
    });

    it('should display traditional form fields in edit mode', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          user={mockUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByText(/role \*/i)).toBeInTheDocument();
    });

    it('should not display auth user search in edit mode', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          user={mockUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.queryByPlaceholderText('Search by email or name')).not.toBeInTheDocument();
    });

    it('should populate form with existing user data', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          user={mockUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      const nameInput = screen.getByLabelText(/full name/i) as HTMLInputElement;

      expect(emailInput.value).toBe('existing@example.com');
      expect(nameInput.value).toBe('Existing User');
    });

    it('should disable email field when editing existing user', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          user={mockUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      expect(emailInput).toBeDisabled();
    });

    it('should show invited user badge when user is invited', () => {
      const invitedUser = { ...mockUser, isInvited: true };

      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          user={invitedUser}
          roles={mockRoles}
          mode="edit"
        />
      );

      expect(screen.getByText('Invited User')).toBeInTheDocument();
    });
  });

  describe('Default Mode Behavior', () => {
    it('should default to edit mode when mode prop is not provided', () => {
      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={vi.fn()}
          roles={mockRoles}
        />
      );

      // Should show traditional form fields (edit mode)
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search by email or name')).not.toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('should show loading state during submission', async () => {
      const mockOnSave = vi.fn().mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(
        <UserForm
          isOpen={true}
          onClose={vi.fn()}
          onSave={mockOnSave}
          roles={mockRoles}
          mode="link"
        />
      );

      // Wait for users to load and select one
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      const userCard = screen.getByText('test@example.com').closest('div');
      if (userCard) {
        fireEvent.click(userCard);
      }

      // Submit form
      const submitButton = screen.getByRole('button', { name: /link user/i });
      fireEvent.click(submitButton);

      // Check for loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /link user/i })).toBeDisabled();
      });
    });

    it('should close dialog after successful submission', async () => {
      const mockOnSave = vi.fn().mockResolvedValue(undefined);
      const mockOnClose = vi.fn();

      render(
        <UserForm
          isOpen={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
          roles={mockRoles}
          mode="link"
        />
      );

      // Wait for users to load and select one
      await waitFor(() => {
        expect(screen.getByText('test@example.com')).toBeInTheDocument();
      });

      const userCard = screen.getByText('test@example.com').closest('div');
      if (userCard) {
        fireEvent.click(userCard);
      }

      // Submit form
      const submitButton = screen.getByRole('button', { name: /link user/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AuthUserList from '../AuthUserList';
import { AppwriteAuthUser } from '../AuthUserSearch';

// Mock the toast hook
const mockToast = vi.fn();
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: mockToast })
}));

// Mock fetch
global.fetch = vi.fn();

describe('AuthUserList', () => {
  const mockUsers: AppwriteAuthUser[] = [
    {
      $id: 'user1',
      email: 'john@example.com',
      name: 'John Doe',
      $createdAt: '2024-01-15T10:00:00.000Z',
      emailVerification: true,
      phoneVerification: false,
      isLinked: false
    },
    {
      $id: 'user2',
      email: 'jane@example.com',
      name: 'Jane Smith',
      $createdAt: '2024-02-20T15:30:00.000Z',
      emailVerification: false,
      phoneVerification: false,
      isLinked: false
    },
    {
      $id: 'user3',
      email: 'linked@example.com',
      name: 'Already Linked User',
      $createdAt: '2024-03-10T08:00:00.000Z',
      emailVerification: true,
      phoneVerification: false,
      isLinked: true
    }
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render list of users with email, name, and creation date', () => {
      render(
        <AuthUserList
          users={mockUsers}
          onSelect={mockOnSelect}
        />
      );

      // Check emails are displayed
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      expect(screen.getByText('linked@example.com')).toBeInTheDocument();

      // Check names are displayed
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Already Linked User')).toBeInTheDocument();

      // Check dates are displayed (formatted)
      expect(screen.getByText(/Created Jan 15, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Created Feb 20, 2024/)).toBeInTheDocument();
      expect(screen.getByText(/Created Mar 10, 2024/)).toBeInTheDocument();
    });

    it('should show loading state when loading prop is true', () => {
      render(
        <AuthUserList
          users={[]}
          onSelect={mockOnSelect}
          loading={true}
        />
      );

      // Should show loading spinner
      const loader = document.querySelector('.animate-spin');
      expect(loader).toBeInTheDocument();
    });

    it('should return null when no users and not loading', () => {
      const { container } = render(
        <AuthUserList
          users={[]}
          onSelect={mockOnSelect}
          loading={false}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Email Verification Status', () => {
    it('should show "Verified" badge for verified users', () => {
      render(
        <AuthUserList
          users={[mockUsers[0]]}
          onSelect={mockOnSelect}
        />
      );

      const verifiedBadges = screen.getAllByText('Verified');
      expect(verifiedBadges.length).toBeGreaterThan(0);
      
      // Check for CheckCircle icon
      const checkIcons = document.querySelectorAll('svg');
      const hasCheckCircle = Array.from(checkIcons).some(icon => 
        icon.classList.contains('lucide-check-circle-2') || 
        icon.parentElement?.textContent?.includes('Verified')
      );
      expect(hasCheckCircle).toBe(true);
    });

    it('should show "Unverified" badge for unverified users', () => {
      render(
        <AuthUserList
          users={[mockUsers[1]]}
          onSelect={mockOnSelect}
        />
      );

      const unverifiedBadges = screen.getAllByText('Unverified');
      expect(unverifiedBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Already Linked Badge', () => {
    it('should show "Already Linked" badge for linked users', () => {
      render(
        <AuthUserList
          users={[mockUsers[2]]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Already Linked')).toBeInTheDocument();
    });

    it('should show "Already Linked" badge for users in linkedUserIds prop', () => {
      render(
        <AuthUserList
          users={[mockUsers[0]]}
          linkedUserIds={['user1']}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Already Linked')).toBeInTheDocument();
    });

    it('should not show "Already Linked" badge for non-linked users', () => {
      render(
        <AuthUserList
          users={[mockUsers[0]]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText('Already Linked')).not.toBeInTheDocument();
    });
  });

  describe('Send Verification Email Button', () => {
    it('should show "Send Verification" button for unverified users', () => {
      render(
        <AuthUserList
          users={[mockUsers[1]]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('Send Verification')).toBeInTheDocument();
    });

    it('should not show "Send Verification" button for verified users', () => {
      render(
        <AuthUserList
          users={[mockUsers[0]]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText('Send Verification')).not.toBeInTheDocument();
    });

    it('should not show "Send Verification" button for linked users', () => {
      render(
        <AuthUserList
          users={[mockUsers[2]]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.queryByText('Send Verification')).not.toBeInTheDocument();
    });

    it('should send verification email when button is clicked', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Verification email sent' })
      });

      render(
        <AuthUserList
          users={[mockUsers[1]]}
          onSelect={mockOnSelect}
        />
      );

      const sendButton = screen.getByText('Send Verification');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/users/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            authUserId: 'user2',
          }),
        });
      });

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          title: "Verification Email Sent",
          description: "Verification email sent to jane@example.com",
        });
      });
    });

    it('should show loading state while sending verification email', async () => {
      (global.fetch as any).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true })
        }), 100))
      );

      render(
        <AuthUserList
          users={[mockUsers[1]]}
          onSelect={mockOnSelect}
        />
      );

      const sendButton = screen.getByText('Send Verification');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });
    });

    it('should handle verification email send errors', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Rate limit exceeded' })
      });

      render(
        <AuthUserList
          users={[mockUsers[1]]}
          onSelect={mockOnSelect}
        />
      );

      const sendButton = screen.getByText('Send Verification');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
          variant: "destructive",
          title: "Failed to Send Email",
          description: "Rate limit exceeded",
        });
      });
    });

    it('should not trigger user selection when clicking send verification button', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

      render(
        <AuthUserList
          users={[mockUsers[1]]}
          onSelect={mockOnSelect}
        />
      );

      const sendButton = screen.getByText('Send Verification');
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(mockOnSelect).not.toHaveBeenCalled();
      });
    });
  });

  describe('User Selection', () => {
    it('should call onSelect when clicking on a user', () => {
      render(
        <AuthUserList
          users={[mockUsers[0]]}
          onSelect={mockOnSelect}
        />
      );

      const userItem = screen.getByText('john@example.com').closest('div');
      fireEvent.click(userItem!);

      expect(mockOnSelect).toHaveBeenCalledWith(mockUsers[0]);
    });

    it('should highlight selected user', () => {
      const { container } = render(
        <AuthUserList
          users={mockUsers}
          selectedUserId="user1"
          onSelect={mockOnSelect}
        />
      );

      // Find the selected user's container (the outermost clickable div)
      const selectedUser = screen.getByText('john@example.com').closest('.p-4');
      expect(selectedUser).toHaveClass('bg-accent');
      expect(selectedUser).toHaveClass('border-l-primary');
    });

    it('should disable selection for already-linked users', () => {
      render(
        <AuthUserList
          users={[mockUsers[2]]}
          onSelect={mockOnSelect}
        />
      );

      const userItem = screen.getByText('linked@example.com').closest('div');
      fireEvent.click(userItem!);

      expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should show disabled styling for linked users', () => {
      render(
        <AuthUserList
          users={[mockUsers[2]]}
          onSelect={mockOnSelect}
        />
      );

      const userItem = screen.getByText('linked@example.com').closest('.p-4');
      expect(userItem).toHaveClass('cursor-not-allowed');
      expect(userItem).toHaveClass('opacity-60');
    });

    it('should show hover effect for non-linked users', () => {
      render(
        <AuthUserList
          users={[mockUsers[0]]}
          onSelect={mockOnSelect}
        />
      );

      const userItem = screen.getByText('john@example.com').closest('.p-4');
      expect(userItem).toHaveClass('hover:bg-accent');
      expect(userItem).toHaveClass('cursor-pointer');
    });
  });

  describe('Edge Cases', () => {
    it('should handle users without names', () => {
      const userWithoutName: AppwriteAuthUser = {
        $id: 'user4',
        email: 'noname@example.com',
        name: '',
        $createdAt: '2024-01-01T00:00:00.000Z',
        emailVerification: false,
        phoneVerification: false,
        isLinked: false
      };

      const { container } = render(
        <AuthUserList
          users={[userWithoutName]}
          onSelect={mockOnSelect}
        />
      );

      expect(screen.getByText('noname@example.com')).toBeInTheDocument();
      // Name paragraph should not be rendered if empty
      const nameParagraphs = container.querySelectorAll('p.text-sm.text-muted-foreground');
      // Should only have the "Created" paragraph, not a name paragraph
      expect(nameParagraphs.length).toBe(0);
    });

    it('should handle multiple users with same verification status', () => {
      const allUnverified = mockUsers.map(u => ({ ...u, emailVerification: false }));

      render(
        <AuthUserList
          users={allUnverified}
          onSelect={mockOnSelect}
        />
      );

      const unverifiedBadges = screen.getAllByText('Unverified');
      expect(unverifiedBadges).toHaveLength(3);
    });

    it('should handle scrollable list with many users', () => {
      const manyUsers = Array.from({ length: 50 }, (_, i) => ({
        $id: `user${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        $createdAt: '2024-01-01T00:00:00.000Z',
        emailVerification: i % 2 === 0,
        phoneVerification: false,
        isLinked: false
      }));

      const { container } = render(
        <AuthUserList
          users={manyUsers}
          onSelect={mockOnSelect}
        />
      );

      // Check that container has max-height and overflow
      const listContainer = container.querySelector('.max-h-\\[400px\\]');
      expect(listContainer).toBeInTheDocument();
      expect(listContainer).toHaveClass('overflow-y-auto');
    });
  });
});

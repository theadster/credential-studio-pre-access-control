import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DeleteUserDialog from '../DeleteUserDialog';

describe('DeleteUserDialog - Backward Compatibility', () => {
  const mockOnClose = vi.fn();
  const mockOnConfirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  describe('Delete old user profiles (isInvited=true)', () => {
    it('should allow full delete of old invited users', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      // Verify dialog is open with user email
      expect(screen.getByText(/old@test.com/i)).toBeInTheDocument();

      // Full delete should be selected by default
      const fullDeleteRadio = screen.getByLabelText(/Full Delete/i);
      expect(fullDeleteRadio).toBeChecked();

      // Click delete button
      const deleteButton = screen.getByRole('button', { name: /Delete User/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(true); // deleteFromAuth = true
      });
    });

    it('should allow unlink only for old invited users', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      // Select unlink option
      const unlinkRadio = screen.getByLabelText(/Unlink Only/i);
      await user.click(unlinkRadio);

      expect(unlinkRadio).toBeChecked();

      // Click unlink button
      const unlinkButton = screen.getByRole('button', { name: /Unlink User/i });
      await user.click(unlinkButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(false); // deleteFromAuth = false
      });
    });

    it('should show appropriate warning for full delete', async () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      expect(
        screen.getByText(/This action cannot be undone/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/all their authentication data will be permanently deleted/i)
      ).toBeInTheDocument();
    });

    it('should show appropriate warning for unlink', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      // Select unlink option
      const unlinkRadio = screen.getByLabelText(/Unlink Only/i);
      await user.click(unlinkRadio);

      expect(
        screen.getByText(/can still log in to their Appwrite account/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/administrator can re-link them later/i)
      ).toBeInTheDocument();
    });
  });

  describe('Delete new user profiles (isInvited=false)', () => {
    it('should work the same for new linked users', async () => {
      const user = userEvent.setup();
      const newUser = {
        id: 'user-2',
        email: 'new@test.com',
        name: 'New User',
        isInvited: false,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={newUser}
        />
      );

      // Verify dialog works the same
      expect(screen.getByText(/new@test.com/i)).toBeInTheDocument();

      const deleteButton = screen.getByRole('button', { name: /Delete User/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(mockOnConfirm).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('Dialog behavior', () => {
    it('should close when cancel is clicked', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should disable buttons while deleting', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      // Make onConfirm take some time
      mockOnConfirm.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /Delete User/i });
      await user.click(deleteButton);

      // Buttons should be disabled during deletion
      expect(deleteButton).toHaveTextContent('Deleting...');
    });

    it('should not render when user is null', () => {
      const { container } = render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={null}
        />
      );

      expect(container).toBeEmptyDOMElement();
    });
  });

  describe('Button text changes based on selection', () => {
    it('should show "Delete User" when full delete is selected', () => {
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      expect(screen.getByRole('button', { name: /Delete User/i })).toBeInTheDocument();
    });

    it('should show "Unlink User" when unlink is selected', async () => {
      const user = userEvent.setup();
      const oldUser = {
        id: 'user-1',
        email: 'old@test.com',
        name: 'Old User',
        isInvited: true,
      };

      render(
        <DeleteUserDialog
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
          user={oldUser}
        />
      );

      const unlinkRadio = screen.getByLabelText(/Unlink Only/i);
      await user.click(unlinkRadio);

      expect(screen.getByRole('button', { name: /Unlink User/i })).toBeInTheDocument();
    });
  });
});

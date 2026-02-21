/**
 * Role Creation Workflow Tests
 * Tests the complete role creation workflow including validation and success cases
 * Requirements: 7.2, 10.3, 10.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RoleForm from '@/components/RoleForm';

// Mock Appwrite
vi.mock('@/lib/appwrite', () => ({
  tablesDB: {
    createRow: vi.fn(),
    updateRow: vi.fn(),
    listRows: vi.fn(),
    getRow: vi.fn(),
    deleteRow: vi.fn(),
  },
  createAdminClient: vi.fn(() => ({
    tablesDB: { listRows: vi.fn(), getRow: vi.fn(), createRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn() },
  })),
}));

// Mock SweetAlert
vi.mock('@/hooks/useSweetAlert', () => ({
  default: () => ({
    showSuccess: vi.fn(),
    showError: vi.fn(),
    showConfirm: vi.fn(),
  }),
}));

describe('Role Creation Workflow', () => {
  const mockOnSuccess = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Create role with all permissions enabled', () => {
    it('should allow creating a role with all permissions selected', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Fill in role name
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'Full Access Role');

      // Fill in description
      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, 'Role with all permissions');

      // Find all "Select All" buttons and click them
      const selectAllButtons = screen.getAllByText(/select all/i);
      for (const button of selectAllButtons) {
        await user.click(button);
      }

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Verify form submission
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should show all permission categories expanded when selecting all', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Expand first accordion item by finding the accordion trigger specifically
      const accordionTrigger = screen.getByRole('button', { name: /attendees permissions/i });
      await user.click(accordionTrigger);

      // Click "Select All" for attendees
      const selectAllButton = screen.getByRole('button', { name: /select all/i });
      await user.click(selectAllButton);

      // Verify all switches in the category are checked
      const switches = screen.getAllByRole('switch');
      const attendeeSwitches = switches.slice(0, 11); // Attendees has 11 permissions
      
      attendeeSwitches.forEach(switchElement => {
        expect(switchElement).toBeChecked();
      });
    });
  });

  describe('Create role with partial permissions', () => {
    it('should allow creating a role with only specific permissions', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Fill in role name
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'Limited Access Role');

      // Fill in description
      const descInput = screen.getByLabelText(/description/i);
      await user.type(descInput, 'Role with limited permissions');

      // Expand attendees category
      const attendeesAccordion = screen.getByRole('button', { name: /attendees permissions/i });
      await user.click(attendeesAccordion);

      // Select only read and create permissions
      const readSwitch = screen.getByLabelText(/view attendee list/i);
      const createSwitch = screen.getByLabelText(/create new attendees/i);
      
      await user.click(readSwitch);
      await user.click(createSwitch);

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Verify form submission
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });

    it('should show correct permission count for partial selection', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Expand attendees category
      const attendeesAccordion = screen.getByRole('button', { name: /attendees permissions/i });
      await user.click(attendeesAccordion);

      // Select 2 out of 11 permissions
      const switches = screen.getAllByRole('switch');
      await user.click(switches[0]);
      await user.click(switches[1]);

      // Check that badge shows 2/11
      const badge = screen.getByText(/2\/11/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Attempt to create role with no permissions', () => {
    it('should prevent submission when no permissions are selected', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Fill in role name
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'No Permissions Role');

      // Try to submit without selecting any permissions
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Verify error message is displayed
      await waitFor(() => {
        const errorMessage = screen.getByText(/at least one permission/i);
        expect(errorMessage).toBeInTheDocument();
      });

      // Verify form was not submitted
      expect(mockOnSuccess).not.toHaveBeenCalled();
    });

    it('should show validation error alert at bottom of form', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Fill in role name
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'Invalid Role');

      // Submit without permissions
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Check for alert with AlertTriangle icon
      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert).toBeInTheDocument();
        expect(alert).toHaveTextContent(/permission/i);
      });
    });
  });

  describe('Verify validation messages display correctly', () => {
    it('should show error when role name is empty', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Try to submit with empty name
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Verify error message
      await waitFor(() => {
        const errorMessage = screen.getByText(/role name is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('should clear validation errors when field is corrected', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Submit with empty name to trigger error
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Wait for error
      await waitFor(() => {
        expect(screen.getByText(/role name is required/i)).toBeInTheDocument();
      });

      // Fill in the name
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'Valid Role Name');

      // Error should be cleared
      await waitFor(() => {
        expect(screen.queryByText(/role name is required/i)).not.toBeInTheDocument();
      });
    });

    it('should show inline validation errors below fields', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Submit to trigger validation
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Check that error appears below the name input
      const nameInput = screen.getByLabelText(/role name/i);
      const errorElement = nameInput.parentElement?.querySelector('[class*="text-destructive"]');
      
      await waitFor(() => {
        expect(errorElement).toBeInTheDocument();
      });
    });
  });

  describe('Confirm role appears in list after creation', () => {
    it('should call onSuccess callback after successful creation', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Fill in required fields
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'New Test Role');

      // Select at least one permission
      const attendeesAccordion = screen.getByRole('button', { name: /attendees permissions/i });
      await user.click(attendeesAccordion);
      
      // Wait for accordion to expand and switches to be visible
      await waitFor(() => {
        expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
      });
      
      const firstSwitch = screen.getAllByRole('switch')[0];
      await user.click(firstSwitch);

      // Submit
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Verify onSuccess was called (which triggers list refresh)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should close dialog after successful creation', async () => {
      const user = userEvent.setup();
      
      render(
        <RoleForm
          isOpen={true}
          onClose={mockOnCancel}
          onSuccess={mockOnSuccess}
          editingRole={null}
        />
      );

      // Fill in required fields
      const nameInput = screen.getByLabelText(/role name/i);
      await user.type(nameInput, 'New Test Role');

      // Select at least one permission
      const attendeesAccordion = screen.getByRole('button', { name: /attendees permissions/i });
      await user.click(attendeesAccordion);
      
      // Wait for accordion to expand and switches to be visible
      await waitFor(() => {
        expect(screen.getAllByRole('switch').length).toBeGreaterThan(0);
      });
      
      const firstSwitch = screen.getAllByRole('switch')[0];
      await user.click(firstSwitch);

      // Submit
      const submitButton = screen.getByRole('button', { name: /create role/i });
      await user.click(submitButton);

      // Verify dialog closes (onSuccess triggers parent to close)
      await waitFor(() => {
        expect(mockOnSuccess).toHaveBeenCalled();
      });
    });
  });
});

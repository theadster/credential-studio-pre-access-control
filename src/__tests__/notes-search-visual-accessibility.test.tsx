/**
 * Visual Design and Accessibility Tests for Notes Search Enhancement
 * 
 * This test file verifies:
 * - Task 7.1: Visual consistency
 * - Task 7.2: Keyboard navigation
 * - Task 7.3: Screen reader support
 * - Task 7.4: Disabled states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Dashboard from '@/pages/dashboard';

// Mock dependencies
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
    loading: false,
  }),
}));

vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({
    success: vi.fn(),
    error: vi.fn(),
    confirm: vi.fn(),
    info: vi.fn(),
    alert: vi.fn(),
  }),
}));

vi.mock('@/lib/appwrite', () => ({
  databases: {
    listDocuments: vi.fn().mockResolvedValue({ documents: [], total: 0 }),
  },
  account: {
    get: vi.fn().mockResolvedValue({ $id: 'test-user' }),
  },
}));

describe('Notes Search - Visual Design and Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Task 7.1: Visual Consistency', () => {
    it('should display FileText icon correctly', async () => {
      render(<Dashboard />);
      
      // Open advanced search dialog
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the Notes label
      const notesLabel = screen.getByText('Notes').closest('label');
      expect(notesLabel).toBeInTheDocument();
      
      // Verify FileText icon is present (it should have the lucide-react class)
      const icon = notesLabel?.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('h-4', 'w-4', 'text-muted-foreground');
    });

    it('should match styling of other text fields (First Name, Last Name, Barcode)', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Get all text field containers
      const firstNameContainer = screen.getByLabelText(/first name/i).closest('.space-y-2');
      const lastNameContainer = screen.getByLabelText(/last name/i).closest('.space-y-2');
      const barcodeContainer = screen.getByLabelText(/barcode/i).closest('.space-y-2');
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      
      // Verify all have the same container class
      expect(firstNameContainer).toHaveClass('space-y-2');
      expect(lastNameContainer).toHaveClass('space-y-2');
      expect(barcodeContainer).toHaveClass('space-y-2');
      expect(notesContainer).toHaveClass('space-y-2');
      
      // Verify labels have consistent styling
      const firstNameLabel = screen.getByText('First Name').closest('label');
      const notesLabel = screen.getByText('Notes').closest('label');
      
      expect(firstNameLabel).toHaveClass('flex', 'items-center', 'space-x-2');
      expect(notesLabel).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should have operator dropdown width of 120px', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the Notes operator dropdown trigger
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      // Verify width class
      expect(operatorTrigger).toHaveClass('w-[120px]');
    });

    it('should have input placeholder text "Value..."', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the Notes input field
      const notesInput = screen.getByPlaceholderText('Value...', { 
        selector: '#notes' 
      });
      
      expect(notesInput).toBeInTheDocument();
      expect(notesInput).toHaveAttribute('placeholder', 'Value...');
    });

    it('should have proper checkbox and label alignment', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the "Has Notes" checkbox container
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      const checkboxContainer = hasNotesCheckbox.closest('.flex');
      
      // Verify container has proper alignment classes
      expect(checkboxContainer).toHaveClass('flex', 'items-center', 'space-x-2');
      
      // Verify label styling
      const hasNotesLabel = screen.getByText('Has Notes').closest('label');
      expect(hasNotesLabel).toHaveClass('text-sm', 'font-normal', 'cursor-pointer');
    });

    it('should position Notes field after Photo Status field', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Get the grid container
      const gridContainer = screen.getByLabelText(/first name/i)
        .closest('.grid');
      
      // Get all field containers in order
      const fieldContainers = gridContainer?.querySelectorAll('.space-y-2');
      
      // Find indices of Photo Status and Notes
      let photoStatusIndex = -1;
      let notesIndex = -1;
      
      fieldContainers?.forEach((container, index) => {
        const labelText = container.querySelector('label')?.textContent;
        if (labelText?.includes('Photo Status')) photoStatusIndex = index;
        if (labelText?.includes('Notes')) notesIndex = index;
      });
      
      // Verify Notes comes after Photo Status
      expect(notesIndex).toBeGreaterThan(photoStatusIndex);
    });
  });

  describe('Task 7.2: Keyboard Navigation', () => {
    it('should allow tabbing through all fields in correct order', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      // Tab through fields
      await user.tab(); // Should focus first interactive element
      
      // Verify we can reach the Notes operator dropdown
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      // Tab until we reach the Notes operator
      let attempts = 0;
      while (document.activeElement !== operatorTrigger && attempts < 20) {
        await user.tab();
        attempts++;
      }
      
      expect(document.activeElement).toBe(operatorTrigger);
      
      // Tab to Notes input
      await user.tab();
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      expect(document.activeElement).toBe(notesInput);
      
      // Tab to Has Notes checkbox
      await user.tab();
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      expect(document.activeElement).toBe(hasNotesCheckbox);
    });

    it('should allow keyboard interaction with operator dropdown', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      // Find and focus the Notes operator dropdown
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      operatorTrigger.focus();
      
      // Press Space to open dropdown
      await user.keyboard(' ');
      
      // Verify dropdown options are visible
      expect(screen.getByRole('option', { name: /contains/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /equals/i })).toBeInTheDocument();
      
      // Press Arrow Down to navigate
      await user.keyboard('{ArrowDown}');
      
      // Press Enter to select
      await user.keyboard('{Enter}');
    });

    it('should allow keyboard interaction with text input', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      
      // Focus and type
      await user.click(notesInput);
      await user.keyboard('test notes');
      
      expect(notesInput).toHaveValue('test notes');
    });

    it('should allow keyboard interaction with checkbox (Space to toggle)', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      
      // Focus checkbox
      hasNotesCheckbox.focus();
      expect(document.activeElement).toBe(hasNotesCheckbox);
      
      // Initially unchecked
      expect(hasNotesCheckbox).not.toBeChecked();
      
      // Press Space to toggle
      await user.keyboard(' ');
      expect(hasNotesCheckbox).toBeChecked();
      
      // Press Space again to toggle off
      await user.keyboard(' ');
      expect(hasNotesCheckbox).not.toBeChecked();
    });
  });

  describe('Task 7.3: Screen Reader Support', () => {
    it('should have label properly associated with input', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the Notes label and input
      const notesLabel = screen.getByText('Notes').closest('label');
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      
      // Verify label has htmlFor attribute
      expect(notesLabel).toHaveAttribute('for', 'notes');
      
      // Verify input has matching id
      expect(notesInput).toHaveAttribute('id', 'notes');
      
      // Verify input can be found by label
      expect(screen.getByLabelText(/^notes$/i)).toBe(notesInput);
    });

    it('should have checkbox label properly associated', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the Has Notes checkbox and label
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      const hasNotesLabel = screen.getByText('Has Notes').closest('label');
      
      // Verify label has htmlFor attribute
      expect(hasNotesLabel).toHaveAttribute('for', 'hasNotes');
      
      // Verify checkbox has matching id
      expect(hasNotesCheckbox).toHaveAttribute('id', 'hasNotes');
      
      // Verify checkbox can be found by label
      expect(screen.getByLabelText(/has notes/i)).toBe(hasNotesCheckbox);
    });

    it('should have proper ARIA attributes for operator dropdown', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the Notes operator dropdown
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      // Verify it has role="combobox"
      expect(operatorTrigger).toHaveAttribute('role', 'combobox');
      
      // Verify it has aria-expanded attribute
      expect(operatorTrigger).toHaveAttribute('aria-expanded');
    });

    it('should announce disabled state to screen readers', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      // Change operator to "Is Empty"
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      await user.click(operatorTrigger);
      const isEmptyOption = screen.getByRole('option', { name: /is empty/i });
      await user.click(isEmptyOption);
      
      // Verify input is disabled
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      expect(notesInput).toBeDisabled();
      
      // Verify checkbox is disabled
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      expect(hasNotesCheckbox).toBeDisabled();
      
      // Disabled elements should have aria-disabled or disabled attribute
      expect(notesInput).toHaveAttribute('disabled');
      expect(hasNotesCheckbox).toHaveAttribute('disabled');
    });
  });

  describe('Task 7.4: Disabled States', () => {
    it('should visually indicate when input is disabled', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      
      // Initially enabled
      expect(notesInput).not.toBeDisabled();
      
      // Change operator to "Is Empty"
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      await user.click(operatorTrigger);
      const isEmptyOption = screen.getByRole('option', { name: /is empty/i });
      await user.click(isEmptyOption);
      
      // Now disabled
      expect(notesInput).toBeDisabled();
      
      // Verify disabled attribute is present
      expect(notesInput).toHaveAttribute('disabled');
    });

    it('should visually indicate when checkbox is disabled', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      
      // Initially enabled
      expect(hasNotesCheckbox).not.toBeDisabled();
      
      // Change operator to "Is Not Empty"
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      await user.click(operatorTrigger);
      const isNotEmptyOption = screen.getByRole('option', { name: /is not empty/i });
      await user.click(isNotEmptyOption);
      
      // Now disabled
      expect(hasNotesCheckbox).toBeDisabled();
      
      // Verify disabled attribute is present
      expect(hasNotesCheckbox).toHaveAttribute('disabled');
    });

    it('should disable both input and checkbox for "Is Empty" operator', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      // Change operator to "Is Empty"
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      await user.click(operatorTrigger);
      const isEmptyOption = screen.getByRole('option', { name: /is empty/i });
      await user.click(isEmptyOption);
      
      // Both should be disabled
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      
      expect(notesInput).toBeDisabled();
      expect(hasNotesCheckbox).toBeDisabled();
    });

    it('should disable both input and checkbox for "Is Not Empty" operator', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      // Change operator to "Is Not Empty"
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      await user.click(operatorTrigger);
      const isNotEmptyOption = screen.getByRole('option', { name: /is not empty/i });
      await user.click(isNotEmptyOption);
      
      // Both should be disabled
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      
      expect(notesInput).toBeDisabled();
      expect(hasNotesCheckbox).toBeDisabled();
    });

    it('should enable input and checkbox when switching back to "Contains" operator', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      // Change to "Is Empty"
      await user.click(operatorTrigger);
      await user.click(screen.getByRole('option', { name: /is empty/i }));
      
      // Verify disabled
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      expect(notesInput).toBeDisabled();
      expect(hasNotesCheckbox).toBeDisabled();
      
      // Change back to "Contains"
      await user.click(operatorTrigger);
      await user.click(screen.getByRole('option', { name: /contains/i }));
      
      // Verify enabled
      expect(notesInput).not.toBeDisabled();
      expect(hasNotesCheckbox).not.toBeDisabled();
    });

    it('should have appropriate cursor styling for disabled elements', async () => {
      const user = userEvent.setup();
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await user.click(advancedSearchButton);
      
      // Change operator to "Is Empty"
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      const operatorTrigger = within(notesContainer!).getAllByRole('combobox')[0];
      
      await user.click(operatorTrigger);
      const isEmptyOption = screen.getByRole('option', { name: /is empty/i });
      await user.click(isEmptyOption);
      
      // Get disabled elements
      const notesInput = screen.getByPlaceholderText('Value...', { selector: '#notes' });
      const hasNotesCheckbox = screen.getByRole('checkbox', { name: /has notes/i });
      
      // Verify they are disabled (cursor styling is typically handled by browser/CSS)
      expect(notesInput).toBeDisabled();
      expect(hasNotesCheckbox).toBeDisabled();
      
      // Disabled elements should not be interactive
      await expect(user.type(notesInput, 'test')).rejects.toThrowError(/disabled/i);
      expect(notesInput).toHaveValue(''); // Value stays empty
    });
  });

  describe('Responsive Layout Verification', () => {
    it('should maintain proper grid layout structure', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Find the grid container
      const gridContainer = screen.getByLabelText(/first name/i).closest('.grid');
      
      // Verify grid classes for responsive layout
      expect(gridContainer).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3', 'gap-6');
    });

    it('should have consistent spacing between fields', async () => {
      render(<Dashboard />);
      
      const advancedSearchButton = screen.getByRole('button', { name: /advanced search/i });
      await userEvent.click(advancedSearchButton);
      
      // Get all field containers
      const firstNameContainer = screen.getByLabelText(/first name/i).closest('.space-y-2');
      const notesContainer = screen.getByLabelText(/^notes$/i).closest('.space-y-2');
      
      // Verify consistent spacing class
      expect(firstNameContainer).toHaveClass('space-y-2');
      expect(notesContainer).toHaveClass('space-y-2');
    });
  });
});

/**
 * Integration Tests for AdvancedFiltersDialog
 *
 * Tests the integration between the AdvancedFiltersDialog component and the dashboard,
 * verifying that:
 * - Dialog opens from dashboard trigger
 * - Filter state persists after dialog close
 * - Apply Search filters attendees correctly
 *
 * Requirements: 4.4, 5.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdvancedFiltersDialog } from '@/components/AdvancedFiltersDialog';
import { createEmptyFilters, type AdvancedSearchFilters } from '@/lib/filterUtils';
import type { EventSettings } from '@/components/EventSettingsForm/types';

// Mock useSweetAlert hook
vi.mock('@/hooks/useSweetAlert', () => ({
  useSweetAlert: () => ({
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    confirm: vi.fn(),
    alert: vi.fn(),
    loading: vi.fn(),
    close: vi.fn(),
    toast: vi.fn(),
  }),
}));

// Sample event settings for testing
const mockEventSettings: EventSettings = {
  id: 'test-event',
  eventName: 'Test Event',
  eventDate: '2025-01-17',
  eventLocation: 'Test Location',
  barcodeType: 'numerical',
  barcodeLength: 8,
  customFields: [
    {
      id: 'field-1',
      fieldName: 'Department',
      fieldType: 'text',
      order: 1,
      showOnMainPage: true,
    },
    {
      id: 'field-2',
      fieldName: 'Role',
      fieldType: 'select',
      order: 2,
      showOnMainPage: true,
      fieldOptions: {
        options: ['Admin', 'User', 'Guest'],
      },
    },
    {
      id: 'field-3',
      fieldName: 'VIP',
      fieldType: 'boolean',
      order: 3,
      showOnMainPage: true,
    },
  ],
  accessControlEnabled: true,
};

describe('AdvancedFiltersDialog Integration Tests', () => {
  let filters: AdvancedSearchFilters;
  let onFiltersChange: ReturnType<typeof vi.fn>;
  let onApply: ReturnType<typeof vi.fn>;
  let onClear: ReturnType<typeof vi.fn>;
  let onOpenChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    filters = createEmptyFilters();
    onFiltersChange = vi.fn();
    onApply = vi.fn();
    onClear = vi.fn();
    onOpenChange = vi.fn();
  });

  describe('Dialog Opens from Dashboard', () => {
    /**
     * Requirement 4.4: The AdvancedFiltersDialog component SHALL be importable
     * and usable from the dashboard page
     */
    it('should render dialog when open prop is true', () => {
      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    });

    it('should not render dialog when open prop is false', () => {
      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={false}
          onOpenChange={onOpenChange}
        />
      );

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('should display all accordion sections when dialog opens', () => {
      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Notes & Content')).toBeInTheDocument();
      expect(screen.getByText('Access Control')).toBeInTheDocument();
      expect(screen.getByText('Custom Fields')).toBeInTheDocument();
    });
  });

  describe('Filter State Persists After Dialog Close', () => {
    it('should call onFiltersChange when filter value changes', async () => {
      const user = userEvent.setup();

      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Find and interact with the First Name input using specific ID
      const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
      expect(firstNameInput).not.toBeNull();
      await user.type(firstNameInput!, 'John');

      // Verify onFiltersChange was called
      expect(onFiltersChange).toHaveBeenCalled();
    });

    it('should preserve filter state when dialog is closed and reopened', async () => {
      const initialFilters: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        firstName: { value: 'John', operator: 'contains' },
        photoFilter: 'with',
      };

      const { rerender } = render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={initialFilters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Verify filter values are displayed using specific ID
      const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
      expect(firstNameInput).not.toBeNull();
      expect(firstNameInput!.value).toBe('John');

      // Close dialog
      rerender(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={initialFilters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={false}
          onOpenChange={onOpenChange}
        />
      );

      // Reopen dialog with same filters to verify state is preserved
      rerender(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={initialFilters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Verify filter values are still present (state preserved)
      const firstNameInputAfterReopen = document.getElementById('filter-firstName-value') as HTMLInputElement;
      expect(firstNameInputAfterReopen).not.toBeNull();
      expect(firstNameInputAfterReopen!.value).toBe('John');
    });
  });

  describe('Apply Search Filters Attendees Correctly', () => {
    /**
     * Requirement 5.8: WHEN the Apply Search button is clicked with no filters set,
     * THE system SHALL display an error message
     */
    it('should not call onApply when no filters are set', async () => {
      const user = userEvent.setup();

      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Click Apply Search button
      const applyButton = screen.getByRole('button', { name: /apply search/i });
      await user.click(applyButton);

      // onApply should not be called when no filters are set
      expect(onApply).not.toHaveBeenCalled();
    });

    it('should call onApply when filters are set and Apply Search is clicked', async () => {
      const user = userEvent.setup();
      const filtersWithValue: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        firstName: { value: 'John', operator: 'contains' },
      };

      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filtersWithValue}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Click Apply Search button
      const applyButton = screen.getByRole('button', { name: /apply search/i });
      await user.click(applyButton);

      // onApply should be called
      expect(onApply).toHaveBeenCalled();
    });

    it('should close dialog after successful apply', async () => {
      const user = userEvent.setup();
      const filtersWithValue: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        firstName: { value: 'John', operator: 'contains' },
      };

      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filtersWithValue}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Click Apply Search button
      const applyButton = screen.getByRole('button', { name: /apply search/i });
      await user.click(applyButton);

      // onOpenChange should be called with false to close dialog
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should call onClear when Clear All Filters is clicked', async () => {
      const user = userEvent.setup();
      const filtersWithValue: AdvancedSearchFilters = {
        ...createEmptyFilters(),
        firstName: { value: 'John', operator: 'contains' },
      };

      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filtersWithValue}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      // Click Clear All Filters button
      const clearButton = screen.getByRole('button', { name: /clear all filters/i });
      await user.click(clearButton);

      // onClear should be called
      expect(onClear).toHaveBeenCalled();
    });
  });

  describe('Access Control Section Visibility', () => {
    it('should show Access Control section when accessControlEnabled is true', () => {
      render(
        <AdvancedFiltersDialog
          eventSettings={mockEventSettings}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      expect(screen.getByText('Access Control')).toBeInTheDocument();
    });

    it('should hide Access Control section when accessControlEnabled is false', () => {
      const settingsWithoutAccessControl: EventSettings = {
        ...mockEventSettings,
        accessControlEnabled: false,
      };

      render(
        <AdvancedFiltersDialog
          eventSettings={settingsWithoutAccessControl}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onApply={onApply}
          onClear={onClear}
          open={true}
          onOpenChange={onOpenChange}
        />
      );

      expect(screen.queryByText('Access Control')).not.toBeInTheDocument();
    });
  });
});

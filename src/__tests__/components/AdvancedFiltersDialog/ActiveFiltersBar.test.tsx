/**
 * Unit Tests for ActiveFiltersBar Component
 *
 * Tests chip rendering, removal callbacks, Clear All functionality,
 * and visibility behavior.
 *
 * Requirements tested:
 * - 2.1: Display Active_Filters_Bar when one or more filters are active
 * - 2.3: Clear filter immediately when remove button clicked
 * - 2.5: Hide bar when all filters are cleared
 * - 2.6: Include Clear All button to remove all filters at once
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveFiltersBar } from '@/components/AdvancedFiltersDialog/ActiveFiltersBar';
import { createEmptyFilters, type AdvancedSearchFilters } from '@/lib/filterUtils';
import type { EventSettings } from '@/components/EventSettingsForm/types';

// Mock event settings for tests
const mockEventSettings: EventSettings = {
  eventName: 'Test Event',
  eventDate: '2025-01-16',
  eventLocation: 'Test Location',
  timeZone: 'UTC',
  barcodeType: 'numerical',
  barcodeLength: 8,
  barcodeUnique: true,
  accessControlEnabled: true,
  customFields: [
    {
      id: 'cf-1',
      fieldName: 'Department',
      fieldType: 'select',
      required: false,
      order: 0,
      fieldOptions: { options: ['Engineering', 'Marketing', 'Sales'] },
    },
    {
      id: 'cf-2',
      fieldName: 'VIP Status',
      fieldType: 'boolean',
      required: false,
      order: 1,
    },
  ],
};

// Helper to create filters with specific values
function createFiltersWithValues(
  overrides: Partial<AdvancedSearchFilters>
): AdvancedSearchFilters {
  return {
    ...createEmptyFilters(),
    ...overrides,
  };
}

describe('ActiveFiltersBar', () => {
  describe('Visibility (Requirement 2.5)', () => {
    it('should not render when no filters are active', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      const { container } = render(
        <ActiveFiltersBar
          filters={createEmptyFilters()}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      // Component should return null, so container should be empty
      expect(container.firstChild).toBeNull();
    });

    it('should render when firstName filter is active', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('First Name:')).toBeInTheDocument();
      expect(screen.getByText('John')).toBeInTheDocument();
    });

    it('should render when photoFilter is not "all"', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            photoFilter: 'with',
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Photo:')).toBeInTheDocument();
      expect(screen.getByText('With Photo')).toBeInTheDocument();
    });
  });

  describe('Chip Rendering (Requirement 2.1)', () => {
    it('should render chips for multiple active filters', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
            lastName: { value: 'Doe', operator: 'equals' },
            photoFilter: 'without',
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('First Name:')).toBeInTheDocument();
      expect(screen.getByText('Last Name:')).toBeInTheDocument();
      expect(screen.getByText('Photo:')).toBeInTheDocument();
    });

    it('should render chip for notes filter', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            notes: { value: 'important', operator: 'contains', hasNotes: false },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Notes:')).toBeInTheDocument();
      expect(screen.getByText('important')).toBeInTheDocument();
    });

    it('should render chip for hasNotes filter', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            notes: { value: '', operator: 'contains', hasNotes: true },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Has Notes:')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('should render chip for access status filter', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            accessControl: {
              accessStatus: 'active',
              validFromStart: '',
              validFromEnd: '',
              validUntilStart: '',
              validUntilEnd: '',
            },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Access Status:')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should render chip for custom field filter', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            customFields: {
              'cf-1': { value: 'Engineering', operator: 'equals' },
            },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Department:')).toBeInTheDocument();
    });

    it('should render chip for isEmpty operator', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            barcode: { value: '', operator: 'isEmpty' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Barcode:')).toBeInTheDocument();
      expect(screen.getByText('is empty')).toBeInTheDocument();
    });
  });

  describe('Chip Removal (Requirement 2.3)', () => {
    it('should call onRemoveFilter when chip remove button is clicked', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove first name filter/i });
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledTimes(1);
      expect(onRemoveFilter).toHaveBeenCalledWith('firstName', undefined);
    });

    it('should call onRemoveFilter with customFieldId for custom field chips', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            customFields: {
              'cf-1': { value: 'Engineering', operator: 'equals' },
            },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove department filter/i });
      fireEvent.click(removeButton);

      expect(onRemoveFilter).toHaveBeenCalledTimes(1);
      expect(onRemoveFilter).toHaveBeenCalledWith('customField', 'cf-1');
    });

    it('should have accessible labels on remove buttons', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
            lastName: { value: 'Doe', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByRole('button', { name: /remove first name filter/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove last name filter/i })).toBeInTheDocument();
    });
  });

  describe('Clear All (Requirement 2.6)', () => {
    it('should render Clear All button when filters are active', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByRole('button', { name: /clear all/i })).toBeInTheDocument();
    });

    it('should call onClearAll when Clear All button is clicked', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
            lastName: { value: 'Doe', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      fireEvent.click(clearAllButton);

      expect(onClearAll).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have aria-live region for screen reader announcements', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
            lastName: { value: 'Doe', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      // Check for aria-live region
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion).toHaveTextContent('2 active filters');
    });

    it('should announce singular filter correctly', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toHaveTextContent('1 active filter');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null eventSettings gracefully', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            firstName: { value: 'John', operator: 'contains' },
          })}
          eventSettings={null}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('First Name:')).toBeInTheDocument();
    });

    it('should handle custom field with unknown ID', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            customFields: {
              'unknown-field': { value: 'test', operator: 'contains' },
            },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      // Should fall back to field ID as label
      expect(screen.getByText('unknown-field:')).toBeInTheDocument();
    });

    it('should handle date range filters', () => {
      const onRemoveFilter = vi.fn();
      const onClearAll = vi.fn();

      render(
        <ActiveFiltersBar
          filters={createFiltersWithValues({
            accessControl: {
              accessStatus: 'all',
              validFromStart: '2025-01-01',
              validFromEnd: '2025-01-31',
              validUntilStart: '',
              validUntilEnd: '',
            },
          })}
          eventSettings={mockEventSettings}
          onRemoveFilter={onRemoveFilter}
          onClearAll={onClearAll}
        />
      );

      expect(screen.getByText('Valid From:')).toBeInTheDocument();
      expect(screen.getByText('2025-01-01 - 2025-01-31')).toBeInTheDocument();
    });
  });
});

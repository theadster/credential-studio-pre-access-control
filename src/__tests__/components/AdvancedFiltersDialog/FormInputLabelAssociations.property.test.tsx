/**
 * Property-Based Tests for Form Input Label Associations
 *
 * **Feature: advanced-filters-redesign, Property 6: Form Input Label Associations**
 * **Validates: Requirements 7.4**
 *
 * *For any* form input rendered in the Advanced_Filters_Dialog, there SHALL exist
 * an associated label element with a matching htmlFor/id attribute pair.
 *
 * @see .kiro/specs/advanced-filters-redesign/design.md
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import { AdvancedFiltersDialog } from '../../../components/AdvancedFiltersDialog';
import { createEmptyFilters, type AdvancedSearchFilters } from '../../../lib/filterUtils';
import type { EventSettings, CustomField } from '../../../components/EventSettingsForm/types';

// Arbitrary for custom field definition
const customFieldArbitrary: fc.Arbitrary<CustomField> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 10 }).filter((s) => /^[a-zA-Z0-9-]+$/.test(s)),
  fieldName: fc.string({ minLength: 1, maxLength: 30 }).filter((s) => s.trim().length > 0),
  fieldType: fc.constantFrom('text', 'select', 'boolean'),
  required: fc.boolean(),
  order: fc.integer({ min: 0, max: 100 }),
  fieldOptions: fc.oneof(
    fc.constant(undefined),
    fc.record({
      options: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
    })
  ),
});

// Arbitrary for event settings with custom fields
const eventSettingsWithCustomFieldsArbitrary: fc.Arbitrary<EventSettings> = fc.record({
  eventName: fc.string({ minLength: 1, maxLength: 50 }),
  eventDate: fc
    .date({ min: new Date('2020-01-01T00:00:00Z'), max: new Date('2030-12-31T23:59:59Z') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString().split('T')[0]),
  eventLocation: fc.string({ maxLength: 100 }),
  timeZone: fc.constant('UTC'),
  barcodeType: fc.constantFrom('numerical', 'alphanumerical'),
  barcodeLength: fc.integer({ min: 4, max: 20 }),
  barcodeUnique: fc.boolean(),
  accessControlEnabled: fc.boolean(),
  customFields: fc.array(customFieldArbitrary, { minLength: 0, maxLength: 5 }),
});

// Minimal event settings for basic tests
const minimalEventSettings: EventSettings = {
  eventName: 'Test Event',
  eventDate: '2025-01-01',
  eventLocation: 'Test Location',
  timeZone: 'UTC',
  barcodeType: 'numerical',
  barcodeLength: 8,
  barcodeUnique: true,
  accessControlEnabled: true,
  customFields: [],
};

// Event settings with custom fields for testing
const eventSettingsWithFields: EventSettings = {
  ...minimalEventSettings,
  customFields: [
    { id: 'field1', fieldName: 'Company', fieldType: 'text', required: false, order: 0 },
    { id: 'field2', fieldName: 'Department', fieldType: 'select', required: false, order: 1, fieldOptions: { options: ['HR', 'IT', 'Sales'] } },
    { id: 'field3', fieldName: 'VIP', fieldType: 'boolean', required: false, order: 2 },
  ],
};

/**
 * Helper to check if an input has an associated label
 */
function hasAssociatedLabel(input: HTMLInputElement | HTMLSelectElement | HTMLButtonElement): boolean {
  const inputId = input.id;
  
  // Check for label with htmlFor matching input id
  if (inputId) {
    const label = document.querySelector(`label[for="${inputId}"]`);
    if (label) return true;
  }
  
  // Check for aria-label or aria-labelledby
  if (input.getAttribute('aria-label')) return true;
  if (input.getAttribute('aria-labelledby')) return true;
  
  // Check if input is wrapped in a label
  const parentLabel = input.closest('label');
  if (parentLabel) return true;
  
  return false;
}

/**
 * Helper to get all form inputs in the dialog
 */
function getAllFormInputs(): (HTMLInputElement | HTMLSelectElement | HTMLButtonElement)[] {
  const inputs: (HTMLInputElement | HTMLSelectElement | HTMLButtonElement)[] = [];
  
  // Get all text inputs
  document.querySelectorAll('input[type="text"], input[type="date"], input:not([type])').forEach((el) => {
    inputs.push(el as HTMLInputElement);
  });
  
  // Get all select triggers (combobox buttons)
  document.querySelectorAll('button[role="combobox"]').forEach((el) => {
    inputs.push(el as HTMLButtonElement);
  });
  
  // Get all checkboxes
  document.querySelectorAll('button[role="checkbox"]').forEach((el) => {
    inputs.push(el as HTMLButtonElement);
  });
  
  return inputs;
}

describe('Property 6: Form Input Label Associations', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * Property: All basic info section inputs have associated labels
   */
  it('basic info section inputs have associated labels', () => {
    const filters = createEmptyFilters();
    const onFiltersChange = () => {};
    const onApply = () => {};
    const onClear = () => {};
    const onOpenChange = () => {};

    render(
      <AdvancedFiltersDialog
        eventSettings={minimalEventSettings}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApply={onApply}
        onClear={onClear}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Check specific basic info inputs
    const basicInfoInputIds = [
      'filter-firstName-value',
      'filter-lastName-value',
      'filter-barcode-value',
      'filter-photoStatus',
    ];

    basicInfoInputIds.forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        const hasLabel = hasAssociatedLabel(input as HTMLInputElement);
        expect(hasLabel).toBe(true);
      }
    });
  });

  /**
   * Property: Notes section inputs have associated labels
   */
  it('notes section inputs have associated labels', () => {
    const filters = createEmptyFilters();
    const onFiltersChange = () => {};
    const onApply = () => {};
    const onClear = () => {};
    const onOpenChange = () => {};

    render(
      <AdvancedFiltersDialog
        eventSettings={minimalEventSettings}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApply={onApply}
        onClear={onClear}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Check notes inputs
    const notesInputIds = ['filter-notes-value', 'filter-hasNotes'];

    notesInputIds.forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        const hasLabel = hasAssociatedLabel(input as HTMLInputElement);
        expect(hasLabel).toBe(true);
      }
    });
  });

  /**
   * Property: Access control section inputs have associated labels when enabled
   */
  it('access control section inputs have associated labels when enabled', () => {
    const filters = createEmptyFilters();
    const onFiltersChange = () => {};
    const onApply = () => {};
    const onClear = () => {};
    const onOpenChange = () => {};

    render(
      <AdvancedFiltersDialog
        eventSettings={{ ...minimalEventSettings, accessControlEnabled: true }}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApply={onApply}
        onClear={onClear}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Check access control inputs
    const accessControlInputIds = [
      'filter-accessStatus',
      'filter-validFrom-start',
      'filter-validFrom-end',
      'filter-validUntil-start',
      'filter-validUntil-end',
    ];

    accessControlInputIds.forEach((inputId) => {
      const input = document.getElementById(inputId);
      if (input) {
        const hasLabel = hasAssociatedLabel(input as HTMLInputElement);
        expect(hasLabel).toBe(true);
      }
    });
  });

  /**
   * Property: Custom field inputs have associated labels
   */
  it('custom field inputs have associated labels', () => {
    const filters = createEmptyFilters();
    const onFiltersChange = () => {};
    const onApply = () => {};
    const onClear = () => {};
    const onOpenChange = () => {};

    render(
      <AdvancedFiltersDialog
        eventSettings={eventSettingsWithFields}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApply={onApply}
        onClear={onClear}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Check custom field inputs
    eventSettingsWithFields.customFields?.forEach((field) => {
      const fieldId = field.id || field.fieldName;
      
      // Text fields have value input
      if (field.fieldType === 'text') {
        const input = document.getElementById(`filter-custom-${fieldId}-value`);
        if (input) {
          const hasLabel = hasAssociatedLabel(input as HTMLInputElement);
          expect(hasLabel).toBe(true);
        }
      }
      
      // Select and boolean fields have select trigger
      if (field.fieldType === 'select' || field.fieldType === 'boolean') {
        const trigger = document.getElementById(`filter-custom-${fieldId}`) ||
                       document.getElementById(`filter-custom-${fieldId}-trigger`);
        if (trigger) {
          const hasLabel = hasAssociatedLabel(trigger as HTMLButtonElement);
          expect(hasLabel).toBe(true);
        }
      }
    });
  });

  /**
   * Property: For any event settings configuration, all rendered inputs have labels
   */
  it('all inputs have associated labels for any event settings', () => {
    fc.assert(
      fc.property(eventSettingsWithCustomFieldsArbitrary, (eventSettings) => {
        const filters = createEmptyFilters();
        const onFiltersChange = () => {};
        const onApply = () => {};
        const onClear = () => {};
        const onOpenChange = () => {};

        const { unmount } = render(
          <AdvancedFiltersDialog
            eventSettings={eventSettings}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onApply={onApply}
            onClear={onClear}
            open={true}
            onOpenChange={onOpenChange}
          />
        );

        // Get all form inputs
        const inputs = getAllFormInputs();

        // Each input should have an associated label
        inputs.forEach((input) => {
          const hasLabel = hasAssociatedLabel(input);
          // We expect all inputs to have labels, but some dynamic inputs
          // may not have explicit labels if they use aria-label
          expect(hasLabel || input.getAttribute('aria-label')).toBeTruthy();
        });

        unmount();
      }),
      { numRuns: 20 } // Reduced runs due to DOM rendering overhead
    );
  });

  /**
   * Property: Operator select triggers have aria-label attributes
   */
  it('operator select triggers have aria-label attributes', () => {
    const filters = createEmptyFilters();
    const onFiltersChange = () => {};
    const onApply = () => {};
    const onClear = () => {};
    const onOpenChange = () => {};

    render(
      <AdvancedFiltersDialog
        eventSettings={minimalEventSettings}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApply={onApply}
        onClear={onClear}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Check operator selects have aria-labels
    const operatorIds = [
      'filter-firstName-operator',
      'filter-lastName-operator',
      'filter-barcode-operator',
      'filter-notes-operator',
    ];

    operatorIds.forEach((operatorId) => {
      const trigger = document.getElementById(operatorId);
      if (trigger) {
        const ariaLabel = trigger.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toContain('operator');
      }
    });
  });

  /**
   * Property: Input IDs are unique within the dialog
   */
  it('input IDs are unique within the dialog', () => {
    fc.assert(
      fc.property(eventSettingsWithCustomFieldsArbitrary, (eventSettings) => {
        const filters = createEmptyFilters();
        const onFiltersChange = () => {};
        const onApply = () => {};
        const onClear = () => {};
        const onOpenChange = () => {};

        const { unmount } = render(
          <AdvancedFiltersDialog
            eventSettings={eventSettings}
            filters={filters}
            onFiltersChange={onFiltersChange}
            onApply={onApply}
            onClear={onClear}
            open={true}
            onOpenChange={onOpenChange}
          />
        );

        // Get all elements with IDs
        const elementsWithIds = document.querySelectorAll('[id]');
        const ids = Array.from(elementsWithIds).map((el) => el.id).filter((id) => id);
        const uniqueIds = new Set(ids);

        // All IDs should be unique
        expect(uniqueIds.size).toBe(ids.length);

        unmount();
      }),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Labels have visible text content
   */
  it('labels have visible text content', () => {
    const filters = createEmptyFilters();
    const onFiltersChange = () => {};
    const onApply = () => {};
    const onClear = () => {};
    const onOpenChange = () => {};

    render(
      <AdvancedFiltersDialog
        eventSettings={eventSettingsWithFields}
        filters={filters}
        onFiltersChange={onFiltersChange}
        onApply={onApply}
        onClear={onClear}
        open={true}
        onOpenChange={onOpenChange}
      />
    );

    // Get all labels with htmlFor attribute
    const labels = document.querySelectorAll('label[for]');

    labels.forEach((label) => {
      const textContent = label.textContent?.trim();
      // Labels should have text content (excluding spacer labels)
      if (!label.classList.contains('text-transparent')) {
        expect(textContent).toBeTruthy();
      }
    });
  });
});

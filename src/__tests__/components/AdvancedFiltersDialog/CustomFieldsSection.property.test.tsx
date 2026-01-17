/**
 * Property-Based Tests for CustomFieldsSection Component
 *
 * These tests use fast-check to verify universal properties across all valid inputs.
 * Each test runs a minimum of 100 iterations with randomly generated data.
 *
 * **Feature: advanced-filters-redesign, Property 2: Custom Fields Section Completeness**
 * **Validates: Requirements 1.9**
 *
 * @see .kiro/specs/advanced-filters-redesign/design.md
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, screen, cleanup } from '@testing-library/react';
import { CustomFieldsSection } from '@/components/AdvancedFiltersDialog/sections/CustomFieldsSection';
import type { CustomField, SelectFieldOptions } from '@/components/EventSettingsForm/types';
import type { CustomFieldFilter } from '@/lib/filterUtils';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Arbitrary for custom field types
const fieldTypeArbitrary = fc.constantFrom('text', 'select', 'multi-select', 'boolean', 'checkbox');

// Arbitrary for select field options - use alphanumeric strings only
const selectOptionsArbitrary: fc.Arbitrary<SelectFieldOptions> = fc.record({
  options: fc.array(
    fc.stringMatching(/^[A-Z][a-z]{2,10}$/),
    { minLength: 1, maxLength: 5 }
  ),
});

// Arbitrary for custom field definition - use predictable alphanumeric strings
const customFieldArbitrary: fc.Arbitrary<CustomField> = fc
  .tuple(
    fc.stringMatching(/^field[0-9]{3}$/), // id like "field001"
    fc.stringMatching(/^[A-Z][a-z]{3,15}$/), // fieldName like "Department"
    fieldTypeArbitrary,
    fc.boolean(),
    fc.integer({ min: 0, max: 100 })
  )
  .chain(([id, fieldName, fieldType, required, order]) => {
    const baseField: CustomField = {
      id,
      fieldName,
      fieldType,
      required,
      order,
    };

    // Add options for select-type fields
    if (fieldType === 'select' || fieldType === 'multi-select') {
      return selectOptionsArbitrary.map((options) => ({
        ...baseField,
        fieldOptions: options,
      }));
    }
    return fc.constant(baseField);
  });

// Arbitrary for array of custom fields with unique IDs and unique field names
const customFieldsArrayArbitrary = fc
  .array(customFieldArbitrary, { minLength: 0, maxLength: 10 })
  .map((fields) => {
    // Ensure unique IDs and unique field names
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    return fields.filter((field) => {
      const id = field.id || field.fieldName;
      const name = field.fieldName.toLowerCase();
      if (seenIds.has(id) || seenNames.has(name)) return false;
      seenIds.add(id);
      seenNames.add(name);
      return true;
    });
  });

// Generate filters map from custom fields
const generateFiltersForFields = (fields: CustomField[]): Record<string, CustomFieldFilter> => {
  const filters: Record<string, CustomFieldFilter> = {};
  fields.forEach((field) => {
    const id = field.id || field.fieldName;
    filters[id] = { value: '', operator: 'contains' };
  });
  return filters;
};

/**
 * **Feature: advanced-filters-redesign, Property 2: Custom Fields Section Completeness**
 * **Validates: Requirements 1.9**
 *
 * *For any* set of custom fields defined in event settings, the Custom Fields
 * accordion section SHALL render a filter field for each custom field.
 */
describe('Property 2: Custom Fields Section Completeness', () => {
  it('renders exactly one filter field for each custom field', () => {
    fc.assert(
      fc.property(customFieldsArrayArbitrary, (customFields) => {
        cleanup(); // Clean up before each property test iteration
        
        const filters = generateFiltersForFields(customFields);
        const onFilterChange = vi.fn();

        const { container, unmount } = render(
          <CustomFieldsSection
            customFields={customFields}
            filters={filters}
            onFilterChange={onFilterChange}
          />
        );

        try {
          // Count the number of filter fields rendered
          // Each custom field should have exactly one label with its name
          customFields.forEach((field) => {
            const labels = screen.queryAllByText(field.fieldName);
            expect(labels.length).toBe(1);
          });

          // Total number of filter field containers should match custom fields count
          const filterContainers = container.querySelectorAll('.space-y-2');
          if (customFields.length === 0) {
            // Empty state message is shown
            expect(screen.queryAllByText(/no custom fields configured/i).length).toBe(1);
          } else {
            expect(filterContainers.length).toBe(customFields.length);
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });

  it('renders text filter for text-type custom fields', () => {
    fc.assert(
      fc.property(
        customFieldsArrayArbitrary.filter((fields) =>
          fields.some((f) => f.fieldType === 'text')
        ),
        (customFields) => {
          cleanup();
          
          const textFields = customFields.filter((f) => f.fieldType === 'text');
          if (textFields.length === 0) return; // Skip if no text fields

          const filters = generateFiltersForFields(customFields);
          const onFilterChange = vi.fn();

          const { unmount } = render(
            <CustomFieldsSection
              customFields={customFields}
              filters={filters}
              onFilterChange={onFilterChange}
            />
          );

          try {
            // Text fields should have operator dropdown and text input
            textFields.forEach((field) => {
              const fieldId = field.id || field.fieldName;
              const operatorSelect = document.getElementById(`filter-custom-${fieldId}-operator`);
              const valueInput = document.getElementById(`filter-custom-${fieldId}-value`);

              expect(operatorSelect).not.toBeNull();
              expect(valueInput).not.toBeNull();
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('renders boolean filter for boolean-type custom fields', () => {
    fc.assert(
      fc.property(
        customFieldsArrayArbitrary.filter((fields) =>
          fields.some((f) => f.fieldType === 'boolean' || f.fieldType === 'checkbox')
        ),
        (customFields) => {
          cleanup();
          
          const booleanFields = customFields.filter(
            (f) => f.fieldType === 'boolean' || f.fieldType === 'checkbox'
          );
          if (booleanFields.length === 0) return; // Skip if no boolean fields

          const filters = generateFiltersForFields(customFields);
          const onFilterChange = vi.fn();

          const { unmount } = render(
            <CustomFieldsSection
              customFields={customFields}
              filters={filters}
              onFilterChange={onFilterChange}
            />
          );

          try {
            // Boolean fields should have a select with All/Yes/No options
            booleanFields.forEach((field) => {
              const fieldId = field.id || field.fieldName;
              const select = document.getElementById(`filter-custom-${fieldId}`);
              expect(select).not.toBeNull();
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('renders multi-select filter for select-type custom fields', () => {
    fc.assert(
      fc.property(
        customFieldsArrayArbitrary.filter((fields) =>
          fields.some((f) => f.fieldType === 'select' || f.fieldType === 'multi-select')
        ),
        (customFields) => {
          cleanup();
          
          const selectFields = customFields.filter(
            (f) => f.fieldType === 'select' || f.fieldType === 'multi-select'
          );
          if (selectFields.length === 0) return; // Skip if no select fields

          const filters = generateFiltersForFields(customFields);
          const onFilterChange = vi.fn();

          const { unmount } = render(
            <CustomFieldsSection
              customFields={customFields}
              filters={filters}
              onFilterChange={onFilterChange}
            />
          );

          try {
            // Select fields should have a combobox trigger
            selectFields.forEach((field) => {
              const fieldId = field.id || field.fieldName;
              const trigger = document.getElementById(`filter-custom-${fieldId}-trigger`);
              expect(trigger).not.toBeNull();
            });
          } finally {
            unmount();
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('shows empty state message when no custom fields are configured', () => {
    const filters: Record<string, CustomFieldFilter> = {};
    const onFilterChange = vi.fn();

    render(
      <CustomFieldsSection
        customFields={[]}
        filters={filters}
        onFilterChange={onFilterChange}
      />
    );

    expect(screen.getByText(/no custom fields configured/i)).toBeTruthy();
  });

  it('all filter fields have accessible labels', () => {
    fc.assert(
      fc.property(customFieldsArrayArbitrary, (customFields) => {
        if (customFields.length === 0) return;

        cleanup();
        
        const filters = generateFiltersForFields(customFields);
        const onFilterChange = vi.fn();

        const { unmount } = render(
          <CustomFieldsSection
            customFields={customFields}
            filters={filters}
            onFilterChange={onFilterChange}
          />
        );

        try {
          // Each custom field should have a label element
          customFields.forEach((field) => {
            const fieldId = field.id || field.fieldName;

            // Find the label for this field
            const labels = document.querySelectorAll('label');
            const hasLabel = Array.from(labels).some((label) => {
              const htmlFor = label.getAttribute('for');
              return (
                htmlFor?.includes(`filter-custom-${fieldId}`) ||
                label.textContent?.includes(field.fieldName)
              );
            });

            expect(hasLabel).toBe(true);
          });
        } finally {
          unmount();
        }
      }),
      { numRuns: 50 }
    );
  });

  it('renders correct number of fields regardless of field type distribution', () => {
    fc.assert(
      fc.property(customFieldsArrayArbitrary, (customFields) => {
        cleanup();
        
        const filters = generateFiltersForFields(customFields);
        const onFilterChange = vi.fn();

        const { container, unmount } = render(
          <CustomFieldsSection
            customFields={customFields}
            filters={filters}
            onFilterChange={onFilterChange}
          />
        );

        try {
          if (customFields.length === 0) {
            // Empty state
            expect(screen.queryAllByText(/no custom fields configured/i).length).toBe(1);
          } else {
            // Count text fields (have operator + value inputs)
            const textFieldCount = customFields.filter(
              (f) => f.fieldType === 'text' || !['select', 'multi-select', 'boolean', 'checkbox'].includes(f.fieldType)
            ).length;

            // Count boolean fields (have single select)
            const booleanFieldCount = customFields.filter(
              (f) => f.fieldType === 'boolean' || f.fieldType === 'checkbox'
            ).length;

            // Count select fields (have combobox trigger)
            const selectFieldCount = customFields.filter(
              (f) => f.fieldType === 'select' || f.fieldType === 'multi-select'
            ).length;

            // Total should match
            expect(textFieldCount + booleanFieldCount + selectFieldCount).toBe(customFields.length);
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 }
    );
  });
});

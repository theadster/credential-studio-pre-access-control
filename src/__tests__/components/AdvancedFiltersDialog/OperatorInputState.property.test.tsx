/**
 * Property-Based Tests for Operator-Based Input State
 *
 * These tests use fast-check to verify that text filter inputs are correctly
 * disabled when the operator is set to "isEmpty" or "isNotEmpty".
 *
 * **Feature: advanced-filters-redesign, Property 5: Operator-Based Input State**
 * **Validates: Requirements 5.2**
 *
 * @see .kiro/specs/advanced-filters-redesign/design.md
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import { BasicInfoSection } from '@/components/AdvancedFiltersDialog/sections/BasicInfoSection';
import { NotesContentSection } from '@/components/AdvancedFiltersDialog/sections/NotesContentSection';
import { CustomFieldsSection } from '@/components/AdvancedFiltersDialog/sections/CustomFieldsSection';
import type { TextFilter, NotesFilter, CustomFieldFilter } from '@/lib/filterUtils';
import type { CustomField } from '@/components/EventSettingsForm/types';

// Clean up after each test
afterEach(() => {
  cleanup();
});

// Operators that should disable the input
const EMPTY_OPERATORS = ['isEmpty', 'isNotEmpty'];

// All text operators
const ALL_TEXT_OPERATORS = ['contains', 'equals', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'];

// Arbitrary for text operators
const textOperatorArbitrary = fc.constantFrom(...ALL_TEXT_OPERATORS);

// Arbitrary for text filter
const textFilterArbitrary = (operator: string): TextFilter => ({
  value: '',
  operator,
});

// Arbitrary for notes filter
const notesFilterArbitrary = (operator: string): NotesFilter => ({
  value: '',
  operator,
  hasNotes: false,
});

/**
 * **Feature: advanced-filters-redesign, Property 5: Operator-Based Input State**
 * **Validates: Requirements 5.2**
 *
 * *For any* text filter field, when the operator is set to "isEmpty" or "isNotEmpty",
 * the value input SHALL be disabled; otherwise, it SHALL be enabled.
 */
describe('Property 5: Operator-Based Input State', () => {
  describe('BasicInfoSection', () => {
    it('firstName input is disabled when operator is isEmpty or isNotEmpty', () => {
      fc.assert(
        fc.property(textOperatorArbitrary, (operator) => {
          cleanup();
          
          const onFilterChange = vi.fn();
          const { unmount } = render(
            <BasicInfoSection
              firstName={textFilterArbitrary(operator)}
              lastName={textFilterArbitrary('contains')}
              barcode={textFilterArbitrary('contains')}
              photoFilter="all"
              onFilterChange={onFilterChange}
            />
          );

          try {
            const input = document.getElementById('filter-firstName-value') as HTMLInputElement;
            expect(input).not.toBeNull();
            
            if (EMPTY_OPERATORS.includes(operator)) {
              expect(input.disabled).toBe(true);
            } else {
              expect(input.disabled).toBe(false);
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('lastName input is disabled when operator is isEmpty or isNotEmpty', () => {
      fc.assert(
        fc.property(textOperatorArbitrary, (operator) => {
          cleanup();
          
          const onFilterChange = vi.fn();
          const { unmount } = render(
            <BasicInfoSection
              firstName={textFilterArbitrary('contains')}
              lastName={textFilterArbitrary(operator)}
              barcode={textFilterArbitrary('contains')}
              photoFilter="all"
              onFilterChange={onFilterChange}
            />
          );

          try {
            const input = document.getElementById('filter-lastName-value') as HTMLInputElement;
            expect(input).not.toBeNull();
            
            if (EMPTY_OPERATORS.includes(operator)) {
              expect(input.disabled).toBe(true);
            } else {
              expect(input.disabled).toBe(false);
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('barcode input is disabled when operator is isEmpty or isNotEmpty', () => {
      fc.assert(
        fc.property(textOperatorArbitrary, (operator) => {
          cleanup();
          
          const onFilterChange = vi.fn();
          const { unmount } = render(
            <BasicInfoSection
              firstName={textFilterArbitrary('contains')}
              lastName={textFilterArbitrary('contains')}
              barcode={textFilterArbitrary(operator)}
              photoFilter="all"
              onFilterChange={onFilterChange}
            />
          );

          try {
            const input = document.getElementById('filter-barcode-value') as HTMLInputElement;
            expect(input).not.toBeNull();
            
            if (EMPTY_OPERATORS.includes(operator)) {
              expect(input.disabled).toBe(true);
            } else {
              expect(input.disabled).toBe(false);
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('all text inputs follow the same disabled rule for any operator combination', () => {
      fc.assert(
        fc.property(
          textOperatorArbitrary,
          textOperatorArbitrary,
          textOperatorArbitrary,
          (firstNameOp, lastNameOp, barcodeOp) => {
            cleanup();
            
            const onFilterChange = vi.fn();
            const { unmount } = render(
              <BasicInfoSection
                firstName={textFilterArbitrary(firstNameOp)}
                lastName={textFilterArbitrary(lastNameOp)}
                barcode={textFilterArbitrary(barcodeOp)}
                photoFilter="all"
                onFilterChange={onFilterChange}
              />
            );

            try {
              const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
              const lastNameInput = document.getElementById('filter-lastName-value') as HTMLInputElement;
              const barcodeInput = document.getElementById('filter-barcode-value') as HTMLInputElement;

              expect(firstNameInput.disabled).toBe(EMPTY_OPERATORS.includes(firstNameOp));
              expect(lastNameInput.disabled).toBe(EMPTY_OPERATORS.includes(lastNameOp));
              expect(barcodeInput.disabled).toBe(EMPTY_OPERATORS.includes(barcodeOp));
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('NotesContentSection', () => {
    it('notes input is disabled when operator is isEmpty or isNotEmpty', () => {
      fc.assert(
        fc.property(textOperatorArbitrary, (operator) => {
          cleanup();
          
          const onFilterChange = vi.fn();
          const { unmount } = render(
            <NotesContentSection
              notes={notesFilterArbitrary(operator)}
              onFilterChange={onFilterChange}
            />
          );

          try {
            const input = document.getElementById('filter-notes-value') as HTMLInputElement;
            expect(input).not.toBeNull();
            
            if (EMPTY_OPERATORS.includes(operator)) {
              expect(input.disabled).toBe(true);
            } else {
              expect(input.disabled).toBe(false);
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('CustomFieldsSection', () => {
    it('text-type custom field input is disabled when operator is isEmpty or isNotEmpty', () => {
      fc.assert(
        fc.property(textOperatorArbitrary, (operator) => {
          cleanup();
          
          const customFields: CustomField[] = [
            {
              id: 'testField',
              fieldName: 'Test Field',
              fieldType: 'text',
              required: false,
              order: 0,
            },
          ];

          const filters: Record<string, CustomFieldFilter> = {
            testField: { value: '', operator },
          };

          const onFilterChange = vi.fn();
          const { unmount } = render(
            <CustomFieldsSection
              customFields={customFields}
              filters={filters}
              onFilterChange={onFilterChange}
            />
          );

          try {
            const input = document.getElementById('filter-custom-testField-value') as HTMLInputElement;
            expect(input).not.toBeNull();
            
            if (EMPTY_OPERATORS.includes(operator)) {
              expect(input.disabled).toBe(true);
            } else {
              expect(input.disabled).toBe(false);
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 100 }
      );
    });

    it('multiple text-type custom fields follow the same disabled rule', () => {
      fc.assert(
        fc.property(
          textOperatorArbitrary,
          textOperatorArbitrary,
          (op1, op2) => {
            cleanup();
            
            const customFields: CustomField[] = [
              {
                id: 'field1',
                fieldName: 'Field One',
                fieldType: 'text',
                required: false,
                order: 0,
              },
              {
                id: 'field2',
                fieldName: 'Field Two',
                fieldType: 'text',
                required: false,
                order: 1,
              },
            ];

            const filters: Record<string, CustomFieldFilter> = {
              field1: { value: '', operator: op1 },
              field2: { value: '', operator: op2 },
            };

            const onFilterChange = vi.fn();
            const { unmount } = render(
              <CustomFieldsSection
                customFields={customFields}
                filters={filters}
                onFilterChange={onFilterChange}
              />
            );

            try {
              const input1 = document.getElementById('filter-custom-field1-value') as HTMLInputElement;
              const input2 = document.getElementById('filter-custom-field2-value') as HTMLInputElement;

              expect(input1.disabled).toBe(EMPTY_OPERATORS.includes(op1));
              expect(input2.disabled).toBe(EMPTY_OPERATORS.includes(op2));
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Cross-component consistency', () => {
    it('isEmpty operator always disables input across all text filter components', () => {
      fc.assert(
        fc.property(fc.constant('isEmpty'), (operator) => {
          cleanup();
          
          // Test BasicInfoSection
          const { unmount: unmount1 } = render(
            <BasicInfoSection
              firstName={textFilterArbitrary(operator)}
              lastName={textFilterArbitrary(operator)}
              barcode={textFilterArbitrary(operator)}
              photoFilter="all"
              onFilterChange={vi.fn()}
            />
          );

          const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
          const lastNameInput = document.getElementById('filter-lastName-value') as HTMLInputElement;
          const barcodeInput = document.getElementById('filter-barcode-value') as HTMLInputElement;

          expect(firstNameInput.disabled).toBe(true);
          expect(lastNameInput.disabled).toBe(true);
          expect(barcodeInput.disabled).toBe(true);

          unmount1();
          cleanup();

          // Test NotesContentSection
          const { unmount: unmount2 } = render(
            <NotesContentSection
              notes={notesFilterArbitrary(operator)}
              onFilterChange={vi.fn()}
            />
          );

          const notesInput = document.getElementById('filter-notes-value') as HTMLInputElement;
          expect(notesInput.disabled).toBe(true);

          unmount2();
        }),
        { numRuns: 10 }
      );
    });

    it('isNotEmpty operator always disables input across all text filter components', () => {
      fc.assert(
        fc.property(fc.constant('isNotEmpty'), (operator) => {
          cleanup();
          
          // Test BasicInfoSection
          const { unmount: unmount1 } = render(
            <BasicInfoSection
              firstName={textFilterArbitrary(operator)}
              lastName={textFilterArbitrary(operator)}
              barcode={textFilterArbitrary(operator)}
              photoFilter="all"
              onFilterChange={vi.fn()}
            />
          );

          const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
          const lastNameInput = document.getElementById('filter-lastName-value') as HTMLInputElement;
          const barcodeInput = document.getElementById('filter-barcode-value') as HTMLInputElement;

          expect(firstNameInput.disabled).toBe(true);
          expect(lastNameInput.disabled).toBe(true);
          expect(barcodeInput.disabled).toBe(true);

          unmount1();
          cleanup();

          // Test NotesContentSection
          const { unmount: unmount2 } = render(
            <NotesContentSection
              notes={notesFilterArbitrary(operator)}
              onFilterChange={vi.fn()}
            />
          );

          const notesInput = document.getElementById('filter-notes-value') as HTMLInputElement;
          expect(notesInput.disabled).toBe(true);

          unmount2();
        }),
        { numRuns: 10 }
      );
    });

    it('non-empty operators always enable input across all text filter components', () => {
      const nonEmptyOperators = ['contains', 'equals', 'startsWith', 'endsWith'];
      
      fc.assert(
        fc.property(fc.constantFrom(...nonEmptyOperators), (operator) => {
          cleanup();
          
          // Test BasicInfoSection
          const { unmount: unmount1 } = render(
            <BasicInfoSection
              firstName={textFilterArbitrary(operator)}
              lastName={textFilterArbitrary(operator)}
              barcode={textFilterArbitrary(operator)}
              photoFilter="all"
              onFilterChange={vi.fn()}
            />
          );

          const firstNameInput = document.getElementById('filter-firstName-value') as HTMLInputElement;
          const lastNameInput = document.getElementById('filter-lastName-value') as HTMLInputElement;
          const barcodeInput = document.getElementById('filter-barcode-value') as HTMLInputElement;

          expect(firstNameInput.disabled).toBe(false);
          expect(lastNameInput.disabled).toBe(false);
          expect(barcodeInput.disabled).toBe(false);

          unmount1();
          cleanup();

          // Test NotesContentSection
          const { unmount: unmount2 } = render(
            <NotesContentSection
              notes={notesFilterArbitrary(operator)}
              onFilterChange={vi.fn()}
            />
          );

          const notesInput = document.getElementById('filter-notes-value') as HTMLInputElement;
          expect(notesInput.disabled).toBe(false);

          unmount2();
        }),
        { numRuns: 100 }
      );
    });
  });
});

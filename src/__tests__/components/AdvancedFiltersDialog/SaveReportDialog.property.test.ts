/**
 * Property-Based Tests for SaveReportDialog
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature, specifically Property 2: Empty Name Validation.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * **Validates: Requirements 1.3**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Import the validation function directly from the component
// Note: We're testing the exported validateReportName function
import { validateReportName } from '../../../components/AdvancedFiltersDialog/components/SaveReportDialog';

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate whitespace-only strings of various lengths
 * Includes spaces, tabs, newlines, and other whitespace characters
 */
const whitespaceOnlyArbitrary = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 50 })
  .map((chars) => chars.join(''));

/**
 * Generate valid non-empty names (strings with at least one non-whitespace character)
 * Excludes zero-width and invisible Unicode characters that might be removed by validation
 */
const validNameArbitrary = fc
  .string({ minLength: 1, maxLength: 255 })
  .filter((s) => {
    // Match validator behavior exactly: trim ASCII whitespace, then remove Unicode separators/control chars
    const cleaned = s.trim().replace(/[\p{Z}\p{C}]/gu, '');
    return cleaned.length > 0;
  });

/**
 * Generate strings that are empty or whitespace-only
 */
const emptyOrWhitespaceArbitrary = fc.oneof(
  fc.constant(''),
  whitespaceOnlyArbitrary
);

// ============================================================================
// Property 2: Empty Name Validation
// ============================================================================

/**
 * **Feature: saved-reports, Property 2: Empty Name Validation**
 * **Validates: Requirements 1.3**
 *
 * *For any* string composed entirely of whitespace (including empty string),
 * attempting to save a report with that name should be rejected with a
 * validation error, and no report should be created.
 */
describe('Property 2: Empty Name Validation', () => {
  describe('Whitespace-only names are rejected', () => {
    it('rejects names composed entirely of whitespace characters', () => {
      fc.assert(
        fc.property(whitespaceOnlyArbitrary, (whitespaceOnlyName) => {
          const error = validateReportName(whitespaceOnlyName);

          // Should return an error message
          expect(error).not.toBeNull();
          expect(typeof error).toBe('string');
          expect(error!.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it('rejects names with only space characters', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }),
          (numSpaces) => {
            const spacesOnlyName = ' '.repeat(numSpaces);
            const error = validateReportName(spacesOnlyName);

            expect(error).not.toBeNull();
            expect(error).toBe('Report name is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects names with only tab characters', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }),
          (numTabs) => {
            const tabsOnlyName = '\t'.repeat(numTabs);
            const error = validateReportName(tabsOnlyName);

            expect(error).not.toBeNull();
            expect(error).toBe('Report name is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects names with mixed whitespace characters', () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 30 }),
          (whitespaceChars) => {
            const mixedWhitespaceName = whitespaceChars.join('');
            const error = validateReportName(mixedWhitespaceName);

            expect(error).not.toBeNull();
            expect(error).toBe('Report name is required');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Empty string names are rejected', () => {
    it('rejects empty string', () => {
      const error = validateReportName('');

      expect(error).not.toBeNull();
      expect(error).toBe('Report name is required');
    });

    it('rejects any empty or whitespace-only string', () => {
      fc.assert(
        fc.property(emptyOrWhitespaceArbitrary, (emptyOrWhitespaceName) => {
          const error = validateReportName(emptyOrWhitespaceName);

          // Should always return an error for empty/whitespace-only names
          expect(error).not.toBeNull();
          expect(error).toBe('Report name is required');
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Valid names are accepted', () => {
    it('accepts names with at least one non-whitespace character', () => {
      fc.assert(
        fc.property(validNameArbitrary, (validName) => {
          const error = validateReportName(validName);

          // Should return null (no error) for valid names
          expect(error).toBeNull();
        }),
        { numRuns: 100 }
      );
    });

    it('accepts names with leading/trailing whitespace if they contain non-whitespace', () => {
      fc.assert(
        fc.property(
          validNameArbitrary,
          fc.integer({ min: 0, max: 10 }),
          fc.integer({ min: 0, max: 10 }),
          (coreName, leadingSpaces, trailingSpaces) => {
            const nameWithWhitespace =
              ' '.repeat(leadingSpaces) + coreName + ' '.repeat(trailingSpaces);
            const error = validateReportName(nameWithWhitespace);

            // Should return null (no error) since there's non-whitespace content
            expect(error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts single character names', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 1 }).filter((c) => {
            // Match validator behavior: trim ASCII whitespace, then remove Unicode separators/control chars
            const cleaned = c.trim().replace(/[\p{Z}\p{C}]/gu, '');
            return cleaned.length > 0;
          }),
          (singleChar) => {
            const error = validateReportName(singleChar);

            expect(error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts names with special characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
          (specialName) => {
            const error = validateReportName(specialName);

            expect(error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('accepts names with unicode characters', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter((s) => {
            // Match validator behavior: trim ASCII whitespace, then remove Unicode separators/control chars
            const cleaned = s.trim().replace(/[\p{Z}\p{C}]/gu, '');
            return cleaned.length > 0;
          }),
          (unicodeName) => {
            const error = validateReportName(unicodeName);

            expect(error).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Edge cases', () => {
    it('handles very long whitespace-only strings', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }),
          (length) => {
            const longWhitespace = ' '.repeat(length);
            const error = validateReportName(longWhitespace);

            expect(error).not.toBeNull();
            expect(error).toBe('Report name is required');
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles very long valid names', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 1000 }),
          (length) => {
            const longName = 'a'.repeat(length);
            const error = validateReportName(longName);

            expect(error).toBeNull();
          }
        ),
        { numRuns: 50 }
      );
    });

    it('handles names with only newline characters', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (numNewlines) => {
            const newlinesOnly = '\n'.repeat(numNewlines);
            const error = validateReportName(newlinesOnly);

            expect(error).not.toBeNull();
            expect(error).toBe('Report name is required');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles names with carriage return characters', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }),
          (numCR) => {
            const crOnly = '\r'.repeat(numCR);
            const error = validateReportName(crOnly);

            expect(error).not.toBeNull();
            expect(error).toBe('Report name is required');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

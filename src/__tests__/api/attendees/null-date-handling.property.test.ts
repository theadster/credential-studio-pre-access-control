/**
 * Property-Based Tests for Null Date Handling in Access Control
 * 
 * **Feature: access-control-feature, Property 13: Null Date Handling**
 * **Validates: Requirements 8.2, 8.3, 8.4**
 * 
 * *For any* attendee record:
 * - If validFrom is null, the badge SHALL be treated as valid from creation time
 * - If validUntil is null, the badge SHALL be treated as valid indefinitely
 * - If both validFrom and validUntil are null, the badge SHALL be treated as always valid
 *   (subject to accessEnabled status)
 * 
 * @see .kiro/specs/access-control-feature/design.md
 * @see .kiro/specs/access-control-feature/requirements.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { checkValidityWindow } from '@/lib/scanEvaluation';
import { isWithinValidityWindow } from '@/types/accessControl';

/**
 * Helper function to generate a date in the past
 * Uses integer arithmetic to avoid invalid date issues
 */
const pastDateArbitrary = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: Date.now() - 1000 * 60 * 60, // At least 1 hour ago
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Helper function to generate a date in the future
 * Uses integer arithmetic to avoid invalid date issues
 */
const futureDateArbitrary = fc.integer({
  min: Date.now() + 1000 * 60 * 60, // At least 1 hour from now
  max: new Date('2030-12-31T23:59:59Z').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Helper function to generate a valid date (past or future)
 * Uses integer arithmetic to avoid invalid date issues
 */
const validDateArbitrary = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2030-12-31T23:59:59Z').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * **Feature: access-control-feature, Property 13: Null Date Handling**
 * **Validates: Requirements 8.2, 8.3, 8.4**
 */
describe('Property 13: Null Date Handling', () => {
  /**
   * Requirement 8.2: When validFrom is left empty, the badge SHALL be treated as valid from creation time
   * 
   * This means if validFrom is null, the badge is immediately valid (no start restriction)
   */
  describe('Requirement 8.2: Null validFrom means valid from creation', () => {
    it('checkValidityWindow returns valid when validFrom is null and validUntil is in the future', () => {
      fc.assert(
        fc.property(
          futureDateArbitrary,
          (validUntil) => {
            const result = checkValidityWindow(null, validUntil);
            
            // With null validFrom and future validUntil, badge should be valid
            expect(result.isValid).toBe(true);
            expect(result.denialReason).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isWithinValidityWindow returns true when validFrom is null and validUntil is in the future', () => {
      fc.assert(
        fc.property(
          futureDateArbitrary,
          (validUntil) => {
            const result = isWithinValidityWindow(null, validUntil);
            
            // With null validFrom and future validUntil, badge should be valid
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('null validFrom does not impose any start time restriction', () => {
      // For any future validUntil date, null validFrom should always allow access
      fc.assert(
        fc.property(
          futureDateArbitrary,
          (validUntil) => {
            const result = checkValidityWindow(null, validUntil);
            
            // The denial reason should never mention "not yet valid" when validFrom is null
            if (result.denialReason) {
              expect(result.denialReason).not.toContain('not yet valid');
            }
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Requirement 8.3: When validUntil is left empty, the badge SHALL be treated as valid indefinitely
   * 
   * This means if validUntil is null, the badge never expires
   */
  describe('Requirement 8.3: Null validUntil means valid indefinitely', () => {
    it('checkValidityWindow returns valid when validUntil is null and validFrom is in the past', () => {
      fc.assert(
        fc.property(
          pastDateArbitrary,
          (validFrom) => {
            const result = checkValidityWindow(validFrom, null);
            
            // With past validFrom and null validUntil, badge should be valid
            expect(result.isValid).toBe(true);
            expect(result.denialReason).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isWithinValidityWindow returns true when validUntil is null and validFrom is in the past', () => {
      fc.assert(
        fc.property(
          pastDateArbitrary,
          (validFrom) => {
            const result = isWithinValidityWindow(validFrom, null);
            
            // With past validFrom and null validUntil, badge should be valid
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('null validUntil does not impose any expiration restriction', () => {
      // For any past validFrom date, null validUntil should always allow access
      fc.assert(
        fc.property(
          pastDateArbitrary,
          (validFrom) => {
            const result = checkValidityWindow(validFrom, null);
            
            // The denial reason should never mention "expired" when validUntil is null
            if (result.denialReason) {
              expect(result.denialReason).not.toContain('expired');
            }
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Requirement 8.4: When both validFrom and validUntil are empty, the badge SHALL be treated as always valid
   * 
   * This means if both dates are null, the badge is always valid (subject to accessEnabled)
   */
  describe('Requirement 8.4: Both null means always valid', () => {
    it('checkValidityWindow returns valid when both validFrom and validUntil are null', () => {
      const result = checkValidityWindow(null, null);
      
      // With both null, badge should always be valid
      expect(result.isValid).toBe(true);
      expect(result.denialReason).toBeNull();
    });

    it('isWithinValidityWindow returns true when both validFrom and validUntil are null', () => {
      const result = isWithinValidityWindow(null, null);
      
      // With both null, badge should always be valid
      expect(result).toBe(true);
    });

    it('both null dates never produce a denial reason', () => {
      // Run multiple times to ensure consistency
      fc.assert(
        fc.property(
          fc.constant(null),
          fc.constant(null),
          (validFrom, validUntil) => {
            const result = checkValidityWindow(validFrom, validUntil);
            
            expect(result.isValid).toBe(true);
            expect(result.denialReason).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Combined property: Null dates should never cause invalid state by themselves
   */
  describe('Combined: Null dates never cause invalid state', () => {
    it('any combination with null validFrom and future/null validUntil is valid', () => {
      fc.assert(
        fc.property(
          fc.oneof(futureDateArbitrary, fc.constant(null)),
          (validUntil) => {
            const result = checkValidityWindow(null, validUntil);
            
            // Null validFrom with future or null validUntil should always be valid
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('any combination with past/null validFrom and null validUntil is valid', () => {
      fc.assert(
        fc.property(
          fc.oneof(pastDateArbitrary, fc.constant(null)),
          (validFrom) => {
            const result = checkValidityWindow(validFrom, null);
            
            // Past or null validFrom with null validUntil should always be valid
            expect(result.isValid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Edge case: Ensure null handling is consistent across both functions
   */
  describe('Consistency between checkValidityWindow and isWithinValidityWindow', () => {
    it('both functions agree on null date handling', () => {
      fc.assert(
        fc.property(
          fc.oneof(pastDateArbitrary, fc.constant(null)),
          fc.oneof(futureDateArbitrary, fc.constant(null)),
          (validFrom, validUntil) => {
            const checkResult = checkValidityWindow(validFrom, validUntil);
            const isWithinResult = isWithinValidityWindow(validFrom, validUntil);
            
            // Both functions should agree on validity
            expect(checkResult.isValid).toBe(isWithinResult);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

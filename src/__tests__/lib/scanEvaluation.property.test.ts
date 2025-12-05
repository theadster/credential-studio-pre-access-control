/**
 * Property-Based Tests for Scan Evaluation
 * 
 * These tests use fast-check to verify universal properties across all valid inputs.
 * Each test runs a minimum of 100 iterations with randomly generated data.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateScan, checkValidityWindow, DENIAL_REASONS } from '@/lib/scanEvaluation';
import { CachedAttendee } from '@/lib/ruleEngine';
import { ApprovalProfileWithRules, RuleGroup } from '@/types/approvalProfile';

// ============================================================================
// Arbitraries (Generators for Property-Based Testing)
// ============================================================================

/**
 * Generates a random attendee object with valid date ranges
 * Ensures validFrom <= validUntil when both are present
 */
const attendeeArb = fc
  .tuple(
    fc.string(), // id
    fc.string(), // firstName
    fc.string(), // lastName
    fc.string(), // barcodeNumber
    fc.oneof(fc.constant(null), fc.webUrl()), // photoUrl
    fc.dictionary(fc.string(), fc.anything()), // customFieldValues
    fc.boolean(), // accessEnabled
    // Generate ordered date pair or nulls
    fc.oneof(
      // Both null
      fc.constant({ validFrom: null, validUntil: null }),
      // Only validFrom
      fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => ({
        validFrom: new Date(ts).toISOString(),
        validUntil: null,
      })),
      // Only validUntil
      fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => ({
        validFrom: null,
        validUntil: new Date(ts).toISOString(),
      })),
      // Both present with validFrom <= validUntil
      fc
        .tuple(
          fc.integer({ min: 1577836800000, max: 1924905600000 }), // start timestamp
          fc.integer({ min: 0, max: 347068800000 }) // duration (up to ~11 years)
        )
        .map(([start, duration]) => ({
          validFrom: new Date(start).toISOString(),
          validUntil: new Date(start + duration).toISOString(),
        }))
    )
  )
  .map(([id, firstName, lastName, barcodeNumber, photoUrl, customFieldValues, accessEnabled, dates]) => ({
    id,
    firstName,
    lastName,
    barcodeNumber,
    photoUrl,
    customFieldValues,
    accessEnabled,
    validFrom: dates.validFrom,
    validUntil: dates.validUntil,
  })) as fc.Arbitrary<CachedAttendee>;

/**
 * Generates a simple approval profile with rules that always pass when accessEnabled === true
 * Note: attendeeArb generates random booleans for accessEnabled, so this profile will:
 * - Pass when accessEnabled is true (checks if accessEnabled is_true)
 * - Fail when accessEnabled is false
 */
const alwaysPassProfileArb: fc.Arbitrary<ApprovalProfileWithRules> = fc.record({
  $id: fc.string(),
  name: fc.string(),
  description: fc.oneof(fc.constant(null), fc.string()),
  version: fc.integer({ min: 1 }),
  rules: fc.constant<RuleGroup>({
    logic: 'OR',
    conditions: [
      { field: 'accessEnabled', operator: 'is_true', value: null }
    ]
  }),
  isDeleted: fc.constant(false),
  $createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
  $updatedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
});

/**
 * Generates a simple approval profile with rules that always fail when accessEnabled === true
 * Note: attendeeArb generates random booleans for accessEnabled, so this profile will:
 * - Fail when accessEnabled is true (checks if accessEnabled is_false)
 * - Pass when accessEnabled is false (but scan will be denied for ACCESS_DISABLED before rules are evaluated)
 */
const alwaysFailProfileArb: fc.Arbitrary<ApprovalProfileWithRules> = fc.record({
  $id: fc.string(),
  name: fc.string(),
  description: fc.oneof(fc.constant(null), fc.string()),
  version: fc.integer({ min: 1 }),
  rules: fc.constant<RuleGroup>({
    logic: 'AND',
    conditions: [
      { field: 'accessEnabled', operator: 'is_false', value: null }
    ]
  }),
  isDeleted: fc.constant(false),
  $createdAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
  $updatedAt: fc.integer({ min: 1577836800000, max: 1924905600000 }).map(ts => new Date(ts).toISOString()),
});

// ============================================================================
// Property 3: Disabled access denial
// **Feature: mobile-access-control, Property 3: Disabled access denial**
// **Validates: Requirements 2.3, 2.4**
// ============================================================================

describe('Property 3: Disabled access denial', () => {
  it('should deny access for any attendee with accessEnabled=false regardless of other conditions', () => {
    fc.assert(
      fc.property(
        attendeeArb,
        fc.string(), // barcode
        fc.oneof(fc.constant(null), alwaysPassProfileArb), // profile
        (attendee, barcode, profile) => {
          // Force accessEnabled to false
          const disabledAttendee = { ...attendee, accessEnabled: false, barcodeNumber: barcode };
          
          // Create attendees map
          const attendees = new Map<string, CachedAttendee>();
          attendees.set(barcode, disabledAttendee);
          
          // Evaluate scan
          const result = evaluateScan(barcode, attendees, profile);
          
          // Should always be denied with ACCESS_DISABLED reason
          expect(result.approved).toBe(false);
          expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 8: Approval evaluation completeness
// **Feature: mobile-access-control, Property 8: Approval evaluation completeness**
// **Validates: Requirements 7.4**
// ============================================================================

describe('Property 8: Approval evaluation completeness', () => {
  it('should approve when accessEnabled=true, within validity window, and profile rules pass', () => {
    fc.assert(
      fc.property(
        fc.string(), // id
        fc.string(), // firstName
        fc.string(), // lastName
        fc.string(), // barcode
        alwaysPassProfileArb, // profile with rules that always pass
        (id, firstName, lastName, barcode, profile) => {
          // Create attendee with all favorable conditions
          const now = new Date();
          const validFrom = new Date(now.getTime() - 86400000).toISOString(); // 1 day ago
          const validUntil = new Date(now.getTime() + 86400000).toISOString(); // 1 day from now
          
          const approvedAttendee: CachedAttendee = {
            id,
            firstName,
            lastName,
            barcodeNumber: barcode,
            photoUrl: null,
            customFieldValues: {},
            accessEnabled: true,
            validFrom,
            validUntil,
          };
          
          // Create attendees map
          const attendees = new Map<string, CachedAttendee>();
          attendees.set(barcode, approvedAttendee);
          
          // Evaluate scan
          const result = evaluateScan(barcode, attendees, profile);
          
          // Should be approved
          expect(result.approved).toBe(true);
          expect(result.denialReason).toBe(null);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 9: Denial reason priority
// **Feature: mobile-access-control, Property 9: Denial reason priority**
// **Validates: Requirements 8.5**
// ============================================================================

describe('Property 9: Denial reason priority', () => {
  it('should prioritize ACCESS_DISABLED over validity dates', () => {
    fc.assert(
      fc.property(
        attendeeArb,
        fc.string(), // barcode
        fc.oneof(fc.constant(null), alwaysPassProfileArb),
        (attendee, barcode, profile) => {
          // Create attendee with accessEnabled=false AND expired dates
          const now = new Date();
          const expiredAttendee: CachedAttendee = {
            ...attendee,
            accessEnabled: false,
            validFrom: new Date(now.getTime() - 172800000).toISOString(), // 2 days ago
            validUntil: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago (expired)
            barcodeNumber: barcode,
          };
          
          const attendees = new Map<string, CachedAttendee>();
          attendees.set(barcode, expiredAttendee);
          
          const result = evaluateScan(barcode, attendees, profile);
          
          // Should deny with ACCESS_DISABLED, not EXPIRED
          expect(result.approved).toBe(false);
          expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should prioritize validity dates over profile rules', () => {
    fc.assert(
      fc.property(
        attendeeArb,
        fc.string(), // barcode
        alwaysFailProfileArb, // profile with rules that always fail
        (attendee, barcode, profile) => {
          // Create attendee with accessEnabled=true, expired dates, AND failing rules
          const now = new Date();
          const expiredAttendee: CachedAttendee = {
            ...attendee,
            accessEnabled: true,
            validFrom: new Date(now.getTime() - 172800000).toISOString(), // 2 days ago
            validUntil: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago (expired)
            barcodeNumber: barcode,
          };
          
          const attendees = new Map<string, CachedAttendee>();
          attendees.set(barcode, expiredAttendee);
          
          const result = evaluateScan(barcode, attendees, profile);
          
          // Should deny with EXPIRED, not REQUIREMENTS_NOT_MET
          expect(result.approved).toBe(false);
          expect(result.denialReason).toContain(DENIAL_REASONS.EXPIRED);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ============================================================================
// Property 10: Default validation without profile
// **Feature: mobile-access-control, Property 10: Default validation without profile**
// **Validates: Requirements 9.4**
// ============================================================================

describe('Property 10: Default validation without profile', () => {
  it('should only validate accessEnabled and validity dates when no profile is selected', () => {
    fc.assert(
      fc.property(
        attendeeArb,
        fc.string(), // barcode
        (attendee, barcode) => {
          // Create attendee with favorable conditions
          const now = new Date();
          const validAttendee: CachedAttendee = {
            ...attendee,
            accessEnabled: true,
            validFrom: new Date(now.getTime() - 86400000).toISOString(), // 1 day ago
            validUntil: new Date(now.getTime() + 86400000).toISOString(), // 1 day from now
            barcodeNumber: barcode,
          };
          
          const attendees = new Map<string, CachedAttendee>();
          attendees.set(barcode, validAttendee);
          
          // Evaluate with no profile
          const result = evaluateScan(barcode, attendees, null);
          
          // Should be approved (no profile rules to fail)
          expect(result.approved).toBe(true);
          expect(result.denialReason).toBe(null);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
  
  it('should deny based on accessEnabled even without profile', () => {
    fc.assert(
      fc.property(
        attendeeArb,
        fc.string(), // barcode
        (attendee, barcode) => {
          // Create attendee with accessEnabled=false
          const disabledAttendee: CachedAttendee = {
            ...attendee,
            accessEnabled: false,
            barcodeNumber: barcode,
          };
          
          const attendees = new Map<string, CachedAttendee>();
          attendees.set(barcode, disabledAttendee);
          
          // Evaluate with no profile
          const result = evaluateScan(barcode, attendees, null);
          
          // Should be denied
          expect(result.approved).toBe(false);
          expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
          
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


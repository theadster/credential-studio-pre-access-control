/**
 * Unit Tests for Scan Evaluation
 * 
 * These tests verify specific scenarios and edge cases for the scan evaluation logic.
 * 
 * Requirements: 7.4, 8.1, 8.2, 8.3, 8.4, 8.5
 */

import { describe, it, expect } from 'vitest';
import { evaluateScan, checkValidityWindow, DENIAL_REASONS } from '@/lib/scanEvaluation';
import { CachedAttendee } from '@/lib/ruleEngine';
import { ApprovalProfileWithRules, RuleGroup } from '@/types/approvalProfile';

// ============================================================================
// Test Fixtures
// ============================================================================

let attendeeCounter = 0;

const createAttendee = (overrides: Partial<CachedAttendee> = {}): CachedAttendee => {
  attendeeCounter++;
  return {
    id: `att_${attendeeCounter}`,
    firstName: 'John',
    lastName: 'Doe',
    barcodeNumber: `barcode_${attendeeCounter}`,
    photoUrl: null,
    customFieldValues: {},
    accessEnabled: true,
    validFrom: null,
    validUntil: null,
    ...overrides,
  };
};

const createProfile = (rules: RuleGroup): ApprovalProfileWithRules => ({
  $id: 'prof_123',
  name: 'Test Profile',
  description: 'Test profile for unit tests',
  version: 1,
  rules,
  isDeleted: false,
  $createdAt: new Date().toISOString(),
  $updatedAt: new Date().toISOString(),
});

// ============================================================================
// checkValidityWindow Tests
// ============================================================================

describe('checkValidityWindow', () => {
  it('should return valid when both dates are null', () => {
    const result = checkValidityWindow(null, null);
    expect(result.isValid).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should return valid when validFrom is null and validUntil is in future', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
    const result = checkValidityWindow(null, futureDate);
    expect(result.isValid).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should return valid when validFrom is in past and validUntil is null', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const result = checkValidityWindow(pastDate, null);
    expect(result.isValid).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should return valid when current time is within validity window', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
    const result = checkValidityWindow(pastDate, futureDate);
    expect(result.isValid).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should return invalid when current time is before validFrom', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString(); // 1 day from now
    const result = checkValidityWindow(futureDate, null);
    expect(result.isValid).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.NOT_YET_VALID);
    expect(result.denialReason).toContain('valid from:');
  });

  it('should return invalid when current time is after validUntil', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const result = checkValidityWindow(null, pastDate);
    expect(result.isValid).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.EXPIRED);
    expect(result.denialReason).toContain('expired:');
  });

  it('should return invalid when validFrom is after validUntil (edge case)', () => {
    // This shouldn't happen due to validation, but test the behavior
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const result = checkValidityWindow(futureDate, pastDate);
    expect(result.isValid).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.NOT_YET_VALID);
  });

  it('should return invalid when validFrom is an invalid date string', () => {
    const result = checkValidityWindow('invalid-date', null);
    expect(result.isValid).toBe(false);
    expect(result.denialReason).toBe('Invalid validFrom date');
  });

  it('should return invalid when validUntil is an invalid date string', () => {
    const result = checkValidityWindow(null, 'not-a-date');
    expect(result.isValid).toBe(false);
    expect(result.denialReason).toBe('Invalid validUntil date');
  });
});

// ============================================================================
// evaluateScan - Badge Not Found Tests
// ============================================================================

describe('evaluateScan - Badge Not Found', () => {
  it('should deny when barcode is not found in attendees map', () => {
    const attendees = new Map<string, CachedAttendee>();
    const result = evaluateScan('unknown_barcode', attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.NOT_FOUND);
  });

  it('should deny when attendees map is empty', () => {
    const attendees = new Map<string, CachedAttendee>();
    const result = evaluateScan('1234567890', attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.NOT_FOUND);
  });
});

// ============================================================================
// evaluateScan - Access Disabled Tests (Requirement 8.1)
// ============================================================================

describe('evaluateScan - Access Disabled', () => {
  it('should deny when accessEnabled is false', () => {
    const attendee = createAttendee({ accessEnabled: false });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
  });

  it('should deny when accessEnabled is false even with valid dates', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({
      accessEnabled: false,
      validFrom: pastDate,
      validUntil: futureDate,
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
  });

  it('should deny when accessEnabled is false even with passing profile rules', () => {
    const attendee = createAttendee({ accessEnabled: false });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    // Profile that would pass if accessEnabled was true
    const profile = createProfile({
      logic: 'OR',
      conditions: [
        { field: 'firstName', operator: 'equals', value: 'John' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
  });
});

// ============================================================================
// evaluateScan - Validity Window Tests (Requirements 8.2, 8.3)
// ============================================================================

describe('evaluateScan - Validity Window', () => {
  it('should deny when current time is before validFrom', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({ validFrom: futureDate });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.NOT_YET_VALID);
  });

  it('should deny when current time is after validUntil', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const attendee = createAttendee({ validUntil: pastDate });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.EXPIRED);
  });

  it('should approve when current time is within validity window', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({
      validFrom: pastDate,
      validUntil: futureDate,
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should approve when validFrom is null and validUntil is in future', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({ validUntil: futureDate });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should approve when validFrom is in past and validUntil is null', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const attendee = createAttendee({ validFrom: pastDate });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should approve when both validFrom and validUntil are null', () => {
    const attendee = createAttendee();
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });
});

// ============================================================================
// evaluateScan - Profile Rules Tests (Requirement 8.4)
// ============================================================================

describe('evaluateScan - Profile Rules', () => {
  it('should approve when profile rules pass', () => {
    const attendee = createAttendee({
      customFieldValues: { credentialType: 'VIP' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should deny when profile rules fail', () => {
    const attendee = createAttendee({
      customFieldValues: { credentialType: 'General' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.REQUIREMENTS_NOT_MET);
  });

  it('should approve when no profile is provided (only validate access and dates)', () => {
    const attendee = createAttendee();
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should approve when profile has no rules', () => {
    const attendee = createAttendee();
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: []
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should handle complex profile rules with AND logic', () => {
    const attendee = createAttendee({
      customFieldValues: {
        credentialType: 'VIP',
        backstageAccess: true
      }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' },
        { field: 'customFieldValues.backstageAccess', operator: 'is_true', value: null }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should handle complex profile rules with OR logic', () => {
    const attendee = createAttendee({
      customFieldValues: { credentialType: 'Staff' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'OR',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' },
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'Staff' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });
});

// ============================================================================
// evaluateScan - Priority Order Tests (Requirement 8.5)
// ============================================================================

describe('evaluateScan - Priority Order', () => {
  it('should prioritize ACCESS_DISABLED over NOT_YET_VALID', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({
      accessEnabled: false,
      validFrom: futureDate,
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
  });

  it('should prioritize ACCESS_DISABLED over EXPIRED', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const attendee = createAttendee({
      accessEnabled: false,
      validUntil: pastDate,
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
  });

  it('should prioritize ACCESS_DISABLED over REQUIREMENTS_NOT_MET', () => {
    const attendee = createAttendee({
      accessEnabled: false,
      customFieldValues: { credentialType: 'General' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.ACCESS_DISABLED);
  });

  it('should prioritize NOT_YET_VALID over REQUIREMENTS_NOT_MET', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({
      validFrom: futureDate,
      customFieldValues: { credentialType: 'General' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.NOT_YET_VALID);
  });

  it('should prioritize EXPIRED over REQUIREMENTS_NOT_MET', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const attendee = createAttendee({
      validUntil: pastDate,
      customFieldValues: { credentialType: 'General' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toContain(DENIAL_REASONS.EXPIRED);
  });

  it('should show REQUIREMENTS_NOT_MET only when all other checks pass', () => {
    const attendee = createAttendee({
      customFieldValues: { credentialType: 'General' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(false);
    expect(result.denialReason).toBe(DENIAL_REASONS.REQUIREMENTS_NOT_MET);
  });
});

// ============================================================================
// evaluateScan - Complete Approval Scenarios (Requirement 7.4)
// ============================================================================

describe('evaluateScan - Complete Approval Scenarios', () => {
  it('should approve when all conditions are favorable without profile', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({
      accessEnabled: true,
      validFrom: pastDate,
      validUntil: futureDate,
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, null);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });

  it('should approve when all conditions are favorable with passing profile', () => {
    const pastDate = new Date(Date.now() - 86400000).toISOString();
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const attendee = createAttendee({
      accessEnabled: true,
      validFrom: pastDate,
      validUntil: futureDate,
      customFieldValues: { credentialType: 'VIP' }
    });
    const attendees = new Map<string, CachedAttendee>();
    attendees.set(attendee.barcodeNumber, attendee);
    
    const profile = createProfile({
      logic: 'AND',
      conditions: [
        { field: 'customFieldValues.credentialType', operator: 'equals', value: 'VIP' }
      ]
    });
    
    const result = evaluateScan(attendee.barcodeNumber, attendees, profile);
    
    expect(result.approved).toBe(true);
    expect(result.denialReason).toBe(null);
  });
});

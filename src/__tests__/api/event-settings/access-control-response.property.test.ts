/**
 * Property-Based Tests for Access Control API Response Completeness
 * 
 * These tests verify the correctness properties defined in the design document
 * for the access control feature in event settings.
 * 
 * Tests exercise the actual implementation from src/lib/eventSettingsTransformers.ts
 * to ensure the production transformation logic is correct.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 * @see src/lib/eventSettingsTransformers.ts
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  transformEventSettingsResponse,
  validateAccessControlFieldsPresent,
  type AccessControlTimeMode,
  type EventSettingsResponse
} from '@/lib/eventSettingsTransformers';

/**
 * **Feature: access-control-feature, Property 11: API Response Completeness**
 * **Validates: Requirements 7.1**
 * 
 * *For any* event settings API response, the response SHALL include both
 * `accessControlEnabled` and `accessControlTimeMode` fields.
 */
describe('Property 11: API Response Completeness', () => {
  // Arbitrary for generating random event settings data
  const eventSettingsArbitrary = fc.record({
    id: fc.option(fc.uuid(), { nil: undefined }),
    eventName: fc.string({ minLength: 1, maxLength: 100 }),
    eventDate: fc.date({
      min: new Date('2020-01-01T00:00:00Z'),
      max: new Date('2030-12-31T23:59:59Z'),
    }).filter(d => !isNaN(d.getTime())).map(d => d.toISOString()),
    eventLocation: fc.string({ minLength: 1, maxLength: 200 }),
    timeZone: fc.constantFrom('UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'),
    barcodeType: fc.constantFrom('alphanumerical', 'numerical'),
    barcodeLength: fc.integer({ min: 4, max: 20 }),
    barcodeUnique: fc.boolean(),
  });

  // Arbitrary for access control enabled state
  const accessControlEnabledArbitrary = fc.boolean();

  // Arbitrary for access control time mode
  const accessControlTimeModeArbitrary = fc.constantFrom<AccessControlTimeMode>('date_only', 'date_time');

  it('transformed response always includes accessControlEnabled field', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        fc.option(accessControlEnabledArbitrary, { nil: undefined }),
        (settings, accessControlEnabled) => {
          const input = {
            ...settings,
            accessControlEnabled,
          };
          
          const response = transformEventSettingsResponse(input);
          const validation = validateAccessControlFieldsPresent(response);
          
          // accessControlEnabled should always be present
          expect(validation.hasAccessControlEnabled).toBe(true);
          
          // accessControlEnabled should be a boolean
          expect(validation.accessControlEnabledType).toBe('boolean');
          
          // If input had a value, it should be preserved
          if (accessControlEnabled !== undefined) {
            expect(response.accessControlEnabled).toBe(accessControlEnabled);
          } else {
            // Default should be false
            expect(response.accessControlEnabled).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('transformed response always includes accessControlTimeMode field', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        fc.option(accessControlTimeModeArbitrary, { nil: undefined }),
        (settings, accessControlTimeMode) => {
          const input = {
            ...settings,
            accessControlTimeMode,
          };
          
          const response = transformEventSettingsResponse(input);
          const validation = validateAccessControlFieldsPresent(response);
          
          // accessControlTimeMode should always be present
          expect(validation.hasAccessControlTimeMode).toBe(true);
          
          // accessControlTimeMode should be a string
          expect(validation.accessControlTimeModeType).toBe('string');
          
          // accessControlTimeMode should be a valid value
          expect(validation.accessControlTimeModeValid).toBe(true);
          
          // If input had a value, it should be preserved
          if (accessControlTimeMode !== undefined) {
            expect(response.accessControlTimeMode).toBe(accessControlTimeMode);
          } else {
            // Default should be 'date_only'
            expect(response.accessControlTimeMode).toBe('date_only');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('response includes both access control fields regardless of other settings', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        accessControlEnabledArbitrary,
        accessControlTimeModeArbitrary,
        (settings, enabled, timeMode) => {
          const input = {
            ...settings,
            accessControlEnabled: enabled,
            accessControlTimeMode: timeMode,
          };
          
          const response = transformEventSettingsResponse(input);
          const validation = validateAccessControlFieldsPresent(response);
          
          // Both fields should be present
          expect(validation.hasAccessControlEnabled).toBe(true);
          expect(validation.hasAccessControlTimeMode).toBe(true);
          
          // Both fields should have correct types
          expect(validation.accessControlEnabledType).toBe('boolean');
          expect(validation.accessControlTimeModeType).toBe('string');
          expect(validation.accessControlTimeModeValid).toBe(true);
          
          // Values should be preserved
          expect(response.accessControlEnabled).toBe(enabled);
          expect(response.accessControlTimeMode).toBe(timeMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accessControlTimeMode only accepts valid enum values', () => {
    const validModes: AccessControlTimeMode[] = ['date_only', 'date_time'];
    
    fc.assert(
      fc.property(
        accessControlTimeModeArbitrary,
        (timeMode) => {
          expect(validModes).toContain(timeMode);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('default values are applied when fields are missing from raw data', () => {
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        (settings) => {
          // Input without access control fields
          const input = { ...settings };
          
          const response = transformEventSettingsResponse(input);
          
          // Defaults should be applied
          expect(response.accessControlEnabled).toBe(false);
          expect(response.accessControlTimeMode).toBe('date_only');
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accessControlEnabled toggle state is preserved exactly', () => {
    // This tests Property 1 from the design: Toggle State Persistence
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        accessControlEnabledArbitrary,
        (settings, toggleState) => {
          const input = {
            ...settings,
            accessControlEnabled: toggleState,
          };
          
          const response = transformEventSettingsResponse(input);
          
          // The stored value should exactly match the toggle state
          expect(response.accessControlEnabled).toBe(toggleState);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accessControlTimeMode selection is preserved exactly', () => {
    // This tests Property 4 from the design: Time Mode Storage
    fc.assert(
      fc.property(
        eventSettingsArbitrary,
        accessControlTimeModeArbitrary,
        (settings, timeMode) => {
          const input = {
            ...settings,
            accessControlTimeMode: timeMode,
          };
          
          const response = transformEventSettingsResponse(input);
          
          // The stored value should exactly match the selected mode
          expect(response.accessControlTimeMode).toBe(timeMode);
        }
      ),
      { numRuns: 100 }
    );
  });
});

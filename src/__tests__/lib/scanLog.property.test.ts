/**
 * Property-Based Tests for Scan Log
 * 
 * These tests use fast-check to verify universal properties across all valid inputs.
 * Each test runs a minimum of 100 iterations with randomly generated data.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  scanLogInputSchema,
  scanLogBatchSchema,
  ScanLogInput,
} from '@/types/scanLog';

/**
 * Arbitrary for generating valid ISO datetime strings
 */
const isoDatetimeArbitrary = fc.integer({
  min: new Date('2020-01-01T00:00:00Z').getTime(),
  max: new Date('2030-12-31T23:59:59Z').getTime(),
}).map(timestamp => new Date(timestamp).toISOString());

/**
 * Arbitrary for generating valid scan log inputs
 * Ensures denied scans have a denial reason (per Requirement 8.1-8.5)
 */
const scanLogInputArbitrary = fc.oneof(
  // Approved scans: no denial reason required
  fc.record({
    localId: fc.uuid(),
    attendeeId: fc.option(fc.uuid(), { nil: null }),
    barcodeScanned: fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
    result: fc.constant('approved' as const),
    denialReason: fc.constant(null),
    profileId: fc.option(fc.uuid(), { nil: null }),
    profileVersion: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    deviceId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
    scannedAt: isoDatetimeArbitrary,
  }),
  // Denied scans: must have a denial reason
  fc.record({
    localId: fc.uuid(),
    attendeeId: fc.option(fc.uuid(), { nil: null }),
    barcodeScanned: fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
    result: fc.constant('denied' as const),
    denialReason: fc.string({ minLength: 1, maxLength: 200 }),
    profileId: fc.option(fc.uuid(), { nil: null }),
    profileVersion: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
    deviceId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
    scannedAt: isoDatetimeArbitrary,
  })
);

/**
 * **Feature: mobile-access-control, Property 11: Scan log completeness**
 * **Validates: Requirements 10.1**
 * 
 * *For any* badge scan, a log record SHALL be created containing timestamp,
 * barcode, result, profile used, and denial reason if applicable.
 */
describe('Property 11: Scan log completeness', () => {
  it('scanLogInputSchema validates complete scan log records', () => {
    fc.assert(
      fc.property(
        scanLogInputArbitrary,
        (input) => {
          const result = scanLogInputSchema.safeParse(input);
          
          // Valid input should pass validation
          expect(result.success).toBe(true);
          
          if (result.success) {
            const data = result.data;
            
            // Verify all required fields are present
            expect(data.localId).toBeDefined();
            expect(data.barcodeScanned).toBeDefined();
            expect(data.result).toBeDefined();
            expect(data.deviceId).toBeDefined();
            expect(data.scannedAt).toBeDefined();
            
            // Verify result is valid enum value
            expect(['approved', 'denied']).toContain(data.result);
            
            // Verify scannedAt is a valid ISO datetime
            const parsedDate = new Date(data.scannedAt);
            expect(isNaN(parsedDate.getTime())).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('scan log contains all required fields for audit trail', () => {
    fc.assert(
      fc.property(
        scanLogInputArbitrary,
        (input) => {
          const result = scanLogInputSchema.safeParse(input);
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            const data = result.data;
            
            // Per Requirements 10.1: log record SHALL contain:
            // - timestamp (scannedAt)
            expect(typeof data.scannedAt).toBe('string');
            expect(data.scannedAt.length).toBeGreaterThan(0);
            
            // - barcode
            expect(typeof data.barcodeScanned).toBe('string');
            expect(data.barcodeScanned.length).toBeGreaterThan(0);
            
            // - result
            expect(['approved', 'denied']).toContain(data.result);
            
            // - profile used (can be null if no profile selected)
            expect(data.profileId === null || typeof data.profileId === 'string').toBe(true);
            
            // - denial reason if applicable (null for approved, string for denied)
            expect(data.denialReason === null || typeof data.denialReason === 'string').toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('denied scans must have denial reasons (Requirement 8.1-8.5)', () => {
    fc.assert(
      fc.property(
        fc.record({
          localId: fc.uuid(),
          attendeeId: fc.option(fc.uuid(), { nil: null }),
          barcodeScanned: fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
          result: fc.constant('denied' as const),
          denialReason: fc.string({ minLength: 1, maxLength: 200 }),
          profileId: fc.option(fc.uuid(), { nil: null }),
          profileVersion: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
          deviceId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          scannedAt: isoDatetimeArbitrary,
        }),
        (input) => {
          const result = scanLogInputSchema.safeParse(input);
          
          expect(result.success).toBe(true);
          expect(result.data?.result).toBe('denied');
          expect(result.data?.denialReason).toBeTruthy();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('denied scans without denial reasons are rejected', () => {
    const invalidDeniedScan = {
      localId: 'test-id',
      attendeeId: null,
      barcodeScanned: '123456',
      result: 'denied' as const,
      denialReason: null,
      profileId: null,
      profileVersion: null,
      deviceId: 'device-1',
      scannedAt: new Date().toISOString(),
    };

    const result = scanLogInputSchema.safeParse(invalidDeniedScan);
    expect(result.success).toBe(false);
  });

  it('approved scans can have null denial reasons', () => {
    fc.assert(
      fc.property(
        fc.record({
          localId: fc.uuid(),
          attendeeId: fc.option(fc.uuid(), { nil: null }),
          barcodeScanned: fc.stringMatching(/^[a-zA-Z0-9]{1,50}$/),
          result: fc.constant('approved' as const),
          denialReason: fc.constant(null),
          profileId: fc.option(fc.uuid(), { nil: null }),
          profileVersion: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: null }),
          deviceId: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
          scannedAt: isoDatetimeArbitrary,
        }),
        (input) => {
          const result = scanLogInputSchema.safeParse(input);
          
          expect(result.success).toBe(true);
          expect(result.data?.result).toBe('approved');
          expect(result.data?.denialReason).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('batch schema validates arrays of scan logs', () => {
    fc.assert(
      fc.property(
        fc.array(scanLogInputArbitrary, { minLength: 1, maxLength: 10 }),
        (logs) => {
          const result = scanLogBatchSchema.safeParse({ logs });
          
          expect(result.success).toBe(true);
          
          if (result.success) {
            expect(result.data.logs.length).toBe(logs.length);
            
            // Each log should have all required fields
            result.data.logs.forEach((log, index) => {
              expect(log.localId).toBeDefined();
              expect(log.barcodeScanned).toBeDefined();
              expect(log.result).toBeDefined();
              expect(log.deviceId).toBeDefined();
              expect(log.scannedAt).toBeDefined();
            });
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('batch schema rejects empty arrays', () => {
    const result = scanLogBatchSchema.safeParse({ logs: [] });
    expect(result.success).toBe(false);
  });

  it('batch schema rejects arrays exceeding max size', () => {
    const logs = Array(101).fill(null).map(() => ({
      localId: 'test-id',
      attendeeId: null,
      barcodeScanned: '123456',
      result: 'approved' as const,
      denialReason: null,
      profileId: null,
      profileVersion: null,
      deviceId: 'device-1',
      scannedAt: new Date().toISOString(),
    }));

    const result = scanLogBatchSchema.safeParse({ logs });
    expect(result.success).toBe(false);
  });

  it('localId is required for deduplication', () => {
    fc.assert(
      fc.property(
        scanLogInputArbitrary,
        (input) => {
          // Valid input with localId should pass
          const validResult = scanLogInputSchema.safeParse(input);
          expect(validResult.success).toBe(true);
          
          // Input without localId should fail
          const { localId, ...inputWithoutLocalId } = input;
          const invalidResult = scanLogInputSchema.safeParse({
            ...inputWithoutLocalId,
            localId: '', // Empty string should fail
          });
          expect(invalidResult.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('deviceId is required for tracking', () => {
    fc.assert(
      fc.property(
        scanLogInputArbitrary,
        (input) => {
          // Valid input with deviceId should pass
          const validResult = scanLogInputSchema.safeParse(input);
          expect(validResult.success).toBe(true);
          
          // Input without deviceId should fail
          const { deviceId, ...inputWithoutDeviceId } = input;
          const invalidResult = scanLogInputSchema.safeParse({
            ...inputWithoutDeviceId,
            deviceId: '', // Empty string should fail
          });
          expect(invalidResult.success).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('scannedAt must be a valid ISO datetime', () => {
    // Valid datetime should pass
    const validInput = {
      localId: 'test-id',
      attendeeId: null,
      barcodeScanned: '123456',
      result: 'approved' as const,
      denialReason: null,
      profileId: null,
      profileVersion: null,
      deviceId: 'device-1',
      scannedAt: new Date().toISOString(),
    };
    
    expect(scanLogInputSchema.safeParse(validInput).success).toBe(true);
    
    // Invalid datetime should fail
    const invalidInput = {
      ...validInput,
      scannedAt: 'not-a-date',
    };
    
    expect(scanLogInputSchema.safeParse(invalidInput).success).toBe(false);
  });
});

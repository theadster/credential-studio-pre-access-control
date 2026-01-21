/**
 * Property-Based Tests for Connection Notifications
 *
 * These tests verify the correctness properties defined in the design document
 * for the data refresh monitoring feature, specifically Property 18.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldSuppressNotification } from '@/lib/connectionNotifications';
import { DATA_FRESHNESS } from '@/lib/constants';

/**
 * **Feature: data-refresh-monitoring, Property 18: Notification on Connection Loss**
 * **Validates: Requirements 8.1, 8.5**
 *
 * *For any* connection loss event (transition to "disconnected"), the system SHALL
 * invoke the notification system to display a warning toast, unless the disconnection
 * duration is less than 5 seconds and auto-recovers.
 *
 * This property test verifies the suppression logic:
 * - Disconnections < 5 seconds (BRIEF_DISCONNECT_THRESHOLD) should be suppressed
 * - Disconnections >= 5 seconds should NOT be suppressed (notification shown)
 */
describe('Property 18: Notification on Connection Loss', () => {
  const { BRIEF_DISCONNECT_THRESHOLD } = DATA_FRESHNESS;

  it('suppresses notifications for brief disconnections (< threshold)', () => {
    fc.assert(
      fc.property(
        // Generate disconnection durations from 0 to just under threshold
        fc.integer({ min: 0, max: BRIEF_DISCONNECT_THRESHOLD - 1 }),
        (disconnectionDuration) => {
          const shouldSuppress = shouldSuppressNotification(disconnectionDuration);

          // Property: Brief disconnections (< 5 seconds) should be suppressed
          expect(shouldSuppress).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('does NOT suppress notifications for longer disconnections (>= threshold)', () => {
    fc.assert(
      fc.property(
        // Generate disconnection durations from threshold to 5 minutes
        fc.integer({ min: BRIEF_DISCONNECT_THRESHOLD, max: 300000 }),
        (disconnectionDuration) => {
          const shouldSuppress = shouldSuppressNotification(disconnectionDuration);

          // Property: Longer disconnections (>= 5 seconds) should NOT be suppressed
          expect(shouldSuppress).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('correctly handles the exact threshold boundary', () => {
    // Exactly at threshold should NOT be suppressed
    expect(shouldSuppressNotification(BRIEF_DISCONNECT_THRESHOLD)).toBe(false);

    // 1ms under threshold should be suppressed
    expect(shouldSuppressNotification(BRIEF_DISCONNECT_THRESHOLD - 1)).toBe(true);
  });

  it('handles edge cases correctly', () => {
    // Zero duration should be suppressed
    expect(shouldSuppressNotification(0)).toBe(true);

    // Very large duration should NOT be suppressed
    expect(shouldSuppressNotification(Number.MAX_SAFE_INTEGER)).toBe(false);
  });

  it('suppression decision is deterministic for any given duration', () => {
    fc.assert(
      fc.property(
        // Generate any valid disconnection duration
        fc.integer({ min: 0, max: 600000 }),
        (disconnectionDuration) => {
          // Call multiple times with same input
          const result1 = shouldSuppressNotification(disconnectionDuration);
          const result2 = shouldSuppressNotification(disconnectionDuration);
          const result3 = shouldSuppressNotification(disconnectionDuration);

          // Property: Same input should always produce same output
          expect(result1).toBe(result2);
          expect(result2).toBe(result3);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('suppression follows strict less-than comparison', () => {
    fc.assert(
      fc.property(
        // Generate any duration
        fc.integer({ min: 0, max: 600000 }),
        (disconnectionDuration) => {
          const shouldSuppress = shouldSuppressNotification(disconnectionDuration);

          // Property: suppression = duration < threshold (strict less-than)
          const expectedSuppression = disconnectionDuration < BRIEF_DISCONNECT_THRESHOLD;
          expect(shouldSuppress).toBe(expectedSuppression);
        }
      ),
      { numRuns: 100 }
    );
  });
});

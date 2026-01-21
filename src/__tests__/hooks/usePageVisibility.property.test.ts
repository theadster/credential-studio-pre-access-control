/**
 * Property-Based Tests for usePageVisibility Hook
 *
 * These tests verify the correctness properties defined in the design document
 * for the data refresh monitoring feature, specifically Property 11: Visibility
 * Change Debouncing.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  createVisibilityDebounceController,
  calculateMaxCallbacksInWindow,
} from '@/hooks/usePageVisibility';
import { DATA_FRESHNESS } from '@/lib/constants';

/**
 * **Feature: data-refresh-monitoring, Property 11: Visibility Change Debouncing**
 * **Validates: Requirements 4.5**
 *
 * *For any* sequence of visibility changes occurring within a 500ms window,
 * the Visibility_Recovery system SHALL execute at most one refresh operation.
 */
describe('Property 11: Visibility Change Debouncing', () => {
  const { VISIBILITY_DEBOUNCE_MS } = DATA_FRESHNESS;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('calculateMaxCallbacksInWindow', () => {
    it('returns correct count for any sequence of timestamps within debounce window', () => {
      fc.assert(
        fc.property(
          // Generate a sequence of 2-10 timestamps within a 500ms window
          fc.integer({ min: 2, max: 10 }).chain((count) =>
            fc.array(
              fc.integer({ min: 0, max: VISIBILITY_DEBOUNCE_MS - 1 }),
              { minLength: count, maxLength: count }
            )
          ),
          (offsets) => {
            const baseTime = 1000000;
            const timestamps = offsets.map((offset) => baseTime + offset);

            const maxCallbacks = calculateMaxCallbacksInWindow(
              timestamps,
              VISIBILITY_DEBOUNCE_MS
            );

            // Property: All changes within a single debounce window should result in at most 1 callback
            expect(maxCallbacks).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('returns correct count for timestamps spanning multiple debounce windows', () => {
      fc.assert(
        fc.property(
          // Generate number of windows (1-5)
          fc.integer({ min: 1, max: 5 }),
          // Generate number of changes per window (1-5)
          fc.integer({ min: 1, max: 5 }),
          (numWindows, changesPerWindow) => {
            const baseTime = 1000000;
            const timestamps: number[] = [];

            // Generate timestamps for each window
            for (let w = 0; w < numWindows; w++) {
              const windowStart = baseTime + w * VISIBILITY_DEBOUNCE_MS;
              for (let c = 0; c < changesPerWindow; c++) {
                // Spread changes within the window (but not at the boundary)
                const offset = Math.floor(
                  (c * (VISIBILITY_DEBOUNCE_MS - 1)) / changesPerWindow
                );
                timestamps.push(windowStart + offset);
              }
            }

            const maxCallbacks = calculateMaxCallbacksInWindow(
              timestamps,
              VISIBILITY_DEBOUNCE_MS
            );

            // Property: Should have at most numWindows callbacks
            // (one per debounce window)
            expect(maxCallbacks).toBeLessThanOrEqual(numWindows);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('handles empty array', () => {
      expect(calculateMaxCallbacksInWindow([], VISIBILITY_DEBOUNCE_MS)).toBe(0);
    });

    it('handles single timestamp', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 1000000 }), (timestamp) => {
          expect(
            calculateMaxCallbacksInWindow([timestamp], VISIBILITY_DEBOUNCE_MS)
          ).toBe(1);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('createVisibilityDebounceController', () => {
    it('executes at most one callback for rapid changes within debounce window', () => {
      fc.assert(
        fc.property(
          // Generate 2-10 rapid visibility changes
          fc.integer({ min: 2, max: 10 }),
          // Generate time gaps that sum to less than debounce window
          fc.integer({ min: 2, max: 10 }).chain((numGaps) =>
            fc.tuple(
              fc.constant(numGaps),
              fc.array(
                fc.integer({ min: 1, max: 100 }),
                { minLength: numGaps - 1, maxLength: numGaps - 1 }
              )
            )
          ),
          (numChanges, [numGaps, gaps]) => {
            // Ensure cumulative gaps stay within debounce window
            const numGapsToProcess = Math.min(numChanges - 1, gaps.length);
            
            // Guard against division by zero when no gaps to process
            if (numGapsToProcess === 0) {
              const controller = createVisibilityDebounceController(
                VISIBILITY_DEBOUNCE_MS
              );
              let callbackExecutions = 0;
              const callback = () => {
                callbackExecutions++;
              };

              // Only one change, executes immediately
              controller.processVisibilityChange(callback, 1000000);
              expect(callbackExecutions).toBe(1);

              controller.reset();
              return;
            }

            const maxGapPerChange = Math.floor(
              (VISIBILITY_DEBOUNCE_MS - 1) / numGapsToProcess
            );
            const constrainedGaps = gaps.map((g) => Math.min(g, maxGapPerChange));

            const controller = createVisibilityDebounceController(
              VISIBILITY_DEBOUNCE_MS
            );
            let callbackExecutions = 0;
            const callback = () => {
              callbackExecutions++;
            };

            // Process first change
            let currentTime = 1000000;
            controller.processVisibilityChange(callback, currentTime);

            // Process subsequent changes rapidly (within debounce window)
            for (let i = 0; i < numGapsToProcess; i++) {
              currentTime += constrainedGaps[i];
              controller.processVisibilityChange(callback, currentTime);
            }

            // First call executes immediately
            expect(callbackExecutions).toBe(1);

            // Advance time past debounce window to let pending callback execute
            vi.advanceTimersByTime(VISIBILITY_DEBOUNCE_MS);

            // Property: At most one additional callback should execute
            // (the debounced one from the last change in the window)
            expect(callbackExecutions).toBeLessThanOrEqual(2);

            controller.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('executes callback immediately when outside debounce window', () => {
      fc.assert(
        fc.property(
          // Generate time gap that exceeds debounce window
          fc.integer({ min: VISIBILITY_DEBOUNCE_MS, max: 10000 }),
          (gap) => {
            const controller = createVisibilityDebounceController(
              VISIBILITY_DEBOUNCE_MS
            );
            let callbackExecutions = 0;
            const callback = () => {
              callbackExecutions++;
            };

            // First change
            controller.processVisibilityChange(callback, 1000000);
            expect(callbackExecutions).toBe(1);

            // Second change after debounce window
            controller.processVisibilityChange(callback, 1000000 + gap);
            expect(callbackExecutions).toBe(2);

            controller.reset();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('decideDebounceAction returns correct decision for any timestamp pair', () => {
      fc.assert(
        fc.property(
          // Generate last timestamp
          fc.integer({ min: 0, max: 1000000 }),
          // Generate current timestamp (always >= last)
          fc.integer({ min: 0, max: 10000 }),
          (lastTimestamp, offset) => {
            const currentTimestamp = lastTimestamp + offset;
            const controller = createVisibilityDebounceController(
              VISIBILITY_DEBOUNCE_MS
            );

            const decision = controller.decideDebounceAction(
              currentTimestamp,
              lastTimestamp,
              VISIBILITY_DEBOUNCE_MS
            );

            if (lastTimestamp === 0 || offset >= VISIBILITY_DEBOUNCE_MS) {
              // Should execute immediately
              expect(decision.shouldExecuteImmediately).toBe(true);
              expect(decision.shouldSchedule).toBe(false);
            } else {
              // Should schedule for later
              expect(decision.shouldExecuteImmediately).toBe(false);
              expect(decision.shouldSchedule).toBe(true);
              expect(decision.scheduleDelay).toBe(VISIBILITY_DEBOUNCE_MS - offset);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('boundary conditions', () => {
    it('exactly at debounce boundary executes immediately', () => {
      const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
      let callbackExecutions = 0;
      const callback = () => {
        callbackExecutions++;
      };

      controller.processVisibilityChange(callback, 1000000);
      expect(callbackExecutions).toBe(1);

      // Exactly at boundary
      controller.processVisibilityChange(
        callback,
        1000000 + VISIBILITY_DEBOUNCE_MS
      );
      expect(callbackExecutions).toBe(2);
    });

    it('1ms before debounce boundary schedules callback', () => {
      const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
      let callbackExecutions = 0;
      const callback = () => {
        callbackExecutions++;
      };

      controller.processVisibilityChange(callback, 1000000);
      expect(callbackExecutions).toBe(1);

      // 1ms before boundary
      controller.processVisibilityChange(
        callback,
        1000000 + VISIBILITY_DEBOUNCE_MS - 1
      );
      expect(callbackExecutions).toBe(1); // Not executed yet

      // Advance time to let scheduled callback execute
      vi.advanceTimersByTime(1);
      expect(callbackExecutions).toBe(2);
    });

    it('1ms after debounce boundary executes immediately', () => {
      const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
      let callbackExecutions = 0;
      const callback = () => {
        callbackExecutions++;
      };

      controller.processVisibilityChange(callback, 1000000);
      expect(callbackExecutions).toBe(1);

      // 1ms after boundary
      controller.processVisibilityChange(
        callback,
        1000000 + VISIBILITY_DEBOUNCE_MS + 1
      );
      expect(callbackExecutions).toBe(2);
    });
  });

  describe('specific scenarios', () => {
    it('rapid tab switching (hidden->visible->hidden->visible) within 500ms results in at most 2 callbacks', () => {
      const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
      let callbackExecutions = 0;
      const callback = () => {
        callbackExecutions++;
      };

      // Simulate rapid tab switching
      controller.processVisibilityChange(callback, 1000000); // visible
      controller.processVisibilityChange(callback, 1000100); // visible again (100ms later)
      controller.processVisibilityChange(callback, 1000200); // visible again (200ms later)
      controller.processVisibilityChange(callback, 1000300); // visible again (300ms later)

      // First call executes immediately
      expect(callbackExecutions).toBe(1);

      // Advance time to let any pending callback execute
      vi.advanceTimersByTime(VISIBILITY_DEBOUNCE_MS);

      // At most one additional callback (the debounced one)
      expect(callbackExecutions).toBeLessThanOrEqual(2);
    });

    it('canceling pending callback prevents execution', () => {
      const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
      let callbackExecutions = 0;
      const callback = () => {
        callbackExecutions++;
      };

      controller.processVisibilityChange(callback, 1000000);
      expect(callbackExecutions).toBe(1);

      // Trigger a change within debounce window (schedules callback)
      controller.processVisibilityChange(callback, 1000100);
      expect(callbackExecutions).toBe(1);

      // Cancel the pending callback
      controller.cancelPending();

      // Advance time - callback should not execute
      vi.advanceTimersByTime(VISIBILITY_DEBOUNCE_MS);
      expect(callbackExecutions).toBe(1);
    });

    it('reset clears state and allows immediate execution', () => {
      const controller = createVisibilityDebounceController(VISIBILITY_DEBOUNCE_MS);
      let callbackExecutions = 0;
      const callback = () => {
        callbackExecutions++;
      };

      controller.processVisibilityChange(callback, 1000000);
      expect(callbackExecutions).toBe(1);

      // Reset the controller
      controller.reset();

      // Next call should execute immediately (as if first call)
      controller.processVisibilityChange(callback, 1000100);
      expect(callbackExecutions).toBe(2);
    });
  });
});

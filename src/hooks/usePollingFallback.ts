/**
 * usePollingFallback Hook
 *
 * Provides polling fallback when real-time WebSocket connection fails.
 * Activates after extended disconnection and deactivates when connection restores.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 * @see src/types/connectionHealth.ts
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  UsePollingFallbackOptions,
  UsePollingFallbackReturn,
  calculateBackoff,
} from '@/types/connectionHealth';
import { CONNECTION_HEALTH, DATA_FRESHNESS } from '@/lib/constants';

/**
 * Hook for providing polling fallback when real-time connection fails.
 *
 * Features:
 * - Activates polling when enabled and connection has been disconnected > 60s
 * - Polls at configurable interval (default: 30 seconds)
 * - Automatically deactivates when connection is restored
 * - Supports selective polling based on active tab data type
 * - Implements retry with exponential backoff on poll failures
 *
 * @param options - Configuration options for the hook
 * @returns Polling state and control methods
 *
 * @example
 * ```tsx
 * const { isPolling, lastPollAt, pollNow } = usePollingFallback({
 *   enabled: connectionState.status === 'disconnected',
 *   dataType: 'attendees',
 *   onPoll: async () => {
 *     await fetchAttendees();
 *   },
 *   onError: (error) => console.error('Poll failed:', error),
 * });
 * ```
 */
export function usePollingFallback(
  options: UsePollingFallbackOptions,
): UsePollingFallbackReturn {
  const {
    enabled,
    interval = DATA_FRESHNESS.POLLING_INTERVAL,
    dataType,
    onPoll,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(false);
  const [lastPollAt, setLastPollAt] = useState<Date | null>(null);

  // Refs for cleanup and tracking
  const isMountedRef = useRef(true);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryAttemptRef = useRef(0);
  const enabledTimestampRef = useRef<number | null>(null);
  const isPollInProgressRef = useRef(false);
  const isPollingRef = useRef(false);

  /**
   * Clears all timeouts and intervals
   */
  const clearAllTimers = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    if (activationTimeoutRef.current) {
      clearTimeout(activationTimeoutRef.current);
      activationTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Executes a single poll operation with error handling
   */
  const executePoll = useCallback(async (): Promise<boolean> => {
    if (!onPoll || isPollInProgressRef.current) {
      return true; // No-op if no callback or already polling
    }

    isPollInProgressRef.current = true;

    try {
      await onPoll();
      if (isMountedRef.current) {
        setLastPollAt(new Date());
        retryAttemptRef.current = 0; // Reset retry counter on success
      }
      return true;
    } catch (error) {
      if (isMountedRef.current) {
        onError?.(error instanceof Error ? error : new Error(String(error)));
      }
      return false;
    } finally {
      isPollInProgressRef.current = false;
    }
  }, [onPoll, onError]);

  /**
   * Schedules a retry with exponential backoff (Requirement 5.5)
   */
  const scheduleRetry = useCallback(() => {
    if (!isMountedRef.current || !isPollingRef.current) return;

    retryAttemptRef.current += 1;
    const maxRetries = 3;

    if (retryAttemptRef.current > maxRetries) {
      // Max retries reached, wait for next regular interval
      retryAttemptRef.current = 0;
      return;
    }

    const delay = calculateBackoff(
      retryAttemptRef.current,
      CONNECTION_HEALTH.INITIAL_BACKOFF,
      CONNECTION_HEALTH.MAX_BACKOFF,
    );

    retryTimeoutRef.current = setTimeout(async () => {
      if (isMountedRef.current && isPollingRef.current) {
        const success = await executePoll();
        if (!success) {
          scheduleRetry();
        }
      }
    }, delay);
  }, [executePoll]);

  /**
   * Manually trigger an immediate poll (Requirement 5.2)
   */
  const pollNow = useCallback(async (): Promise<void> => {
    const success = await executePoll();
    if (!success && isPollingRef.current) {
      scheduleRetry();
    }
  }, [executePoll, scheduleRetry]);

  /**
   * Starts the polling interval (Requirement 5.2)
   */
  const startPolling = useCallback(() => {
    if (!isMountedRef.current) return;

    // Set ref immediately before state update to ensure scheduleRetry sees true
    isPollingRef.current = true;
    setIsPolling(true);

    // Execute initial poll immediately
    executePoll().then((success) => {
      if (!success && isMountedRef.current) {
        scheduleRetry();
      }
    });

    // Set up interval for subsequent polls
    pollingIntervalRef.current = setInterval(async () => {
      if (isMountedRef.current && !isPollInProgressRef.current) {
        const success = await executePoll();
        if (!success) {
          scheduleRetry();
        }
      }
    }, interval);
  }, [executePoll, interval, scheduleRetry]);

  /**
   * Stops polling (Requirement 5.3)
   */
  const stopPolling = useCallback(() => {
    clearAllTimers();
    isPollingRef.current = false;
    setIsPolling(false);
    retryAttemptRef.current = 0;
    enabledTimestampRef.current = null;
  }, [clearAllTimers]);

  // Handle enabled state changes (Requirements 5.1, 5.3)
  useEffect(() => {
    if (enabled) {
      // Record when enabled became true
      if (enabledTimestampRef.current === null) {
        enabledTimestampRef.current = Date.now();
      }

      // Schedule activation after POLLING_ACTIVATION_DELAY (Requirement 5.1)
      // Only if not already polling
      if (!isPolling && !activationTimeoutRef.current) {
        const timeSinceEnabled = Date.now() - enabledTimestampRef.current;
        const remainingDelay = Math.max(
          0,
          DATA_FRESHNESS.POLLING_ACTIVATION_DELAY - timeSinceEnabled,
        );

        activationTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current && enabled) {
            startPolling();
          }
        }, remainingDelay);
      }
    } else {
      // Connection restored - deactivate polling (Requirement 5.3)
      stopPolling();
    }

    return () => {
      // Cleanup activation timeout on dependency change
      if (activationTimeoutRef.current) {
        clearTimeout(activationTimeoutRef.current);
        activationTimeoutRef.current = null;
      }
    };
  }, [enabled, isPolling, startPolling, stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    isPolling,
    lastPollAt,
    pollNow,
  };
}

export default usePollingFallback;

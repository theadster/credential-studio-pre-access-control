/**
 * useConnectionHealth Hook
 *
 * Monitors WebSocket connection health and manages reconnection state.
 * Provides connection status tracking, automatic reconnection with exponential
 * backoff, and callbacks for status changes.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 * @see src/types/connectionHealth.ts
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ConnectionState,
  ConnectionStatus,
  UseConnectionHealthOptions,
  UseConnectionHealthReturn,
  calculateBackoff,
} from '@/types/connectionHealth';
import { CONNECTION_HEALTH } from '@/lib/constants';

/**
 * Initial connection state
 */
const initialState: ConnectionState = {
  status: 'connecting',
  lastConnectedAt: null,
  lastDisconnectedAt: null,
  reconnectAttempt: 0,
  nextReconnectAt: null,
  error: null,
};

/**
 * Hook for monitoring WebSocket connection health and managing reconnection.
 *
 * Features:
 * - Tracks connection status (connected, connecting, disconnected, reconnecting)
 * - Records connection/disconnection timestamps
 * - Implements exponential backoff for reconnection attempts
 * - Provides callbacks for status changes and reconnection events
 * - Supports manual reconnection with backoff reset
 *
 * @param options - Configuration options for the hook
 * @returns Connection state and control methods
 *
 * @example
 * ```tsx
 * const { state, reconnect, isHealthy } = useConnectionHealth({
 *   onStatusChange: (status) => console.log('Status:', status),
 *   onReconnectSuccess: () => console.log('Reconnected!'),
 *   onReconnectFailure: (error) => console.error('Failed:', error),
 * });
 * ```
 */
export function useConnectionHealth(
  options: UseConnectionHealthOptions = {}
): UseConnectionHealthReturn {
  const {
    maxReconnectAttempts = CONNECTION_HEALTH.MAX_RECONNECT_ATTEMPTS,
    initialBackoff = CONNECTION_HEALTH.INITIAL_BACKOFF,
    maxBackoff = CONNECTION_HEALTH.MAX_BACKOFF,
    onStatusChange,
    onReconnectSuccess,
    onReconnectFailure,
  } = options;

  const [state, setState] = useState<ConnectionState>(initialState);

  // Refs for cleanup and tracking
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);
  const reconnectAttemptRef = useRef(0);

  /**
   * Updates connection status and emits status change event
   */
  const updateStatus = useCallback(
    (newStatus: ConnectionStatus, additionalState?: Partial<ConnectionState>) => {
      setState((prev) => {
        const updated: ConnectionState = {
          ...prev,
          status: newStatus,
          ...additionalState,
        };
        return updated;
      });

      // Emit status change event via callback (Requirement 1.4)
      onStatusChange?.(newStatus);
    },
    [onStatusChange]
  );

  /**
   * Marks connection as established (Requirement 1.1)
   * Records connection timestamp and sets status to "connected"
   */
  const markConnected = useCallback(() => {
    const now = new Date();
    reconnectAttemptRef.current = 0;
    updateStatus('connected', {
      lastConnectedAt: now,
      reconnectAttempt: 0,
      nextReconnectAt: null,
      error: null,
    });
  }, [updateStatus]);

  /**
   * Marks connection as disconnected (Requirements 1.3, 1.5)
   * Records disconnection timestamp and sets status to "disconnected"
   */
  const markDisconnected = useCallback(
    (error?: Error) => {
      const now = new Date();
      updateStatus('disconnected', {
        lastDisconnectedAt: now,
        error: error || null,
      });
    },
    [updateStatus]
  );

  /**
   * Clears any pending reconnection timeout
   */
  const clearReconnectTimeout = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Schedules a reconnection attempt with exponential backoff (Requirements 2.1, 2.2, 2.4)
   */
  const scheduleReconnect = useCallback(
    (attempt: number) => {
      if (!isMountedRef.current) return;

      // Validate attempt is positive (Requirement 2.1)
      if (attempt < 1) {
        console.warn('scheduleReconnect called with invalid attempt:', attempt);
        return;
      }

      // Check max attempts limit (Requirement 2.5)
      if (attempt > maxReconnectAttempts && maxReconnectAttempts > 0) {
        const error = new Error(
          `Maximum reconnection attempts (${maxReconnectAttempts}) reached`
        );
        reconnectAttemptRef.current = 0;
        updateStatus('disconnected', {
          error,
          nextReconnectAt: null,
        });
        onReconnectFailure?.(error);
        return;
      }

      // Update ref immediately to ensure handleReconnectFailure sees current attempt
      reconnectAttemptRef.current = attempt;

      // Calculate backoff delay (Requirement 2.2)
      const delay = calculateBackoff(attempt, initialBackoff, maxBackoff);
      const nextReconnectAt = new Date(Date.now() + delay);

      // Update state to reconnecting using shared helper
      updateStatus('reconnecting', {
        reconnectAttempt: attempt,
        nextReconnectAt,
      });

      // Schedule the reconnection attempt
      clearReconnectTimeout();
      reconnectTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          // The actual reconnection logic will be handled by the consumer
          // This hook just manages the state and timing
          setState((prev) => ({
            ...prev,
            nextReconnectAt: null,
          }));
        }
      }, delay);
    },
    [
      maxReconnectAttempts,
      initialBackoff,
      maxBackoff,
      updateStatus,
      onReconnectFailure,
      clearReconnectTimeout,
    ]
  );

  /**
   * Handles successful reconnection (Requirement 2.3)
   */
  const handleReconnectSuccess = useCallback(() => {
    clearReconnectTimeout();
    markConnected();
    onReconnectSuccess?.();
  }, [clearReconnectTimeout, markConnected, onReconnectSuccess]);

  /**
   * Handles failed reconnection attempt (Requirement 2.4)
   */
  const handleReconnectFailure = useCallback(
    (error?: Error) => {
      const nextAttempt = reconnectAttemptRef.current + 1;
      if (error) {
        setState((prev) => ({ ...prev, error }));
      }
      scheduleReconnect(nextAttempt);
    },
    [scheduleReconnect]
  );

  /**
   * Manually trigger a reconnection attempt (Requirement 2.6)
   * Resets backoff counter and attempts immediate reconnection
   */
  const reconnect = useCallback(() => {
    clearReconnectTimeout();
    // Reset to attempt 1 for manual reconnection
    scheduleReconnect(1);
  }, [clearReconnectTimeout, scheduleReconnect]);

  /**
   * Reset the backoff counter (Requirement 2.6)
   * Used when user manually triggers reconnection
   */
  const resetBackoff = useCallback(() => {
    clearReconnectTimeout();
    reconnectAttemptRef.current = 0;
    setState((prev) => ({
      ...prev,
      reconnectAttempt: 0,
      nextReconnectAt: null,
    }));
  }, [clearReconnectTimeout]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearReconnectTimeout();
    };
  }, [clearReconnectTimeout]);

  return {
    state,
    reconnect,
    resetBackoff,
    isHealthy: state.status === 'connected',
    maxReconnectAttempts,
    // Internal methods exposed for integration with useRealtimeSubscription
    _internal: {
      markConnected,
      markDisconnected,
      handleReconnectSuccess,
      handleReconnectFailure,
      scheduleReconnect,
    },
  };
}

export default useConnectionHealth;

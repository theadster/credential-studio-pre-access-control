/**
 * useDataFreshness Hook
 *
 * Tracks data staleness for different data types and provides
 * human-readable relative time formatting.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 * @see src/types/connectionHealth.ts
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  FreshnessState,
  UseDataFreshnessOptions,
  UseDataFreshnessReturn,
} from '@/types/connectionHealth';
import { DATA_FRESHNESS } from '@/lib/constants';

/**
 * Initial freshness state
 */
const initialState: FreshnessState = {
  lastUpdatedAt: null,
  isStale: false,
  staleDuration: null,
};

/**
 * Calculates staleness based on last update timestamp and threshold.
 * Formula: isStale = (now - lastUpdatedAt) > threshold
 *
 * @param lastUpdatedAt - Timestamp of last update (null if never updated)
 * @param threshold - Staleness threshold in milliseconds
 * @returns Object with isStale boolean and staleDuration (null if not stale)
 */
export function calculateStaleness(
  lastUpdatedAt: Date | null,
  threshold: number
): { isStale: boolean; staleDuration: number | null } {
  if (lastUpdatedAt === null) {
    // Data that has never been updated is considered stale
    return { isStale: true, staleDuration: null };
  }

  const now = Date.now();
  const lastUpdateTime = lastUpdatedAt.getTime();
  const timeSinceUpdate = now - lastUpdateTime;

  if (timeSinceUpdate > threshold) {
    return {
      isStale: true,
      staleDuration: timeSinceUpdate - threshold,
    };
  }

  return { isStale: false, staleDuration: null };
}

/**
 * Formats a timestamp as a human-readable relative time string.
 * Examples: "just now", "5 seconds ago", "2 minutes ago", "1 hour ago"
 *
 * @param lastUpdatedAt - Timestamp to format (null returns "never")
 * @returns Human-readable relative time string
 */
export function formatRelativeTime(lastUpdatedAt: Date | null): string {
  if (lastUpdatedAt === null) {
    return 'never';
  }

  const now = Date.now();
  const lastUpdateTime = lastUpdatedAt.getTime();
  const diffMs = now - lastUpdateTime;

  // Handle future timestamps (shouldn't happen, but be safe)
  if (diffMs < 0) {
    return 'just now';
  }

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 5) {
    return 'just now';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds} second${diffSeconds === 1 ? '' : 's'} ago`;
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

/**
 * Hook for tracking data freshness and staleness.
 *
 * Features:
 * - Tracks last update timestamp for a specific data type
 * - Calculates staleness based on configurable threshold
 * - Provides human-readable relative time formatting
 * - Supports manual refresh with loading state
 * - Emits callbacks when data becomes stale or is refreshed
 *
 * @param options - Configuration options for the hook
 * @param refreshFn - Function to call when refresh is triggered
 * @returns Freshness state and control methods
 *
 * @example
 * ```tsx
 * const { state, markFresh, getRelativeTime, refresh, isRefreshing } = useDataFreshness(
 *   {
 *     dataType: 'attendees',
 *     stalenessThreshold: 30000,
 *     onBecomeStale: () => console.log('Data is stale!'),
 *     onRefresh: () => console.log('Data refreshed!'),
 *   },
 *   async () => {
 *     await fetchAttendees();
 *   }
 * );
 * ```
 */
export function useDataFreshness(
  options: UseDataFreshnessOptions,
  refreshFn: () => Promise<void>
): UseDataFreshnessReturn {
  const {
    dataType,
    stalenessThreshold = DATA_FRESHNESS.STALENESS_THRESHOLD,
    onBecomeStale,
    onRefresh,
  } = options;

  const [state, setState] = useState<FreshnessState>(initialState);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for cleanup and tracking
  const isMountedRef = useRef(true);
  const stalenessCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wasStaleRef = useRef(false);
  const refreshFnRef = useRef(refreshFn);

  // Keep refreshFn ref updated without causing re-renders
  useEffect(() => {
    refreshFnRef.current = refreshFn;
  }, [refreshFn]);

  /**
   * Updates staleness state based on current time
   * Only updates state if the staleness status actually changed
   */
  const updateStaleness = useCallback(() => {
    setState((prev) => {
      const { isStale, staleDuration } = calculateStaleness(
        prev.lastUpdatedAt,
        stalenessThreshold
      );

      // Only update if staleness status changed (not duration)
      // This prevents unnecessary re-renders
      if (prev.isStale === isStale) {
        return prev;
      }

      return {
        ...prev,
        isStale,
        staleDuration,
      };
    });
  }, [stalenessThreshold]);

  /**
   * Marks data as fresh (Requirement 3.1)
   * Called after successful data fetch or real-time update
   */
  const markFresh = useCallback(() => {
    const now = new Date();
    setState({
      lastUpdatedAt: now,
      isStale: false,
      staleDuration: null,
    });
    wasStaleRef.current = false;
    onRefresh?.();
  }, [onRefresh]);

  /**
   * Gets human-readable relative time since last update (Requirement 3.4)
   * This is a pure function that doesn't cause re-renders
   */
  const getRelativeTime = useCallback((): string => {
    return formatRelativeTime(state.lastUpdatedAt);
  }, [state.lastUpdatedAt]);

  /**
   * Triggers a manual data refresh
   */
  const refresh = useCallback(async (): Promise<void> => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await refreshFnRef.current();
      if (isMountedRef.current) {
        markFresh();
      }
    } finally {
      if (isMountedRef.current) {
        setIsRefreshing(false);
      }
    }
  }, [isRefreshing, markFresh]);

  // Check for staleness changes and emit callback (Requirement 3.3)
  useEffect(() => {
    if (state.isStale && !wasStaleRef.current) {
      wasStaleRef.current = true;
      onBecomeStale?.();
    } else if (!state.isStale) {
      wasStaleRef.current = false;
    }
  }, [state.isStale, onBecomeStale]);

  // Set up periodic staleness check (Requirement 3.2)
  // Use a longer interval (5 seconds) to reduce re-renders
  useEffect(() => {
    // Check staleness every 5 seconds instead of 1 second
    // This significantly reduces re-renders while still being responsive
    const checkInterval = 5000;

    stalenessCheckIntervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        updateStaleness();
      }
    }, checkInterval);

    return () => {
      if (stalenessCheckIntervalRef.current) {
        clearInterval(stalenessCheckIntervalRef.current);
        stalenessCheckIntervalRef.current = null;
      }
    };
  }, [updateStaleness]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (stalenessCheckIntervalRef.current) {
        clearInterval(stalenessCheckIntervalRef.current);
      }
    };
  }, []);

  // Memoize return value to prevent unnecessary re-renders
  const returnValue = useMemo(
    (): UseDataFreshnessReturn => ({
      state,
      markFresh,
      getRelativeTime,
      refresh,
      isRefreshing,
    }),
    [state, markFresh, getRelativeTime, refresh, isRefreshing]
  );

  return returnValue;
}

export default useDataFreshness;

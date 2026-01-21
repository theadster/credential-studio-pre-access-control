import { useState, useEffect, useRef, useCallback } from 'react';
import { DATA_FRESHNESS } from '@/lib/constants';

/**
 * Options for configuring the usePageVisibility hook with recovery callbacks
 */
export interface UsePageVisibilityOptions {
  /** Callback to execute when page becomes visible (debounced) */
  onBecomeVisible?: () => void;
  /** Callback to execute when page becomes hidden */
  onBecomeHidden?: () => void;
  /** Debounce window in ms for visibility changes (default: 500ms) */
  debounceMs?: number;
  /** Whether to enable debouncing (default: true) */
  enableDebounce?: boolean;
}

/**
 * Return type for the enhanced usePageVisibility hook
 */
export interface UsePageVisibilityReturn {
  /** Whether the page is currently visible */
  isVisible: boolean;
  /** Timestamp of last visibility change to visible */
  lastBecameVisibleAt: Date | null;
  /** Manually trigger the onBecomeVisible callback (useful for testing) */
  triggerVisibilityRecovery: () => void;
}

/**
 * Result of a debounce decision
 */
export interface DebounceDecision {
  /** Whether the callback should be executed immediately */
  shouldExecuteImmediately: boolean;
  /** Whether the callback should be scheduled for later */
  shouldSchedule: boolean;
  /** Delay in ms before scheduled execution (only if shouldSchedule is true) */
  scheduleDelay: number;
}

/**
 * State for the visibility debounce controller
 */
export interface VisibilityDebounceState {
  /** Timestamp of the last visibility change */
  lastChangeTimestamp: number;
  /** Number of callbacks executed */
  callbackCount: number;
}

/**
 * Creates a visibility debounce controller for testing and use in the hook.
 * This is a pure function that determines whether a callback should be executed
 * immediately, scheduled for later, or skipped based on the debounce window.
 * 
 * **Property 11: Visibility Change Debouncing**
 * For any sequence of visibility changes occurring within a 500ms window,
 * the Visibility_Recovery system SHALL execute at most one refresh operation.
 * 
 * @param debounceMs - The debounce window in milliseconds
 * @returns A controller object with methods to manage debouncing
 */
export function createVisibilityDebounceController(debounceMs: number = DATA_FRESHNESS.VISIBILITY_DEBOUNCE_MS) {
  let lastChangeTimestamp = 0;
  let pendingTimer: ReturnType<typeof setTimeout> | null = null;
  let callbackCount = 0;

  /**
   * Determines what action to take for a visibility change at the given timestamp.
   * This is a pure function for testing purposes.
   * 
   * @param currentTimestamp - The timestamp of the current visibility change
   * @param lastTimestamp - The timestamp of the last visibility change
   * @param debounceWindow - The debounce window in ms
   * @returns Decision about whether to execute immediately or schedule
   */
  function decideDebounceAction(
    currentTimestamp: number,
    lastTimestamp: number,
    debounceWindow: number
  ): DebounceDecision {
    const timeSinceLastChange = currentTimestamp - lastTimestamp;
    
    // First call or outside debounce window - execute immediately
    if (lastTimestamp === 0 || timeSinceLastChange >= debounceWindow) {
      return {
        shouldExecuteImmediately: true,
        shouldSchedule: false,
        scheduleDelay: 0,
      };
    }
    
    // Within debounce window - schedule for later
    return {
      shouldExecuteImmediately: false,
      shouldSchedule: true,
      scheduleDelay: debounceWindow - timeSinceLastChange,
    };
  }

  /**
   * Process a visibility change and execute the callback according to debounce rules.
   * 
   * @param callback - The callback to execute
   * @param currentTime - Optional current timestamp (defaults to Date.now())
   */
  function processVisibilityChange(callback: () => void, currentTime?: number): void {
    const now = currentTime ?? Date.now();
    
    // Clear any pending timer
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }

    const decision = decideDebounceAction(now, lastChangeTimestamp, debounceMs);
    lastChangeTimestamp = now;

    if (decision.shouldExecuteImmediately) {
      callback();
      callbackCount++;
    } else if (decision.shouldSchedule) {
      pendingTimer = setTimeout(() => {
        callback();
        callbackCount++;
        pendingTimer = null;
      }, decision.scheduleDelay);
    }
  }

  /**
   * Get the current state of the debounce controller
   */
  function getState(): VisibilityDebounceState {
    return {
      lastChangeTimestamp,
      callbackCount,
    };
  }

  /**
   * Reset the controller state (useful for testing)
   */
  function reset(): void {
    lastChangeTimestamp = 0;
    callbackCount = 0;
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  /**
   * Cancel any pending scheduled callback
   */
  function cancelPending(): void {
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      pendingTimer = null;
    }
  }

  return {
    processVisibilityChange,
    decideDebounceAction,
    getState,
    reset,
    cancelPending,
  };
}

/**
 * Pure function to calculate the maximum number of callback executions
 * for a sequence of visibility changes within a time window.
 * 
 * This implements Property 11: For any sequence of visibility changes
 * occurring within a debounce window, at most one refresh operation
 * SHALL be executed.
 * 
 * @param changeTimestamps - Array of timestamps when visibility changes occurred
 * @param debounceMs - The debounce window in milliseconds
 * @returns The maximum number of callbacks that would be executed
 */
export function calculateMaxCallbacksInWindow(
  changeTimestamps: number[],
  debounceMs: number
): number {
  if (changeTimestamps.length === 0) return 0;
  if (changeTimestamps.length === 1) return 1;

  // Sort timestamps
  const sorted = [...changeTimestamps].sort((a, b) => a - b);
  
  // Count how many "windows" of debounceMs we have
  // Each window can have at most 1 callback
  let windowCount = 1;
  let windowStart = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - windowStart >= debounceMs) {
      // New window starts
      windowCount++;
      windowStart = sorted[i];
    }
    // Otherwise, this change is within the current window
    // and will be debounced (only the last one in the window executes)
  }

  return windowCount;
}

/**
 * Custom hook to track page visibility using the Page Visibility API
 * Enhanced with recovery callbacks and debouncing for data refresh integration.
 * 
 * Features:
 * - Tracks page visibility state
 * - Debounces rapid visibility changes to prevent excessive refresh requests
 * - Provides callbacks for visibility transitions
 * - Integration point for triggering data refresh on visibility recovery
 * 
 * @param options - Configuration options for visibility tracking
 * @returns Object containing visibility state and recovery utilities
 * 
 * @example
 * ```tsx
 * const { isVisible, triggerVisibilityRecovery } = usePageVisibility({
 *   onBecomeVisible: () => {
 *     // Refresh data when tab becomes visible
 *     refreshData();
 *   },
 *   debounceMs: 500
 * });
 * ```
 */
export function usePageVisibility(options: UsePageVisibilityOptions = {}): UsePageVisibilityReturn {
  const {
    onBecomeVisible,
    onBecomeHidden,
    debounceMs = DATA_FRESHNESS.VISIBILITY_DEBOUNCE_MS,
    enableDebounce = true,
  } = options;

  const [isVisible, setIsVisible] = useState<boolean>(() => {
    // Initialize with current visibility state
    if (typeof document !== 'undefined') {
      return !document.hidden;
    }
    return true;
  });

  const [lastBecameVisibleAt, setLastBecameVisibleAt] = useState<Date | null>(null);

  // Refs for debouncing
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVisibilityChangeRef = useRef<number>(0);
  const pendingCallbackRef = useRef<(() => void) | null>(null);

  // Store callbacks in refs to avoid effect dependencies
  const onBecomeVisibleRef = useRef(onBecomeVisible);
  const onBecomeHiddenRef = useRef(onBecomeHidden);

  // Update refs when callbacks change
  useEffect(() => {
    onBecomeVisibleRef.current = onBecomeVisible;
    onBecomeHiddenRef.current = onBecomeHidden;
  }, [onBecomeVisible, onBecomeHidden]);

  /**
   * Execute the onBecomeVisible callback with debouncing
   * Prevents excessive calls during rapid visibility changes
   */
  const executeVisibilityCallback = useCallback((callback: (() => void) | undefined, isVisibleNow: boolean) => {
    if (!callback) return;

    const now = Date.now();
    const timeSinceLastChange = now - lastVisibilityChangeRef.current;

    // Clear any pending debounced callback
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (enableDebounce && timeSinceLastChange < debounceMs) {
      // Within debounce window - schedule callback for later
      pendingCallbackRef.current = callback;
      debounceTimerRef.current = setTimeout(() => {
        if (pendingCallbackRef.current) {
          pendingCallbackRef.current();
          pendingCallbackRef.current = null;
        }
        debounceTimerRef.current = null;
      }, debounceMs - timeSinceLastChange);
    } else {
      // Outside debounce window - execute immediately
      callback();
    }

    lastVisibilityChangeRef.current = now;
  }, [debounceMs, enableDebounce]);

  /**
   * Manually trigger the visibility recovery callback
   * Useful for programmatic refresh or testing
   */
  const triggerVisibilityRecovery = useCallback(() => {
    if (onBecomeVisibleRef.current) {
      onBecomeVisibleRef.current();
    }
  }, []);

  useEffect(() => {
    // Check if Page Visibility API is supported
    if (typeof document === 'undefined' || typeof document.hidden === 'undefined') {
      console.warn('Page Visibility API is not supported');
      return;
    }

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
      if (visible) {
        setLastBecameVisibleAt(new Date());
        executeVisibilityCallback(onBecomeVisibleRef.current, true);
      } else {
        // Hidden callbacks are not debounced - execute immediately
        onBecomeHiddenRef.current?.();
      }
      
      // Log visibility changes in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Page visibility changed: ${visible ? 'visible' : 'hidden'}`);
      }
    };

    // Add event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clear any pending debounced callback
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [executeVisibilityCallback]);

  return {
    isVisible,
    lastBecameVisibleAt,
    triggerVisibilityRecovery,
  };
}

/**
 * Simple hook that returns just the visibility boolean
 * For backward compatibility with existing code
 * 
 * @returns boolean indicating if the page is currently visible
 */
export function usePageVisibilitySimple(): boolean {
  const { isVisible } = usePageVisibility();
  return isVisible;
}

/**
 * Options for usePageVisibilityChange hook
 */
export interface UsePageVisibilityChangeOptions {
  /** Callback to execute when page becomes visible */
  onVisible?: () => void;
  /** Callback to execute when page becomes hidden */
  onHidden?: () => void;
  /** Debounce window in ms for visibility changes (default: 500ms) */
  debounceMs?: number;
  /** Whether to enable debouncing for onVisible callback (default: true) */
  enableDebounce?: boolean;
}

/**
 * Custom hook to execute a callback when page visibility changes
 * Enhanced with debouncing support for the onVisible callback.
 * 
 * @param options - Configuration options or legacy onVisible callback
 * @param onHidden - Legacy onHidden callback (deprecated, use options object)
 * 
 * @example
 * ```tsx
 * // New API with options
 * usePageVisibilityChange({
 *   onVisible: () => console.log('Page is now visible'),
 *   onHidden: () => console.log('Page is now hidden'),
 *   debounceMs: 500
 * });
 * 
 * // Legacy API (still supported)
 * usePageVisibilityChange(
 *   () => console.log('Page is now visible'),
 *   () => console.log('Page is now hidden')
 * );
 * ```
 */
export function usePageVisibilityChange(
  optionsOrOnVisible?: UsePageVisibilityChangeOptions | (() => void),
  onHiddenLegacy?: () => void
): void {
  // Support both new options API and legacy callback API
  const isLegacyApi = typeof optionsOrOnVisible === 'function' || optionsOrOnVisible === undefined;
  
  const options: UsePageVisibilityChangeOptions = isLegacyApi
    ? {
        onVisible: optionsOrOnVisible as (() => void) | undefined,
        onHidden: onHiddenLegacy,
        debounceMs: DATA_FRESHNESS.VISIBILITY_DEBOUNCE_MS,
        enableDebounce: true,
      }
    : optionsOrOnVisible;

  const {
    onVisible,
    onHidden,
    debounceMs = DATA_FRESHNESS.VISIBILITY_DEBOUNCE_MS,
    enableDebounce = true,
  } = options;

  // Use the enhanced hook internally
  usePageVisibility({
    onBecomeVisible: onVisible,
    onBecomeHidden: onHidden,
    debounceMs,
    enableDebounce,
  });
}

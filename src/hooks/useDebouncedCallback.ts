import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for creating a debounced callback function
 * Automatically cleans up pending timeouts on unmount
 * 
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced version of the callback
 * 
 * @example
 * ```tsx
 * const debouncedRefresh = useDebouncedCallback(() => {
 *   fetchData();
 * }, 500);
 * 
 * // Call multiple times, only executes once after 500ms
 * debouncedRefresh();
 * debouncedRefresh();
 * debouncedRefresh();
 * ```
 */
export function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);

  // Keep callback ref up to date
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
        timeoutRef.current = undefined;
      }, delay);
    },
    [delay]
  );
}

/**
 * Custom hook for managing multiple debounced callbacks
 * Useful when you need to debounce several different functions
 * 
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Object with debounce function and cleanup
 * 
 * @example
 * ```tsx
 * const { debounce, cleanup } = useDebounceManager(500);
 * 
 * const debouncedRefreshAttendees = debounce('attendees', refreshAttendees);
 * const debouncedRefreshUsers = debounce('users', refreshUsers);
 * ```
 */
export function useDebounceManager(delay: number = 500) {
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      timeoutsRef.current.clear();
    };
  }, []);

  const debounce = useCallback(
    <T extends (...args: any[]) => void>(key: string, callback: T) => {
      return (...args: Parameters<T>) => {
        // Clear existing timeout for this key
        const existingTimeout = timeoutsRef.current.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
          callback(...args);
          timeoutsRef.current.delete(key);
        }, delay);

        timeoutsRef.current.set(key, timeout);
      };
    },
    [delay]
  );

  const cleanup = useCallback(() => {
    timeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    timeoutsRef.current.clear();
  }, []);

  return { debounce, cleanup };
}

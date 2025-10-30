import { useState, useEffect } from 'react';

/**
 * Custom hook to track page visibility using the Page Visibility API
 * Useful for pausing expensive operations when the page is hidden
 * 
 * @returns boolean indicating if the page is currently visible
 * 
 * @example
 * ```tsx
 * const isVisible = usePageVisibility();
 * 
 * useRealtimeSubscription({
 *   channels: [...],
 *   callback: ...,
 *   enabled: isVisible // Only subscribe when page is visible
 * });
 * ```
 */
export function usePageVisibility(): boolean {
  const [isVisible, setIsVisible] = useState<boolean>(() => {
    // Initialize with current visibility state
    if (typeof document !== 'undefined') {
      return !document.hidden;
    }
    return true;
  });

  useEffect(() => {
    // Check if Page Visibility API is supported
    if (typeof document === 'undefined' || typeof document.hidden === 'undefined') {
      console.warn('Page Visibility API is not supported');
      return;
    }

    const handleVisibilityChange = () => {
      const visible = !document.hidden;
      setIsVisible(visible);
      
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
    };
  }, []);

  return isVisible;
}

/**
 * Custom hook to execute a callback when page visibility changes
 * 
 * @param onVisible - Callback to execute when page becomes visible
 * @param onHidden - Callback to execute when page becomes hidden
 * 
 * @example
 * ```tsx
 * usePageVisibilityChange(
 *   () => console.log('Page is now visible'),
 *   () => console.log('Page is now hidden')
 * );
 * ```
 */
export function usePageVisibilityChange(
  onVisible?: () => void,
  onHidden?: () => void
): void {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof document.hidden === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onHidden?.();
      } else {
        onVisible?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [onVisible, onHidden]);
}

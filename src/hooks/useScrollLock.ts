import { useEffect } from 'react';

/**
 * Global scroll lock state
 * Uses ref counting to handle multiple modals
 */
let scrollLockCount = 0;
let originalOverflow = '';
let originalPaddingRight = '';

/**
 * Hook to lock/unlock body scroll with ref counting
 * Supports multiple modals without conflicts
 * 
 * @param isLocked - Whether scroll should be locked
 * 
 * @example
 * ```tsx
 * function Modal({ isOpen }) {
 *   useScrollLock(isOpen);
 *   return <div>Modal content</div>;
 * }
 * ```
 */
export function useScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked) return;

    // Increment counter
    scrollLockCount++;

    // Only apply lock on first modal
    if (scrollLockCount === 1) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Store original values
      originalOverflow = document.body.style.overflow;
      originalPaddingRight = document.body.style.paddingRight;

      // Apply scroll lock
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }

    return () => {
      // Decrement counter
      scrollLockCount--;

      // Only restore on last modal close
      if (scrollLockCount === 0) {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      }
    };
  }, [isLocked]);
}

/**
 * Get current scroll lock count (for debugging)
 */
export function getScrollLockCount(): number {
  return scrollLockCount;
}

/**
 * Force reset scroll lock (use only in error recovery)
 */
export function resetScrollLock(): void {
  scrollLockCount = 0;
  document.body.style.overflow = originalOverflow || '';
  document.body.style.paddingRight = originalPaddingRight || '';
}

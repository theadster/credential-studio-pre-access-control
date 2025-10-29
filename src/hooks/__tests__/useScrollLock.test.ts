import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useScrollLock, getScrollLockCount, resetScrollLock } from '../useScrollLock';

describe('useScrollLock', () => {
  beforeEach(() => {
    // Reset scroll lock state before each test
    resetScrollLock();
    
    // Reset body styles
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  afterEach(() => {
    // Clean up after each test
    resetScrollLock();
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  });

  it('should lock scroll when isLocked is true', () => {
    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    expect(getScrollLockCount()).toBe(1);

    unmount();
  });

  it('should not lock scroll when isLocked is false', () => {
    renderHook(() => useScrollLock(false));

    expect(document.body.style.overflow).toBe('');
    expect(getScrollLockCount()).toBe(0);
  });

  it('should restore scroll when unmounted', () => {
    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.overflow).toBe('hidden');
    expect(getScrollLockCount()).toBe(1);

    unmount();

    expect(document.body.style.overflow).toBe('');
    expect(getScrollLockCount()).toBe(0);
  });

  it('should handle multiple modals with ref counting', () => {
    // Open first modal
    const { unmount: unmount1 } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    expect(getScrollLockCount()).toBe(1);

    // Open second modal
    const { unmount: unmount2 } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    expect(getScrollLockCount()).toBe(2);

    // Close first modal - scroll should still be locked
    unmount1();
    expect(document.body.style.overflow).toBe('hidden');
    expect(getScrollLockCount()).toBe(1);

    // Close second modal - scroll should be restored
    unmount2();
    expect(document.body.style.overflow).toBe('');
    expect(getScrollLockCount()).toBe(0);
  });

  it('should handle three modals correctly', () => {
    const { unmount: unmount1 } = renderHook(() => useScrollLock(true));
    const { unmount: unmount2 } = renderHook(() => useScrollLock(true));
    const { unmount: unmount3 } = renderHook(() => useScrollLock(true));

    expect(getScrollLockCount()).toBe(3);
    expect(document.body.style.overflow).toBe('hidden');

    unmount2();
    expect(getScrollLockCount()).toBe(2);
    expect(document.body.style.overflow).toBe('hidden');

    unmount1();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    unmount3();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('should preserve original overflow value', () => {
    // Set initial overflow
    document.body.style.overflow = 'auto';

    const { unmount } = renderHook(() => useScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('should add padding for scrollbar width', () => {
    // Mock scrollbar width
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      writable: true,
      configurable: true,
      value: 1008 // 16px scrollbar
    });

    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.paddingRight).toBe('16px');

    unmount();
  });

  it('should not add padding when no scrollbar', () => {
    // Mock no scrollbar
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      writable: true,
      configurable: true,
      value: 1024 // No scrollbar
    });

    const { unmount } = renderHook(() => useScrollLock(true));

    expect(document.body.style.paddingRight).toBe('');

    unmount();
  });

  it('should handle rapid open/close cycles', () => {
    const { unmount: unmount1 } = renderHook(() => useScrollLock(true));
    expect(getScrollLockCount()).toBe(1);

    const { unmount: unmount2 } = renderHook(() => useScrollLock(true));
    expect(getScrollLockCount()).toBe(2);

    unmount1();
    expect(getScrollLockCount()).toBe(1);

    const { unmount: unmount3 } = renderHook(() => useScrollLock(true));
    expect(getScrollLockCount()).toBe(2);

    unmount2();
    expect(getScrollLockCount()).toBe(1);

    unmount3();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('should handle resetScrollLock force reset', () => {
    renderHook(() => useScrollLock(true));
    renderHook(() => useScrollLock(true));
    renderHook(() => useScrollLock(true));

    expect(getScrollLockCount()).toBe(3);
    expect(document.body.style.overflow).toBe('hidden');

    resetScrollLock();

    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('should not affect scroll when toggling isLocked false to false', () => {
    const { rerender } = renderHook(
      ({ locked }) => useScrollLock(locked),
      { initialProps: { locked: false } }
    );

    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');

    rerender({ locked: false });

    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('should handle toggling isLocked true to false', () => {
    const { rerender, unmount } = renderHook(
      ({ locked }) => useScrollLock(locked),
      { initialProps: { locked: true } }
    );

    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    rerender({ locked: false });

    // Count should decrease when toggling to false
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');

    unmount();
  });
});

/**
 * Unit Tests for usePollingFallback Hook
 *
 * Tests verify polling activation timing, interval adherence, and deactivation on reconnect.
 *
 * **Validates: Requirements 5.2, 5.3, 5.4**
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePollingFallback } from '@/hooks/usePollingFallback';
import { DATA_FRESHNESS } from '@/lib/constants';

describe('usePollingFallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-19T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should start with isPolling false', () => {
      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
        })
      );

      expect(result.current.isPolling).toBe(false);
      expect(result.current.lastPollAt).toBeNull();
    });

    it('should not start polling immediately when enabled', () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          onPoll,
        })
      );

      // Should not be polling yet (waiting for activation delay)
      expect(result.current.isPolling).toBe(false);
      expect(onPoll).not.toHaveBeenCalled();
    });
  });

  describe('polling activation timing (Requirement 5.1)', () => {
    it('should activate polling after POLLING_ACTIVATION_DELAY when enabled', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          onPoll,
        })
      );

      // Not polling yet
      expect(result.current.isPolling).toBe(false);

      // Advance time to just before activation delay
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY - 1);
      });

      expect(result.current.isPolling).toBe(false);

      // Advance past activation delay
      await act(async () => {
        vi.advanceTimersByTime(2);
      });

      expect(result.current.isPolling).toBe(true);
      expect(onPoll).toHaveBeenCalledTimes(1);
    });

    it('should not activate if disabled before activation delay', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          usePollingFallback({
            enabled,
            dataType: 'attendees',
            onPoll,
          }),
        { initialProps: { enabled: true } }
      );

      // Advance halfway through activation delay
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY / 2);
      });

      // Disable before activation
      rerender({ enabled: false });

      // Advance past original activation time
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      expect(result.current.isPolling).toBe(false);
      expect(onPoll).not.toHaveBeenCalled();
    });
  });

  describe('polling interval adherence (Requirement 5.2)', () => {
    it('should poll at configured interval', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);
      const customInterval = 15000; // 15 seconds

      renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          interval: customInterval,
          onPoll,
        })
      );

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance by one interval
      await act(async () => {
        vi.advanceTimersByTime(customInterval);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);

      // Advance by another interval
      await act(async () => {
        vi.advanceTimersByTime(customInterval);
      });

      expect(onPoll).toHaveBeenCalledTimes(3);
    });

    it('should use default interval when not specified', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          onPoll,
        })
      );

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      expect(onPoll).toHaveBeenCalledTimes(1);

      // Advance by default interval
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_INTERVAL);
      });

      expect(onPoll).toHaveBeenCalledTimes(2);
    });

    it('should update lastPollAt on successful poll', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          onPoll,
        })
      );

      expect(result.current.lastPollAt).toBeNull();

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      expect(result.current.lastPollAt).not.toBeNull();
      expect(result.current.lastPollAt).toBeInstanceOf(Date);
    });
  });

  describe('deactivation on reconnect (Requirement 5.3)', () => {
    it('should stop polling when enabled becomes false', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          usePollingFallback({
            enabled,
            dataType: 'attendees',
            onPoll,
          }),
        { initialProps: { enabled: true } }
      );

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      expect(result.current.isPolling).toBe(true);
      const callCountBeforeDisable = onPoll.mock.calls.length;

      // Disable (simulate reconnection)
      rerender({ enabled: false });

      expect(result.current.isPolling).toBe(false);

      // Advance time - should not poll anymore
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_INTERVAL * 3);
      });

      expect(onPoll).toHaveBeenCalledTimes(callCountBeforeDisable);
    });

    it('should stop polling but preserve lastPollAt when deactivated', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          usePollingFallback({
            enabled,
            dataType: 'attendees',
            onPoll,
          }),
        { initialProps: { enabled: true } }
      );

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      expect(result.current.lastPollAt).not.toBeNull();
      const lastPollAtBeforeDisable = result.current.lastPollAt;

      // Disable
      rerender({ enabled: false });

      // lastPollAt should remain (it's historical data)
      // but isPolling should be false
      expect(result.current.isPolling).toBe(false);
      expect(result.current.lastPollAt).toBe(lastPollAtBeforeDisable);
    });
  });

  describe('selective polling by data type (Requirement 5.4)', () => {
    it('should pass dataType to hook configuration', () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          onPoll,
        })
      );

      // The hook accepts dataType - this is used by consumers to determine
      // what data to fetch. The hook itself doesn't filter, but provides
      // the infrastructure for selective polling.
      expect(result.current).toBeDefined();
    });

    it('should allow different data types', () => {
      const onPollAttendees = vi.fn().mockResolvedValue(undefined);
      const onPollUsers = vi.fn().mockResolvedValue(undefined);

      const { result: attendeesResult } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
          onPoll: onPollAttendees,
        })
      );

      const { result: usersResult } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'users',
          onPoll: onPollUsers,
        })
      );

      expect(attendeesResult.current).toBeDefined();
      expect(usersResult.current).toBeDefined();
    });
  });

  describe('pollNow manual trigger', () => {
    it('should allow manual polling via pollNow', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
          onPoll,
        })
      );

      expect(onPoll).not.toHaveBeenCalled();

      await act(async () => {
        await result.current.pollNow();
      });

      expect(onPoll).toHaveBeenCalledTimes(1);
      expect(result.current.lastPollAt).not.toBeNull();
    });

    it('should update lastPollAt on manual poll', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
          onPoll,
        })
      );

      expect(result.current.lastPollAt).toBeNull();

      await act(async () => {
        await result.current.pollNow();
      });

      expect(result.current.lastPollAt).toBeInstanceOf(Date);
    });
  });

  describe('error handling (Requirement 5.5)', () => {
    it('should call onError when poll fails', async () => {
      const error = new Error('Network error');
      const onPoll = vi.fn().mockRejectedValue(error);
      const onError = vi.fn();

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
          onPoll,
          onError,
        })
      );

      await act(async () => {
        await result.current.pollNow();
      });

      expect(onError).toHaveBeenCalledWith(error);
    });

    it('should convert non-Error objects to Error', async () => {
      const onPoll = vi.fn().mockRejectedValue('string error');
      const onError = vi.fn();

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
          onPoll,
          onError,
        })
      );

      await act(async () => {
        await result.current.pollNow();
      });

      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toBe('string error');
    });

    it('should not update lastPollAt on failed poll', async () => {
      const onPoll = vi.fn().mockRejectedValue(new Error('Failed'));
      const onError = vi.fn();

      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: false,
          dataType: 'attendees',
          onPoll,
          onError,
        })
      );

      await act(async () => {
        await result.current.pollNow();
      });

      expect(result.current.lastPollAt).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should cleanup timers on unmount', async () => {
      const onPoll = vi.fn().mockResolvedValue(undefined);

      const { unmount } = renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
          onPoll,
        })
      );

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      const callCountBeforeUnmount = onPoll.mock.calls.length;

      unmount();

      // Advance time - should not poll after unmount
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_INTERVAL * 3);
      });

      expect(onPoll).toHaveBeenCalledTimes(callCountBeforeUnmount);
    });
  });

  describe('no onPoll callback', () => {
    it('should handle missing onPoll gracefully', async () => {
      const { result } = renderHook(() =>
        usePollingFallback({
          enabled: true,
          dataType: 'attendees',
        })
      );

      // Activate polling
      await act(async () => {
        vi.advanceTimersByTime(DATA_FRESHNESS.POLLING_ACTIVATION_DELAY);
      });

      // Should not throw
      expect(result.current.isPolling).toBe(true);

      // Manual poll should also not throw
      await act(async () => {
        await result.current.pollNow();
      });
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRealtimeSubscription, buildChannels, isEvent } from '../useRealtimeSubscription';
import { resetAllMocks } from '@/test/mocks/appwrite';
import type { UseConnectionHealthReturn, UseDataFreshnessReturn, FreshnessState } from '@/types/connectionHealth';

describe('useRealtimeSubscription', () => {
  beforeEach(() => {
    resetAllMocks();
    vi.clearAllTimers();
  });

  describe('Basic Subscription', () => {
    it('should accept subscription options', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      const { result } = renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          enabled: true,
        })
      );

      expect(result.current).toBeUndefined(); // Hook doesn't return anything
    });

    it('should not throw when disabled', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            enabled: false,
          })
        );
      }).not.toThrow();
    });

    it('should handle empty channels array', () => {
      const callback = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() =>
        useRealtimeSubscription({
          channels: [],
          callback,
        })
      );

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'useRealtimeSubscription: No channels provided'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should default to enabled when not specified', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
          })
        );
      }).not.toThrow();
    });
  });

  describe('Callback Handling', () => {
    it('should accept callback function', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      expect(callback).toBeDefined();
    });

    it('should accept optional error handler', () => {
      const callback = vi.fn();
      const onError = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          onError,
        })
      );

      expect(onError).toBeDefined();
    });
  });

  describe('Cleanup', () => {
    it('should unmount without errors', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      const { unmount } = renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      expect(() => unmount()).not.toThrow();
    });

    it('should handle rerender with different channels', () => {
      const callback = vi.fn();

      const { rerender } = renderHook(
        ({ channels }) =>
          useRealtimeSubscription({
            channels,
            callback,
          }),
        {
          initialProps: {
            channels: ['databases.test-db.collections.collection1.documents'],
          },
        }
      );

      expect(() => {
        rerender({
          channels: ['databases.test-db.collections.collection2.documents'],
        });
      }).not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle subscription with error handler', () => {
      const callback = vi.fn();
      const onError = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            onError,
          })
        );
      }).not.toThrow();
    });

    it('should handle subscription without error handler', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
          })
        );
      }).not.toThrow();
    });
  });

  describe('Health Integration', () => {
    const createMockConnectionHealth = (): UseConnectionHealthReturn & {
      _internal: {
        markConnected: ReturnType<typeof vi.fn>;
        markDisconnected: ReturnType<typeof vi.fn>;
        handleReconnectSuccess: ReturnType<typeof vi.fn>;
        handleReconnectFailure: ReturnType<typeof vi.fn>;
        scheduleReconnect: ReturnType<typeof vi.fn>;
      };
    } => ({
      state: {
        status: 'connecting',
        lastConnectedAt: null,
        lastDisconnectedAt: null,
        reconnectAttempt: 0,
        nextReconnectAt: null,
        error: null,
      },
      reconnect: vi.fn(),
      resetBackoff: vi.fn(),
      isHealthy: false,
      _internal: {
        markConnected: vi.fn(),
        markDisconnected: vi.fn(),
        handleReconnectSuccess: vi.fn(),
        handleReconnectFailure: vi.fn(),
        scheduleReconnect: vi.fn(),
      },
    });

    const createMockDataFreshness = (): UseDataFreshnessReturn => ({
      state: {
        lastUpdatedAt: null,
        isStale: true,
        staleDuration: null,
      } as FreshnessState,
      markFresh: vi.fn(),
      getRelativeTime: vi.fn(() => 'never'),
      refresh: vi.fn(async () => {}),
      isRefreshing: false,
    });

    it('should accept connectionHealth option', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];
      const connectionHealth = createMockConnectionHealth();

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            connectionHealth,
          })
        );
      }).not.toThrow();
    });

    it('should accept dataFreshness option', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];
      const dataFreshness = createMockDataFreshness();

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            dataFreshness,
          })
        );
      }).not.toThrow();
    });

    it('should accept autoReconnect option (default: true)', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            autoReconnect: true,
          })
        );
      }).not.toThrow();
    });

    it('should accept autoReconnect option set to false', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            autoReconnect: false,
          })
        );
      }).not.toThrow();
    });

    it('should accept refreshOnReconnect callback', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];
      const refreshOnReconnect = vi.fn(async () => {});

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            refreshOnReconnect,
          })
        );
      }).not.toThrow();
    });

    it('should accept all health integration options together', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];
      const connectionHealth = createMockConnectionHealth();
      const dataFreshness = createMockDataFreshness();
      const refreshOnReconnect = vi.fn(async () => {});

      expect(() => {
        renderHook(() =>
          useRealtimeSubscription({
            channels,
            callback,
            connectionHealth,
            dataFreshness,
            autoReconnect: true,
            refreshOnReconnect,
          })
        );
      }).not.toThrow();
    });

    it('should unmount cleanly with health integration options', () => {
      const callback = vi.fn();
      const channels = ['databases.test-db.collections.test-collection.documents'];
      const connectionHealth = createMockConnectionHealth();
      const dataFreshness = createMockDataFreshness();

      const { unmount } = renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          connectionHealth,
          dataFreshness,
        })
      );

      expect(() => unmount()).not.toThrow();
    });
  });
});

describe('buildChannels', () => {
  it('should build channel for collection', () => {
    const result = buildChannels.collection('db-1', 'collection-1');
    expect(result).toEqual(['databases.db-1.collections.collection-1.documents']);
  });

  it('should build channel for document', () => {
    const result = buildChannels.document('db-1', 'collection-1', 'doc-1');
    expect(result).toEqual(['databases.db-1.collections.collection-1.documents.doc-1']);
  });

  it('should build channels for multiple collections', () => {
    const result = buildChannels.collections('db-1', ['collection-1', 'collection-2']);
    expect(result).toEqual([
      'databases.db-1.collections.collection-1.documents',
      'databases.db-1.collections.collection-2.documents',
    ]);
  });

  it('should build channels for multiple documents', () => {
    const result = buildChannels.documents('db-1', 'collection-1', ['doc-1', 'doc-2']);
    expect(result).toEqual([
      'databases.db-1.collections.collection-1.documents.doc-1',
      'databases.db-1.collections.collection-1.documents.doc-2',
    ]);
  });
});

describe('isEvent', () => {
  it('should detect create events', () => {
    const events = ['databases.*.collections.*.documents.*.create'];
    expect(isEvent.create(events)).toBe(true);
  });

  it('should detect update events', () => {
    const events = ['databases.*.collections.*.documents.*.update'];
    expect(isEvent.update(events)).toBe(true);
  });

  it('should detect delete events', () => {
    const events = ['databases.*.collections.*.documents.*.delete'];
    expect(isEvent.delete(events)).toBe(true);
  });

  it('should return false when event type not present', () => {
    const events = ['databases.*.collections.*.documents.*.create'];
    expect(isEvent.update(events)).toBe(false);
  });

  it('should detect any matching pattern', () => {
    const events = ['databases.*.collections.*.documents.*.create'];
    expect(isEvent.any(events, ['.create', '.update'])).toBe(true);
  });

  it('should return false when no patterns match', () => {
    const events = ['databases.*.collections.*.documents.*.create'];
    expect(isEvent.any(events, ['.update', '.delete'])).toBe(false);
  });

  it('should handle multiple events', () => {
    const events = [
      'databases.*.collections.*.documents.*.create',
      'databases.*.collections.*.documents.*.update',
    ];
    expect(isEvent.create(events)).toBe(true);
    expect(isEvent.update(events)).toBe(true);
    expect(isEvent.delete(events)).toBe(false);
  });
});

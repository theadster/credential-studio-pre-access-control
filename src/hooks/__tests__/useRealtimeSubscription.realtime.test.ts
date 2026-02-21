import { renderHook, waitFor } from '@testing-library/react';
import { useRealtimeSubscription, buildChannels, isEvent } from '../useRealtimeSubscription';
import { createBrowserClient } from '@/lib/appwrite';
import type { RealtimeResponseEvent } from 'appwrite';
import { vi } from 'vitest';

// Mock the Appwrite client
vi.mock('@/lib/appwrite', () => ({
  createBrowserClient: vi.fn(),
}));

describe('useRealtimeSubscription - Real-time Functionality', () => {
  let mockClient: any;
  let mockUnsubscribe: any;
  let mockSubscribe: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUnsubscribe = vi.fn();
    mockSubscribe = vi.fn(() => mockUnsubscribe);
    
    mockClient = {
      subscribe: mockSubscribe,
    };

    vi.mocked(createBrowserClient).mockReturnValue({
      client: mockClient,
      account: {} as any,
      databases: {} as any,
      storage: {} as any,
    });
  });

  describe('Subscription Setup', () => {
    it('should subscribe to channels on mount', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(channels, expect.any(Function));
      });
    });

    it('should not subscribe when enabled is false', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          enabled: false,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).not.toHaveBeenCalled();
      });
    });

    it('should not subscribe when channels array is empty', async () => {
      const callback = vi.fn();
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      renderHook(() =>
        useRealtimeSubscription({
          channels: [],
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).not.toHaveBeenCalled();
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          'useRealtimeSubscription: No channels provided'
        );
      });

      consoleWarnSpy.mockRestore();
    });

    it('should subscribe to multiple channels', async () => {
      const channels = [
        'databases.db1.tables.col1.rows',
        'databases.db1.tables.col2.rows',
      ];
      const callback = vi.fn();

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(channels, expect.any(Function));
      });
    });
  });

  describe('Real-time Event Handling', () => {
    it('should call callback when document is created', async () => {
      const channels = ['databases.db1.tables.attendees.rows'];
      const callback = vi.fn();
      
      const mockEvent: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.attendees.rows.123.create'],
        payload: {
          $id: '123',
          firstName: 'John',
          lastName: 'Doe',
        },
      };

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      // Simulate real-time event
      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      subscribedCallback(mockEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockEvent);
      });
    });

    it('should call callback when document is updated', async () => {
      const channels = ['databases.db1.tables.attendees.rows'];
      const callback = vi.fn();
      
      const mockEvent: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.attendees.rows.123.update'],
        payload: {
          $id: '123',
          firstName: 'Jane',
          lastName: 'Doe',
        },
      };

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      subscribedCallback(mockEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockEvent);
      });
    });

    it('should call callback when document is deleted', async () => {
      const channels = ['databases.db1.tables.attendees.rows'];
      const callback = vi.fn();
      
      const mockEvent: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.attendees.rows.123.delete'],
        payload: {
          $id: '123',
        },
      };

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      subscribedCallback(mockEvent);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledWith(mockEvent);
      });
    });

    it('should handle multiple events in sequence', async () => {
      const channels = ['databases.db1.tables.logs.rows'];
      const callback = vi.fn();

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];

      // Simulate multiple events
      const event1: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.logs.rows.1.create'],
        payload: { $id: '1', action: 'login' },
      };
      
      const event2: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.logs.rows.2.create'],
        payload: { $id: '2', action: 'logout' },
      };

      subscribedCallback(event1);
      subscribedCallback(event2);

      await waitFor(() => {
        expect(callback).toHaveBeenCalledTimes(2);
        expect(callback).toHaveBeenNthCalledWith(1, event1);
        expect(callback).toHaveBeenNthCalledWith(2, event2);
      });
    });
  });

  describe('Subscription Cleanup', () => {
    it('should unsubscribe on unmount', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();

      const { unmount } = renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      unmount();

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
      });
    });

    it('should not call callback after unmount', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();

      const { unmount } = renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      
      unmount();

      // Try to trigger callback after unmount
      const mockEvent: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.col1.rows.123.create'],
        payload: { $id: '123' },
      };
      
      subscribedCallback(mockEvent);

      // Callback should not be called after unmount
      expect(callback).not.toHaveBeenCalled();
    });

    it('should resubscribe when channels change', async () => {
      const callback = vi.fn();
      const initialChannels = ['databases.db1.tables.col1.rows'];
      const newChannels = ['databases.db1.tables.col2.rows'];

      const { rerender } = renderHook(
        ({ channels }) =>
          useRealtimeSubscription({
            channels,
            callback,
          }),
        { initialProps: { channels: initialChannels } }
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledWith(initialChannels, expect.any(Function));
      });

      // Change channels
      rerender({ channels: newChannels });

      await waitFor(() => {
        expect(mockUnsubscribe).toHaveBeenCalled();
        expect(mockSubscribe).toHaveBeenCalledWith(newChannels, expect.any(Function));
      });
    });
  });

  describe('Error Handling', () => {
    it('should call onError when subscription fails', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();
      const onError = vi.fn();
      
      const subscriptionError = new Error('Subscription failed');
      mockSubscribe.mockImplementation(() => {
        throw subscriptionError;
      });

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          onError,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(subscriptionError);
      });
    });

    it('should call onError when callback throws error', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callbackError = new Error('Callback error');
      const callback = vi.fn(() => {
        throw callbackError;
      });
      const onError = vi.fn();

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          onError,
        })
      );

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalled();
      });

      const subscribedCallback = mockSubscribe.mock.calls[0][1];
      const mockEvent: Partial<RealtimeResponseEvent<any>> = {
        events: ['databases.db1.tables.col1.rows.123.create'],
        payload: { $id: '123' },
      };

      subscribedCallback(mockEvent);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(callbackError);
      });
    });

    it('should log error to console when onError is not provided', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const subscriptionError = new Error('Subscription failed');
      const callback = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      mockSubscribe.mockImplementation(() => {
        throw subscriptionError;
      });

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
        })
      );

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Realtime subscription error:',
          subscriptionError
        );
      });

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Helper Functions', () => {
    describe('buildChannels', () => {
      it('should build collection channel', () => {
        const channel = buildChannels.collection('db1', 'attendees');
        expect(channel).toEqual(['databases.db1.tables.attendees.rows']);
      });

      it('should build document channel', () => {
        const channel = buildChannels.document('db1', 'attendees', '123');
        expect(channel).toEqual(['databases.db1.tables.attendees.rows.123']);
      });

      it('should build multiple collection channels', () => {
        const channels = buildChannels.collections('db1', ['attendees', 'logs']);
        expect(channels).toEqual([
          'databases.db1.tables.attendees.rows',
          'databases.db1.tables.logs.rows',
        ]);
      });

      it('should build multiple document channels', () => {
        const channels = buildChannels.documents('db1', 'attendees', ['123', '456']);
        expect(channels).toEqual([
          'databases.db1.tables.attendees.rows.123',
          'databases.db1.tables.attendees.rows.456',
        ]);
      });
    });

    describe('isEvent', () => {
      it('should detect create events', () => {
        const events = ['databases.db1.tables.attendees.rows.123.create'];
        expect(isEvent.create(events)).toBe(true);
      });

      it('should detect update events', () => {
        const events = ['databases.db1.tables.attendees.rows.123.update'];
        expect(isEvent.update(events)).toBe(true);
      });

      it('should detect delete events', () => {
        const events = ['databases.db1.tables.attendees.rows.123.delete'];
        expect(isEvent.delete(events)).toBe(true);
      });

      it('should detect custom event patterns', () => {
        const events = ['databases.db1.tables.attendees.rows.123.create'];
        expect(isEvent.any(events, ['.create', '.update'])).toBe(true);
      });

      it('should return false for non-matching events', () => {
        const events = ['databases.db1.tables.attendees.rows.123.create'];
        expect(isEvent.update(events)).toBe(false);
        expect(isEvent.delete(events)).toBe(false);
      });
    });
  });

  describe('Connection Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();
      const onError = vi.fn();
      
      const connectionError = new Error('Connection lost');
      mockSubscribe.mockImplementation(() => {
        throw connectionError;
      });

      renderHook(() =>
        useRealtimeSubscription({
          channels,
          callback,
          onError,
        })
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(connectionError);
      });
    });

    it('should allow re-enabling subscription after error', async () => {
      const channels = ['databases.db1.tables.col1.rows'];
      const callback = vi.fn();
      const onError = vi.fn();
      
      // First attempt fails
      mockSubscribe.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });

      const { rerender } = renderHook(
        ({ enabled }) =>
          useRealtimeSubscription({
            channels,
            callback,
            onError,
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      // Reset mock for successful subscription
      mockSubscribe.mockImplementation(() => mockUnsubscribe);
      onError.mockClear();

      // Disable and re-enable
      rerender({ enabled: false });
      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockSubscribe).toHaveBeenCalledTimes(2);
        expect(onError).not.toHaveBeenCalled();
      });
    });
  });
});

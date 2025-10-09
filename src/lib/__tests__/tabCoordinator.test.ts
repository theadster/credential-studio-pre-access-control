import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createTabCoordinator, TabCoordinatorImpl } from '../tabCoordinator';

describe('TabCoordinator', () => {
  let coordinator: ReturnType<typeof createTabCoordinator>;
  let mockBroadcastChannel: any;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    // Mock BroadcastChannel
    mockBroadcastChannel = {
      postMessage: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onmessage: null,
    };

    global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;

    // Mock localStorage
    const localStorageMock: Record<string, string> = {};
    global.localStorage = {
      getItem: vi.fn((key: string) => localStorageMock[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(() => {
        Object.keys(localStorageMock).forEach(key => delete localStorageMock[key]);
      }),
      key: vi.fn(),
      length: 0,
    };

    coordinator = createTabCoordinator();
  });

  afterEach(() => {
    coordinator.cleanup();
    vi.useRealTimers();
  });

  describe('Initialization', () => {
    it('should create BroadcastChannel with correct name', () => {
      expect(global.BroadcastChannel).toHaveBeenCalledWith('token-refresh');
    });

    it('should use custom channel name from config', () => {
      const customCoordinator = createTabCoordinator({
        channelName: 'custom-channel',
      });

      expect(global.BroadcastChannel).toHaveBeenCalledWith('custom-channel');

      customCoordinator.cleanup();
    });

    it('should fallback to localStorage if BroadcastChannel unavailable', () => {
      // Remove BroadcastChannel
      (global as any).BroadcastChannel = undefined;

      const storageListeners: any[] = [];
      global.addEventListener = vi.fn((event, listener) => {
        if (event === 'storage') {
          storageListeners.push(listener);
        }
      });

      const fallbackCoordinator = createTabCoordinator();

      // Should have added storage listener
      expect(global.addEventListener).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );

      fallbackCoordinator.cleanup();

      // Restore BroadcastChannel
      global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
    });

    it('should start heartbeat timer', () => {
      // Heartbeat should be scheduled
      expect(mockBroadcastChannel.postMessage).not.toHaveBeenCalled();

      // Fast-forward to heartbeat interval (30 seconds)
      vi.advanceTimersByTime(30000);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
        })
      );
    });
  });

  describe('Message Handling', () => {
    it('should handle refresh-request messages', async () => {
      const requestPromise = coordinator.requestRefresh();

      // Simulate another tab sending refresh-request
      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({
          data: {
            type: 'refresh-request',
            tabId: 'other-tab',
            timestamp: Date.now(),
          },
        });
      }

      // Should not affect our request
      await vi.advanceTimersByTimeAsync(150);
      const result = await requestPromise;

      expect(result).toBe(true);
    });

    it('should deny refresh request if already leader', async () => {
      // Become leader first
      const firstRequest = coordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      await firstRequest;

      // Simulate another tab requesting refresh
      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({
          data: {
            type: 'refresh-request',
            tabId: 'other-tab',
            timestamp: Date.now(),
          },
        });
      }

      // Should post denial message
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh-denied',
        })
      );
    });

    it('should handle refresh-complete messages', () => {
      const callback = vi.fn();
      coordinator.onRefreshComplete(callback);

      // Simulate another tab completing refresh
      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({
          data: {
            type: 'refresh-complete',
            tabId: 'other-tab',
            timestamp: Date.now(),
            success: true,
          },
        });
      }

      expect(callback).toHaveBeenCalledWith(true);
    });

    it('should handle refresh-complete with failure', () => {
      const callback = vi.fn();
      coordinator.onRefreshComplete(callback);

      // Simulate another tab failing refresh
      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({
          data: {
            type: 'refresh-complete',
            tabId: 'other-tab',
            timestamp: Date.now(),
            success: false,
          },
        });
      }

      expect(callback).toHaveBeenCalledWith(false);
    });

    it('should notify multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      coordinator.onRefreshComplete(callback1);
      coordinator.onRefreshComplete(callback2);
      coordinator.onRefreshComplete(callback3);

      // Simulate refresh complete
      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({
          data: {
            type: 'refresh-complete',
            tabId: 'other-tab',
            timestamp: Date.now(),
            success: true,
          },
        });
      }

      expect(callback1).toHaveBeenCalledWith(true);
      expect(callback2).toHaveBeenCalledWith(true);
      expect(callback3).toHaveBeenCalledWith(true);
    });
  });

  describe('Leader Election', () => {
    it('should grant refresh permission if no other tab responds', async () => {
      const requestPromise = coordinator.requestRefresh();
      
      // Advance timers past the timeout
      await vi.advanceTimersByTimeAsync(150);
      
      const result = await requestPromise;

      expect(result).toBe(true);
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh-request',
        })
      );
    });

    it('should deny refresh permission if another tab is leader', async () => {
      // Set up a listener that will be called when addEventListener is invoked
      let messageHandler: any = null;
      mockBroadcastChannel.addEventListener = vi.fn((event, handler) => {
        if (event === 'message') {
          messageHandler = handler;
        }
      });

      const requestPromise = coordinator.requestRefresh();

      // Simulate another tab denying the request
      if (messageHandler) {
        messageHandler({
          data: {
            type: 'refresh-denied',
            tabId: 'other-tab',
            timestamp: Date.now(),
          },
        });
      }

      const result = await requestPromise;

      expect(result).toBe(false);
    });

    it('should use custom timeout from config', async () => {
      const customCoordinator = createTabCoordinator({
        requestTimeout: 500,
      });

      const requestPromise = customCoordinator.requestRefresh();

      // Should not resolve before timeout
      await vi.advanceTimersByTimeAsync(400);
      
      // Should resolve after timeout
      await vi.advanceTimersByTimeAsync(100);
      const result = await requestPromise;

      expect(result).toBe(true);

      customCoordinator.cleanup();
    });

    it('should reset leader flag after notifying completion', async () => {
      // Become leader
      const firstRequest = coordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      await firstRequest;

      // Notify completion
      coordinator.notifyRefreshComplete(true);

      // Should be able to request again
      const secondRequest = coordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      const result = await secondRequest;
      
      expect(result).toBe(true);
    });

    it('should broadcast completion message', () => {
      coordinator.notifyRefreshComplete(true);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh-complete',
          success: true,
        })
      );
    });

    it('should broadcast failure message', () => {
      coordinator.notifyRefreshComplete(false);

      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'refresh-complete',
          success: false,
        })
      );
    });
  });

  describe('Heartbeat', () => {
    it('should send periodic heartbeat messages', () => {
      // Clear initial calls
      mockBroadcastChannel.postMessage.mockClear();

      // Fast-forward through multiple heartbeat intervals
      vi.advanceTimersByTime(30000); // First heartbeat
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
        })
      );

      mockBroadcastChannel.postMessage.mockClear();

      vi.advanceTimersByTime(30000); // Second heartbeat
      expect(mockBroadcastChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
        })
      );
    });

    it('should use custom heartbeat interval from config', () => {
      const customCoordinator = createTabCoordinator({
        heartbeatInterval: 10000, // 10 seconds
      });

      const customChannel = (global.BroadcastChannel as any).mock.results[
        (global.BroadcastChannel as any).mock.results.length - 1
      ].value;

      customChannel.postMessage.mockClear();

      vi.advanceTimersByTime(10000);
      expect(customChannel.postMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'heartbeat',
        })
      );

      customCoordinator.cleanup();
    });

    it('should stop heartbeat on cleanup', () => {
      mockBroadcastChannel.postMessage.mockClear();

      coordinator.cleanup();

      // Fast-forward past heartbeat interval
      vi.advanceTimersByTime(30000);

      // Should not send heartbeat after cleanup
      expect(mockBroadcastChannel.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should close BroadcastChannel', () => {
      coordinator.cleanup();

      expect(mockBroadcastChannel.close).toHaveBeenCalled();
    });

    it('should clear callbacks', () => {
      const callback = vi.fn();
      coordinator.onRefreshComplete(callback);

      coordinator.cleanup();

      // Simulate message after cleanup
      if (mockBroadcastChannel.onmessage) {
        mockBroadcastChannel.onmessage({
          data: {
            type: 'refresh-complete',
            tabId: 'other-tab',
            timestamp: Date.now(),
            success: true,
          },
        });
      }

      expect(callback).not.toHaveBeenCalled();
    });

    it('should reset leader flag', async () => {
      // Become leader
      const firstRequest = coordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      await firstRequest;

      coordinator.cleanup();

      // Create new coordinator
      const newCoordinator = createTabCoordinator();

      // Should be able to become leader
      const secondRequest = newCoordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      const result = await secondRequest;
      
      expect(result).toBe(true);

      newCoordinator.cleanup();
    });

    it('should remove localStorage listener in fallback mode', () => {
      // Remove BroadcastChannel
      (global as any).BroadcastChannel = undefined;

      const removeListenerSpy = vi.fn();
      global.removeEventListener = removeListenerSpy;

      const fallbackCoordinator = createTabCoordinator();
      fallbackCoordinator.cleanup();

      expect(removeListenerSpy).toHaveBeenCalledWith(
        'storage',
        expect.any(Function)
      );

      // Restore BroadcastChannel
      global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
    });
  });

  describe('LocalStorage Fallback', () => {
    beforeEach(() => {
      // Remove BroadcastChannel to force fallback
      (global as any).BroadcastChannel = undefined;
    });

    afterEach(() => {
      // Restore BroadcastChannel
      global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
    });

    it('should use localStorage for messages when BroadcastChannel unavailable', async () => {
      const fallbackCoordinator = createTabCoordinator();

      const requestPromise = fallbackCoordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      await requestPromise;

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'token-refresh',
        expect.stringContaining('refresh-request')
      );

      fallbackCoordinator.cleanup();
    });

    it('should clean up localStorage messages after posting', async () => {
      vi.useFakeTimers();
      
      const fallbackCoordinator = createTabCoordinator();

      const refreshPromise = fallbackCoordinator.requestRefresh();

      // Advance timers to trigger cleanup timeout
      await vi.advanceTimersByTimeAsync(100);
      
      // Flush any pending promises
      await refreshPromise;

      expect(localStorage.removeItem).toHaveBeenCalledWith('token-refresh');

      fallbackCoordinator.cleanup();
      
      vi.useRealTimers();
    });

    it('should handle localStorage errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      localStorage.setItem = vi.fn(() => {
        throw new Error('Storage quota exceeded');
      });

      const fallbackCoordinator = createTabCoordinator();

      // Should not throw
      const requestPromise = fallbackCoordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      await expect(requestPromise).resolves.toBeDefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to post message'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      fallbackCoordinator.cleanup();
    });
  });

  describe('Error Handling', () => {
    it('should handle BroadcastChannel creation errors', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      global.BroadcastChannel = vi.fn(() => {
        throw new Error('BroadcastChannel not supported');
      }) as any;

      // Should fallback to localStorage
      const errorCoordinator = createTabCoordinator();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create BroadcastChannel'),
        expect.any(Error)
      );

      errorCoordinator.cleanup();
      consoleSpy.mockRestore();

      // Restore BroadcastChannel
      global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
    });

    it('should handle postMessage errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockBroadcastChannel.postMessage = vi.fn(() => {
        throw new Error('Channel closed');
      });

      // Should not throw
      const requestPromise = coordinator.requestRefresh();
      await vi.advanceTimersByTimeAsync(150);
      await expect(requestPromise).resolves.toBeDefined();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to post message'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle malformed localStorage messages', () => {
      (global as any).BroadcastChannel = undefined;

      const fallbackCoordinator = createTabCoordinator();

      // Simulate storage event with invalid JSON
      const storageEvent = new Event('storage') as StorageEvent;
      Object.defineProperty(storageEvent, 'key', { value: 'token-refresh' });
      Object.defineProperty(storageEvent, 'newValue', { value: 'invalid-json' });

      // Should not throw
      expect(() => {
        window.dispatchEvent(storageEvent);
      }).not.toThrow();

      fallbackCoordinator.cleanup();

      // Restore BroadcastChannel
      global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
    });
  });
});

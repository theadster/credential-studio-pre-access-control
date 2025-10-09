import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TokenRefreshManager } from '../tokenRefresh';

// Mock the appwrite module
const mockCreateJWT = vi.fn();
const mockAccountGet = vi.fn();
vi.mock('../appwrite', () => ({
  createBrowserClient: vi.fn(() => ({
    account: {
      createJWT: mockCreateJWT,
      get: mockAccountGet,
    },
  })),
}));

// Helper to create a mock JWT token with exp claim
function createMockJWT(expiryInSeconds: number): string {
  // Create a simple base64-encoded JWT with exp claim
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ exp: expiryInSeconds }));
  const signature = 'mock-signature';
  return `${header}.${payload}.${signature}`;
}

describe('TokenRefreshManager', () => {
  let manager: TokenRefreshManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockCreateJWT.mockClear();
    mockAccountGet.mockClear();

    // Mock account.get() to return a valid user
    mockAccountGet.mockResolvedValue({ $id: 'test-user-id' });

    // Mock document.cookie
    Object.defineProperty(document, 'cookie', {
      writable: true,
      value: '',
    });

    manager = new TokenRefreshManager();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (manager) {
      manager.stop();
    }
  });

  describe('Timer Scheduling', () => {
    it('should schedule refresh 5 minutes before expiration by default', () => {
      const now = Date.now();
      const expiryInSeconds = Math.floor(now / 1000) + 15 * 60; // 15 minutes from now

      manager.start(expiryInSeconds);

      // Should schedule for 10 minutes from now (5 minutes before 15-minute expiry)
      const expectedDelay = 10 * 60 * 1000;
      const timeUntilRefresh = manager.getTimeUntilRefresh();

      // Allow small margin for timing
      expect(timeUntilRefresh).toBeGreaterThan(expectedDelay - 1000);
      expect(timeUntilRefresh).toBeLessThanOrEqual(expectedDelay);
    });

    it('should use custom refreshBeforeExpiry config', () => {
      const customManager = new TokenRefreshManager({
        refreshBeforeExpiry: 2 * 60 * 1000, // 2 minutes
      });

      const now = Date.now();
      const expiryInSeconds = Math.floor(now / 1000) + 10 * 60; // 10 minutes from now

      customManager.start(expiryInSeconds);

      // Should schedule for 8 minutes from now (2 minutes before 10-minute expiry)
      const expectedDelay = 8 * 60 * 1000;
      const timeUntilRefresh = customManager.getTimeUntilRefresh();

      expect(timeUntilRefresh).toBeGreaterThan(expectedDelay - 1000);
      expect(timeUntilRefresh).toBeLessThanOrEqual(expectedDelay);

      customManager.stop();
    });

    it('should schedule immediately if token is already near expiration', () => {
      const now = Date.now();
      const expiryInSeconds = Math.floor(now / 1000) + 2 * 60; // 2 minutes from now

      manager.start(expiryInSeconds);

      // Should schedule immediately (delay = 0)
      const timeUntilRefresh = manager.getTimeUntilRefresh();
      expect(timeUntilRefresh).toBe(0);
    });

    it('should clear existing timer when starting new one', () => {
      const now = Date.now();
      const expiry1 = Math.floor(now / 1000) + 15 * 60;
      const expiry2 = Math.floor(now / 1000) + 20 * 60;

      manager.start(expiry1);
      const time1 = manager.getTimeUntilRefresh();

      manager.start(expiry2);
      const time2 = manager.getTimeUntilRefresh();

      // Second timer should have longer delay
      expect(time2).toBeGreaterThan(time1);
    });

    it('should trigger refresh when timer expires', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(expiryInSeconds),
      });

      const now = Date.now();

      manager.start(expiryInSeconds);

      // Fast-forward to trigger timer
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);

      expect(mockCreateJWT).toHaveBeenCalled();
    });
  });

  describe('Retry Logic', () => {
    it('should retry up to configured attempts on failure', async () => {
      mockCreateJWT.mockRejectedValue(new Error('Network error'));

      const customManager = new TokenRefreshManager({
        retryAttempts: 3,
        retryDelay: 100,
      });

      const refreshPromise = customManager.refresh();
      
      // Advance through all retry delays
      await vi.advanceTimersByTimeAsync(100); // First retry
      await vi.advanceTimersByTimeAsync(200); // Second retry (exponential backoff)
      
      const result = await refreshPromise;

      expect(result).toBe(false);
      expect(mockCreateJWT).toHaveBeenCalledTimes(3);

      customManager.stop();
    });

    it('should use exponential backoff between retries', async () => {
      mockCreateJWT.mockRejectedValue(new Error('Network error'));

      const customManager = new TokenRefreshManager({
        retryAttempts: 3,
        retryDelay: 100,
      });

      const refreshPromise = customManager.refresh();

      // First attempt - immediate
      await vi.advanceTimersByTimeAsync(0);
      expect(mockCreateJWT).toHaveBeenCalledTimes(1);

      // Second attempt - 100ms delay
      await vi.advanceTimersByTimeAsync(100);
      expect(mockCreateJWT).toHaveBeenCalledTimes(2);

      // Third attempt - 200ms delay (exponential)
      await vi.advanceTimersByTimeAsync(200);
      expect(mockCreateJWT).toHaveBeenCalledTimes(3);

      await refreshPromise;

      customManager.stop();
    });

    it('should succeed on retry if subsequent attempt succeeds', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          jwt: createMockJWT(expiryInSeconds),
        });

      const refreshPromise = manager.refresh();
      
      // Advance through first retry delay
      await vi.advanceTimersByTimeAsync(2000);
      
      const result = await refreshPromise;

      expect(result).toBe(true);
      expect(mockAccountGet).toHaveBeenCalled();
      expect(mockCreateJWT).toHaveBeenCalledTimes(2);
    });

    it('should not retry if already refreshing', async () => {
      let resolveRefresh: any;
      mockCreateJWT.mockImplementation(
        () => new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );

      const promise1 = manager.refresh();
      const promise2 = manager.refresh();

      expect(await promise2).toBe(false);
      expect(mockCreateJWT).toHaveBeenCalledTimes(1);

      // Resolve the first refresh
      resolveRefresh({
        jwt: 'new-token',
        expire: Math.floor(Date.now() / 1000) + 15 * 60,
      });
      await promise1;
    });

    it('should track consecutive failures', async () => {
      mockCreateJWT.mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // First failure - need to advance through all 5 retry attempts with exponential backoff
      // 2000ms + 4000ms + 8000ms + 16000ms = 30000ms total
      const refresh1 = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000); // Advance through all retries
      await refresh1;
      expect(consoleSpy).not.toHaveBeenCalled();

      // Second failure
      const refresh2 = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000);
      await refresh2;
      expect(consoleSpy).not.toHaveBeenCalled();

      // Third failure - should trigger warning
      const refresh3 = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000);
      await refresh3;
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Multiple consecutive refresh failures'),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });

    it('should reset consecutive failures on success', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // Two failures
      mockCreateJWT.mockRejectedValue(new Error('Network error'));
      const refresh1 = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000);
      await refresh1;
      
      const refresh2 = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000);
      await refresh2;

      // Success
      const successExpiry = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(successExpiry),
      });
      await manager.refresh();

      // Another failure - should not trigger warning (counter reset)
      mockCreateJWT.mockRejectedValue(new Error('Network error'));
      const refresh3 = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000);
      await refresh3;

      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Callback Notifications', () => {
    it('should notify callbacks on successful refresh', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(expiryInSeconds),
      });

      const callback = vi.fn();
      manager.onRefresh(callback);

      await manager.refresh();

      expect(callback).toHaveBeenCalledWith(true, undefined);
    });

    it('should notify callbacks on failed refresh', async () => {
      mockCreateJWT.mockRejectedValue(new Error('Network error'));

      const callback = vi.fn();
      manager.onRefresh(callback);

      const refreshPromise = manager.refresh();
      await vi.advanceTimersByTimeAsync(35000); // Advance through all retries
      await refreshPromise;

      expect(callback).toHaveBeenCalledWith(false, expect.any(Error));
      expect(callback.mock.calls[0][1]?.message).toContain('Token refresh failed');
    });

    it('should notify multiple callbacks', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(expiryInSeconds),
      });

      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      manager.onRefresh(callback1);
      manager.onRefresh(callback2);
      manager.onRefresh(callback3);

      await manager.refresh();

      expect(callback1).toHaveBeenCalledWith(true, undefined);
      expect(callback2).toHaveBeenCalledWith(true, undefined);
      expect(callback3).toHaveBeenCalledWith(true, undefined);
    });

    it('should handle callback errors gracefully', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(expiryInSeconds),
      });

      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      manager.onRefresh(errorCallback);
      manager.onRefresh(normalCallback);

      await manager.refresh();

      // Both callbacks should be called despite error
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Callback error'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should allow removing callbacks', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(expiryInSeconds),
      });

      const callback = vi.fn();
      manager.onRefresh(callback);
      manager.offRefresh(callback);

      await manager.refresh();

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('State Management', () => {
    it('should report refreshing state correctly', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(expiryInSeconds),
      });

      expect(manager.isRefreshing()).toBe(false);

      const promise = manager.refresh();
      expect(manager.isRefreshing()).toBe(true);

      await promise;

      expect(manager.isRefreshing()).toBe(false);
    });

    it('should stop timer and reset state', () => {
      const now = Date.now();
      const expiryInSeconds = Math.floor(now / 1000) + 15 * 60;

      manager.start(expiryInSeconds);
      expect(manager.getTimeUntilRefresh()).toBeGreaterThan(0);

      manager.stop();
      expect(manager.getTimeUntilRefresh()).toBe(0);
    });

    it('should set and clear user context', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      manager.setUserContext('user-123', 'session-456');

      const now = Date.now();
      const expiryInSeconds = Math.floor(now / 1000) + 15 * 60;
      manager.start(expiryInSeconds);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting refresh timer'),
        expect.objectContaining({
          userId: 'user-123',
          sessionId: 'session-456',
        })
      );

      manager.clearUserContext();
      manager.start(expiryInSeconds);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting refresh timer'),
        expect.objectContaining({
          userId: 'unknown',
          sessionId: 'unknown',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should return current configuration', () => {
      const customManager = new TokenRefreshManager({
        refreshBeforeExpiry: 3 * 60 * 1000,
        retryAttempts: 5,
        retryDelay: 2000,
      });

      const config = customManager.getConfig();

      expect(config).toEqual({
        refreshBeforeExpiry: 3 * 60 * 1000,
        retryAttempts: 5,
        retryDelay: 2000,
      });

      customManager.stop();
    });
  });

  describe('Cookie Management', () => {
    it('should update cookie with new JWT on successful refresh', async () => {
      const expiryInSeconds = Math.floor(Date.now() / 1000) + 15 * 60;
      const mockJWT = createMockJWT(expiryInSeconds);
      mockCreateJWT.mockResolvedValue({
        jwt: mockJWT,
      });

      await manager.refresh();

      expect(document.cookie).toContain(`appwrite-session=${mockJWT}`);
      expect(document.cookie).toContain('path=/');
      expect(document.cookie.toLowerCase()).toContain('samesite=lax');
    });

    it('should restart timer with new expiry after successful refresh', async () => {
      const newExpiry = Math.floor(Date.now() / 1000) + 15 * 60;
      mockCreateJWT.mockResolvedValue({
        jwt: createMockJWT(newExpiry),
      });

      await manager.refresh();

      // Timer should be restarted with new expiry
      const timeUntilRefresh = manager.getTimeUntilRefresh();
      expect(timeUntilRefresh).toBeGreaterThan(0);
    });
  });
});

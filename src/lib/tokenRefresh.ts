import { createBrowserClient } from './appwrite';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

/**
 * Configuration options for TokenRefreshManager
 */
export interface TokenRefreshConfig {
  /** Milliseconds before expiry to refresh (default: 5 minutes) */
  refreshBeforeExpiry: number;
  /** Number of retry attempts (default: 5) */
  retryAttempts: number;
  /** Base delay between retries in ms (default: 2000) */
  retryDelay: number;
}

/**
 * Callback function for token refresh events
 * @param success - Whether the refresh was successful
 * @param error - Error object if refresh failed
 */
export type TokenRefreshCallback = (success: boolean, error?: Error) => void;

/**
 * TokenRefreshManager handles automatic JWT token refresh
 * Monitors token expiration and refreshes before expiry
 * Implements retry logic with exponential backoff
 */
export class TokenRefreshManager {
  private refreshTimer: NodeJS.Timeout | null = null;
  private isRefreshingFlag: boolean = false;
  private isStopped: boolean = false;
  private config: TokenRefreshConfig;
  private callbacks: TokenRefreshCallback[] = [];
  private currentExpiryTime: number | null = null;
  private consecutiveFailures: number = 0;
  private userId: string | null = null;
  private sessionId: string | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor(config?: Partial<TokenRefreshConfig>) {
    // Defaults
    const defaults = {
      refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 5,
      retryDelay: 2000,
    };

    // Only use provided values if they are not null/undefined
    const coercedConfig = config ? {
      refreshBeforeExpiry: config.refreshBeforeExpiry != null ? Number(config.refreshBeforeExpiry) : defaults.refreshBeforeExpiry,
      retryAttempts: config.retryAttempts != null ? Number(config.retryAttempts) : defaults.retryAttempts,
      retryDelay: config.retryDelay != null ? Number(config.retryDelay) : defaults.retryDelay,
    } : defaults;

    this.config = coercedConfig as TokenRefreshConfig;

    // Validate config values
    if (!Number.isFinite(this.config.refreshBeforeExpiry) || this.config.refreshBeforeExpiry <= 0) {
      throw new Error(`Invalid refreshBeforeExpiry: expected positive number, got ${this.config.refreshBeforeExpiry}`);
    }
    if (!Number.isInteger(this.config.retryAttempts) || this.config.retryAttempts <= 0) {
      throw new Error(`Invalid retryAttempts: expected positive integer, got ${this.config.retryAttempts}`);
    }
    // Cap retryAttempts to prevent DoS (max 50 attempts)
    const MAX_RETRY_ATTEMPTS = 50;
    if (this.config.retryAttempts > MAX_RETRY_ATTEMPTS) {
      console.warn(`[TokenRefresh] retryAttempts capped at ${MAX_RETRY_ATTEMPTS} (was ${this.config.retryAttempts})`);
      this.config.retryAttempts = MAX_RETRY_ATTEMPTS;
    }
    if (!Number.isFinite(this.config.retryDelay) || this.config.retryDelay <= 0) {
      throw new Error(`Invalid retryDelay: expected positive number, got ${this.config.retryDelay}`);
    }
  }

  /**
   * Set user context for logging
   * @param userId - User ID for logging context
   * @param sessionId - Session ID for logging context
   */
  setUserContext(userId: string, sessionId?: string): void {
    this.userId = userId;
    this.sessionId = sessionId || null;
  }

  /**
   * Clear user context
   */
  clearUserContext(): void {
    this.userId = null;
    this.sessionId = null;
  }

  /**
   * Start the automatic refresh timer
   * Also registers a visibilitychange listener so that when the tab comes back
   * into focus after being backgrounded (where timers are throttled), we
   * immediately check whether the token needs refreshing.
   * @param jwtExpiry - JWT expiration time in seconds (Unix timestamp)
   */
  start(jwtExpiry: number): void {
    // Validate jwtExpiry parameter
    if (!Number.isFinite(jwtExpiry) || jwtExpiry <= 0) {
      throw new Error(`Invalid jwtExpiry: expected a positive number, got ${jwtExpiry}`);
    }

    // Reset stopped flag when starting
    this.isStopped = false;

    // Clear any existing timer first
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Register visibility change handler (once) to handle browser tab throttling.
    // When a tab is backgrounded, setTimeout timers can be delayed by minutes.
    // On tab focus, we check if the token is due for refresh and trigger immediately.
    if (!this.visibilityHandler && typeof document !== 'undefined') {
      this.visibilityHandler = () => {
        if (document.hidden) return;
        if (!this.currentExpiryTime) return;

        const now = Date.now();
        const refreshTime = this.currentExpiryTime - this.config.refreshBeforeExpiry;

        // Only refresh if token is actually overdue (now > refreshTime, not >=)
        // Prevents immediate refresh when refreshBeforeExpiry >= token expiry
        if (now > refreshTime) {
          console.log('[TokenRefresh] Tab became visible, token refresh overdue — refreshing now', {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
            overdueMs: now - refreshTime,
          });
          // Clear the stale timer
          if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
          }
          
          // If refresh is already in progress, don't reschedule — wait for it to complete
          if (this.isRefreshingFlag) {
            console.log('[TokenRefresh] Refresh already in progress, skipping visibility handler', {
              timestamp: new Date().toISOString(),
              userId: this.userId || 'unknown',
            });
            return;
          }
          
          // Handle promise rejection to prevent unhandled rejection errors
          this.refresh().catch((error) => {
            console.error('[TokenRefresh] Visibility handler refresh failed', {
              timestamp: new Date().toISOString(),
              userId: this.userId || 'unknown',
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        }
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    // Calculate when to refresh (5 minutes before expiry)
    const now = Date.now();
    const expiryTime = jwtExpiry * 1000; // Convert to milliseconds
    const refreshTime = expiryTime - this.config.refreshBeforeExpiry;
    let delay = Math.max(0, refreshTime - now);

    // Cap delay to prevent exceeding JS timer limit (2^31-1 ms ≈ 24.8 days)
    // If delay exceeds limit, schedule refresh at max timeout and reschedule on completion
    const MAX_TIMEOUT = 2147483647; // 2^31 - 1 milliseconds
    if (delay > MAX_TIMEOUT) {
      console.warn('[TokenRefresh] Delay exceeds max timeout, capping to max value', {
        timestamp: new Date().toISOString(),
        userId: this.userId || 'unknown',
        originalDelayMs: delay,
        cappedDelayMs: MAX_TIMEOUT,
        cappedDelayDays: Math.round(MAX_TIMEOUT / (1000 * 60 * 60 * 24)),
      });
      delay = MAX_TIMEOUT;
    }

    this.currentExpiryTime = expiryTime;

    console.log('[TokenRefresh] Starting refresh timer', {
      timestamp: new Date().toISOString(),
      userId: this.userId || 'unknown',
      sessionId: this.sessionId || 'unknown',
      expiryTime: new Date(expiryTime).toISOString(),
      refreshTime: new Date(refreshTime).toISOString(),
      delayMs: delay,
      delayMinutes: Math.round(delay / 60000),
    });

    // Set new timer
    this.refreshTimer = setTimeout(() => {
      console.log('[TokenRefresh] Timer triggered, initiating refresh', {
        timestamp: new Date().toISOString(),
        userId: this.userId || 'unknown',
        sessionId: this.sessionId || 'unknown',
      });
      this.refresh();
    }, delay);
  }

  /**
   * Stop the refresh timer and remove the visibility change listener
   * Prevents any in-flight refresh from re-establishing authentication
   */
  stop(): void {
    // Set flag to prevent in-flight refresh from completing
    this.isStopped = true;
    // Do NOT clear isRefreshingFlag here — let in-flight refresh complete naturally
    // Clearing it would allow a concurrent refresh to start, causing race conditions

    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[TokenRefresh] Timer stopped', {
        timestamp: new Date().toISOString(),
        userId: this.userId || 'unknown',
        sessionId: this.sessionId || 'unknown',
      });
    }
    // Remove visibility change listener
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.currentExpiryTime = null;
    // Reset consecutive failures when stopping
    this.consecutiveFailures = 0;

    // Clear authentication cookie using js-cookie to properly handle all cookie attributes
    // This ensures removal even when cookie was set with SameSite=None, Secure, or domain attributes
    if (typeof window !== 'undefined') {
      try {
        // Use js-cookie to remove the cookie (handles all attributes)
        Cookies.remove('appwrite-session', { path: '/' });
        // Also try removing without path in case it was set differently
        Cookies.remove('appwrite-session');
        // Try removing with domain attribute (common for cross-domain cookies)
        Cookies.remove('appwrite-session', { domain: window.location.hostname });
        console.log('[TokenRefresh] Authentication cookie cleared');
      } catch (error) {
        console.error('[TokenRefresh] Error clearing authentication cookie:', error);
        // Fallback to direct document.cookie assignment with multiple variations
        document.cookie = 'appwrite-session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'appwrite-session=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }

  /**
   * Manually trigger a token refresh
   * Implements retry logic with exponential backoff
   * @returns Promise that resolves to true if refresh succeeded
   */
  async refresh(): Promise<boolean> {
    if (this.isRefreshingFlag) {
      console.log('[TokenRefresh] Refresh already in progress, skipping', {
        timestamp: new Date().toISOString(),
        userId: this.userId || 'unknown',
      });
      return false;
    }

    this.isRefreshingFlag = true;
    console.log('[TokenRefresh] Starting refresh attempt', {
      timestamp: new Date().toISOString(),
      userId: this.userId || 'unknown',
      sessionId: this.sessionId || 'unknown',
      maxAttempts: this.config.retryAttempts,
    });

    let lastError: any = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        console.log(`[TokenRefresh] Attempt ${attempt + 1}/${this.config.retryAttempts}`, {
          timestamp: new Date().toISOString(),
          userId: this.userId || 'unknown',
          sessionId: this.sessionId || 'unknown',
          attemptNumber: attempt + 1,
        });

        const { account } = createBrowserClient();

        // First verify the session is still valid
        try {
          await account.get();
        } catch (sessionError: any) {
          // If session is invalid, don't retry - fail immediately
          if (sessionError.code === 401 || sessionError.type === 'user_unauthorized') {
            console.error('[TokenRefresh] Session is invalid or expired', {
              timestamp: new Date().toISOString(),
              userId: this.userId || 'unknown',
              sessionId: this.sessionId || 'unknown',
              error: sessionError.message,
            });

            // Stop the timer and clear context
            this.stop();
            this.clearUserContext();

            const error = new Error('Session expired. Please log in again.');
            (error as any).code = 401;
            (error as any).type = 'session_expired';
            this.notifyCallbacks(false, error);
            this.isRefreshingFlag = false;
            return false;
          }
          throw sessionError;
        }

        // Session is valid, create new JWT
        const jwt = await account.createJWT();

        // Decode JWT to extract expiry time from standard 'exp' claim
        let jwtExpiry: number;
        try {
          const decoded = jwtDecode<{ exp?: number }>(jwt.jwt);
          if (decoded.exp) {
            jwtExpiry = decoded.exp; // exp is already in seconds since epoch
          } else {
            console.warn('[TokenRefresh] JWT missing exp claim, using fallback', {
              timestamp: new Date().toISOString(),
              userId: this.userId || 'unknown',
            });
            jwtExpiry = Math.floor(Date.now() / 1000) + (15 * 60);
          }
        } catch (decodeError) {
          console.warn('[TokenRefresh] Failed to decode JWT, using fallback expiry', {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
            error: decodeError instanceof Error ? decodeError.message : 'Unknown error',
          });
          jwtExpiry = Math.floor(Date.now() / 1000) + (15 * 60);
        }

        // Check if stop() was called while refresh was in-flight
        if (this.isStopped) {
          console.log('[TokenRefresh] Refresh completed but stop() was called, discarding result', {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
          });
          this.isRefreshingFlag = false;
          return false;
        }

        // Update cookie with new JWT using js-cookie for safe handling
        // Only proceed if window exists (browser context) and stop() hasn't been called
        if (typeof window !== 'undefined' && window.location && !this.isStopped) {
          const isSecure = window.location.protocol === 'https:';
          const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          
          // Use most permissive settings for localhost to work in all contexts
          if (isLocalhost) {
            // For localhost, don't set SameSite to maximize compatibility
            Cookies.set('appwrite-session', jwt.jwt, {
              path: '/',
              expires: 7,
            });
          } else {
            Cookies.set('appwrite-session', jwt.jwt, {
              path: '/',
              expires: 7,
              sameSite: isSecure ? 'none' : 'lax',
              secure: isSecure,
            });
          }
        } else {
          console.warn('[TokenRefresh] Not in browser context or stop() called, skipping cookie update', {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
            isStopped: this.isStopped,
          });
        }

        // Reset consecutive failures counter on success
        this.consecutiveFailures = 0;

        console.log('[TokenRefresh] ✓ Refresh successful', {
          timestamp: new Date().toISOString(),
          userId: this.userId || 'unknown',
          sessionId: this.sessionId || 'unknown',
          attemptNumber: attempt + 1,
          newExpiry: new Date(jwtExpiry * 1000).toISOString(),
          timeUntilExpiry: Math.round((jwtExpiry * 1000 - Date.now()) / 60000) + ' minutes',
        });

        // Restart timer with new expiry (only if not stopped)
        if (!this.isStopped) {
          this.start(jwtExpiry);
        }

        // Notify callbacks of success
        this.notifyCallbacks(true);

        this.isRefreshingFlag = false;
        return true;
      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorType = (error as any)?.type || 'unknown';
        const errorCode = (error as any)?.code || 'unknown';

        console.error(`[TokenRefresh] ✗ Attempt ${attempt + 1} failed`, {
          timestamp: new Date().toISOString(),
          userId: this.userId || 'unknown',
          sessionId: this.sessionId || 'unknown',
          attemptNumber: attempt + 1,
          errorMessage,
          errorType,
          errorCode,
          remainingAttempts: this.config.retryAttempts - attempt - 1,
        });

        // Don't retry on authentication errors - session is dead
        if (errorCode === 401 || errorType === 'user_unauthorized' || errorType === 'session_expired') {
          console.error('[TokenRefresh] Authentication error detected, stopping retries', {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
            errorType,
            errorCode,
          });
          break;
        }

        if (attempt < this.config.retryAttempts - 1) {
          // Calculate exponential backoff delay
          // Calculate exponential backoff delay
          const maxBackoffDelay = 60000; // Cap at 60 seconds
          const backoffDelay = Math.min(
            this.config.retryDelay * Math.pow(2, attempt),
            maxBackoffDelay
          );
          console.log(`[TokenRefresh] Retrying in ${backoffDelay}ms`, {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
            backoffDelayMs: backoffDelay,
            nextAttempt: attempt + 2,
          });
          console.log(`[TokenRefresh] Retrying in ${backoffDelay}ms`, {
            timestamp: new Date().toISOString(),
            userId: this.userId || 'unknown',
            backoffDelayMs: backoffDelay,
            nextAttempt: attempt + 2,
          });

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All attempts failed - increment consecutive failures
    this.consecutiveFailures++;

    // Log warning for multiple consecutive failures
    if (this.consecutiveFailures >= 3) {
      console.warn('[TokenRefresh] ⚠️ Multiple consecutive refresh failures detected', {
        timestamp: new Date().toISOString(),
        userId: this.userId || 'unknown',
        sessionId: this.sessionId || 'unknown',
        consecutiveFailures: this.consecutiveFailures,
        message: 'User may be experiencing persistent authentication issues',
      });
    }

    console.error('[TokenRefresh] ✗ All refresh attempts failed', {
      timestamp: new Date().toISOString(),
      userId: this.userId || 'unknown',
      sessionId: this.sessionId || 'unknown',
      totalAttempts: this.config.retryAttempts,
      consecutiveFailures: this.consecutiveFailures,
      lastError: lastError?.message || 'Unknown error',
    });

    const error = new Error('Token refresh failed after all retries');
    (error as any).originalError = lastError;
    this.notifyCallbacks(false, error);

    this.isRefreshingFlag = false;
    return false;
  }

  /**
   * Check if refresh is currently in progress
   * @returns true if refresh is in progress
   */
  isRefreshing(): boolean {
    return this.isRefreshingFlag;
  }

  /**
   * Get time until next refresh in milliseconds
   * @returns milliseconds until next refresh, or 0 if no timer is active
   */
  getTimeUntilRefresh(): number {
    if (!this.currentExpiryTime) {
      return 0;
    }

    const now = Date.now();
    const refreshTime = this.currentExpiryTime - this.config.refreshBeforeExpiry;
    return Math.max(0, refreshTime - now);
  }

  /**
   * Register a callback for refresh events
   * @param callback - Function to call when refresh completes
   */
  onRefresh(callback: TokenRefreshCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove a callback
   * @param callback - Callback to remove
   */
  offRefresh(callback: TokenRefreshCallback): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  /**
   * Notify all registered callbacks
   * @param success - Whether the refresh was successful
   * @param error - Error object if refresh failed
   */
  private notifyCallbacks(success: boolean, error?: Error): void {
    this.callbacks.forEach((callback) => {
      try {
        callback(success, error);
      } catch (callbackError) {
        console.error('[TokenRefresh] Callback error:', callbackError);
      }
    });
  }

  /**
   * Get current configuration
   * @returns Current configuration object
   */
  getConfig(): TokenRefreshConfig {
    return { ...this.config };
  }
}

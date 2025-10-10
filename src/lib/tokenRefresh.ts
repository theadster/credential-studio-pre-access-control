import { createBrowserClient } from './appwrite';
import Cookies from 'js-cookie';
import { jwtDecode } from 'jwt-decode';

/**
 * Configuration options for TokenRefreshManager
 */
export interface TokenRefreshConfig {
  /** Milliseconds before expiry to refresh (default: 5 minutes) */
  refreshBeforeExpiry: number;
  /** Number of retry attempts (default: 3) */
  retryAttempts: number;
  /** Base delay between retries in ms (default: 1000) */
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
  private config: TokenRefreshConfig;
  private callbacks: TokenRefreshCallback[] = [];
  private currentExpiryTime: number | null = null;
  private consecutiveFailures: number = 0;
  private userId: string | null = null;
  private sessionId: string | null = null;

  constructor(config?: Partial<TokenRefreshConfig>) {
    this.config = {
      refreshBeforeExpiry: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 5, // Increased from 3 to 5 for better reliability
      retryDelay: 2000, // Increased from 1000ms to 2000ms for better network recovery
      ...config,
    };
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
   * @param jwtExpiry - JWT expiration time in seconds (Unix timestamp)
   */
  start(jwtExpiry: number): void {
    // Clear any existing timer first
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }

    // Calculate when to refresh (5 minutes before expiry)
    const now = Date.now();
    const expiryTime = jwtExpiry * 1000; // Convert to milliseconds
    const refreshTime = expiryTime - this.config.refreshBeforeExpiry;
    const delay = Math.max(0, refreshTime - now);

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
   * Stop the refresh timer
   */
  stop(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
      console.log('[TokenRefresh] Timer stopped', {
        timestamp: new Date().toISOString(),
        userId: this.userId || 'unknown',
        sessionId: this.sessionId || 'unknown',
      });
    }
    this.currentExpiryTime = null;
    // Reset consecutive failures when stopping
    this.consecutiveFailures = 0;
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

        // Update cookie with new JWT using js-cookie for safe handling
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

        // Restart timer with new expiry
        this.start(jwtExpiry);

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

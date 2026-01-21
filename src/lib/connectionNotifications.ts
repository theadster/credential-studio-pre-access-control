/**
 * Connection Notification Helper Functions
 * 
 * This module provides notification functions for connection health events.
 * Uses SweetAlert2 for displaying toast notifications and alerts.
 * 
 * Features:
 * - Connection lost notifications (warning toast)
 * - Reconnection success notifications (success toast)
 * - Max retries alert (persistent with reconnect button)
 * - Refresh error notifications (error toast with retry)
 * - Brief disconnection suppression (< 5 seconds)
 * 
 * @see .kiro/specs/data-refresh-monitoring/requirements.md - Requirements 8.1-8.5
 */

import Swal from 'sweetalert2';
import { getSweetAlertTheme, defaultSweetAlertConfig } from './sweetalert-config';
import { DATA_FRESHNESS } from './constants';

/**
 * Options for connection lost notification
 */
export interface ConnectionLostOptions {
  /** Duration of disconnection in ms (used for suppression check) */
  disconnectionDuration?: number;
  /** Whether dark mode is enabled */
  isDark?: boolean;
}

/**
 * Options for reconnected notification
 */
export interface ReconnectedOptions {
  /** Whether dark mode is enabled */
  isDark?: boolean;
}

/**
 * Options for max retries alert
 */
export interface MaxRetriesAlertOptions {
  /** Number of attempts made */
  attemptsMade: number;
  /** Callback to trigger manual reconnection */
  onReconnect: () => void;
  /** Whether dark mode is enabled */
  isDark?: boolean;
}

/**
 * Options for refresh error notification
 */
export interface RefreshErrorOptions {
  /** Error message to display */
  errorMessage?: string;
  /** Callback to retry the refresh */
  onRetry?: () => void;
  /** Whether dark mode is enabled */
  isDark?: boolean;
}

/**
 * Determines if a notification should be suppressed based on disconnection duration.
 * Brief disconnections (< 5 seconds) that auto-recover should not trigger notifications.
 * 
 * @param disconnectionDuration - Duration of disconnection in ms
 * @returns true if notification should be suppressed, false otherwise
 * 
 * @see Requirements 8.5 - Brief disconnection suppression
 */
export function shouldSuppressNotification(disconnectionDuration: number): boolean {
  return disconnectionDuration < DATA_FRESHNESS.BRIEF_DISCONNECT_THRESHOLD;
}

/**
 * Shows a warning toast notification when the connection is lost.
 * Suppresses notification for brief disconnections (< 5 seconds).
 * 
 * @param options - Configuration options
 * @returns Promise that resolves when notification is shown (or suppressed)
 * 
 * @see Requirements 8.1 - Connection lost notification
 * @see Requirements 8.5 - Brief disconnection suppression
 */
export async function showConnectionLostNotification(
  options: ConnectionLostOptions = {}
): Promise<void> {
  const { disconnectionDuration = DATA_FRESHNESS.BRIEF_DISCONNECT_THRESHOLD, isDark = false } = options;

  // Suppress notification for brief disconnections
  if (shouldSuppressNotification(disconnectionDuration)) {
    return;
  }

  const customClass = getSweetAlertTheme(isDark);

  await Swal.fire({
    ...defaultSweetAlertConfig,
    customClass,
    icon: 'warning',
    title: 'Connection Lost',
    html: 'Real-time updates are temporarily unavailable. Attempting to reconnect...',
    timer: 5000,
    timerProgressBar: true,
  });
}

/**
 * Shows a success toast notification when reconnection succeeds.
 * 
 * @param options - Configuration options
 * @returns Promise that resolves when notification is shown
 * 
 * @see Requirements 8.2 - Reconnection success notification
 */
export async function showReconnectedNotification(
  options: ReconnectedOptions = {}
): Promise<void> {
  const { isDark = false } = options;
  const customClass = getSweetAlertTheme(isDark);

  await Swal.fire({
    ...defaultSweetAlertConfig,
    customClass,
    icon: 'success',
    title: 'Connection Restored',
    html: 'Real-time updates are now active.',
    timer: 3000,
    timerProgressBar: true,
  });
}

/**
 * Shows a persistent alert when automatic reconnection fails after maximum attempts.
 * Includes a reconnect button for manual retry.
 * 
 * @param options - Configuration options including reconnect callback
 * @returns Promise that resolves when user interacts with the alert
 * 
 * @see Requirements 8.3 - Max retries alert with manual reconnect
 */
export async function showMaxRetriesAlert(
  options: MaxRetriesAlertOptions
): Promise<void> {
  const { attemptsMade, onReconnect, isDark = false } = options;
  const customClass = getSweetAlertTheme(isDark);

  const result = await Swal.fire({
    title: 'Connection Failed',
    html: `
      <div class="space-y-2">
        <p class="text-muted-foreground">
          Unable to establish connection after ${attemptsMade} attempts.
        </p>
        <p class="text-sm text-muted-foreground">
          Please check your network connection and try again.
        </p>
      </div>
    `,
    icon: 'error',
    showCancelButton: true,
    confirmButtonText: 'Reconnect',
    cancelButtonText: 'Dismiss',
    customClass: {
      ...customClass,
      popup: `${customClass.popup} border-destructive`,
      confirmButton: 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md',
      cancelButton: 'bg-secondary text-secondary-foreground hover:bg-secondary/90 px-4 py-2 rounded-md ml-2',
    },
    buttonsStyling: false,
    allowOutsideClick: false,
    allowEscapeKey: true,
    showClass: {
      popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
      backdrop: 'swal2-backdrop-show',
    },
    hideClass: {
      popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
      backdrop: 'swal2-backdrop-hide',
    },
  });

  if (result.isConfirmed) {
    onReconnect();
  }
}

/**
 * Shows an error toast notification when data refresh fails.
 * Optionally includes a retry button.
 * 
 * @param options - Configuration options including optional retry callback
 * @returns Promise that resolves when notification is shown
 * 
 * @see Requirements 8.4 - Refresh error notification with retry
 */
export async function showRefreshErrorNotification(
  options: RefreshErrorOptions = {}
): Promise<void> {
  const { errorMessage = 'Failed to refresh data', onRetry, isDark = false } = options;
  const customClass = getSweetAlertTheme(isDark);

  let retryButton: HTMLButtonElement | null = null;

  await Swal.fire({
    ...defaultSweetAlertConfig,
    customClass,
    icon: 'error',
    title: 'Refresh Failed',
    html: errorMessage,
    timer: onRetry ? undefined : 5000, // No auto-dismiss if retry is available
    timerProgressBar: !onRetry,
    showConfirmButton: !!onRetry,
    confirmButtonText: 'Retry',
    didOpen: (popup) => {
      if (onRetry) {
        // Style the confirm button
        const confirmBtn = popup.querySelector('.swal2-confirm') as HTMLButtonElement;
        if (confirmBtn) {
          confirmBtn.className = 'bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm';
        }
      }
    },
    willClose: () => {
      if (retryButton && retryButton.parentNode) {
        retryButton.parentNode.removeChild(retryButton);
        retryButton = null;
      }
    },
    preConfirm: () => {
      if (onRetry) {
        onRetry();
      }
    },
  });
}

/**
 * Tracks disconnection start time for suppression logic.
 * Used internally to calculate disconnection duration.
 */
let disconnectionStartTime: number | null = null;

/**
 * Records the start of a disconnection event.
 * Call this when connection status changes to 'disconnected'.
 */
export function recordDisconnectionStart(): void {
  disconnectionStartTime = Date.now();
}

/**
 * Gets the current disconnection duration in milliseconds.
 * Returns 0 if no disconnection is recorded.
 */
export function getDisconnectionDuration(): number {
  if (disconnectionStartTime === null) {
    return 0;
  }
  return Date.now() - disconnectionStartTime;
}

/**
 * Clears the disconnection tracking.
 * Call this when connection is restored.
 */
export function clearDisconnectionTracking(): void {
  disconnectionStartTime = null;
}

/**
 * Helper to check if we're currently in a disconnected state being tracked.
 */
export function isTrackingDisconnection(): boolean {
  return disconnectionStartTime !== null;
}

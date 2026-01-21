/**
 * ConnectionStatusIndicator Component
 *
 * Visual indicator for WebSocket connection status in the dashboard header.
 * Displays a colored dot with tooltip showing detailed status information,
 * and provides a reconnect button when disconnected.
 *
 * @see .kiro/specs/data-refresh-monitoring/design.md
 * @see .kiro/specs/data-refresh-monitoring/requirements.md (Requirements 6.1-6.7, 9.1-9.7)
 */

import React, { memo } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ConnectionStatusIndicatorProps, ConnectionStatus } from '@/types/connectionHealth';

/**
 * Maps connection status to semantic color classes
 * Requirement 6.1: emerald/success (connected), amber/warning (connecting/reconnecting), destructive/red (disconnected)
 */
const statusColorMap: Record<ConnectionStatus, { dot: string; text: string; icon: string }> = {
  connected: {
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    text: 'text-emerald-700 dark:text-emerald-300',
    icon: 'text-emerald-600 dark:text-emerald-400',
  },
  connecting: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  reconnecting: {
    dot: 'bg-amber-500 dark:bg-amber-400',
    text: 'text-amber-700 dark:text-amber-300',
    icon: 'text-amber-600 dark:text-amber-400',
  },
  disconnected: {
    dot: 'bg-red-500 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-300',
    icon: 'text-red-600 dark:text-red-400',
  },
};

/**
 * Maps connection status to display labels
 */
const statusLabelMap: Record<ConnectionStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting...',
  reconnecting: 'Reconnecting...',
  disconnected: 'Disconnected',
};

/**
 * Formats a date to a human-readable time string
 */
function formatTime(date: Date | null): string {
  if (!date) return 'Never';
  return date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * Calculates time until next reconnect attempt
 */
function getTimeUntilReconnect(nextReconnectAt: Date | null): string {
  if (!nextReconnectAt) return '';
  const now = Date.now();
  const diff = nextReconnectAt.getTime() - now;
  if (diff <= 0) return 'now';
  const seconds = Math.ceil(diff / 1000);
  return `${seconds}s`;
}

/**
 * ConnectionStatusIndicator displays the current WebSocket connection status
 * with a colored dot and reconnect button when needed.
 * 
 * Simplified version without Tooltip to avoid Radix UI ref composition issues.
 *
 * Visual States:
 * - Connected: Green dot + Wifi icon
 * - Connecting: Amber dot + pulsing Wifi icon
 * - Reconnecting: Amber dot + attempt count + next retry time
 * - Disconnected: Red dot + "Disconnected" text + "Reconnect" button
 *
 * @example
 * ```tsx
 * <ConnectionStatusIndicator
 *   connectionState={connectionHealth.state}
 *   onReconnect={connectionHealth.reconnect}
 * />
 * ```
 */
function ConnectionStatusIndicatorComponent({
  connectionState,
  onReconnect,
  className,
}: ConnectionStatusIndicatorProps) {
  const { status, lastConnectedAt, reconnectAttempt, nextReconnectAt } = connectionState;
  const colors = statusColorMap[status];
  const label = statusLabelMap[status];
  const isLoading = status === 'connecting' || status === 'reconnecting';
  const isDisconnected = status === 'disconnected';

  return (
    <div
      className={cn(
        'flex items-center gap-2 transition-all duration-300',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
      title={lastConnectedAt ? `Last connected: ${formatTime(lastConnectedAt)}` : undefined}
    >
      {/* Status indicator (Requirements 6.1, 6.2) */}
      <div className="flex items-center gap-2 cursor-default">
        {/* Colored dot (Requirement 6.1) */}
        <span
          className={cn(
            'h-2 w-2 rounded-full transition-all duration-300',
            colors.dot,
            isLoading && 'animate-pulse'
          )}
          aria-hidden="true"
        />

        {/* Icon (Requirement 6.6) */}
        {isDisconnected ? (
          <WifiOff
            className={cn('h-4 w-4', colors.icon)}
            aria-hidden="true"
          />
        ) : (
          <Wifi
            className={cn(
              'h-4 w-4',
              colors.icon,
              isLoading && 'animate-pulse'
            )}
            aria-hidden="true"
          />
        )}

        {/* Status text - always show for user clarity */}
        <span className={cn('text-sm font-medium', colors.text)}>
          {status === 'connected' && 'Live'}
          {status === 'connecting' && 'Connecting...'}
          {status === 'reconnecting' && `Reconnecting (${reconnectAttempt}/10)...`}
          {status === 'disconnected' && 'Disconnected'}
        </span>
      </div>

      {/* Reconnect button (Requirement 6.3) */}
      {isDisconnected && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReconnect}
          className={cn(
            'h-8 px-3 text-sm font-medium',
            'ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
          aria-label="Reconnect to server"
        >
          <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
          Reconnect
        </Button>
      )}

      {/* Loading spinner for reconnecting state (Requirement 6.4) */}
      {status === 'reconnecting' && nextReconnectAt && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <RefreshCw
            className="h-3 w-3 animate-spin"
            aria-hidden="true"
          />
          <span>Retry in {getTimeUntilReconnect(nextReconnectAt)}</span>
        </div>
      )}
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export const ConnectionStatusIndicator = memo(ConnectionStatusIndicatorComponent);

export default ConnectionStatusIndicator;

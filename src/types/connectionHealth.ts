/**
 * Connection Health Type Definitions
 * 
 * This module provides TypeScript types for the data refresh monitoring system.
 * These types define the structure of connection health state, data freshness
 * tracking, and related interfaces for real-time connection monitoring.
 * 
 * @see .kiro/specs/data-refresh-monitoring/design.md
 */

/**
 * Connection status values for WebSocket connection health
 */
export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

/**
 * Data types that can be tracked for freshness
 */
export type DataType = 'attendees' | 'users' | 'roles' | 'settings' | 'logs';

/**
 * Connection state tracked by useConnectionHealth hook
 * 
 * Represents the current state of the WebSocket connection including
 * timestamps, reconnection tracking, and error information.
 */
export interface ConnectionState {
  /** Current connection status */
  status: ConnectionStatus;
  /** Timestamp when connection was last established (null if never connected) */
  lastConnectedAt: Date | null;
  /** Timestamp when connection was last lost (null if never disconnected) */
  lastDisconnectedAt: Date | null;
  /** Current reconnection attempt number (0 if not reconnecting) */
  reconnectAttempt: number;
  /** Timestamp when next reconnection attempt will occur (null if not scheduled) */
  nextReconnectAt: Date | null;
  /** Last error that occurred (null if no error) */
  error: Error | null;
}

/**
 * Options for configuring the useConnectionHealth hook
 */
export interface UseConnectionHealthOptions {
  /** Interval to check for heartbeat/activity in ms (default: 30000) */
  heartbeatInterval?: number;
  /** Maximum number of automatic reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Initial backoff delay for reconnection in ms (default: 1000) */
  initialBackoff?: number;
  /** Maximum backoff delay for reconnection in ms (default: 30000) */
  maxBackoff?: number;
  /** Callback when connection status changes */
  onStatusChange?: (status: ConnectionStatus) => void;
  /** Callback when reconnection succeeds */
  onReconnectSuccess?: () => void;
  /** Callback when reconnection fails (after max attempts or error) */
  onReconnectFailure?: (error: Error) => void;
}

/**
 * Internal methods exposed by useConnectionHealth for integration
 */
export interface ConnectionHealthInternal {
  markConnected: () => void;
  markDisconnected: (error?: Error) => void;
  handleReconnectSuccess: () => void;
  handleReconnectFailure: (error?: Error) => void;
  scheduleReconnect: (attempt: number) => void;
}

/**
 * Return type for useConnectionHealth hook
 */
export interface UseConnectionHealthReturn {
  /** Current connection state */
  state: ConnectionState;
  /** Manually trigger a reconnection attempt */
  reconnect: () => void;
  /** Reset the backoff counter (used for manual reconnection) */
  resetBackoff: () => void;
  /** Convenience property: true if status is 'connected' */
  isHealthy: boolean;
  /** Maximum number of reconnection attempts configured for this hook */
  maxReconnectAttempts: number;
  /** Internal methods for integration with useRealtimeSubscription */
  _internal?: ConnectionHealthInternal;
}

/**
 * Data freshness state tracked by useDataFreshness hook
 * 
 * Represents the freshness state of a specific data type including
 * timestamp of last update and staleness information.
 */
export interface FreshnessState {
  /** Timestamp when data was last successfully updated (null if never updated) */
  lastUpdatedAt: Date | null;
  /** Whether the data is considered stale based on threshold */
  isStale: boolean;
  /** Duration in ms since data became stale (null if not stale) */
  staleDuration: number | null;
}

/**
 * Options for configuring the useDataFreshness hook
 */
export interface UseDataFreshnessOptions {
  /** The type of data being tracked */
  dataType: DataType;
  /** Time in ms after which data is considered stale (default: 30000) */
  stalenessThreshold?: number;
  /** Callback when data becomes stale */
  onBecomeStale?: () => void;
  /** Callback when data is refreshed */
  onRefresh?: () => void;
}

/**
 * Return type for useDataFreshness hook
 */
export interface UseDataFreshnessReturn {
  /** Current freshness state */
  state: FreshnessState;
  /** Mark data as fresh (call after successful data fetch) */
  markFresh: () => void;
  /** Get human-readable relative time since last update */
  getRelativeTime: () => string;
  /** Trigger a manual data refresh */
  refresh: () => Promise<void>;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
}

/**
 * Options for configuring the usePollingFallback hook
 */
export interface UsePollingFallbackOptions {
  /** Whether polling should be enabled (typically when disconnected > 60s) */
  enabled: boolean;
  /** Polling interval in ms (default: 30000) */
  interval?: number;
  /** The type of data to poll for */
  dataType: DataType;
  /** Callback to execute on each poll */
  onPoll?: () => Promise<void>;
  /** Callback when a poll fails */
  onError?: (error: Error) => void;
}

/**
 * Return type for usePollingFallback hook
 */
export interface UsePollingFallbackReturn {
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Timestamp of last successful poll (null if never polled) */
  lastPollAt: Date | null;
  /** Manually trigger an immediate poll */
  pollNow: () => Promise<void>;
}

/**
 * Props for ConnectionStatusIndicator component
 */
export interface ConnectionStatusIndicatorProps {
  /** Current connection state from useConnectionHealth */
  connectionState: ConnectionState;
  /** Callback to trigger manual reconnection */
  onReconnect: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for DataRefreshIndicator component
 */
export interface DataRefreshIndicatorProps {
  /** Current freshness state from useDataFreshness */
  freshnessState: FreshnessState;
  /** Whether a refresh is currently in progress */
  isRefreshing: boolean;
  /** Callback to trigger manual refresh */
  onRefresh: () => void;
  /** Human-readable relative time since last update */
  relativeTime: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Connection state store structure (for internal state management)
 */
export interface ConnectionStateStore {
  /** Current connection status */
  status: ConnectionStatus;
  /** Unix timestamp when connection was last established (null if never) */
  lastConnectedAt: number | null;
  /** Unix timestamp when connection was last lost (null if never) */
  lastDisconnectedAt: number | null;
  /** Current reconnection attempt number */
  reconnectAttempt: number;
  /** Unix timestamp when next reconnection attempt will occur (null if not scheduled) */
  nextReconnectAt: number | null;
  /** Error message from last error (null if no error) */
  errorMessage: string | null;
}

/**
 * Data freshness store structure (for internal state management)
 */
export interface DataFreshnessStore {
  /** The type of data being tracked */
  dataType: DataType;
  /** Unix timestamp when data was last updated (null if never) */
  lastUpdatedAt: number | null;
  /** Staleness threshold in ms */
  stalenessThreshold: number;
}

/**
 * Calculates exponential backoff delay for reconnection attempts
 * Formula: min(initialBackoff * 2^(attempt-1), maxBackoff)
 * 
 * @param attempt - The reconnection attempt number (1-based)
 * @param initialBackoff - Initial backoff delay in ms (default: 1000)
 * @param maxBackoff - Maximum backoff delay in ms (default: 30000)
 * @returns The calculated backoff delay in ms
 */
export function calculateBackoff(
  attempt: number,
  initialBackoff: number = 1000,
  maxBackoff: number = 30000
): number {
  if (attempt < 1) return initialBackoff;
  const delay = initialBackoff * Math.pow(2, attempt - 1);
  return Math.min(delay, maxBackoff);
}

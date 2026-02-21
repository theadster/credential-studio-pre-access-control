import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@/lib/appwrite';
import type { Models, RealtimeResponseEvent } from 'appwrite';
import type { UseConnectionHealthReturn, UseDataFreshnessReturn, ConnectionHealthInternal } from '@/types/connectionHealth';

/**
 * Extended connection health return type with internal methods
 * Note: UseConnectionHealthReturn now includes _internal as optional
 */
type ConnectionHealthWithInternal = UseConnectionHealthReturn;

/**
 * Options for the realtime subscription hook
 */
export interface RealtimeSubscriptionOptions<T extends Models.Document> {
  /**
   * Channels to subscribe to
   * Example: [`databases.${dbId}.tables.${tableId}.rows`]
   */
  channels: string[];
  
  /**
   * Callback function to handle realtime events
   */
  callback: (payload: RealtimeResponseEvent<T>) => void;
  
  /**
   * Optional error handler
   */
  onError?: (error: Error) => void;
  
  /**
   * Whether the subscription is enabled (default: true)
   * Useful for conditional subscriptions
   */
  enabled?: boolean;
  
  /**
   * Optional connection health hook for status tracking
   * When provided, the subscription will update connection status
   * @see useConnectionHealth
   * @deprecated Use onConnected callback instead to avoid infinite loops
   */
  connectionHealth?: ConnectionHealthWithInternal;
  
  /**
   * Optional data freshness hook for timestamp updates
   * When provided, markFresh() will be called on successful events
   * @see useDataFreshness
   * @deprecated Use callback to call markFresh() via refs instead
   */
  dataFreshness?: UseDataFreshnessReturn;
  
  /**
   * Whether to automatically reconnect on connection loss (default: true)
   * When true, uses exponential backoff from connectionHealth
   */
  autoReconnect?: boolean;
  
  /**
   * Callback to fetch missed data after reconnection
   * Called when connection is restored to sync any missed updates
   */
  refreshOnReconnect?: () => Promise<void>;
  
  /**
   * Callback fired when subscription successfully connects
   * Use this to call connectionHealth.markConnected() via a ref
   * This avoids infinite loops caused by passing connectionHealth directly
   */
  onConnected?: () => void;
  
  /**
   * Callback fired when subscription disconnects
   * Use this to call connectionHealth.markDisconnected() via a ref
   */
  onDisconnected?: (error?: Error) => void;
}

/**
 * Custom hook for subscribing to Appwrite Realtime events
 * Automatically handles subscription cleanup on unmount
 * 
 * Enhanced with connection health monitoring and data freshness tracking:
 * - Integrates with useConnectionHealth for connection status updates
 * - Integrates with useDataFreshness for automatic timestamp updates
 * - Supports automatic reconnection with exponential backoff
 * - Can fetch missed data after reconnection
 * 
 * @example
 * ```tsx
 * // Basic usage
 * useRealtimeSubscription({
 *   channels: [`databases.${dbId}.tables.${tableId}.rows`],
 *   callback: (response) => {
 *     if (response.events.includes('databases.*.tables.*.rows.*.create')) {
 *       console.log('New row created:', response.payload);
 *     }
 *   },
 *   onError: (error) => console.error('Realtime error:', error),
 * });
 * 
 * // With health monitoring
 * const connectionHealth = useConnectionHealth({ onStatusChange: console.log });
 * const dataFreshness = useDataFreshness({ dataType: 'attendees' }, fetchAttendees);
 * 
 * useRealtimeSubscription({
 *   channels: [`databases.${dbId}.tables.${tableId}.rows`],
 *   callback: handleRealtimeEvent,
 *   connectionHealth,
 *   dataFreshness,
 *   autoReconnect: true,
 *   refreshOnReconnect: fetchAttendees,
 * });
 * ```
 */
export function useRealtimeSubscription<T extends Models.Document = Models.Document>(
  options: RealtimeSubscriptionOptions<T>
) {
  const { 
    channels, 
    callback, 
    onError, 
    enabled = true,
    connectionHealth,
    dataFreshness,
    autoReconnect = true,
    refreshOnReconnect,
    onConnected,
    onDisconnected,
  } = options;
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isReconnectingRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  
  // Memoize the callback to prevent unnecessary re-subscriptions
  const stableCallback = useCallback(callback, [callback]);
  const stableOnConnected = useCallback(() => onConnected?.(), [onConnected]);
  const stableOnDisconnected = useCallback((error?: Error) => onDisconnected?.(error), [onDisconnected]);
  const stableOnError = useCallback(
    (error: Error) => {
      if (onError) {
        onError(error);
      } else {
        console.error('Realtime subscription error:', error);
      }
    },
    [onError]
  );

  // Stringify channels to create a stable dependency
  const channelsKey = JSON.stringify(channels);
  
  useEffect(() => {
    // Don't subscribe if disabled
    if (!enabled) {
      // Clean up existing subscription if disabled
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (err) {
          // Ignore errors when unsubscribing
        }
        unsubscribeRef.current = null;
      }
      return;
    }

    // Don't subscribe if no channels provided
    if (!channels || channels.length === 0) {
      console.warn('useRealtimeSubscription: No channels provided');
      return;
    }

    let isSubscribed = true;
    let unsubscribe: (() => void) | null = null;

    const subscribe = async () => {
      try {
        // Cleanup any existing subscription first
        if (unsubscribeRef.current) {
          try {
            unsubscribeRef.current();
          } catch (err) {
            // Ignore errors when unsubscribing
          }
          unsubscribeRef.current = null;
        }

        const { client } = createBrowserClient();
        
        // Subscribe to the channels
        unsubscribe = client.subscribe<T>(channels, (response) => {
          // Only process if still subscribed
          if (isSubscribed) {
            try {
              stableCallback(response);
              
              // Mark data as fresh on successful real-time event (Requirement 3.1)
              if (dataFreshness) {
                dataFreshness.markFresh();
              }
            } catch (error) {
              stableOnError(
                error instanceof Error 
                  ? error 
                  : new Error('Error in realtime callback')
              );
            }
          }
        });

        // Store the unsubscribe function
        unsubscribeRef.current = unsubscribe;
        
        // Mark connection as established (Requirement 1.1)
        // Prefer the new onConnected callback to avoid infinite loops
        if (onConnected) {
          stableOnConnected();
        } else if (connectionHealth?._internal) {
          // Fallback to deprecated connectionHealth prop
          connectionHealth._internal.markConnected();
        }
        
        // Handle reconnection success
        if (isReconnectingRef.current) {
          isReconnectingRef.current = false;
          reconnectAttemptRef.current = 0;
          
          // Notify connection health of successful reconnection (Requirement 2.3)
          if (connectionHealth?._internal) {
            connectionHealth._internal.handleReconnectSuccess();
          }
          
          // Fetch missed data after reconnection (Requirement 4.3)
          if (refreshOnReconnect) {
            try {
              await refreshOnReconnect();
              // Mark fresh after fetching missed data
              if (dataFreshness) {
                dataFreshness.markFresh();
              }
            } catch (refreshError) {
              console.error('Failed to refresh data after reconnection:', refreshError);
            }
          }
        }
        
        // Log subscription in development
        if (process.env.NODE_ENV === 'development') {
          console.debug('Realtime subscription active:', channels);
        }
      } catch (error) {
        const subscriptionError = error instanceof Error 
          ? error 
          : new Error('Failed to subscribe to realtime');
        
        stableOnError(subscriptionError);
        
        // Mark connection as disconnected (Requirements 1.3, 1.5)
        // Prefer the new onDisconnected callback to avoid infinite loops
        if (onDisconnected) {
          stableOnDisconnected(subscriptionError);
        } else if (connectionHealth?._internal) {
          // Fallback to deprecated connectionHealth prop
          connectionHealth._internal.markDisconnected(subscriptionError);
        }
        
        // Handle automatic reconnection (Requirement 2.1)
        if (autoReconnect && isSubscribed) {
          handleReconnect();
        }
      }
    };

    /**
     * Handles reconnection with exponential backoff
     * Uses connectionHealth for backoff calculation if available
     */
    const handleReconnect = () => {
      if (!isSubscribed || !autoReconnect) return;
      
      isReconnectingRef.current = true;
      reconnectAttemptRef.current += 1;
      
      // Use connectionHealth's reconnection logic if available
      if (connectionHealth?._internal) {
        connectionHealth._internal.scheduleReconnect(reconnectAttemptRef.current);
      }
      
      // Calculate backoff delay
      const maxAttempts = 10;
      if (reconnectAttemptRef.current > maxAttempts) {
        console.error(`Maximum reconnection attempts (${maxAttempts}) reached`);
        if (connectionHealth?._internal) {
          connectionHealth._internal.handleReconnectFailure(
            new Error(`Maximum reconnection attempts (${maxAttempts}) reached`)
          );
        }
        return;
      }
      
      // Exponential backoff: min(1000 * 2^(N-1), 30000)
      const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current - 1), 30000);
      
      if (process.env.NODE_ENV === 'development') {
        console.debug(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptRef.current})`);
      }
      
      setTimeout(() => {
        if (isSubscribed) {
          subscribe();
        }
      }, delay);
    };

    subscribe();

    // Cleanup function
    return () => {
      isSubscribed = false;
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
          if (process.env.NODE_ENV === 'development') {
            console.debug('Realtime subscription cleaned up:', channels);
          }
        } catch (err) {
          // Ignore errors when cleaning up - WebSocket might already be closed
          console.debug('Realtime cleanup: WebSocket already closed');
        }
        unsubscribeRef.current = null;
      }
    };
  }, [channelsKey, stableCallback, stableOnError, stableOnConnected, stableOnDisconnected, enabled, connectionHealth, dataFreshness, autoReconnect, refreshOnReconnect]);
}

/**
 * Helper function to build channel strings for common use cases
 */
export const buildChannels = {
  /**
   * Subscribe to all rows in a table
   */
  collection: (databaseId: string, tableId: string) => {
    return [`databases.${databaseId}.tables.${tableId}.rows`];
  },
  
  /**
   * Subscribe to a specific row
   */
  document: (databaseId: string, tableId: string, rowId: string) => {
    return [`databases.${databaseId}.tables.${tableId}.rows.${rowId}`];
  },
  
  /**
   * Subscribe to multiple tables
   */
  collections: (databaseId: string, tableIds: string[]) => {
    return tableIds.map(
      tableId => `databases.${databaseId}.tables.${tableId}.rows`
    );
  },
  
  /**
   * Subscribe to multiple rows
   */
  documents: (databaseId: string, tableId: string, rowIds: string[]) => {
    return rowIds.map(
      rowId => `databases.${databaseId}.tables.${tableId}.rows.${rowId}`
    );
  },
};

/**
 * Helper function to check event types
 */
export const isEvent = {
  create: (events: string[]) => 
    events.some(e => e.includes('.create')),
  
  update: (events: string[]) => 
    events.some(e => e.includes('.update')),
  
  delete: (events: string[]) => 
    events.some(e => e.includes('.delete')),
  
  any: (events: string[], patterns: string[]) => 
    events.some(e => patterns.some(p => e.includes(p))),
};

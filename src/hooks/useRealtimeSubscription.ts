import { useEffect, useRef, useCallback } from 'react';
import { createBrowserClient } from '@/lib/appwrite';
import type { Models, RealtimeResponseEvent } from 'appwrite';

/**
 * Options for the realtime subscription hook
 */
export interface RealtimeSubscriptionOptions<T extends Models.Document> {
  /**
   * Channels to subscribe to
   * Example: [`databases.${dbId}.collections.${collectionId}.documents`]
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
}

/**
 * Custom hook for subscribing to Appwrite Realtime events
 * Automatically handles subscription cleanup on unmount
 * 
 * @example
 * ```tsx
 * useRealtimeSubscription({
 *   channels: [`databases.${dbId}.collections.${collectionId}.documents`],
 *   callback: (response) => {
 *     if (response.events.includes('databases.*.collections.*.documents.*.create')) {
 *       console.log('New document created:', response.payload);
 *     }
 *   },
 *   onError: (error) => console.error('Realtime error:', error),
 * });
 * ```
 */
export function useRealtimeSubscription<T extends Models.Document = Models.Document>(
  options: RealtimeSubscriptionOptions<T>
) {
  const { channels, callback, onError, enabled = true } = options;
  const unsubscribeRef = useRef<(() => void) | null>(null);
  
  // Memoize the callback to prevent unnecessary re-subscriptions
  const stableCallback = useCallback(callback, [callback]);
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
      } catch (error) {
        stableOnError(
          error instanceof Error 
            ? error 
            : new Error('Failed to subscribe to realtime')
        );
      }
    };

    subscribe();

    // Cleanup function
    return () => {
      isSubscribed = false;
      if (unsubscribeRef.current) {
        try {
          unsubscribeRef.current();
        } catch (err) {
          // Ignore errors when cleaning up - WebSocket might already be closed
          console.debug('Realtime cleanup: WebSocket already closed');
        }
        unsubscribeRef.current = null;
      }
    };
  }, [channelsKey, stableCallback, stableOnError, enabled]);
}

/**
 * Helper function to build channel strings for common use cases
 */
export const buildChannels = {
  /**
   * Subscribe to all documents in a collection
   */
  collection: (databaseId: string, collectionId: string) => {
    return [`databases.${databaseId}.collections.${collectionId}.documents`];
  },
  
  /**
   * Subscribe to a specific document
   */
  document: (databaseId: string, collectionId: string, documentId: string) => {
    return [`databases.${databaseId}.collections.${collectionId}.documents.${documentId}`];
  },
  
  /**
   * Subscribe to multiple collections
   */
  collections: (databaseId: string, collectionIds: string[]) => {
    return collectionIds.map(
      collectionId => `databases.${databaseId}.collections.${collectionId}.documents`
    );
  },
  
  /**
   * Subscribe to multiple documents
   */
  documents: (databaseId: string, collectionId: string, documentIds: string[]) => {
    return documentIds.map(
      documentId => `databases.${databaseId}.collections.${collectionId}.documents.${documentId}`
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

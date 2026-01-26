/**
 * Bulk Operation Broadcast Service
 * 
 * Provides cross-tab/cross-session communication for bulk operations.
 * When a bulk operation (like credential generation) completes, this service
 * broadcasts an event so other clients can refresh their data.
 * 
 * Uses BroadcastChannel API for modern browsers with fallback to localStorage events.
 * 
 * @module bulkOperationBroadcast
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Types of bulk operations that can be broadcast
 */
export type BulkOperationType = 
  | 'credential_generation'
  | 'bulk_edit'
  | 'bulk_delete'
  | 'bulk_import'
  | 'bulk_clear_credentials';

/**
 * Status of a bulk operation
 */
export type BulkOperationStatus = 'started' | 'progress' | 'completed' | 'failed';

/**
 * Message structure for bulk operation broadcasts
 */
export interface BulkOperationMessage {
  /** Type of message */
  type: 'bulk-operation';
  /** Type of bulk operation */
  operationType: BulkOperationType;
  /** Current status of the operation */
  status: BulkOperationStatus;
  /** Unique identifier for this operation */
  operationId: string;
  /** ID of the session/tab that initiated the operation */
  sourceId: string;
  /** ISO timestamp of the message */
  timestamp: string;
  /** Operation details */
  details: {
    /** Total number of items being processed */
    totalCount?: number;
    /** Number of items successfully processed */
    successCount?: number;
    /** Number of items that failed */
    failureCount?: number;
    /** Number of conflicts encountered */
    conflictCount?: number;
    /** IDs of affected attendees (for targeted refresh) */
    affectedIds?: string[];
    /** Progress percentage (0-100) */
    progress?: number;
    /** Error message if failed */
    errorMessage?: string;
  };
}

/**
 * Callback for bulk operation events
 */
export type BulkOperationCallback = (message: BulkOperationMessage) => void;

/**
 * Configuration for the broadcast service
 */
export interface BulkOperationBroadcastConfig {
  /** Name of the broadcast channel */
  channelName: string;
  /** Whether to include affected IDs in broadcasts (may be large) */
  includeAffectedIds: boolean;
  /** Maximum number of affected IDs to include */
  maxAffectedIds: number;
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: BulkOperationBroadcastConfig = {
  channelName: 'bulk-operations',
  includeAffectedIds: true,
  maxAffectedIds: 100,
};

// ============================================================================
// Broadcast Service Implementation
// ============================================================================

/**
 * Bulk Operation Broadcast Service
 * 
 * Manages cross-tab communication for bulk operations.
 */
class BulkOperationBroadcastService {
  private channel: BroadcastChannel | null = null;
  private useBroadcastChannel: boolean;
  private sourceId: string;
  private callbacks: BulkOperationCallback[] = [];
  private config: BulkOperationBroadcastConfig;
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private isInitialized: boolean = false;

  constructor(config?: Partial<BulkOperationBroadcastConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Generate unique source ID for this session
    this.sourceId = `session-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    // Check if BroadcastChannel is supported (browser environment)
    this.useBroadcastChannel = typeof BroadcastChannel !== 'undefined';
  }

  /**
   * Initialize the broadcast service
   * Call this when the app starts or when you need to start listening
   */
  initialize(): void {
    if (this.isInitialized) return;

    if (this.useBroadcastChannel) {
      this.initBroadcastChannel();
    } else if (typeof window !== 'undefined') {
      this.initLocalStorageFallback();
    }

    this.isInitialized = true;
  }

  private initBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel(this.config.channelName);
      
      this.channel.onmessage = (event: MessageEvent<BulkOperationMessage>) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      console.warn('[BulkOperationBroadcast] Failed to create BroadcastChannel, falling back to localStorage:', error);
      this.useBroadcastChannel = false;
      this.initLocalStorageFallback();
    }
  }

  private initLocalStorageFallback(): void {
    this.storageListener = (event: StorageEvent) => {
      // Only handle keys that start with the channel prefix
      if (event.key && event.key.startsWith(`${this.config.channelName}:`) && event.newValue) {
        try {
          const message: BulkOperationMessage = JSON.parse(event.newValue);
          // Don't process our own messages
          if (message.sourceId !== this.sourceId) {
            this.handleMessage(message);
          }
        } catch (error) {
          console.error('[BulkOperationBroadcast] Failed to parse localStorage message:', error);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageListener);
    }
  }

  /**
   * Generate a unique key for a localStorage message
   * Uses timestamp + random suffix to ensure uniqueness
   */
  private generateMessageKey(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${this.config.channelName}:${timestamp}-${random}`;
  }

  private handleMessage(message: BulkOperationMessage): void {
    // Validate message structure
    if (message.type !== 'bulk-operation') return;

    // Notify all registered callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('[BulkOperationBroadcast] Callback error:', error);
      }
    });
  }

  private postMessage(message: BulkOperationMessage): void {
    if (!this.isInitialized) {
      this.initialize();
    }

    if (this.useBroadcastChannel && this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.error('[BulkOperationBroadcast] Failed to post message via BroadcastChannel:', error);
      }
    } else if (typeof window !== 'undefined') {
      // Use localStorage for fallback with unique keys per message
      try {
        const messageKey = this.generateMessageKey();
        localStorage.setItem(messageKey, JSON.stringify(message));
        
        // Schedule removal of this specific message key
        setTimeout(() => {
          try {
            localStorage.removeItem(messageKey);
          } catch (e) {
            // Ignore cleanup errors
          }
        }, 50);
      } catch (error) {
        console.error('[BulkOperationBroadcast] Failed to post message via localStorage:', error);
      }
    }
  }

  /**
   * Broadcast that a bulk operation has started
   */
  broadcastStart(
    operationType: BulkOperationType,
    operationId: string,
    totalCount: number
  ): void {
    const message: BulkOperationMessage = {
      type: 'bulk-operation',
      operationType,
      status: 'started',
      operationId,
      sourceId: this.sourceId,
      timestamp: new Date().toISOString(),
      details: {
        totalCount,
        progress: 0,
      },
    };

    this.postMessage(message);
  }

  /**
   * Broadcast progress update for a bulk operation
   */
  broadcastProgress(
    operationType: BulkOperationType,
    operationId: string,
    successCount: number,
    totalCount: number
  ): void {
    const progress = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0;

    const message: BulkOperationMessage = {
      type: 'bulk-operation',
      operationType,
      status: 'progress',
      operationId,
      sourceId: this.sourceId,
      timestamp: new Date().toISOString(),
      details: {
        totalCount,
        successCount,
        progress,
      },
    };

    this.postMessage(message);
  }

  /**
   * Broadcast that a bulk operation has completed
   */
  broadcastComplete(
    operationType: BulkOperationType,
    operationId: string,
    details: {
      totalCount: number;
      successCount: number;
      failureCount: number;
      conflictCount?: number;
      affectedIds?: string[];
    }
  ): void {
    // Limit affected IDs if configured
    let affectedIds = details.affectedIds;
    if (affectedIds && this.config.includeAffectedIds) {
      if (affectedIds.length > this.config.maxAffectedIds) {
        affectedIds = affectedIds.slice(0, this.config.maxAffectedIds);
      }
    } else if (!this.config.includeAffectedIds) {
      affectedIds = undefined;
    }

    const message: BulkOperationMessage = {
      type: 'bulk-operation',
      operationType,
      status: 'completed',
      operationId,
      sourceId: this.sourceId,
      timestamp: new Date().toISOString(),
      details: {
        totalCount: details.totalCount,
        successCount: details.successCount,
        failureCount: details.failureCount,
        conflictCount: details.conflictCount,
        affectedIds,
        progress: 100,
      },
    };

    this.postMessage(message);
  }

  /**
   * Broadcast that a bulk operation has failed
   */
  broadcastFailure(
    operationType: BulkOperationType,
    operationId: string,
    errorMessage: string,
    partialDetails?: {
      totalCount?: number;
      successCount?: number;
      failureCount?: number;
    }
  ): void {
    const message: BulkOperationMessage = {
      type: 'bulk-operation',
      operationType,
      status: 'failed',
      operationId,
      sourceId: this.sourceId,
      timestamp: new Date().toISOString(),
      details: {
        ...partialDetails,
        errorMessage,
      },
    };

    this.postMessage(message);
  }

  /**
   * Register a callback to receive bulk operation events
   * Returns an unsubscribe function
   */
  subscribe(callback: BulkOperationCallback): () => void {
    if (!this.isInitialized) {
      this.initialize();
    }

    this.callbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Check if this message is from the current session
   */
  isOwnMessage(message: BulkOperationMessage): boolean {
    return message.sourceId === this.sourceId;
  }

  /**
   * Get the current source ID
   */
  getSourceId(): string {
    return this.sourceId;
  }

  /**
   * Update the service configuration
   * Applies new config settings to the existing instance
   */
  updateConfig(newConfig: Partial<BulkOperationBroadcastConfig>): void {
    const oldChannelName = this.config.channelName;
    this.config = { ...this.config, ...newConfig };

    // If channel name changed, reinitialize the broadcast channel
    if (oldChannelName !== this.config.channelName && this.isInitialized) {
      // Clean up old channel
      if (this.channel) {
        this.channel.close();
        this.channel = null;
      }
      if (this.storageListener && typeof window !== 'undefined') {
        window.removeEventListener('storage', this.storageListener);
        this.storageListener = null;
      }

      // Reinitialize with new channel name
      this.isInitialized = false;
      this.initialize();
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }

    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }

    this.callbacks = [];
    this.isInitialized = false;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let instance: BulkOperationBroadcastService | null = null;

/**
 * Deep equality check for config objects
 */
function configsEqual(
  config1: Partial<BulkOperationBroadcastConfig>,
  config2: Partial<BulkOperationBroadcastConfig>
): boolean {
  return (
    config1.channelName === config2.channelName &&
    config1.includeAffectedIds === config2.includeAffectedIds &&
    config1.maxAffectedIds === config2.maxAffectedIds
  );
}

/**
 * Get the singleton instance of the bulk operation broadcast service
 * 
 * If a new config is provided that differs from the existing instance's config,
 * the instance will be recreated with the new configuration.
 */
export function getBulkOperationBroadcast(
  config?: Partial<BulkOperationBroadcastConfig>
): BulkOperationBroadcastService {
  if (!instance) {
    instance = new BulkOperationBroadcastService(config);
    return instance;
  }

  // If config is provided and differs from current instance config, recreate
  if (config && !configsEqual(config, instance['config'])) {
    instance.cleanup();
    instance = new BulkOperationBroadcastService(config);
  }

  return instance;
}

/**
 * Create a new instance (useful for testing)
 */
export function createBulkOperationBroadcast(
  config?: Partial<BulkOperationBroadcastConfig>
): BulkOperationBroadcastService {
  return new BulkOperationBroadcastService(config);
}

/**
 * Reset the singleton instance (useful for testing or reconfiguration)
 * Cleans up the existing instance and allows a new one to be created
 */
export function resetBulkOperationBroadcast(): void {
  if (instance) {
    instance.cleanup();
    instance = null;
  }
}

/**
 * Generate a unique operation ID
 */
export function generateOperationId(): string {
  return `op-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// Export the class for testing
export { BulkOperationBroadcastService };

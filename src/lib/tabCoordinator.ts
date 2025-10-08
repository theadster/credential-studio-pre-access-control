/**
 * TabCoordinator - Manages token refresh coordination across multiple browser tabs
 * 
 * Uses BroadcastChannel API for modern browsers with fallback to localStorage events
 * for older browsers. Implements leader election to ensure only one tab refreshes
 * tokens at a time, preventing redundant API calls.
 */

type MessageType = 'refresh-request' | 'refresh-denied' | 'refresh-complete' | 'heartbeat';

interface TabMessage {
  type: MessageType;
  tabId: string;
  timestamp: number;
  success?: boolean;
}

interface TabCoordinatorConfig {
  channelName: string;
  requestTimeout: number; // milliseconds to wait for response
  heartbeatInterval: number; // milliseconds between heartbeats
}

export interface TabCoordinator {
  /**
   * Request permission to refresh token
   * Returns true if this tab should proceed with refresh
   */
  requestRefresh(): Promise<boolean>;
  
  /**
   * Notify other tabs that refresh completed
   */
  notifyRefreshComplete(success: boolean): void;
  
  /**
   * Listen for refresh events from other tabs
   */
  onRefreshComplete(callback: (success: boolean) => void): void;
  
  /**
   * Cleanup resources
   */
  cleanup(): void;
}

class TabCoordinatorImpl implements TabCoordinator {
  private channel: BroadcastChannel | null = null;
  private useBroadcastChannel: boolean;
  private tabId: string;
  private isRefreshLeader: boolean = false;
  private callbacks: Array<(success: boolean) => void> = [];
  private config: TabCoordinatorConfig;
  private storageListener: ((event: StorageEvent) => void) | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  
  constructor(config?: Partial<TabCoordinatorConfig>) {
    this.config = {
      channelName: 'token-refresh',
      requestTimeout: 100,
      heartbeatInterval: 30000, // 30 seconds
      ...config
    };
    
    // Generate unique tab ID
    this.tabId = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if BroadcastChannel is supported
    this.useBroadcastChannel = typeof BroadcastChannel !== 'undefined';
    
    if (this.useBroadcastChannel) {
      this.initBroadcastChannel();
    } else {
      this.initLocalStorageFallback();
    }
    
    // Start heartbeat to maintain presence
    this.startHeartbeat();
  }
  
  private initBroadcastChannel(): void {
    try {
      this.channel = new BroadcastChannel(this.config.channelName);
      
      this.channel.onmessage = (event: MessageEvent<TabMessage>) => {
        this.handleMessage(event.data);
      };
    } catch (error) {
      console.warn('Failed to create BroadcastChannel, falling back to localStorage:', error);
      this.useBroadcastChannel = false;
      this.initLocalStorageFallback();
    }
  }
  
  private initLocalStorageFallback(): void {
    // Use localStorage events for cross-tab communication
    this.storageListener = (event: StorageEvent) => {
      if (event.key === this.config.channelName && event.newValue) {
        try {
          const message: TabMessage = JSON.parse(event.newValue);
          // Don't process our own messages
          if (message.tabId !== this.tabId) {
            this.handleMessage(message);
          }
        } catch (error) {
          console.error('Failed to parse localStorage message:', error);
        }
      }
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.storageListener);
    }
  }
  
  private handleMessage(message: TabMessage): void {
    switch (message.type) {
      case 'refresh-request':
        // Another tab is requesting to refresh
        if (this.isRefreshLeader) {
          // We're already refreshing, deny the request
          this.postMessage({
            type: 'refresh-denied',
            tabId: this.tabId,
            timestamp: Date.now()
          });
        }
        break;
        
      case 'refresh-denied':
        // Another tab denied our request (they're already refreshing)
        // This is handled in requestRefresh() promise
        break;
        
      case 'refresh-complete':
        // Another tab completed the refresh
        this.callbacks.forEach(cb => cb(message.success ?? false));
        break;
        
      case 'heartbeat':
        // Another tab is alive (used for leader election)
        break;
    }
  }
  
  private postMessage(message: TabMessage): void {
    if (this.useBroadcastChannel && this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (error) {
        console.error('Failed to post message via BroadcastChannel:', error);
      }
    } else {
      // Use localStorage for fallback
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(this.config.channelName, JSON.stringify(message));
          // Clear immediately to allow multiple messages
          setTimeout(() => {
            try {
              localStorage.removeItem(this.config.channelName);
            } catch (e) {
              // Ignore cleanup errors
            }
          }, 50);
        }
      } catch (error) {
        console.error('Failed to post message via localStorage:', error);
      }
    }
  }
  
  private startHeartbeat(): void {
    // Send periodic heartbeat to indicate this tab is alive
    this.heartbeatTimer = setInterval(() => {
      this.postMessage({
        type: 'heartbeat',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    }, this.config.heartbeatInterval);
  }
  
  async requestRefresh(): Promise<boolean> {
    return new Promise((resolve) => {
      let denied = false;
      
      const timeout = setTimeout(() => {
        // No response within timeout, assume we can proceed
        if (!denied) {
          this.isRefreshLeader = true;
          resolve(true);
        }
      }, this.config.requestTimeout);
      
      const handler = (event: MessageEvent<TabMessage> | StorageEvent) => {
        let message: TabMessage | null = null;
        
        if ('data' in event) {
          // BroadcastChannel message
          message = event.data;
        } else if ('key' in event && event.key === this.config.channelName && event.newValue) {
          // localStorage event
          try {
            message = JSON.parse(event.newValue);
          } catch (e) {
            // Ignore parse errors
          }
        }
        
        if (message && message.type === 'refresh-denied' && message.tabId !== this.tabId) {
          denied = true;
          clearTimeout(timeout);
          
          if (this.useBroadcastChannel && this.channel) {
            this.channel.removeEventListener('message', handler as any);
          } else if (typeof window !== 'undefined') {
            window.removeEventListener('storage', handler as any);
          }
          
          resolve(false);
        }
      };
      
      // Listen for denial messages
      if (this.useBroadcastChannel && this.channel) {
        this.channel.addEventListener('message', handler as any);
      } else if (typeof window !== 'undefined') {
        window.addEventListener('storage', handler as any);
      }
      
      // Broadcast refresh request
      this.postMessage({
        type: 'refresh-request',
        tabId: this.tabId,
        timestamp: Date.now()
      });
    });
  }
  
  notifyRefreshComplete(success: boolean): void {
    this.postMessage({
      type: 'refresh-complete',
      tabId: this.tabId,
      timestamp: Date.now(),
      success
    });
    
    // Reset leader flag
    this.isRefreshLeader = false;
  }
  
  onRefreshComplete(callback: (success: boolean) => void): void {
    this.callbacks.push(callback);
  }
  
  cleanup(): void {
    // Stop heartbeat
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Close BroadcastChannel
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    
    // Remove localStorage listener
    if (this.storageListener && typeof window !== 'undefined') {
      window.removeEventListener('storage', this.storageListener);
      this.storageListener = null;
    }
    
    // Clear callbacks
    this.callbacks = [];
    
    // Reset leader flag
    this.isRefreshLeader = false;
  }
}

/**
 * Create a new TabCoordinator instance
 */
export function createTabCoordinator(config?: Partial<TabCoordinatorConfig>): TabCoordinator {
  return new TabCoordinatorImpl(config);
}

// Export for testing
export { TabCoordinatorImpl };

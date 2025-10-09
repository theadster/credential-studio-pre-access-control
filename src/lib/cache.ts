/**
 * Simple in-memory cache implementation for event settings
 * Provides get/set/invalidate methods with TTL support, size limits, and LRU eviction
 */

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  lastAccessed: number; // For LRU eviction
}

export class EventSettingsCache {
  private cache: Map<string, CacheEntry> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ENTRIES = 1000; // Maximum cache entries
  private readonly CLEANUP_INTERVAL = 60 * 1000; // Run cleanup every minute
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor() {
    // Start periodic cleanup
    this.startCleanup();
  }

  /**
   * Get cached data by key
   * Returns null if key doesn't exist or TTL has expired
   * Updates lastAccessed timestamp for LRU tracking
   */
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update last accessed time for LRU tracking
    entry.lastAccessed = now;

    // Return data with timestamp attached for cache age calculation
    return { ...entry.data, timestamp: entry.timestamp };
  }

  /**
   * Set cache entry with optional TTL
   * Enforces size limits by running cleanup and LRU eviction if needed
   * @param key - Cache key
   * @param data - Data to cache
   * @param ttl - Time to live in milliseconds (defaults to 5 minutes)
   */
  set(key: string, data: any, ttl: number = this.DEFAULT_TTL): void {
    const now = Date.now();

    // If adding a new entry would exceed max size, enforce limits
    if (!this.cache.has(key) && this.cache.size >= this.MAX_ENTRIES) {
      // First try cleanup to remove expired entries
      this.cleanup();

      // If still at capacity, evict least recently used entry
      if (this.cache.size >= this.MAX_ENTRIES) {
        this.evictLRU();
      }
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      ttl,
      lastAccessed: now
    });
  }

  /**
   * Invalidate (remove) a cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Remove expired entries from cache
   * Called periodically and before eviction
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Evict the least recently used entry
   * Used when cache reaches MAX_ENTRIES
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestAccess) {
        oldestAccess = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Start periodic cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) return;

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);

    // Prevent timer from keeping process alive in Node.js
    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Stop periodic cleanup timer
   * Call this during shutdown to prevent memory leaks
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Get cache statistics for monitoring
   * Includes memory usage metrics
   */
  getStats(): {
    size: number;
    maxSize: number;
    keys: string[];
    utilizationPercent: number;
    expiredCount: number;
  } {
    const now = Date.now();
    let expiredCount = 0;

    for (const entry of this.cache.values()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.MAX_ENTRIES,
      keys: Array.from(this.cache.keys()),
      utilizationPercent: Math.round((this.cache.size / this.MAX_ENTRIES) * 100),
      expiredCount
    };
  }

  /**
   * Get current cache size
   * Useful for quick memory monitoring
   */
  get size(): number {
    return this.cache.size;
  }
}

// Singleton instance
export const eventSettingsCache = new EventSettingsCache();

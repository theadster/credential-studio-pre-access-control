/**
 * In-memory cache for role user counts with TTL support.
 * This prevents expensive DB queries on every role request.
 */

interface CacheEntry {
  count: number;
  timestamp: number;
}

class RoleUserCountCache {
  private cache: Map<string, CacheEntry>;
  private ttl: number; // Time to live in milliseconds

  constructor(ttlSeconds: number = 300) {
    // Default TTL: 5 minutes
    this.cache = new Map();
    this.ttl = ttlSeconds * 1000;
  }

  /**
   * Get cached user count for a role
   * @param roleId - The role ID
   * @returns The cached count or null if not found or expired
   */
  get(roleId: string): number | null {
    const entry = this.cache.get(roleId);

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(roleId);
      return null;
    }

    return entry.count;
  }

  /**
   * Set user count for a role in cache
   * @param roleId - The role ID
   * @param count - The user count
   */
  set(roleId: string, count: number): void {
    this.cache.set(roleId, {
      count,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate cache entry for a specific role
   * @param roleId - The role ID to invalidate
   */
  invalidate(roleId: string): void {
    this.cache.delete(roleId);
  }

  /**
   * Invalidate all cache entries
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries (optional maintenance)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [roleId, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(roleId);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; entries: Array<{ roleId: string; count: number; age: number }> } {
    const now = Date.now();
    const entries = Array.from(this.cache.entries()).map(([roleId, entry]) => ({
      roleId,
      count: entry.count,
      age: Math.floor((now - entry.timestamp) / 1000) // age in seconds
    }));

    return {
      size: this.cache.size,
      entries
    };
  }
}

// Export singleton instance
export const roleUserCountCache = new RoleUserCountCache(300); // 5 minutes TTL

// Export function to invalidate cache when user-role membership changes
export function invalidateRoleUserCount(roleId: string | string[]): void {
  if (Array.isArray(roleId)) {
    roleId.forEach(id => roleUserCountCache.invalidate(id));
  } else {
    roleUserCountCache.invalidate(roleId);
  }
}

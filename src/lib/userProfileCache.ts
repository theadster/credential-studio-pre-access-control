/**
 * User Profile Cache
 * 
 * Caches user profile and role data to reduce database queries on every API request.
 * This significantly improves API response times by avoiding repeated lookups.
 * 
 * IMPORTANT: This is an in-process, single-instance cache that exists only in the current
 * Node.js process. It does NOT synchronize across multiple Next.js instances or serverless
 * containers. Each instance maintains its own independent cache.
 * 
 * Cache Strategy:
 * - User profiles are cached for 2 minutes (short TTL for security)
 * - Cache is keyed by Appwrite user ID
 * - LRU eviction when cache reaches 100 entries
 * - Cache is invalidated when user profile or role is updated
 * 
 * Multi-Instance Considerations:
 * - Invalidation calls (invalidate, invalidateByRole) only affect the current instance
 * - Other instances will continue serving stale data until TTL expires (2 minutes)
 * - This can cause temporary inconsistency in multi-instance deployments
 * 
 * For Production Multi-Instance Deployments:
 * - Consider using a centralized cache (Redis, Memcached) instead
 * - Implement cache invalidation events (e.g., via message queue or webhook)
 * - Use shorter TTL values to reduce staleness window
 * - Monitor cache hit rates to ensure effectiveness
 * 
 * Current Deployment Model:
 * - Suitable for single-instance deployments (development, small production)
 * - Acceptable for serverless with low concurrency and infrequent role changes
 * - May cause issues with frequent role updates in high-concurrency scenarios
 */

export interface CachedUserProfile {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleId: string | null;
  isInvited: boolean;
  createdAt: string;
  updatedAt: string;
  role: {
    id: string;
    name: string;
    description: string;
    permissions: Record<string, any>;
  } | null;
}

interface CacheEntry {
  profile: CachedUserProfile;
  timestamp: number;
}

// Cache TTL: 2 minutes (short for security, but enough to reduce repeated queries)
const CACHE_TTL = 2 * 60 * 1000;

// Maximum cache entries to prevent memory issues
const MAX_ENTRIES = 100;

class UserProfileCache {
  private cache: Map<string, CacheEntry> = new Map();

  /**
   * Get cached user profile by Appwrite user ID
   * Returns null if not cached or expired
   * 
   * LRU Behavior: On access, the entry is moved to the end of the Map
   * (most recently used position) so it won't be evicted first.
   * This is achieved by deleting and re-inserting the entry, which updates
   * its position in the Map's insertion order.
   */
  get(userId: string): CachedUserProfile | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
      this.cache.delete(userId);
      return null;
    }

    // Move to end of Map (most recently used) for LRU eviction
    // Delete and re-insert to update position in insertion order
    this.cache.delete(userId);
    this.cache.set(userId, entry);

    return entry.profile;
  }

  /**
   * Cache a user profile
   * 
   * LRU Behavior: When adding a new entry and cache is at capacity,
   * the least recently used entry (first in Map) is evicted
   */
  set(userId: string, profile: CachedUserProfile): void {
    // If this is a new entry and cache is at capacity, evict LRU entry
    if (!this.cache.has(userId) && this.cache.size >= MAX_ENTRIES) {
      // Get the first (least recently used) key
      const lruKey = this.cache.keys().next().value;
      if (lruKey) {
        this.cache.delete(lruKey);
      }
    }

    // Delete existing entry if present (to move it to end as most recently used)
    if (this.cache.has(userId)) {
      this.cache.delete(userId);
    }

    const now = Date.now();
    this.cache.set(userId, {
      profile,
      timestamp: now,
    });
  }

  /**
   * Invalidate cache for a specific user
   * Call this when user profile or role is updated
   */
  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  /**
   * Invalidate all cached profiles for users with a specific role
   * Call this when a role's permissions are updated
   */
  invalidateByRole(roleId: string): void {
    for (const [userId, entry] of this.cache.entries()) {
      if (entry.profile.roleId === roleId) {
        this.cache.delete(userId);
      }
    }
  }

  /**
   * Clear all cached profiles
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: MAX_ENTRIES,
    };
  }
}

// Singleton instance
export const userProfileCache = new UserProfileCache();

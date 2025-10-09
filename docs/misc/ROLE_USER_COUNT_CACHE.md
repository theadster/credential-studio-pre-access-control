# Role User Count Caching Implementation

## Overview

Implemented an in-memory cache with TTL (Time To Live) for role user counts to avoid expensive database queries on every role request. This significantly improves performance for role-related API endpoints.

## Problem

Previously, every request to role endpoints (GET, PUT, DELETE) would execute a database query to count users assigned to that role:

```typescript
const usersWithRole = await databases.listDocuments(
  dbId,
  usersCollectionId,
  [Query.equal('roleId', role.$id), Query.limit(1)]
);
```

For large roles or high-traffic applications, this creates unnecessary database load and increases response times.

## Solution

### 1. Cache Implementation (`src/lib/roleUserCountCache.ts`)

Created a singleton in-memory cache with the following features:

- **TTL Support**: Entries expire after 5 minutes (configurable)
- **Automatic Expiration**: Expired entries are automatically ignored on read
- **Manual Invalidation**: Cache can be invalidated for specific roles or all roles
- **Statistics**: Provides cache statistics for monitoring

**Key Methods:**
- `get(roleId)`: Retrieve cached count (returns null if expired/missing)
- `set(roleId, count)`: Store count in cache
- `invalidate(roleId)`: Remove specific role from cache
- `invalidateAll()`: Clear entire cache
- `cleanup()`: Remove expired entries (optional maintenance)

### 2. Helper Function (`src/lib/getRoleUserCount.ts`)

Created a helper function that:
1. Checks cache first
2. Falls back to database query on cache miss
3. Stores result in cache for future requests

```typescript
export async function getRoleUserCount(databases: any, roleId: string): Promise<number>
```

### 3. Cache Invalidation Strategy

Cache is automatically invalidated when user-role membership changes:

#### User Creation
- **Location**: `src/pages/api/users/index.ts` (POST)
- **Location**: `src/pages/api/users/link.ts` (POST)
- **Action**: Invalidate cache for the assigned role

#### User Update
- **Location**: `src/pages/api/users/index.ts` (PUT)
- **Action**: Invalidate cache for both old and new roles when role changes

#### Role Update
- **Location**: `src/pages/api/roles/[id].ts` (PUT)
- **Action**: Invalidate cache for the updated role

#### Role Deletion
- **Location**: `src/pages/api/roles/[id].ts` (DELETE)
- **Action**: Invalidate cache for the deleted role

## Updated Endpoints

### `src/pages/api/roles/[id].ts`

**GET**: Uses cached count
```typescript
const userCount = await getRoleUserCount(databases, role.$id);
```

**PUT**: Invalidates cache then refreshes
```typescript
invalidateRoleUserCount(updatedRole.$id);
const updatedUserCount = await getRoleUserCount(databases, updatedRole.$id);
```

**DELETE**: Uses cached count for validation, invalidates after deletion
```typescript
const userCountToDelete = await getRoleUserCount(databases, roleToDelete.$id);
// ... validation ...
await databases.deleteDocument(...);
invalidateRoleUserCount(roleToDelete.$id);
```

### `src/pages/api/users/index.ts`

**POST**: Invalidates cache for assigned role
```typescript
if (roleId) {
  invalidateRoleUserCount(roleId);
}
```

**PUT**: Invalidates cache for both old and new roles
```typescript
if (updateRoleId !== undefined && currentUserDoc.roleId !== updateRoleId) {
  const rolesToInvalidate = [currentUserDoc.roleId, updateRoleId].filter(Boolean);
  if (rolesToInvalidate.length > 0) {
    invalidateRoleUserCount(rolesToInvalidate);
  }
}
```

### `src/pages/api/users/link.ts`

**POST**: Invalidates cache for assigned role
```typescript
if (roleId) {
  invalidateRoleUserCount(roleId);
}
```

## Performance Benefits

### Before
- Every role request = 1 database query
- 100 requests/minute = 100 database queries/minute

### After
- First request = 1 database query (cache miss)
- Next 5 minutes of requests = 0 database queries (cache hit)
- 100 requests/minute = ~1 database query every 5 minutes

**Estimated reduction**: ~99% fewer database queries for role user counts

## Configuration

Default TTL is 5 minutes (300 seconds). To change:

```typescript
// In src/lib/roleUserCountCache.ts
export const roleUserCountCache = new RoleUserCountCache(600); // 10 minutes
```

## Monitoring

Get cache statistics:

```typescript
import { roleUserCountCache } from '@/lib/roleUserCountCache';

const stats = roleUserCountCache.getStats();
console.log('Cache size:', stats.size);
console.log('Entries:', stats.entries);
```

## Future Enhancements

### Option 1: Redis Cache
For multi-instance deployments, replace in-memory cache with Redis:
- Shared across all server instances
- Persistent across restarts
- Pub/sub for cache invalidation

### Option 2: Background Refresh
Instead of TTL expiration, use background jobs to refresh counts:
- Return stale data immediately (no wait)
- Update cache asynchronously
- Even faster response times

### Option 3: Appwrite Realtime
Use Appwrite Realtime subscriptions to invalidate cache on user document changes:
- Real-time cache invalidation
- No manual invalidation needed
- Always accurate counts

## Testing

To test cache behavior:

1. **Cache Hit**: Make multiple GET requests to same role within 5 minutes
2. **Cache Miss**: Wait 5+ minutes and make another request
3. **Invalidation**: Update a user's role and verify cache is invalidated
4. **Statistics**: Check cache stats to verify entries and ages

## Notes

- Cache is in-memory, so it's cleared on server restart
- Each server instance has its own cache (not shared)
- For serverless deployments, cache may not persist between invocations
- Consider Redis or external cache for production multi-instance setups

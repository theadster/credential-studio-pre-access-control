import { Query } from 'appwrite';
import { Databases } from 'node-appwrite';
import { roleUserCountCache } from './roleUserCountCache';
import { logger } from './logger';

/**
 * Get user count for a role with caching support
 * 
 * @param databases - Appwrite databases instance (server-side)
 * @param roleId - The role ID
 * @returns The user count, or 0 if the query fails
 * 
 * @remarks
 * Returns 0 on error to provide a safe fallback. Errors are logged but not propagated.
 * Cache is not updated on failure to avoid storing invalid data.
 */
export async function getRoleUserCount(
  databases: Databases,
  roleId: string
): Promise<number> {
  // Try to get from cache first
  const cachedCount = roleUserCountCache.get(roleId);
  if (cachedCount !== null) {
    return cachedCount;
  }

  // Cache miss - query the database
  const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;

  try {
    const usersWithRole = await databases.listDocuments(
      dbId,
      usersCollectionId,
      [Query.equal('roleId', roleId), Query.limit(1)]
    );

    const count = usersWithRole.total;

    // Store in cache only on successful query
    roleUserCountCache.set(roleId, count);

    return count;
  } catch (error: unknown) {
    // Log error with context for debugging
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorCode = (error as any)?.code;

    logger.error('Failed to get role user count', {
      roleId,
      error: errorMessage,
      code: errorCode,
      dbId,
      usersCollectionId
    });

    // Return safe fallback without caching the error state
    // This prevents displaying incorrect counts in the UI
    return 0;
  }
}

/**
 * Application-wide constants
 */

/**
 * Sentinel value used to indicate that a field should be cleared in bulk edit operations.
 * This special value is used to distinguish between "no change" (undefined) and "clear the field" (CLEAR_SENTINEL).
 * 
 * Using a unique sentinel prevents collisions with real user data and keeps frontend/backend in sync.
 */
export const CLEAR_SENTINEL = '__CLEAR__';

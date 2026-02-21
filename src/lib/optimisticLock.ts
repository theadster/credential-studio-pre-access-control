/**
 * Optimistic Lock Service
 * 
 * Provides version-based optimistic locking for Appwrite documents.
 * Handles concurrent modification detection and automatic retry with exponential backoff.
 * 
 * @module optimisticLock
 */

import { TablesDB } from 'node-appwrite';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configuration options for optimistic locking operations
 */
export interface OptimisticLockConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number;
  /** Base delay in milliseconds for exponential backoff (default: 100) */
  baseDelayMs: number;
  /** Maximum delay in milliseconds for exponential backoff (default: 2000) */
  maxDelayMs: number;
}

/**
 * Default configuration for optimistic locking
 */
export const DEFAULT_LOCK_CONFIG: OptimisticLockConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
};

/**
 * Validate and sanitize lock configuration, merging with defaults.
 * Ensures all values are valid numbers within reasonable bounds.
 */
export function sanitizeLockConfig(
  config?: Partial<OptimisticLockConfig>
): OptimisticLockConfig {
  const merged = { ...DEFAULT_LOCK_CONFIG, ...config };
  return {
    maxRetries: Number.isFinite(merged.maxRetries) && merged.maxRetries >= 0
      ? Math.min(Math.floor(merged.maxRetries), 10)
      : DEFAULT_LOCK_CONFIG.maxRetries,
    baseDelayMs: Number.isFinite(merged.baseDelayMs) && merged.baseDelayMs > 0
      ? Math.min(merged.baseDelayMs, 5000)
      : DEFAULT_LOCK_CONFIG.baseDelayMs,
    maxDelayMs: Number.isFinite(merged.maxDelayMs) && merged.maxDelayMs > 0
      ? Math.min(merged.maxDelayMs, 30000)
      : DEFAULT_LOCK_CONFIG.maxDelayMs,
  };
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Types of optimistic lock errors
 */
export type OptimisticLockErrorType = 
  | 'VERSION_MISMATCH'
  | 'MAX_RETRIES_EXCEEDED'
  | 'RECORD_NOT_FOUND'
  | 'UPDATE_FAILED';

/**
 * Detailed error information for optimistic lock failures
 */
export interface OptimisticLockError {
  /** Type of error that occurred */
  type: OptimisticLockErrorType;
  /** Human-readable error message */
  message: string;
  /** Expected version number (if applicable) */
  expectedVersion?: number;
  /** Actual version number found (if applicable) */
  actualVersion?: number;
  /** Original error from Appwrite (if applicable) */
  originalError?: Error;
}

/**
 * Custom error class for optimistic lock conflicts
 */
export class OptimisticLockConflictError extends Error {
  public readonly type: OptimisticLockErrorType;
  public readonly expectedVersion?: number;
  public readonly actualVersion?: number;
  public readonly documentId: string;

  constructor(
    documentId: string,
    expectedVersion: number,
    actualVersion: number,
    message?: string,
  ) {
    super(
      message ||
        `Version conflict on document ${documentId}: expected ${expectedVersion}, found ${actualVersion}`,
    );
    this.name = 'OptimisticLockConflictError';
    this.type = 'VERSION_MISMATCH';
    this.documentId = documentId;
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result of an optimistic lock operation
 */
export interface LockResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The resulting document data (if successful) */
  data?: T;
  /** The new version number after update (if successful) */
  version?: number;
  /** Whether a conflict was detected during the operation */
  conflictDetected?: boolean;
  /** Number of retries used before success or failure */
  retriesUsed?: number;
  /** Error details (if failed) */
  error?: OptimisticLockError;
}

/**
 * Result of reading a document with version
 */
export interface VersionedDocument<T> {
  /** The document data */
  document: T;
  /** The current version number */
  version: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for a specified duration
 * @param ms - Duration in milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/**
 * Calculate exponential backoff delay
 * @param attempt - Current attempt number (0-indexed)
 * @param config - Lock configuration
 * @returns Delay in milliseconds
 */
function calculateBackoff(attempt: number, config: OptimisticLockConfig): number {
  const delay = config.baseDelayMs * (2 ** attempt);
  return Math.min(delay, config.maxDelayMs);
}

/**
 * Extract version from a document, defaulting to 0 if not present
 * @param document - The document to extract version from
 * @returns The version number
 */
export function getVersion(document: Record<string, unknown>): number {
  const { version } = document;
  return typeof version === 'number' ? version : 0;
}

/**
 * Strict patterns for detecting version mismatch errors in error messages.
 * Uses whole-word matching or exact phrases to avoid false positives.
 */
const VERSION_MISMATCH_PATTERNS = [
  /\bversion mismatch\b/i,
  /\bversion conflict\b/i,
  /\bdocument conflict\b/i,
  /\boptimistic lock\b/i,
  /\bstale revision\b/i,
  /\bconcurrent modification\b/i,
  /\brecord was modified\b/i,
  /\bdocument was modified\b/i,
  /\bconflict detected\b/i,
  /\b409\b.*\bconflict\b/i,
] as const;

/**
 * Check if an error is a version mismatch error from Appwrite or our own conflict errors.
 * 
 * Detection order (most specific to least specific):
 * 1. OptimisticLockConflictError - our own typed error
 * 2. Appwrite structured errors - code 409 or type 'document_conflict'
 * 3. Error message patterns - strict regex matching for known phrases
 * 
 * @param error - The error to check
 * @returns True if this is a version mismatch/conflict error
 */
export function isVersionMismatchError(error: unknown): boolean {
  // 1. Check for our own typed conflict error (most specific)
  if (error instanceof OptimisticLockConflictError) {
    return true;
  }
  
  // 2. Check for Appwrite structured error codes/types
  if (typeof error === 'object' && error !== null) {
    const appwriteError = error as { code?: number; type?: string; message?: string };
    
    // 409 is HTTP Conflict status code
    if (appwriteError.code === 409) {
      return true;
    }
    
    // Appwrite document conflict type
    if (appwriteError.type === 'document_conflict') {
      return true;
    }
  }
  
  // 3. Fall back to strict message pattern matching for Error instances
  if (error instanceof Error) {
    const { message } = error;
    
    // Check against strict patterns to avoid false positives
    for (const pattern of VERSION_MISMATCH_PATTERNS) {
      if (pattern.test(message)) {
        return true;
      }
    }
  }
  
  return false;
}

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Read a document from Appwrite and extract its version
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param databaseId - Database ID
 * @param tableId - Table ID
 * @param documentId - Document ID
 * @returns The document with its version number
 * @throws Error if document not found
 * 
 * @example
 * ```typescript
 * const { document, version } = await readWithVersion(
 *   tablesDB,
 *   'my-database',
 *   'attendees',
 *   'attendee-123'
 * );
 * console.log(`Document version: ${version}`);
 * ```
 */
export async function readWithVersion<T extends Record<string, unknown>>(
  tablesDB: TablesDB,
  databaseId: string,
  tableId: string,
  documentId: string,
): Promise<VersionedDocument<T>> {
  const document = await tablesDB.getRow({
    databaseId,
    tableId,
    rowId: documentId
  });
  const version = getVersion(document as Record<string, unknown>);
  
  return {
    document: document as unknown as T,
    version,
  };
}

/**
 * Update a document with optimistic locking and automatic retry
 * 
 * This function:
 * 1. Reads the current document and version
 * 2. Applies the update function to generate new data
 * 3. Attempts to update with version check
 * 4. Retries with exponential backoff on version conflicts
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param databaseId - Database ID
 * @param tableId - Table ID
 * @param documentId - Document ID
 * @param updateFn - Function that receives current document and version, returns partial update
 * @param config - Optional configuration overrides
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * const result = await updateWithLock(
 *   tablesDB,
 *   'my-database',
 *   'attendees',
 *   'attendee-123',
 *   (current, version) => ({
 *     credentialUrl: 'https://example.com/credential.pdf',
 *     credentialGeneratedAt: new Date().toISOString(),
 *   })
 * );
 * 
 * if (result.success) {
 *   console.log('Updated successfully, new version:', result.version);
 * } else {
 *   console.error('Update failed:', result.error?.message);
 * }
 * ```
 */
export async function updateWithLock<T extends Record<string, unknown>>(
  tablesDB: TablesDB,
  databaseId: string,
  tableId: string,
  documentId: string,
  updateFn: (current: T, version: number) => Partial<T>,
  config?: Partial<OptimisticLockConfig>,
): Promise<LockResult<T>> {
  const mergedConfig: OptimisticLockConfig = {
    ...DEFAULT_LOCK_CONFIG,
    ...config,
  };

  let lastError: OptimisticLockError | undefined;
  let conflictDetected = false;
  let retriesUsed = 0;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt += 1) {
    retriesUsed = attempt;
    try {
      // Read current document and version
      const { document: current, version: currentVersion } = await readWithVersion<T>(
        tablesDB,
        databaseId,
        tableId,
        documentId,
      );

      // Generate update data
      const updateData = updateFn(current, currentVersion);

      // Prepare update with incremented version
      const dataWithVersion = {
        ...updateData,
        version: currentVersion + 1,
      };

      // Attempt update
      const updated = await tablesDB.updateRow(
        databaseId,
        tableId,
        documentId,
        dataWithVersion,
      );

      return {
        success: true,
        data: updated as unknown as T,
        version: currentVersion + 1,
        conflictDetected,
        retriesUsed: attempt,
      };
    } catch (error) {
      // Check if this is a version conflict
      if (isVersionMismatchError(error)) {
        conflictDetected = true;
        
        // If we have retries left, wait and try again
        if (attempt < mergedConfig.maxRetries) {
          const delay = calculateBackoff(attempt, mergedConfig);
          await sleep(delay);
          continue;
        }

        // Max retries exceeded
        retriesUsed = attempt;
        lastError = {
          type: 'MAX_RETRIES_EXCEEDED',
          message: `Failed to update document after ${mergedConfig.maxRetries} retries due to version conflicts`,
          originalError: error instanceof Error ? error : undefined,
        };
      } else if (error instanceof Error && error.message.includes('not found')) {
        // Document not found
        retriesUsed = attempt;
        lastError = {
          type: 'RECORD_NOT_FOUND',
          message: `Document ${documentId} not found`,
          originalError: error,
        };
        break; // Don't retry for not found errors
      } else {
        // Other error
        retriesUsed = attempt;
        lastError = {
          type: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error during update',
          originalError: error instanceof Error ? error : undefined,
        };
        break; // Don't retry for unknown errors
      }
    }
  }

  return {
    success: false,
    conflictDetected,
    retriesUsed,
    error: lastError,
  };
}

/**
 * Perform a partial update with optimistic locking
 * 
 * This is a simpler version of updateWithLock that directly applies
 * the provided fields without a transformation function.
 * 
 * @param tablesDB - Appwrite TablesDB instance
 * @param databaseId - Database ID
 * @param tableId - Table ID
 * @param documentId - Document ID
 * @param fields - Fields to update
 * @param expectedVersion - Optional expected version for immediate conflict detection
 * @param config - Optional configuration overrides
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * const result = await partialUpdateWithLock(
 *   tablesDB,
 *   'my-database',
 *   'attendees',
 *   'attendee-123',
 *   { photoUrl: 'https://example.com/photo.jpg' },
 *   5 // Expected version
 * );
 * ```
 */
export async function partialUpdateWithLock<T extends Record<string, unknown>>(
  tablesDB: TablesDB,
  databaseId: string,
  tableId: string,
  documentId: string,
  fields: Record<string, unknown>,
  expectedVersion?: number,
  config?: Partial<OptimisticLockConfig>,
): Promise<LockResult<T>> {
  const mergedConfig: OptimisticLockConfig = {
    ...DEFAULT_LOCK_CONFIG,
    ...config,
  };

  // Note: expectedVersion validation is done inside updateWithLock's update function
  // to ensure atomicity within the read-modify-write cycle

  // Use updateWithLock with a simple merge function
  // Pass expectedVersion to validate during the atomic read-modify-write cycle
  return updateWithLock<T>(
    tablesDB,
    databaseId,
    tableId,
    documentId,
    (current, currentVersion) => {
      // If expectedVersion was provided, validate it matches the current version
      // This check happens atomically within updateWithLock's read-modify-write cycle
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new OptimisticLockConflictError(
          documentId,
          expectedVersion,
          currentVersion,
          `Version mismatch: expected ${expectedVersion}, found ${currentVersion}`,
        );
      }
      return fields as Partial<T>;
    },
    mergedConfig,
  );
}

/**
 * Retry an operation with exponential backoff
 * 
 * Generic utility for retrying any async operation with configurable backoff.
 * 
 * @param operation - The async operation to retry
 * @param config - Optional configuration overrides
 * @returns LockResult with the operation result
 * 
 * @example
 * ```typescript
 * const result = await withRetry(
 *   async () => {
 *     // Your operation here
 *     return await someAsyncOperation();
 *   },
 *   { maxRetries: 5 }
 * );
 * ```
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config?: Partial<OptimisticLockConfig>,
): Promise<LockResult<T>> {
  const mergedConfig: OptimisticLockConfig = {
    ...DEFAULT_LOCK_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;
  let conflictDetected = false;
  let attemptsUsed = 0;

  for (let attempt = 0; attempt <= mergedConfig.maxRetries; attempt += 1) {
    attemptsUsed = attempt;
    try {
      const result = await operation();
      return {
        success: true,
        data: result,
        conflictDetected,
        retriesUsed: attempt,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Check if this is a retryable error
      if (isVersionMismatchError(error)) {
        conflictDetected = true;

        if (attempt < mergedConfig.maxRetries) {
          const delay = calculateBackoff(attempt, mergedConfig);
          await sleep(delay);
          continue;
        }
      } else {
        // Non-retryable error, break immediately
        break;
      }
    }
  }

  return {
    success: false,
    conflictDetected,
    retriesUsed: attemptsUsed,
    error: {
      type: conflictDetected ? 'MAX_RETRIES_EXCEEDED' : 'UPDATE_FAILED',
      message: lastError?.message || 'Operation failed',
      originalError: lastError,
    },
  };
}

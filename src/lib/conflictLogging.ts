/**
 * Conflict Logging Service
 * 
 * Provides structured logging for concurrency conflicts using the existing
 * logs collection with conflict-specific action types. This integrates with
 * the existing logging infrastructure while providing detailed conflict tracking.
 * 
 * @module conflictLogging
 */

import { TablesDB, ID } from 'node-appwrite';
import { logger } from './logger';
import { 
  ConflictInfo, 
  ConflictLogEntry, 
  ConflictType, 
  OperationType,
  ResolutionStrategyType, 
} from './conflictResolver';

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Action types for conflict-related log entries
 */
export enum ConflictLogAction {
  /** A conflict was detected */
  CONFLICT_DETECTED = 'conflict_detected',
  /** A conflict was successfully resolved */
  CONFLICT_RESOLVED = 'conflict_resolved',
  /** A conflict resolution failed (terminal failure, cannot be retried) */
  CONFLICT_FAILED = 'conflict_failed',
  /** Max retries exceeded during conflict resolution */
  CONFLICT_MAX_RETRIES = 'conflict_max_retries',
}

/**
 * Reasons why a conflict resolution failed.
 * Used to disambiguate between different failure modes for accurate logging.
 */
export enum ConflictFailureReason {
  /** Resolution strategy determined the conflict cannot be resolved */
  STRATEGY_FAILED = 'strategy_failed',
  /** Maximum retry attempts were exhausted */
  MAX_RETRIES_EXCEEDED = 'max_retries_exceeded',
  /** Merge operation failed due to incompatible data */
  MERGE_ERROR = 'merge_error',
  /** The target record was deleted during resolution */
  RECORD_DELETED = 'record_deleted',
  /** Unknown or unspecified failure */
  UNKNOWN = 'unknown',
}

/**
 * Structure for conflict log entry stored in the logs collection
 */
export interface ConflictLogDocument {
  /** User ID who triggered the operation (if available) */
  userId?: string;
  /** Attendee ID affected by the conflict */
  attendeeId: string;
  /** Action type for filtering */
  action: ConflictLogAction;
  /** JSON stringified details */
  details: string;
}

/**
 * Detailed conflict information stored in the details field
 */
export interface ConflictLogDetails {
  /** ISO timestamp of the conflict */
  timestamp: string;
  /** Type of operation that caused the conflict */
  operationType: OperationType;
  /** Type of conflict */
  conflictType: ConflictType;
  /** Expected version */
  expectedVersion: number;
  /** Actual version found */
  actualVersion: number;
  /** Fields involved in the conflict */
  conflictingFields: string[];
  /** Resolution strategy used */
  resolutionStrategy: ResolutionStrategyType;
  /** Whether resolution was successful */
  resolutionSuccess: boolean;
  /** Number of retries used */
  retriesUsed: number;
  /** Reason for failure (only present when resolutionSuccess is false) */
  failureReason?: ConflictFailureReason;
  /** Optional session identifier (anonymized) */
  sessionInfo?: string;
  /** Additional context */
  context?: Record<string, unknown>;
}

/**
 * Options for logging conflicts to the database
 */
export interface ConflictLogOptions {
  /** Appwrite TablesDB instance */
  tablesDB: TablesDB;
  /** Database ID */
  databaseId: string;
  /** Logs collection ID */
  logsTableId: string;
  /** User ID (optional) */
  userId?: string;
  /** Session ID for tracking (will be anonymized) */
  sessionId?: string;
  /** Additional context to include */
  context?: Record<string, unknown>;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Anonymize session ID for privacy in logs
 * Keeps first 4 and last 4 characters, masks the rest
 */
export function anonymizeSessionId(sessionId: string): string {
  if (sessionId.length <= 8) {
    return '****';
  }
  return `${sessionId.slice(0, 4)}****${sessionId.slice(-4)}`;
}

/**
 * Create conflict log details from conflict info and resolution
 */
export function createConflictLogDetails(
  conflict: ConflictInfo,
  resolutionStrategy: ResolutionStrategyType,
  resolutionSuccess: boolean,
  retriesUsed: number,
  sessionId?: string,
  context?: Record<string, unknown>,
  failureReason?: ConflictFailureReason,
): ConflictLogDetails {
  return {
    timestamp: new Date().toISOString(),
    operationType: conflict.operationType,
    conflictType: conflict.conflictType,
    expectedVersion: conflict.expectedVersion,
    actualVersion: conflict.actualVersion,
    conflictingFields: conflict.conflictingFields,
    resolutionStrategy,
    resolutionSuccess,
    retriesUsed,
    failureReason: resolutionSuccess ? undefined : failureReason,
    sessionInfo: sessionId ? anonymizeSessionId(sessionId) : undefined,
    context,
  };
}

/**
 * Infer the failure reason from the resolution strategy when not explicitly provided.
 * This provides backward compatibility for callers that don't pass a failure reason.
 */
function inferFailureReason(resolutionStrategy: ResolutionStrategyType): ConflictFailureReason {
  switch (resolutionStrategy) {
    case ResolutionStrategyType.FAIL:
      return ConflictFailureReason.STRATEGY_FAILED;
    case ResolutionStrategyType.RETRY:
      // If RETRY strategy failed, it's likely due to max retries exceeded
      return ConflictFailureReason.MAX_RETRIES_EXCEEDED;
    case ResolutionStrategyType.MERGE:
      // If MERGE strategy failed, it's a merge error
      return ConflictFailureReason.MERGE_ERROR;
    default:
      return ConflictFailureReason.UNKNOWN;
  }
}

// ============================================================================
// Database Logging Functions
// ============================================================================

/**
 * Log a conflict to the database logs collection.
 * 
 * This function writes conflict information to the existing logs collection
 * using a conflict-specific action type for easy filtering and analysis.
 * 
 * Action selection logic:
 * - CONFLICT_RESOLVED: Resolution was successful
 * - CONFLICT_FAILED: Terminal failure (strategy was FAIL, merge error, or record deleted)
 * - CONFLICT_MAX_RETRIES: Retries were exhausted but operation could succeed later
 * 
 * @param conflict - Information about the detected conflict
 * @param resolutionStrategy - Strategy used to resolve the conflict
 * @param resolutionSuccess - Whether the resolution was successful
 * @param retriesUsed - Number of retries used
 * @param options - Logging options including database connection
 * @param failureReason - Optional explicit reason for failure (used when resolutionSuccess is false)
 * 
 * @example
 * ```typescript
 * await logConflictToDatabase(
 *   conflictInfo,
 *   ResolutionStrategyType.MERGE,
 *   false,
 *   3,
 *   {
 *     tablesDB,
 *     databaseId: dbId,
 *     logsTableId,
 *     userId: user.$id,
 *   },
 *   ConflictFailureReason.MAX_RETRIES_EXCEEDED
 * );
 * ```
 */
export async function logConflictToDatabase(
  conflict: ConflictInfo,
  resolutionStrategy: ResolutionStrategyType,
  resolutionSuccess: boolean,
  retriesUsed: number,
  options: ConflictLogOptions,
  failureReason?: ConflictFailureReason,
): Promise<void> {
  // Validate required options early to prevent runtime errors
  if (!options?.tablesDB || !options?.databaseId || !options?.logsTableId) {
    logger.warn('[ConflictLogging] Skipping database log - missing required options', {
      hasTablesDB: !!options?.tablesDB,
      hasDatabaseId: !!options?.databaseId,
      hasLogsTableId: !!options?.logsTableId,
    });
    return;
  }

  const { tablesDB, databaseId, logsTableId, userId, sessionId, context } = options;

  // Validate documentId to prevent invalid attendeeId in logs
  const attendeeId = conflict.documentId && typeof conflict.documentId === 'string' && conflict.documentId.trim()
    ? conflict.documentId
    : 'unknown';

  // Compute effective failure reason once to ensure consistency between action and details
  const effectiveFailureReason = resolutionSuccess 
    ? undefined 
    : (failureReason ?? inferFailureReason(resolutionStrategy));

  // Log when failure reason is unknown to aid debugging
  if (!resolutionSuccess && effectiveFailureReason === ConflictFailureReason.UNKNOWN && !failureReason) {
    logger.warn('[ConflictLogging] Conflict resolution failed with unknown reason', {
      documentId: attendeeId,
      resolutionStrategy,
      retriesUsed,
    });
  }

  // Determine the action type based on resolution outcome and failure reason
  let action: ConflictLogAction;
  if (resolutionSuccess) {
    action = ConflictLogAction.CONFLICT_RESOLVED;
  } else if (effectiveFailureReason === ConflictFailureReason.MAX_RETRIES_EXCEEDED) {
    action = ConflictLogAction.CONFLICT_MAX_RETRIES;
  } else {
    // STRATEGY_FAILED, MERGE_ERROR, RECORD_DELETED, UNKNOWN -> terminal failure
    action = ConflictLogAction.CONFLICT_FAILED;
  }

  const details = createConflictLogDetails(
    conflict,
    resolutionStrategy,
    resolutionSuccess,
    retriesUsed,
    sessionId,
    context,
    effectiveFailureReason,
  );

  try {
    await tablesDB.createRow(
      databaseId,
      logsTableId,
      ID.unique(),
      {
        userId: userId || 'system',
        attendeeId,
        action,
        details: JSON.stringify(details),
      },
    );

    logger.debug('[ConflictLogging] Conflict logged to database', {
      documentId: attendeeId,
      action,
      resolutionSuccess,
    });
  } catch (error) {
    // Don't fail the main operation if logging fails
    logger.error('[ConflictLogging] Failed to log conflict to database', {
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId: attendeeId,
    });
  }
}

/**
 * Log conflict detection (before resolution attempt)
 */
export async function logConflictDetected(
  conflict: ConflictInfo,
  options: ConflictLogOptions,
): Promise<void> {
  // Validate required options early to prevent runtime errors
  if (!options?.tablesDB || !options?.databaseId || !options?.logsTableId) {
    logger.warn('[ConflictLogging] Skipping conflict detection log - missing required options', {
      hasTablesDB: !!options?.tablesDB,
      hasDatabaseId: !!options?.databaseId,
      hasLogsTableId: !!options?.logsTableId,
    });
    return;
  }

  const { tablesDB, databaseId, logsTableId, userId, sessionId, context } = options;

  // Validate documentId to prevent invalid attendeeId in logs
  const attendeeId = conflict.documentId && typeof conflict.documentId === 'string' && conflict.documentId.trim()
    ? conflict.documentId
    : 'unknown';

  const details: ConflictLogDetails = {
    timestamp: new Date().toISOString(),
    operationType: conflict.operationType,
    conflictType: conflict.conflictType,
    expectedVersion: conflict.expectedVersion,
    actualVersion: conflict.actualVersion,
    conflictingFields: conflict.conflictingFields,
    resolutionStrategy: ResolutionStrategyType.RETRY, // Initial state
    resolutionSuccess: false, // Not yet resolved
    retriesUsed: 0,
    sessionInfo: sessionId ? anonymizeSessionId(sessionId) : undefined,
    context,
  };

  try {
    await tablesDB.createRow(
      databaseId,
      logsTableId,
      ID.unique(),
      {
        userId: userId || 'system',
        attendeeId,
        action: ConflictLogAction.CONFLICT_DETECTED,
        details: JSON.stringify(details),
      },
    );
  } catch (error) {
    logger.error('[ConflictLogging] Failed to log conflict detection', {
      error: error instanceof Error ? error.message : 'Unknown error',
      documentId: attendeeId,
    });
  }
}

// ============================================================================
// Conflict Log Entry Conversion
// ============================================================================

/**
 * Convert a ConflictLogEntry to database format
 */
export function conflictLogEntryToDocument(
  entry: ConflictLogEntry & { action?: ConflictLogAction },
  userId?: string,
): ConflictLogDocument {
  // Prefer explicit action if provided, otherwise infer from resolution state
  let action: ConflictLogAction;
  if (entry.action !== undefined) {
    action = entry.action;
  } else if (entry.resolutionSuccess) {
    action = ConflictLogAction.CONFLICT_RESOLVED;
  } else {
    action = ConflictLogAction.CONFLICT_FAILED;
  }

  const details: ConflictLogDetails = {
    timestamp: entry.timestamp,
    operationType: entry.operationType,
    conflictType: entry.conflictType,
    expectedVersion: entry.expectedVersion,
    actualVersion: entry.actualVersion,
    conflictingFields: entry.conflictingFields,
    resolutionStrategy: entry.resolutionStrategy,
    resolutionSuccess: entry.resolutionSuccess,
    retriesUsed: entry.retriesUsed,
    sessionInfo: entry.sessionInfo,
  };

  return {
    userId: userId || 'system',
    attendeeId: entry.documentId,
    action,
    details: JSON.stringify(details),
  };
}

/**
 * Parse conflict log details from a database document
 */
export function parseConflictLogDetails(detailsJson: string): ConflictLogDetails | null {
  try {
    return JSON.parse(detailsJson) as ConflictLogDetails;
  } catch {
    return null;
  }
}

// ============================================================================
// Query Helpers
// ============================================================================

/**
 * Check if a log action is a conflict-related action
 */
export function isConflictLogAction(action: string): action is ConflictLogAction {
  return Object.values(ConflictLogAction).includes(action as ConflictLogAction);
}

/**
 * Get all conflict log action types for querying
 */
export function getConflictLogActions(): ConflictLogAction[] {
  return Object.values(ConflictLogAction);
}

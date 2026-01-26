/**
 * Conflict Resolver Service
 * 
 * Handles conflict detection and automatic resolution for concurrent
 * operations on attendee records. Supports merge strategies for
 * non-overlapping field conflicts and latest-wins for overlapping fields.
 * 
 * @module conflictResolver
 */

import { Databases } from 'node-appwrite';
import { logger } from './logger';
import { FIELD_GROUPS, FieldGroupName } from './fieldUpdate';
import { LockResult, updateWithLock, OptimisticLockConfig, sanitizeLockConfig } from './optimisticLock';
import { recordConflict } from './transactionMonitoring';

// ============================================================================
// Enums and Constants
// ============================================================================

/**
 * Types of conflicts that can occur during concurrent operations
 */
export enum ConflictType {
  /** Document version doesn't match expected version */
  VERSION_MISMATCH = 'VERSION_MISMATCH',
  /** Multiple operations trying to modify the same fields */
  FIELD_COLLISION = 'FIELD_COLLISION',
  /** Transient conflict that may resolve on retry */
  TRANSIENT = 'TRANSIENT',
}

/**
 * Types of operations that can cause conflicts
 */
export enum OperationType {
  CREDENTIAL_GENERATION = 'credential_generation',
  PHOTO_UPLOAD = 'photo_upload',
  PROFILE_UPDATE = 'profile_update',
  BULK_EDIT = 'bulk_edit',
  CUSTOM_FIELD_UPDATE = 'custom_field_update',
  ACCESS_CONTROL_UPDATE = 'access_control_update',
}

/**
 * Resolution strategies for handling conflicts
 */
export enum ResolutionStrategyType {
  /** Merge non-overlapping changes from both operations */
  MERGE = 'MERGE',
  /** Use the most recent change based on timestamp */
  LATEST_WINS = 'LATEST_WINS',
  /** Retry the operation with fresh data */
  RETRY = 'RETRY',
  /** Fail the operation - cannot be automatically resolved */
  FAIL = 'FAIL',
}

// ============================================================================
// Interfaces
// ============================================================================

/**
 * Information about a detected conflict
 */
export interface ConflictInfo {
  /** ID of the document with the conflict */
  documentId: string;
  /** Type of operation that caused the conflict */
  operationType: OperationType;
  /** Expected version number */
  expectedVersion: number;
  /** Actual version number found in the database */
  actualVersion: number;
  /** Fields that are in conflict */
  conflictingFields: string[];
  /** ISO timestamp when conflict was detected */
  timestamp: string;
  /** Type of conflict */
  conflictType: ConflictType;
  /** Field groups involved in the conflict */
  affectedGroups?: FieldGroupName[];
}

/**
 * Resolution strategy with details
 */
export interface ResolutionStrategy {
  /** Type of resolution to apply */
  type: ResolutionStrategyType;
  /** Merged data if using MERGE strategy */
  mergedData?: Record<string, unknown>;
  /** Reason for choosing this strategy */
  reason: string;
  /** Whether the resolution can be retried if it fails */
  retryable: boolean;
}

/**
 * Result of a conflict resolution attempt
 */
export interface ResolutionResult<T = Record<string, unknown>> {
  /** Whether the resolution was successful */
  success: boolean;
  /** The resolved/merged data */
  data?: T;
  /** The strategy that was used */
  strategyUsed: ResolutionStrategyType;
  /** Number of retries attempted */
  retriesUsed: number;
  /** Error message if resolution failed */
  error?: string;
}

/**
 * Log entry for conflict monitoring
 */
export interface ConflictLogEntry {
  /** ISO timestamp of the conflict */
  timestamp: string;
  /** ID of the affected document */
  documentId: string;
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
  /** Optional session identifier (anonymized) */
  sessionInfo?: string;
}

/**
 * Options for conflict detection
 */
export interface ConflictDetectionOptions {
  /** The operation type being performed */
  operationType: OperationType;
  /** Fields being modified by the current operation */
  modifyingFields: string[];
}

/**
 * Options for conflict resolution
 */
export interface ConflictResolutionOptions {
  /** Lock configuration for retries */
  lockConfig?: Partial<OptimisticLockConfig>;
  /** Timestamp of the incoming data for latest-wins comparison */
  incomingTimestamp?: string;
  /** Session identifier for logging */
  sessionId?: string;
  /** User ID for logging */
  userId?: string;
  /** Database logging options */
  databaseLogging?: {
    /** Whether to log conflicts to the database */
    enabled: boolean;
    /** Logs collection ID */
    logsCollectionId: string;
  };
}

// ============================================================================
// Field Group Mapping
// ============================================================================

/**
 * Map operation types to their associated field groups
 */
export const OPERATION_FIELD_GROUPS: Record<OperationType, FieldGroupName[]> = {
  [OperationType.CREDENTIAL_GENERATION]: ['credential'],
  [OperationType.PHOTO_UPLOAD]: ['photo'],
  [OperationType.PROFILE_UPDATE]: ['profile'],
  [OperationType.BULK_EDIT]: ['profile', 'customFields'],
  [OperationType.CUSTOM_FIELD_UPDATE]: ['customFields'],
  [OperationType.ACCESS_CONTROL_UPDATE]: ['accessControl'],
};

/**
 * Get the field group for an operation type
 */
export function getOperationFieldGroups(operationType: OperationType): FieldGroupName[] {
  return OPERATION_FIELD_GROUPS[operationType] || [];
}

/**
 * Get all fields for an operation type
 */
export function getOperationFields(operationType: OperationType): string[] {
  const groups = getOperationFieldGroups(operationType);
  const fields: string[] = [];
  for (const group of groups) {
    fields.push(...FIELD_GROUPS[group]);
  }
  return fields;
}



// ============================================================================
// Conflict Detection
// ============================================================================

/**
 * Detect if there's a conflict between current and expected state.
 * 
 * This function compares the expected version with the actual version
 * and identifies which fields are in conflict based on the operation type.
 * 
 * @param current - Current document state from the database
 * @param expected - Expected state including version and fields being modified
 * @param options - Detection options including operation type
 * @returns ConflictInfo if conflict detected, null otherwise
 * 
 * @example
 * ```typescript
 * const conflict = detectConflict(
 *   currentDocument,
 *   { version: 5, fields: ['photoUrl'] },
 *   { operationType: OperationType.PHOTO_UPLOAD, modifyingFields: ['photoUrl'] }
 * );
 * 
 * if (conflict) {
 *   console.log('Conflict detected:', conflict.conflictType);
 * }
 * ```
 */
export function detectConflict(
  current: Record<string, unknown>,
  expected: { version: number; fields?: string[] },
  options: ConflictDetectionOptions
): ConflictInfo | null {
  const currentVersion = typeof current.version === 'number' ? current.version : 0;
  const timestamp = new Date().toISOString();

  // Check for version mismatch
  if (currentVersion !== expected.version) {
    // Determine which fields are in conflict
    const conflictingFields = identifyConflictingFields(
      current,
      options.modifyingFields,
      options.operationType
    );

    // Determine affected field groups
    const affectedGroups = identifyAffectedGroups(conflictingFields);

    return {
      documentId: (current.$id as string) || 'unknown',
      operationType: options.operationType,
      expectedVersion: expected.version,
      actualVersion: currentVersion,
      conflictingFields,
      timestamp,
      conflictType: conflictingFields.length > 0 
        ? ConflictType.FIELD_COLLISION 
        : ConflictType.VERSION_MISMATCH,
      affectedGroups,
    };
  }

  return null;
}

/**
 * Identify which fields are in conflict based on what changed
 * between expected and current state.
 * 
 * Returns the subset of modifyingFields that belong to the operation's
 * field groups, as these are the fields that could potentially conflict
 * with concurrent operations on the same groups.
 */
function identifyConflictingFields(
  current: Record<string, unknown>,
  modifyingFields: string[],
  operationType: OperationType
): string[] {
  const conflicting: string[] = [];
  
  // Get field groups that this operation type touches
  const operationGroups = getOperationFieldGroups(operationType);
  
  // Build set of all fields in the operation's groups for efficient lookup
  const operationFieldSet = new Set<string>();
  for (const group of operationGroups) {
    for (const field of FIELD_GROUPS[group]) {
      operationFieldSet.add(field);
    }
  }

  // Check if any of the fields we're trying to modify
  // belong to the operation's field groups (potential conflicts)
  for (const field of modifyingFields) {
    if (operationFieldSet.has(field)) {
      conflicting.push(field);
    }
  }

  // If no specific field conflicts found, but version changed,
  // return the fields being modified as potentially conflicting
  if (conflicting.length === 0 && modifyingFields.length > 0) {
    return [...modifyingFields];
  }

  return conflicting;
}

/**
 * Identify which field groups are affected by the conflicting fields
 */
function identifyAffectedGroups(conflictingFields: string[]): FieldGroupName[] {
  const groups = new Set<FieldGroupName>();
  
  for (const field of conflictingFields) {
    for (const [groupName, fields] of Object.entries(FIELD_GROUPS)) {
      if ((fields as readonly string[]).includes(field)) {
        groups.add(groupName as FieldGroupName);
      }
    }
  }
  
  return Array.from(groups);
}

/**
 * Check if two operations have overlapping field groups
 */
export function hasOverlappingFields(
  operation1: OperationType,
  operation2: OperationType
): boolean {
  const groups1 = new Set(getOperationFieldGroups(operation1));
  const groups2 = getOperationFieldGroups(operation2);
  
  return groups2.some(g => groups1.has(g));
}

/**
 * Check if specific fields overlap with an operation's field groups
 */
export function fieldsOverlapWithOperation(
  fields: string[],
  operationType: OperationType
): boolean {
  const operationFields = new Set(getOperationFields(operationType));
  return fields.some(f => operationFields.has(f));
}



// ============================================================================
// Strategy Determination
// ============================================================================

/**
 * Determine the best resolution strategy for a conflict.
 * 
 * Strategy selection logic:
 * - MERGE: When conflicting fields belong to different field groups (non-overlapping)
 * - LATEST_WINS: When conflicting fields overlap and we have timestamps to compare
 * - RETRY: For transient conflicts or when version just changed
 * - FAIL: When automatic resolution is not possible
 * 
 * @param conflict - Information about the detected conflict
 * @param incomingData - Data from the operation that encountered the conflict
 * @param currentData - Current data in the database
 * @param options - Optional resolution options
 * @returns ResolutionStrategy with type and merged data if applicable
 * 
 * @example
 * ```typescript
 * const strategy = determineStrategy(
 *   conflictInfo,
 *   { photoUrl: 'new-photo.jpg' },
 *   currentDocument
 * );
 * 
 * if (strategy.type === ResolutionStrategyType.MERGE) {
 *   // Apply merged data
 * }
 * ```
 */
export function determineStrategy(
  conflict: ConflictInfo,
  incomingData: Record<string, unknown>,
  currentData: Record<string, unknown>,
  options?: ConflictResolutionOptions
): ResolutionStrategy {
  const incomingFields = Object.keys(incomingData);
  const incomingGroups = identifyAffectedGroups(incomingFields);
  
  // Check if this is a transient conflict (version just bumped, no real field collision)
  if (conflict.conflictType === ConflictType.TRANSIENT) {
    return {
      type: ResolutionStrategyType.RETRY,
      reason: 'Transient conflict detected, retry with fresh data',
      retryable: true,
    };
  }

  // Check for non-overlapping field groups - can merge
  const conflictGroups = conflict.affectedGroups || [];
  const hasOverlap = incomingGroups.some(g => conflictGroups.includes(g));

  if (!hasOverlap && conflict.conflictingFields.length > 0) {
    // Non-overlapping fields - safe to merge
    const mergedData = mergeNonOverlappingFields(
      currentData,
      incomingData,
      incomingGroups
    );

    return {
      type: ResolutionStrategyType.MERGE,
      mergedData,
      reason: `Non-overlapping field groups: incoming [${incomingGroups.join(', ')}] vs conflict [${conflictGroups.join(', ')}]`,
      retryable: true,
    };
  }

  // Check if we can use latest-wins based on timestamps
  if (hasOverlap) {
    const incomingTimestamp = options?.incomingTimestamp || new Date().toISOString();
    const currentTimestamp = extractLatestTimestamp(currentData, conflictGroups);

    if (currentTimestamp && incomingTimestamp > currentTimestamp) {
      // Incoming data is newer - use it
      return {
        type: ResolutionStrategyType.LATEST_WINS,
        mergedData: incomingData,
        reason: `Incoming data is newer: ${incomingTimestamp} > ${currentTimestamp}`,
        retryable: true,
      };
    } else if (currentTimestamp && incomingTimestamp <= currentTimestamp) {
      // Current data is newer or same - keep current, but still apply non-conflicting fields
      const nonConflictingData = filterNonConflictingFields(
        incomingData,
        conflict.conflictingFields
      );

      if (Object.keys(nonConflictingData).length > 0) {
        return {
          type: ResolutionStrategyType.MERGE,
          mergedData: nonConflictingData,
          reason: `Current data is newer, applying only non-conflicting fields`,
          retryable: true,
        };
      }

      return {
        type: ResolutionStrategyType.FAIL,
        reason: `Current data is newer (${currentTimestamp}) than incoming (${incomingTimestamp}), no non-conflicting fields to apply`,
        retryable: false,
      };
    }
  }

  // Default: retry with fresh data
  if (conflict.actualVersion - conflict.expectedVersion <= 2) {
    return {
      type: ResolutionStrategyType.RETRY,
      reason: 'Version difference is small, retry with fresh data',
      retryable: true,
    };
  }

  // Large version gap or unknown situation - fail
  return {
    type: ResolutionStrategyType.FAIL,
    reason: `Cannot automatically resolve: version gap too large (expected ${conflict.expectedVersion}, actual ${conflict.actualVersion})`,
    retryable: false,
  };
}

/**
 * Merge non-overlapping fields from incoming data with current data
 */
function mergeNonOverlappingFields(
  currentData: Record<string, unknown>,
  incomingData: Record<string, unknown>,
  incomingGroups: FieldGroupName[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  // Get all fields from incoming groups
  const incomingGroupFields = new Set<string>();
  for (const group of incomingGroups) {
    for (const field of FIELD_GROUPS[group]) {
      incomingGroupFields.add(field);
    }
  }

  // Only include fields from the incoming data that belong to incoming groups
  for (const [key, value] of Object.entries(incomingData)) {
    if (incomingGroupFields.has(key) || !isFieldInAnyGroup(key)) {
      merged[key] = value;
    }
  }

  return merged;
}

/**
 * Check if a field belongs to any defined field group
 */
function isFieldInAnyGroup(field: string): boolean {
  for (const fields of Object.values(FIELD_GROUPS)) {
    if ((fields as readonly string[]).includes(field)) {
      return true;
    }
  }
  return false;
}

/**
 * Mapping of field groups to their relevant timestamp fields
 */
const GROUP_TIMESTAMP_FIELDS: Record<FieldGroupName, string[]> = {
  credential: ['credentialGeneratedAt', 'lastCredentialGenerated'],
  photo: ['lastPhotoUploaded'],
  profile: [],
  customFields: [],
  accessControl: [],
  tracking: ['lastSignificantUpdate'],
};

/**
 * Extract the latest timestamp from a document based on field groups.
 * Only considers timestamp fields relevant to the specified groups.
 */
function extractLatestTimestamp(
  data: Record<string, unknown>,
  groups: FieldGroupName[]
): string | null {
  // Build set of timestamp fields relevant to the specified groups
  const relevantTimestampFields = new Set<string>();
  
  for (const group of groups) {
    const groupTimestamps = GROUP_TIMESTAMP_FIELDS[group];
    if (groupTimestamps) {
      for (const field of groupTimestamps) {
        relevantTimestampFields.add(field);
      }
    }
  }
  
  // Always include $updatedAt as a fallback system timestamp
  relevantTimestampFields.add('$updatedAt');

  let latestTimestamp: string | null = null;

  for (const field of relevantTimestampFields) {
    const value = data[field];
    if (typeof value === 'string' && value) {
      if (!latestTimestamp || value > latestTimestamp) {
        latestTimestamp = value;
      }
    }
  }

  return latestTimestamp;
}

/**
 * Filter out conflicting fields from incoming data
 */
function filterNonConflictingFields(
  incomingData: Record<string, unknown>,
  conflictingFields: string[]
): Record<string, unknown> {
  const conflictSet = new Set(conflictingFields);
  const filtered: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(incomingData)) {
    if (!conflictSet.has(key)) {
      filtered[key] = value;
    }
  }

  return filtered;
}



// ============================================================================
// Conflict Resolution
// ============================================================================

/**
 * Apply the resolution strategy to resolve a conflict.
 * 
 * This function takes a resolution strategy and applies it to update
 * the document with the resolved data.
 * 
 * @param databases - Appwrite Databases instance
 * @param databaseId - Database ID
 * @param collectionId - Collection ID
 * @param documentId - Document ID
 * @param strategy - Resolution strategy to apply
 * @param incomingData - Original incoming data (used for RETRY strategy)
 * @param options - Resolution options
 * @returns ResolutionResult with success status and resolved data
 * 
 * @example
 * ```typescript
 * const result = await resolve(
 *   databases,
 *   dbId,
 *   collectionId,
 *   'doc-123',
 *   strategy,
 *   { photoUrl: 'new-photo.jpg' }
 * );
 * 
 * if (result.success) {
 *   console.log('Conflict resolved successfully');
 * }
 * ```
 */
export async function resolve<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  strategy: ResolutionStrategy,
  incomingData: Record<string, unknown>,
  options?: ConflictResolutionOptions
): Promise<ResolutionResult<T>> {
  const lockConfig = sanitizeLockConfig(options?.lockConfig);

  switch (strategy.type) {
    case ResolutionStrategyType.MERGE:
      return applyMergeStrategy<T>(
        databases,
        databaseId,
        collectionId,
        documentId,
        strategy.mergedData || incomingData,
        lockConfig
      );

    case ResolutionStrategyType.LATEST_WINS:
      return applyLatestWinsStrategy<T>(
        databases,
        databaseId,
        collectionId,
        documentId,
        strategy.mergedData || incomingData,
        lockConfig
      );

    case ResolutionStrategyType.RETRY:
      return applyRetryStrategy<T>(
        databases,
        databaseId,
        collectionId,
        documentId,
        incomingData,
        lockConfig
      );

    case ResolutionStrategyType.FAIL:
      return {
        success: false,
        strategyUsed: ResolutionStrategyType.FAIL,
        retriesUsed: 0,
        error: strategy.reason,
      };

    default:
      return {
        success: false,
        strategyUsed: ResolutionStrategyType.FAIL,
        retriesUsed: 0,
        error: `Unknown resolution strategy: ${strategy.type}`,
      };
  }
}

/**
 * Apply merge strategy by combining field sets
 */
async function applyMergeStrategy<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  mergedData: Record<string, unknown>,
  lockConfig: OptimisticLockConfig
): Promise<ResolutionResult<T>> {
  const result = await updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    documentId,
    () => mergedData as Partial<T>,
    lockConfig
  );

  return {
    success: result.success,
    data: result.data,
    strategyUsed: ResolutionStrategyType.MERGE,
    retriesUsed: result.retriesUsed || 0,
    error: result.error?.message,
  };
}

/**
 * Apply latest-wins strategy by using the newer data
 */
async function applyLatestWinsStrategy<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  winningData: Record<string, unknown>,
  lockConfig: OptimisticLockConfig
): Promise<ResolutionResult<T>> {
  const result = await updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    documentId,
    () => winningData as Partial<T>,
    lockConfig
  );

  return {
    success: result.success,
    data: result.data,
    strategyUsed: ResolutionStrategyType.LATEST_WINS,
    retriesUsed: result.retriesUsed || 0,
    error: result.error?.message,
  };
}

/**
 * Apply retry strategy by re-attempting with fresh data
 */
async function applyRetryStrategy<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  incomingData: Record<string, unknown>,
  lockConfig: OptimisticLockConfig
): Promise<ResolutionResult<T>> {
  const result = await updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    documentId,
    () => incomingData as Partial<T>,
    lockConfig
  );

  return {
    success: result.success,
    data: result.data,
    strategyUsed: ResolutionStrategyType.RETRY,
    retriesUsed: result.retriesUsed || 0,
    error: result.error?.message,
  };
}

/**
 * High-level function to detect and resolve conflicts in one call.
 * 
 * This function combines conflict detection, strategy determination,
 * and resolution into a single operation.
 * 
 * @param databases - Appwrite Databases instance
 * @param databaseId - Database ID
 * @param collectionId - Collection ID
 * @param documentId - Document ID
 * @param incomingData - Data to apply
 * @param expectedVersion - Expected document version
 * @param operationType - Type of operation being performed
 * @param options - Resolution options
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * const result = await detectAndResolve(
 *   databases,
 *   dbId,
 *   collectionId,
 *   'doc-123',
 *   { photoUrl: 'new-photo.jpg' },
 *   5,
 *   OperationType.PHOTO_UPLOAD
 * );
 * ```
 */
export async function detectAndResolve<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  incomingData: Record<string, unknown>,
  expectedVersion: number,
  operationType: OperationType,
  options?: ConflictResolutionOptions
): Promise<LockResult<T>> {
  // First, try a direct update
  const directResult = await updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    documentId,
    () => incomingData as Partial<T>,
    options?.lockConfig
  );

  if (directResult.success) {
    return directResult;
  }

  // If direct update failed due to conflict, try to resolve
  if (directResult.conflictDetected) {
    // Get current document state
    const currentDoc = await databases.getDocument(
      databaseId,
      collectionId,
      documentId
    );

    // Detect the conflict
    const conflict = detectConflict(
      currentDoc as Record<string, unknown>,
      { version: expectedVersion, fields: Object.keys(incomingData) },
      { operationType, modifyingFields: Object.keys(incomingData) }
    );

    if (conflict) {
      // Log the conflict
      logConflict(conflict, {
        type: ResolutionStrategyType.RETRY,
        reason: 'Initial detection',
        retryable: true,
      }, false, options?.sessionId);

      // Log to database if enabled
      if (options?.databaseLogging?.enabled) {
        // Import dynamically to avoid circular dependencies
        const { logConflictDetected } = await import('./conflictLogging');
        await logConflictDetected(conflict, {
          databases,
          databaseId,
          logsCollectionId: options.databaseLogging.logsCollectionId,
          userId: options.userId,
          sessionId: options.sessionId,
        }).catch(() => {
          // Don't fail the main operation if logging fails
        });
      }

      // Determine resolution strategy
      const strategy = determineStrategy(
        conflict,
        incomingData,
        currentDoc as Record<string, unknown>,
        options
      );

      // Apply resolution
      const resolution = await resolve<T>(
        databases,
        databaseId,
        collectionId,
        documentId,
        strategy,
        incomingData,
        options
      );

      // Log the resolution result
      logConflict(conflict, strategy, resolution.success, options?.sessionId, resolution.retriesUsed);

      // Record conflict to monitoring system
      recordConflict({
        documentId: conflict.documentId,
        operationType: conflict.operationType,
        conflictType: conflict.conflictType,
        expectedVersion: conflict.expectedVersion,
        actualVersion: conflict.actualVersion,
        conflictingFields: conflict.conflictingFields,
        resolutionStrategy: strategy.type,
        resolutionSuccess: resolution.success,
        retriesUsed: resolution.retriesUsed,
      });

      // Log resolution to database if enabled
      if (options?.databaseLogging?.enabled) {
        const { logConflictToDatabase, ConflictFailureReason } = await import('./conflictLogging');
        
        // Determine failure reason if resolution failed
        let failureReason: typeof ConflictFailureReason[keyof typeof ConflictFailureReason] | undefined;
        if (!resolution.success) {
          if (strategy.type === ResolutionStrategyType.FAIL) {
            failureReason = ConflictFailureReason.STRATEGY_FAILED;
          } else if (resolution.retriesUsed >= 3) {
            failureReason = ConflictFailureReason.MAX_RETRIES_EXCEEDED;
          } else if (strategy.type === ResolutionStrategyType.MERGE) {
            failureReason = ConflictFailureReason.MERGE_ERROR;
          } else {
            failureReason = ConflictFailureReason.UNKNOWN;
          }
        }
        
        await logConflictToDatabase(
          conflict,
          strategy.type,
          resolution.success,
          resolution.retriesUsed,
          {
            databases,
            databaseId,
            logsCollectionId: options.databaseLogging.logsCollectionId,
            userId: options.userId,
            sessionId: options.sessionId,
          },
          failureReason
        ).catch(() => {
          // Don't fail the main operation if logging fails
        });
      }

      return {
        success: resolution.success,
        data: resolution.data,
        version: resolution.data?.version as number | undefined,
        conflictDetected: true,
        retriesUsed: resolution.retriesUsed,
        error: resolution.error ? {
          type: 'VERSION_MISMATCH',
          message: resolution.error,
        } : undefined,
      };
    }
  }

  return directResult;
}



// ============================================================================
// Conflict Logging
// ============================================================================

/**
 * Log a conflict for monitoring and analysis.
 * 
 * This function logs conflict details in a structured format that can be
 * easily queried and analyzed for monitoring purposes.
 * 
 * @param conflict - Information about the conflict
 * @param resolution - Resolution strategy used
 * @param success - Whether the resolution was successful
 * @param sessionId - Optional session identifier for tracking
 * @param retriesUsed - Optional number of retries attempted (defaults to 0)
 * 
 * @example
 * ```typescript
 * logConflict(
 *   conflictInfo,
 *   { type: ResolutionStrategyType.MERGE, reason: 'Non-overlapping fields', retryable: true },
 *   true,
 *   'session-abc123',
 *   2
 * );
 * ```
 */
export function logConflict(
  conflict: ConflictInfo,
  resolution: ResolutionStrategy,
  success: boolean,
  sessionId?: string,
  retriesUsed?: number
): void {
  const logEntry: ConflictLogEntry = {
    timestamp: new Date().toISOString(),
    documentId: conflict.documentId,
    operationType: conflict.operationType,
    conflictType: conflict.conflictType,
    expectedVersion: conflict.expectedVersion,
    actualVersion: conflict.actualVersion,
    conflictingFields: conflict.conflictingFields,
    resolutionStrategy: resolution.type,
    resolutionSuccess: success,
    retriesUsed: retriesUsed ?? 0,
    sessionInfo: sessionId ? anonymizeSessionId(sessionId) : undefined,
  };

  // Log at appropriate level based on success
  if (success) {
    logger.info('[Concurrency] Conflict resolved', {
      documentId: logEntry.documentId,
      operationType: logEntry.operationType,
      strategy: logEntry.resolutionStrategy,
      conflictType: logEntry.conflictType,
      versionDiff: logEntry.actualVersion - logEntry.expectedVersion,
    });
  } else {
    logger.warn('[Concurrency] Conflict resolution failed', {
      documentId: logEntry.documentId,
      operationType: logEntry.operationType,
      strategy: logEntry.resolutionStrategy,
      conflictType: logEntry.conflictType,
      expectedVersion: logEntry.expectedVersion,
      actualVersion: logEntry.actualVersion,
      conflictingFields: logEntry.conflictingFields,
      reason: resolution.reason,
    });
  }
}

/**
 * Log a conflict with full details for debugging
 */
export function logConflictDetailed(
  conflict: ConflictInfo,
  resolution: ResolutionStrategy,
  result: ResolutionResult,
  sessionId?: string
): ConflictLogEntry {
  const logEntry: ConflictLogEntry = {
    timestamp: new Date().toISOString(),
    documentId: conflict.documentId,
    operationType: conflict.operationType,
    conflictType: conflict.conflictType,
    expectedVersion: conflict.expectedVersion,
    actualVersion: conflict.actualVersion,
    conflictingFields: conflict.conflictingFields,
    resolutionStrategy: resolution.type,
    resolutionSuccess: result.success,
    retriesUsed: result.retriesUsed,
    sessionInfo: sessionId ? anonymizeSessionId(sessionId) : undefined,
  };

  // Log with full context
  logger.info('[Concurrency] Conflict log entry', logEntry);

  return logEntry;
}

/**
 * Anonymize session ID for privacy in logs
 */
function anonymizeSessionId(sessionId: string): string {
  // Keep first 4 and last 4 characters, mask the rest
  if (sessionId.length <= 8) {
    return '****';
  }
  return `${sessionId.slice(0, 4)}****${sessionId.slice(-4)}`;
}

/**
 * Format a conflict for human-readable output
 */
export function formatConflictMessage(conflict: ConflictInfo): string {
  return [
    `Conflict detected on document ${conflict.documentId}`,
    `Operation: ${conflict.operationType}`,
    `Type: ${conflict.conflictType}`,
    `Version: expected ${conflict.expectedVersion}, found ${conflict.actualVersion}`,
    `Fields: ${conflict.conflictingFields.join(', ') || 'none'}`,
    `Groups: ${conflict.affectedGroups?.join(', ') || 'none'}`,
  ].join(' | ');
}

/**
 * Create a user-friendly error message for a conflict
 */
export function createUserFriendlyMessage(
  conflict: ConflictInfo,
  resolution: ResolutionStrategy
): string {
  switch (resolution.type) {
    case ResolutionStrategyType.MERGE:
      return 'Your changes have been merged with updates from another user.';
    case ResolutionStrategyType.LATEST_WINS:
      return 'Your changes have been applied as they are more recent.';
    case ResolutionStrategyType.RETRY:
      return 'Please try again - the record was updated by another user.';
    case ResolutionStrategyType.FAIL:
      return 'Unable to save changes due to a conflict. Please refresh and try again.';
    default:
      return 'An unexpected conflict occurred. Please refresh and try again.';
  }
}


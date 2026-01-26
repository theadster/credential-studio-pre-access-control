/**
 * Concurrency Error Messages and Types
 * 
 * Provides user-friendly error messages and type definitions for
 * concurrency-related errors. Maps technical errors to human-readable
 * explanations that help users understand what happened and what to do.
 * 
 * @module concurrencyErrors
 */

import { OptimisticLockErrorType } from './optimisticLock';
import { OperationType, ResolutionStrategyType } from './conflictResolver';

// ============================================================================
// Error Codes
// ============================================================================

/**
 * Concurrency-specific error codes for API responses
 */
export enum ConcurrencyErrorCode {
  /** Document version doesn't match expected version */
  VERSION_MISMATCH = 'CONCURRENCY_VERSION_MISMATCH',
  /** Maximum retry attempts exceeded */
  MAX_RETRIES_EXCEEDED = 'CONCURRENCY_MAX_RETRIES',
  /** Merge of conflicting changes failed */
  MERGE_FAILED = 'CONCURRENCY_MERGE_FAILED',
  /** Lock acquisition timed out */
  LOCK_TIMEOUT = 'CONCURRENCY_LOCK_TIMEOUT',
  /** Record was deleted during operation */
  RECORD_DELETED = 'CONCURRENCY_RECORD_DELETED',
  /** Bulk operation partially failed */
  PARTIAL_FAILURE = 'CONCURRENCY_PARTIAL_FAILURE',
}

// ============================================================================
// Error Message Templates
// ============================================================================

/**
 * User-friendly error message templates for different concurrency scenarios
 */
export const CONCURRENCY_ERROR_MESSAGES = {
  // Version mismatch errors
  [ConcurrencyErrorCode.VERSION_MISMATCH]: {
    title: 'Record Updated by Another User',
    message: 'This record was modified by another user while you were editing. Your changes could not be saved.',
    suggestion: 'Please refresh the page to see the latest data and try again.',
  },
  
  // Max retries exceeded
  [ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED]: {
    title: 'Unable to Save Changes',
    message: 'The system tried multiple times to save your changes, but the record keeps being modified by other users.',
    suggestion: 'Please wait a moment and try again, or refresh the page to see the latest data.',
  },
  
  // Merge failed
  [ConcurrencyErrorCode.MERGE_FAILED]: {
    title: 'Conflicting Changes Detected',
    message: 'Your changes conflict with changes made by another user and could not be automatically merged.',
    suggestion: 'Please refresh the page to see the latest data and re-apply your changes.',
  },
  
  // Lock timeout
  [ConcurrencyErrorCode.LOCK_TIMEOUT]: {
    title: 'Operation Timed Out',
    message: 'The system was unable to complete your request due to high activity on this record.',
    suggestion: 'Please try again in a few moments.',
  },
  
  // Record deleted
  [ConcurrencyErrorCode.RECORD_DELETED]: {
    title: 'Record No Longer Exists',
    message: 'The record you were editing has been deleted by another user.',
    suggestion: 'Please refresh the page to see the current list of records.',
  },
  
  // Partial failure in bulk operations
  [ConcurrencyErrorCode.PARTIAL_FAILURE]: {
    title: 'Some Changes Could Not Be Saved',
    message: 'Some records were updated successfully, but others could not be saved due to concurrent modifications.',
    suggestion: 'Please review the results and retry the failed items.',
  },
} as const;

/**
 * Operation-specific context messages
 */
export const OPERATION_CONTEXT_MESSAGES: Record<OperationType, string> = {
  [OperationType.CREDENTIAL_GENERATION]: 'generating credentials',
  [OperationType.PHOTO_UPLOAD]: 'uploading the photo',
  [OperationType.PROFILE_UPDATE]: 'updating the profile',
  [OperationType.BULK_EDIT]: 'performing bulk edit',
  [OperationType.CUSTOM_FIELD_UPDATE]: 'updating custom fields',
  [OperationType.ACCESS_CONTROL_UPDATE]: 'updating access control settings',
};

/**
 * Resolution strategy explanations for users
 */
export const RESOLUTION_EXPLANATIONS: Record<ResolutionStrategyType, string> = {
  [ResolutionStrategyType.MERGE]: 'Your changes have been merged with updates from another user.',
  [ResolutionStrategyType.LATEST_WINS]: 'Your changes have been applied as they are more recent.',
  [ResolutionStrategyType.RETRY]: 'The operation was retried and completed successfully.',
  [ResolutionStrategyType.FAIL]: 'The operation could not be completed automatically.',
};

// ============================================================================
// Error Response Interface
// ============================================================================

/**
 * Standardized API error response for concurrency issues
 */
export interface ConcurrencyErrorResponse {
  /** Short error description */
  error: string;
  /** Concurrency error code */
  code: ConcurrencyErrorCode;
  /** User-friendly message explaining what happened */
  message: string;
  /** Whether the operation can be retried */
  retryable: boolean;
  /** Additional details for debugging/logging */
  details: {
    /** ID of the affected document */
    documentId?: string;
    /** Type of conflict that occurred */
    conflictType?: string;
    /** Suggested action for the user */
    suggestion: string;
    /** Operation that was being performed */
    operation?: string;
    /** Number of retries attempted */
    retriesAttempted?: number;
    /** Fields that were in conflict */
    conflictingFields?: string[];
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map OptimisticLockErrorType to ConcurrencyErrorCode
 */
export function mapLockErrorToCode(errorType: OptimisticLockErrorType): ConcurrencyErrorCode {
  switch (errorType) {
    case 'VERSION_MISMATCH':
      return ConcurrencyErrorCode.VERSION_MISMATCH;
    case 'MAX_RETRIES_EXCEEDED':
      return ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED;
    case 'RECORD_NOT_FOUND':
      return ConcurrencyErrorCode.RECORD_DELETED;
    case 'UPDATE_FAILED':
    default:
      return ConcurrencyErrorCode.MERGE_FAILED;
  }
}

/**
 * Create a user-friendly error message for a concurrency error
 */
export function createUserFriendlyErrorMessage(
  code: ConcurrencyErrorCode,
  operationType?: OperationType
): string {
  const template = CONCURRENCY_ERROR_MESSAGES[code];
  const operationContext = operationType 
    ? OPERATION_CONTEXT_MESSAGES[operationType] 
    : 'saving your changes';
  
  return `${template.message} This happened while ${operationContext}.`;
}

/**
 * Create a standardized concurrency error response for API endpoints.
 * 
 * Retryable semantics:
 * - `retryable: true` means the client MAY retry the operation after a delay
 * - `retryable: false` means retrying will not help (record deleted, merge impossible)
 * 
 * Note: MAX_RETRIES_EXCEEDED is marked as NOT retryable because the server has
 * already exhausted automatic retries. The client should inform the user to try
 * again later rather than immediately retrying.
 */
export function createConcurrencyErrorResponse(options: {
  code: ConcurrencyErrorCode;
  documentId?: string;
  operationType?: OperationType;
  conflictingFields?: string[];
  retriesAttempted?: number;
  customMessage?: string;
}): ConcurrencyErrorResponse {
  const { code, documentId, operationType, conflictingFields, retriesAttempted, customMessage } = options;
  const template = CONCURRENCY_ERROR_MESSAGES[code];
  
  // Determine if the error is retryable by the client
  // Non-retryable: RECORD_DELETED (record gone), MERGE_FAILED (unresolvable conflict),
  // MAX_RETRIES_EXCEEDED (server already tried, client should wait before retrying),
  // PARTIAL_FAILURE (some operations failed, requires user intervention to review results)
  const retryable = code !== ConcurrencyErrorCode.RECORD_DELETED && 
                    code !== ConcurrencyErrorCode.MERGE_FAILED &&
                    code !== ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED &&
                    code !== ConcurrencyErrorCode.PARTIAL_FAILURE;
  
  return {
    error: template.title,
    code,
    message: customMessage || createUserFriendlyErrorMessage(code, operationType),
    retryable,
    details: {
      documentId,
      conflictType: code,
      suggestion: template.suggestion,
      operation: operationType ? OPERATION_CONTEXT_MESSAGES[operationType] : undefined,
      retriesAttempted,
      conflictingFields,
    },
  };
}

/**
 * Create a success message after conflict resolution
 */
export function createResolutionSuccessMessage(
  strategy: ResolutionStrategyType,
  operationType?: OperationType
): string {
  const explanation = RESOLUTION_EXPLANATIONS[strategy];
  const operationContext = operationType 
    ? OPERATION_CONTEXT_MESSAGES[operationType] 
    : 'your operation';
  
  if (strategy === ResolutionStrategyType.MERGE) {
    return `${explanation} Your ${operationContext} was completed successfully.`;
  }
  
  return explanation;
}

/**
 * Determine if an error code indicates a condition where immediate retry may succeed.
 * 
 * This is used for automatic retry logic within the system:
 * - VERSION_MISMATCH: Another operation completed first, retry with fresh data
 * - LOCK_TIMEOUT: Lock was held too long, retry may acquire it
 * 
 * NOT retryable (immediate retry won't help):
 * - MAX_RETRIES_EXCEEDED: System already tried multiple times
 * - RECORD_DELETED: Record no longer exists
 * - MERGE_FAILED: Conflict cannot be automatically resolved
 * - PARTIAL_FAILURE: Some operations failed, requires user intervention
 */
export function isRetryableError(code: ConcurrencyErrorCode): boolean {
  return code === ConcurrencyErrorCode.VERSION_MISMATCH ||
         code === ConcurrencyErrorCode.LOCK_TIMEOUT;
}

/**
 * Get the HTTP status code for a concurrency error
 */
export function getHttpStatusForError(code: ConcurrencyErrorCode): number {
  switch (code) {
    case ConcurrencyErrorCode.VERSION_MISMATCH:
    case ConcurrencyErrorCode.MERGE_FAILED:
    case ConcurrencyErrorCode.PARTIAL_FAILURE:
      return 409; // Conflict
    case ConcurrencyErrorCode.RECORD_DELETED:
      return 404; // Not Found
    case ConcurrencyErrorCode.LOCK_TIMEOUT:
      return 503; // Service Unavailable
    case ConcurrencyErrorCode.MAX_RETRIES_EXCEEDED:
    default:
      return 409; // Conflict
  }
}

/**
 * Format error details for logging (sanitized for privacy)
 */
export function formatErrorForLogging(response: ConcurrencyErrorResponse): Record<string, unknown> {
  return {
    code: response.code,
    retryable: response.retryable,
    documentId: response.details.documentId,
    operation: response.details.operation,
    retriesAttempted: response.details.retriesAttempted,
    conflictingFieldsCount: response.details.conflictingFields?.length || 0,
  };
}

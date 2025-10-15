/**
 * Transaction Utilities for Appwrite TablesDB API
 * 
 * This module provides reusable transaction patterns and error handling
 * for atomic operations using Appwrite's TablesDB API.
 * 
 * @module transactions
 */

import { TablesDB } from 'node-appwrite';
import type { NextApiResponse } from 'next';
import { recordTransaction } from './transactionMonitoring';

/**
 * Type augmentation for TablesDB to include transaction methods
 * These methods will be available in future versions of the Appwrite SDK
 */
declare module 'node-appwrite' {
  interface TablesDB {
    createTransaction(): Promise<{ $id: string }>;
    createOperations(params: {
      transactionId: string;
      operations: any[];
    }): Promise<void>;
    updateTransaction(params: {
      transactionId: string;
      commit?: boolean;
      rollback?: boolean;
    }): Promise<void>;
  }
}

/**
 * Transaction operation types supported by TablesDB
 */
export interface TransactionOperation {
  /** Operation type */
  action: 'create' | 'update' | 'upsert' | 'delete' | 
          'increment' | 'decrement' | 
          'bulkCreate' | 'bulkUpdate' | 'bulkUpsert' | 'bulkDelete';
  
  /** Target database ID */
  databaseId: string;
  
  /** Target table/collection ID */
  tableId: string;
  
  /** Row/document ID (optional for create, required for update/delete) */
  rowId?: string;
  
  /** Operation data */
  data?: {
    [key: string]: any;
  };
  
  /** For bulk operations - query filters */
  queries?: Array<{
    method: string;
    attribute: string;
    values: any[];
  }>;
  
  /** For atomic numeric operations */
  value?: number;
  min?: number;
  max?: number;
  column?: string;
}

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  /** Maximum number of retry attempts for conflicts (default: 3) */
  maxRetries?: number;
  
  /** Initial retry delay in milliseconds (default: 100) */
  retryDelay?: number;
  
  /** Transaction timeout in milliseconds */
  timeout?: number;
}

/**
 * Result of a transaction execution
 */
export interface TransactionResult {
  /** Whether the transaction succeeded */
  success: boolean;
  
  /** Transaction ID if successful */
  transactionId?: string;
  
  /** Error if failed */
  error?: Error;
  
  /** Number of retry attempts made */
  retries?: number;
}

/**
 * Transaction error types for categorizing failures
 */
export enum TransactionErrorType {
  /** Concurrent modification conflict (409) - retryable */
  CONFLICT = 'CONFLICT',
  
  /** Invalid data or validation error (400) - not retryable */
  VALIDATION = 'VALIDATION',
  
  /** Insufficient permissions (403) - not retryable */
  PERMISSION = 'PERMISSION',
  
  /** Resource not found (404) - not retryable */
  NOT_FOUND = 'NOT_FOUND',
  
  /** Exceeds plan limits (400) - not retryable */
  PLAN_LIMIT = 'PLAN_LIMIT',
  
  /** Network or timeout error (500) - retryable */
  NETWORK = 'NETWORK',
  
  /** Rollback failed (500) - critical */
  ROLLBACK = 'ROLLBACK',
  
  /** Unknown error (500) - not retryable */
  UNKNOWN = 'UNKNOWN'
}

/**
 * Extended error interface for transaction errors
 */
export interface TransactionError extends Error {
  /** Error type for categorization */
  type: TransactionErrorType;
  
  /** HTTP status code */
  code: number;
  
  /** Transaction ID if available */
  transactionId?: string;
  
  /** Operations that were attempted */
  operations?: TransactionOperation[];
  
  /** Number of retry attempts made */
  retries?: number;
  
  /** Whether this error is retryable */
  retryable?: boolean;
}

/**
 * Plan limits for transactions
 */
export const TRANSACTION_LIMITS = {
  FREE: 100,
  PRO: 1000,
  SCALE: 2500
} as const;

/**
 * Get current plan limit from environment or default to PRO
 * 
 * @returns The transaction operation limit for the current plan
 */
export function getTransactionLimit(): number {
  const plan = process.env.APPWRITE_PLAN?.toUpperCase() || 'PRO';
  return TRANSACTION_LIMITS[plan as keyof typeof TRANSACTION_LIMITS] || TRANSACTION_LIMITS.PRO;
}

/**
 * Execute operations within a transaction with automatic rollback
 * 
 * This function creates a transaction, executes the operations, and commits.
 * If any error occurs, it automatically rolls back the transaction.
 * 
 * @param tablesDB - TablesDB client instance
 * @param operations - Array of operations to execute
 * @param operationType - Type of operation for monitoring (optional)
 * @throws Error if transaction fails or rollback fails
 * 
 * @example
 * ```
 * await executeTransaction(tablesDB, [
 *   {
 *     action: 'create',
 *     databaseId: 'db123',
 *     tableId: 'attendees',
 *     rowId: ID.unique(),
 *     data: { name: 'John Doe' }
 *   }
 * ], 'attendee_create');
 * ```
 */
export async function executeTransaction(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  operationType: string = 'unknown'
): Promise<void> {
  const startTime = Date.now();
  const tx = await tablesDB.createTransaction();
  
  try {
    await tablesDB.createOperations({
      transactionId: tx.$id,
      operations
    });
    
    await tablesDB.updateTransaction({
      transactionId: tx.$id,
      commit: true
    });
    
    // Record successful transaction
    recordTransaction({
      transactionId: tx.$id,
      operationType,
      operationCount: operations.length,
      startTime,
      endTime: Date.now(),
      success: true,
      retries: 0,
      batched: false,
      usedFallback: false
    });
  } catch (error: any) {
    // Attempt to rollback the transaction
    let rollbackFailed = false;
    try {
      await tablesDB.updateTransaction({
        transactionId: tx.$id,
        rollback: true
      });
    } catch (rollbackError) {
      console.error('[Transaction] Rollback failed:', rollbackError);
      rollbackFailed = true;
    }
    
    // Record failed transaction
    recordTransaction({
      transactionId: tx.$id,
      operationType,
      operationCount: operations.length,
      startTime,
      endTime: Date.now(),
      success: false,
      retries: 0,
      batched: false,
      usedFallback: false,
      error: {
        type: rollbackFailed ? TransactionErrorType.ROLLBACK : detectTransactionErrorType(error),
        message: error.message,
        code: error.code
      }
    });
    
    throw error;
  }
}

/**
 * Execute transaction with retry logic for conflicts
 * 
 * This function automatically retries transactions that fail due to conflicts,
 * using exponential backoff between attempts.
 * 
 * @param tablesDB - TablesDB client instance
 * @param operations - Array of operations to execute
 * @param options - Transaction options including retry configuration
 * @param operationType - Type of operation for monitoring (optional)
 * @throws Error if transaction fails after all retries
 * 
 * @example
 * ```
 * await executeTransactionWithRetry(tablesDB, operations, {
 *   maxRetries: 3,
 *   retryDelay: 100
 * }, 'bulk_import');
 * ```
 */
export async function executeTransactionWithRetry(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  options: TransactionOptions = {},
  operationType: string = 'unknown'
): Promise<void> {
  const { maxRetries = 3, retryDelay = 100 } = options;
  const startTime = Date.now();
  let lastError: any;
  let transactionId = 'unknown';
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const tx = await tablesDB.createTransaction();
      transactionId = tx.$id;
      
      await tablesDB.createOperations({
        transactionId: tx.$id,
        operations
      });
      
      await tablesDB.updateTransaction({
        transactionId: tx.$id,
        commit: true
      });
      
      // Log successful retry if not first attempt
      if (attempt > 1) {
        console.log(`[Transaction] Succeeded on retry ${attempt}/${maxRetries}`);
      }
      
      // Record successful transaction
      recordTransaction({
        transactionId: tx.$id,
        operationType,
        operationCount: operations.length,
        startTime,
        endTime: Date.now(),
        success: true,
        retries: attempt - 1,
        batched: false,
        usedFallback: false
      });
      
      return; // Success
    } catch (error: any) {
      lastError = error;
      
      // Check if it's a conflict error (409) or contains 'conflict' in message
      const isConflict = error.code === 409 || 
                        error.message?.toLowerCase().includes('conflict');
      
      if (isConflict && attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.warn(
          `[Transaction] Conflict detected on attempt ${attempt}/${maxRetries}, ` +
          `retrying after ${delay}ms exponential backoff. ` +
          `Operations count: ${operations.length}`
        );
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Non-conflict error or max retries reached, don't retry
      if (!isConflict) {
        console.error(
          '[Transaction] Non-conflict error, not retrying:',
          error.message,
          `(code: ${error.code})`
        );
      } else {
        console.error(
          `[Transaction] Max retries (${maxRetries}) reached for conflict. ` +
          `Operations count: ${operations.length}. ` +
          `Total retry attempts: ${attempt - 1}`
        );
      }
      
      // Record failed transaction
      recordTransaction({
        transactionId,
        operationType,
        operationCount: operations.length,
        startTime,
        endTime: Date.now(),
        success: false,
        retries: attempt - 1,
        batched: false,
        usedFallback: false,
        error: {
          type: detectTransactionErrorType(error),
          message: error.message,
          code: error.code
        }
      });
      
      throw error;
    }
  }
  
  throw new Error(
    `Transaction failed after ${maxRetries} retries: ${lastError.message}`
  );
}

/**
 * Execute operations in batches to respect plan limits
 * 
 * This function automatically batches operations if they exceed the plan limit,
 * and includes fallback support to legacy API if needed.
 * 
 * @param tablesDB - TablesDB client instance
 * @param operations - Array of operations to execute
 * @param options - Batching and fallback options
 * @param operationType - Type of operation for monitoring (optional)
 * @returns Result indicating success, fallback usage, and batch count
 * 
 * @example
 * ```
 * const result = await executeBatchedTransaction(tablesDB, operations, {
 *   batchSize: 1000,
 *   enableFallback: true,
 *   fallbackFn: async () => { }
 * }, 'bulk_import');
 * ```
 */
export async function executeBatchedTransaction(
  tablesDB: TablesDB,
  operations: TransactionOperation[],
  options: {
    batchSize?: number;
    enableFallback?: boolean;
    fallbackFn?: () => Promise<any>;
  } = {},
  operationType: string = 'unknown'
): Promise<{
  success: boolean;
  usedFallback: boolean;
  batchCount?: number;
  error?: Error;
}> {
  const limit = getTransactionLimit();
  const batchSize = options.batchSize || (limit - 1); // Leave 1 for audit log
  const enableFallback = options.enableFallback ?? true;
  const startTime = Date.now();
  
  // Check if we need batching
  if (operations.length <= batchSize) {
    // Single transaction - no batching needed
    try {
      await executeTransactionWithRetry(tablesDB, operations, {}, operationType);
      return { success: true, usedFallback: false };
    } catch (error: any) {
      if (enableFallback && options.fallbackFn) {
        console.warn('[Transaction] Single transaction failed, using fallback', error);
        await options.fallbackFn();
        
        // Record fallback usage
        recordTransaction({
          transactionId: 'fallback',
          operationType,
          operationCount: operations.length,
          startTime,
          endTime: Date.now(),
          success: true,
          retries: 0,
          batched: false,
          usedFallback: true
        });
        
        return { success: true, usedFallback: true };
      }
      return { success: false, usedFallback: false, error };
    }
  }
  
  // Multiple transactions needed
  console.log(
    `[Transaction] Batching ${operations.length} operations into batches of ${batchSize}`
  );
  
  const batches = [];
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  
  try {
    for (let i = 0; i < batches.length; i++) {
      await executeTransactionWithRetry(tablesDB, batches[i], {}, `${operationType}_batch_${i + 1}`);
      console.log(`[Transaction] Batch ${i + 1}/${batches.length} complete`);
    }
    
    // Record successful batched transaction
    recordTransaction({
      transactionId: 'batched',
      operationType,
      operationCount: operations.length,
      startTime,
      endTime: Date.now(),
      success: true,
      retries: 0,
      batched: true,
      batchCount: batches.length,
      usedFallback: false
    });
    
    return { 
      success: true, 
      usedFallback: false, 
      batchCount: batches.length 
    };
  } catch (error: any) {
    console.error(`[Transaction] Batch failed:`, error);
    
    // If fallback is enabled and provided, use it
    if (enableFallback && options.fallbackFn) {
      console.warn('[Transaction] Batched transaction failed, using fallback');
      try {
        await options.fallbackFn();
        
        // Record fallback usage
        recordTransaction({
          transactionId: 'fallback',
          operationType,
          operationCount: operations.length,
          startTime,
          endTime: Date.now(),
          success: true,
          retries: 0,
          batched: true,
          batchCount: batches.length,
          usedFallback: true
        });
        
        return { success: true, usedFallback: true };
      } catch (fallbackError: any) {
        console.error('[Transaction] Fallback also failed:', fallbackError);
        throw new Error(
          `Both transaction and fallback failed. Transaction: ${error.message}, Fallback: ${fallbackError.message}`
        );
      }
    }
    
    throw new Error(
      `Batch ${error.message?.match(/Batch (\d+)/)?.[1] || 'unknown'}/${batches.length} failed: ${error.message}`
    );
  }
}

/**
 * Execute bulk operation with automatic fallback to legacy API
 * 
 * This is a high-level wrapper that attempts to use transactions first,
 * and falls back to the legacy API if transactions fail.
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Legacy Databases API client (for fallback)
 * @param operations - Array of transaction operations
 * @param legacyFn - Function to execute using legacy API
 * @param options - Operation metadata for logging
 * @returns Result with data, transaction usage flag, and batch count
 * 
 * @example
 * ```
 * const result = await executeBulkOperationWithFallback(
 *   tablesDB,
 *   databases,
 *   operations,
 *   async () => { },
 *   { operationType: 'import', itemCount: 100 }
 * );
 * ```
 */
export async function executeBulkOperationWithFallback<T>(
  tablesDB: TablesDB,
  databases: any, // Legacy Databases API
  operations: TransactionOperation[],
  legacyFn: () => Promise<T>,
  options: {
    operationType: 'import' | 'delete' | 'edit';
    itemCount: number;
  }
): Promise<{
  result: T | null;
  usedTransactions: boolean;
  batchCount?: number;
}> {
  const limit = getTransactionLimit();
  
  // Log operation details
  console.log(
    `[Bulk ${options.operationType}] Processing ${options.itemCount} items (limit: ${limit})`
  );
  
  try {
    // Attempt transaction-based approach
    const txResult = await executeBatchedTransaction(tablesDB, operations, {
      enableFallback: true,
      fallbackFn: legacyFn
    }, `bulk_${options.operationType}`);
    
    if (txResult.usedFallback) {
      console.log(`[Bulk ${options.operationType}] Used legacy API fallback`);
      const legacyResult = await legacyFn();
      return {
        result: legacyResult,
        usedTransactions: false
      };
    }
    
    console.log(
      `[Bulk ${options.operationType}] Completed with transactions (${txResult.batchCount || 1} batch(es))`
    );
    return {
      result: null as T, // Result is in the transaction
      usedTransactions: true,
      batchCount: txResult.batchCount
    };
  } catch (error) {
    console.error(
      `[Bulk ${options.operationType}] Transaction failed, falling back to legacy API`,
      error
    );
    
    // Fallback to legacy API
    const result = await legacyFn();
    return {
      result,
      usedTransactions: false
    };
  }
}

/**
 * Create operations for bulk delete with audit log
 * 
 * This helper creates an array of delete operations for multiple rows,
 * and includes an audit log entry in the same transaction.
 * 
 * @param databaseId - Database ID
 * @param tableId - Table/collection ID to delete from
 * @param rowIds - Array of row/document IDs to delete
 * @param auditLog - Audit log configuration
 * @returns Array of transaction operations
 * 
 * @example
 * ```
 * const operations = createBulkDeleteOperations(
 *   'db123',
 *   'attendees',
 *   ['id1', 'id2', 'id3'],
 *   {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_DELETE_ATTENDEES',
 *     details: { count: 3 }
 *   }
 * );
 * ```
 */
export function createBulkDeleteOperations(
  databaseId: string,
  tableId: string,
  rowIds: string[],
  auditLog: {
    tableId: string;
    userId: string;
    action: string;
    details: any;
  }
): TransactionOperation[] {
  const operations: TransactionOperation[] = rowIds.map(rowId => ({
    action: 'delete',
    databaseId,
    tableId,
    rowId
  }));
  
  // Add audit log as the final operation - rowId is required for create operations
  const { ID } = require('appwrite');
  operations.push({
    action: 'create',
    databaseId,
    tableId: auditLog.tableId,
    rowId: ID.unique(),
    data: {
      userId: auditLog.userId,
      action: auditLog.action,
      details: JSON.stringify(auditLog.details)
    }
  });
  
  return operations;
}

/**
 * Create operations for bulk update with audit log
 * 
 * This helper creates an array of update operations for multiple rows,
 * and includes an audit log entry in the same transaction.
 * 
 * @param databaseId - Database ID
 * @param tableId - Table/collection ID to update
 * @param updates - Array of updates with rowId and data
 * @param auditLog - Audit log configuration
 * @returns Array of transaction operations
 * 
 * @example
 * ```
 * const operations = createBulkUpdateOperations(
 *   'db123',
 *   'attendees',
 *   [
 *     { rowId: 'id1', data: { status: 'checked-in' } },
 *     { rowId: 'id2', data: { status: 'checked-in' } }
 *   ],
 *   {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_UPDATE_ATTENDEES',
 *     details: { count: 2, changes: { status: 'checked-in' } }
 *   }
 * );
 * ```
 */
export function createBulkUpdateOperations(
  databaseId: string,
  tableId: string,
  updates: Array<{ rowId: string; data: any }>,
  auditLog: {
    tableId: string;
    userId: string;
    action: string;
    details: any;
  }
): TransactionOperation[] {
  const operations: TransactionOperation[] = updates.map(({ rowId, data }) => ({
    action: 'update',
    databaseId,
    tableId,
    rowId,
    data
  }));
  
  // Add audit log as the final operation - rowId is required for create operations
  const { ID } = require('appwrite');
  operations.push({
    action: 'create',
    databaseId,
    tableId: auditLog.tableId,
    rowId: ID.unique(),
    data: {
      userId: auditLog.userId,
      action: auditLog.action,
      details: JSON.stringify(auditLog.details)
    }
  });
  
  return operations;
}

/**
 * Create operations for bulk create with audit log
 * 
 * This helper creates an array of create operations for multiple rows,
 * and includes an audit log entry in the same transaction.
 * 
 * @param databaseId - Database ID
 * @param tableId - Table/collection ID to create in
 * @param items - Array of items with rowId and data
 * @param auditLog - Audit log configuration
 * @returns Array of transaction operations
 * 
 * @example
 * ```
 * const operations = createBulkCreateOperations(
 *   'db123',
 *   'attendees',
 *   [
 *     { rowId: ID.unique(), data: { name: 'John Doe' } },
 *     { rowId: ID.unique(), data: { name: 'Jane Smith' } }
 *   ],
 *   {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_IMPORT_ATTENDEES',
 *     details: { count: 2 }
 *   }
 * );
 * ```
 */
export function createBulkCreateOperations(
  databaseId: string,
  tableId: string,
  items: Array<{ rowId: string; data: any }>,
  auditLog: {
    tableId: string;
    userId: string;
    action: string;
    details: any;
  }
): TransactionOperation[] {
  const operations: TransactionOperation[] = items.map(({ rowId, data }) => ({
    action: 'create',
    databaseId,
    tableId,
    rowId,
    data
  }));
  
  // Add audit log as the final operation - rowId is required for create operations
  const { ID } = require('appwrite');
  operations.push({
    action: 'create',
    databaseId,
    tableId: auditLog.tableId,
    rowId: ID.unique(),
    data: {
      userId: auditLog.userId,
      action: auditLog.action,
      details: JSON.stringify(auditLog.details)
    }
  });
  
  return operations;
}

/**
 * Handle transaction errors with appropriate HTTP responses
 * 
 * This function analyzes transaction errors and returns appropriate HTTP
 * status codes and user-friendly error messages. It categorizes errors
 * into retryable and non-retryable types.
 * 
 * @param error - The error that occurred during transaction
 * @param res - Next.js API response object
 * 
 * @example
 * ```
 * try {
 *   await executeTransaction(tablesDB, operations);
 * } catch (error) {
 *   return handleTransactionError(error, res);
 * }
 * ```
 */
export function handleTransactionError(
  error: any,
  res: NextApiResponse
): void {
  // Log the error for debugging
  console.error('[Transaction Error]', {
    message: error.message,
    code: error.code,
    type: error.type,
    stack: error.stack
  });

  // Conflict errors - retryable
  if (error.code === 409 || error.message?.toLowerCase().includes('conflict')) {
    return res.status(409).json({
      error: 'Transaction conflict',
      message: 'The data was modified by another user while you were making changes. Please refresh the page and try again.',
      retryable: true,
      type: TransactionErrorType.CONFLICT,
      details: {
        suggestion: 'Refresh the page to get the latest data, then retry your operation.'
      }
    });
  }

  // Validation errors - not retryable
  if (error.code === 400 && !error.message?.toLowerCase().includes('limit')) {
    return res.status(400).json({
      error: 'Validation error',
      message: error.message || 'The provided data is invalid. Please check your input and try again.',
      retryable: false,
      type: TransactionErrorType.VALIDATION,
      details: {
        suggestion: 'Review the error message and correct the invalid data.'
      }
    });
  }

  // Plan limit errors - not retryable
  if (error.code === 400 && error.message?.toLowerCase().includes('limit')) {
    return res.status(400).json({
      error: 'Plan limit exceeded',
      message: 'This operation exceeds your plan limits. Please contact support to upgrade your plan or reduce the operation size.',
      retryable: false,
      type: TransactionErrorType.PLAN_LIMIT,
      details: {
        suggestion: 'Try processing fewer items at once or upgrade your plan.'
      }
    });
  }

  // Permission errors - not retryable
  if (error.code === 403 || error.message?.toLowerCase().includes('permission')) {
    return res.status(403).json({
      error: 'Permission denied',
      message: error.message || 'You do not have permission to perform this operation.',
      retryable: false,
      type: TransactionErrorType.PERMISSION,
      details: {
        suggestion: 'Contact your administrator to request the necessary permissions.'
      }
    });
  }

  // Not found errors - not retryable
  if (error.code === 404 || error.message?.toLowerCase().includes('not found')) {
    return res.status(404).json({
      error: 'Resource not found',
      message: error.message || 'The requested resource could not be found. It may have been deleted.',
      retryable: false,
      type: TransactionErrorType.NOT_FOUND,
      details: {
        suggestion: 'Refresh the page to see the current state of your data.'
      }
    });
  }

  // Rollback errors - critical
  if (error.message?.toLowerCase().includes('rollback')) {
    return res.status(500).json({
      error: 'Transaction rollback failed',
      message: 'The transaction failed and could not be rolled back properly. The database may be in an inconsistent state. Please contact support immediately.',
      retryable: false,
      type: TransactionErrorType.ROLLBACK,
      details: {
        suggestion: 'Contact support immediately. Do not retry this operation.',
        critical: true
      }
    });
  }

  // Network/timeout errors - retryable
  if (
    error.code === 500 || 
    error.code === 503 ||
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('connection')
  ) {
    return res.status(500).json({
      error: 'Network error',
      message: 'The operation timed out or encountered a network error. Please try again in a moment.',
      retryable: true,
      type: TransactionErrorType.NETWORK,
      details: {
        suggestion: 'Wait a moment and try again. If the problem persists, check your internet connection.'
      }
    });
  }

  // Unknown errors - not retryable by default
  return res.status(500).json({
    error: 'Internal server error',
    message: error.message || 'An unexpected error occurred. Please try again or contact support if the problem persists.',
    retryable: false,
    type: TransactionErrorType.UNKNOWN,
    details: {
      suggestion: 'If this error continues, please contact support with the error details.'
    }
  });
}

/**
 * Detect the type of transaction error
 * 
 * This helper function categorizes errors into specific types for
 * better error handling and user feedback.
 * 
 * @param error - The error to categorize
 * @returns The detected error type
 * 
 * @example
 * ```
 * const errorType = detectTransactionErrorType(error);
 * if (errorType === TransactionErrorType.CONFLICT) {
 *   // Handle conflict
 * }
 * ```
 */
export function detectTransactionErrorType(error: any): TransactionErrorType {
  // Conflict errors
  if (error.code === 409 || error.message?.toLowerCase().includes('conflict')) {
    return TransactionErrorType.CONFLICT;
  }

  // Validation errors
  if (error.code === 400 && !error.message?.toLowerCase().includes('limit')) {
    return TransactionErrorType.VALIDATION;
  }

  // Plan limit errors
  if (error.code === 400 && error.message?.toLowerCase().includes('limit')) {
    return TransactionErrorType.PLAN_LIMIT;
  }

  // Permission errors
  if (error.code === 403 || error.message?.toLowerCase().includes('permission')) {
    return TransactionErrorType.PERMISSION;
  }

  // Not found errors
  if (error.code === 404 || error.message?.toLowerCase().includes('not found')) {
    return TransactionErrorType.NOT_FOUND;
  }

  // Rollback errors
  if (error.message?.toLowerCase().includes('rollback')) {
    return TransactionErrorType.ROLLBACK;
  }

  // Network/timeout errors
  if (
    error.code === 500 || 
    error.code === 503 ||
    error.message?.toLowerCase().includes('timeout') ||
    error.message?.toLowerCase().includes('network') ||
    error.message?.toLowerCase().includes('connection')
  ) {
    return TransactionErrorType.NETWORK;
  }

  // Unknown errors
  return TransactionErrorType.UNKNOWN;
}

/**
 * Check if an error is retryable
 * 
 * Determines whether a transaction error should be retried based on its type.
 * 
 * @param error - The error to check
 * @returns True if the error is retryable
 * 
 * @example
 * ```
 * if (isRetryableError(error)) {
 *   await retryOperation();
 * }
 * ```
 */
export function isRetryableError(error: any): boolean {
  const errorType = detectTransactionErrorType(error);
  
  // Only conflict and network errors are retryable
  return errorType === TransactionErrorType.CONFLICT || 
         errorType === TransactionErrorType.NETWORK;
}

/**
 * Create a user-friendly error message for a transaction error
 * 
 * Generates clear, actionable error messages for end users based on
 * the error type.
 * 
 * @param error - The error to create a message for
 * @returns User-friendly error message
 * 
 * @example
 * ```
 * const message = createErrorMessage(error);
 * console.log(message);
 * ```
 */
export function createErrorMessage(error: any): string {
  const errorType = detectTransactionErrorType(error);
  
  switch (errorType) {
    case TransactionErrorType.CONFLICT:
      return 'The data was modified by another user. Please refresh and try again.';
    
    case TransactionErrorType.VALIDATION:
      return error.message || 'The provided data is invalid. Please check your input.';
    
    case TransactionErrorType.PERMISSION:
      return 'You do not have permission to perform this operation.';
    
    case TransactionErrorType.NOT_FOUND:
      return 'The requested resource could not be found. It may have been deleted.';
    
    case TransactionErrorType.PLAN_LIMIT:
      return 'This operation exceeds your plan limits. Please contact support.';
    
    case TransactionErrorType.NETWORK:
      return 'Network error. Please check your connection and try again.';
    
    case TransactionErrorType.ROLLBACK:
      return 'Transaction failed and could not be rolled back. Please contact support immediately.';
    
    case TransactionErrorType.UNKNOWN:
    default:
      return error.message || 'An unexpected error occurred. Please try again or contact support.';
  }
}

/**
 * Type definitions for Appwrite database operators
 * 
 * This module provides TypeScript types and error classes for working with
 * Appwrite's atomic database operators.
 */

/**
 * Supported operator types for atomic database operations
 * 
 * @remarks
 * These operators enable server-side atomic operations on database fields,
 * eliminating race conditions and improving performance.
 */
export enum OperatorType {
  /** Increment a numeric field */
  INCREMENT = 'increment',
  /** Decrement a numeric field */
  DECREMENT = 'decrement',
  /** Multiply a numeric field */
  MULTIPLY = 'multiply',
  /** Divide a numeric field */
  DIVIDE = 'divide',
  /** Raise a numeric field to a power */
  POWER = 'power',
  /** Calculate modulo of a numeric field */
  MODULO = 'modulo',
  /** Append values to an array */
  ARRAY_APPEND = 'arrayAppend',
  /** Prepend values to an array */
  ARRAY_PREPEND = 'arrayPrepend',
  /** Remove a value from an array */
  ARRAY_REMOVE = 'arrayRemove',
  /** Insert a value at a specific index in an array */
  ARRAY_INSERT = 'arrayInsert',
  /** Filter array elements based on conditions */
  ARRAY_FILTER = 'arrayFilter',
  /** Remove duplicate values from an array */
  ARRAY_UNIQUE = 'arrayUnique',
  /** Remove specified values from an array */
  ARRAY_DIFF = 'arrayDiff',
  /** Concatenate a string */
  STRING_CONCAT = 'stringConcat',
  /** Set a date field to current server time */
  DATE_SET_NOW = 'dateSetNow'
}

/**
 * Context information for operator usage logging and monitoring
 * 
 * @remarks
 * This interface captures metadata about operator operations for debugging,
 * monitoring, and audit purposes.
 */
export interface OperatorContext {
  /** The operation being performed (e.g., 'credential_generation', 'photo_upload') */
  operation: string;
  
  /** The database field being modified */
  field: string;
  
  /** The type of operator being used */
  operatorType: OperatorType;
  
  /** Optional value being applied (for logging purposes) */
  value?: any;
  
  /** ISO 8601 timestamp of when the operation was initiated */
  timestamp: string;
  
  /** Optional user ID who initiated the operation */
  userId?: string;
  
  /** Optional collection/table name */
  collection?: string;
  
  /** Optional document/row ID */
  documentId?: string;
}

/**
 * Base error class for operator-related errors
 * 
 * @remarks
 * This error class provides structured error information for operator failures,
 * including the operator type, field name, and original error if available.
 */
export class OperatorError extends Error {
  /** The type of operator that caused the error */
  public readonly operatorType: OperatorType;
  
  /** The field that was being operated on */
  public readonly field: string;
  
  /** The original error that caused this error, if any */
  public readonly originalError?: Error;
  
  /**
   * Creates a new OperatorError
   * 
   * @param message - Human-readable error message
   * @param operatorType - The type of operator that failed
   * @param field - The field that was being operated on
   * @param originalError - Optional original error that caused this error
   */
  constructor(
    message: string,
    operatorType: OperatorType,
    field: string,
    originalError?: Error
  ) {
    super(message);
    this.name = 'OperatorError';
    this.operatorType = operatorType;
    this.field = field;
    this.originalError = originalError;
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OperatorError);
    }
  }
}

/**
 * Error class for operator validation failures
 * 
 * @remarks
 * This error is thrown when operator parameters fail validation before
 * the operation is executed (e.g., invalid types, out of bounds values).
 */
export class OperatorValidationError extends OperatorError {
  /**
   * Creates a new OperatorValidationError
   * 
   * @param message - Human-readable validation error message
   * @param operatorType - The type of operator that failed validation
   * @param field - The field that was being validated
   */
  constructor(
    message: string,
    operatorType: OperatorType,
    field: string
  ) {
    super(message, operatorType, field);
    this.name = 'OperatorValidationError';
    
    // Maintains proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, OperatorValidationError);
    }
  }
}

/**
 * Type guard to check if an error is an OperatorError
 * 
 * @param error - The error to check
 * @returns True if the error is an OperatorError
 */
export function isOperatorError(error: unknown): error is OperatorError {
  return error instanceof OperatorError;
}

/**
 * Type guard to check if an error is an OperatorValidationError
 * 
 * @param error - The error to check
 * @returns True if the error is an OperatorValidationError
 */
export function isOperatorValidationError(error: unknown): error is OperatorValidationError {
  return error instanceof OperatorValidationError;
}

/**
 * Operator Utility Module
 * 
 * Provides type-safe wrappers around Appwrite's Operator class for atomic database operations.
 * Includes validation and error handling for all operator types.
 * Integrates with monitoring and feature flags for production deployment.
 */

import { Operator } from 'appwrite';
import { logOperatorUsage } from './operatorMonitoring';
import { OperatorType } from '@/types/operators';

/**
 * Options for numeric operators with optional bounds checking
 */
export interface NumericOperatorOptions {
  /** Minimum value constraint */
  min?: number;
  /** Maximum value constraint */
  max?: number;
}

/**
 * Creates an increment operator with optional bounds checking
 * 
 * @param value - The amount to increment by
 * @param options - Optional bounds checking configuration
 * @returns Appwrite Operator instance
 * @throws {Error} If value is not a valid number
 * 
 * @example
 * ```typescript
 * // Simple increment
 * const op = createIncrement(1);
 * 
 * // Increment with max bound
 * const op = createIncrement(1, { max: 100 });
 * ```
 */
export function createIncrement(
  value: number,
  options?: NumericOperatorOptions
): unknown {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Increment value must be a valid number', {
      cause: { receivedValue: value, receivedType: typeof value }
    } as any);
  }
  
  if (options?.max !== undefined) {
    return Operator.increment(value, options.max);
  }
  
  return Operator.increment(value);
}

/**
 * Creates a decrement operator with optional bounds checking
 * 
 * @param value - The amount to decrement by
 * @param options - Optional bounds checking configuration
 * @returns Appwrite Operator instance
 * @throws {Error} If value is not a valid number
 * 
 * @example
 * ```typescript
 * // Simple decrement
 * const op = createDecrement(1);
 * 
 * // Decrement with min bound (won't go below 0)
 * const op = createDecrement(1, { min: 0 });
 * ```
 */
export function createDecrement(
  value: number,
  options?: NumericOperatorOptions
): unknown {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Decrement value must be a valid number', {
      cause: { receivedValue: value, receivedType: typeof value }
    } as any);
  }
  
  if (options?.min !== undefined) {
    return Operator.decrement(value, options.min);
  }
  
  return Operator.decrement(value);
}

/**
 * Creates a multiply operator
 * 
 * @param value - The multiplier value
 * @returns Appwrite Operator instance
 * @throws {Error} If value is not a valid number
 */
export function createMultiply(value: number): unknown {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Multiply value must be a valid number', {
      cause: { receivedValue: value, receivedType: typeof value }
    } as any);
  }
  
  return Operator.multiply(value);
}

/**
 * Creates a divide operator
 * 
 * @param value - The divisor value
 * @returns Appwrite Operator instance
 * @throws {Error} If value is not a valid number or is zero
 */
export function createDivide(value: number): unknown {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Divide value must be a valid number', {
      cause: { receivedValue: value, receivedType: typeof value }
    } as any);
  }
  
  if (value === 0) {
    throw new Error('Cannot divide by zero', {
      cause: { attemptedDivisor: value }
    } as any);
  }
  
  return Operator.divide(value);
}

/**
 * Creates a power operator
 * 
 * @param value - The exponent value
 * @returns Appwrite Operator instance
 * @throws {Error} If value is not a valid number
 */
export function createPower(value: number): unknown {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Power value must be a valid number', {
      cause: { receivedValue: value, receivedType: typeof value }
    } as any);
  }
  
  return Operator.power(value);
}

/**
 * Creates a modulo operator
 * 
 * @param value - The divisor for modulo operation
 * @returns Appwrite Operator instance
 * @throws {Error} If value is not a valid number or is zero
 */
export function createModulo(value: number): unknown {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error('Modulo value must be a valid number', {
      cause: { receivedValue: value, receivedType: typeof value }
    } as any);
  }
  
  if (value === 0) {
    throw new Error('Modulo divisor cannot be zero', {
      cause: { attemptedDivisor: value }
    } as any);
  }
  
  return Operator.modulo(value);
}

/**
 * Array operator helpers for atomic array manipulation
 */
export const arrayOperators = {
  /**
   * Appends values to the end of an array
   * 
   * @param values - Array of values to append
   * @returns Appwrite Operator instance
   * @throws {Error} If values is not an array
   */
  append: (values: any[]): unknown => {
    if (!Array.isArray(values)) {
      throw new Error('arrayAppend requires an array', {
        cause: { receivedValue: values, receivedType: typeof values }
      } as any);
    }
    return Operator.arrayAppend(values);
  },
  
  /**
   * Prepends values to the beginning of an array
   * 
   * @param values - Array of values to prepend
   * @returns Appwrite Operator instance
   * @throws {Error} If values is not an array
   */
  prepend: (values: any[]): unknown => {
    if (!Array.isArray(values)) {
      throw new Error('arrayPrepend requires an array', {
        cause: { receivedValue: values, receivedType: typeof values }
      } as any);
    }
    return Operator.arrayPrepend(values);
  },
  
  /**
   * Removes a value from an array
   * 
   * @param value - Value to remove
   * @returns Appwrite Operator instance
   */
  remove: (value: any): unknown => {
    return Operator.arrayRemove(value);
  },
  
  /**
   * Inserts a value at a specific index in an array
   * 
   * @param index - Zero-based index where to insert
   * @param value - Value to insert
   * @returns Appwrite Operator instance
   * @throws {Error} If index is not a non-negative number
   */
  insert: (index: number, value: any): unknown => {
    if (typeof index !== 'number' || index < 0) {
      throw new Error('arrayInsert requires a non-negative index', {
        cause: { receivedIndex: index, receivedType: typeof index }
      } as any);
    }
    return Operator.arrayInsert(index, value);
  },
  
  /**
   * Removes duplicate values from an array
   * 
   * @returns Appwrite Operator instance
   */
  unique: (): unknown => {
    return Operator.arrayUnique();
  },
  
  /**
   * Removes specified values from an array
   * 
   * @param values - Array of values to remove
   * @returns Appwrite Operator instance
   * @throws {Error} If values is not an array
   */
  diff: (values: any[]): unknown => {
    if (!Array.isArray(values)) {
      throw new Error('arrayDiff requires an array', {
        cause: { receivedValue: values, receivedType: typeof values }
      } as any);
    }
    return Operator.arrayDiff(values);
  }
};

/**
 * String operator helpers for atomic string manipulation
 */
export const stringOperators = {
  /**
   * Concatenates a string to the end of an existing string
   * 
   * @param value - String to concatenate
   * @returns Appwrite Operator instance
   * @throws {Error} If value is not a string
   */
  concat: (value: string): unknown => {
    if (typeof value !== 'string') {
      throw new Error('stringConcat requires a string value', {
        cause: { receivedValue: value, receivedType: typeof value }
      } as any);
    }
    return Operator.stringConcat(value);
  }
};

/**
 * Date operator helpers for atomic date manipulation
 */
export const dateOperators = {
  /**
   * Sets a date field to the current server time
   * 
   * @returns Appwrite Operator instance
   */
  setNow: (): unknown => {
    return Operator.dateSetNow();
  }
};

/**
 * Execute an operator with monitoring and error tracking
 * 
 * @param operatorFn - Function that returns the operator
 * @param context - Context information for logging
 * @returns The operator result
 */
export function executeOperatorWithMonitoring<T>(
  operatorFn: () => T,
  context: {
    operatorType: OperatorType;
    field: string;
    collection: string;
    operation: string;
    userId?: string;
  }
): T {
  const startTime = Date.now();
  let success = false;
  let errorMessage: string | undefined;

  try {
    const result = operatorFn();
    success = true;
    return result;
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw error;
  } finally {
    const duration = Date.now() - startTime;

    // Log the operation
    logOperatorUsage({
      timestamp: new Date().toISOString(),
      operatorType: context.operatorType,
      field: context.field,
      collection: context.collection,
      operation: context.operation,
      success,
      duration,
      errorMessage,
      userId: context.userId,
      fallback: false,
    });
  }
}

/**
 * Log a fallback operation (when operator fails and traditional update is used)
 */
export function logOperatorFallback(context: {
  operatorType: OperatorType;
  field: string;
  collection: string;
  operation: string;
  userId?: string;
  errorMessage: string;
}): void {
  logOperatorUsage({
    timestamp: new Date().toISOString(),
    operatorType: context.operatorType,
    field: context.field,
    collection: context.collection,
    operation: context.operation,
    success: false,
    duration: 0,
    errorMessage: context.errorMessage,
    userId: context.userId,
    fallback: true,
  });
}

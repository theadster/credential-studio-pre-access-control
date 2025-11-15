/**
 * Type Guard Utilities
 * 
 * This module provides generic type guard functions for common TypeScript
 * type checking scenarios. These utilities help narrow types safely and
 * enable proper type inference in conditional blocks.
 */

/**
 * Type guard to check if a value is an Error instance.
 * 
 * @param value - The value to check
 * @returns True if the value is an Error instance, false otherwise
 * 
 * @example
 * ```typescript
 * try {
 *   // some code
 * } catch (error: unknown) {
 *   if (isError(error)) {
 *     console.error(error.message); // Type-safe access to message
 *   }
 * }
 * ```
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if an object has a specific property.
 * 
 * @param obj - The object to check
 * @param prop - The property name to look for
 * @returns True if the object has the property, false otherwise
 * 
 * @example
 * ```typescript
 * const data: unknown = { name: 'John', age: 30 };
 * 
 * if (hasProperty(data, 'name')) {
 *   console.log(data.name); // Type-safe access to name property
 * }
 * ```
 */
export function hasProperty<T extends string>(
  obj: unknown,
  prop: T
): obj is Record<T, unknown> {
  return typeof obj === 'object' && obj !== null && prop in obj;
}

/**
 * Type guard for fulfilled Promise.allSettled results.
 * 
 * @param result - A PromiseSettledResult to check
 * @returns True if the result is fulfilled, false otherwise
 * 
 * @example
 * ```typescript
 * const results = await Promise.allSettled([promise1, promise2]);
 * const values = results.filter(isFulfilled).map(r => r.value);
 * ```
 */
export function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

/**
 * Type guard for rejected Promise.allSettled results.
 * 
 * @param result - A PromiseSettledResult to check
 * @returns True if the result is rejected, false otherwise
 * 
 * @example
 * ```typescript
 * const results = await Promise.allSettled([promise1, promise2]);
 * const errors = results.filter(isRejected).map(r => r.reason);
 * ```
 */
export function isRejected<T>(
  result: PromiseSettledResult<T>
): result is PromiseRejectedResult {
  return result.status === 'rejected';
}

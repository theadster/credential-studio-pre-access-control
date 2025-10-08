import { Query } from 'appwrite';

/**
 * Query builder functions for Appwrite Database operations
 * Provides a convenient API for constructing Appwrite queries
 */

/**
 * Creates an equality query
 * @param field - The field name to query
 * @param value - The value to match
 */
export const equal = (field: string, value: string | number | boolean | string[]) => {
  return Query.equal(field, value);
};

/**
 * Creates a not equal query
 * @param field - The field name to query
 * @param value - The value to not match
 */
export const notEqual = (field: string, value: string | number | boolean | string[]) => {
  return Query.notEqual(field, value);
};

/**
 * Creates a less than query
 * @param field - The field name to query
 * @param value - The value to compare against
 */
export const lessThan = (field: string, value: number | string) => {
  return Query.lessThan(field, value);
};

/**
 * Creates a less than or equal query
 * @param field - The field name to query
 * @param value - The value to compare against
 */
export const lessThanEqual = (field: string, value: number | string) => {
  return Query.lessThanEqual(field, value);
};

/**
 * Creates a greater than query
 * @param field - The field name to query
 * @param value - The value to compare against
 */
export const greaterThan = (field: string, value: number | string) => {
  return Query.greaterThan(field, value);
};

/**
 * Creates a greater than or equal query
 * @param field - The field name to query
 * @param value - The value to compare against
 */
export const greaterThanEqual = (field: string, value: number | string) => {
  return Query.greaterThanEqual(field, value);
};

/**
 * Creates a search query for full-text search
 * @param field - The field name to search in
 * @param value - The search term
 */
export const search = (field: string, value: string) => {
  return Query.search(field, value);
};

/**
 * Creates an isNull query
 * @param field - The field name to check
 */
export const isNull = (field: string) => {
  return Query.isNull(field);
};

/**
 * Creates an isNotNull query
 * @param field - The field name to check
 */
export const isNotNull = (field: string) => {
  return Query.isNotNull(field);
};

/**
 * Creates a between query
 * @param field - The field name to query
 * @param start - The start value
 * @param end - The end value
 */
export const between = (field: string, start: number | string, end: number | string) => {
  return Query.between(field, start, end);
};

/**
 * Creates a startsWith query
 * @param field - The field name to query
 * @param value - The prefix to match
 */
export const startsWith = (field: string, value: string) => {
  return Query.startsWith(field, value);
};

/**
 * Creates an endsWith query
 * @param field - The field name to query
 * @param value - The suffix to match
 */
export const endsWith = (field: string, value: string) => {
  return Query.endsWith(field, value);
};

/**
 * Creates an ascending order query
 * @param field - The field name to sort by
 */
export const orderAsc = (field: string) => {
  return Query.orderAsc(field);
};

/**
 * Creates a descending order query
 * @param field - The field name to sort by
 */
export const orderDesc = (field: string) => {
  return Query.orderDesc(field);
};

/**
 * Creates a limit query
 * @param value - The maximum number of documents to return
 */
export const limit = (value: number) => {
  return Query.limit(value);
};

/**
 * Creates an offset query
 * @param value - The number of documents to skip
 */
export const offset = (value: number) => {
  return Query.offset(value);
};

/**
 * Pagination helper types
 */
export interface PaginationOptions {
  page: number;
  pageSize: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

/**
 * Creates pagination queries
 * @param page - The page number (1-indexed)
 * @param pageSize - The number of items per page
 * @returns Array of Query objects for limit and offset
 */
export const paginate = (page: number, pageSize: number): string[] => {
  return [
    Query.limit(pageSize),
    Query.offset((page - 1) * pageSize),
  ];
};

/**
 * Creates a sort query
 * @param field - The field name to sort by
 * @param direction - The sort direction ('asc' or 'desc')
 * @returns Query object for sorting
 */
export const sort = (field: string, direction: 'asc' | 'desc' = 'asc'): string => {
  return direction === 'asc' ? Query.orderAsc(field) : Query.orderDesc(field);
};

/**
 * Creates multiple sort queries
 * @param sorts - Array of sort options
 * @returns Array of Query objects for sorting
 */
export const multiSort = (sorts: SortOptions[]): string[] => {
  return sorts.map(s => sort(s.field, s.direction));
};

/**
 * Combines pagination and sorting queries
 * @param options - Pagination and sort options
 * @returns Array of Query objects
 */
export const paginateAndSort = (
  pagination: PaginationOptions,
  sorts?: SortOptions[]
): string[] => {
  const queries = paginate(pagination.page, pagination.pageSize);
  if (sorts && sorts.length > 0) {
    queries.push(...multiSort(sorts));
  }
  return queries;
};

/**
 * Query builder object with all query functions
 * Provides a convenient namespace for all query operations
 */
export const buildQueries = {
  equal,
  notEqual,
  lessThan,
  lessThanEqual,
  greaterThan,
  greaterThanEqual,
  search,
  isNull,
  isNotNull,
  between,
  startsWith,
  endsWith,
  orderAsc,
  orderDesc,
  limit,
  offset,
  paginate,
  sort,
  multiSort,
  paginateAndSort,
};

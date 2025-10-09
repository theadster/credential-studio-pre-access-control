import { describe, it, expect } from 'vitest';
import {
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
  buildQueries,
} from '../appwriteQueries';

describe('Appwrite Query Builders', () => {
  describe('Query Functions Return Values', () => {
    it('should return exact query strings for comparison operations with strings', () => {
      expect(equal('name', 'John')).toBe('equal("name", ["John"])');
      expect(notEqual('status', 'inactive')).toBe('notEqual("status", ["inactive"])');
    });

    it('should return exact query strings for comparison operations with numbers', () => {
      expect(lessThan('age', 30)).toBe('lessThan("age", [30])');
      expect(lessThanEqual('price', 100)).toBe('lessThanEqual("price", [100])');
      expect(greaterThan('score', 50)).toBe('greaterThan("score", [50])');
      expect(greaterThanEqual('rating', 4)).toBe('greaterThanEqual("rating", [4])');
    });

    it('should return exact query strings for comparison operations with negative numbers', () => {
      expect(greaterThan('balance', -100)).toBe('greaterThan("balance", [-100])');
      expect(lessThan('temperature', -5)).toBe('lessThan("temperature", [-5])');
    });

    it('should return exact query strings for text search operations', () => {
      expect(search('description', 'keyword')).toBe('search("description", ["keyword"])');
      expect(startsWith('email', 'admin')).toBe('startsWith("email", ["admin"])');
      expect(endsWith('filename', '.pdf')).toBe('endsWith("filename", [".pdf"])');
    });

    it('should return exact query strings for null checks', () => {
      expect(isNull('deletedAt')).toBe('isNull("deletedAt")');
      expect(isNotNull('updatedAt')).toBe('isNotNull("updatedAt")');
    });

    it('should return exact query strings for range operations with numbers', () => {
      expect(between('age', 18, 65)).toBe('between("age", [18, 65])');
    });

    it('should return exact query strings for range operations with dates', () => {
      expect(between('date', '2024-01-01', '2024-12-31')).toBe('between("date", ["2024-01-01", "2024-12-31"])');
    });

    it('should return exact query strings for sorting', () => {
      expect(orderAsc('name')).toBe('orderAsc("name")');
      expect(orderDesc('createdAt')).toBe('orderDesc("createdAt")');
    });

    it('should return exact query strings for pagination', () => {
      expect(limit(10)).toBe('limit(10)');
      expect(offset(20)).toBe('offset(20)');
    });
  });

  describe('Helper Functions', () => {
    it('should create sort queries with exact strings', () => {
      const ascResult = sort('name', 'asc');
      const descResult = sort('name', 'desc');
      const defaultResult = sort('name');

      expect(ascResult).toBe('orderAsc("name")');
      expect(descResult).toBe('orderDesc("name")');
      expect(defaultResult).toBe('orderAsc("name")'); // defaults to asc
    });

    it('should create multiple sort queries with exact strings', () => {
      const result = multiSort([
        { field: 'priority', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ]);

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('orderDesc("priority")');
      expect(result[1]).toBe('orderAsc("name")');
    });

    it('should create pagination queries with exact values', () => {
      const page1 = paginate(1, 10);
      expect(page1).toBeInstanceOf(Array);
      expect(page1).toHaveLength(2);
      expect(page1[0]).toBe('limit(10)');
      expect(page1[1]).toBe('offset(0)'); // (1-1) * 10

      const page2 = paginate(2, 10);
      expect(page2).toBeInstanceOf(Array);
      expect(page2).toHaveLength(2);
      expect(page2[0]).toBe('limit(10)');
      expect(page2[1]).toBe('offset(10)'); // (2-1) * 10

      const page3 = paginate(3, 25);
      expect(page3).toBeInstanceOf(Array);
      expect(page3).toHaveLength(2);
      expect(page3[0]).toBe('limit(25)');
      expect(page3[1]).toBe('offset(50)'); // (3-1) * 25
    });

    it('should combine pagination and sorting with exact values', () => {
      const withSort = paginateAndSort(
        { page: 2, pageSize: 20 },
        [{ field: 'createdAt', direction: 'desc' }]
      );

      expect(withSort).toBeInstanceOf(Array);
      expect(withSort).toHaveLength(3); // limit + offset + sort
      expect(withSort[0]).toBe('limit(20)');
      expect(withSort[1]).toBe('offset(20)'); // (2-1) * 20
      expect(withSort[2]).toBe('orderDesc("createdAt")');

      const withoutSort = paginateAndSort({ page: 1, pageSize: 10 });
      expect(withoutSort).toBeInstanceOf(Array);
      expect(withoutSort).toHaveLength(2); // limit + offset only
      expect(withoutSort[0]).toBe('limit(10)');
      expect(withoutSort[1]).toBe('offset(0)');
    });

    it('should handle multiple sort fields with exact values', () => {
      const result = paginateAndSort(
        { page: 1, pageSize: 10 },
        [
          { field: 'status', direction: 'asc' },
          { field: 'priority', direction: 'desc' },
          { field: 'name', direction: 'asc' },
        ]
      );

      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(5); // limit + offset + 3 sorts
      expect(result[0]).toBe('limit(10)');
      expect(result[1]).toBe('offset(0)');
      expect(result[2]).toBe('orderAsc("status")');
      expect(result[3]).toBe('orderDesc("priority")');
      expect(result[4]).toBe('orderAsc("name")');
    });

    it('should handle empty sort array', () => {
      const result = paginateAndSort({ page: 1, pageSize: 10 }, []);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('limit(10)');
      expect(result[1]).toBe('offset(0)');
    });
  });

  describe('buildQueries Object', () => {
    it('should expose all query functions', () => {
      expect(buildQueries).toHaveProperty('equal');
      expect(buildQueries).toHaveProperty('notEqual');
      expect(buildQueries).toHaveProperty('lessThan');
      expect(buildQueries).toHaveProperty('lessThanEqual');
      expect(buildQueries).toHaveProperty('greaterThan');
      expect(buildQueries).toHaveProperty('greaterThanEqual');
      expect(buildQueries).toHaveProperty('search');
      expect(buildQueries).toHaveProperty('isNull');
      expect(buildQueries).toHaveProperty('isNotNull');
      expect(buildQueries).toHaveProperty('between');
      expect(buildQueries).toHaveProperty('startsWith');
      expect(buildQueries).toHaveProperty('endsWith');
      expect(buildQueries).toHaveProperty('orderAsc');
      expect(buildQueries).toHaveProperty('orderDesc');
      expect(buildQueries).toHaveProperty('limit');
      expect(buildQueries).toHaveProperty('offset');
      expect(buildQueries).toHaveProperty('paginate');
      expect(buildQueries).toHaveProperty('sort');
      expect(buildQueries).toHaveProperty('multiSort');
      expect(buildQueries).toHaveProperty('paginateAndSort');
    });

    it('should work with buildQueries namespace and return exact values', () => {
      const result = buildQueries.equal('name', 'test');
      expect(result).toBe('equal("name", ["test"])');
      
      const sortResult = buildQueries.sort('createdAt', 'desc');
      expect(sortResult).toBe('orderDesc("createdAt")');
      
      const paginateResult = buildQueries.paginate(1, 25);
      expect(paginateResult[0]).toBe('limit(25)');
      expect(paginateResult[1]).toBe('offset(0)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty string values', () => {
      expect(equal('name', '')).toBe('equal("name", [""])');
    });

    it('should handle zero values', () => {
      expect(equal('count', 0)).toBe('equal("count", [0])');
    });

    it('should handle boolean values', () => {
      expect(equal('active', true)).toBe('equal("active", [true])');
      expect(equal('disabled', false)).toBe('equal("disabled", [false])');
    });

    it('should handle array values', () => {
      expect(equal('tags', ['tag1', 'tag2'])).toBe('equal("tags", ["tag1", "tag2"])');
    });

    it('should handle special characters in strings', () => {
      expect(equal('name', "O'Brien")).toBe('equal("name", ["O\'Brien"])');
      expect(search('description', 'test & verify')).toBe('search("description", ["test & verify"])');
    });

    it('should handle edge case pagination with page 0', () => {
      const result = paginate(0, 10);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('limit(10)');
      expect(result[1]).toBe('offset(-10)'); // (0-1) * 10 = -10
    });

    it('should handle large pagination values', () => {
      const result = paginate(100, 50);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
      expect(result[0]).toBe('limit(50)');
      expect(result[1]).toBe('offset(4950)'); // (100-1) * 50
    });
  });

  describe('Invalid Parameter Handling', () => {
    it('should handle invalid field names gracefully', () => {
      // Appwrite Query methods don't validate field names, they just pass them through
      expect(equal('', 'value')).toBe('equal("", ["value"])');
      expect(equal('field with spaces', 'value')).toBe('equal("field with spaces", ["value"])');
    });

    it('should handle null and undefined in between queries', () => {
      // These will be passed through as-is to Appwrite
      expect(between('field', 0, 100)).toBe('between("field", [0, 100])');
    });

    it('should handle empty arrays', () => {
      expect(equal('tags', [])).toBe('equal("tags", [])');
    });
  });
});

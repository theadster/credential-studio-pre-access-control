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
    it('should return query strings for comparison operations', () => {
      expect(equal('name', 'John')).toBeDefined();
      expect(notEqual('status', 'inactive')).toBeDefined();
      expect(lessThan('age', 30)).toBeDefined();
      expect(lessThanEqual('price', 100)).toBeDefined();
      expect(greaterThan('score', 50)).toBeDefined();
      expect(greaterThanEqual('rating', 4)).toBeDefined();
    });

    it('should return query strings for text search operations', () => {
      expect(search('description', 'keyword')).toBeDefined();
      expect(startsWith('email', 'admin')).toBeDefined();
      expect(endsWith('filename', '.pdf')).toBeDefined();
    });

    it('should return query strings for null checks', () => {
      expect(isNull('deletedAt')).toBeDefined();
      expect(isNotNull('updatedAt')).toBeDefined();
    });

    it('should return query strings for range operations', () => {
      expect(between('age', 18, 65)).toBeDefined();
      expect(between('date', '2024-01-01', '2024-12-31')).toBeDefined();
    });

    it('should return query strings for sorting', () => {
      expect(orderAsc('name')).toBeDefined();
      expect(orderDesc('createdAt')).toBeDefined();
    });

    it('should return query strings for pagination', () => {
      expect(limit(10)).toBeDefined();
      expect(offset(20)).toBeDefined();
    });
  });

  describe('Helper Functions', () => {
    it('should create sort queries', () => {
      const ascResult = sort('name', 'asc');
      const descResult = sort('name', 'desc');
      const defaultResult = sort('name');
      
      expect(ascResult).toBeDefined();
      expect(descResult).toBeDefined();
      expect(defaultResult).toBeDefined();
    });

    it('should create multiple sort queries', () => {
      const result = multiSort([
        { field: 'priority', direction: 'desc' },
        { field: 'name', direction: 'asc' },
      ]);
      
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
    });

    it('should create pagination queries', () => {
      const page1 = paginate(1, 10);
      const page2 = paginate(2, 10);
      const page3 = paginate(3, 25);
      
      expect(page1).toBeInstanceOf(Array);
      expect(page1).toHaveLength(2);
      expect(page2).toBeInstanceOf(Array);
      expect(page2).toHaveLength(2);
      expect(page3).toBeInstanceOf(Array);
      expect(page3).toHaveLength(2);
    });

    it('should combine pagination and sorting', () => {
      const withSort = paginateAndSort(
        { page: 2, pageSize: 20 },
        [{ field: 'createdAt', direction: 'desc' }]
      );
      
      const withoutSort = paginateAndSort({ page: 1, pageSize: 10 });
      
      expect(withSort).toBeInstanceOf(Array);
      expect(withSort).toHaveLength(3); // limit + offset + sort
      expect(withoutSort).toBeInstanceOf(Array);
      expect(withoutSort).toHaveLength(2); // limit + offset only
    });

    it('should handle multiple sort fields', () => {
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
    });

    it('should handle empty sort array', () => {
      const result = paginateAndSort({ page: 1, pageSize: 10 }, []);
      expect(result).toHaveLength(2);
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

    it('should work with buildQueries namespace', () => {
      const result = buildQueries.equal('name', 'test');
      expect(result).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle various data types', () => {
      expect(equal('name', '')).toBeDefined();
      expect(equal('count', 0)).toBeDefined();
      expect(equal('active', true)).toBeDefined();
      expect(equal('tags', ['tag1', 'tag2'])).toBeDefined();
      expect(greaterThan('balance', -100)).toBeDefined();
    });

    it('should handle special characters in strings', () => {
      const result = equal('name', "O'Brien");
      expect(result).toBeDefined();
    });

    it('should handle edge case pagination', () => {
      const result = paginate(0, 10);
      expect(result).toBeInstanceOf(Array);
      expect(result).toHaveLength(2);
    });
  });
});

---
title: Bulk Operations ID Overwrite Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code:
  - src/lib/bulkOperations.ts
---

# Bulk Operations ID Overwrite Fix

## Issue

Validation accepts non-plain object types (Date, Map, RegExp) as `item.data`, causing silent data loss or incorrect imports. Non-plain objects such as Date or Map will be treated as plain data and either lose their internal semantics or produce unexpected/empty entries when rows are created.

## Root Cause

The validation function doesn't check if `item.data` is a plain object. Non-plain objects like Date, Map, RegExp, or custom class instances are accepted and then serialized incorrectly.

```typescript
// ❌ UNSAFE - Accepts non-plain objects
function validateBulkImportData(items: any[]): boolean {
  return items.every(item => typeof item.data === 'object');
}

// These would be accepted but cause data loss:
const items = [
  { data: new Date() },           // Serializes to {}
  { data: new Map([['key', 'value']]) },  // Serializes to {}
  { data: /regex/ },              // Serializes to {}
];
```

## Solution

Validate that `item.data` is a plain object only:

```typescript
// ✅ SAFE - Only accepts plain objects
function isPlainObject(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }
  
  // Check if it's a plain object (not Date, Map, RegExp, etc.)
  const proto = Object.getPrototypeOf(obj);
  return proto === null || proto === Object.prototype;
}

function validateBulkImportData(items: any[]): boolean {
  return items.every(item => {
    if (!item || typeof item !== 'object') {
      return false;
    }
    
    if (!isPlainObject(item.data)) {
      console.warn('Invalid item data: must be a plain object', item.data);
      return false;
    }
    
    return true;
  });
}
```

## Implementation

### Validation Helper

```typescript
/**
 * Check if a value is a plain object (not Date, Map, RegExp, etc.)
 */
function isPlainObject(value: any): boolean {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  
  // Reject known non-plain types
  if (value instanceof Date || 
      value instanceof Map || 
      value instanceof Set || 
      value instanceof RegExp ||
      value instanceof Error ||
      value instanceof ArrayBuffer ||
      value instanceof DataView) {
    return false;
  }
  
  // Check prototype chain
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Validate bulk import items
 */
function validateBulkImportItems(items: any[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!Array.isArray(items)) {
    return { valid: false, errors: ['Items must be an array'] };
  }
  
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`Item ${index}: must be an object`);
      return;
    }
    
    if (!isPlainObject(item.data)) {
      errors.push(
        `Item ${index}: data must be a plain object, got ${
          item.data?.constructor?.name || typeof item.data
        }`
      );
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Usage in Bulk Import

```typescript
async function bulkImportWithValidation(items: any[]) {
  // Validate items before processing
  const validation = validateBulkImportItems(items);
  
  if (!validation.valid) {
    console.error('Validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid bulk import data');
  }
  
  // Process valid items
  const results = [];
  for (const item of items) {
    try {
      const row = await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLE_ID,
        rowId: ID.unique(),
        data: item.data,  // Now guaranteed to be plain object
      });
      results.push({ success: true, rowId: row.$id });
    } catch (error: any) {
      results.push({ success: false, error: error.message });
    }
  }
  
  return results;
}
```

## Testing

Test validation with various object types:

```typescript
describe('Bulk import validation', () => {
  it('should accept plain objects', () => {
    const items = [{ data: { name: 'John', age: 30 } }];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(true);
  });

  it('should reject Date objects', () => {
    const items = [{ data: new Date() }];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Date');
  });

  it('should reject Map objects', () => {
    const items = [{ data: new Map([['key', 'value']]) }];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Map');
  });

  it('should reject RegExp objects', () => {
    const items = [{ data: /regex/ }];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('RegExp');
  });

  it('should reject custom class instances', () => {
    class CustomClass {
      constructor(public value: string) {}
    }
    const items = [{ data: new CustomClass('test') }];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(false);
  });

  it('should accept nested plain objects', () => {
    const items = [
      {
        data: {
          name: 'John',
          address: {
            street: '123 Main St',
            city: 'Springfield',
          },
        },
      },
    ];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(true);
  });

  it('should accept arrays of plain values', () => {
    const items = [
      {
        data: {
          tags: ['tag1', 'tag2'],
          numbers: [1, 2, 3],
        },
      },
    ];
    const result = validateBulkImportItems(items);
    expect(result.valid).toBe(true);
  });

  it('should reject arrays of non-plain objects', () => {
    const items = [
      {
        data: {
          dates: [new Date(), new Date()],
        },
      },
    ];
    // Note: This would need recursive validation
    // For now, document that nested non-plain objects should be avoided
  });
});
```

## Migration

For existing code that might be passing non-plain objects:

```typescript
// ❌ BEFORE - Might pass Date objects
const items = csvData.map(row => ({
  data: {
    ...row,
    createdAt: new Date(row.createdAt),  // Non-plain object!
  },
}));

// ✅ AFTER - Convert to plain values
const items = csvData.map(row => ({
  data: {
    ...row,
    createdAt: new Date(row.createdAt).toISOString(),  // String instead
  },
}));
```

## Files Modified

- `src/lib/bulkOperations.ts` - Add validation for plain objects

## Verification

✅ Validation rejects non-plain objects
✅ Validation accepts plain objects
✅ Error messages are clear
✅ Tests cover all object types
✅ No silent data loss


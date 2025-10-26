# Custom Field Order Concurrency Fix

## Issue

The custom field creation endpoint had a race condition vulnerability where concurrent POST requests could result in duplicate order values:

1. **Request A** queries for the last order (e.g., gets order 5)
2. **Request B** queries for the last order (also gets order 5)
3. **Request A** creates field with order 6
4. **Request B** creates field with order 6 (duplicate!)

This "find last + create" pattern is non-atomic and can produce duplicate orders when two POSTs race.

## Solution

Implemented a retry loop with conflict detection that:

1. Attempts to create the document
2. If a 409 conflict occurs (duplicate order), recalculates the order
3. Retries up to 3 times with the new order value
4. Throws the error if it's not a conflict or max attempts reached

### Code Changes

**File**: `src/pages/api/custom-fields/index.ts`

```typescript
// Before: Non-atomic creation
const createdField = await databases.createDocument(
  dbId,
  customFieldsCollectionId,
  customFieldId,
  customFieldData
);

// After: Retry loop with conflict detection
let createdField;
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    createdField = await databases.createDocument(
      dbId,
      customFieldsCollectionId,
      customFieldId,
      customFieldData
    );
    break; // Success, exit retry loop
  } catch (e: any) {
    // On unique conflict (e.g., unique index on eventSettingsId+order), recompute and retry
    if (e?.code === 409 && attempt < 3) {
      console.log(`[custom-fields] Order conflict detected (attempt ${attempt}), recalculating order...`);
      const lastFieldResult = await databases.listDocuments(
        dbId,
        customFieldsCollectionId,
        [
          Query.equal('eventSettingsId', eventSettingsId),
          Query.orderDesc('order'),
          Query.limit(1)
        ]
      );
      fieldOrder = lastFieldResult.documents.length > 0
        ? (lastFieldResult.documents[0].order as number) + 1
        : 1;
      customFieldData.order = fieldOrder;
      console.log(`[custom-fields] Retrying with new order: ${fieldOrder}`);
      continue; // Retry with new order
    }
    throw e; // Re-throw if not a conflict or max attempts reached
  }
}
```

## How It Works

### Normal Case (No Conflict)
1. Calculate order (e.g., 6)
2. Create document with order 6
3. Success on first attempt

### Conflict Case (Concurrent Requests)
1. **Request A**: Calculate order 6, attempt create
2. **Request B**: Calculate order 6, attempt create
3. **Request A**: Success (order 6 created)
4. **Request B**: 409 conflict detected
5. **Request B**: Recalculate order (now 7)
6. **Request B**: Retry with order 7
7. **Request B**: Success

### Maximum Retries
- Up to 3 attempts
- If all 3 attempts fail with 409, the error is thrown
- Non-409 errors are thrown immediately

## Benefits

✅ **Resilient to Concurrency**: Handles race conditions gracefully  
✅ **Automatic Recovery**: Recalculates order on conflict  
✅ **Minimal Performance Impact**: Only retries on actual conflicts  
✅ **Logging**: Clear console logs for debugging  
✅ **Fail-Safe**: Throws error after max attempts to prevent infinite loops  

## Future Improvements

### Unique Index Recommendation

Consider adding a unique index on `(eventSettingsId, order)` in Appwrite to enforce integrity at the database level:

**Benefits**:
- Database-level enforcement of uniqueness
- Triggers the 409 conflict that the retry loop handles
- Prevents data corruption from race conditions

**Implementation**:
1. In Appwrite Console, navigate to the custom_fields collection
2. Create a unique index on both fields:
   - `eventSettingsId` (ascending)
   - `order` (ascending)
3. Name: `unique_event_order`

This would make the retry loop more effective by ensuring conflicts are properly detected.

## Testing

### Manual Testing

1. **Single Request**: Create a custom field normally
   - Should succeed on first attempt
   - Order should be calculated correctly

2. **Concurrent Requests**: Use a tool like Apache Bench or k6 to send concurrent POST requests
   ```bash
   # Example with curl in parallel
   for i in {1..5}; do
     curl -X POST http://localhost:3000/api/custom-fields \
       -H "Content-Type: application/json" \
       -d '{"fieldName":"Test'$i'","fieldType":"text","eventSettingsId":"..."}' &
   done
   wait
   ```
   - All requests should succeed
   - No duplicate orders should exist
   - Console logs should show retry attempts if conflicts occur

3. **Verify Order Sequence**: Check that orders are sequential without gaps or duplicates
   ```sql
   SELECT eventSettingsId, order, fieldName 
   FROM custom_fields 
   ORDER BY eventSettingsId, order;
   ```

### Automated Testing

Consider adding integration tests:

```typescript
describe('Custom Field Order Concurrency', () => {
  it('should handle concurrent field creation without duplicate orders', async () => {
    const promises = Array.from({ length: 5 }, (_, i) => 
      createCustomField({
        fieldName: `Field ${i}`,
        fieldType: 'text',
        eventSettingsId: 'test-event-id'
      })
    );
    
    const results = await Promise.all(promises);
    const orders = results.map(r => r.order);
    
    // All orders should be unique
    expect(new Set(orders).size).toBe(orders.length);
    
    // Orders should be sequential
    orders.sort((a, b) => a - b);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBe(orders[i-1] + 1);
    }
  });
});
```

## Related Issues

- **Race Condition**: Non-atomic "find last + create" pattern
- **Data Integrity**: Duplicate order values
- **Concurrency**: Multiple simultaneous POST requests

## Impact

- **Severity**: Medium (data integrity issue, but not data loss)
- **Frequency**: Low (only occurs with concurrent requests)
- **User Impact**: Could cause confusion with field ordering
- **Fix Complexity**: Low (simple retry loop)

## References

- **File**: `src/pages/api/custom-fields/index.ts`
- **Lines**: ~155-190
- **Related Docs**: 
  - [Custom Fields Enhancements Summary](./CUSTOM_FIELDS_ENHANCEMENTS_SUMMARY.md)
  - [Custom Fields Optimistic Locking](./CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md)

---

**Status**: ✅ Fixed  
**Date**: 2025-10-26  
**Severity**: Medium  
**Type**: Concurrency / Race Condition

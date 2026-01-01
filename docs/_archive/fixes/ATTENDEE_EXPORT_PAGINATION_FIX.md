# Attendee Export Pagination Fix

## Issue
The attendee export functionality was only exporting the first 25 records instead of all attendees in the database. This occurred because the API was not implementing pagination when fetching attendees from Appwrite.

## Root Cause
In `src/pages/api/attendees/export.ts`, the code was calling `databases.listDocuments()` without specifying a limit parameter. Appwrite's default limit is 25 documents per query, which meant only the first 25 attendees were being fetched and exported.

**Problematic code (lines 127-131):**
```typescript
// Fetch attendees
const attendeesResult = await databases.listDocuments(
  dbId,
  attendeesCollectionId,
  queries
);

let attendees = attendeesResult.documents;
```

## Solution
Implemented pagination logic to fetch all attendees in batches of 100 until all records are retrieved.

**Fixed code:**
```typescript
// Fetch all attendees with pagination
let attendees: any[] = [];
let offset = 0;
const limit = 100; // Fetch in batches of 100
let hasMore = true;

while (hasMore) {
  const paginatedQueries = [
    ...queries,
    Query.limit(limit),
    Query.offset(offset)
  ];

  const attendeesResult = await databases.listDocuments(
    dbId,
    attendeesCollectionId,
    paginatedQueries
  );

  attendees = attendees.concat(attendeesResult.documents);
  offset += limit;
  hasMore = attendeesResult.documents.length === limit;
}
```

## Implementation Details

### Pagination Strategy
- **Batch size**: 100 records per query (balances performance and memory usage)
- **Loop condition**: Continues fetching until a batch returns fewer records than the limit
- **Query building**: Adds `Query.limit()` and `Query.offset()` to existing filter queries
- **Result accumulation**: Concatenates all batches into a single array

### Why This Works
1. Fetches records in manageable batches to avoid memory issues with large datasets
2. Preserves all existing filters (search, photo filters, advanced filters)
3. Maintains the original sort order (`Query.orderDesc('$createdAt')`)
4. Stops automatically when all records have been fetched

## Files Modified
- `src/pages/api/attendees/export.ts` - Added pagination logic to fetch all attendees

## Other Export Endpoints Checked
- ✅ `src/pages/api/logs/export.ts` - Already has pagination implemented correctly
- ✅ `src/pages/api/attendees/bulk-export-pdf.ts` - Not affected (fetches specific IDs)

## Testing Recommendations
1. Test export with database containing more than 25 attendees
2. Test export with various filter combinations (all, filtered, advanced filters)
3. Test export with large datasets (500+, 1000+ records) to verify performance
4. Verify CSV output contains all expected records
5. Test that custom field filters still work correctly with pagination

## Impact
- ✅ All attendees are now exported regardless of database size
- ✅ Existing filters and search functionality preserved
- ✅ No breaking changes to API interface
- ✅ Performance optimized with batch processing

## Date
January 11, 2025

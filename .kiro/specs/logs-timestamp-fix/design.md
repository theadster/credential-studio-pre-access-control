# Design Document

## Overview

This design addresses the blank activity logs issue by implementing a robust fallback mechanism for log sorting and migrating existing logs to use the timestamp field consistently. The solution ensures backward compatibility while leveraging the new operator-based timestamp management for future logs.

## Architecture

### Current State

The logs system currently has two types of log entries:

1. **Legacy Logs** (pre-operator): Created before the database operators implementation
   - Have `$createdAt` (Appwrite system field)
   - Missing `timestamp` field (custom datetime attribute)
   - Cannot be queried with `Query.orderDesc('timestamp')` without errors

2. **New Logs** (post-operator): Created after the database operators implementation
   - Have `$createdAt` (Appwrite system field)
   - Have `timestamp` field populated via `dateOperators.setNow()`
   - Can be queried with `Query.orderDesc('timestamp')`

### Problem

The logs API currently uses `Query.orderDesc('timestamp')` which fails when:
- The timestamp field doesn't exist in older documents
- The timestamp field is null/undefined
- This causes the entire query to return no results, making logs appear blank

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Logs API Endpoint                       │
│                                                              │
│  1. Try Query with timestamp ordering                       │
│     ├─ Success? → Return logs                               │
│     └─ Failure? → Fall back to $createdAt ordering          │
│                                                              │
│  2. Enrich logs with user/attendee data                     │
│                                                              │
│  3. Return unified response with both timestamp fields      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Migration Script                          │
│                                                              │
│  1. Fetch all logs without timestamp field                  │
│  2. Batch update: timestamp = $createdAt                    │
│  3. Log progress and handle errors                          │
│  4. Verify all logs have timestamp field                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Dashboard UI                            │
│                                                              │
│  Display: timestamp || $createdAt                           │
│  Sort: Server-side (already sorted by API)                  │
│  Pagination: Works with both field types                    │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Logs API Endpoint (`src/pages/api/logs/index.ts`)

**Changes Required:**

```typescript
// Current (problematic):
queries.push(Query.orderDesc('timestamp'));

// New (with fallback):
try {
  // Try ordering by timestamp first (for new logs)
  queries.push(Query.orderDesc('timestamp'));
  const logsResponse = await databases.listDocuments(..., queries);
  
  // If we get results, use them
  if (logsResponse.documents.length > 0 || logsResponse.total === 0) {
    return logsResponse;
  }
} catch (error) {
  // If timestamp ordering fails, fall back to $createdAt
  console.log('Falling back to $createdAt ordering');
}

// Fallback: Use $createdAt for ordering
const fallbackQueries = queries.filter(q => !q.includes('timestamp'));
fallbackQueries.push(Query.orderDesc('$createdAt'));
const logsResponse = await databases.listDocuments(..., fallbackQueries);
```

**Alternative Approach (Simpler):**

Since Appwrite might not throw an error but just return empty results, we can use a simpler approach:

```typescript
// Always use $createdAt for ordering (reliable for all logs)
queries.push(Query.orderDesc('$createdAt'));

// In enrichLogWithRelations, prefer timestamp over $createdAt for display
timestamp: log.timestamp || log.$createdAt
```

This approach is simpler and more reliable because:
- `$createdAt` exists on all documents (system field)
- We can still use `timestamp` for display when available
- No complex fallback logic needed
- Works immediately without migration

### 2. Migration Script (`scripts/migrate-log-timestamps.ts`)

**Purpose:** Backfill the `timestamp` field for all existing logs

**Implementation:**

```typescript
import { Client, Databases, Query, ID } from 'appwrite';

async function migrateLogTimestamps() {
  const client = new Client()
    .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
    .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
    .setKey(process.env.APPWRITE_API_KEY!);

  const databases = new Databases(client);
  const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

  let offset = 0;
  const limit = 100;
  let totalProcessed = 0;
  let totalUpdated = 0;

  console.log('Starting log timestamp migration...');

  while (true) {
    // Fetch logs in batches
    const response = await databases.listDocuments(
      databaseId,
      logsCollectionId,
      [
        Query.limit(limit),
        Query.offset(offset),
        Query.orderDesc('$createdAt')
      ]
    );

    if (response.documents.length === 0) {
      break;
    }

    // Process each log
    for (const log of response.documents) {
      totalProcessed++;

      // Check if timestamp is missing or null
      if (!log.timestamp) {
        try {
          // Update timestamp to match $createdAt
          await databases.updateDocument(
            databaseId,
            logsCollectionId,
            log.$id,
            {
              timestamp: log.$createdAt
            }
          );
          totalUpdated++;
          console.log(`✓ Updated log ${log.$id} (${totalUpdated}/${totalProcessed})`);
        } catch (error) {
          console.error(`✗ Failed to update log ${log.$id}:`, error);
        }
      }
    }

    offset += limit;
    console.log(`Processed ${totalProcessed} logs, updated ${totalUpdated}`);

    // Break if we've processed all documents
    if (response.documents.length < limit) {
      break;
    }
  }

  console.log(`\nMigration complete!`);
  console.log(`Total logs processed: ${totalProcessed}`);
  console.log(`Total logs updated: ${totalUpdated}`);
}

migrateLogTimestamps().catch(console.error);
```

### 3. Dashboard UI (`src/pages/dashboard.tsx`)

**Changes Required:**

Minimal changes needed. The `enrichLogWithRelations` function already handles the fallback:

```typescript
// Current code (already correct):
timestamp: log.timestamp || log.$createdAt
```

The dashboard will automatically use `timestamp` if available, otherwise fall back to `$createdAt`.

## Data Models

### Log Document Structure

```typescript
interface LogDocument {
  $id: string;                    // Appwrite document ID
  $createdAt: string;             // Appwrite system field (always present)
  $updatedAt: string;             // Appwrite system field (always present)
  userId: string;                 // User who performed the action
  attendeeId?: string;            // Related attendee (if applicable)
  action: string;                 // Action type (e.g., 'create', 'update', 'delete')
  details: string;                // JSON string with action details
  timestamp?: string;             // Custom datetime field (may be missing in old logs)
}
```

### Enriched Log Response

```typescript
interface EnrichedLog {
  id: string;
  userId: string;
  attendeeId?: string;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;              // From $createdAt
  timestamp: string;              // From timestamp || $createdAt
  user: {
    name: string | null;
    email: string;
  };
  attendee: {
    firstName: string;
    lastName: string;
  } | null;
}
```

## Error Handling

### API Error Handling

1. **Query Failures:**
   - If `Query.orderDesc('timestamp')` fails, fall back to `Query.orderDesc('$createdAt')`
   - Log the fallback for monitoring purposes
   - Return results without exposing error to client

2. **Missing Fields:**
   - Use `log.timestamp || log.$createdAt` for safe fallback
   - Never return undefined/null timestamps to client

3. **Rate Limiting:**
   - Existing exponential backoff logic remains unchanged
   - Applies to both timestamp and $createdAt queries

### Migration Error Handling

1. **Individual Update Failures:**
   - Log error but continue processing other logs
   - Track failed updates for manual review
   - Don't stop entire migration on single failure

2. **API Key Issues:**
   - Validate API key before starting migration
   - Provide clear error message if authentication fails

3. **Network Issues:**
   - Implement retry logic for transient failures
   - Use exponential backoff for rate limiting

## Testing Strategy

### Unit Tests

1. **Logs API Tests:**
   - Test query with timestamp field present
   - Test query with timestamp field missing
   - Test fallback to $createdAt
   - Test enrichment with both field types

2. **Migration Script Tests:**
   - Test batch processing logic
   - Test update with missing timestamp
   - Test update with existing timestamp (should skip)
   - Test error handling for failed updates

### Integration Tests

1. **End-to-End Logs Flow:**
   - Create new log with timestamp
   - Fetch logs and verify sorting
   - Verify pagination works correctly
   - Verify filters work with both field types

2. **Migration Verification:**
   - Run migration on test database
   - Verify all logs have timestamp field
   - Verify timestamp values match $createdAt
   - Verify no data loss occurred

### Manual Testing

1. **Dashboard Verification:**
   - Access logs tab before migration
   - Run migration script
   - Access logs tab after migration
   - Verify all logs display correctly
   - Verify sorting is chronological
   - Verify pagination works
   - Verify filters work

2. **New Log Creation:**
   - Create new log after fix
   - Verify it appears in logs list
   - Verify it has timestamp field
   - Verify it sorts correctly with old logs

## Implementation Plan

### Phase 1: Immediate Fix (Quick Win)

1. Update logs API to use `$createdAt` for ordering instead of `timestamp`
2. This provides immediate relief - logs will display again
3. Deploy to production

### Phase 2: Data Migration (Background Task)

1. Create migration script
2. Test on development database
3. Run on production database during low-traffic period
4. Verify all logs have timestamp field

### Phase 3: Optimization (Optional)

1. Switch back to `timestamp` ordering once all logs are migrated
2. Add index on timestamp field for better performance
3. Monitor query performance

## Performance Considerations

### Query Performance

- **$createdAt ordering:** Fast (system field, automatically indexed)
- **timestamp ordering:** Fast after migration (indexed field)
- **Fallback logic:** Minimal overhead (single try-catch)

### Migration Performance

- **Batch size:** 100 logs per batch (configurable)
- **Rate limiting:** Respects Appwrite rate limits
- **Duration:** ~1 second per 100 logs (estimated)
- **Total time:** Depends on total log count

### Memory Usage

- **API:** No significant change (same query patterns)
- **Migration:** Processes in batches to avoid memory issues
- **Dashboard:** No change (same data structure)

## Security Considerations

1. **API Key Protection:**
   - Migration script requires API key
   - Never commit API key to version control
   - Use environment variables

2. **Permission Validation:**
   - Logs API already validates user permissions
   - No changes to permission model

3. **Data Integrity:**
   - Migration preserves all existing data
   - Timestamp values match $createdAt exactly
   - No data loss risk

## Rollback Plan

If issues occur after deployment:

1. **Immediate Rollback:**
   - Revert logs API to use `$createdAt` ordering
   - This is the safest fallback (always works)

2. **Migration Rollback:**
   - Not needed (migration only adds data, doesn't remove)
   - Timestamp field can remain populated without issues

3. **Verification:**
   - Check logs display correctly after rollback
   - Monitor error logs for any issues

## Success Criteria

1. ✅ Logs display on dashboard without errors
2. ✅ All logs (old and new) are visible
3. ✅ Logs are sorted chronologically (newest first)
4. ✅ Pagination works correctly
5. ✅ Filters work correctly
6. ✅ New logs continue to be created with timestamp field
7. ✅ No performance degradation
8. ✅ No data loss

## Conclusion

This design provides a robust solution to the blank logs issue by:
- Implementing a reliable fallback mechanism
- Migrating existing data for consistency
- Maintaining backward compatibility
- Ensuring no data loss
- Providing clear rollback options

The implementation is straightforward and low-risk, with immediate benefits for users who need to access their activity logs.

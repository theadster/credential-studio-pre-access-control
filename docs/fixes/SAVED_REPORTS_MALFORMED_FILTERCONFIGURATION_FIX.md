---
title: Saved Reports Malformed filterConfiguration Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-29
review_interval_days: 90
related_code: ["src/pages/api/reports/index.ts"]
---

# Saved Reports Malformed filterConfiguration Fix

## Problem

The reports GET endpoint (`src/pages/api/reports/index.ts`) silently fell back to the original string value when `JSON.parse()` failed on `filterConfiguration`. This created type safety issues:

- Downstream consumers received either an object or a string, breaking type contracts
- Malformed data was silently passed through without visibility
- No logging context made debugging data corruption difficult

## Solution

Implemented a **skip strategy** for reports with malformed `filterConfiguration`:

1. **Skip malformed reports** - Reports with unparseable filterConfiguration are excluded from the result set
2. **Enhanced logging** - Parse errors are logged with context (report ID and error message)
3. **Type safety** - `filterConfiguration` is always an object or the report is skipped entirely

## Implementation Details

### Code Changes

In `src/pages/api/reports/index.ts` (GET endpoint, lines 117-147):

```typescript
// Transform documents to SavedReport format
// Skip reports with malformed filterConfiguration to ensure type safety
const reports: SavedReport[] = [];

for (const doc of reportsResponse.documents) {
  // Normalize filterConfiguration: parse if it's a string, otherwise use as-is
  let filterConfig = doc.filterConfiguration;
  if (typeof filterConfig === 'string') {
    try {
      filterConfig = JSON.parse(filterConfig);
    } catch (err) {
      console.error(
        `[Reports API] Skipping report with malformed filterConfiguration - reportId: ${doc.$id}, error: ${err instanceof Error ? err.message : String(err)}`
      );
      // Skip this report due to malformed filterConfiguration
      continue;
    }
  }

  reports.push({
    $id: doc.$id,
    name: doc.name,
    description: doc.description || undefined,
    userId: doc.userId,
    filterConfiguration: filterConfig,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    lastAccessedAt: doc.lastAccessedAt || undefined,
  });
}
```

### Why Skip Strategy?

For a GET endpoint listing reports, skipping malformed reports is preferable to returning an error because:

- Users can still access valid reports without API failure
- Malformed reports are logged for investigation
- No breaking changes to API contract
- Graceful degradation of data quality

## Impact

- **Type Safety**: `filterConfiguration` is guaranteed to be an object (never a string)
- **Observability**: Parse errors are logged with report ID and error details
- **User Experience**: Valid reports remain accessible even if some are corrupted
- **Data Quality**: Malformed reports are excluded from results, preventing downstream issues

## Testing

Verify the fix handles:
- Reports with valid JSON filterConfiguration (parsed correctly)
- Reports with object filterConfiguration (used as-is)
- Reports with invalid JSON filterConfiguration (skipped with error logged)
- Mixed scenarios (some valid, some malformed)

## Related Requirements

- Saved Reports Feature: Requirements 1.2, 6.5
- API Error Handling: Consistent error logging and type safety

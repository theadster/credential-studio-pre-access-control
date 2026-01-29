---
title: Saved Reports Empty Custom Fields Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 90
related_code:
  - src/lib/filterUtils.ts
  - src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx
---

# Saved Reports Empty Custom Fields Fix

## Issue

When saving a report with only basic filters (e.g., "First Name Contains Adam"), loading the report would show a "Report Needs Attention" error indicating that 12+ custom fields no longer exist, even though the user never set any custom field filters.

### Example Error

```
The report "First Name Adam" contains 12 filters that reference data that no longer exists.
You can remove or replace these filters before applying.
12 unresolved
- Custom Field: Field no longer exists (Original value: empty)
- Custom Field: Field no longer exists (Original value: empty)
... (repeated for each custom field)
```

## Root Cause

When saving a report, the system was saving the **entire filter configuration** including all custom fields, even those with empty values that were never actually used by the user. When loading the report, the validation logic would check all these empty custom field entries against the current event settings. Since those custom field IDs didn't exist in the current event, they were flagged as stale parameters.

### Why This Happened

1. The filter state in AdvancedFiltersDialog includes all custom fields (initialized as empty)
2. When saving, the entire filter state was persisted to the database
3. On load, validation checked all custom fields, including empty ones
4. Empty custom fields with IDs that don't exist were flagged as stale

## Solution

### 1. New Utility Function

Added `cleanFilterConfigurationForSaving()` to `src/lib/filterUtils.ts`:

```typescript
export function cleanFilterConfigurationForSaving(
  filters: AdvancedSearchFilters
): AdvancedSearchFilters {
  // Remove empty custom fields before saving
  const cleanedCustomFields: Record<string, CustomFieldFilter> = {};
  Object.entries(filters.customFields || {}).forEach(([fieldId, filter]) => {
    // Only include custom fields that have active filters
    if (isCustomFieldFilterActive(filter)) {
      cleanedCustomFields[fieldId] = filter;
    }
  });

  return {
    ...filters,
    customFields: cleanedCustomFields,
  };
}
```

### 2. Updated Save Logic

Modified `handleSaveReport()` in `AdvancedFiltersDialog.tsx` to clean the filter configuration before saving:

```typescript
const handleSaveReport = async (name: string, description?: string) => {
  // Clean the filter configuration to remove empty custom fields
  const cleanedFilters = cleanFilterConfigurationForSaving(filters);
  
  await createReport({
    name,
    description,
    filterConfiguration: cleanedFilters,
  });
};
```

## Impact

- **Before**: Saving a report with only basic filters would include all empty custom fields
- **After**: Only custom fields with active filters are saved to the database

## Testing

All 50 saved reports tests continue to pass:
- Property 11: Save Button Disabled State (13 tests)
- Property 7: Stale Parameter Removal on Apply (8 tests)
- Property 13: Report List Display Completeness (13 tests)
- Property 12: Export Integration (16 tests)

## Verification

To verify the fix works:

1. Open Advanced Filters dialog
2. Set only "First Name Contains Adam"
3. Click "Save Report" and save as "First Name Adam"
4. Click "Load Report" and select the saved report
5. **Expected**: Report loads without stale parameter errors
6. **Before Fix**: Would show 12+ stale custom field errors

## Related Documentation

- [Saved Reports Feature Guide](../guides/SAVED_REPORTS_GUIDE.md)
- [Saved Reports Feature Implementation](../enhancements/SAVED_REPORTS_FEATURE_IMPLEMENTATION.md)
- [Saved Reports Permission Fix](./SAVED_REPORTS_PERMISSION_FIX.md)


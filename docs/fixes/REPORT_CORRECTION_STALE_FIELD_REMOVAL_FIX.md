---
title: Report Correction Stale Field Removal Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-29
review_interval_days: 90
related_code: ["src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx"]
---

# Report Correction Stale Field Removal Fix

## Problem

In `ReportCorrectionDialog.tsx`, when a user replaced a stale custom field with a valid replacement field, the component would copy the filter to the new field ID but fail to remove the stale field from the configuration. This resulted in:

- Both the stale field and replacement field present in the saved report
- Duplicate filters being applied when the report is loaded
- Data integrity issues in the saved report configuration
- Incorrect filter behavior when applying the corrected report

### Root Cause

The `workingConfig` useMemo (lines 295-301) applied replacements by copying the filter to the new field ID:

```typescript
// BEFORE: Stale field not removed
replacements.forEach((newFieldId, staleFieldId) => {
  if (originalConfig?.customFields[staleFieldId]) {
    config.customFields[newFieldId] = { ...originalConfig.customFields[staleFieldId] };
    // Missing: delete config.customFields[staleFieldId];
  }
});
```

This left the stale field in the configuration alongside the replacement, violating the expected behavior of a field replacement operation.

## Solution

Added explicit removal of the stale field after copying its filter to the replacement field:

```typescript
// AFTER: Stale field properly removed
replacements.forEach((newFieldId, staleFieldId) => {
  if (originalConfig?.customFields[staleFieldId]) {
    config.customFields[newFieldId] = { ...originalConfig.customFields[staleFieldId] };
    delete config.customFields[staleFieldId]; // Remove stale field
  }
});
```

## Implementation Details

In `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx` (lines 295-303):

Added one line after copying the filter:
```typescript
delete config.customFields[staleFieldId];
```

This ensures that when a user selects a replacement field for a stale custom field:
1. The filter configuration is copied to the new field
2. The stale field is removed from the configuration
3. Only the replacement field remains in the final config

## Impact

- **Data Integrity**: Replaced fields are properly removed, preventing duplicate filters
- **Correctness**: Report configuration matches user intent (replace, not duplicate)
- **User Experience**: Saved reports contain only the intended filters
- **Consistency**: Replacement operation behaves as expected (old field removed, new field added)

## Testing

Verify the fix handles:
- Replacing a stale field with a valid replacement (stale field removed, replacement present)
- Multiple replacements (all stale fields removed, all replacements present)
- Mixed operations (some removed, some replaced - correct fields in final config)
- Saved report contains only replacement fields, not stale fields

## Related Requirements

- Saved Reports Feature: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.4
- Data Integrity: Ensuring saved report configurations are accurate and complete

## Related Fixes

- `REPORT_CORRECTION_SILENT_REPLACEMENT_FAILURE_FIX.md` - Prevents replacements from being silently ignored on parse failures

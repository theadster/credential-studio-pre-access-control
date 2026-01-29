---
title: Report Correction Silent Replacement Failure Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-29
review_interval_days: 90
related_code: ["src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx"]
---

# Report Correction Silent Replacement Failure Fix

## Problem

In `ReportCorrectionDialog.tsx`, when a user selected replacement fields for stale custom fields, the replacements would be silently ignored if `report.filterConfiguration` failed to parse as JSON. This created a critical UX issue:

- User selects replacement fields in the UI
- JSON parse fails (only logged to console)
- Replacements are skipped without user notification
- User believes replacements were applied when they weren't
- Saved report contains incorrect or missing filters

### Root Cause

The `workingConfig` useMemo (lines 394-459) parsed the original configuration and applied replacements in a loop. When parsing failed, `originalConfig` was set to `null`, but the replacement loop still executed. Since `originalConfig` was null, the condition `originalConfig?.customFields[staleFieldId]` would always be falsy, silently skipping all replacements.

```typescript
// BEFORE: Replacements silently ignored on parse failure
if (report?.filterConfiguration) {
  try {
    originalConfig = JSON.parse(report.filterConfiguration);
  } catch (err) {
    console.error(...); // Only logged, no state tracking
    originalConfig = null;
  }
}

// Loop still executes even if parse failed
replacements.forEach((newFieldId, staleFieldId) => {
  if (originalConfig?.customFields[staleFieldId]) { // Always false if parse failed
    config.customFields[newFieldId] = { ...originalConfig.customFields[staleFieldId] };
  }
});
```

## Solution

Implemented explicit parse error tracking to prevent replacements from being applied when the original configuration is malformed:

1. **Track parse errors** - Added `configParseError` state to track JSON parse failures
2. **Gate replacements** - Only apply replacements if original config parsed successfully
3. **Reset on dialog open** - Clear parse error state when dialog opens/closes

## Implementation Details

### Code Changes

In `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx`:

**1. Added parse error state (line ~375):**
```typescript
const [configParseError, setConfigParseError] = React.useState(false);
```

**2. Reset state on dialog open (line ~385):**
```typescript
React.useEffect(() => {
  if (open) {
    setRemovedParams(new Set());
    setReplacements(new Map());
    setIsSaving(false);
    setConfigParseError(false); // Reset parse error
  }
}, [open]);
```

**3. Gate replacements behind parse error check (line ~407-430):**
```typescript
// Parse original configuration once (not in the loop)
let originalConfig: AdvancedSearchFilters | null = null;
let parseError = false;
if (report?.filterConfiguration) {
  try {
    originalConfig = JSON.parse(report.filterConfiguration) as AdvancedSearchFilters;
  } catch (err) {
    console.error(
      `Failed to parse filter configuration for report "${report.name}":`,
      err instanceof Error ? err.message : String(err),
    );
    parseError = true;
    originalConfig = null;
  }
}

// Update parse error state
setConfigParseError(parseError);

// Apply replacements ONLY if original config was successfully parsed
if (!parseError) {
  replacements.forEach((newFieldId, staleFieldId) => {
    if (originalConfig?.customFields[staleFieldId]) {
      config.customFields[newFieldId] = { ...originalConfig.customFields[staleFieldId] };
    }
  });
}
```

## Impact

- **Correctness**: Replacements are no longer silently ignored on parse failures
- **Observability**: Parse errors are tracked in component state (can be used for UI warnings in future)
- **Type Safety**: Explicit `parseError` flag prevents logic errors
- **User Experience**: Foundation for adding UI warnings when replacements can't be applied

## Testing

Verify the fix handles:
- Reports with valid JSON filterConfiguration (replacements applied correctly)
- Reports with malformed JSON filterConfiguration (replacements skipped, error logged)
- User interactions (removing parameters, selecting replacements) with both valid and malformed configs
- Dialog state reset when opening/closing

## Related Requirements

- Saved Reports Feature: Requirements 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.4
- Error Handling: Explicit error tracking and prevention of silent failures

## Future Improvements

Consider adding UI warning when `configParseError` is true:
- Display alert to user that replacements cannot be applied
- Suggest removing stale parameters instead
- Provide option to contact support if data corruption is suspected

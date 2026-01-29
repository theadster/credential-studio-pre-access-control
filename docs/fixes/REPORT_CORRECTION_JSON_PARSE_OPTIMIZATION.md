---
title: Report Correction JSON Parse Optimization
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
review_interval_days: 90
related_code: ["src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx"]
---

# Report Correction JSON Parse Optimization

## Summary

Optimized the `workingConfig` useMemo in `ReportCorrectionDialog` to parse `report.filterConfiguration` once instead of repeatedly inside the `replacements.forEach` loop. This improves performance and maintainability.

## Problem

The original code parsed the same JSON string multiple times:

```typescript
replacements.forEach((newFieldId, staleFieldId) => {
  let originalConfig: AdvancedSearchFilters | null = null;
  
  if (report?.filterConfiguration) {
    try {
      originalConfig = JSON.parse(report.filterConfiguration);  // ← Parsed N times
    } catch (err) {
      return;  // ← Error handling only returns from forEach
    }
  }
  // ...
});
```

**Issues:**
- If there are 5 replacements, the same string is parsed 5 times
- Parse errors only return from the forEach callback, not the useMemo
- No memoization of the parsed result
- Inefficient and harder to maintain

## Solution

Parse the configuration once before the loop:

```typescript
// Parse original configuration once (not in the loop)
let originalConfig: AdvancedSearchFilters | null = null;
if (report?.filterConfiguration) {
  try {
    originalConfig = JSON.parse(report.filterConfiguration) as AdvancedSearchFilters;
  } catch (err) {
    console.error(
      `Failed to parse filter configuration for report "${report.name}":`,
      err instanceof Error ? err.message : String(err),
    );
    // Skip replacements for malformed configurations
    originalConfig = null;
  }
}

// Apply replacements using the pre-parsed configuration
replacements.forEach((newFieldId, staleFieldId) => {
  if (originalConfig?.customFields[staleFieldId]) {
    config.customFields[newFieldId] = { ...originalConfig.customFields[staleFieldId] };
  }
});
```

## Impact

- **Performance**: Eliminates redundant JSON.parse calls (O(n) → O(1) for parsing)
- **Maintainability**: Error handling is clearer and happens once
- **Correctness**: Parse errors are properly handled before the loop

## Files Modified

- `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx` (lines 265-305)

## Requirements

- Requirement 4.5: Users can replace deleted fields in stale parameters

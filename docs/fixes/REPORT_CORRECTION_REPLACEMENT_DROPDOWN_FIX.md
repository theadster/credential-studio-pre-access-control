---
title: Report Correction Replacement Dropdown Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
review_interval_days: 90
related_code: ["src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx", "src/types/reports.ts"]
---

# Report Correction Replacement Dropdown Fix

## Summary

Fixed a bug in `ReportCorrectionDialog` where the field replacement dropdown was incorrectly displayed for `value_deleted` stale parameters. The dropdown should only appear when a field itself is deleted and can be replaced, not when only a value within an existing field is deleted.

## Problem

The replacement dropdown visibility was determined by checking `parameter.type === 'customField'`, which doesn't distinguish between:
- **Field deleted** (`reason: 'field_deleted'`): The field no longer exists and can be replaced
- **Value deleted** (`reason: 'value_deleted'`): The field exists but one of its values was removed

This caused the dropdown to appear in both cases, offering field replacement when it wasn't applicable for value-deleted scenarios.

## Solution

Changed the condition from:
```typescript
const canReplace = parameter.type === 'customField' && availableFields.length > 0;
```

To:
```typescript
const canReplace = parameter.reason === 'field_deleted' && availableFields.length > 0;
```

## Impact

- **Field deleted**: Dropdown appears ✓ (user can select replacement field)
- **Value deleted**: Dropdown hidden ✓ (user can only remove the filter)

This ensures the UI only offers relevant actions based on the actual stale parameter reason.

## Files Modified

- `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx` (line 131)

## Requirements

- Requirement 4.3: Report correction dialog displays stale parameters
- Requirement 4.4: Users can remove stale parameters
- Requirement 4.5: Users can replace deleted fields

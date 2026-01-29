---
title: Load Report Delete Race Condition Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
review_interval_days: 90
related_code: ["src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx"]
---

# Load Report Delete Race Condition Fix

## Summary

Fixed a race condition in `LoadReportDialog` where the delete action could be skipped due to state being cleared before the delete handler read it. The dialog's auto-close callback could fire and set `deletingReport` to null before the async delete operation completed.

## Problem

The delete flow had a timing vulnerability:

1. User clicks delete → `setDeletingReport(report)` 
2. AlertDialog opens
3. User clicks "Delete" → `handleDeleteConfirm()` starts async operation
4. **RACE**: AlertDialog's `onOpenChange` callback fires and calls `setDeletingReport(null)`
5. If this happens before `handleDeleteConfirm` reads `deletingReport`, the delete uses a stale/null value

The issue was that `handleDeleteConfirm` directly accessed `deletingReport` state during an async operation, which could be cleared by the dialog's auto-close handler.

## Solution

Capture the report ID synchronously before the async operation:

```typescript
const handleDeleteConfirm = React.useCallback(async () => {
  if (!deletingReport) return;
  
  const reportId = deletingReport.$id;  // Capture ID immediately
  setIsDeleting(true);
  setDeleteError(null);
  try {
    await onDelete(reportId);  // Use captured ID, not state
    setDeletingReport(null);
  } catch (error) {
    console.error('Failed to delete report:', error);
    setDeleteError('Failed to delete report. Please try again.');
  } finally {
    setIsDeleting(false);
  }
}, [deletingReport, onDelete]);
```

## Impact

- Delete operations now always use the correct report ID
- Eliminates race condition between dialog auto-close and delete handler
- No user-visible behavior change, but delete is now reliable

## Files Modified

- `src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx` (line 404)

## Requirements

- Requirement 3.3: Users can delete saved reports

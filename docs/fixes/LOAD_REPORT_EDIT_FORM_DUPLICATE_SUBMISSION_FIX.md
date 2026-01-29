---
title: Load Report Edit Form Duplicate Submission Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
review_interval_days: 90
related_code: ["src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx"]
---

# Load Report Edit Form Duplicate Submission Fix

## Summary

Fixed a race condition in `EditReportDialog` where the edit form could be submitted multiple times. The `isSubmitting` state was not reset on successful save, allowing users to bypass the duplicate submission guard.

## Problem

The `handleSubmit` function had incomplete state management:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  if (isSubmitting || isSaving) return;
  
  setIsSubmitting(true);
  try {
    await onSave(trimmedName, description.trim() || undefined);
  } catch (error) {
    // ...
    setIsSubmitting(false);  // ← Only on error
  }
  // ← Missing setIsSubmitting(false) on success!
};
```

**The Race Condition:**
1. User clicks "Save Changes" → `setIsSubmitting(true)`
2. `onSave` is called (async)
3. If successful: `setIsSubmitting(false)` is never called
4. User can click "Save Changes" again before dialog closes
5. The guard `if (isSubmitting || isSaving) return;` doesn't prevent the second submission

This could result in duplicate API calls and unexpected behavior.

## Solution

Move `setIsSubmitting(false)` to a `finally` block to ensure it runs in both success and error cases:

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  if (isSubmitting || isSaving) return;
  
  setIsSubmitting(true);
  try {
    await onSave(trimmedName, description.trim() || undefined);
  } catch (error) {
    console.error('Failed to save report:', error);
    setNameError('Failed to save report. Please try again.');
  } finally {
    setIsSubmitting(false);  // ← Always reset state
  }
};
```

## Impact

- Prevents duplicate form submissions
- Ensures `isSubmitting` state is always reset
- Maintains consistent guard behavior for both success and error paths

## Files Modified

- `src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx` (line 235-258)

## Requirements

- Requirement 3.2: Users can edit saved reports

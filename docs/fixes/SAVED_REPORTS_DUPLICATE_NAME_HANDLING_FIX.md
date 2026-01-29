---
title: Saved Reports Duplicate Name Handling Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 90
related_code:
  - src/hooks/useReports.ts
  - src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx
  - src/components/AdvancedFiltersDialog/components/SaveReportDialog.tsx
  - src/pages/api/reports/index.ts
---

# Saved Reports Duplicate Name Handling Fix

## Problem

When a user attempted to save a report with a name that already existed, the application threw a runtime error that displayed the Next.js error overlay instead of showing a user-friendly error message in the Save Report dialog.

The error appeared as:
```
Runtime ReportError
A report with this name already exists
at <unknown> (src/hooks/useReports.ts:185:23)
```

## Root Cause

The original implementation used a throw-based error handling pattern in `createReport()`. While the error was being caught in `handleSaveReport()`, the Next.js development error overlay was still appearing because:

1. The `ReportError` was thrown from `createReport()` in `useReports.ts`
2. Even though the error was caught in the calling code, Next.js's development mode intercepts thrown errors and displays the error overlay
3. This blocked the UI and prevented users from seeing the friendly error message in the dialog

## Solution

Changed from a throw-based error pattern to a result-based pattern for the `createReport()` function:

1. **New `CreateReportResult` type** - Returns success/failure status with optional error details instead of throwing
2. **Modified `createReport()`** - Returns a result object instead of throwing errors
3. **Updated `handleSaveReport()`** - Checks the result object and displays appropriate error messages

### Key Changes

**`src/hooks/useReports.ts`:**
```typescript
// New result type
export interface CreateReportResult {
  success: boolean;
  report?: SavedReport;
  errorCode?: string;
  errorMessage?: string;
}

// createReport now returns result instead of throwing
const createReport = useCallback(
  async (payload: CreateReportPayload): Promise<CreateReportResult> => {
    // ... fetch logic
    if (!response.ok) {
      if (isErrorResponse(data)) {
        return {
          success: false,
          errorCode: data.code,
          errorMessage: data.message,
        };
      }
      return {
        success: false,
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: 'Failed to create report',
      };
    }
    return { success: true, report: newReport };
  },
  []
);
```

**`src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx`:**
```typescript
const handleSaveReport = React.useCallback(
  async (name: string, description?: string) => {
    setIsSavingReport(true);
    setSaveError(null);
    
    const result = await createReport({ name, description, filterConfiguration });
    
    setIsSavingReport(false);
    
    if (result.success) {
      setSaveDialogOpen(false);
      success('Report Saved', `"${name}" has been saved successfully.`);
    } else {
      if (result.errorCode === 'DUPLICATE_NAME') {
        setSaveError(`A report named "${name}" already exists.`);
      } else {
        showError('Save Failed', result.errorMessage || 'Failed to save report');
      }
    }
  },
  [filters, createReport, success, showError]
);
```

## User Experience

After the fix:
- When saving a report with a duplicate name, the Save Report dialog stays open
- A red error message appears in the dialog: "A report named 'X' already exists. Please choose a different name."
- The user can immediately enter a different name without dismissing any error overlays
- No runtime error overlay appears

## Testing

All 73 saved reports tests continue to pass after this change.

## Related Documentation

- [Saved Reports Feature Guide](../guides/SAVED_REPORTS_GUIDE.md)
- [Saved Reports Feature Implementation](../enhancements/SAVED_REPORTS_FEATURE_IMPLEMENTATION.md)
- [Saved Reports Permission Fix](./SAVED_REPORTS_PERMISSION_FIX.md)
- [Saved Reports Empty Custom Fields Fix](./SAVED_REPORTS_EMPTY_CUSTOM_FIELDS_FIX.md)

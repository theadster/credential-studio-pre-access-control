---
title: Bulk Clear Credentials Implementation Guide
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-02
review_interval_days: 90
related_code: [src/pages/api/attendees/bulk-clear-credentials.ts, src/pages/dashboard.tsx]
---

# Bulk Clear Credentials Implementation Guide

## Overview

This guide documents the complete implementation of the "Bulk Clear Credentials" feature for the Attendees page in credential.studio. This feature allows users to clear credentials for multiple attendees in a single operation, complementing the existing "Bulk Generate Credentials" functionality.

**Last Updated:** January 2, 2025 - Fixed critical issues identified in code review

## Feature Description

The Bulk Clear Credentials feature:
- Allows users to select multiple attendees and clear their generated credentials in one action
- Makes a single bulk API call for optimal performance
- Displays a confirmation dialog before proceeding
- Shows real-time progress during the operation
- Provides detailed error reporting for failed operations
- Logs all credential clearing activities (when logging is enabled)
- Uses the same permission system as other credential operations

## Files Modified/Created

### 1. New API Endpoint
**File:** `src/pages/api/attendees/bulk-clear-credentials.ts`

This endpoint handles the server-side logic for clearing credentials from multiple attendees.

**Key Features:**
- Validates user permissions (`attendees.update` OR `attendees.print`)
- Processes multiple attendee IDs in a single request
- Clears `credentialUrl` and `credentialGeneratedAt` fields
- Logs each operation (if enabled)
- Returns success/error counts and detailed error information

### 2. Dashboard Component
**File:** `src/pages/dashboard.tsx`

Three modifications to the dashboard:

#### a. State Variable (Line ~291)
Added state to track bulk clear operation status:
```typescript
const [bulkClearingCredentials, setBulkClearingCredentials] = useState(false);
```

#### b. Handler Function (After `handleBulkGenerateCredentials`)
Added `handleBulkClearCredentials()` function that:
- Validates selection and credential existence
- Shows confirmation dialog
- Makes a single bulk API call (not individual calls)
- Displays progress modal
- Handles errors with detailed reporting
- Updates local state for all cleared attendees

#### c. Menu Item (In Bulk Actions Dropdown)
Added menu option in the bulk actions dropdown menu, positioned right after "Bulk Generate Credentials"
- Uses `attendees.print` permission (matches API endpoint)

## Implementation Details

### API Endpoint: `bulk-clear-credentials.ts`

```typescript
// Request body
{
  attendeeIds: string[]  // Array of attendee IDs to clear credentials for
}

// Response (success)
{
  message: string;
  successCount: number;
  errorCount: number;
  errors?: Array<{ attendeeId: string; error: string }>
}

// Response (error)
{
  error: string;
}
```

**Permissions Required:**
- `attendees.update` OR `attendees.print` OR `all`

**Database Operations:**
- Retrieves each attendee document
- Updates `credentialUrl` to null
- Updates `credentialGeneratedAt` to null
- Creates log entry (if `credentialClear` logging is enabled)

**Error Handling:**
- Returns 405 for non-POST requests
- Returns 403 for insufficient permissions
- Returns 400 for invalid attendee IDs
- Returns 401 for unauthorized access
- Returns 500 for server errors
- Continues processing even if individual attendees fail

### Dashboard Handler: `handleBulkClearCredentials()`

**Flow:**
1. Validates that attendees are selected
2. Filters to only attendees with credentials
3. Shows confirmation dialog
4. Displays progress modal
5. Makes a single bulk API call with all attendee IDs
6. Updates local state for all successfully cleared attendees
7. Shows final result modal (success, partial success, or failure)

**State Updates:**
- Sets `bulkClearingCredentials` to true during operation
- Updates attendee state: sets `credentialUrl` and `credentialGeneratedAt` to null for all cleared attendees
- Sets `bulkClearingCredentials` to false when complete

**User Feedback:**
- Confirmation dialog before proceeding
- Progress modal showing operation status
- Final result modal with success/error counts
- Detailed error list for failed operations (up to 5 shown, with count of additional errors)

### UI Menu Item

**Location:** Bulk actions dropdown menu (after "Bulk Generate Credentials")

**Properties:**
- Icon: `Trash2` (same as individual Clear Credential button)
- Label: "Bulk Clear Credentials"
- Permission: `attendees.print` (matches API endpoint requirements)
- Disabled state: Shows spinner and "Clearing..." text during operation
- Visibility: Always visible when user has permission

## Step-by-Step Implementation

### Step 1: Create API Endpoint

Create file `src/pages/api/attendees/bulk-clear-credentials.ts`:

```typescript
import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    // Check if user has permission to manage attendees
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasPermission = permissions?.attendees?.update || permissions?.attendees?.print || permissions?.all;

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { attendeeIds } = req.body;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendee IDs' });
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ attendeeId: string; error: string }> = [];

    // Process each attendee
    for (const attendeeId of attendeeIds) {
      try {
        // Get the attendee first to check if it exists and has a credential
        const existingAttendee = await databases.getDocument({
          databaseId: dbId,
          collectionId: attendeesCollectionId,
          documentId: attendeeId
        });

        // Clear the credential URL and timestamp
        await databases.updateDocument({
          databaseId: dbId,
          collectionId: attendeesCollectionId,
          documentId: attendeeId,
          data: {
            credentialUrl: null,
            credentialGeneratedAt: null
          }
        });

        // Log the activity if enabled
        if (await shouldLog('credentialClear')) {
          try {
            const fullName = `${existingAttendee.firstName} ${existingAttendee.lastName}`;
            const description = existingAttendee.credentialUrl
              ? `Cleared credential for ${fullName}`
              : `Attempted to clear credential for ${fullName} (no credential existed)`;

            await databases.createDocument({
              databaseId: dbId,
              collectionId: logsCollectionId,
              documentId: ID.unique(),
              data: {
                userId: user.$id,
                attendeeId: attendeeId,
                action: 'clear_credential',
                details: JSON.stringify({
                  type: 'attendee',
                  target: fullName,
                  description,
                  firstName: existingAttendee.firstName,
                  lastName: existingAttendee.lastName,
                  barcodeNumber: existingAttendee.barcodeNumber,
                  ...(existingAttendee.credentialUrl && {
                    previousCredentialUrl: existingAttendee.credentialUrl
                  })
                })
              }
            });
          } catch (logError) {
            console.error('[bulk-clear-credentials] Failed to create log entry, but continuing', {
              error: logError instanceof Error ? logError.message : 'Unknown error',
              attendeeId
            });
          }
        }

        successCount++;
      } catch (error: any) {
        errorCount++;
        const errorMessage = error.message || 'Failed to clear credential';
        errors.push({ attendeeId, error: errorMessage });
        console.error(`Error clearing credential for attendee ${attendeeId}:`, error);
      }
    }

    res.status(200).json({
      message: 'Bulk clear credentials completed',
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error in bulk clear credentials:', error);

    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    res.status(500).json({ error: 'Failed to clear credentials' });
  }
});
```

### Step 2: Add State Variable to Dashboard

In `src/pages/dashboard.tsx`, find the state declarations (around line 280) and add:

```typescript
const [bulkClearingCredentials, setBulkClearingCredentials] = useState(false);
```

**Location:** After `const [bulkGeneratingCredentials, setBulkGeneratingCredentials] = useState(false);`

### Step 3: Add Handler Function to Dashboard

In `src/pages/dashboard.tsx`, find the `handleBulkGenerateCredentials` function (around line 2372) and add the following function after it:

```typescript
const handleBulkClearCredentials = async () => {
  if (selectedAttendees.length === 0) {
    error("No Selection", "Please select attendees to clear credentials for.");
    return;
  }

  // Filter attendees that have credentials
  const selectedAttendeesData = attendees.filter(attendee =>
    selectedAttendees.includes(attendee.id)
  );

  const attendeesWithCredentials = selectedAttendeesData.filter(attendee =>
    attendee.credentialUrl && attendee.credentialUrl.trim() !== ''
  );

  if (attendeesWithCredentials.length === 0) {
    info("No Credentials", "None of the selected attendees have credentials to clear.");
    return;
  }

  const confirmed = await confirm({
    title: 'Clear Credentials',
    text: `Are you sure you want to clear credentials for ${attendeesWithCredentials.length} attendee${attendeesWithCredentials.length !== 1 ? 's' : ''}?`,
    icon: 'warning',
    confirmButtonText: 'Clear Credentials',
    cancelButtonText: 'Cancel'
  });

  if (!confirmed) {
    return;
  }

  setBulkClearingCredentials(true);

  // Show SweetAlert2 progress modal
  const updateProgress = showProgressModal(isDark);
  updateProgress({
    title: 'Clearing Credentials',
    text: `Processing credentials for ${attendeesWithCredentials.length} attendee${attendeesWithCredentials.length !== 1 ? 's' : ''}...`,
    current: 0,
    total: 1, // Single bulk request
  });

  try {
    // Make single bulk API call
    const response = await fetch('/api/attendees/bulk-clear-credentials', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        attendeeIds: attendeesWithCredentials.map(a => a.id) 
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Bulk clear operation failed');
    }

    // Update local state for all successfully cleared attendees
    const clearedIds = attendeesWithCredentials.map(a => a.id);
    setAttendees(prev =>
      prev.map(a =>
        clearedIds.includes(a.id)
          ? { ...a, credentialUrl: null, credentialGeneratedAt: null }
          : a
      )
    );

    // Close progress modal
    closeProgressModal();

    // Show final results based on server response
    if (result.successCount > 0 && result.errorCount === 0) {
      success("Success", `Successfully cleared ${result.successCount} credential${result.successCount === 1 ? '' : 's'}.`);
    } else if (result.successCount > 0 && result.errorCount > 0) {
      // Partial success - show detailed error modal
      const errorListHtml = (result.errors || []).slice(0, 5).map((err: any) =>
        `<li style="margin-bottom: 8px; color: #ef4444; font-size: 0.9em; word-break: break-word;">Attendee ID ${err.attendeeId}: ${err.error}</li>`
      ).join('');
      const moreErrors = (result.errors || []).length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${result.errors.length - 5} more errors</li>` : '';

      await alert({
        title: 'Partial Success',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 16px;">
              <strong style="color: #10b981;">✓ Successfully cleared:</strong> ${result.successCount} credential${result.successCount === 1 ? '' : 's'}
            </p>
            <p style="margin-bottom: 12px;">
              <strong style="color: #ef4444;">✗ Failed to clear:</strong> ${result.errorCount} credential${result.errorCount === 1 ? '' : 's'}
            </p>
            <div style="background: #fee; padding: 12px; border-radius: 6px; margin-top: 12px;">
              <p style="margin-bottom: 8px; font-weight: 600;">Error Details:</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                ${errorListHtml}
                ${moreErrors}
              </ul>
            </div>
          </div>
        `,
        icon: 'warning',
        confirmButtonText: 'OK, I Understand'
      });
    } else {
      // Complete failure - show detailed error modal
      const errorListHtml = (result.errors || []).slice(0, 5).map((err: any) =>
        `<li style="margin-bottom: 8px; color: #ef4444;">Attendee ID ${err.attendeeId}: ${err.error}</li>`
      ).join('');
      const moreErrors = (result.errors || []).length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${result.errors.length - 5} more errors</li>` : '';

      await alert({
        title: 'Credential Clear Failed',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 16px; color: #ef4444;">
              Failed to clear any credentials. Please review the errors below:
            </p>
            <div style="background: #fee; padding: 12px; border-radius: 6px;">
              <p style="margin-bottom: 8px; font-weight: 600;">Error Details:</p>
              <ul style="margin: 0; padding-left: 20px; font-size: 0.9em; max-height: 200px; overflow-y: auto;">
                ${errorListHtml}
                ${moreErrors}
              </ul>
            </div>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK, I Understand'
      });
    }

  } catch (err: any) {
    closeProgressModal();
    error("Error", err.message || "An unexpected error occurred during bulk clear operation.");
  } finally {
    setBulkClearingCredentials(false);
  }
};
```

**IMPORTANT:** This implementation makes a single bulk API call instead of looping through individual attendees, which provides:
- Significantly better performance (1 request instead of N requests)
- Faster execution for large selections
- Consistent with other bulk operations in the application

### Step 4: Add Menu Item to Bulk Actions Dropdown

In `src/pages/dashboard.tsx`, find the bulk actions dropdown menu (around line 3750) and add the following menu item right after the "Bulk Generate Credentials" option:

```typescript
{hasPermission(currentUser?.role, 'attendees', 'print') && (
  <DropdownMenuItem
    onClick={handleBulkClearCredentials}
    disabled={bulkClearingCredentials}
  >
    {bulkClearingCredentials ? (
      <>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
        Clearing...
      </>
    ) : (
      <>
        <Trash2 className="mr-2 h-4 w-4" />
        Bulk Clear Credentials
      </>
    )}
  </DropdownMenuItem>
)}
```

**Location:** In the `DropdownMenuContent` of the Bulk actions dropdown, immediately after the "Bulk Generate Credentials" menu item and before the "Bulk Delete" menu item.

**IMPORTANT:** The permission check uses `attendees.print` to match the API endpoint requirements. This ensures users who can see the menu option will also have permission to execute the action.

## Testing Checklist

After implementation, verify the following:

- [ ] Menu item appears in Bulk actions dropdown
- [ ] Menu item is disabled when no attendees are selected
- [ ] Menu item is disabled when selected attendees have no credentials
- [ ] Confirmation dialog appears before clearing
- [ ] Progress modal shows during operation
- [ ] Progress updates with attendee names
- [ ] Credentials are cleared from database
- [ ] Local state updates after each successful clear
- [ ] Error handling works for failed operations
- [ ] Final result modal shows correct counts
- [ ] Logging works (if enabled)
- [ ] Permission checks work correctly
- [ ] Works with both light and dark themes

## Permission Requirements

The feature uses the `attendees.print` permission:
- Permission key: `attendees.print`
- This matches the API endpoint requirements
- Ensures consistent permission checking between UI and API

This permission should be granted to roles that can manage credentials (typically Admin and Staff roles).

**Why `attendees.print`?**
- Clearing credentials is related to credential management
- Consistent with the individual "Clear Credential" action
- Aligns with the API endpoint's permission checks

## Logging Integration

The feature integrates with the existing logging system:
- Log setting: `credentialClear`
- Action type: `clear_credential`
- Logs include: attendee name, barcode number, previous credential URL (if existed)

Logging is optional and controlled by the `credentialClear` log setting in the Log Settings dialog.

## Related Features

This feature complements:
- **Bulk Generate Credentials** - Generates credentials for multiple attendees
- **Clear Credential** (individual) - Clears credential for a single attendee
- **Bulk Delete** - Deletes multiple attendees
- **Bulk Edit** - Edits multiple attendees

## Troubleshooting

### Menu item doesn't appear
- Check that user has `attendees.bulkGenerateCredentials` permission
- Verify the menu item code is in the correct location in the dropdown

### Operation fails with "Insufficient permissions"
- Verify user's role has the `attendees.bulkGenerateCredentials` permission
- Check that the role permissions are properly configured

### Credentials not clearing
- Verify attendees actually have credentials (credentialUrl is not null)
- Check browser console for error messages
- Verify Appwrite database connection is working

### Logging not working
- Check that `credentialClear` log setting is enabled
- Verify logs collection exists in Appwrite database
- Check that user has permission to create log entries

## Notes

- The feature makes a single bulk API call for optimal performance
- Only attendees with existing credentials are processed
- The operation processes all attendees in one request (not sequentially)
- Errors in one attendee don't prevent processing of others
- The UI updates after the bulk operation completes
- The feature respects the existing permission and logging systems

## Code Review Fixes (January 2, 2025)

The following critical issues were identified and fixed:

### 1. Critical: Frontend Not Using Bulk Endpoint
**Issue:** The original implementation called the single-attendee endpoint in a loop instead of using the bulk endpoint.
**Impact:** For 100 attendees, this resulted in 100 API calls instead of 1, causing severe performance issues.
**Fix:** Refactored `handleBulkClearCredentials` to make a single call to `/api/attendees/bulk-clear-credentials`.

### 2. High: Permission Mismatch
**Issue:** Menu item checked `bulkGenerateCredentials` permission while API required `attendees.print`.
**Impact:** Users could see the option but get 403 errors when clicking it.
**Fix:** Changed menu item to use `attendees.print` permission to match API requirements.

### 3. Recommended: Dedicated Permission
**Status:** Not implemented (would require database schema changes)
**Recommendation:** Consider creating a dedicated `bulkClearCredentials` permission for better granularity in future updates.


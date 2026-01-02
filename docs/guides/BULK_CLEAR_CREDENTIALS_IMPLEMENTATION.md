---
title: Bulk Clear Credentials Implementation Guide
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-01
review_interval_days: 90
related_code: [src/pages/api/attendees/bulk-clear-credentials.ts, src/pages/dashboard.tsx]
---

# Bulk Clear Credentials Implementation Guide

## Overview

This guide documents the complete implementation of the "Bulk Clear Credentials" feature for the Attendees page in credential.studio. This feature allows users to clear credentials for multiple attendees in a single operation, complementing the existing "Bulk Generate Credentials" functionality.

## Feature Description

The Bulk Clear Credentials feature:
- Allows users to select multiple attendees and clear their generated credentials in one action
- Displays a confirmation dialog before proceeding
- Shows real-time progress during the operation
- Provides detailed error reporting for failed operations
- Logs all credential clearing activities (when logging is enabled)
- Uses the same permission system as other bulk operations

## Files Modified/Created

### 1. New API Endpoint
**File:** `src/pages/api/attendees/bulk-clear-credentials.ts`

This endpoint handles the server-side logic for clearing credentials from multiple attendees.

**Key Features:**
- Validates user permissions
- Processes multiple attendee IDs
- Clears `credentialUrl` and `credentialGeneratedAt` fields
- Logs each operation (if enabled)
- Returns success/error counts and detailed error information

### 2. Dashboard Component
**File:** `src/pages/dashboard.tsx`

Three modifications to the dashboard:

#### a. State Variable (Line ~280)
Added state to track bulk clear operation status:
```typescript
const [bulkClearingCredentials, setBulkClearingCredentials] = useState(false);
```

#### b. Handler Function (After `handleBulkGenerateCredentials`)
Added `handleBulkClearCredentials()` function that:
- Validates selection and credential existence
- Shows confirmation dialog
- Displays progress modal
- Processes credentials sequentially
- Handles errors with detailed reporting
- Updates local state

#### c. Menu Item (In Bulk Actions Dropdown)
Added menu option in the bulk actions dropdown menu, positioned right after "Bulk Generate Credentials"

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
4. Displays progress modal with real-time updates
5. Processes each attendee sequentially with 500ms delay between requests
6. Updates local state after each successful clear
7. Collects errors for failed operations
8. Shows final result modal (success, partial success, or failure)

**State Updates:**
- Sets `bulkClearingCredentials` to true during operation
- Updates attendee state: sets `credentialUrl` and `credentialGeneratedAt` to null
- Sets `bulkClearingCredentials` to false when complete

**User Feedback:**
- Confirmation dialog before proceeding
- Progress modal showing current progress and attendee name
- Final result modal with success/error counts
- Detailed error list for failed operations (up to 5 shown, with count of additional errors)

### UI Menu Item

**Location:** Bulk actions dropdown menu (after "Bulk Generate Credentials")

**Properties:**
- Icon: `Trash2` (same as individual Clear Credential button)
- Label: "Bulk Clear Credentials"
- Permission: `attendees.bulkGenerateCredentials` (same as bulk generate)
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
    text: 'Processing credentials for selected attendees...',
    current: 0,
    total: attendeesWithCredentials.length,
  });

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  try {
    for (let i = 0; i < attendeesWithCredentials.length; i++) {
      const attendee = attendeesWithCredentials[i];
      const attendeeName = `${attendee.firstName} ${attendee.lastName}`;

      updateProgress({
        title: 'Clearing Credentials',
        text: 'Processing credentials for selected attendees...',
        current: i + 1,
        total: attendeesWithCredentials.length,
        currentItemName: attendeeName
      });

      try {
        const response = await fetch(`/api/attendees/${attendee.id}/clear-credential`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to clear credential');
        }

        // Update the attendee in the local state
        setAttendees(prev => prev.map(a =>
          a.id === attendee.id
            ? { ...a, credentialUrl: null, credentialGeneratedAt: null }
            : a
        ));

        successCount++;
      } catch (err) {
        errorCount++;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${attendeeName}: ${errorMessage}`);
        console.error(`Error clearing credential for ${attendeeName}:`, err);
      }

      // Small delay between requests to avoid overwhelming the API
      if (i < attendeesWithCredentials.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Close progress modal
    closeProgressModal();

    // Show final results
    if (successCount > 0 && errorCount === 0) {
      success("Success", `Successfully cleared ${successCount} credential${successCount === 1 ? '' : 's'}.`);
    } else if (successCount > 0 && errorCount > 0) {
      // Partial success - show detailed error modal
      const errorListHtml = errors.slice(0, 5).map(err =>
        `<li style="margin-bottom: 8px; color: #ef4444; font-size: 0.9em; word-break: break-word;">${err}</li>`
      ).join('');
      const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${errors.length - 5} more errors</li>` : '';

      await alert({
        title: 'Partial Success',
        html: `
          <div style="text-align: left;">
            <p style="margin-bottom: 16px;">
              <strong style="color: #10b981;">✓ Successfully cleared:</strong> ${successCount} credential${successCount === 1 ? '' : 's'}
            </p>
            <p style="margin-bottom: 12px;">
              <strong style="color: #ef4444;">✗ Failed to clear:</strong> ${errorCount} credential${errorCount === 1 ? '' : 's'}
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
      const errorListHtml = errors.slice(0, 5).map(err =>
        `<li style="margin-bottom: 8px; color: #ef4444;">${err}</li>`
      ).join('');
      const moreErrors = errors.length > 5 ? `<li style="margin-top: 8px; color: #6b7280;">...and ${errors.length - 5} more errors</li>` : '';

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

  } finally {
    setBulkClearingCredentials(false);
  }
};
```

### Step 4: Add Menu Item to Bulk Actions Dropdown

In `src/pages/dashboard.tsx`, find the bulk actions dropdown menu (around line 3750) and add the following menu item right after the "Bulk Generate Credentials" option:

```typescript
{hasPermission(currentUser?.role, 'attendees', 'bulkGenerateCredentials') && (
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

The feature uses the same permission as "Bulk Generate Credentials":
- Permission key: `attendees.bulkGenerateCredentials`

This permission should be granted to roles that can manage credentials (typically Admin and Staff roles).

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

- The feature processes attendees sequentially with a 500ms delay between requests to avoid overwhelming the API
- Only attendees with existing credentials are processed
- The operation is atomic per attendee (either fully succeeds or fully fails)
- Errors in one attendee don't prevent processing of others
- The UI updates in real-time as credentials are cleared
- The feature respects the existing permission and logging systems


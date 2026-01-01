# Access Control Logging Fix

## Issue
When updating an attendee's Access Control fields (Access Status, Valid From, Valid Until), the activity log showed "No changes detected" even though the fields were being updated successfully.

Example log entry:
```
Updated attendee ERIC ADAMS (No changes detected)
Barcode: 3266565
```

## Root Cause
The attendee update API (`src/pages/api/attendees/[id].ts`) was updating Access Control fields in the separate `access_control` collection, but the change detection logic only checked for changes in the main attendee fields (firstName, lastName, barcode, photo, notes) and custom fields. It didn't fetch or compare the existing Access Control data.

## Solution
Added Access Control change detection to the attendee update API:

1. **Fetch Existing Access Control Data**: Before processing the update, fetch the existing Access Control record for the attendee from the `access_control` collection.

2. **Compare Access Control Fields**: Compare the incoming Access Control field values with the existing values:
   - `accessEnabled`: Compare boolean values and format as "Active" / "Inactive"
   - `validFrom`: Compare date strings
   - `validUntil`: Compare date strings

3. **Add to Change Details**: Include Access Control changes in the `changeDetails` array that gets logged:
   - Format: `Access Status: Inactive → Active`
   - Format: `Valid From: empty → 2024-03-15`
   - Format: `Valid Until: 2024-03-20 → 2024-03-25`

4. **Handle New Records**: When creating a new Access Control record (first time setting these fields), show "(new)" as the old value.

## Changes Made

### File: `src/pages/api/attendees/[id].ts`

#### Added Access Control Data Fetching (before change detection)
```typescript
// Fetch existing Access Control data for change detection
let existingAccessControl: any = null;
if (accessControlCollectionId && accessControlUpdateNeeded) {
  try {
    const accessControlResult = await databases.listDocuments(
      dbId,
      accessControlCollectionId,
      [Query.equal('attendeeId', id), Query.limit(1)]
    );
    if (accessControlResult.documents.length > 0) {
      existingAccessControl = accessControlResult.documents[0];
    }
  } catch (error) {
    console.warn('[Attendee Update] Failed to fetch existing access control for change detection:', error);
  }
}
```

#### Added Access Control Change Detection
```typescript
// Check for Access Control field changes
if (accessControlUpdateNeeded && existingAccessControl) {
  if (accessEnabled !== undefined && accessEnabled !== existingAccessControl.accessEnabled) {
    const oldStatus = existingAccessControl.accessEnabled ? 'Active' : 'Inactive';
    const newStatus = accessEnabled ? 'Active' : 'Inactive';
    changeDetails.push(`Access Status: ${oldStatus} → ${newStatus}`);
  }
  if (validFrom !== undefined && validFrom !== existingAccessControl.validFrom) {
    const oldDate = existingAccessControl.validFrom || 'empty';
    const newDate = validFrom || 'empty';
    changeDetails.push(`Valid From: ${oldDate} → ${newDate}`);
  }
  if (validUntil !== undefined && validUntil !== existingAccessControl.validUntil) {
    const oldDate = existingAccessControl.validUntil || 'empty';
    const newDate = validUntil || 'empty';
    changeDetails.push(`Valid Until: ${oldDate} → ${newDate}`);
  }
} else if (accessControlUpdateNeeded && !existingAccessControl) {
  // New Access Control record being created
  if (accessEnabled !== undefined) {
    const newStatus = accessEnabled ? 'Active' : 'Inactive';
    changeDetails.push(`Access Status: (new) → ${newStatus}`);
  }
  if (validFrom !== undefined && validFrom) {
    changeDetails.push(`Valid From: (new) → ${validFrom}`);
  }
  if (validUntil !== undefined && validUntil) {
    changeDetails.push(`Valid Until: (new) → ${validUntil}`);
  }
}
```

## Expected Behavior After Fix

### Example 1: Updating Access Status
**Before:**
```
Updated attendee ERIC ADAMS (No changes detected)
Barcode: 3266565
```

**After:**
```
Updated attendee ERIC ADAMS
Changes: Access Status: Inactive → Active
Barcode: 3266565
```

### Example 2: Updating Multiple Access Control Fields
```
Updated attendee ERIC ADAMS
Changes: Access Status: Inactive → Active, Valid From: empty → 2024-03-15, Valid Until: empty → 2024-03-20
Barcode: 3266565
```

### Example 3: First Time Setting Access Control
```
Updated attendee ERIC ADAMS
Changes: Access Status: (new) → Active, Valid From: (new) → 2024-03-15, Valid Until: (new) → 2024-03-20
Barcode: 3266565
```

### Example 4: Mixed Changes (Basic + Access Control)
```
Updated attendee ERIC ADAMS
Changes: First Name: "Eric" → "ERIC", Access Status: Inactive → Active, Valid From: 2024-03-15 → 2024-03-16
Barcode: 3266565
```

## Technical Details

### Access Control Data Storage
Access Control fields are stored in a separate collection (`access_control`) with the following structure:
- `attendeeId`: Reference to the attendee
- `accessEnabled`: Boolean (true = Active, false = Inactive)
- `validFrom`: String (date or datetime-local format)
- `validUntil`: String (date or datetime-local format)

### Change Detection Flow
1. Parse incoming request body
2. Determine if Access Control update is needed (`accessControlUpdateNeeded`)
3. If needed, fetch existing Access Control record
4. Compare each field that's being updated
5. Add changes to `changeDetails` array
6. Proceed with update
7. Log changes to activity log

### Performance Considerations
- The additional query to fetch existing Access Control data only happens when Access Control fields are being updated
- Uses indexed query on `attendeeId` for fast lookup
- Minimal overhead (single document fetch)

## Testing Recommendations

1. **Update Access Status Only**: Change from Inactive to Active
2. **Update Dates Only**: Change Valid From and/or Valid Until
3. **Update All Access Control Fields**: Change status and both dates
4. **First Time Setting**: Set Access Control on an attendee that doesn't have it yet
5. **Mixed Updates**: Update both basic fields and Access Control fields
6. **No Changes**: Submit update with same values (should still show "No changes detected")

## Related Files

- `src/pages/api/attendees/[id].ts` - Main attendee update API (fixed)
- `src/pages/api/access-control/[attendeeId].ts` - Dedicated Access Control API (already has logging)
- `src/lib/logFormatting.ts` - Log formatting utilities
- `.kiro/specs/access-control-feature/` - Access Control feature specification

## Notes

- The dedicated Access Control API (`/api/access-control/[attendeeId]`) already has proper logging
- This fix ensures consistency when Access Control is updated through the main attendee update endpoint
- Date formatting in logs shows the raw stored format (YYYY-MM-DD or YYYY-MM-DDTHH:mm)
- Future enhancement: Format dates in logs using the event's timezone and format preferences

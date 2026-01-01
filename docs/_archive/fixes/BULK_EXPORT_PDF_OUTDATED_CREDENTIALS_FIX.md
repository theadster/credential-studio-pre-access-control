# Bulk Export PDF - Outdated Credentials Detection Fix

## Overview

Fixed the bulk export PDF feature to use the same "printable fields" logic as the main attendee list when determining if a credential is outdated. Previously, the feature was comparing `credentialGeneratedAt` with `updatedAt`, which would incorrectly mark credentials as outdated when non-printable fields (like email or notes) were modified.

## Problem

The bulk export PDF feature had two issues:

1. **Incorrect Outdated Detection**: It was comparing `credentialGeneratedAt` with `updatedAt`, which would mark credentials as outdated whenever ANY field changed, including non-printable fields like email addresses or internal notes.

2. **Inconsistent Logic**: The main attendee list uses `lastSignificantUpdate` to track only printable field changes, but the bulk export PDF feature wasn't using this same logic.

### Example Scenario (Before Fix)

- Credential generated: 2024-01-05 10:00:00
- Email updated (non-printable field): 2024-01-06 10:00:00
- Record updatedAt: 2024-01-06 10:00:00
- **Old behavior**: Marked as OUTDATED (incorrect - email doesn't appear on credential)
- **New behavior**: Marked as CURRENT (correct - only printable fields matter)

## Solution

Updated `src/pages/api/attendees/bulk-export-pdf.ts` to use the same outdated credential detection logic as the main attendee update endpoint:

### New Logic

```typescript
const attendeesWithOutdatedCredentials = attendees.filter(attendee => {
  // No generation timestamp means outdated
  if (!attendee.credentialGeneratedAt) return true;
  
  const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
  
  // If lastSignificantUpdate doesn't exist, credential is current
  // (no printable changes have been tracked)
  if (!attendee.lastSignificantUpdate) return false;
  
  const lastSignificantUpdate = new Date(attendee.lastSignificantUpdate);
  
  // Credential is outdated if it was generated before the last significant update
  return credentialGeneratedAt < lastSignificantUpdate;
});
```

### Key Changes

1. **Uses `lastSignificantUpdate`**: Compares credential generation time with the last time a printable field was modified
2. **Respects Printable Field Toggle**: Only considers changes to fields marked as `printable: true` in custom field settings
3. **Handles Legacy Records**: Records without `lastSignificantUpdate` are considered current (backward compatible)
4. **Consistent with Main List**: Uses identical logic to the attendee list's outdated status indicator

## Behavior Changes

### Credentials Now Correctly Marked as CURRENT

- When only non-printable fields are updated (email, notes, internal fields)
- When `lastSignificantUpdate` is missing (legacy records)
- When credential was generated after the last printable field change

### Credentials Still Marked as OUTDATED

- When printable fields are updated after credential generation
- When credential was never generated (`credentialGeneratedAt` is null)
- When credential was generated before the last printable field change

## Testing

Created comprehensive unit tests in `src/__tests__/api/attendees/bulk-export-pdf-outdated.test.ts` that verify:

1. Credentials marked as outdated when `credentialGeneratedAt < lastSignificantUpdate`
2. Credentials marked as current when `credentialGeneratedAt >= lastSignificantUpdate`
3. Credentials marked as current when `lastSignificantUpdate` is missing (legacy)
4. Credentials marked as outdated when `credentialGeneratedAt` is missing
5. Correct handling of multiple attendees with mixed statuses
6. Edge cases with millisecond-level timestamp differences
7. Comparison with old logic to verify the fix addresses the issue

## Files Modified

- `src/pages/api/attendees/bulk-export-pdf.ts` - Updated outdated credential detection logic

## Files Added

- `src/__tests__/api/attendees/bulk-export-pdf-outdated.test.ts` - Unit tests for the new logic

## Related Documentation

- **Printable Field Feature**: `.kiro/specs/printable-field-outdated-tracking/`
- **Attendee Update Logic**: `src/pages/api/attendees/[id].ts` (lines 1-450)
- **Bulk Edit Logic**: `src/pages/api/attendees/bulk-edit.ts` (already uses printable field logic)

## Impact

- Users can now export PDFs without false "outdated credentials" warnings when they've only updated non-printable fields
- Bulk export PDF feature now behaves consistently with the main attendee list
- Better user experience - no unnecessary credential regeneration required
- Maintains backward compatibility with legacy records

## Verification

To verify the fix works correctly:

1. Create an attendee with a generated credential
2. Update a non-printable custom field (e.g., email, internal notes)
3. Attempt bulk export PDF
4. **Expected**: Export should succeed without outdated credentials warning
5. Update a printable custom field
6. Attempt bulk export PDF
7. **Expected**: Export should show outdated credentials warning


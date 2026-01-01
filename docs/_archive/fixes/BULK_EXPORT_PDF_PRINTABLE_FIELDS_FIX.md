# Bulk Export PDF Printable Fields Fix

## Issue Description

The bulk export PDF feature had two issues:
1. It was not respecting the "printable fields" toggle when checking for outdated credentials
2. The outdated credential warning was not activating properly

The API was using the generic `updatedAt` field instead of the `lastSignificantUpdate` field, which means it would incorrectly flag credentials as outdated even when only non-printable fields (like email addresses or internal notes) were modified.

## Problem Details

### Original Behavior
- The bulk export PDF API (`src/pages/api/attendees/bulk-export-pdf.ts`) was checking `attendee.updatedAt` to determine if credentials were outdated
- This meant ANY field change would mark a credential as outdated, regardless of the "printable field" toggle
- The warning dialog would appear even when only non-printable fields were modified

### Expected Behavior
- Only changes to fields marked as "printable" (printable=true) should mark credentials as outdated
- Non-printable field changes (like email, internal notes) should NOT trigger the outdated warning
- The logic should match the main Attendees page credential status display

## Root Cause

The bulk export PDF API was using outdated logic that didn't account for the `lastSignificantUpdate` field, which was introduced to track only significant (printable) field changes.

## Solution

Updated the outdated credential check in `src/pages/api/attendees/bulk-export-pdf.ts` to:

1. **Primary Check**: Use `lastSignificantUpdate` field when available
   - This field is only updated when printable fields change
   - Respects the "printable field" toggle in custom field settings
   - Matches the logic used in the dashboard's `getCredentialStatus` function

2. **Fallback Check**: Use `$updatedAt` or `updatedAt` for legacy records
   - Maintains backward compatibility with older attendee records
   - Ensures the feature still works for records created before the printable fields feature

3. **Tolerance Window**: 5-second tolerance for timestamp comparison
   - Accounts for processing time during credential generation
   - Prevents false positives from near-simultaneous updates

## Code Changes

### File: `src/pages/api/attendees/bulk-export-pdf.ts`

**Before:**
```typescript
const attendeesWithOutdatedCredentials = attendees.filter(attendee => {
  if (!attendee.credentialGeneratedAt) return true;
  
  const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
  const recordUpdatedAt = new Date(attendee.updatedAt);
  
  const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
  const isCredentialFromSameUpdate = timeDifference <= 5000;
  
  if (isCredentialFromSameUpdate) {
    return false;
  } else {
    return credentialGeneratedAt < recordUpdatedAt;
  }
});
```

**After:**
```typescript
const attendeesWithOutdatedCredentials = attendees.filter(attendee => {
  if (!attendee.credentialGeneratedAt) return true;
  
  const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
  
  // Check if the attendee has a lastSignificantUpdate field
  // This field is set by the API when printable fields are updated
  const lastSignificantUpdate = (attendee as any).lastSignificantUpdate;
  
  if (lastSignificantUpdate) {
    // Use lastSignificantUpdate for comparison (only considers printable field changes)
    const significantUpdateDate = new Date(lastSignificantUpdate);
    const timeDifference = Math.abs(credentialGeneratedAt.getTime() - significantUpdateDate.getTime());
    const isCredentialFromSameUpdate = timeDifference <= 5000;
    
    if (isCredentialFromSameUpdate || credentialGeneratedAt >= significantUpdateDate) {
      return false; // Current
    } else {
      return true; // Outdated
    }
  }
  
  // Fall back to $updatedAt if lastSignificantUpdate doesn't exist (legacy records)
  const updatedAtField = (attendee as any).$updatedAt || attendee.updatedAt;
  const recordUpdatedAt = new Date(updatedAtField);
  const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
  const isCredentialFromSameUpdate = timeDifference <= 5000;
  
  if (isCredentialFromSameUpdate || credentialGeneratedAt >= recordUpdatedAt) {
    return false; // Current
  } else {
    return true; // Outdated
  }
});
```

## Testing Recommendations

### Test Scenario 1: Non-Printable Field Update
1. Generate a credential for an attendee
2. Update a non-printable custom field (e.g., email address with printable=false)
3. Attempt bulk export PDF
4. **Expected**: No outdated credential warning should appear

### Test Scenario 2: Printable Field Update
1. Generate a credential for an attendee
2. Update a printable custom field (e.g., company name with printable=true)
3. Attempt bulk export PDF
4. **Expected**: Outdated credential warning should appear

### Test Scenario 3: Standard Field Update
1. Generate a credential for an attendee
2. Update a standard field (e.g., firstName, lastName)
3. Attempt bulk export PDF
4. **Expected**: Outdated credential warning should appear (standard fields are always significant)

### Test Scenario 4: Notes Field Update
1. Generate a credential for an attendee
2. Update only the notes field
3. Attempt bulk export PDF
4. **Expected**: No outdated credential warning should appear (notes don't affect credentials)

### Test Scenario 5: Legacy Records
1. Test with attendees that don't have `lastSignificantUpdate` field
2. **Expected**: Should fall back to `updatedAt` logic and work correctly

## Related Files

- `src/pages/api/attendees/bulk-export-pdf.ts` - Fixed file
- `src/pages/dashboard.tsx` - Contains matching `getCredentialStatus` logic
- `src/pages/api/attendees/[id].ts` - Sets `lastSignificantUpdate` field
- `src/pages/api/attendees/bulk-edit.ts` - Sets `lastSignificantUpdate` field

## Related Documentation

- `.kiro/specs/printable-field-outdated-tracking/` - Printable field feature specification
- `docs/enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md` - Notes field enhancement

## Impact

- **User Experience**: Users will no longer see false warnings about outdated credentials when only non-printable fields are modified
- **Workflow Efficiency**: Reduces unnecessary credential regeneration
- **Consistency**: Bulk export PDF now matches the behavior of the main Attendees page
- **Backward Compatibility**: Legacy records without `lastSignificantUpdate` still work correctly

## Date
December 10, 2025

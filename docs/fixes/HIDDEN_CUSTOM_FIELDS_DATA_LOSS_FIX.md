# Hidden Custom Fields Data Loss Fix

## Critical Issue
When custom fields were marked as "not visible" in Event Settings, saving an attendee record would clear the values of those hidden fields, even though the user never changed them. This caused:
- Data loss for hidden field values
- Incorrect change logs showing fields changed to "empty"
- Credentials marked as OUTDATED unnecessarily

## Example of the Problem

**Scenario:**
1. Attendee has custom fields: "Front of House: No", "Backstage: Yes"
2. Admin marks these fields as "not visible" in Event Settings
3. User edits attendee to add notes (doesn't touch the hidden fields)
4. System saves and clears the hidden fields

**Result:**
```
Log: Updated attendee ERIC ADAMS
- Notes: Notes → No notes
- Front of House: No → empty  ← WRONG! User didn't change this
- Backstage: Yes → empty      ← WRONG! User didn't change this
- Credential marked OUTDATED  ← WRONG! No significant changes
```

## Root Cause

**File:** `src/pages/api/attendees/index.ts` (lines 440-442)

The attendees list API was filtering out hidden custom field values:

```typescript
parsedCustomFieldValues = Object.entries(parsed)
  .filter(([customFieldId]) => visibleFieldIds.has(customFieldId)) // Only include visible fields
  .map(([customFieldId, value]) => ({
    customFieldId,
    value: String(value)
  }));
```

**The Problem:**
1. When fetching the attendees list, the API filters out hidden field values (for performance/cleaner UI)
2. User clicks "Edit" on an attendee
3. Dashboard passes the filtered attendee data (missing hidden fields) to AttendeeForm
4. AttendeeForm initializes with ONLY visible field values
5. For boolean fields without values, it defaults them to 'no' (line 213 in AttendeeForm.tsx)
6. Form submits with hidden boolean fields = 'no' instead of their actual values
7. Data loss occurs

**Why Boolean Fields Were Affected:**
Boolean fields have a default value of 'no' when no value exists. So when hidden boolean fields were missing from the attendee data, they were automatically set to 'no', overwriting their actual 'yes' values.

## Solution

**File:** `src/pages/dashboard.tsx` (lines 3060-3075 and 3247-3262)

Fetch the FULL attendee data (including hidden fields) when opening the edit form:

```typescript
// Before (WRONG):
onClick={async () => {
  if (hasPermission(currentUser?.role, 'attendees', 'update')) {
    await refreshEventSettings();
    setEditingAttendee(attendee); // ← Uses filtered list data
    setShowAttendeeForm(true);
  }
}}

// After (CORRECT):
onClick={async () => {
  if (hasPermission(currentUser?.role, 'attendees', 'update')) {
    await refreshEventSettings();
    // Fetch full attendee data including hidden fields
    try {
      const response = await fetch(`/api/attendees/${attendee.id}`);
      if (response.ok) {
        const fullAttendee = await response.json();
        setEditingAttendee(fullAttendee); // ← Uses complete data
      } else {
        setEditingAttendee(attendee); // Fallback
      }
    } catch (error) {
      console.error('Error fetching full attendee:', error);
      setEditingAttendee(attendee); // Fallback
    }
    setShowAttendeeForm(true);
  }
}}
```

**Key Changes:**
1. Added API call to `/api/attendees/${attendee.id}` which returns ALL custom field values
2. This endpoint uses `parseCustomFieldValues()` which does NOT filter by visibility
3. Form now initializes with complete data, including hidden field values
4. Fallback to list data if fetch fails (graceful degradation)

## How It Works Now

### Before (Broken):
1. Form loads with all custom field values (visible and hidden)
2. User edits visible fields only
3. Form submits only visible fields
4. API receives: `{ visibleField1: "value", visibleField2: "value" }`
5. API compares and sees hidden fields are "missing" → marks as changed to empty
6. Data loss occurs

### After (Fixed):
1. Form loads with all custom field values (visible and hidden)
2. User edits visible fields only
3. Form submits ALL fields (visible and hidden)
4. API receives: `{ visibleField1: "value", visibleField2: "value", hiddenField1: "No", hiddenField2: "Yes" }`
5. API compares and sees hidden fields unchanged → no false changes logged
6. Data preserved

## Key Changes

1. **Include all field IDs** - Combines current custom fields with existing values
2. **Send all values** - Even hidden fields are sent with their current values
3. **Preserve empty strings** - Empty values are sent as empty strings, not omitted
4. **No data loss** - Hidden fields maintain their values across saves

## Testing Recommendations

### Test 1: Hidden Fields Preserve Values
1. Create attendee with custom fields: "Field A: Yes", "Field B: No"
2. Mark "Field A" and "Field B" as not visible
3. Edit attendee (change notes only)
4. Save
5. **Expected:** Field A and Field B values unchanged
6. **Expected:** Log shows only notes changed
7. **Expected:** Credential stays CURRENT (if only notes changed)

### Test 2: Visible Fields Still Work
1. Create attendee with custom fields: "Field A: Yes", "Field B: No"
2. Keep fields visible
3. Edit attendee and change "Field A" to "No"
4. Save
5. **Expected:** Field A changed to "No"
6. **Expected:** Field B unchanged
7. **Expected:** Log shows Field A changed
8. **Expected:** Credential marked OUTDATED (significant change)

### Test 3: Mix of Visible and Hidden
1. Create attendee with custom fields: "Visible: Yes", "Hidden: No"
2. Mark "Hidden" as not visible
3. Edit attendee and change "Visible" to "No"
4. Save
5. **Expected:** Visible changed to "No"
6. **Expected:** Hidden unchanged at "No"
7. **Expected:** Log shows only Visible changed
8. **Expected:** Credential marked OUTDATED (significant change)

### Test 4: Boolean Fields
1. Create attendee with boolean field: "Access: No"
2. Mark field as not visible
3. Edit attendee (change notes)
4. Save
5. **Expected:** Access stays "No" (not changed to empty)
6. **Expected:** Log shows only notes changed

### Test 5: Deleted Fields
1. Create attendee with custom field: "OldField: Value"
2. Delete the custom field from Event Settings
3. Edit attendee
4. Save
5. **Expected:** OldField not sent (field doesn't exist anymore)
6. **Expected:** No error occurs

## Impact

### Data Integrity
- ✅ Hidden field values are preserved
- ✅ No accidental data loss
- ✅ Accurate change tracking

### Credential Status
- ✅ Credentials not marked OUTDATED for hidden field "changes"
- ✅ Only real changes trigger credential regeneration
- ✅ Notes-only updates work correctly

### Audit Logs
- ✅ Logs show only actual changes
- ✅ No false "changed to empty" entries
- ✅ Accurate audit trail

## Files Modified

- `src/pages/dashboard.tsx` - Fetch full attendee data before opening edit form (2 locations: name click and dropdown menu)

## Related Issues

This fix works in conjunction with:
- Notes field credential status logic: `docs/enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md`
- Custom field change detection: `src/pages/api/attendees/[id].ts`

## Prevention

To prevent similar issues in the future:
1. Always send all field values, not just visible ones
2. Use explicit `undefined` or `null` to indicate "no change" vs empty string for "cleared"
3. Test with hidden/conditional fields
4. Verify change detection logic handles missing fields correctly

# Printable Field Configuration Change Messaging

## Overview

This enhancement adds informational messaging to the Event Settings Form to notify administrators when they modify the "printable" flag on custom fields. The message clarifies that existing credential statuses will not be automatically updated when the configuration changes.

## Implementation

### Component: EventSettingsForm.tsx

#### 1. State Management

Added state to track original printable flags when the form loads:

```typescript
const [originalPrintableFlags, setOriginalPrintableFlags] = useState<Map<string, boolean>>(new Map());
```

#### 2. Original State Capture

When event settings are loaded, the component captures the original printable flag values:

```typescript
// Store original printable flags for change detection
const printableMap = new Map<string, boolean>();
(eventSettings.customFields || []).forEach(field => {
  if (field.id) {
    printableMap.set(field.id, field.printable === true);
  }
});
setOriginalPrintableFlags(printableMap);
```

#### 3. Change Detection on Save

When the form is submitted, the component compares current printable flags with original values:

```typescript
// Check if any printable flags have changed
let hasPrintableFlagChanges = false;
for (const field of customFields) {
  if (field.id) {
    const originalPrintable = originalPrintableFlags.get(field.id) === true;
    const currentPrintable = field.printable === true;
    
    if (originalPrintable !== currentPrintable) {
      hasPrintableFlagChanges = true;
      break;
    }
  }
}
```

#### 4. Informational Message Display

If printable flag changes are detected, an info message is displayed:

```typescript
if (hasPrintableFlagChanges) {
  info(
    "Printable Field Configuration Updated",
    "Existing credential statuses will not be affected until attendee records are updated. Only future changes to these fields will impact credential status."
  );
}
```

## User Experience

### When Printable Flags Are Modified

1. Administrator opens Event Settings
2. Administrator changes the "printable" toggle on one or more custom fields
3. Administrator clicks "Save"
4. System saves the changes
5. System displays an informational alert with:
   - **Title**: "Printable Field Configuration Updated"
   - **Message**: "Existing credential statuses will not be affected until attendee records are updated. Only future changes to these fields will impact credential status."

### When No Printable Flags Are Modified

- No additional message is shown
- Normal save success notification from parent component is displayed

## Technical Details

### Change Detection Logic

The implementation uses a Map to efficiently track and compare printable flags:

- **Key**: Custom field ID (string)
- **Value**: Original printable status (boolean)

The comparison explicitly checks for `=== true` to handle:
- `undefined` values (treated as false)
- `null` values (treated as false)
- Explicit `false` values

### Edge Cases Handled

1. **New Fields**: Fields without IDs (temporary IDs) are skipped in change detection
2. **Deleted Fields**: Only existing fields in the current state are checked
3. **Undefined Values**: Treated as `false` for consistent comparison
4. **Form Reset**: Original flags are cleared when form is reset

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 8.1**: Changes to printable flag do not automatically mark existing credentials as OUTDATED
- **Requirement 8.2**: Changes to printable flag do not automatically mark existing credentials as CURRENT
- **Requirement 8.3**: Printable flag is only evaluated when attendee data is modified
- **Requirement 8.4**: Message is displayed when printable flag changes are saved

## Benefits

1. **Clear Communication**: Administrators understand that configuration changes don't trigger mass reprints
2. **Prevents Confusion**: Clarifies that only future attendee updates will be affected
3. **Non-Intrusive**: Message only appears when relevant (printable flags actually changed)
4. **Consistent UX**: Uses existing SweetAlert info notification system

## Testing Recommendations

### Manual Testing Scenarios

1. **Change Printable Flag from False to True**
   - Open Event Settings
   - Toggle a field's printable flag from off to on
   - Save settings
   - Verify info message appears

2. **Change Printable Flag from True to False**
   - Open Event Settings
   - Toggle a field's printable flag from on to off
   - Save settings
   - Verify info message appears

3. **Change Multiple Printable Flags**
   - Open Event Settings
   - Toggle multiple fields' printable flags
   - Save settings
   - Verify info message appears once

4. **No Printable Flag Changes**
   - Open Event Settings
   - Modify other settings (event name, date, etc.)
   - Do not change any printable flags
   - Save settings
   - Verify info message does NOT appear

5. **Add New Field with Printable Flag**
   - Open Event Settings
   - Add a new custom field
   - Set printable flag to true
   - Save settings
   - Verify info message does NOT appear (new field, not a change)

## Related Documentation

- **Design Document**: `.kiro/specs/printable-field-outdated-tracking/design.md`
- **Requirements**: `.kiro/specs/printable-field-outdated-tracking/requirements.md`
- **Implementation Plan**: `.kiro/specs/printable-field-outdated-tracking/tasks.md`

## Files Modified

- `src/components/EventSettingsForm.tsx`
  - Added `originalPrintableFlags` state
  - Updated `useEffect` to capture original flags
  - Updated `handleSubmit` to detect changes and show message

## Conclusion

This enhancement provides clear, timely feedback to administrators when they modify printable field configurations, helping them understand the impact (or lack thereof) on existing credential statuses. The implementation is lightweight, non-intrusive, and follows established patterns in the codebase.

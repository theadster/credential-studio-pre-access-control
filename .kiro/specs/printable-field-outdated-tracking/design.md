# Design Document

## Overview

This feature extends the existing credential status tracking system by introducing a "printable" flag to custom fields. Currently, the system uses a `lastSignificantUpdate` timestamp to track when "significant" fields change (excluding the notes field). However, ALL custom fields are currently treated as significant.

This enhancement allows administrators to mark custom fields as "printable" or "non-printable". Only changes to printable custom fields will update the `lastSignificantUpdate` timestamp and mark credentials as OUTDATED. This avoids unnecessary reprints when non-printed information (like email addresses or internal notes) changes.

**Existing Behavior:**
- Notes field changes → Does NOT update `lastSignificantUpdate` → Credential stays CURRENT ✓
- Custom field changes → Updates `lastSignificantUpdate` → Credential becomes OUTDATED

**New Behavior:**
- Notes field changes → Does NOT update `lastSignificantUpdate` → Credential stays CURRENT ✓
- Non-printable custom field changes → Does NOT update `lastSignificantUpdate` → Credential stays CURRENT ✓
- Printable custom field changes → Updates `lastSignificantUpdate` → Credential becomes OUTDATED

The design builds upon the existing `lastSignificantUpdate` mechanism (added for the notes field enhancement) and extends it to be aware of which custom fields are printable.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     Event Settings Form                          │
│  Admin configures custom fields with "printable" toggle         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Custom Field Configuration                      │
│  { fieldName, fieldType, required, visible, printable }         │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Attendee Update API                           │
│  Compares changed fields against printable configuration        │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ├─── Printable field changed? ──► Update lastSignificantUpdate
                     │
                     └─── Only non-printable changed? ──► Keep lastSignificantUpdate
                                                           unchanged
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Credential Status Display                       │
│  Compare credentialGeneratedAt vs lastSignificantUpdate         │
│  Show OUTDATED badge if credential is older                     │
└─────────────────────────────────────────────────────────────────┘
```

### Component Interaction

```
EventSettingsForm ──► Custom Field Config ──► Appwrite Database
                                                      │
                                                      ▼
Attendee Form ──► Attendee Update API ──► Check Printable Fields
                                                      │
                                                      ├─► Update lastSignificantUpdate
                                                      │
                                                      ▼
Dashboard ──► Display Credential Status ──► Compare Timestamps
```

## Components and Interfaces

### 1. Custom Field Interface Extension

**Location:** `src/components/EventSettingsForm.tsx`

**Current Interface:**
```typescript
interface CustomField {
  id?: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: any;
  required: boolean;
  order: number;
  showOnMainPage?: boolean;
}
```

**Updated Interface:**
```typescript
interface CustomField {
  id?: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: any;
  required: boolean;
  order: number;
  showOnMainPage?: boolean;
  printable?: boolean;  // NEW: Indicates if field appears on printed credential
}
```

**Default Value:** `false` (non-printable by default for backward compatibility)

**Rationale:** This follows the same pattern as the notes field. Just as notes changes don't trigger `lastSignificantUpdate`, non-printable custom field changes won't either.

### 2. Event Settings Form UI

**Location:** `src/components/EventSettingsForm.tsx` - `CustomFieldForm` component

**New UI Element:**
```tsx
<div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
  <div className="space-y-0.5">
    <Label htmlFor="printable" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
      <Printer className="h-4 w-4" />
      Printable Field
    </Label>
    <div className="text-xs text-muted-foreground">
      Mark this field as printable if it appears on the credential. Changes to printable fields will mark credentials as outdated and require reprinting.
    </div>
  </div>
  <Switch
    id="printable"
    checked={fieldData.printable || false}
    onCheckedChange={(checked) => setFieldData(prev => ({ ...prev, printable: checked }))}
  />
</div>
```

**Visual Indicator in Field List:**
```tsx
{field.printable && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className="text-xs">
          <Printer className="h-3 w-3 mr-1" />
          Printable
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>This field appears on printed credentials</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

### 3. Attendee Update API Logic

**Location:** `src/pages/api/attendees/[id].ts`

**Current Logic:**
```typescript
// From docs/enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md
// Currently ALL custom field changes are considered significant
const hasSignificantChanges = 
  (firstName && firstName !== existingAttendee.firstName) ||
  (lastName && lastName !== existingAttendee.lastName) ||
  (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) ||
  (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) ||
  hasCustomFieldChanges;  // ALL custom fields trigger this

// Notes field changes do NOT trigger hasSignificantChanges
```

**Updated Logic:**
```typescript
// Fetch custom fields configuration to check printable status
const customFieldsDocs = await databases.listDocuments(
  dbId,
  customFieldsCollectionId,
  [Query.limit(100)]
);
const customFields = customFieldsDocs.documents;

// Create a map of field ID to printable status
const printableFieldsMap = new Map(
  customFields.map((cf: any) => [cf.$id, cf.printable === true])
);

// Check if any printable custom fields changed
let hasPrintableCustomFieldChanges = false;
if (customFieldValues !== undefined && Array.isArray(customFieldValues)) {
  const newCustomFieldValues: Record<string, any> = {};
  customFieldValues.forEach((cfv: any) => {
    if (cfv.customFieldId) {
      newCustomFieldValues[cfv.customFieldId] = cfv.value;
    }
  });
  
  // Check if any PRINTABLE custom field value is different
  for (const [fieldId, newValue] of Object.entries(newCustomFieldValues)) {
    const oldValue = currentCustomFieldValues[fieldId];
    const isPrintable = printableFieldsMap.get(fieldId) === true;
    
    if (isPrintable && String(oldValue || '') !== String(newValue || '')) {
      hasPrintableCustomFieldChanges = true;
      break;
    }
  }
  
  // Also check if any existing PRINTABLE custom field was removed
  if (!hasPrintableCustomFieldChanges) {
    for (const fieldId of Object.keys(currentCustomFieldValues)) {
      const isPrintable = printableFieldsMap.get(fieldId) === true;
      if (isPrintable && !(fieldId in newCustomFieldValues) && currentCustomFieldValues[fieldId]) {
        hasPrintableCustomFieldChanges = true;
        break;
      }
    }
  }
}

// Significant changes now only include printable field changes
const hasSignificantChanges = 
  (firstName && firstName !== existingAttendee.firstName) ||
  (lastName && lastName !== existingAttendee.lastName) ||
  (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) ||
  (photoUrl !== undefined && photoUrl !== existingAttendee.photoUrl) ||
  hasPrintableCustomFieldChanges;  // Only PRINTABLE custom field changes matter

// This follows the same pattern as notes:
// - Notes changes → hasSignificantChanges = false → lastSignificantUpdate not updated
// - Non-printable custom field changes → hasSignificantChanges = false → lastSignificantUpdate not updated
// - Printable custom field changes → hasSignificantChanges = true → lastSignificantUpdate updated
```

### 4. Database Schema

**Collection:** `custom_fields`

**New Attribute:**
- **Name:** `printable`
- **Type:** Boolean
- **Required:** No
- **Default:** `false`
- **Description:** Indicates whether this field appears on the printed credential

**Existing Related Fields:**
- **`lastSignificantUpdate`** (in `attendees` collection): Already exists, added for notes field enhancement
- **`notes`** (in `attendees` collection): Already exists, changes don't update `lastSignificantUpdate`

**Migration Strategy:**
- Existing custom fields without the `printable` attribute will be treated as `false` (non-printable)
- No data migration required - backward compatible
- The `lastSignificantUpdate` field already exists in the attendees collection
- Admins can update fields to mark them as printable as needed

**Relationship to Notes Field Enhancement:**
This feature extends the same pattern established by the notes field:
- Notes field: Hardcoded to not update `lastSignificantUpdate`
- Custom fields: Configurable via `printable` flag whether they update `lastSignificantUpdate`

### 5. Credential Status Display

**Location:** `src/pages/dashboard.tsx`

**Current Logic (No Changes Required):**
The existing `getCredentialStatus()` function already compares `credentialGeneratedAt` with `lastSignificantUpdate`. Since we're updating `lastSignificantUpdate` only when printable fields change, the existing logic will automatically work correctly.

```typescript
const getCredentialStatus = (attendee: Attendee) => {
  if (!attendee.credentialUrl || !attendee.credentialGeneratedAt) {
    return null;
  }

  const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
  const lastSignificantUpdate = (attendee as any).lastSignificantUpdate;

  if (lastSignificantUpdate) {
    const significantUpdateDate = new Date(lastSignificantUpdate);
    const timeDifference = Math.abs(credentialGeneratedAt.getTime() - significantUpdateDate.getTime());
    const isCredentialFromSameUpdate = timeDifference <= 5000;

    if (isCredentialFromSameUpdate || credentialGeneratedAt >= significantUpdateDate) {
      return 'current';
    } else {
      return 'outdated';
    }
  }

  // Fallback logic...
};
```

**Visual Indicators (Already Exist):**
- OUTDATED badge: Red/destructive color
- CURRENT badge: Green/success color
- Filter options: "Show Outdated Only", "Show Current Only"

## Data Models

### Custom Field Model

```typescript
interface CustomField {
  $id: string;                    // Appwrite document ID
  fieldName: string;              // Display name (e.g., "Email Address")
  internalFieldName: string;      // Snake_case identifier (e.g., "email_address")
  fieldType: string;              // "text", "number", "email", "select", etc.
  fieldOptions?: {                // Type-specific options
    options?: string[];           // For select fields
    uppercase?: boolean;          // For text fields
  };
  required: boolean;              // Must be filled out
  order: number;                  // Display order
  showOnMainPage: boolean;        // Visible in main table
  printable: boolean;             // NEW: Appears on printed credential
  $createdAt: string;             // Appwrite timestamp
  $updatedAt: string;             // Appwrite timestamp
}
```

### Attendee Model (No Changes)

```typescript
interface Attendee {
  $id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string;
  photoUrl?: string;
  credentialUrl?: string;
  credentialGeneratedAt?: string;      // When credential was last generated
  lastSignificantUpdate?: string;      // When printable data was last changed
  customFieldValues: string;           // JSON string of field values
  $createdAt: string;
  $updatedAt: string;
}
```

## Error Handling

### 1. Missing Custom Fields Configuration

**Scenario:** Custom fields collection is unavailable during attendee update

**Handling:**
```typescript
try {
  const customFieldsDocs = await databases.listDocuments(
    dbId,
    customFieldsCollectionId,
    [Query.limit(100)]
  );
  const customFields = customFieldsDocs.documents;
} catch (error) {
  console.error('Failed to fetch custom fields:', error);
  // Fallback: Treat all custom field changes as significant
  hasCustomFieldChanges = true;
}
```

**Rationale:** If we can't determine which fields are printable, err on the side of caution and mark the credential as outdated.

### 2. Invalid Printable Flag Value

**Scenario:** Custom field has invalid or missing `printable` property

**Handling:**
```typescript
const isPrintable = printableFieldsMap.get(fieldId) === true;
```

**Rationale:** Explicitly check for `true` value. Undefined, null, or any other value is treated as `false` (non-printable).

### 3. Bulk Operations

**Scenario:** Bulk edit operations need to check printable fields

**Handling:**
- Fetch custom fields configuration once at the start of bulk operation
- Apply same printable field logic to each attendee update
- Log any errors but continue processing other attendees

### 4. Configuration Changes

**Scenario:** Admin changes a field from non-printable to printable (or vice versa)

**Handling:**
- No automatic status updates to existing attendees
- Display informational message: "Existing credential statuses will not be affected until attendee records are updated"
- Document this behavior in admin UI tooltip

## Testing Strategy

### 1. Unit Tests

**File:** `src/pages/api/attendees/__tests__/[id].test.ts`

**Test Cases:**
```typescript
describe('Printable Field Tracking', () => {
  it('should update lastSignificantUpdate when printable field changes', async () => {
    // Setup: Create attendee with printable custom field
    // Action: Update printable field value
    // Assert: lastSignificantUpdate is updated
  });

  it('should NOT update lastSignificantUpdate when non-printable field changes', async () => {
    // Setup: Create attendee with non-printable custom field
    // Action: Update non-printable field value
    // Assert: lastSignificantUpdate remains unchanged
  });

  it('should update lastSignificantUpdate when both printable and non-printable fields change', async () => {
    // Setup: Create attendee with both field types
    // Action: Update both fields
    // Assert: lastSignificantUpdate is updated (because printable field changed)
  });

  it('should handle missing printable flag as non-printable', async () => {
    // Setup: Create custom field without printable property
    // Action: Update field value
    // Assert: lastSignificantUpdate remains unchanged
  });

  it('should handle custom fields fetch failure gracefully', async () => {
    // Setup: Mock custom fields fetch to fail
    // Action: Update attendee
    // Assert: Falls back to treating all changes as significant
  });
});
```

### 2. Integration Tests

**File:** `src/__tests__/integration/printable-field-tracking.test.ts`

**Test Cases:**
- End-to-end flow: Create custom field → Mark as printable → Update attendee → Verify status
- Credential generation resets status correctly
- Dashboard displays correct OUTDATED/CURRENT badges
- Filter functionality works with printable field logic

### 3. UI Tests

**File:** `src/components/__tests__/EventSettingsForm.test.tsx`

**Test Cases:**
- Printable toggle appears in custom field form
- Printable toggle saves correctly
- Printable badge displays in field list
- Tooltip shows correct information
- Default value is false for new fields

### 4. Manual Testing Checklist

1. **Admin Configuration:**
   - [ ] Create new custom field with printable=true
   - [ ] Create new custom field with printable=false
   - [ ] Edit existing field to change printable status
   - [ ] Verify printable badge displays correctly
   - [ ] Verify tooltip shows correct information

2. **Attendee Updates:**
   - [ ] Update printable field → Credential marked OUTDATED
   - [ ] Update non-printable field → Credential remains CURRENT
   - [ ] Update both types → Credential marked OUTDATED
   - [ ] Update notes field → Credential remains CURRENT

3. **Credential Generation:**
   - [ ] Generate credential → Status changes to CURRENT
   - [ ] Update printable field → Status changes to OUTDATED
   - [ ] Regenerate credential → Status returns to CURRENT

4. **Dashboard Display:**
   - [ ] OUTDATED badge shows for outdated credentials
   - [ ] CURRENT badge shows for current credentials
   - [ ] Filter by OUTDATED works correctly
   - [ ] Filter by CURRENT works correctly

5. **Backward Compatibility:**
   - [ ] Existing custom fields work without printable flag
   - [ ] Existing attendees with credentials show correct status
   - [ ] No errors in console for legacy data

## Performance Considerations

### 1. Custom Fields Fetch

**Impact:** Each attendee update now requires fetching custom fields configuration

**Optimization:**
```typescript
// Cache custom fields configuration in memory for the request
let customFieldsCache: any[] | null = null;

const getCustomFields = async () => {
  if (customFieldsCache === null) {
    const customFieldsDocs = await databases.listDocuments(
      dbId,
      customFieldsCollectionId,
      [Query.limit(100)]
    );
    customFieldsCache = customFieldsDocs.documents;
  }
  return customFieldsCache;
};
```

**Rationale:** For bulk operations, this prevents fetching custom fields multiple times.

### 2. Printable Fields Map

**Impact:** Creating a map for each update adds minimal overhead

**Optimization:**
```typescript
// Use Map for O(1) lookup instead of array.find()
const printableFieldsMap = new Map(
  customFields.map((cf: any) => [cf.$id, cf.printable === true])
);
```

**Rationale:** Map lookup is O(1) vs O(n) for array.find().

### 3. Database Queries

**Impact:** No additional database queries required

**Rationale:** We're already fetching custom fields for validation. The printable check is just an additional property read.

## Security Considerations

### 1. Permission Checks

**Requirement:** Only users with appropriate permissions can modify custom field configuration

**Implementation:**
- Existing permission checks in Event Settings API apply
- No new permission types required
- Printable flag is part of custom field configuration, protected by existing RBAC

### 2. Data Validation

**Requirement:** Validate printable flag value

**Implementation:**
```typescript
// In Event Settings API
if (customField.printable !== undefined && typeof customField.printable !== 'boolean') {
  return res.status(400).json({ error: 'Printable flag must be a boolean value' });
}
```

### 3. Audit Logging

**Requirement:** Log changes to printable flag configuration

**Implementation:**
- Existing event settings update logging captures printable flag changes
- No additional logging required
- Changes are part of the event settings audit trail

## Backward Compatibility

### 1. Existing Custom Fields

**Behavior:** Fields without `printable` property are treated as non-printable

**Implementation:**
```typescript
const isPrintable = printableFieldsMap.get(fieldId) === true;
```

**Rationale:** Explicit check for `true` ensures undefined/null/missing values default to `false`.

### 2. Existing Attendees

**Behavior:** Attendees with existing credentials continue to work

**Implementation:**
- No data migration required
- Existing `lastSignificantUpdate` timestamps remain valid
- Status calculation logic unchanged

### 3. API Compatibility

**Behavior:** API endpoints remain backward compatible

**Implementation:**
- Printable flag is optional in all requests
- Responses include printable flag only if present
- No breaking changes to existing API contracts

## Migration Plan

### Phase 1: Database Schema Update

1. Add `printable` boolean attribute to `custom_fields` collection
2. Set default value to `false`
3. Make attribute optional (not required)

**Script:** `scripts/add-printable-attribute.ts`

```typescript
import { Client, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function addPrintableAttribute() {
  try {
    await databases.createBooleanAttribute(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!,
      'printable',
      false,  // required
      false,  // default value
      false   // array
    );
    console.log('✓ Added printable attribute to custom_fields collection');
  } catch (error) {
    console.error('Error adding printable attribute:', error);
  }
}

addPrintableAttribute();
```

### Phase 2: Code Deployment

1. Deploy updated TypeScript interfaces
2. Deploy Event Settings Form UI changes
3. Deploy Attendee Update API logic changes
4. Deploy Dashboard display changes (if any)

**Deployment Order:**
1. Backend API changes (attendee update logic)
2. Frontend UI changes (Event Settings Form)
3. Dashboard changes (if any)

**Rollback Plan:**
- Remove `printable` attribute from database
- Revert code changes
- Existing functionality continues to work (all fields treated as significant)

### Phase 3: Admin Communication

1. Document new feature in admin guide
2. Notify admins of new printable flag option
3. Provide examples of when to use printable vs non-printable

**Documentation:**
- Add section to admin guide explaining printable fields
- Include screenshots of UI
- Provide use case examples

## Future Enhancements

### 1. Bulk Printable Flag Update

**Feature:** Allow admins to mark multiple fields as printable at once

**Implementation:**
- Add "Bulk Edit" button in Event Settings
- Show checklist of all custom fields
- Apply printable flag to selected fields

### 2. Printable Field Templates

**Feature:** Save and load printable field configurations

**Implementation:**
- Export current printable field configuration as JSON
- Import configuration from JSON file
- Useful for events with similar credential layouts

### 3. Credential Change Preview

**Feature:** Show which fields changed since last credential generation

**Implementation:**
- Add "View Changes" button next to OUTDATED badge
- Display diff of printable field values
- Help staff understand why reprint is needed

### 4. Automatic Reprint Queue

**Feature:** Automatically queue outdated credentials for reprinting

**Implementation:**
- Background job to detect outdated credentials
- Add to reprint queue automatically
- Notify staff when queue has items

## Conclusion

This design provides a robust, backward-compatible solution for tracking credential status based on printable field changes. The implementation builds upon the existing notes field enhancement pattern and extends it to custom fields with minimal changes to the codebase.

**Relationship to Existing Features:**
- **Notes Field Enhancement:** Introduced `lastSignificantUpdate` to exclude notes from credential status tracking
- **This Enhancement:** Extends the same pattern to allow custom fields to be excluded via `printable` flag

Key benefits:
- ✅ Reduces unnecessary reprints
- ✅ Maintains backward compatibility
- ✅ Simple admin configuration
- ✅ Minimal performance impact
- ✅ Leverages existing `lastSignificantUpdate` infrastructure
- ✅ Follows established pattern from notes field
- ✅ Clear visual indicators for staff
- ✅ No new database fields in attendees collection (reuses `lastSignificantUpdate`)

The design is ready for implementation following the task list in the next phase.

## References

- **Notes Field Enhancement:** `docs/enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md`
- **Existing Implementation:** `src/pages/api/attendees/[id].ts` (lines 170-186)
- **Dashboard Status Logic:** `src/pages/dashboard.tsx` (lines 2030-2047, 2302-2319)

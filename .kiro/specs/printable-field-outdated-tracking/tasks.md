# Implementation Plan

- [x] 1. Add database schema for printable field attribute
  - Add `printable` boolean attribute to `custom_fields` collection in Appwrite
  - Set default value to `false` for backward compatibility
  - Create migration script to add the attribute
  - _Requirements: 1.1, 2.1, 7.2_

- [x] 2. Update TypeScript interfaces and types
  - [x] 2.1 Update `CustomField` interface in EventSettingsForm.tsx to include `printable` property
    - Add `printable?: boolean` to the interface
    - Document the property with JSDoc comments
    - _Requirements: 1.1, 7.1_
  
  - [x] 2.2 Update custom field validation schema
    - Add `printable` as optional boolean field in validation
    - Ensure validation handles undefined/null values correctly
    - _Requirements: 7.2, 7.4_

- [x] 3. Implement Event Settings Form UI for printable toggle
  - [x] 3.1 Add printable toggle to CustomFieldForm component
    - Add Switch component with "Printable Field" label
    - Include help text explaining what printable means
    - Position after "Show on Main Page" toggle for consistency
    - Import Printer icon from lucide-react
    - _Requirements: 1.1, 6.1, 6.2_
  
  - [x] 3.2 Add printable badge to field list display
    - Show "Printable" badge with printer icon for printable fields
    - Add tooltip explaining the badge
    - Style consistently with existing badges (Required, Visible)
    - _Requirements: 1.3, 6.3_
  
  - [x] 3.3 Handle printable flag in field save logic
    - Ensure printable value is included when saving custom fields
    - Set default to false for new fields
    - Preserve existing value when editing fields
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 4. Implement attendee update API logic for printable field tracking
  - [x] 4.1 Fetch custom fields configuration in update endpoint
    - Add query to fetch custom fields from database
    - Create map of field ID to printable status
    - Handle fetch errors gracefully (fallback to treating all as significant)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.3_
  
  - [x] 4.2 Implement printable field change detection
    - Check if changed custom fields are marked as printable
    - Compare old and new values only for printable fields
    - Handle removed printable field values
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [x] 4.3 Update hasSignificantChanges logic
    - Replace `hasCustomFieldChanges` with `hasPrintableCustomFieldChanges`
    - Maintain existing logic for firstName, lastName, barcodeNumber, photoUrl
    - Ensure notes field continues to not trigger significant changes
    - Update `lastSignificantUpdate` only when printable fields change
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 7.4_

- [x] 5. Handle bulk operations
  - [x] 5.1 Update bulk edit endpoint to use printable field logic
    - Apply same printable field checking to bulk updates
    - Fetch custom fields once for the entire bulk operation
    - Handle errors for individual attendees without failing entire batch
    - _Requirements: 3.5_
  
  - [x] 5.2 Update bulk import to respect printable fields
    - Ensure imported data follows printable field rules
    - Set `lastSignificantUpdate` appropriately for new records
    - _Requirements: 3.5_

- [x] 6. Add informational messaging for configuration changes
  - [x] 6.1 Add message when saving Event Settings with printable flag changes
    - Display info message: "Existing credential statuses will not be affected until attendee records are updated"
    - Show message only when printable flags are modified
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 7. Update documentation
  - [x] 7.1 Add JSDoc comments to CustomField interface
    - Document the printable property
    - Explain relationship to credential status tracking
    - _Requirements: 6.1, 6.2_
  
  - [x] 7.2 Update API endpoint documentation
    - Document printable field logic in attendee update endpoint
    - Explain how printable fields affect lastSignificantUpdate
    - _Requirements: 7.1_
  
  - [x] 7.3 Create user guide for printable fields feature
    - Explain when to mark fields as printable
    - Provide examples of printable vs non-printable fields
    - Include screenshots of UI
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. Write tests for printable field functionality
  - [x] 8.1 Unit tests for printable field change detection
    - Test updating printable field marks credential outdated
    - Test updating non-printable field keeps credential current
    - Test updating both types marks credential outdated
    - Test missing printable flag defaults to non-printable
    - Test custom fields fetch failure fallback
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [x] 8.2 Integration tests for end-to-end flow
    - Test creating custom field with printable flag
    - Test updating attendee with printable field changes
    - Test credential status display
    - Test filter functionality
    - _Requirements: 1.1, 3.1, 4.1, 4.3_
  
  - [x] 8.3 UI tests for Event Settings Form
    - Test printable toggle appears and functions
    - Test printable badge displays correctly
    - Test tooltip shows correct information
    - Test default value is false
    - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 9. Verify backward compatibility
  - [x] 9.1 Test existing custom fields without printable flag
    - Verify they are treated as non-printable (false)
    - Verify no errors occur with missing property
    - _Requirements: 2.1, 2.2, 7.4_
  
  - [x] 9.2 Test existing attendees with credentials
    - Verify status calculation still works
    - Verify lastSignificantUpdate field is respected
    - _Requirements: 2.1, 2.2_
  
  - [x] 9.3 Test API compatibility
    - Verify requests without printable flag work
    - Verify responses include printable flag when present
    - _Requirements: 2.3_

# Implementation Plan

- [x] 1. Update database schema to support visibility control
  - Add `showOnMainPage` boolean attribute to custom_fields collection
  - Add database index for performance optimization
  - _Requirements: 4.1, 4.2_

- [x] 2. Implement default custom fields creation logic
  - [x] 2.1 Create `createDefaultCustomFields` function in event-settings API
    - Create Credential Type field (select type, empty options, order 1)
    - Create Notes field (textarea type, order 2)
    - Both fields default to showOnMainPage = true
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 4.3, 4.4_
  
  - [x] 2.2 Integrate default fields creation into event settings POST handler
    - Call `createDefaultCustomFields` after creating event settings document
    - Handle errors gracefully without failing event creation
    - _Requirements: 1.1, 2.1_

- [x] 3. Update custom fields API endpoints for visibility control
  - [x] 3.1 Update POST endpoint to set default showOnMainPage value
    - Set showOnMainPage to true for new custom fields
    - _Requirements: 3.2, 4.2_
  
  - [x] 3.2 Update PUT endpoint to allow showOnMainPage updates
    - Accept showOnMainPage in request body
    - Validate boolean type
    - Include in update document data
    - _Requirements: 3.3, 3.7_
  
  - [x] 3.3 Update GET endpoints to include showOnMainPage in responses
    - Verify attribute is returned in document responses
    - _Requirements: 3.1_

- [x] 4. Implement visibility filtering in attendees API
  - [x] 4.1 Add custom fields visibility query logic
    - Fetch custom fields with visibility information
    - Create set of visible field IDs
    - _Requirements: 3.4, 4.5_
  
  - [x] 4.2 Filter custom field values based on visibility
    - Filter attendee custom field values to only include visible fields
    - Handle missing showOnMainPage attribute (default to visible)
    - _Requirements: 3.4, 3.9_

- [x] 5. Update EventSettingsForm component for visibility control
  - [x] 5.1 Add showOnMainPage to CustomField interface
    - Update TypeScript interface definition
    - _Requirements: 5.2_
  
  - [x] 5.2 Add visibility toggle to custom field editor dialog
    - Add Switch component for showOnMainPage
    - Add descriptive label and help text
    - Handle toggle state changes
    - _Requirements: 3.1, 3.2, 5.2_
  
  - [x] 5.3 Add visibility indicator to custom fields list
    - Display badge or icon for visible fields
    - Add tooltip explaining visibility feature
    - _Requirements: 5.1, 5.5_

- [x] 6. Update Dashboard component to respect visibility settings
  - [x] 6.1 Filter custom fields for table display
    - Create visibleCustomFields array filtering by showOnMainPage
    - Use useMemo for performance optimization
    - _Requirements: 3.3, 3.4, 5.3_
  
  - [x] 6.2 Update table headers to show only visible fields
    - Map over visibleCustomFields instead of all customFields
    - _Requirements: 3.3, 5.3_
  
  - [x] 6.3 Update table rows to show only visible field values
    - Display values only for visible custom fields
    - _Requirements: 3.3, 5.3_

- [x] 7. Verify AttendeeForm displays all fields regardless of visibility
  - Confirm existing behavior shows all custom fields in edit/create forms
  - No code changes needed, just verification
  - _Requirements: 3.5, 3.6_

- [x] 8. Add validation and error handling
  - [x] 8.1 Add type validation for showOnMainPage in API endpoints
    - Validate boolean type in PUT requests
    - Return 400 error for invalid types
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 8.2 Add error handling for default fields creation
    - Wrap createDefaultCustomFields in try-catch
    - Log errors without failing event creation
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [x] 8.3 Add error handling for visibility toggle in UI
    - Display toast notification on update failure
    - Revert toggle state on error
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Update documentation and add comments
  - Add JSDoc comments to new functions
  - Update API documentation for new parameters
  - Add inline comments explaining visibility logic
  - _Requirements: All_

- [x] 10. Verify permissions and access control
  - Confirm visibility toggle respects customFields.update permission
  - Verify default fields creation respects existing permissions
  - Test with different user roles
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

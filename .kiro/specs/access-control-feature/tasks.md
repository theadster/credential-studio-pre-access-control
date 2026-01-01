# Implementation Plan

- [x] 1. Add database schema attributes for Access Control settings
  - Create migration script to add `accessControlEnabled` (boolean, default: false) and `accessControlTimeMode` (enum: date_only/date_time, default: date_only) to event_settings collection
  - Run migration script against Appwrite database
  - _Requirements: 1.2, 1.3, 3.2, 3.3_

- [x] 2. Update Event Settings types and API
  - [x] 2.1 Extend EventSettings TypeScript interface with new fields
    - Add `accessControlEnabled: boolean` and `accessControlTimeMode: 'date_only' | 'date_time'` to `src/components/EventSettingsForm/types.ts`
    - _Requirements: 1.2, 3.2_
  - [x] 2.2 Update Event Settings API to handle new fields
    - Modify `src/pages/api/event-settings/index.ts` to read/write new attributes
    - Ensure default values are set for new events (accessControlEnabled: false, accessControlTimeMode: 'date_only')
    - _Requirements: 1.6, 3.5, 7.1_
  - [x] 2.3 Write property test for API response completeness
    - **Property 11: API Response Completeness**
    - **Validates: Requirements 7.1**

- [x] 3. Create date interpretation utilities
  - [x] 3.1 Implement date utility functions
    - Create `src/lib/accessControlDates.ts` with `startOfDay()`, `endOfDay()`, `formatForDisplay()`, and `parseForStorage()` functions
    - Handle timezone conversion using event timezone
    - _Requirements: 4.3, 4.4, 4.5, 4.6_
  - [x] 3.2 Write property test for date-only interpretation
    - **Property 6: Date-Only Mode Interpretation**
    - **Validates: Requirements 4.3, 4.4**
  - [x] 3.3 Write property test for date-time exact storage
    - **Property 7: Date-Time Mode Exact Storage**
    - **Validates: Requirements 4.5, 4.6**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Create Access Control Tab component for Event Settings
  - [x] 5.1 Implement AccessControlTab component
    - Create `src/components/EventSettingsForm/AccessControlTab.tsx`
    - Include toggle switch for "Enable Access Control"
    - Include warning alert with hardware requirement notice (visible when enabled)
    - Include radio group for Time Mode selection (visible when enabled)
    - _Requirements: 1.1, 2.1, 2.2, 2.3, 3.1_
  - [x] 5.2 Integrate AccessControlTab into EventSettingsForm
    - Add new tab to the Event Settings form tabs
    - Wire up state management for new fields
    - _Requirements: 1.1, 3.1_
  - [x] 5.3 Write property test for warning visibility
    - **Property 3: Warning Notice Visibility**
    - **Validates: Requirements 2.1, 2.4**
  - [x] 5.4 Write property test for toggle state persistence
    - **Property 1: Access Control Toggle State Persistence**
    - **Validates: Requirements 1.2, 1.3**
  - [x] 5.5 Write property test for time mode storage
    - **Property 4: Time Mode Storage**
    - **Validates: Requirements 3.2, 3.3**

- [x] 6. Update Attendee Form with conditional access control fields
  - [x] 6.1 Create AccessControlFields component
    - Create component with validFrom, validUntil date pickers and accessEnabled select
    - Implement conditional date picker type based on time mode (date-only vs date-time)
    - Add validation for date range (validFrom must be before validUntil)
    - _Requirements: 4.1, 4.2, 5.1, 8.1_
  - [x] 6.2 Integrate AccessControlFields into AttendeeForm
    - Conditionally render AccessControlFields based on `accessControlEnabled` from event settings
    - Pass time mode and timezone to component
    - _Requirements: 1.4, 1.5, 5.2, 5.3_
  - [x] 6.3 Write property test for field visibility
    - **Property 2: Access Control Field Visibility**
    - **Validates: Requirements 1.4, 1.5**
  - [x] 6.4 Write property test for date picker type
    - **Property 5: Date Picker Type Based on Time Mode**
    - **Validates: Requirements 4.1, 4.2**
  - [x] 6.5 Write property test for date validation
    - **Property 12: Date Validation**
    - **Validates: Requirements 8.1**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Update Attendees Table with conditional columns
  - [x] 8.1 Add access control columns to attendees table
    - Add validFrom, validUntil, and accessEnabled columns
    - Conditionally show/hide columns based on `accessControlEnabled`
    - Format dates according to time mode setting
    - Display accessEnabled as "Active" (green badge) or "Inactive" (red badge)
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [x] 8.2 Write property test for table column visibility
    - **Property 9: Table Column Visibility**
    - **Validates: Requirements 6.1, 6.2**
  - [x] 8.3 Write property test for date display formatting
    - **Property 10: Date Display Formatting**
    - **Validates: Requirements 6.3**

- [x] 9. Update Attendees API for access control fields
  - [x] 9.1 Ensure attendee API includes access control fields
    - Verify validFrom, validUntil, accessEnabled are included in API responses
    - Apply date interpretation based on event settings time mode when saving
    - _Requirements: 7.2, 7.3_
  - [x] 9.2 Write property test for null date handling
    - **Property 13: Null Date Handling**
    - **Validates: Requirements 8.2, 8.3, 8.4**

- [x] 10. Update Access Status field visibility
  - [x] 10.1 Implement access status field visibility logic
    - Conditionally show/hide Access Status field in attendee form based on event settings
    - Conditionally show/hide Access Status column in attendees table
    - _Requirements: 5.3, 5.4_
  - [x] 10.2 Write property test for access status field visibility
    - **Property 8: Access Status Field Visibility**
    - **Validates: Requirements 5.1, 5.3**

- [x] 11. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

# Implementation Plan: Mobile Settings Passcode

## Task List

- [x] 1. Create database migration script
  - Create script to add `mobileSettingsPasscode` string attribute to `event_settings` collection
  - Set attribute size to 4 characters, required: false, default: null
  - Handle 409 conflict if attribute already exists
  - Add verification logging
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 2. Update TypeScript interfaces
  - Add `mobileSettingsPasscode?: string | null` to `EventSettings` interface in `src/components/EventSettingsForm/types.ts`
  - Add JSDoc comment explaining the field purpose
  - _Requirements: 6.1, 6.3_

- [x] 3. Update Access Control Tab component
  - Import `Smartphone` icon from lucide-react
  - Add new Card component for "Mobile App Security" section
  - Add passcode input field with proper validation attributes (type="text", inputMode="numeric", pattern="[0-9]{4}", maxLength={4})
  - Implement onChange handler to strip non-numerical characters
  - Add conditional rendering (only show when `accessControlEnabled` is true)
  - Add help text explaining the passcode purpose
  - Update memo comparison function to include `mobileSettingsPasscode` field
  - _Requirements: 1.1, 1.5, 5.1, 5.2, 5.3, 6.1_

- [x] 4. Add backend validation to Event Settings API
  - Add passcode format validation in `/api/event-settings` PUT handler
  - Validate passcode is exactly 4 numerical digits using regex `/^[0-9]{4}$/`
  - Allow null value (no passcode protection)
  - Return 400 error with clear message for invalid format
  - _Requirements: 1.2, 1.3, 2.2, 6.4_

- [x] 5. Update Mobile Event Info API
  - Add `mobileSettingsPasscode` field to response in `/api/mobile/event-info`
  - Return passcode value when set, null when not set
  - Ensure field is always present in response (never undefined)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 6. Run database migration
  - Execute the migration script created in task 1
  - Verify attribute was created successfully in Appwrite console
  - Test that existing event settings documents are not affected
  - _Requirements: 4.1, 4.2_

- [x] 7. Test passcode functionality end-to-end
  - Test setting a valid 4-digit passcode in web UI
  - Test clearing passcode (setting to null)
  - Test validation errors for invalid formats
  - Test Mobile API returns correct passcode value
  - Test Mobile API returns null when passcode not set
  - Verify cache invalidation works correctly
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3_

- [x] 8. Create mobile app implementation prompt document
  - Create comprehensive documentation file with API details
  - Include complete endpoint URL and authentication requirements
  - Provide example API requests and responses
  - Document expected UX and validation rules
  - Include error handling scenarios and edge cases
  - Add security best practices and recommendations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_


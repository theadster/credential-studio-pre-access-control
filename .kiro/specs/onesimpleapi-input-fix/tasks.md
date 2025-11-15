# Implementation Plan

- [x] 1. Fix the IntegrationsTab memo comparison
  - Remove the custom memo comparison function that's preventing re-renders
  - The custom comparison only checks enabled flags but not actual field values
  - This causes input fields to not update when users type
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 4.1, 4.2, 4.3_

- [x] 2. Verify all integration fields accept input correctly
  - Test OneSimpleAPI fields (URL, Form Data Key, templates)
  - Test Cloudinary fields (Cloud Name, Upload Preset, etc.)
  - Test Switchboard fields (API Endpoint, Template ID, Request Body)
  - Ensure typing in any field updates the display immediately
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 3. Verify HTML sanitization works correctly on submit
  - Test that dangerous HTML (script tags, event handlers) is removed on save
  - Test that safe HTML tags (div, span, p, etc.) are preserved
  - Test that placeholder variables like {{firstName}} are preserved
  - Test that sanitized HTML displays correctly when form is reopened
  - _Requirements: 1.3, 1.4, 2.4, 2.5_

- [x] 4. Add URL validation for OneSimpleAPI webhook URL
  - Validate URL format when OneSimpleAPI is enabled
  - Show clear error message if URL is invalid
  - Ensure validation runs on form submission
  - _Requirements: 3.1_

- [x] 5. Add required field validation for OneSimpleAPI
  - When OneSimpleAPI is enabled, require Webhook URL field
  - Show validation error if enabled but URL is missing
  - Update validation logic in useEventSettingsForm hook
  - _Requirements: 3.3_

- [x] 6. Document the fix and root cause
  - Create a documentation file explaining the issue
  - Document why the custom memo comparison was problematic
  - Explain the fix and why it works
  - Add to docs/fixes/ directory
  - _Requirements: 4.4_

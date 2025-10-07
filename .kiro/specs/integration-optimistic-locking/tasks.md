# Implementation Plan

- [x] 1. Add version field to integration interfaces
  - Update CloudinaryIntegration interface to include `version: number`
  - Update SwitchboardIntegration interface to include `version: number`
  - Update OneSimpleApiIntegration interface to include `version: number`
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 2. Create IntegrationConflictError class
  - Create custom error class that extends Error
  - Include integrationType, eventSettingsId, expectedVersion, and actualVersion properties
  - Implement clear error message that explains the conflict
  - Set error name to 'IntegrationConflictError'
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Create generic updateIntegrationWithLocking helper function
  - Implement generic helper that handles version checking logic
  - Accept collectionId, integrationType, eventSettingsId, data, expectedVersion, and getExisting function
  - Implement version verification when expectedVersion is provided
  - Throw IntegrationConflictError when versions don't match
  - Handle create with version 1, update with incremented version
  - Implement retry logic for concurrent create conflicts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_

- [x] 4. Refactor updateCloudinaryIntegration to use optimistic locking
  - Add optional expectedVersion parameter to function signature
  - Update return type to Promise<CloudinaryIntegration> (remove null)
  - Call updateIntegrationWithLocking helper with Cloudinary-specific parameters
  - Remove old check-then-act implementation
  - Remove silent error handling that returns null
  - _Requirements: 2.1, 2.2, 3.1, 6.1, 6.2_

- [x] 5. Refactor updateSwitchboardIntegration to use optimistic locking
  - Add optional expectedVersion parameter to function signature
  - Update return type to Promise<SwitchboardIntegration> (remove null)
  - Call updateIntegrationWithLocking helper with Switchboard-specific parameters
  - Remove old check-then-act implementation
  - Remove silent error handling that returns null
  - _Requirements: 2.1, 2.2, 3.2, 6.1, 6.2_

- [x] 6. Refactor updateOneSimpleApiIntegration to use optimistic locking
  - Add optional expectedVersion parameter to function signature
  - Update return type to Promise<OneSimpleApiIntegration> (remove null)
  - Call updateIntegrationWithLocking helper with OneSimpleAPI-specific parameters
  - Remove old check-then-act implementation
  - Remove silent error handling that returns null
  - _Requirements: 2.1, 2.2, 3.3, 6.1, 6.2_

- [x] 7. Update API routes to handle IntegrationConflictError
  - Find all API routes that call integration update functions
  - Add try-catch blocks to catch IntegrationConflictError
  - Return 409 status code with conflict details when IntegrationConflictError is caught
  - Return 500 status code for other errors
  - Update error responses to include version information
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 8. Add version attribute to Appwrite database collections
  - Add version attribute (integer, required, default: 1) to Cloudinary collection
  - Add version attribute (integer, required, default: 1) to Switchboard collection
  - Add version attribute (integer, required, default: 1) to OneSimpleAPI collection
  - Verify attributes are created successfully in Appwrite console
  - _Requirements: 1.1, 6.3_

- [x] 9. Create migration script for existing integration documents
  - Create script to iterate over all existing integration documents
  - Check if version field exists, if not set it to 1
  - Run script for Cloudinary, Switchboard, and OneSimpleAPI collections
  - Log migration progress and results
  - _Requirements: 6.3, 6.4_

- [x] 10. Add unit tests for optimistic locking
  - Write tests for version increment on create (should be 1) and update (should increment)
  - Write tests for conflict detection when expectedVersion doesn't match
  - Write tests for backward compatibility when expectedVersion is not provided
  - Write tests for IntegrationConflictError properties and message
  - Write tests for all three integration types (Cloudinary, Switchboard, OneSimpleAPI)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.3, 3.4_

- [x] 11. Add integration tests for concurrent updates
  - Write tests that simulate concurrent updates with same expectedVersion
  - Verify one succeeds and one fails with ConflictError
  - Write tests for concurrent creates
  - Write tests for API route conflict responses (409 status)
  - Verify consistent behavior across all three integration types
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

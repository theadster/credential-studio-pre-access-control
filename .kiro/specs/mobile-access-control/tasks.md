# Implementation Plan

- [x] 1. Set up database collections and schema
  - [x] 1.1 Create access_control collection in Appwrite
    - Add collection with attributes: attendeeId, accessEnabled, validFrom, validUntil
    - Create index on attendeeId for fast lookups
    - Set up permissions for authenticated users
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2_

  - [x] 1.2 Create approval_profiles collection in Appwrite
    - Add collection with attributes: name, description, version, rules (JSON string), isDeleted
    - Create unique index on name
    - Set up permissions for authenticated users
    - _Requirements: 3.1, 3.2, 3.6_

  - [x] 1.3 Create scan_logs collection in Appwrite
    - Add collection with attributes: attendeeId, barcodeScanned, result, denialReason, profileId, profileVersion, deviceId, operatorId, scannedAt, uploadedAt, localId
    - Create indexes on scannedAt, deviceId, operatorId
    - Create unique index on localId for deduplication
    - _Requirements: 10.1, 10.3_

  - [x] 1.4 Update setup-appwrite.ts script with new collections
    - Add createAccessControlCollection function
    - Add createApprovalProfilesCollection function
    - Add createScanLogsCollection function
    - Update environment variable output
    - _Requirements: 1.1, 3.1, 10.1_

- [x] 2. Implement access control data layer
  - [x] 2.1 Create access control types and interfaces
    - Define AccessControl interface in src/types/accessControl.ts
    - Define validation schemas using Zod
    - _Requirements: 1.1, 2.1_

  - [x] 2.2 Write property test for UTC datetime storage
    - **Property 1: UTC datetime storage**
    - **Validates: Requirements 1.2, 1.3**

  - [x] 2.3 Write property test for date validation constraint
    - **Property 2: Date validation constraint**
    - **Validates: Requirements 1.6**

  - [x] 2.4 Create access control API route (GET/PUT)
    - Implement GET /api/access-control/[attendeeId]
    - Implement PUT /api/access-control/[attendeeId]
    - Add date validation (validFrom must be before validUntil)
    - Store datetimes in UTC format
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 2.3, 2.4_

  - [x] 2.5 Write unit tests for access control API ✅
    - Test GET returns access control record
    - Test PUT updates access control
    - Test date validation error
    - _Requirements: 1.1, 1.6_

- [x] 3. Implement approval profiles management
  - [x] 3.1 Create approval profile types and interfaces
    - Define ApprovalProfile, RuleGroup, Rule interfaces in src/types/approvalProfile.ts
    - Define RuleOperator type with all operators
    - Create Zod schemas for validation
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 3.2 Write property test for profile serialization round-trip
    - **Property 18: Profile serialization round-trip**
    - **Validates: Requirements 12.5**

  - [x] 3.3 Create approval profiles API routes
    - Implement GET /api/approval-profiles (list all)
    - Implement GET /api/approval-profiles/[id] (get single)
    - Implement POST /api/approval-profiles (create)
    - Implement PUT /api/approval-profiles/[id] (update with version increment)
    - Implement DELETE /api/approval-profiles/[id] (soft delete)
    - _Requirements: 3.1, 3.2, 3.6, 3.7_

  - [x] 3.4 Write property test for profile name uniqueness
    - **Property 4: Profile name uniqueness**
    - **Validates: Requirements 3.2**

  - [x] 3.5 Write property test for profile version increment
    - **Property 5: Profile version increment**
    - **Validates: Requirements 3.6, 4.1**

  - [x] 3.6 Write unit tests for approval profiles API
    - Test CRUD operations
    - Test version increment on update
    - Test soft delete behavior
    - _Requirements: 3.1, 3.6, 3.7_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement rule engine
  - [x] 5.1 Create rule engine module
    - Implement evaluateRule function for each operator
    - Implement evaluateRuleGroup function with AND/OR logic
    - Implement getFieldValue for dot-notation field paths
    - Create src/lib/ruleEngine.ts
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_

  - [x] 5.2 Write property test for AND logic evaluation
    - **Property 12: AND logic evaluation**
    - **Validates: Requirements 11.1**

  - [x] 5.3 Write property test for OR logic evaluation
    - **Property 13: OR logic evaluation**
    - **Validates: Requirements 11.2**

  - [x] 5.4 Write property test for nested rule evaluation
    - **Property 14: Nested rule evaluation order**
    - **Validates: Requirements 11.3**

  - [x] 5.5 Write property test for null field handling
    - **Property 15: Null field handling**
    - **Validates: Requirements 11.4**

  - [x] 5.6 Write property test for case-insensitive list matching
    - **Property 17: Case-insensitive list matching**
    - **Validates: Requirements 11.6**

  - [x] 5.7 Write unit tests for rule engine operators
    - Test each operator with various inputs
    - Test edge cases (null values, empty strings)
    - _Requirements: 3.4, 11.4_

- [x] 6. Implement scan evaluation logic
  - [x] 6.1 Create scan evaluation module
    - Implement evaluateScan function
    - Implement denial reason priority logic
    - Implement validity window checking
    - Create src/lib/scanEvaluation.ts
    - _Requirements: 7.3, 7.4, 7.5, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 6.2 Write property test for disabled access denial
    - **Property 3: Disabled access denial**
    - **Validates: Requirements 2.3, 2.4**

  - [x] 6.3 Write property test for approval evaluation completeness
    - **Property 8: Approval evaluation completeness**
    - **Validates: Requirements 7.4**

  - [x] 6.4 Write property test for denial reason priority
    - **Property 9: Denial reason priority**
    - **Validates: Requirements 8.5**

  - [x] 6.5 Write property test for default validation without profile
    - **Property 10: Default validation without profile**
    - **Validates: Requirements 9.4**

  - [x] 6.6 Write unit tests for scan evaluation
    - Test approval scenarios
    - Test each denial reason
    - Test priority ordering
    - _Requirements: 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement mobile sync APIs
  - [x] 8.1 Create mobile sync attendees endpoint
    - Implement GET /api/mobile/sync/attendees
    - Support delta sync with 'since' parameter
    - Include access control data in response
    - Include pagination support
    - _Requirements: 6.1, 6.2, 6.4_

  - [x] 8.2 Write property test for profile sync version comparison
    - **Property 6: Profile sync version comparison**
    - **Validates: Requirements 4.2, 4.3**

  - [x] 8.3 Create mobile sync profiles endpoint
    - Implement GET /api/mobile/sync/profiles
    - Support version comparison with 'versions' parameter
    - Return only profiles with newer versions
    - _Requirements: 4.2, 4.3, 4.5_

  - [x] 8.4 Create mobile custom fields endpoint
    - Implement GET /api/mobile/custom-fields
    - Return field definitions for rule building
    - _Requirements: 3.3_

  - [x] 8.5 Write unit tests for mobile sync APIs
    - Test full sync
    - Test delta sync
    - Test version comparison
    - _Requirements: 6.1, 6.4, 4.2, 4.3_

- [x] 9. Implement scan logging
  - [x] 9.1 Create scan logs upload endpoint
    - Implement POST /api/mobile/scan-logs
    - Handle batch uploads
    - Implement deduplication using localId
    - _Requirements: 10.1, 10.2, 10.5_

  - [x] 9.2 Write property test for scan log completeness
    - **Property 11: Scan log completeness**
    - **Validates: Requirements 10.1**

  - [x] 9.3 Create scan logs viewer API
    - Implement GET /api/scan-logs (list with filters)
    - Implement GET /api/scan-logs/export (CSV export)
    - _Requirements: 10.3, 10.4_

  - [x] 9.4 Write unit tests for scan logs APIs
    - Test log upload
    - Test deduplication
    - Test filtering and export
    - _Requirements: 10.1, 10.2, 10.4_

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement web UI components
  - [x] 11.1 Create AccessControlForm component
    - Add validFrom datetime picker
    - Add validUntil datetime picker
    - Add accessEnabled toggle
    - Add date validation (validFrom < validUntil)
    - Integrate with attendee form
    - _Requirements: 1.1, 1.6, 2.1_

  - [x] 11.2 Create ApprovalProfileManager component
    - Create profile list view with search
    - Create profile editor dialog
    - Create rule builder with field selector
    - Create operator selector with value input
    - Create AND/OR logic grouping UI
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 11.3 Create ScanLogsViewer component
    - Create filterable log table
    - Add device/operator/date filters
    - Add export button
    - Add result (approved/denied) filter
    - _Requirements: 10.3, 10.4_

  - [x] 11.4 Add access control tab to dashboard
    - Add navigation to approval profiles
    - Add navigation to scan logs
    - _Requirements: 3.1, 10.3_

- [x] 12. Integrate RBAC and logging
  - [x] 12.1 Add access control permissions to role system
    - Add accessControl permissions (read, write)
    - Add approvalProfiles permissions (read, write, delete)
    - Add scanLogs permissions (read, export)
    - Update default roles
    - _Requirements: 5.1, 5.4_

  - [x] 12.2 Add audit logging for access control actions
    - Log profile create/update/delete
    - Log access control changes
    - Add log settings for new actions
    - _Requirements: 10.1_

- [x] 13. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

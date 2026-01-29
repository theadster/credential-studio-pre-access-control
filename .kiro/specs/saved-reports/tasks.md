# Implementation Plan: Saved Reports Feature

## Overview

This implementation plan breaks down the Saved Reports feature into discrete, incremental coding tasks. Each task builds on previous work, with property-based tests integrated close to implementation to catch errors early. The plan follows a bottom-up approach: database schema → types → services → API → hooks → UI components.

## Tasks

- [x] 1. Set up database schema and types
  - [x] 1.1 Create reports collection setup script
    - Add `createReportsCollection` function to `scripts/setup-appwrite.ts`
    - Define attributes: name, description, userId, filterConfiguration, createdAt, updatedAt, lastAccessedAt
    - Create indexes on userId, name, and createdAt
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 1.2 Create TypeScript types for reports
    - Create `src/types/reports.ts` with SavedReport, CreateReportPayload, UpdateReportPayload interfaces
    - Create StaleParameter and ReportValidationResult interfaces
    - _Requirements: 6.2_

  - [x] 1.3 Add reports permissions to permissions system
    - Update `src/lib/permissions.ts` to include reports resource with create, read, update, delete permissions
    - _Requirements: 5.1_

  - [x] 1.4 Configure reports collection environment variable
    - Add `NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID=reports` to `.env.local`
    - Update `.env.example` to document the reports collection ID variable
    - _Requirements: 6.1_

  - [x] 1.5 Run Appwrite setup script to create reports collection
    - Execute `npm run setup:appwrite` to create the reports collection in Appwrite
    - Verify the collection is created with all required attributes and indexes
    - Verify environment variables are properly configured
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 2. Implement report validation service
  - [x] 2.1 Create report validation utility
    - Create `src/lib/reportValidation.ts` with `validateReportConfiguration` function
    - Implement stale custom field detection logic
    - Implement stale dropdown value detection logic
    - _Requirements: 4.1, 4.2, 4.9_

  - [x] 2.2 Write property test for stale parameter detection
    - **Property 6: Stale Parameter Detection**
    - Test that all stale custom field references are identified
    - Test that stale dropdown values are flagged correctly
    - **Validates: Requirements 4.2, 4.4, 4.9**

- [x] 3. Implement reports API routes
  - [x] 3.1 Create reports list and create API endpoint
    - Create `src/pages/api/reports/index.ts`
    - Implement GET handler to list reports for current user (with admin override)
    - Implement POST handler to create new report with validation
    - Include permission checks for read and create operations
    - _Requirements: 2.1, 1.2, 5.2, 5.3, 5.7, 5.8_

  - [x] 3.2 Create single report API endpoint
    - Create `src/pages/api/reports/[id].ts`
    - Implement GET handler with validation result
    - Implement PUT handler for updates
    - Implement DELETE handler with permission check
    - Update lastAccessedAt on GET
    - _Requirements: 2.2, 3.2, 3.4, 3.5, 5.4, 5.5_

  - [x] 3.3 Write property test for permission enforcement
    - **Property 9: Permission Enforcement**
    - Test that users without permissions receive 403 errors
    - Test that operations are not performed when permission denied
    - **Validates: Requirements 5.2, 5.3, 5.4, 5.5**

  - [x] 3.4 Write property test for user-scoped listing
    - **Property 10: User-Scoped Report Listing**
    - Test that non-admin users only see their own reports
    - Test that admin users see all reports
    - **Validates: Requirements 5.7, 5.8**

- [x] 4. Checkpoint - Ensure database setup is complete
  - Ensure reports collection is created in Appwrite
  - Ensure environment variables are properly configured
  - Ask the user if questions arise.

- [x] 5. Implement useReports hook
  - [x] 5.1 Create useReports React hook
    - Create `src/hooks/useReports.ts`
    - Implement CRUD operations: createReport, updateReport, deleteReport, loadReport
    - Implement reports list fetching with loading and error states
    - Handle validation results from loadReport
    - _Requirements: 1.2, 2.2, 3.4, 3.5_

  - [x] 5.2 Write property test for filter configuration round-trip
    - **Property 1: Filter Configuration Round-Trip Consistency**
    - Test that saving and loading preserves all filter values, operators, and match mode
    - **Validates: Requirements 1.4, 2.2, 2.3, 6.5**

- [x] 6. Implement Save Report dialog
  - [x] 6.1 Create SaveReportDialog component
    - Create `src/components/AdvancedFiltersDialog/components/SaveReportDialog.tsx`
    - Implement form with name (required) and description (optional) fields
    - Add validation for empty name
    - Follow existing dialog styling patterns (slate header/footer)
    - _Requirements: 1.1, 1.3, 7.3_

  - [x] 6.2 Write property test for empty name validation
    - **Property 2: Empty Name Validation**
    - Test that whitespace-only names are rejected
    - Test that empty string names are rejected
    - **Validates: Requirements 1.3**

- [x] 7. Implement Load Report dialog
  - [x] 7.1 Create LoadReportDialog component
    - Create `src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx`
    - Display list of reports with name, description, dates
    - Implement report selection and load action
    - Add edit and delete buttons for each report
    - Follow existing dialog styling patterns
    - _Requirements: 2.1, 3.1, 3.2, 3.3, 7.3_

  - [x] 7.2 Write property test for report list display
    - **Property 13: Report List Display Completeness**
    - Test that all required fields are displayed for each report
    - **Validates: Requirements 3.1**

- [x] 8. Implement Report Correction dialog
  - [x] 8.1 Create ReportCorrectionDialog component
    - Create `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx`
    - Display list of stale parameters with original names and values
    - Implement "Apply with valid filters only" action
    - Implement "Remove" action for individual stale parameters
    - Implement field replacement dropdown for stale custom fields
    - Add "Save corrections" action
    - _Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.4_

  - [x] 8.2 Write property test for stale parameter removal
    - **Property 7: Stale Parameter Removal on Apply**
    - Test that applying with removal excludes all stale parameters
    - **Validates: Requirements 4.8**

- [x] 9. Checkpoint - Ensure dialog components work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Integrate reports into Advanced Filters dialog
  - [x] 10.1 Add Save/Load buttons to AdvancedFiltersDialog
    - Update `src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx`
    - Add "Save Report" and "Load Report" buttons to dialog footer
    - Disable "Save Report" when no filters are active
    - Wire up dialog open/close state for SaveReportDialog and LoadReportDialog
    - _Requirements: 7.1, 7.2_

  - [x] 10.2 Implement report loading flow with validation
    - Handle validation results from loadReport
    - Show ReportCorrectionDialog when stale parameters detected
    - Load valid configuration into filters on success
    - Display success notification on successful load/save
    - _Requirements: 2.3, 4.3, 7.5, 7.6_

  - [x] 10.3 Write property test for save button disabled state
    - **Property 11: Save Button Disabled State**
    - Test that save button is disabled when hasActiveFilters() returns false
    - **Validates: Requirements 7.2**

- [x] 11. Verify export integration
  - [x] 11.1 Verify export dialog recognizes report filters
    - Test that loading a report and applying filters updates the filtered attendee count
    - Verify "Current Search Results" option reflects report criteria
    - Verify active filters description shows report filter criteria
    - No code changes needed to ExportDialog - verify existing integration works
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 11.2 Write property test for export integration
    - **Property 12: Export Integration**
    - Test that export dialog correctly reflects applied report filters
    - **Validates: Requirements 8.1, 8.2, 8.4**

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Verify end-to-end workflow: save report → load report → apply filters → export

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The existing ExportDialog requires no modifications - reports integrate through the standard filtered export workflow

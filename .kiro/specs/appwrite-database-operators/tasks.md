# Implementation Plan

- [x] 1. Set up operator infrastructure and utilities
  - Create operator utility module with type-safe wrappers around Appwrite's Operator class
  - Implement numeric operators (increment, decrement, multiply, divide, power, modulo) with validation
  - Implement array operators (append, prepend, remove, insert, filter, unique, diff) with validation
  - Implement string and date operators (stringConcat, dateSetNow)
  - Add comprehensive error handling and validation for all operators
  - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 10.1_

- [x] 1.1 Create operator utility module
  - Create `src/lib/operators.ts` with operator factory functions
  - Implement `createIncrement` and `createDecrement` with bounds checking
  - Implement `arrayOperators` object with all array manipulation methods
  - Implement `stringOperators` and `dateOperators` objects
  - Add input validation for all operator functions
  - _Requirements: 7.1, 8.1, 8.2_

- [x] 1.2 Create type definitions for operators
  - Create `src/types/operators.ts` with OperatorType enum
  - Define OperatorContext interface for logging
  - Create OperatorError and OperatorValidationError classes
  - Add JSDoc comments to all type definitions
  - _Requirements: 7.1, 10.1_

- [x] 1.3 Write unit tests for operator utilities
  - Create `src/__tests__/lib/operators.test.ts`
  - Test all numeric operators with valid and invalid inputs
  - Test all array operators with various data types
  - Test string and date operators
  - Test error handling and validation
  - Achieve 100% code coverage for operator utilities
  - _Requirements: 9.1, 9.2_

- [x] 2. Add database schema attributes for operator-managed fields
  - Add credentialCount (integer, default 0) to attendees collection
  - Add photoUploadCount (integer, default 0) to attendees collection
  - Add viewCount (integer, default 0) to attendees collection
  - Add lastCredentialGenerated (datetime, optional) to attendees collection
  - Add lastPhotoUploaded (datetime, optional) to attendees collection
  - Update `scripts/setup-appwrite.ts` to create these attributes
  - _Requirements: 1.1, 5.1, 7.4_

- [x] 2.1 Update Appwrite setup script
  - Modify `scripts/setup-appwrite.ts` to add new integer attributes
  - Add createIntegerAttribute calls for count fields with default value 0
  - Add createDatetimeAttribute calls for timestamp fields
  - Add attribute polling to wait for attribute creation
  - Test script on development environment
  - _Requirements: 1.1, 5.1, 7.4_

- [x] 2.2 Create migration script for existing data
  - Create `scripts/migrate-operator-fields.ts` to initialize new fields
  - Set credentialCount based on existing credentialGeneratedAt field
  - Set photoUploadCount based on existing photoUrl field
  - Initialize viewCount to 0 for all attendees
  - Run migration script and verify data integrity
  - _Requirements: 7.4, 7.5_

- [x] 3. Implement atomic credential count tracking
  - Update credential generation API to use Operator.increment
  - Update credentialCount atomically when credential is generated
  - Use Operator.dateSetNow for lastCredentialGenerated timestamp
  - Add error handling with fallback to traditional update
  - Update dashboard to display credential counts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 3.1 Update credential generation API
  - Modify `src/pages/api/attendees/[id]/generate-credential.ts`
  - Import operator utilities from `@/lib/operators`
  - Replace manual count increment with `createIncrement(1)`
  - Use `dateOperators.setNow()` for timestamp
  - Add try-catch with fallback to traditional update
  - _Requirements: 1.1, 1.2, 1.5, 8.4_

- [x] 3.2 Update dashboard credential statistics
  - Modify `src/pages/dashboard.tsx` to use credentialCount field
  - Update stat card to display total credentials generated
  - Add loading state while fetching statistics
  - Handle cases where credentialCount is undefined (backward compatibility)
  - _Requirements: 1.3, 7.2_

- [x] 3.3 Add integration tests for credential tracking
  - Create `src/__tests__/api/credential-tracking.test.ts`
  - Test credential generation increments count correctly
  - Test concurrent credential generation maintains accurate count
  - Test fallback behavior when operator fails
  - Verify lastCredentialGenerated timestamp is set
  - _Requirements: 1.3, 9.3, 9.4_

- [x] 4. Implement atomic photo upload count tracking
  - Update photo upload API to use Operator.increment
  - Update photo delete API to use Operator.decrement
  - Add photoUploadCount field tracking
  - Use Operator.dateSetNow for lastPhotoUploaded timestamp
  - Update dashboard to display photo upload statistics
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4.1 Update photo upload API
  - Modify `src/pages/api/attendees/[id]/photo.ts` (or relevant photo API)
  - Use `createIncrement(1)` when photo is uploaded
  - Use `dateOperators.setNow()` for lastPhotoUploaded
  - Add error handling with fallback
  - _Requirements: 5.1, 5.4, 8.4_

- [x] 4.2 Update photo delete API
  - Modify photo delete endpoint to use `createDecrement(1)`
  - Ensure photoUploadCount doesn't go below 0 using min bound
  - Add error handling with fallback
  - _Requirements: 5.2, 5.4, 8.4_

- [x] 4.3 Update dashboard photo statistics
  - Modify dashboard to display photoUploadCount
  - Calculate percentage of attendees with photos
  - Add loading state and error handling
  - Handle backward compatibility for undefined counts
  - _Requirements: 5.3, 7.2_

- [x] 4.4 Add integration tests for photo tracking
  - Create `src/__tests__/api/photo-tracking.test.ts`
  - Test photo upload increments count
  - Test photo delete decrements count
  - Test count doesn't go below 0
  - Test concurrent photo operations
  - _Requirements: 5.4, 9.3, 9.4_

- [x] 5. Implement array operators for custom fields
  - Identify multi-value custom fields in the system
  - Update custom field APIs to use array operators
  - Implement arrayAppend for adding values
  - Implement arrayRemove for removing values
  - Implement arrayUnique to ensure no duplicates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 5.1 Update custom field value updates
  - Modify custom field update logic to detect array fields
  - Use `arrayOperators.append()` for adding values
  - Use `arrayOperators.remove()` for removing values
  - Use `arrayOperators.unique()` after bulk operations
  - Add validation for array operations
  - _Requirements: 2.1, 2.2, 2.3, 2.5, 8.2_

- [x] 5.2 Update bulk edit for array fields
  - Modify `src/pages/api/attendees/bulk-edit.ts`
  - Detect when editing multi-value custom fields
  - Use array operators instead of read-modify-write
  - Add error handling for array operations
  - _Requirements: 2.1, 2.2, 2.5, 3.3_

- [x] 5.3 Add integration tests for array operations
  - Create `src/__tests__/api/array-operations.test.ts`
  - Test arrayAppend adds values correctly
  - Test arrayRemove removes values correctly
  - Test arrayUnique eliminates duplicates
  - Test concurrent array operations don't lose data
  - _Requirements: 2.5, 9.2, 9.4_

- [x] 6. Optimize bulk operations with operators
  - Update bulk edit to use operators where applicable
  - Update bulk delete to use operators for cleanup
  - Add performance monitoring for bulk operations
  - Compare performance vs traditional approach
  - Document performance improvements
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6.1 Refactor bulk edit with operators
  - Modify `src/pages/api/attendees/bulk-edit.ts`
  - Use numeric operators for numeric field updates
  - Use array operators for array field updates
  - Measure and log operation duration
  - Add fallback for unsupported operations
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.4_

- [x] 6.2 Add performance monitoring
  - Add timing metrics to bulk operations
  - Log operation duration and row count
  - Track operator usage vs traditional updates
  - Create performance comparison report
  - _Requirements: 3.4, 7.5_

- [x] 6.3 Add performance tests
  - Create `src/__tests__/performance/bulk-operations.performance.test.ts`
  - Test bulk edit with 100, 1000, 5000 rows
  - Compare operator vs traditional approach
  - Measure memory usage
  - Document performance improvements
  - _Requirements: 3.4, 3.5, 9.3_

- [x] 7. Enhance activity logging with operators
  - Update log creation to use Operator.dateSetNow
  - Add log counters using Operator.increment
  - Update log aggregation queries
  - Ensure accurate server-side timestamps
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 7.1 Update log creation with operators
  - Modify log creation in `src/pages/api/logs/index.ts`
  - Use `dateOperators.setNow()` for all log timestamps
  - Add log counters for operation tracking
  - Use `createIncrement()` for counter updates
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 7.2 Update log aggregation
  - Modify log aggregation queries to use operator-managed fields
  - Update dashboard log statistics
  - Ensure accurate counts with atomic operations
  - _Requirements: 4.3, 4.5_

- [x] 7.3 Add integration tests for logging
  - Create `src/__tests__/api/logging-operators.test.ts`
  - Test log timestamps use server time
  - Test log counters increment correctly
  - Test concurrent log creation maintains accurate counts
  - _Requirements: 4.5, 9.3_

- [x] 8. Create comprehensive documentation
  - Write developer documentation for operators
  - Create migration guide for existing code
  - Add code examples for common patterns
  - Document performance improvements
  - Update API documentation
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 8.1 Write developer documentation
  - Create `docs/guides/DATABASE_OPERATORS_GUIDE.md`
  - Document all available operators
  - Provide usage examples for each operator
  - Explain when to use operators vs traditional updates
  - Include troubleshooting section
  - _Requirements: 10.1, 10.4, 10.5_

- [x] 8.2 Create migration guide
  - Create `docs/migration/OPERATOR_MIGRATION_GUIDE.md`
  - Document migration patterns for common scenarios
  - Provide before/after code examples
  - Explain backward compatibility approach
  - Include rollback procedures
  - _Requirements: 7.1, 10.2, 10.5_

- [x] 8.3 Update API documentation
  - Update API endpoint documentation with operator usage
  - Document new fields in attendee model
  - Add examples of operator-based requests
  - Document error responses
  - _Requirements: 10.1, 10.4_

- [x] 9. Final testing and validation
  - Run all unit tests and ensure 90%+ coverage
  - Run all integration tests
  - Perform concurrent operation testing
  - Validate data integrity across all features
  - Perform user acceptance testing
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 9.1 Complete test suite execution
  - Run all unit tests with coverage report
  - Run all integration tests
  - Run performance tests
  - Fix any failing tests
  - Achieve 90%+ coverage for operator code
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 9.2 Concurrent operation testing
  - Create concurrent test scenarios
  - Test 10, 50, 100 concurrent operations
  - Verify no race conditions
  - Verify data integrity
  - Document test results
  - _Requirements: 9.4_

- [x] 9.3 Data integrity validation
  - Verify all operator-managed fields are accurate
  - Compare operator results with expected values
  - Check for any data corruption
  - Validate backward compatibility
  - _Requirements: 7.4, 9.4_

- [x] 10. Deployment and monitoring
  - Deploy operator utilities to production
  - Enable operators incrementally with feature flags
  - Monitor performance metrics
  - Monitor error rates
  - Set up alerting for operator failures
  - _Requirements: 7.1, 7.3, 7.4, 8.4_

- [x] 10.1 Deploy with feature flags
  - Add feature flag for operator usage
  - Deploy operator utilities
  - Enable operators for credential tracking first
  - Monitor for 24 hours before enabling more features
  - _Requirements: 7.1, 7.3_

- [x] 10.2 Set up monitoring and alerting
  - Configure logging for operator usage
  - Set up metrics tracking
  - Create dashboards for operator performance
  - Set up alerts for high error rates
  - Set up alerts for high latency
  - _Requirements: 8.4_

- [x] 10.3 Gradual rollout
  - Enable operators for photo tracking
  - Enable operators for bulk operations
  - Enable operators for logging
  - Monitor each rollout for issues
  - Document any issues and resolutions
  - _Requirements: 7.1, 7.4_

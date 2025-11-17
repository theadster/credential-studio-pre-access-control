# Implementation Plan

- [x] 1. Update logs API to use $createdAt for ordering
  - Modify the logs API endpoint to use `Query.orderDesc('$createdAt')` instead of `Query.orderDesc('timestamp')`
  - This provides immediate fix since $createdAt exists on all log documents
  - Update the query building logic in the GET handler
  - Ensure the enrichLogWithRelations function continues to use `timestamp || $createdAt` for display
  - Test that logs display correctly on the dashboard
  - _Requirements: 1.1, 1.2, 2.1, 2.2_

- [x] 2. Create migration script to backfill timestamp field
  - Create `scripts/migrate-log-timestamps.ts` script
  - Implement batch processing to fetch logs in chunks of 100
  - For each log without a timestamp field, update it with the value from $createdAt
  - Add progress logging to track migration status
  - Add error handling to continue processing even if individual updates fail
  - Include summary statistics at the end (total processed, total updated, failures)
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Test the fix and migration
  - Verify logs display correctly on dashboard before migration
  - Run migration script on development database
  - Verify all logs have timestamp field after migration
  - Verify logs still display correctly after migration
  - Test pagination and filtering with migrated logs
  - Create a new log and verify it appears correctly with other logs
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4. Deploy and verify in production
  - Deploy the API fix to production
  - Verify logs display correctly immediately after deployment
  - Run migration script on production database during low-traffic period
  - Monitor for any errors or issues
  - Verify all logs are accessible and sorted correctly
  - Document the fix in the appropriate docs folder
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

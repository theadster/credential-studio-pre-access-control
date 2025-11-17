# Logs Timestamp Fix Testing Guide

This document provides comprehensive testing instructions for the logs timestamp fix implementation (Task 3 from logs-timestamp-fix spec).

## Overview

The logs timestamp fix addresses the issue where logs were not displaying on the dashboard due to missing `timestamp` fields in older log entries. The fix includes:

1. **API Fix**: Using `$createdAt` for ordering instead of `timestamp`
2. **Migration Script**: Backfilling `timestamp` field for existing logs
3. **Comprehensive Testing**: Verifying all requirements are met

## Requirements Being Tested

- **Requirement 4.1**: Logs display correctly on dashboard before migration
- **Requirement 4.2**: Logs are sorted in descending chronological order (newest first)
- **Requirement 4.3**: Pagination and filtering work correctly with updated query logic
- **Requirement 4.4**: Logs include both old entries (pre-operator) and new entries (post-operator)

## Testing Methods

### Method 1: Automated Test Script (Recommended)

The automated test script creates test logs, verifies the fix, performs migration, and validates all requirements.

#### Prerequisites

- Appwrite instance running and accessible
- Environment variables configured in `.env.local`
- At least one user in the database
- API key with admin permissions

#### Running the Test

```bash
# Run the automated test script
npx tsx scripts/test-logs-timestamp-fix.ts
```

#### What the Script Tests

1. **Create Test Logs**: Creates 3 test logs without `timestamp` field (simulating old logs)
2. **Verify Display Before Migration**: Confirms logs display correctly using `$createdAt` ordering
3. **Verify Missing Timestamps**: Confirms test logs don't have `timestamp` field
4. **Backfill Timestamps**: Migrates test logs by adding `timestamp` field
5. **Verify Display After Migration**: Confirms logs still display correctly after migration
6. **Test Pagination**: Verifies pagination works with migrated logs
7. **Test Filtering**: Verifies filtering works with migrated logs
8. **Test New Log Integration**: Creates a new log with `timestamp` and verifies it integrates correctly

#### Expected Output

```
🧪 Starting Logs Timestamp Fix Tests

============================================================
✓ Found test user: [user-id]

Test 1: Creating test logs without timestamp field...
✓ Created 3 test logs

Test 2: Verify logs display correctly using $createdAt ordering...
✓ Logs display correctly (10 logs)

Test 3: Verify logs without timestamp field exist...
✓ Found 3 logs without timestamp field

Test 4: Backfill timestamp field for test logs...
✓ Successfully backfilled 3 logs

Test 5: Verify logs display correctly after migration...
✓ Logs display correctly after migration

Test 6: Test pagination with migrated logs...
✓ Pagination works correctly

Test 7: Test filtering with migrated logs...
✓ Filtering works correctly

Test 8: Create new log and verify integration...
✓ New log integrates correctly

Cleaning up test logs...
✓ Cleanup complete

============================================================

📊 Test Summary

Total Tests: 8
Passed: 8 ✓
Failed: 0 ✗

🎉 All tests passed!
```

### Method 2: Manual Dashboard Testing

For manual verification through the UI:

#### Step 1: Verify Logs Display Before Migration

1. Open the application dashboard
2. Navigate to the "Logs" tab
3. **Expected**: Logs should display correctly (even if some are missing `timestamp` field)
4. **Verify**: Logs are sorted by date (newest first)
5. **Verify**: No blank screen or error messages

#### Step 2: Run Migration Script

```bash
# Run the migration script on your database
npx tsx scripts/migrate-log-timestamps.ts
```

**Expected Output:**
```
Starting log timestamp migration...
✓ Updated log [log-id] (1/100)
✓ Updated log [log-id] (2/100)
...
Processed 100 logs, updated 50

Migration complete!
Total logs processed: 150
Total logs updated: 75
```

#### Step 3: Verify Logs Display After Migration

1. Refresh the dashboard
2. Navigate to the "Logs" tab
3. **Expected**: All logs still display correctly
4. **Verify**: Logs are sorted by date (newest first)
5. **Verify**: No missing logs or errors

#### Step 4: Test Pagination

1. On the Logs tab, navigate through pages using pagination controls
2. **Expected**: Each page shows different logs
3. **Verify**: No duplicate logs across pages
4. **Verify**: Chronological order is maintained across pages

#### Step 5: Test Filtering

1. Use the action filter dropdown to filter by specific action types
2. **Expected**: Only logs matching the filter are displayed
3. **Verify**: Filtered results are still sorted chronologically
4. **Verify**: Pagination works with filtered results

#### Step 6: Create New Log and Verify

1. Perform an action that creates a log (e.g., create an attendee)
2. Navigate to the Logs tab
3. **Expected**: New log appears at the top of the list
4. **Verify**: New log has `timestamp` field
5. **Verify**: New log is sorted correctly with older logs

### Method 3: API Testing with curl

For direct API testing:

#### Test 1: Fetch Logs (Before Migration)

```bash
# Get logs ordered by $createdAt
curl -X GET "http://localhost:3000/api/logs?page=1&limit=10" \
  -H "Cookie: [your-session-cookie]"
```

**Expected**: JSON response with logs array, sorted by date

#### Test 2: Check Specific Log

```bash
# Check if a log has timestamp field
curl -X GET "https://[your-appwrite-endpoint]/v1/databases/[db-id]/collections/[logs-collection-id]/documents/[log-id]" \
  -H "X-Appwrite-Project: [project-id]" \
  -H "X-Appwrite-Key: [api-key]"
```

**Expected**: Log document with or without `timestamp` field

#### Test 3: Fetch Logs (After Migration)

```bash
# Get logs after migration
curl -X GET "http://localhost:3000/api/logs?page=1&limit=10" \
  -H "Cookie: [your-session-cookie]"
```

**Expected**: JSON response with logs array, all logs should have `timestamp` field

#### Test 4: Test Pagination

```bash
# Page 1
curl -X GET "http://localhost:3000/api/logs?page=1&limit=5" \
  -H "Cookie: [your-session-cookie]"

# Page 2
curl -X GET "http://localhost:3000/api/logs?page=2&limit=5" \
  -H "Cookie: [your-session-cookie]"
```

**Expected**: Different logs on each page, no overlap

#### Test 5: Test Filtering

```bash
# Filter by action
curl -X GET "http://localhost:3000/api/logs?action=attendee_create&page=1&limit=10" \
  -H "Cookie: [your-session-cookie]"
```

**Expected**: Only logs with specified action

## Verification Checklist

Use this checklist to ensure all requirements are met:

### Before Migration

- [ ] Logs display on dashboard without errors
- [ ] Logs are sorted chronologically (newest first)
- [ ] Pagination controls work
- [ ] Filter dropdown works
- [ ] Some logs may be missing `timestamp` field (check via API)

### After Migration

- [ ] All logs still display on dashboard
- [ ] Logs are still sorted chronologically
- [ ] Pagination still works correctly
- [ ] Filtering still works correctly
- [ ] All logs now have `timestamp` field (verify via API)
- [ ] `timestamp` field matches `$createdAt` for migrated logs

### New Log Creation

- [ ] New logs can be created successfully
- [ ] New logs appear at the top of the list
- [ ] New logs have `timestamp` field
- [ ] New logs are sorted correctly with old logs
- [ ] Pagination includes new logs correctly

## Troubleshooting

### Issue: Test Script Fails to Connect

**Symptom**: `ENOTFOUND` or connection errors

**Solution**:
1. Verify Appwrite instance is running
2. Check `.env.local` has correct `NEXT_PUBLIC_APPWRITE_ENDPOINT`
3. Verify network connectivity to Appwrite instance

### Issue: No Users Found

**Symptom**: "No users found in database"

**Solution**:
1. Create at least one user in the application
2. Or use the signup page to create a test user

### Issue: Permission Denied

**Symptom**: 401 or 403 errors

**Solution**:
1. Verify `APPWRITE_API_KEY` in `.env.local`
2. Ensure API key has admin permissions
3. Check API key is not expired

### Issue: Logs Not Displaying After Migration

**Symptom**: Blank logs tab after migration

**Solution**:
1. Check browser console for errors
2. Verify API endpoint is returning data: `curl http://localhost:3000/api/logs`
3. Check Appwrite database for logs collection
4. Verify `$createdAt` field exists on all logs

### Issue: Migration Script Fails

**Symptom**: Errors during migration

**Solution**:
1. Check Appwrite connection
2. Verify database and collection IDs are correct
3. Ensure API key has write permissions
4. Check for rate limiting (script includes delays)

## Performance Considerations

### Query Performance

- **$createdAt ordering**: Fast (system field, automatically indexed)
- **timestamp ordering**: Fast after migration (indexed field)
- **Expected query time**: < 100ms for typical log counts

### Migration Performance

- **Batch size**: 100 logs per batch
- **Rate limiting**: Respects Appwrite rate limits
- **Duration**: ~1 second per 100 logs
- **Total time**: Depends on total log count

### Recommendations

- Run migration during low-traffic periods
- Monitor Appwrite performance during migration
- Consider breaking into smaller batches for very large datasets

## Success Criteria

All tests pass when:

✅ Logs display correctly before migration (Requirement 4.1)  
✅ Logs are sorted chronologically (Requirement 4.2)  
✅ Pagination works correctly (Requirement 4.3)  
✅ Filtering works correctly (Requirement 4.3)  
✅ Old and new logs display together (Requirement 4.4)  
✅ No data loss during migration  
✅ No performance degradation  
✅ No errors in browser console or API logs  

## Related Documentation

- [Logs Timestamp Fix Requirements](../../.kiro/specs/logs-timestamp-fix/requirements.md)
- [Logs Timestamp Fix Design](../../.kiro/specs/logs-timestamp-fix/design.md)
- [Logs Timestamp Fix Tasks](../../.kiro/specs/logs-timestamp-fix/tasks.md)
- [Migration Script](../../scripts/migrate-log-timestamps.ts)
- [Test Script](../../scripts/test-logs-timestamp-fix.ts)

## Conclusion

This testing guide provides comprehensive verification of the logs timestamp fix. The automated test script is the recommended approach for thorough testing, while manual dashboard testing provides user-facing verification.

All requirements (4.1, 4.2, 4.3, 4.4) are covered by the test suite, ensuring the fix works correctly in all scenarios.

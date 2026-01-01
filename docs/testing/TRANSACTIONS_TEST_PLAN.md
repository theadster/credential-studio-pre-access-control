---
title: "Transactions & Bulk Operations - Comprehensive Test Plan"
type: worklog
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 30
related_code: ["src/__tests__/"]
---

# Transactions & Bulk Operations - Comprehensive Test Plan

## Overview

This document provides both automated tests and manual testing procedures to verify that all transaction/bulk operations are working correctly with Appwrite's TablesDB atomic operations.

## Test Categories

1. **Unit Tests** - Automated tests with mocks
2. **Integration Tests** - Tests against real Appwrite instance
3. **Manual Tests** - Step-by-step user testing procedures

---

## 1. Automated Unit Tests

### Test File: `src/lib/__tests__/bulkOperations.test.ts`

Tests the bulk operations library with mocked TablesDB.

**Run with**: `npx vitest --run src/lib/__tests__/bulkOperations.test.ts`

### Test File: `src/pages/api/attendees/__tests__/bulk-edit.integration.test.ts`

Tests bulk edit endpoint with mocked dependencies.

**Run with**: `npx vitest --run src/pages/api/attendees/__tests__/bulk-edit.integration.test.ts`

### Test File: `src/pages/api/custom-fields/__tests__/reorder.integration.test.ts`

Tests custom fields reorder with mocked dependencies.

**Run with**: `npx vitest --run src/pages/api/custom-fields/__tests__/reorder.integration.test.ts`

---

## 2. Integration Tests (Real Appwrite)

### Test Script: `scripts/test-all-transactions.ts`

Comprehensive integration test that performs real operations against your Appwrite instance.

**Run with**: `npx tsx scripts/test-all-transactions.ts`

**What it tests**:
- TablesDB availability
- Bulk edit operations
- Bulk delete operations
- Bulk import operations
- Custom fields reorder
- Error handling
- Rollback behavior

---

## 3. Manual Testing Procedures

### Test 1: Bulk Edit Attendees (Atomic Update)

**Objective**: Verify that bulk editing multiple attendees updates all records atomically.

**Prerequisites**:
- At least 10 attendees in the system
- At least one custom field exists

**Steps**:
1. Navigate to the Attendees page
2. Select 10 attendees using checkboxes
3. Click "Bulk Edit" button
4. Change a custom field value (e.g., set "Status" to "VIP")
5. Click "Apply Changes"

**Expected Results**:
- ✅ Success message appears
- ✅ All 10 attendees show the updated value
- ✅ Server log shows: `[bulkEditWithFallback] Atomic bulk update completed successfully`
- ✅ Server log shows: `usedTransactions: true`
- ✅ One audit log entry created for the bulk operation
- ✅ If you refresh the page, all changes persist

**Failure Scenarios to Test**:
- **Network interruption**: Disconnect network during operation
  - Expected: Either all updates succeed or none do (atomic)
- **Invalid data**: Try to set an invalid value
  - Expected: Error message, no partial updates

**Time**: ~2 minutes

---

### Test 2: Bulk Delete Attendees (Atomic Delete)

**Objective**: Verify that bulk deleting multiple attendees removes all records atomically.

**Prerequisites**:
- At least 5 test attendees you can delete

**Steps**:
1. Navigate to the Attendees page
2. Select 5 attendees using checkboxes
3. Click "Bulk Delete" button
4. Confirm the deletion in the dialog

**Expected Results**:
- ✅ Success message appears
- ✅ All 5 attendees are removed from the list
- ✅ Server log shows: `[bulkDeleteWithFallback] Atomic bulk delete completed successfully`
- ✅ Server log shows: `usedTransactions: true`
- ✅ One audit log entry created for the bulk operation
- ✅ If you refresh the page, attendees remain deleted

**Failure Scenarios to Test**:
- **Delete non-existent attendee**: Manually delete one attendee, then try bulk delete including that ID
  - Expected: Error message, no partial deletions

**Time**: ~2 minutes

---

### Test 3: Bulk Import Attendees (Atomic Create)

**Objective**: Verify that importing multiple attendees creates all records atomically.

**Prerequisites**:
- CSV file with 20 attendees (see sample below)
- Event settings configured (barcode type and length)

**Sample CSV**:
```csv
firstName,lastName,customField1,customField2
John,Doe,Value1,Value2
Jane,Smith,Value3,Value4
Bob,Johnson,Value5,Value6
Alice,Williams,Value7,Value8
Charlie,Brown,Value9,Value10
David,Jones,Value11,Value12
Emma,Garcia,Value13,Value14
Frank,Miller,Value15,Value16
Grace,Davis,Value17,Value18
Henry,Rodriguez,Value19,Value20
Ivy,Martinez,Value21,Value22
Jack,Hernandez,Value23,Value24
Kelly,Lopez,Value25,Value26
Leo,Gonzalez,Value27,Value28
Mia,Wilson,Value29,Value30
Noah,Anderson,Value31,Value32
Olivia,Thomas,Value33,Value34
Peter,Taylor,Value35,Value36
Quinn,Moore,Value37,Value38
Rachel,Jackson,Value39,Value40
```

**Steps**:
1. Navigate to the Attendees page
2. Click "Import" button
3. Select the CSV file
4. Click "Upload"

**Expected Results**:
- ✅ Success message: "20 attendees imported successfully"
- ✅ All 20 attendees appear in the list
- ✅ Server log shows: `[bulkImportWithFallback] Atomic bulk import completed successfully`
- ✅ Server log shows: `usedTransactions: true`
- ✅ One audit log entry created for the import
- ✅ All attendees have unique barcode numbers
- ✅ Custom field values are correctly populated

**Failure Scenarios to Test**:
- **Invalid CSV**: Upload CSV with missing required fields
  - Expected: Error message, no attendees created
- **Duplicate barcodes**: Import twice with same data
  - Expected: Second import succeeds with new unique barcodes

**Time**: ~3 minutes

---

### Test 4: Custom Fields Reorder (Atomic Update)

**Objective**: Verify that reordering multiple custom fields updates all order values atomically.

**Prerequisites**:
- At least 5 custom fields exist

**Steps**:
1. Navigate to Event Settings page
2. Go to "Custom Fields" tab
3. Drag and drop to reorder 5 custom fields
4. Click "Save Order" (or order saves automatically)

**Expected Results**:
- ✅ Success message appears
- ✅ All 5 custom fields show new order
- ✅ Server log shows: `[Reorder] Atomic reorder completed successfully`
- ✅ Server log shows: `usedAtomicOperation: true`
- ✅ One audit log entry created for the reorder
- ✅ If you refresh the page, order persists

**Failure Scenarios to Test**:
- **Concurrent reorder**: Open two browser tabs, reorder in both simultaneously
  - Expected: One succeeds, other gets conflict error (retryable)

**Time**: ~2 minutes

---

### Test 5: Custom Field Create (Single Operation)

**Objective**: Verify that creating a single custom field works correctly.

**Prerequisites**:
- Access to Event Settings

**Steps**:
1. Navigate to Event Settings page
2. Go to "Custom Fields" tab
3. Click "Add Custom Field"
4. Fill in:
   - Field Name: "Test Field"
   - Field Type: "Text"
   - Internal Name: (auto-generated)
5. Click "Create"

**Expected Results**:
- ✅ Success message appears
- ✅ New custom field appears in the list
- ✅ Server log shows: `[custom-fields] Custom field created`
- ✅ One audit log entry created
- ✅ Field is immediately usable in attendee forms

**Note**: This is NOT a bulk operation, so it uses regular `createDocument()`.

**Time**: ~1 minute

---

### Test 6: Error Handling - Conflict Resolution

**Objective**: Verify that concurrent modifications are handled correctly.

**Prerequisites**:
- Two browser windows/tabs open
- At least 5 attendees

**Steps**:
1. In Tab 1: Select 5 attendees, click "Bulk Edit"
2. In Tab 2: Select the same 5 attendees, click "Bulk Edit"
3. In Tab 1: Change a field value, click "Apply"
4. In Tab 2: Change a different field value, click "Apply"

**Expected Results**:
- ✅ Tab 1: Success message
- ✅ Tab 2: Conflict error message with retry option
- ✅ Tab 2: User can refresh and retry
- ✅ No data corruption or partial updates

**Time**: ~3 minutes

---

### Test 7: Error Handling - Validation Errors

**Objective**: Verify that validation errors prevent operations without partial updates.

**Prerequisites**:
- At least 3 attendees

**Steps**:
1. Select 3 attendees
2. Click "Bulk Edit"
3. Try to set an invalid value (e.g., text in a number field)
4. Click "Apply"

**Expected Results**:
- ✅ Validation error message
- ✅ No attendees are updated
- ✅ Server log shows validation error
- ✅ No audit log entry created

**Time**: ~2 minutes

---

### Test 8: Performance - Large Bulk Operations

**Objective**: Verify that large bulk operations complete successfully.

**Prerequisites**:
- At least 100 attendees (or create via import)

**Steps**:
1. Select 100 attendees
2. Click "Bulk Edit"
3. Change a custom field value
4. Click "Apply"
5. Monitor server logs and timing

**Expected Results**:
- ✅ Operation completes successfully
- ✅ Time: ~10-15 seconds (depends on network)
- ✅ Server log shows: `Fetching existing documents for merge...`
- ✅ Server log shows: `Atomic bulk update completed successfully`
- ✅ All 100 attendees updated
- ✅ One audit log entry

**Performance Benchmarks**:
- 10 attendees: ~2-3 seconds
- 25 attendees: ~4-5 seconds
- 50 attendees: ~7-8 seconds
- 100 attendees: ~12-15 seconds

**Time**: ~5 minutes

---

### Test 9: Audit Log Verification

**Objective**: Verify that all bulk operations create proper audit logs.

**Prerequisites**:
- Logging enabled for all operations

**Steps**:
1. Perform a bulk edit (5 attendees)
2. Perform a bulk delete (3 attendees)
3. Perform an import (10 attendees)
4. Perform a custom fields reorder (5 fields)
5. Navigate to Dashboard → Logs tab

**Expected Results**:
- ✅ 4 log entries visible
- ✅ Each log shows correct action type
- ✅ Each log shows correct user
- ✅ Each log shows correct timestamp
- ✅ Each log shows correct details (count, names, etc.)
- ✅ Logs are in chronological order

**Time**: ~5 minutes

---

### Test 10: Rollback Verification (Failure Scenario)

**Objective**: Verify that failed operations don't leave partial updates.

**Prerequisites**:
- At least 5 attendees
- Ability to simulate network failure

**Steps**:
1. Select 5 attendees
2. Click "Bulk Edit"
3. Change a field value
4. **Before clicking Apply**: Open browser DevTools → Network tab
5. Click "Apply"
6. **Immediately**: Throttle network to "Offline" in DevTools
7. Wait for error

**Expected Results**:
- ✅ Error message appears
- ✅ Either ALL 5 attendees updated OR NONE updated (atomic)
- ✅ No partial updates (e.g., 3 out of 5)
- ✅ Server log shows error
- ✅ No audit log entry created (operation failed)

**Time**: ~3 minutes

---

## Test Results Template

Use this template to record your test results:

```markdown
## Test Results - [Date]

### Test 1: Bulk Edit Attendees
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes: 

### Test 2: Bulk Delete Attendees
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 3: Bulk Import Attendees
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 4: Custom Fields Reorder
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 5: Custom Field Create
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 6: Conflict Resolution
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 7: Validation Errors
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 8: Large Bulk Operations
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 9: Audit Log Verification
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

### Test 10: Rollback Verification
- Status: ✅ PASS / ❌ FAIL
- Time: X seconds
- Notes:

## Overall Result
- Total Tests: 10
- Passed: X
- Failed: X
- Success Rate: X%
```

---

## Quick Smoke Test (5 Minutes)

If you only have 5 minutes, run this quick smoke test:

1. **Bulk Edit** - Select 5 attendees, change a field, verify all updated
2. **Bulk Delete** - Delete 3 test attendees, verify all removed
3. **Import** - Import 5 attendees from CSV, verify all created
4. **Check Logs** - Verify 3 audit log entries exist

**Expected**: All operations succeed with atomic behavior.

---

## Troubleshooting

### Issue: "Database not found" error
**Solution**: Ensure using admin client for TablesDB operations

### Issue: "Invalid document structure" error
**Solution**: Ensure fetch-merge-upsert pattern is used (all required fields present)

### Issue: Operations are slow
**Solution**: Normal for large operations due to fetch-merge pattern. 100 attendees ~15 seconds is expected.

### Issue: Audit logs not created
**Solution**: Check log settings are enabled for the operation type

### Issue: Partial updates occurring
**Solution**: CRITICAL - This indicates atomic operations are not working. Check server logs immediately.

---

## Success Criteria

All tests should meet these criteria:

✅ **Atomicity**: All-or-nothing behavior (no partial updates)
✅ **Performance**: Operations complete in reasonable time
✅ **Audit Logs**: All operations logged correctly
✅ **Error Handling**: Errors are caught and reported clearly
✅ **Data Integrity**: No data corruption or inconsistencies
✅ **User Experience**: Clear feedback and error messages

---

## Next Steps After Testing

1. Record all test results using the template
2. Report any failures with server logs
3. If all tests pass, mark transactions as production-ready
4. Schedule periodic regression testing (monthly)

---

## Test Data Cleanup

After testing, clean up test data:

```bash
# Delete test attendees
# Delete test custom fields
# Clear test audit logs (optional)
```

**Note**: Keep audit logs for compliance unless testing in a dev environment.

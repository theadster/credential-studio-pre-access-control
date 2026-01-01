# Bulk Export PDF Test Summary

## Overview

Created comprehensive test suite for the bulk PDF export API to verify that the outdated credential detection logic correctly respects the "printable fields" toggle in custom field settings.

## Test File

`src/__tests__/api/attendees/bulk-export-pdf.test.ts`

## Test Coverage

### 1. Printable Field Logic (4 tests)

Tests that verify the core functionality of printable vs non-printable field tracking:

- **Non-printable field changes**: Verifies that updating non-printable fields (like email) does NOT mark credentials as outdated
- **Printable field changes**: Verifies that updating printable fields (like name) DOES mark credentials as outdated
- **Same-time generation**: Verifies that credentials generated at the same time as updates are treated as current
- **5-second tolerance**: Verifies the tolerance window for same-update detection

### 2. Legacy Record Support (2 tests)

Tests backward compatibility with records that don't have the `lastSignificantUpdate` field:

- **Fallback to updatedAt**: Verifies that legacy records use `updatedAt` for comparison
- **Legacy current credentials**: Verifies that legacy records with newer credentials are treated as current

### 3. Edge Cases (2 tests)

Tests unusual scenarios and error conditions:

- **Missing credentialGeneratedAt**: Verifies that credentials without generation timestamps are flagged as outdated
- **Mixed credential statuses**: Verifies correct handling of multiple attendees with different credential statuses

### 4. Missing Credentials (1 test)

Tests error handling for attendees without credentials:

- **No credentials**: Verifies proper error response when attendees don't have generated credentials

### 5. Permission Checks (1 test)

Tests authorization:

- **Insufficient permissions**: Verifies that users without `bulkGeneratePDFs` permission are denied access

## Test Results

```
✓ src/__tests__/api/attendees/bulk-export-pdf.test.ts (10 tests) 35ms
  ✓ Bulk Export PDF API - Outdated Credential Detection > Printable Field Logic
    ✓ should NOT flag credential as outdated when only non-printable fields changed
    ✓ should flag credential as outdated when printable fields changed
    ✓ should treat credential as current when generated at same time as significant update
    ✓ should use 5-second tolerance for same-update detection
  ✓ Bulk Export PDF API - Outdated Credential Detection > Legacy Record Support
    ✓ should fall back to updatedAt when lastSignificantUpdate does not exist
    ✓ should treat legacy record as current when credential is newer than updatedAt
  ✓ Bulk Export PDF API - Outdated Credential Detection > Edge Cases
    ✓ should flag credential as outdated when credentialGeneratedAt is missing
    ✓ should handle multiple attendees with mixed credential statuses
  ✓ Bulk Export PDF API - Outdated Credential Detection > Missing Credentials
    ✓ should return error when attendees have no credentials
  ✓ Bulk Export PDF API - Outdated Credential Detection > Permission Checks
    ✓ should deny access without bulkGeneratePDFs permission

Test Files  1 passed (1)
     Tests  10 passed (10)
```

**All tests passing ✅**

## Running the Tests

```bash
# Run all tests
npx vitest --run src/__tests__/api/attendees/bulk-export-pdf.test.ts

# Run with verbose output
npx vitest --run --reporter=verbose src/__tests__/api/attendees/bulk-export-pdf.test.ts

# Run in watch mode (for development)
npx vitest src/__tests__/api/attendees/bulk-export-pdf.test.ts
```

## Key Testing Patterns

### Mock Setup

The tests use Vitest mocking to simulate:
- Appwrite database operations (`listDocuments`, `getDocument`)
- OneSimpleAPI PDF generation (via `global.fetch`)
- Authentication middleware (user and userProfile injection)

### Test Data

Each test creates realistic attendee records with:
- Credential URLs and generation timestamps
- `lastSignificantUpdate` timestamps (for new records)
- `$updatedAt` timestamps (for all records)
- Proper time relationships to test different scenarios

### Assertions

Tests verify:
- HTTP status codes (200 for success, 400 for errors, 403 for permission denied)
- Response JSON structure and content
- Specific error types (`outdated_credentials`, `missing_credentials`)
- Attendee names in error messages

## Benefits

1. **Confidence**: Automated tests ensure the fix works correctly
2. **Regression Prevention**: Tests will catch any future breaks in this logic
3. **Documentation**: Tests serve as executable documentation of expected behavior
4. **Consistency**: Verifies that bulk PDF export uses the same logic as the main attendees page

## Related Files

- **Implementation**: `src/pages/api/attendees/bulk-export-pdf.ts`
- **Tests**: `src/__tests__/api/attendees/bulk-export-pdf.test.ts`
- **Fix Documentation**: `docs/fixes/BULK_EXPORT_PDF_OUTDATED_CREDENTIAL_FIX.md`
- **Dashboard Logic**: `src/pages/dashboard.tsx` (reference implementation)

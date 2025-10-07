# Custom Field API Tests Summary

## Overview
Comprehensive integration tests have been created for all custom field API endpoints, covering CRUD operations, reordering, and fieldOptions JSON handling.

## Test Files Created

### 1. `/api/custom-fields` - Index Endpoint Tests
**File**: `src/pages/api/custom-fields/__tests__/index.test.ts`

**Test Coverage** (23 tests):
- ✅ Authentication validation
- ✅ GET endpoint - listing custom fields ordered by order field
- ✅ GET endpoint - auto-generating internal field names for legacy fields
- ✅ GET endpoint - handling empty lists
- ✅ GET endpoint - returning fields with different field types (text, number, date, select)
- ✅ POST endpoint - creating custom fields successfully
- ✅ POST endpoint - permission validation (403 for insufficient permissions)
- ✅ POST endpoint - required field validation (eventSettingsId, fieldName, fieldType)
- ✅ POST endpoint - event settings existence validation
- ✅ POST endpoint - auto-generating order numbers
- ✅ POST endpoint - fieldOptions serialization (object to JSON string)
- ✅ POST endpoint - fieldOptions as string passthrough
- ✅ POST endpoint - default values (required: false, fieldOptions: null)
- ✅ POST endpoint - internal field name generation
- ✅ POST endpoint - log entry creation
- ✅ Method not allowed (405) for unsupported methods
- ✅ Error handling (401, 404, 409, 500)

### 2. `/api/custom-fields/[id]` - Detail Endpoint Tests
**File**: `src/pages/api/custom-fields/__tests__/[id].test.ts`

**Test Coverage** (28 tests):
- ✅ Authentication validation
- ✅ Request validation (invalid or missing ID)
- ✅ GET endpoint - fetching custom field by ID
- ✅ GET endpoint - 404 for non-existent fields
- ✅ GET endpoint - returning fieldOptions as JSON string
- ✅ PUT endpoint - updating custom fields successfully
- ✅ PUT endpoint - permission validation (403 for insufficient permissions)
- ✅ PUT endpoint - user profile validation
- ✅ PUT endpoint - required field validation (fieldName, fieldType)
- ✅ PUT endpoint - fieldOptions serialization (object to JSON string)
- ✅ PUT endpoint - fieldOptions as string passthrough
- ✅ PUT endpoint - default values (required: false, order: 1, fieldOptions: null)
- ✅ PUT endpoint - log entry creation
- ✅ DELETE endpoint - deleting custom fields successfully
- ✅ DELETE endpoint - permission validation (403 for insufficient permissions)
- ✅ DELETE endpoint - user profile validation
- ✅ DELETE endpoint - 404 for non-existent fields
- ✅ DELETE endpoint - log entry creation
- ✅ Method not allowed (405) for unsupported methods
- ✅ Error handling for different HTTP methods (401, 404, 409, 500)

### 3. `/api/custom-fields/reorder` - Reorder Endpoint Tests
**File**: `src/pages/api/custom-fields/__tests__/reorder.test.ts`

**Test Coverage** (20 tests):
- ✅ Authentication validation
- ✅ PUT endpoint - reordering custom fields successfully
- ✅ PUT endpoint - permission validation (403 for insufficient permissions)
- ✅ PUT endpoint - user profile validation
- ✅ PUT endpoint - fieldOrders validation (missing or invalid)
- ✅ PUT endpoint - partial success handling (some updates fail)
- ✅ PUT endpoint - complete failure handling (all updates fail)
- ✅ PUT endpoint - log entry creation with correct counts
- ✅ PUT endpoint - empty fieldOrders array handling
- ✅ PUT endpoint - single field reorder
- ✅ PUT endpoint - large batch reorders (20 fields)
- ✅ Method not allowed (405) for GET, POST, DELETE methods
- ✅ Error handling (401, 404, 500)
- ✅ Logging failure handling

## Key Features Tested

### 1. fieldOptions JSON Handling
All tests verify proper handling of fieldOptions:
- **Object to JSON string serialization**: When fieldOptions is passed as an object/array, it's serialized to JSON string
- **String passthrough**: When fieldOptions is already a JSON string, it's stored as-is
- **Null handling**: When fieldOptions is not provided, it's stored as null

Example test cases:
```typescript
// Object serialization
fieldOptions: ['Engineering', 'Sales', 'Marketing']
// Stored as: '["Engineering","Sales","Marketing"]'

// String passthrough
fieldOptions: '["Engineering","Sales","Marketing"]'
// Stored as: '["Engineering","Sales","Marketing"]'

// Null handling
fieldOptions: undefined
// Stored as: null
```

### 2. Permission Validation
All mutation endpoints (POST, PUT, DELETE) verify:
- User authentication (401 if not authenticated)
- User profile existence (404 if profile not found)
- Role-based permissions (403 if insufficient permissions)
- Proper permission checks using role.permissions JSON

### 3. Order Management
Tests verify:
- Auto-generation of order numbers for new fields
- Incrementing from last field's order
- Default order of 1 for first field
- Batch reordering with partial failure handling

### 4. Internal Field Name Generation
Tests verify:
- Automatic generation of internal field names from field names
- Backfilling internal field names for legacy fields without them
- Proper snake_case conversion (e.g., "Company Name" → "company_name")

### 5. Error Handling
Comprehensive error handling tests for:
- **401 Unauthorized**: Invalid or missing authentication
- **404 Not Found**: Missing resources (custom fields, event settings, user profiles)
- **409 Conflict**: Resource conflicts
- **500 Internal Server Error**: Database errors and unexpected failures

### 6. Logging
All mutation operations verify:
- Log entries are created for create, update, and delete actions
- Log details include relevant information (field name, field type, operation type)
- Reorder operations log success/error counts

## Test Execution

All tests pass successfully:
```bash
npx vitest run src/pages/api/custom-fields/__tests__

✓ src/pages/api/custom-fields/__tests__/[id].test.ts (28 tests)
✓ src/pages/api/custom-fields/__tests__/index.test.ts (23 tests)
✓ src/pages/api/custom-fields/__tests__/reorder.test.ts (20 tests)

Test Files  3 passed (3)
Tests  71 passed (71)
```

## Requirements Coverage

This implementation satisfies **Requirement 4.3** from the design document:
- ✅ Test GET /api/custom-fields for listing fields
- ✅ Test POST /api/custom-fields for creating fields
- ✅ Test PUT /api/custom-fields/[id] for updates
- ✅ Test DELETE /api/custom-fields/[id]
- ✅ Test reorder endpoint
- ✅ Test fieldOptions JSON handling

## Notes

### Error Handling Behavior
The tests accurately reflect the actual API implementation:
- GET requests catch errors early and return specific error messages (e.g., "Custom field not found")
- PUT/DELETE requests use the general error handler which returns generic messages based on error codes
- Reorder endpoint doesn't wrap logging in try-catch, so logging failures cause the operation to fail

### Partial Success Handling
The reorder endpoint handles partial failures gracefully:
- Returns 200 if all updates succeed
- Returns 207 (Multi-Status) if some updates succeed and some fail
- Returns 500 if all updates fail
- Always includes arrays of successful IDs and error details

### Mock Strategy
Tests use the centralized Appwrite mock from `@/test/mocks/appwrite.ts`:
- Consistent mocking across all test files
- Easy to maintain and update
- Proper cleanup with `resetAllMocks()` in beforeEach

## Future Enhancements

Potential areas for additional testing:
1. Integration tests with actual Appwrite database (if test environment available)
2. Performance tests for large batch reorders
3. Concurrent update handling tests
4. Field validation tests for different field types
5. Custom field value migration tests when fields are deleted

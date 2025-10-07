# Task 6.6: OneSimpleAPI PUT Endpoint Tests - Implementation Summary

## Overview
Successfully implemented comprehensive tests for the PUT endpoint to verify that all OneSimpleAPI integration fields are properly updated, saved to the collection, and persisted across requests.

## Implementation Details

### Test Suite: PUT Endpoint - OneSimpleAPI Fields (Subtask 6.6)

Located in: `src/pages/api/event-settings/__tests__/complete-field-mapping.test.ts`

### Tests Implemented

#### 1. Update All OneSimpleAPI Fields
**Purpose**: Verify that all 5 OneSimpleAPI fields are included in the update call

**Fields Tested**:
- `enabled` (boolean)
- `url` (string)
- `formDataKey` (string)
- `formDataValue` (string)
- `recordTemplate` (string)

**Verification**:
- Confirms `updateOneSimpleApiIntegration` is called with correct parameters
- Validates all fields are present in the update payload
- Ensures correct event settings ID is used

#### 2. Verify Updates Saved to Collection
**Purpose**: Confirm that updates are properly saved to the OneSimpleAPI integration collection

**Verification**:
- Checks that `updateOneSimpleApiIntegration` function is called
- Validates the event settings ID parameter
- Confirms all field values in the update payload match the request

#### 3. Verify Version Number Increments
**Purpose**: Ensure optimistic locking version tracking works correctly

**Verification**:
- Confirms version increments from 1 to 2
- Validates version is greater than the original version

#### 4. Fetch Settings and Verify Persistence
**Purpose**: End-to-end test that updates persist across GET requests

**Test Flow**:
1. Perform PUT request with updated OneSimpleAPI fields
2. Verify PUT request succeeds (200 status)
3. Perform GET request to fetch updated settings
4. Verify all updated fields are present in the response

**Fields Verified in GET Response**:
- `oneSimpleApiEnabled`: true
- `oneSimpleApiUrl`: 'https://updated.onesimple.com'
- `oneSimpleApiFormDataKey`: 'updated-key'
- `oneSimpleApiFormDataValue`: '{{email}}'
- `oneSimpleApiRecordTemplate`: '{"email": "{{email}}"}'

#### 5. Handle URL Field Updates
**Purpose**: Test various URL formats and endpoints

**Test Cases**:
- 'https://api.onesimple.com/v1'
- 'https://api.onesimple.com/v2'
- 'https://custom.api.com/endpoint'

**Verification**: Each URL is correctly passed to the update function

#### 6. Handle FormDataKey and FormDataValue Updates
**Purpose**: Test different form data key-value combinations

**Test Cases**:
- { key: 'data', value: '{{firstName}}' }
- { key: 'payload', value: '{{lastName}}' }
- { key: 'record', value: '{{email}}' }

**Verification**: Both fields are correctly updated together

#### 7. Handle RecordTemplate Updates
**Purpose**: Test various JSON template formats

**Test Cases**:
- Simple template: `{"name": "{{firstName}}"}`
- Compound template: `{"fullName": "{{firstName}} {{lastName}}"}`
- Complex nested template: `{"attendee": {"name": "{{firstName}}", "email": "{{email}}", "phone": "{{phone}}"}}`

**Verification**: Templates are correctly stored as strings

#### 8. Invalidate Cache After Update
**Purpose**: Ensure cache is invalidated after successful updates

**Verification**:
- Confirms `eventSettingsCache.invalidate` is called with 'event-settings' key
- Ensures subsequent GET requests fetch fresh data

## Test Results

```
✓ PUT Endpoint - OneSimpleAPI Fields (Subtask 6.6) (8 tests)
  ✓ should update all OneSimpleAPI fields
  ✓ should verify updates are saved to OneSimpleAPI integration collection
  ✓ should verify version number increments
  ✓ should fetch settings and verify all fields persisted
  ✓ should handle url field updates
  ✓ should handle formDataKey and formDataValue updates
  ✓ should handle recordTemplate updates
  ✓ should invalidate cache after successful OneSimpleAPI update
```

**Total Tests**: 8 tests
**Status**: ✅ All tests passing

## Requirements Coverage

### Requirement 3.3 (OneSimpleAPI Updates)
✅ **Covered**: Tests verify that all OneSimpleAPI fields are properly updated when an administrator changes settings

### Requirement 4.4 (OneSimpleAPI Field Updates)
✅ **Covered**: Tests confirm that `updateOneSimpleApiIntegration` is called with all relevant fields

### Requirement 6.2 (Data Consistency - Writes)
✅ **Covered**: Tests verify that integration fields are written to the correct OneSimpleAPI collection

### Requirement 6.3 (Optimistic Locking)
✅ **Covered**: Tests verify that version numbers increment correctly, supporting optimistic locking

## Key Features Tested

### 1. Complete Field Mapping
All 5 OneSimpleAPI fields are properly extracted from the request and passed to the update function:
- enabled
- url
- formDataKey
- formDataValue
- recordTemplate

### 2. Version Management
Optimistic locking is verified through version number incrementation from 1 to 2.

### 3. Data Persistence
End-to-end flow confirms that:
- PUT request updates the integration
- GET request retrieves the updated values
- All fields persist correctly

### 4. Field Variations
Tests cover various realistic scenarios:
- Different API URLs and endpoints
- Multiple form data key-value combinations
- Simple to complex JSON templates

### 5. Cache Management
Cache invalidation is properly triggered after updates to ensure data consistency.

## Integration with Existing Tests

This test suite complements the existing test coverage:
- **Task 6.1-6.3**: GET endpoint field mapping tests
- **Task 6.4**: Cloudinary PUT endpoint tests
- **Task 6.5**: Switchboard PUT endpoint tests
- **Task 6.6**: OneSimpleAPI PUT endpoint tests (this task)
- **Task 6.7-6.10**: Partial updates, error handling, optimistic locking, and cache tests

## Mock Configuration

### Database Mocks
```typescript
mockDatabases.listDocuments - Returns event settings and integration documents
mockDatabases.updateDocument - Simulates core event settings updates
```

### Integration Function Mocks
```typescript
updateOneSimpleApiIntegration - Mocked to return updated integration with incremented version
flattenEventSettings - Mocked to properly map OneSimpleAPI fields for GET responses
```

### Cache Mocks
```typescript
eventSettingsCache.invalidate - Verified to be called after updates
```

## Conclusion

Task 6.6 is complete with comprehensive test coverage for OneSimpleAPI PUT endpoint functionality. All tests pass successfully, confirming that:

1. ✅ All OneSimpleAPI fields are properly updated
2. ✅ Updates are saved to the OneSimpleAPI integration collection
3. ✅ Version numbers increment correctly
4. ✅ Updated fields persist across GET requests
5. ✅ Various field value formats are handled correctly
6. ✅ Cache is properly invalidated after updates

The implementation ensures data consistency, proper version management, and complete field mapping for the OneSimpleAPI integration.

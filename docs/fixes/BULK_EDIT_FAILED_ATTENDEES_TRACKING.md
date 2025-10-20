# Bulk Edit Failed Attendees Tracking Enhancement

## Overview
Enhanced the bulk-edit API endpoint to collect and report failed attendee updates instead of silently continuing when individual attendee updates fail.

## Changes Made

### 1. Failed Attendees Tracking
- **Added**: `errors` array to track failed attendee updates
- **Format**: `Array<{ id: string; error: string }>`
- **Location**: Initialized at the beginning of the bulk operation

### 2. Enhanced Error Handling
- **Modified**: Catch block around lines 155-160 in `src/pages/api/attendees/bulk-edit.ts`
- **Before**: Only logged errors and continued processing
- **After**: Records failed attendee ID and error message, then continues processing

```typescript
} catch (error: any) {
  console.error(`Failed to prepare update for attendee ${attendeeId}:`, error);
  
  // Record the failed attendee with error details
  errors.push({
    id: attendeeId,
    error: error.message || 'Unknown error occurred during update preparation'
  });
  
  // Continue processing other attendees instead of failing entire batch
  // This allows partial success in bulk operations
  continue;
}
```

### 3. Enhanced Response Format
- **Added new fields** to JSON response:
  - `errors`: Array of failed attendee updates
  - `totalRequested`: Total number of attendees requested for update
  - `successCount`: Number of successfully updated attendees
  - `failureCount`: Number of failed attendee updates

### 4. Status Code Enhancement
- **200**: All attendees updated successfully (no failures)
- **207**: Partial success (some failures occurred)
  - Used when `hasFailures && successCount > 0` (partial success)
  - Used when `hasFailures && successCount === 0` (all failed)

### 5. Dynamic Messages
- **Success**: "Attendees updated successfully"
- **Partial**: "Partially successful: X updated, Y failed"
- **All Failed**: "All attendee updates failed"

## Response Format Examples

### All Successful
```json
{
  "message": "Attendees updated successfully",
  "updatedCount": 5,
  "usedTransactions": true,
  "batchCount": 1,
  "errors": [],
  "totalRequested": 5,
  "successCount": 5,
  "failureCount": 0
}
```

### Partial Success
```json
{
  "message": "Partially successful: 3 updated, 2 failed",
  "updatedCount": 3,
  "usedTransactions": true,
  "batchCount": 1,
  "errors": [
    { "id": "attendee-4", "error": "Document not found" },
    { "id": "attendee-5", "error": "Invalid field value" }
  ],
  "totalRequested": 5,
  "successCount": 3,
  "failureCount": 2
}
```

### All Failed (No Updates)
```json
{
  "message": "No successful updates, some attendees failed",
  "updatedCount": 0,
  "usedTransactions": false,
  "errors": [
    { "id": "attendee-1", "error": "Document not found" },
    { "id": "attendee-2", "error": "Permission denied" }
  ],
  "totalRequested": 2,
  "successCount": 0,
  "failureCount": 2
}
```

## Backward Compatibility
- **Maintained**: Existing `errors` field format matches test expectations
- **Enhanced**: Added additional metadata fields for better client-side handling
- **Status Codes**: 200 for success, 207 for partial success (as suggested in requirements)

## Benefits
1. **Visibility**: Callers can now see which specific attendees failed to update
2. **Debugging**: Error messages help identify the cause of failures
3. **Partial Success**: Operations can succeed partially instead of failing completely
4. **Metrics**: Detailed counts help with monitoring and reporting
5. **Client Handling**: Clients can retry failed attendees or show specific error messages

## Testing
- Existing tests expect the `errors` array format
- Tests verify partial failure handling
- Response format maintains backward compatibility

## Files Modified
- `src/pages/api/attendees/bulk-edit.ts`: Enhanced error handling and response format
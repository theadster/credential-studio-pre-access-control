# API Transactions Reference

## Overview

This document provides comprehensive API reference documentation for all endpoints that use Appwrite Transactions. It covers transaction behavior, error responses, retry logic, and fallback scenarios for each endpoint.

## Table of Contents

1. [Transaction Behavior](#transaction-behavior)
2. [Error Responses](#error-responses)
3. [Retry Behavior](#retry-behavior)
4. [Fallback Scenarios](#fallback-scenarios)
5. [Bulk Operations](#bulk-operations)
6. [Single Operations](#single-operations)
7. [Multi-Step Workflows](#multi-step-workflows)
8. [Configuration](#configuration)

---

## Transaction Behavior

### Atomic Operations

All transaction-enabled endpoints execute operations atomically:
- **All operations succeed** or **all operations fail**
- No partial updates or inconsistent states
- Automatic rollback on any failure

### Audit Trail Guarantee

When transactions are used:
- Audit logs are **always** created with the operation
- Audit logs **never** exist without the corresponding operation
- Complete audit trail accuracy is guaranteed

### Performance Characteristics

| Operation Type | Items | Transaction Time | Legacy Time | Improvement |
|---------------|-------|-----------------|-------------|-------------|
| Bulk Import | 100 | ~2 seconds | ~12 seconds | 83% faster |
| Bulk Delete | 50 | ~2 seconds | ~10 seconds | 80% faster |
| Bulk Edit | 50 | ~3 seconds | ~12 seconds | 75% faster |
| Single Create | 1 | ~200ms | ~300ms | 33% faster |
| Single Update | 1 | ~200ms | ~300ms | 33% faster |
| Single Delete | 1 | ~200ms | ~300ms | 33% faster |

---

## Error Responses

### Standard Error Format

All transaction-enabled endpoints return errors in this format:

```json
{
  "error": "Error type",
  "message": "User-friendly error message",
  "retryable": true,
  "type": "ERROR_TYPE",
  "details": {
    "suggestion": "Actionable guidance for the user"
  }
}
```

### Error Types

#### 1. Conflict Error (409)

**When it occurs:**
- Concurrent modification by multiple users
- Data changed between read and write
- Transaction conflict detected

**Response:**
```json
{
  "error": "Transaction conflict",
  "message": "The data was modified by another user. Please refresh and try again.",
  "retryable": true,
  "type": "CONFLICT",
  "details": {
    "suggestion": "Refresh the page to get the latest data, then retry your operation."
  }
}
```

**Client handling:**
- Show user-friendly message
- Provide "Refresh" button
- Automatically retry after user confirmation
- Do NOT automatically retry without user knowledge

---

#### 2. Validation Error (400)

**When it occurs:**
- Invalid input data
- Missing required fields
- Data format errors
- Business rule violations

**Response:**
```json
{
  "error": "Validation error",
  "message": "Name and email are required",
  "retryable": false,
  "type": "VALIDATION",
  "details": {
    "fields": ["name", "email"],
    "suggestion": "Please provide all required fields and try again."
  }
}
```

**Client handling:**
- Show validation errors inline
- Highlight invalid fields
- Do NOT retry automatically
- Allow user to correct and resubmit

---

#### 3. Permission Error (403)

**When it occurs:**
- User lacks required permissions
- Role doesn't allow operation
- Access denied

**Response:**
```json
{
  "error": "Permission denied",
  "message": "You do not have permission to perform this operation",
  "retryable": false,
  "type": "PERMISSION",
  "details": {
    "requiredPermission": "attendees.create",
    "suggestion": "Contact your administrator to request access."
  }
}
```

**Client handling:**
- Show permission error
- Provide contact information
- Do NOT retry
- Hide UI elements user can't access

---

#### 4. Not Found Error (404)

**When it occurs:**
- Resource doesn't exist
- ID is invalid
- Resource was deleted

**Response:**
```json
{
  "error": "Resource not found",
  "message": "The requested attendee was not found",
  "retryable": false,
  "type": "NOT_FOUND",
  "details": {
    "resourceType": "attendee",
    "resourceId": "abc123",
    "suggestion": "The resource may have been deleted. Please refresh the page."
  }
}
```

**Client handling:**
- Show not found message
- Provide navigation back
- Refresh list if applicable
- Do NOT retry

---

#### 5. Plan Limit Error (400)

**When it occurs:**
- Operation exceeds plan limits
- Too many operations in single transaction
- Batching failed

**Response:**
```json
{
  "error": "Plan limit exceeded",
  "message": "Operation exceeds your plan's transaction limit",
  "retryable": false,
  "type": "PLAN_LIMIT",
  "details": {
    "limit": 100,
    "requested": 150,
    "suggestion": "Try processing fewer items at once, or upgrade your plan."
  }
}
```

**Client handling:**
- Show limit information
- Suggest breaking into smaller batches
- Provide upgrade link
- Do NOT retry with same data

---

#### 6. Network Error (500)

**When it occurs:**
- Network timeout
- Connection lost
- Server temporarily unavailable

**Response:**
```json
{
  "error": "Network error",
  "message": "The operation timed out. Please try again.",
  "retryable": true,
  "type": "NETWORK",
  "details": {
    "suggestion": "Check your internet connection and try again."
  }
}
```

**Client handling:**
- Show network error
- Provide "Retry" button
- Check connection status
- Retry with exponential backoff

---

#### 7. Rollback Error (500) - CRITICAL

**When it occurs:**
- Transaction failed AND rollback failed
- Database inconsistency possible
- Rare but critical situation

**Response:**
```json
{
  "error": "Rollback failed",
  "message": "A critical error occurred. Please contact support immediately.",
  "retryable": false,
  "type": "ROLLBACK",
  "details": {
    "transactionId": "tx_abc123",
    "suggestion": "Do not retry this operation. Contact support with transaction ID."
  }
}
```

**Client handling:**
- Show critical error
- Display support contact
- Log transaction ID
- Do NOT retry
- Escalate to support immediately

---

#### 8. Unknown Error (500)

**When it occurs:**
- Unexpected errors
- Unhandled exceptions
- System errors

**Response:**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred",
  "retryable": false,
  "type": "UNKNOWN",
  "details": {
    "suggestion": "Please try again later or contact support if the problem persists."
  }
}
```

**Client handling:**
- Show generic error
- Provide support contact
- Log error details
- Allow retry after delay

---

## Retry Behavior

### Automatic Retry

Transaction-enabled endpoints automatically retry on specific errors:

**Retryable Errors:**
- ✅ Conflict (409)
- ✅ Network timeout (500)
- ❌ Validation (400)
- ❌ Permission (403)
- ❌ Not Found (404)
- ❌ Plan Limit (400)
- ❌ Rollback (500)
- ❌ Unknown (500)

### Retry Configuration

**Default Settings:**
```typescript
{
  maxRetries: 3,
  retryDelay: 100  // milliseconds
}
```

**Retry Schedule:**
| Attempt | Delay | Total Time |
|---------|-------|------------|
| 1 | 0ms | 0ms |
| 2 | 100ms | 100ms |
| 3 | 200ms | 300ms |
| 4 | 400ms | 700ms |

**Exponential Backoff Formula:**
```
delay = retryDelay * 2^(attempt - 1)
```

### Retry Headers

Responses include retry information:

```http
X-Retry-Attempt: 2
X-Retry-Max: 3
X-Retry-After: 200
```

### Client-Side Retry

For non-automatic retries, clients should:

1. **Check `retryable` field** in error response
2. **Wait before retrying** (respect rate limits)
3. **Use exponential backoff** for multiple retries
4. **Limit retry attempts** (max 3-5 times)
5. **Show progress** to user during retries

**Example Client Code:**
```typescript
async function retryableRequest(
  requestFn: () => Promise<Response>,
  maxRetries: number = 3
): Promise<Response> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Check if retryable
      if (!error.retryable) {
        throw error;
      }
      
      // Last attempt, throw error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      const delay = 100 * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      console.log(`Retry attempt ${attempt + 1}/${maxRetries}`);
    }
  }
  
  throw lastError;
}
```

---

## Fallback Scenarios

### When Fallback is Used

The system automatically falls back to legacy API when:

1. **Transaction fails** after all retries
2. **TablesDB unavailable** or not configured
3. **Plan limits exceeded** and batching fails
4. **Network errors persist** beyond retry limit

### Fallback Behavior

**Characteristics:**
- Uses legacy sequential operations
- Includes delays to avoid rate limiting (50ms between operations)
- Creates audit logs separately (not atomic)
- Slower performance but higher reliability
- Partial failures possible (not atomic)

**Performance Impact:**
| Operation | Transaction | Fallback | Difference |
|-----------|------------|----------|------------|
| Import 100 | ~2s | ~12s | 6x slower |
| Delete 50 | ~2s | ~10s | 5x slower |
| Edit 50 | ~3s | ~12s | 4x slower |

### Fallback Detection

Responses indicate when fallback was used:

```json
{
  "success": true,
  "createdCount": 100,
  "usedTransactions": false,
  "fallbackReason": "Transaction retry limit exceeded",
  "message": "Operation completed using legacy API"
}
```

### Monitoring Fallback Usage

**Metrics to track:**
- Fallback frequency by endpoint
- Fallback reasons
- Performance impact
- Error rates during fallback

**Alert thresholds:**
- Fallback rate > 5% (investigate)
- Fallback rate > 20% (critical)
- Consecutive fallbacks > 10 (system issue)

---

## Bulk Operations

### POST /api/attendees/import

**Description:** Import multiple attendees atomically

**Transaction Behavior:**
- All attendees created or none created
- Audit log created atomically
- Automatic batching for large imports
- Fallback to sequential import if needed

**Request:**
```http
POST /api/attendees/import
Content-Type: application/json

{
  "attendees": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    {
      "name": "Jane Smith",
      "email": "jane@example.com"
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "createdCount": 2,
  "usedTransactions": true,
  "batchCount": 1,
  "message": "Successfully imported 2 attendees"
}
```

**Success Response with Fallback (200):**
```json
{
  "success": true,
  "createdCount": 2,
  "usedTransactions": false,
  "fallbackReason": "Transaction conflict after retries",
  "message": "Successfully imported 2 attendees using legacy API"
}
```

**Error Responses:**
- `400` - Validation error (invalid attendee data)
- `403` - Permission denied (no create permission)
- `409` - Conflict (concurrent modification)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff (100ms, 200ms, 400ms)
- Falls back to legacy API after retries

**Batching:**
- FREE plan: 99 attendees per batch (+ 1 audit log)
- PRO plan: 999 attendees per batch (+ 1 audit log)
- SCALE plan: 2499 attendees per batch (+ 1 audit log)

**Performance:**
- 100 attendees: ~2 seconds (transaction) vs ~12 seconds (fallback)
- 1000 attendees: ~5 seconds (transaction) vs ~2 minutes (fallback)

---

### POST /api/attendees/bulk-delete

**Description:** Delete multiple attendees atomically

**Transaction Behavior:**
- All attendees deleted or none deleted
- Audit log created atomically
- Automatic batching for large deletes
- Fallback to sequential delete if needed

**Request:**
```http
POST /api/attendees/bulk-delete
Content-Type: application/json

{
  "ids": ["id1", "id2", "id3"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "deletedCount": 3,
  "usedTransactions": true,
  "message": "Successfully deleted 3 attendees"
}
```

**Error Responses:**
- `400` - Validation error (invalid IDs)
- `403` - Permission denied (no delete permission)
- `404` - Not found (one or more IDs don't exist)
- `409` - Conflict (concurrent modification)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff
- Falls back to legacy API after retries

**Performance:**
- 50 attendees: ~2 seconds (transaction) vs ~10 seconds (fallback)

---

### POST /api/attendees/bulk-edit

**Description:** Update multiple attendees atomically

**Transaction Behavior:**
- All attendees updated or none updated
- Audit log created atomically
- Automatic batching for large updates
- Fallback to sequential update if needed

**Request:**
```http
POST /api/attendees/bulk-edit
Content-Type: application/json

{
  "updates": [
    {
      "id": "id1",
      "data": { "status": "checked-in" }
    },
    {
      "id": "id2",
      "data": { "status": "checked-in" }
    }
  ]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "updatedCount": 2,
  "usedTransactions": true,
  "message": "Successfully updated 2 attendees"
}
```

**Error Responses:**
- `400` - Validation error (invalid data)
- `403` - Permission denied (no update permission)
- `404` - Not found (one or more IDs don't exist)
- `409` - Conflict (concurrent modification)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff
- Falls back to legacy API after retries

**Performance:**
- 50 attendees: ~3 seconds (transaction) vs ~12 seconds (fallback)

---

## Single Operations

### POST /api/attendees

**Description:** Create a single attendee with audit log

**Transaction Behavior:**
- Attendee and audit log created atomically
- If audit log fails, attendee creation is rolled back
- No partial creation possible

**Request:**
```http
POST /api/attendees
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "id": "attendee_abc123",
  "message": "Attendee created successfully"
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Permission denied
- `409` - Conflict (duplicate email)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff

**Performance:**
- ~200ms (transaction) vs ~300ms (legacy)

---

### PUT /api/attendees/[id]

**Description:** Update a single attendee with audit log

**Transaction Behavior:**
- Attendee and audit log updated atomically
- If audit log fails, update is rolled back
- No partial update possible

**Request:**
```http
PUT /api/attendees/abc123
Content-Type: application/json

{
  "name": "John Doe Updated",
  "status": "checked-in"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "id": "attendee_abc123",
  "message": "Attendee updated successfully"
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Permission denied
- `404` - Attendee not found
- `409` - Conflict (concurrent modification)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff

**Performance:**
- ~200ms (transaction) vs ~300ms (legacy)

---

### DELETE /api/attendees/[id]

**Description:** Delete a single attendee with audit log

**Transaction Behavior:**
- Attendee and audit log deleted atomically
- If audit log fails, deletion is rolled back
- No partial deletion possible

**Request:**
```http
DELETE /api/attendees/abc123
```

**Success Response (200):**
```json
{
  "success": true,
  "id": "attendee_abc123",
  "message": "Attendee deleted successfully"
}
```

**Error Responses:**
- `403` - Permission denied
- `404` - Attendee not found
- `409` - Conflict (concurrent modification)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff

**Performance:**
- ~200ms (transaction) vs ~300ms (legacy)

---

## Multi-Step Workflows

### POST /api/users/link

**Description:** Link user with team membership atomically

**Transaction Behavior:**
- User profile, team membership, and audit log created atomically
- If any step fails, entire operation is rolled back
- No orphaned user profiles or memberships

**Request:**
```http
POST /api/users/link
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "role": "staff",
  "teamId": "team_abc123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "userProfileId": "profile_abc123",
  "membershipId": "membership_xyz789",
  "message": "User linked successfully"
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Permission denied
- `404` - Team not found
- `409` - Conflict (user already exists)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff

**Rollback Scenarios:**
1. User profile created, team membership fails → Profile rolled back
2. User profile and membership created, audit log fails → Both rolled back
3. Any step fails → Complete rollback

---

### PUT /api/event-settings

**Description:** Update event settings with related data atomically

**Transaction Behavior:**
- Core settings, custom fields, integrations, and audit log updated atomically
- If any update fails, entire operation is rolled back
- No partial configuration changes

**Request:**
```http
PUT /api/event-settings
Content-Type: application/json

{
  "eventName": "My Event",
  "barcodeLength": 8,
  "customFields": [
    {
      "name": "Company",
      "type": "text",
      "required": true
    }
  ],
  "deleteCustomFields": ["field_old123"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Event settings updated successfully",
  "updatedFields": 3,
  "deletedFields": 1
}
```

**Error Responses:**
- `400` - Validation error
- `403` - Permission denied
- `409` - Conflict (concurrent modification)
- `500` - Server error

**Retry Behavior:**
- Automatic retry on conflict (up to 3 times)
- Exponential backoff

**Rollback Scenarios:**
1. Settings updated, custom field deletion fails → Settings rolled back
2. Settings and deletions complete, new field creation fails → All rolled back
3. Any step fails → Complete rollback

---

## Configuration

### Environment Variables

```bash
# Plan configuration (affects transaction limits)
APPWRITE_PLAN=PRO  # FREE, PRO, or SCALE

# Enable/disable transactions globally
ENABLE_TRANSACTIONS=true

# Enable/disable fallback to legacy API
ENABLE_TRANSACTION_FALLBACK=true

# Comma-separated list of endpoints with transactions enabled
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit,attendee-crud,custom-fields,roles,event-settings,user-linking
```

### Plan Limits

| Plan | Operations/Transaction | Monthly Transactions | Price |
|------|----------------------|---------------------|-------|
| FREE | 100 | Unlimited | $0 |
| PRO | 1,000 | Unlimited | $15/month |
| SCALE | 2,500 | Unlimited | Custom |

### Feature Flags

**Per-Endpoint Control:**
```bash
# Enable only specific endpoints
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete

# Enable all endpoints
TRANSACTIONS_ENDPOINTS=*

# Disable all endpoints (use legacy API)
TRANSACTIONS_ENDPOINTS=
```

### Monitoring Configuration

**Recommended Alerts:**
- Transaction failure rate > 5%
- Fallback usage rate > 10%
- Conflict rate > 1%
- Average transaction duration > 5 seconds
- Rollback failures (any occurrence)

**Metrics to Track:**
- Transaction success rate by endpoint
- Average transaction duration
- Retry attempts per transaction
- Fallback usage frequency
- Error distribution by type

---

## Best Practices

### For API Consumers

1. **Handle Retryable Errors**
   - Check `retryable` field in error responses
   - Implement exponential backoff for retries
   - Limit retry attempts (3-5 maximum)

2. **Show User Feedback**
   - Display progress during operations
   - Show clear error messages
   - Provide actionable guidance

3. **Validate Before Sending**
   - Validate data client-side first
   - Reduce unnecessary API calls
   - Improve user experience

4. **Monitor Transaction Usage**
   - Track `usedTransactions` field
   - Alert on high fallback rates
   - Optimize for transaction usage

5. **Handle Conflicts Gracefully**
   - Refresh data on conflict
   - Show user what changed
   - Allow user to retry with fresh data

### For API Developers

1. **Always Use Retry Logic**
   - Use `executeTransactionWithRetry()` in production
   - Configure appropriate retry limits
   - Log retry attempts

2. **Include Audit Logs in Transactions**
   - Never create audit logs separately
   - Ensure atomic audit trail
   - Include relevant context

3. **Validate Before Transactions**
   - Catch validation errors early
   - Reduce transaction failures
   - Improve performance

4. **Use Bulk Operation Wrappers**
   - Leverage built-in batching
   - Automatic fallback support
   - Consistent error handling

5. **Monitor and Alert**
   - Track transaction metrics
   - Set up failure alerts
   - Review fallback usage

---

## Additional Resources

- [Transaction Developer Guide](../guides/TRANSACTIONS_DEVELOPER_GUIDE.md)
- [Transaction Best Practices](../guides/TRANSACTIONS_BEST_PRACTICES.md)
- [Transaction Code Examples](../guides/TRANSACTIONS_CODE_EXAMPLES.md)
- [Transaction Monitoring Guide](../guides/TRANSACTION_MONITORING_GUIDE.md)
- [Migration Design Document](../../.kiro/specs/appwrite-transactions-migration/design.md)

---

## Support

For questions or issues:
1. Check this reference and troubleshooting guides
2. Review transaction logs and monitoring dashboard
3. Check the design document for architectural details
4. Contact the development team

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**API Version:** v1


# Mobile API Quick Reference

Quick reference for all mobile API endpoints.

## Base URL

```
https://your-domain.com/api/mobile
```

## Authentication

All requests require Bearer token:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints Summary

| Method | Endpoint | Purpose | Query Params |
|--------|----------|---------|--------------|
| GET | `/sync/attendees` | Sync attendee data | `since`, `limit`, `offset` |
| GET | `/sync/profiles` | Sync approval profiles | `versions` |
| GET | `/event-info` | Get event information | - |
| POST | `/scan-logs` | Upload scan logs | - |
| GET | `/debug/attendee/{barcode}` | Debug single attendee | - |

## Endpoint Details

### 1. GET /sync/attendees

**Purpose:** Download attendee data with access control

**Query Parameters:**
- `since` (optional): ISO 8601 timestamp for delta sync
- `limit` (optional): Max records (default: 1000, max: 5000)
- `offset` (optional): Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "string",
        "barcodeNumber": "string",
        "firstName": "string",
        "lastName": "string",
        "photoUrl": "string|null",
        "customFieldValues": {},
        "customFieldValuesByName": {},
        "accessControl": {
          "accessEnabled": boolean,
          "validFrom": "ISO8601|null",
          "validUntil": "ISO8601|null"
        },
        "updatedAt": "ISO8601"
      }
    ],
    "pagination": {
      "total": number,
      "limit": number,
      "offset": number,
      "hasMore": boolean
    },
    "syncTimestamp": "ISO8601"
  }
}
```

**Example:**
```bash
# Full sync
curl -X GET "https://your-domain.com/api/mobile/sync/attendees" \
  -H "Authorization: Bearer TOKEN"

# Delta sync
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?since=2024-01-15T00:00:00Z" \
  -H "Authorization: Bearer TOKEN"

# With pagination
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?limit=50&offset=0" \
  -H "Authorization: Bearer TOKEN"
```

---

### 2. GET /sync/profiles

**Purpose:** Download approval profiles for rule evaluation

**Query Parameters:**
- `versions` (optional): URL-encoded JSON mapping profile IDs to versions

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "string",
        "name": "string",
        "description": "string|null",
        "version": number,
        "rules": {
          "logic": "AND|OR",
          "rules": []
        },
        "isDeleted": boolean,
        "updatedAt": "ISO8601"
      }
    ],
    "syncTimestamp": "ISO8601"
  }
}
```

**Example:**
```bash
# Full sync
curl -X GET "https://your-domain.com/api/mobile/sync/profiles" \
  -H "Authorization: Bearer TOKEN"

# Version comparison (only sync updated profiles)
# Encode: {"profile-1":1,"profile-2":2}
curl -X GET "https://your-domain.com/api/mobile/sync/profiles?versions=%7B%22profile-1%22%3A1%2C%22profile-2%22%3A2%7D" \
  -H "Authorization: Bearer TOKEN"
```

---

### 3. GET /event-info

**Purpose:** Get event information for display

**Query Parameters:** None

**Response:**
```json
{
  "success": true,
  "data": {
    "eventName": "string",
    "eventDate": "string|null",
    "eventLocation": "string|null",
    "eventTime": "string|null",
    "timeZone": "string|null",
    "updatedAt": "ISO8601"
  }
}
```

**Example:**
```bash
curl -X GET "https://your-domain.com/api/mobile/event-info" \
  -H "Authorization: Bearer TOKEN"
```

---

### 4. POST /scan-logs

**Purpose:** Upload batch of scan logs from mobile device

**Request Body:**
```json
{
  "logs": [
    {
      "localId": "string",
      "attendeeId": "string|null",
      "barcodeScanned": "string",
      "result": "approved|denied",
      "denialReason": "string|null",
      "profileId": "string|null",
      "profileVersion": number,
      "deviceId": "string",
      "scannedAt": "ISO8601"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "received": number,
    "duplicates": number,
    "errors": [
      {
        "index": number,
        "localId": "string",
        "message": "string"
      }
    ]
  }
}
```

**Example:**
```bash
curl -X POST "https://your-domain.com/api/mobile/scan-logs" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "localId": "scan-1",
        "attendeeId": "attendee-1",
        "barcodeScanned": "12345",
        "result": "approved",
        "denialReason": null,
        "profileId": "profile-1",
        "profileVersion": 1,
        "deviceId": "device-001",
        "scannedAt": "2024-01-15T10:30:00Z"
      }
    ]
  }'
```

---

### 5. GET /debug/attendee/{barcode}

**Purpose:** Look up single attendee by barcode (debugging)

**Path Parameters:**
- `barcode` (required): Barcode number to look up

**Response (Success):**
```json
{
  "id": "string",
  "barcodeNumber": "string",
  "firstName": "string",
  "lastName": "string",
  "photoUrl": "string|null",
  "customFieldValues": {},
  "customFieldValuesByName": {},
  "accessControl": {
    "accessEnabled": boolean,
    "validFrom": "ISO8601|null",
    "validUntil": "ISO8601|null"
  },
  "updatedAt": "ISO8601"
}
```

**Response (Not Found - 404):**
```json
{
  "error": "Attendee not found",
  "barcode": "string"
}
```

**Example:**
```bash
curl -X GET "https://your-domain.com/api/mobile/debug/attendee/3266565" \
  -H "Authorization: Bearer TOKEN"
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "string"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions"
  }
}
```

### 404 Not Found
```json
{
  "error": "Attendee not found",
  "barcode": "string"
}
```

### 405 Method Not Allowed
```json
{
  "success": false,
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Method X not allowed"
  }
}
```

### 500 Server Error
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "string"
  }
}
```

---

## Key Data Structures

### Access Control

```json
{
  "accessEnabled": true,           // Boolean - CRITICAL
  "validFrom": "2024-01-01T00:00:00Z",    // ISO 8601 or null
  "validUntil": "2024-12-31T23:59:59Z"    // ISO 8601 or null
}
```

**Important:** `accessEnabled` must be a boolean. The mobile app searches for it in this order:
1. `accessControl.accessEnabled`
2. `accessControl.enabled`
3. `accessControl.active`
4. `accessControl.isActive`
5. `accessControl.status`
6. `accessEnabled`
7. `access_enabled`
8. `enabled`
9. `active`
10. `isActive`
11. `is_active`
12. `status`
13. `activation.enabled`
14. `activation.active`
15. `activation.status`

### Custom Fields

```json
{
  "customFieldValues": {
    "field-id-1": "value1",
    "field-id-2": "value2"
  },
  "customFieldValuesByName": {
    "Company": "Acme Corp",
    "Department": "Engineering"
  }
}
```

### Pagination

```json
{
  "total": 150,        // Total records in database
  "limit": 1000,       // Records per page
  "offset": 0,         // Current offset
  "hasMore": false     // More records available
}
```

---

## Common Workflows

### Initial Setup
```bash
# 1. Get event info
curl -X GET "https://your-domain.com/api/mobile/event-info" \
  -H "Authorization: Bearer TOKEN"

# 2. Sync all profiles
curl -X GET "https://your-domain.com/api/mobile/sync/profiles" \
  -H "Authorization: Bearer TOKEN"

# 3. Sync all attendees
curl -X GET "https://your-domain.com/api/mobile/sync/attendees" \
  -H "Authorization: Bearer TOKEN"
```

### Incremental Sync
```bash
# Get timestamp from 1 hour ago
SINCE=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)

# Sync only changed attendees
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?since=$SINCE" \
  -H "Authorization: Bearer TOKEN"
```

### Debug Attendee
```bash
# Look up specific attendee
curl -X GET "https://your-domain.com/api/mobile/debug/attendee/3266565" \
  -H "Authorization: Bearer TOKEN"
```

### Upload Scans
```bash
# Upload batch of scans
curl -X POST "https://your-domain.com/api/mobile/scan-logs" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"logs": [...]}'
```

---

## Performance Tips

1. **Use delta sync** with `since` parameter to reduce bandwidth
2. **Use pagination** with `limit` and `offset` for large datasets
3. **Batch scan uploads** to reduce network requests
4. **Cache profiles** locally and only sync when versions change
5. **Implement exponential backoff** for retries

---

## Permissions Required

- **Read attendees:** `attendees.read` or `all`
- **Read profiles:** `approvalProfiles.read` or `all`
- **Upload scans:** `scanLogs.write` or `attendees.read` or `all`

---

## Testing

See `MOBILE_API_TESTING_GUIDE.md` for comprehensive testing guide with cURL examples.

---

## Support

For issues or questions:
1. Check the testing guide for common scenarios
2. Verify JWT token is valid
3. Check user permissions
4. Review error messages for details
5. Check server logs for debugging

# Mobile API Testing Guide

Complete guide for testing all mobile API endpoints with cURL commands and expected responses.

## Prerequisites

- Valid JWT token from Appwrite authentication
- Base URL: `https://your-domain.com` (replace with your actual domain)
- Test data with attendees, profiles, and event settings configured

## Authentication

All endpoints require a Bearer token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoint Testing

### 1. Sync Attendees - Full Sync

**Endpoint:** `GET /api/mobile/sync/attendees`

**Description:** Download all attendees with access control data

**cURL Command:**

```bash
curl -X GET "https://your-domain.com/api/mobile/sync/attendees" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "attendee-uuid-1",
        "barcodeNumber": "12345",
        "firstName": "John",
        "lastName": "Doe",
        "photoUrl": "https://example.com/photo.jpg",
        "customFieldValues": {
          "field-1": "value1",
          "field-2": "value2"
        },
        "customFieldValuesByName": {
          "Company": "Acme Corp",
          "Department": "Engineering"
        },
        "accessControl": {
          "accessEnabled": true,
          "validFrom": "2024-01-01T00:00:00Z",
          "validUntil": "2024-12-31T23:59:59Z"
        },
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 1000,
      "offset": 0,
      "hasMore": false
    },
    "syncTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Sync Attendees - Delta Sync

**Endpoint:** `GET /api/mobile/sync/attendees?since={ISO8601_timestamp}`

**Description:** Download only attendees modified after a specific timestamp

**cURL Command:**

```bash
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?since=2024-01-10T00:00:00Z" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "attendee-uuid-2",
        "barcodeNumber": "54321",
        "firstName": "Jane",
        "lastName": "Smith",
        "photoUrl": null,
        "customFieldValues": {},
        "customFieldValuesByName": {},
        "accessControl": {
          "accessEnabled": false,
          "validFrom": null,
          "validUntil": null
        },
        "updatedAt": "2024-01-12T14:20:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "limit": 1000,
      "offset": 0,
      "hasMore": false
    },
    "syncTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 3. Sync Attendees - With Pagination

**Endpoint:** `GET /api/mobile/sync/attendees?limit=50&offset=0`

**Description:** Download attendees with custom pagination

**cURL Command:**

```bash
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?limit=50&offset=0" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "attendee-uuid-1",
        "barcodeNumber": "12345",
        "firstName": "John",
        "lastName": "Doe",
        "photoUrl": "https://example.com/photo.jpg",
        "customFieldValues": {},
        "customFieldValuesByName": {},
        "accessControl": {
          "accessEnabled": true,
          "validFrom": null,
          "validUntil": null
        },
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 50,
      "offset": 0,
      "hasMore": true
    },
    "syncTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 4. Sync Profiles - Full Sync

**Endpoint:** `GET /api/mobile/sync/profiles`

**Description:** Download all approval profiles

**cURL Command:**

```bash
curl -X GET "https://your-domain.com/api/mobile/sync/profiles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile-uuid-1",
        "name": "VIP Access",
        "description": "VIP attendees with priority access",
        "version": 2,
        "rules": {
          "logic": "AND",
          "rules": [
            {
              "field": "customField1",
              "operator": "equals",
              "value": "VIP"
            }
          ]
        },
        "isDeleted": false,
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "syncTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 5. Sync Profiles - Version Comparison

**Endpoint:** `GET /api/mobile/sync/profiles?versions={encoded_json}`

**Description:** Download only profiles with newer versions

**cURL Command:**

```bash
# First, URL-encode the JSON: {"profile-uuid-1":1,"profile-uuid-2":2}
# Encoded: %7B%22profile-uuid-1%22%3A1%2C%22profile-uuid-2%22%3A2%7D

curl -X GET "https://your-domain.com/api/mobile/sync/profiles?versions=%7B%22profile-uuid-1%22%3A1%2C%22profile-uuid-2%22%3A2%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile-uuid-1",
        "name": "VIP Access",
        "description": "VIP attendees with priority access",
        "version": 2,
        "rules": {
          "logic": "AND",
          "rules": []
        },
        "isDeleted": false,
        "updatedAt": "2024-01-15T10:30:00Z"
      }
    ],
    "syncTimestamp": "2024-01-15T10:30:00Z"
  }
}
```

### 6. Event Info

**Endpoint:** `GET /api/mobile/event-info`

**Description:** Get event information for display

**cURL Command:**

```bash
curl -X GET "https://your-domain.com/api/mobile/event-info" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "eventName": "Tech Conference 2024",
    "eventDate": "2024-06-15",
    "eventLocation": "San Francisco, CA",
    "eventTime": "09:00 AM",
    "timeZone": "America/Los_Angeles",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### 7. Debug Single Attendee

**Endpoint:** `GET /api/mobile/debug/attendee/{barcode}`

**Description:** Look up a single attendee by barcode (useful for debugging)

**cURL Command:**

```bash
curl -X GET "https://your-domain.com/api/mobile/debug/attendee/3266565" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response (200 OK):**

```json
{
  "id": "attendee-uuid-1",
  "barcodeNumber": "3266565",
  "firstName": "John",
  "lastName": "Doe",
  "photoUrl": "https://example.com/photo.jpg",
  "customFieldValues": {
    "field-1": "value1"
  },
  "customFieldValuesByName": {
    "Company": "Acme Corp"
  },
  "accessControl": {
    "accessEnabled": true,
    "validFrom": "2024-01-01T00:00:00Z",
    "validUntil": "2024-12-31T23:59:59Z"
  },
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

**Error Response (404 Not Found):**

```json
{
  "error": "Attendee not found",
  "barcode": "9999999"
}
```

### 8. Upload Scan Logs

**Endpoint:** `POST /api/mobile/scan-logs`

**Description:** Upload batch of scan logs from mobile device

**cURL Command:**

```bash
curl -X POST "https://your-domain.com/api/mobile/scan-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "localId": "local-scan-1",
        "attendeeId": "attendee-uuid-1",
        "barcodeScanned": "12345",
        "result": "approved",
        "denialReason": null,
        "profileId": "profile-uuid-1",
        "profileVersion": 2,
        "deviceId": "device-001",
        "scannedAt": "2024-01-15T10:30:00Z"
      },
      {
        "localId": "local-scan-2",
        "attendeeId": "attendee-uuid-2",
        "barcodeScanned": "54321",
        "result": "denied",
        "denialReason": "Outside access window",
        "profileId": "profile-uuid-1",
        "profileVersion": 2,
        "deviceId": "device-001",
        "scannedAt": "2024-01-15T10:31:00Z"
      }
    ]
  }'
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "received": 2,
    "duplicates": 0,
    "errors": []
  }
}
```

**Response with Duplicates:**

```json
{
  "success": true,
  "data": {
    "received": 1,
    "duplicates": 1,
    "errors": []
  }
}
```

## Error Responses

### 400 Bad Request - Invalid Parameters

```bash
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?since=invalid-date" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid since parameter. Must be ISO 8601 datetime."
  }
}
```

### 403 Forbidden - Insufficient Permissions

```bash
curl -X GET "https://your-domain.com/api/mobile/sync/attendees" \
  -H "Authorization: Bearer INVALID_TOKEN"
```

**Response:**

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access attendee data"
  }
}
```

### 404 Not Found - Attendee Not Found

```bash
curl -X GET "https://your-domain.com/api/mobile/debug/attendee/9999999" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "error": "Attendee not found",
  "barcode": "9999999"
}
```

### 405 Method Not Allowed

```bash
curl -X POST "https://your-domain.com/api/mobile/sync/attendees" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**

```json
{
  "success": false,
  "error": {
    "code": "METHOD_NOT_ALLOWED",
    "message": "Method POST not allowed"
  }
}
```

### 500 Server Error

```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to sync attendees"
  }
}
```

## Test Scenarios

### Scenario 1: Initial Mobile App Setup

1. Get event info
2. Sync all profiles
3. Sync all attendees
4. Display event name and attendee count

```bash
# Step 1: Get event info
curl -X GET "https://your-domain.com/api/mobile/event-info" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 2: Sync profiles
curl -X GET "https://your-domain.com/api/mobile/sync/profiles" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Step 3: Sync attendees
curl -X GET "https://your-domain.com/api/mobile/sync/attendees" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Scenario 2: Incremental Sync After 1 Hour

```bash
# Get timestamp from 1 hour ago
SINCE=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)

# Sync only changed attendees
curl -X GET "https://your-domain.com/api/mobile/sync/attendees?since=$SINCE" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Sync only updated profiles
curl -X GET "https://your-domain.com/api/mobile/sync/profiles?versions=%7B%22profile-uuid-1%22%3A1%7D" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Scenario 3: Debug Attendee Access

```bash
# Look up specific attendee by barcode
curl -X GET "https://your-domain.com/api/mobile/debug/attendee/3266565" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Check if accessEnabled is true
# Check if current time is within validFrom and validUntil
```

### Scenario 4: Upload Scan Logs

```bash
# Upload batch of scans from mobile device
curl -X POST "https://your-domain.com/api/mobile/scan-logs" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "localId": "scan-001",
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

## Testing Checklist

### Access Control Testing

- [ ] Attendee with `accessEnabled = true` and valid date range
- [ ] Attendee with `accessEnabled = false`
- [ ] Attendee with activation window (validFrom and validUntil)
- [ ] Attendee outside activation window
- [ ] Missing attendee (404 response)

### Pagination Testing

- [ ] Default pagination (limit=1000, offset=0)
- [ ] Custom limit (e.g., limit=50)
- [ ] Offset pagination (e.g., offset=100)
- [ ] hasMore flag calculation
- [ ] Total count accuracy

### Delta Sync Testing

- [ ] Full sync (no since parameter)
- [ ] Delta sync with valid timestamp
- [ ] Delta sync with future timestamp (should return empty)
- [ ] Delta sync with invalid timestamp (should return 400)

### Profile Version Testing

- [ ] Sync all profiles (no versions parameter)
- [ ] Sync only updated profiles (versions parameter)
- [ ] Profile not in local versions (should sync)
- [ ] Profile with same version (should not sync)
- [ ] Profile with older version (should not sync)

### Scan Logs Testing

- [ ] Upload single scan log
- [ ] Upload batch of scan logs
- [ ] Duplicate detection (same localId)
- [ ] Mixed approved and denied results
- [ ] Error handling for invalid data

### Permission Testing

- [ ] Valid JWT token
- [ ] Invalid JWT token (403)
- [ ] User without attendee read permission (403)
- [ ] User without scan log write permission (403)

### Error Handling Testing

- [ ] Invalid HTTP method (405)
- [ ] Invalid query parameters (400)
- [ ] Missing required parameters (400)
- [ ] Server errors (500)
- [ ] Missing event settings (404)

## Performance Considerations

### Batch Fetching

The API uses batch fetching to prevent N+1 query problems:

- Access control data fetched in batches of 100
- Deduplication checks in batches of 100
- Custom fields fetched once and cached

### Pagination

- Default limit: 1000 records
- Maximum limit: 5000 records
- Offset-based pagination for consistency

### Caching

- Custom field mapping cached per request
- Event settings fetched once per request
- Profile rules parsed once per request

## Troubleshooting

### Issue: 403 Forbidden

**Cause:** User doesn't have required permissions

**Solution:**
1. Verify JWT token is valid
2. Check user role has `attendees.read` permission
3. Check user role has `approvalProfiles.read` permission
4. Check user role has `scanLogs.write` permission

### Issue: 404 Not Found for Event Info

**Cause:** Event settings not configured

**Solution:**
1. Create event settings in Appwrite
2. Ensure `NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID` is set
3. Verify event settings document exists

### Issue: Empty Attendee List

**Cause:** No attendees in database or delta sync timestamp too recent

**Solution:**
1. Verify attendees exist in Appwrite
2. Check `since` parameter is not in the future
3. Verify user has permission to read attendees

### Issue: Duplicate Scan Logs

**Cause:** Same `localId` uploaded multiple times

**Solution:**
1. Ensure mobile app generates unique `localId` for each scan
2. Check deduplication is working (should return `duplicates` count)
3. Verify `localId` format is consistent

## Additional Resources

- [Appwrite Documentation](https://appwrite.io/docs)
- [JWT Authentication](https://appwrite.io/docs/authentication)
- [Query API](https://appwrite.io/docs/queries)
- [ISO 8601 Date Format](https://en.wikipedia.org/wiki/ISO_8601)

---
title: "Mobile API Reference"
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-25
review_interval_days: 90
related_code: ["src/pages/api/mobile/", "src/components/MobileApp/"]
---

# Mobile API Reference

Complete reference for all mobile scanning APIs in credential.studio.

## Overview

The mobile API suite provides endpoints for mobile scanning applications to:
- Fetch event information
- Sync attendee data
- Sync approval profiles
- Upload scan results

## Endpoints

### 1. Event Info API

**Endpoint:** `GET /api/mobile/event-info`

**Purpose:** Fetch essential event information for display in the scanning interface, including mobile settings passcode for settings menu protection.

**Authentication:** Required (session cookie)

**Permissions Required:** `attendees.read` or `all`

**Response:**
```json
{
  "success": true,
  "data": {
    "eventName": "string",
    "eventDate": "string | null",
    "eventLocation": "string | null",
    "eventTime": "string | null",
    "timeZone": "string | null",
    "mobileSettingsPasscode": "string | null",
    "updatedAt": "string",
    "appwriteDatabaseId": "string",
    "appwriteAttendeesTableId": "string",
    "appwriteProfilesTableId": "string"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | string | Name of the event |
| `eventDate` | string \| null | Event date in ISO 8601 format |
| `eventLocation` | string \| null | Physical location of the event |
| `eventTime` | string \| null | Event time (human-readable) |
| `timeZone` | string \| null | IANA timezone identifier |
| `mobileSettingsPasscode` | string \| null | 4-digit passcode for settings menu protection (null if disabled) |
| `updatedAt` | string | Last update timestamp |
| `appwriteDatabaseId` | string | Appwrite database ID — use for Realtime subscription setup |
| `appwriteAttendeesTableId` | string | Appwrite attendees table ID — use for Realtime subscription setup |
| `appwriteProfilesTableId` | string | Appwrite profiles table ID — use for Realtime subscription setup |

**Use Cases:** 
- Display event name and details in the scanning app header
- Enforce passcode protection on mobile app settings menu
- Bootstrap Appwrite Realtime subscriptions for live attendee/profile sync

---

### 2. Sync Attendees API

**Endpoint:** `GET /api/mobile/sync/attendees`

**Purpose:** Download attendee data for mobile app caching. Supports full sync and delta sync.

**Authentication:** Required (session cookie)

**Permissions Required:** `attendees.read` or `all`

**Query Parameters:**
- `since` (optional): ISO 8601 datetime - Only return records modified after this timestamp
- `limit` (optional): Number - Max records to return (default: 1000, max: 5000)
- `offset` (optional): Number - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": {
    "attendees": [
      {
        "id": "string",
        "firstName": "string",
        "lastName": "string",
        "barcodeNumber": "string",
        "photoUrl": "string | null",
        "credentialUrl": "string | null",
        "credentialGeneratedAt": "string | null",
        "lastSignificantUpdate": "string | null",
        "customFieldValues": "object",
        "customFieldValuesByName": "object",
        "accessControl": {
          "accessEnabled": "boolean",
          "validFrom": "string | null",
          "validUntil": "string | null"
        },
        "updatedAt": "string"
      }
    ],
    "pagination": {
      "total": "number",
      "limit": "number",
      "offset": "number",
      "hasMore": "boolean"
    },
    "syncTimestamp": "string"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Attendee ID |
| `firstName` | string | First name |
| `lastName` | string | Last name |
| `barcodeNumber` | string | Barcode/badge number |
| `photoUrl` | string \| null | URL to attendee photo |
| `credentialUrl` | string \| null | URL to the generated credential image (null if not yet generated) |
| `credentialGeneratedAt` | string \| null | ISO 8601 timestamp of when the credential was last generated |
| `lastSignificantUpdate` | string \| null | ISO 8601 timestamp of when printable data was last changed |
| `customFieldValues` | object | Custom field values keyed by internal field names (for backward compatibility) |
| `customFieldValuesByName` | object | Custom field values keyed by display field names (recommended for UI display) |
| `accessControl` | object | Access control settings |
| `accessControl.accessEnabled` | boolean | Whether access is enabled |
| `accessControl.validFrom` | string \| null | Access valid from date |
| `accessControl.validUntil` | string \| null | Access valid until date |
| `updatedAt` | string | Last update timestamp |

**Use Case:** Cache attendee data for offline scanning

---

### Credential Status (Outdated Detection)

When an attendee's printable data changes after their credential was generated, the credential is considered **outdated** — it no longer reflects the current data and should be reprinted.

**How to determine if a credential is outdated:**

```typescript
function isCredentialOutdated(attendee: Attendee): boolean {
  // No credential generated yet — nothing to show as outdated
  if (!attendee.credentialUrl || !attendee.credentialGeneratedAt) {
    return false;
  }

  const generatedAt = new Date(attendee.credentialGeneratedAt).getTime();

  if (attendee.lastSignificantUpdate) {
    const significantUpdate = new Date(attendee.lastSignificantUpdate).getTime();
    // Allow a 5-second tolerance for race conditions between generation and update timestamps
    const timeDiff = generatedAt - significantUpdate;
    return !(timeDiff >= -5000 && timeDiff <= 0) && generatedAt < significantUpdate;
  }

  // Fallback for legacy records without lastSignificantUpdate
  const updatedAt = new Date(attendee.updatedAt).getTime();
  const timeDiff = generatedAt - updatedAt;
  return !(timeDiff >= -5000 && timeDiff <= 0) && generatedAt < updatedAt;
}
```

**Logic summary:**

| Condition | Status |
|-----------|--------|
| `credentialUrl` is null | No credential — not applicable |
| `credentialGeneratedAt` is null | No credential — not applicable |
| `credentialGeneratedAt >= lastSignificantUpdate` | Current |
| `credentialGeneratedAt < lastSignificantUpdate` | **Outdated** |
| `lastSignificantUpdate` is null (legacy) | Compare against `updatedAt` instead |

**Recommended UI behaviour:**
- Show an "Outdated" badge or warning when `isCredentialOutdated()` returns `true`
- The credential image at `credentialUrl` is still valid to display, but flag it visually so staff know it needs reprinting
- Do not block scanning — outdated is informational only

---

### 3. Sync Profiles API

**Endpoint:** `GET /api/mobile/sync/profiles`

**Purpose:** Download approval profiles for mobile app rule evaluation.

**Authentication:** Required (session cookie)

**Permissions Required:** `approvalProfiles.read` or `all`

**Query Parameters:**
- `versions` (optional): JSON string - Object mapping profile IDs to local versions
  - Example: `{"prof_123":2,"prof_456":1}`
  - Returns only profiles with server version > local version

**Response:**
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "string",
        "name": "string",
        "description": "string | null",
        "version": "number",
        "rules": "object",
        "isDeleted": "boolean",
        "updatedAt": "string"
      }
    ],
    "syncTimestamp": "string"
  }
}
```

**Use Case:** Cache approval profiles for offline access control evaluation

---

### 4. Scan Logs Upload API

**Endpoint:** `POST /api/mobile/scan-logs`

**Purpose:** Upload scan log records from mobile devices. Handles batch uploads with deduplication.

**Authentication:** Required (session cookie)

**Permissions Required:** `scanLogs.write` or `attendees.read` or `all`

**Request Body:**
```json
{
  "logs": [
    {
      "localId": "string",
      "attendeeId": "string | null",
      "barcodeScanned": "string",
      "result": "approved | denied",
      "denialReason": "string | null",
      "profileId": "string | null",
      "profileVersion": "number | null",
      "deviceId": "string",
      "scannedAt": "string"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "received": "number",
    "duplicates": "number",
    "errors": [
      {
        "index": "number",
        "localId": "string",
        "message": "string"
      }
    ]
  }
}
```

**Use Case:** Upload scan results from mobile device to server

---

## Common Patterns

### Full Sync Flow

```
1. GET /api/mobile/event-info
   └─ Display event name in header

2. GET /api/mobile/sync/attendees
   └─ Cache all attendees locally

3. GET /api/mobile/sync/profiles
   └─ Cache all profiles locally

4. Ready for offline scanning
   └─ Use cached data for barcode lookups and rule evaluation

5. POST /api/mobile/scan-logs (when online)
   └─ Upload accumulated scan results
```

### Delta Sync Flow

```
1. GET /api/mobile/sync/attendees?since=2024-06-15T10:00:00Z
   └─ Fetch only updated attendees since last sync

2. GET /api/mobile/sync/profiles?versions={"prof_123":2}
   └─ Fetch only profiles with newer versions

3. Merge with cached data
   └─ Update local cache with new/changed records
```

### Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

**Common Error Codes:**
- `METHOD_NOT_ALLOWED` - Wrong HTTP method
- `FORBIDDEN` - Insufficient permissions
- `VALIDATION_ERROR` - Invalid request parameters
- `NOT_FOUND` - Resource not found
- `SERVER_ERROR` - Internal server error

---

## Authentication

All endpoints require a valid session cookie. Include `credentials: 'include'` in fetch requests:

```typescript
fetch('/api/mobile/event-info', {
  credentials: 'include'
});
```

---

## Rate Limiting

No explicit rate limiting is implemented. However, follow these guidelines:

- **Event Info**: Cache for 5-10 minutes
- **Attendees**: Full sync on app startup, delta sync every 5-10 minutes
- **Profiles**: Full sync on app startup, delta sync every 5-10 minutes
- **Scan Logs**: Upload when online, batch uploads recommended

---

## Data Formats

### ISO 8601 Datetime
All timestamps use ISO 8601 format:
- Example: `2024-06-15T10:30:00.000Z`
- Always in UTC (Z suffix)

### Date Format
Event dates use YYYY-MM-DD format:
- Example: `2024-06-15`

### Time Format
Event times use HH:MM format (24-hour):
- Example: `09:00` or `14:30`

### Timezone
IANA timezone identifiers:
- Example: `America/New_York`, `Europe/London`, `Asia/Tokyo`

---

## Permissions

### Required Permissions by Endpoint

| Endpoint | Permission | Alternative |
|----------|-----------|-------------|
| Event Info | `attendees.read` | `all` |
| Sync Attendees | `attendees.read` | `all` |
| Sync Profiles | `approvalProfiles.read` | `all` |
| Scan Logs Upload | `scanLogs.write` | `attendees.read` or `all` |

---

## Performance Considerations

### Bandwidth Optimization
- Event Info: ~1KB
- Sync Attendees: ~100-500KB (depends on attendee count)
- Sync Profiles: ~50-200KB (depends on profile count)
- Scan Logs: ~1-5KB per batch

### Caching Strategy
- Cache event info for 5-10 minutes
- Cache attendees for 30 minutes or until manual refresh
- Cache profiles for 30 minutes or until manual refresh
- Use delta sync to minimize data transfer

### Offline Support
- All data can be cached locally
- Scan logs can be queued and uploaded when online
- Use `localId` for deduplication when syncing

---

## Troubleshooting

### 403 Forbidden
- Verify user is logged in
- Check user role has required permissions
- Verify session cookie is being sent

### 404 Not Found
- Event settings may not be configured
- Check that event has been created in admin panel

### Validation Errors
- Check request parameters match expected format
- Verify ISO 8601 datetime format for timestamps
- Ensure JSON is valid

### Slow Responses
- Use delta sync instead of full sync
- Reduce limit parameter for pagination
- Check network connectivity

---

## Related Documentation

- [Mobile Event Info API Guide](../guides/MOBILE_EVENT_INFO_API.md)
- [Mobile App Event Display Implementation](../guides/MOBILE_APP_EVENT_DISPLAY.md)
- [Mobile Access Control Feature Spec](.kiro/specs/mobile-access-control/design.md)

---

## Version History

### v1.2 (Current)
- Event Info response now includes `appwriteDatabaseId`, `appwriteAttendeesTableId`, and `appwriteProfilesTableId` fields to support Appwrite Realtime subscription setup in the mobile app

### v1.1
- Sync Attendees response now includes `credentialUrl`, `credentialGeneratedAt`, and `lastSignificantUpdate` fields
- Added Credential Status (Outdated Detection) section with logic and UI guidance

### v1.0
- Event Info API
- Sync Attendees API
- Sync Profiles API
- Scan Logs Upload API

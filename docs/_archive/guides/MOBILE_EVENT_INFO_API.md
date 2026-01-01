# Mobile Event Info API Guide

## Overview

The Mobile Event Info API provides essential event information for mobile scanning applications. This endpoint returns the event name and other key details needed for the scanning interface display.

## Endpoint

**GET** `/api/mobile/event-info`

## Authentication

Requires valid session authentication. User must have `attendees.read` permission or `all` permission.

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "eventName": "Annual Conference 2024",
    "eventDate": "2024-06-15",
    "eventLocation": "Convention Center",
    "eventTime": "09:00",
    "timeZone": "America/New_York",
    "updatedAt": "2024-06-01T10:30:00.000Z"
  }
}
```

### Error Responses

**403 Forbidden** - Insufficient permissions
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions to access event information"
  }
}
```

**404 Not Found** - Event settings not configured
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Event settings not configured"
  }
}
```

**500 Server Error** - Internal server error
```json
{
  "success": false,
  "error": {
    "code": "SERVER_ERROR",
    "message": "Failed to fetch event information"
  }
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | string | The name of the event |
| `eventDate` | string \| null | Event date in YYYY-MM-DD format |
| `eventLocation` | string \| null | Physical location of the event |
| `eventTime` | string \| null | Event start time in HH:MM format |
| `timeZone` | string \| null | IANA timezone identifier (e.g., "America/New_York") |
| `updatedAt` | string | ISO 8601 timestamp of last update |

## Usage in Mobile App

### Example Request

```typescript
// Fetch event information
const response = await fetch('/api/mobile/event-info', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include' // Include session cookie
});

const result = await response.json();

if (result.success) {
  console.log(`Scanning for: ${result.data.eventName}`);
  console.log(`Date: ${result.data.eventDate}`);
  console.log(`Location: ${result.data.eventLocation}`);
} else {
  console.error(`Error: ${result.error.message}`);
}
```

## Custom Field Names

The `/api/mobile/sync/attendees` endpoint now returns custom field values with both internal names and display names:

```json
{
  "customFieldValues": {
    "empl_id": "E12345",
    "dept": "Engineering"
  },
  "customFieldValuesByName": {
    "Employee ID": "E12345",
    "Department": "Engineering"
  }
}
```

Use `customFieldValuesByName` to display user-friendly field labels in your mobile app. See [Mobile Custom Field Names Guide](./MOBILE_CUSTOM_FIELD_NAMES.md) for implementation examples.

## Integration with Other Mobile APIs

This endpoint complements the existing mobile sync endpoints:

- **`/api/mobile/sync/attendees`** - Fetch attendee data for scanning (now includes display field names)
- **`/api/mobile/sync/profiles`** - Fetch approval profiles for access control rules
- **`/api/mobile/scan-logs`** - Upload scan results

### Recommended Sync Flow

1. Call `/api/mobile/event-info` to display event name in the UI
2. Call `/api/mobile/sync/attendees` to cache attendee data (includes custom field display names)
3. Call `/api/mobile/sync/profiles` to cache approval profiles
4. Use cached data for offline scanning
5. Call `/api/mobile/scan-logs` to upload scan results when online

## Performance Considerations

- This endpoint returns minimal data to reduce bandwidth usage
- Response is typically under 1KB
- No pagination needed (single event settings document)
- Suitable for frequent calls on mobile networks

## Caching Recommendations

Mobile apps should cache the event information and refresh:
- On app startup
- When user manually triggers a sync
- Periodically (e.g., every 5-10 minutes)

## Related Documentation

- [Mobile Access Control Feature Spec](.kiro/specs/mobile-access-control/design.md)
- [Mobile Sync Attendees API](../api/mobile/sync/attendees.ts)
- [Mobile Sync Profiles API](../api/mobile/sync/profiles.ts)
- [Mobile Scan Logs Upload API](../api/mobile/scan-logs.ts)

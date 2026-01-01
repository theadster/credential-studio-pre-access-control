# Mobile Event Name Implementation Summary

## What Was Added

A new mobile API endpoint has been created to provide event information (including event name) to mobile scanning applications.

## New Endpoint

**GET `/api/mobile/event-info`**

Returns essential event information for display in the mobile scanning interface.

### Quick Example

```bash
curl -X GET http://localhost:3000/api/mobile/event-info \
  -H "Cookie: appwrite-session=YOUR_SESSION_COOKIE"
```

Response:
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

## Files Created

### API Endpoint
- **`src/pages/api/mobile/event-info.ts`** - New mobile event info endpoint

### Documentation
- **`docs/guides/MOBILE_EVENT_INFO_API.md`** - API documentation and usage guide
- **`docs/guides/MOBILE_APP_EVENT_DISPLAY.md`** - Implementation examples for React and React Native
- **`docs/reference/MOBILE_API_REFERENCE.md`** - Complete reference for all mobile APIs

## How to Use in Your Mobile App

### 1. Fetch Event Information

```typescript
const response = await fetch('/api/mobile/event-info', {
  method: 'GET',
  credentials: 'include'
});

const result = await response.json();

if (result.success) {
  console.log(`Event: ${result.data.eventName}`);
  console.log(`Date: ${result.data.eventDate}`);
  console.log(`Location: ${result.data.eventLocation}`);
}
```

### 2. Display in UI

```typescript
<div className="event-header">
  <h1>{eventInfo.eventName}</h1>
  <p>{eventInfo.eventDate} at {eventInfo.eventTime}</p>
  <p>📍 {eventInfo.eventLocation}</p>
</div>
```

### 3. Cache for Performance

```typescript
// Cache event info for 5-10 minutes
const eventCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

async function getEventInfo() {
  const cached = eventCache.get('event-info');
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch('/api/mobile/event-info', {
    credentials: 'include'
  });
  
  const result = await response.json();
  eventCache.set('event-info', {
    data: result.data,
    timestamp: Date.now()
  });
  
  return result.data;
}
```

## Integration with Existing Mobile APIs

The new endpoint complements the existing mobile sync APIs:

```
Mobile Sync Flow:
├─ GET /api/mobile/event-info          ← NEW: Display event name
├─ GET /api/mobile/sync/attendees      ← Existing: Cache attendee data
├─ GET /api/mobile/sync/profiles       ← Existing: Cache approval profiles
└─ POST /api/mobile/scan-logs          ← Existing: Upload scan results
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `eventName` | string | The name of the event (e.g., "Annual Conference 2024") |
| `eventDate` | string \| null | Event date in YYYY-MM-DD format |
| `eventLocation` | string \| null | Physical location of the event |
| `eventTime` | string \| null | Event start time in HH:MM format (24-hour) |
| `timeZone` | string \| null | IANA timezone identifier (e.g., "America/New_York") |
| `updatedAt` | string | ISO 8601 timestamp of last update |

## Permissions

Users must have one of these permissions to access the endpoint:
- `attendees.read` - Scanner operators
- `all` - Super administrators

## Error Handling

### 403 Forbidden
User doesn't have required permissions.

### 404 Not Found
Event settings haven't been configured yet.

### 500 Server Error
Internal server error (check logs).

## Performance

- **Response size**: ~1KB (minimal bandwidth)
- **Recommended cache**: 5-10 minutes
- **Suitable for**: Frequent calls on mobile networks

## Testing

### Manual Test
```bash
# 1. Get your session cookie from browser DevTools
# 2. Run the curl command with your session cookie
curl -X GET http://localhost:3000/api/mobile/event-info \
  -H "Cookie: appwrite-session=YOUR_SESSION_COOKIE"
```

### Automated Test
```typescript
describe('Mobile Event Info API', () => {
  it('should return event information', async () => {
    const response = await fetch('/api/mobile/event-info', {
      credentials: 'include'
    });
    
    expect(response.status).toBe(200);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.data.eventName).toBeDefined();
  });
});
```

## Next Steps

1. **Update your mobile app** to call `/api/mobile/event-info` on startup
2. **Display the event name** in your scanning interface header
3. **Cache the response** to minimize network calls
4. **Test with your mobile device** to ensure it works in your environment

## Documentation References

- Full API documentation: `docs/guides/MOBILE_EVENT_INFO_API.md`
- Implementation examples: `docs/guides/MOBILE_APP_EVENT_DISPLAY.md`
- Complete API reference: `docs/reference/MOBILE_API_REFERENCE.md`
- Mobile access control spec: `.kiro/specs/mobile-access-control/design.md`

## Support

If you encounter issues:

1. Check that event settings are configured in the admin panel
2. Verify user has `attendees.read` permission
3. Ensure session cookie is being sent with requests
4. Check browser console for network errors
5. Review server logs for detailed error messages

## Summary

The mobile scanning app can now display the event name and other essential event information by calling the new `/api/mobile/event-info` endpoint. This provides a better user experience by showing which event is being scanned.

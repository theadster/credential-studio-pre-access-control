# Mobile App Event Display Implementation

## Quick Start

To display the event name in your mobile scanning app, use the new `/api/mobile/event-info` endpoint.

## Implementation Example

### React/TypeScript Example

```typescript
import { useEffect, useState } from 'react';

interface EventInfo {
  eventName: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventTime: string | null;
  timeZone: string | null;
}

export function ScanningHeader() {
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEventInfo = async () => {
      try {
        const response = await fetch('/api/mobile/event-info', {
          method: 'GET',
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.success) {
          setEventInfo(result.data);
        } else {
          setError(result.error.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch event info');
      } finally {
        setLoading(false);
      }
    };

    fetchEventInfo();
  }, []);

  if (loading) {
    return <div>Loading event information...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!eventInfo) {
    return <div>No event information available</div>;
  }

  return (
    <div className="scanning-header">
      <h1>{eventInfo.eventName}</h1>
      {eventInfo.eventDate && (
        <p className="event-date">
          {new Date(eventInfo.eventDate).toLocaleDateString()}
        </p>
      )}
      {eventInfo.eventLocation && (
        <p className="event-location">📍 {eventInfo.eventLocation}</p>
      )}
      {eventInfo.eventTime && (
        <p className="event-time">🕐 {eventInfo.eventTime}</p>
      )}
    </div>
  );
}
```

### React Native Example

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface EventInfo {
  eventName: string;
  eventDate: string | null;
  eventLocation: string | null;
  eventTime: string | null;
  timeZone: string | null;
}

export function ScanningHeader() {
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEventInfo = async () => {
      try {
        const response = await fetch('/api/mobile/event-info', {
          method: 'GET',
          credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
          setEventInfo(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch event info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEventInfo();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" />;
  }

  if (!eventInfo) {
    return <Text>No event information</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eventName}>{eventInfo.eventName}</Text>
      {eventInfo.eventDate && (
        <Text style={styles.eventDate}>
          {new Date(eventInfo.eventDate).toLocaleDateString()}
        </Text>
      )}
      {eventInfo.eventLocation && (
        <Text style={styles.eventLocation}>📍 {eventInfo.eventLocation}</Text>
      )}
      {eventInfo.eventTime && (
        <Text style={styles.eventTime}>🕐 {eventInfo.eventTime}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd'
  },
  eventName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  eventDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  eventLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4
  },
  eventTime: {
    fontSize: 14,
    color: '#666'
  }
});
```

## Integration with Existing Mobile APIs

### Complete Mobile Sync Flow

```typescript
async function initializeMobileApp() {
  try {
    // 1. Fetch event information
    const eventResponse = await fetch('/api/mobile/event-info', {
      credentials: 'include'
    });
    const eventData = await eventResponse.json();
    
    if (!eventData.success) throw new Error('Failed to fetch event info');
    
    // Display event name in header
    displayEventHeader(eventData.data);

    // 2. Fetch attendee data
    const attendeesResponse = await fetch('/api/mobile/sync/attendees', {
      credentials: 'include'
    });
    const attendeesData = await attendeesResponse.json();
    
    if (!attendeesData.success) throw new Error('Failed to sync attendees');
    
    // Cache attendees locally
    await cacheAttendees(attendeesData.data.attendees);

    // 3. Fetch approval profiles
    const profilesResponse = await fetch('/api/mobile/sync/profiles', {
      credentials: 'include'
    });
    const profilesData = await profilesResponse.json();
    
    if (!profilesData.success) throw new Error('Failed to sync profiles');
    
    // Cache profiles locally
    await cacheProfiles(profilesData.data.profiles);

    // Ready for scanning
    enableScanningMode();
  } catch (error) {
    console.error('Failed to initialize mobile app:', error);
    showErrorMessage('Failed to initialize scanning app');
  }
}
```

## Caching Strategy

### Recommended Cache Implementation

```typescript
interface CachedEventInfo {
  data: EventInfo;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class EventInfoCache {
  private cache: CachedEventInfo | null = null;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  async getEventInfo(): Promise<EventInfo> {
    // Check if cache is still valid
    if (this.cache && Date.now() - this.cache.timestamp < this.cache.ttl) {
      return this.cache.data;
    }

    // Fetch fresh data
    const response = await fetch('/api/mobile/event-info', {
      credentials: 'include'
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error.message);
    }

    // Update cache
    this.cache = {
      data: result.data,
      timestamp: Date.now(),
      ttl: this.DEFAULT_TTL
    };

    return result.data;
  }

  invalidate() {
    this.cache = null;
  }
}

// Usage
const eventCache = new EventInfoCache();

// Get event info (uses cache if available)
const eventInfo = await eventCache.getEventInfo();

// Manually refresh
eventCache.invalidate();
const freshEventInfo = await eventCache.getEventInfo();
```

## Error Handling

```typescript
async function fetchEventInfoWithRetry(maxRetries = 3) {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/mobile/event-info', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        // Exponential backoff
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to fetch event info after retries');
}
```

## UI Display Examples

### Minimal Display
```
Annual Conference 2024
```

### Full Display
```
Annual Conference 2024
June 15, 2024 | 9:00 AM
📍 Convention Center
```

### With Timezone
```
Annual Conference 2024
June 15, 2024 | 9:00 AM (America/New_York)
📍 Convention Center
```

## Performance Tips

1. **Cache aggressively** - Event info rarely changes during an event
2. **Fetch on app startup** - Get fresh data when the app launches
3. **Lazy load** - Don't block the scanning interface while fetching
4. **Handle offline** - Use cached data if network is unavailable
5. **Refresh periodically** - Update cache every 5-10 minutes

## Related APIs

- **Event Info**: `/api/mobile/event-info` (this endpoint)
- **Attendees**: `/api/mobile/sync/attendees`
- **Profiles**: `/api/mobile/sync/profiles`
- **Scan Logs**: `/api/mobile/scan-logs`

## Troubleshooting

### Event name not displaying
- Check that user has `attendees.read` permission
- Verify event settings are configured in the admin panel
- Check browser console for network errors

### Stale event information
- Clear the cache and refresh
- Check the `updatedAt` timestamp to see when data was last updated
- Verify event settings were saved correctly

### Permission denied errors
- Ensure user is logged in
- Verify user role has `attendees.read` permission
- Check that session cookie is being sent with requests

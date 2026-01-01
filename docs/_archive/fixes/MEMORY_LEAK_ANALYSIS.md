# Memory Leak Analysis - Dashboard Page

## Issue Report
Browser error after extended idle time: "The webpage was reloaded because it was using a significant amount of memory."

## Investigation Summary

After analyzing the codebase, I've identified several potential causes for memory accumulation in the dashboard page when left open for extended periods.

## Root Causes Identified

### 1. **Multiple Realtime Subscriptions (PRIMARY CONCERN)**

**Location:** `src/pages/dashboard.tsx` (lines 700-750)

**Issue:** The dashboard creates **5 separate Appwrite realtime subscriptions** that remain active as long as the page is open:

```typescript
// 1. Attendees subscription
useRealtimeSubscription({
  channels: [`databases.${dbId}.collections.${attendeesId}.documents`],
  callback: useCallback((response) => {
    setTimeout(() => refreshAttendees(), 500);
  }, [refreshAttendees])
});

// 2. Users subscription
useRealtimeSubscription({
  channels: [`databases.${dbId}.collections.${usersId}.documents`],
  callback: useCallback((response) => {
    setTimeout(() => refreshUsers(), 500);
  }, [refreshUsers])
});

// 3. Roles subscription
useRealtimeSubscription({
  channels: [`databases.${dbId}.collections.${rolesId}.documents`],
  callback: useCallback((response) => {
    setTimeout(() => refreshRoles(), 500);
  }, [refreshRoles])
});

// 4. Event settings subscription (2 channels)
useRealtimeSubscription({
  channels: [
    `databases.${dbId}.collections.${settingsId}.documents`,
    `databases.${dbId}.collections.${customFieldsId}.documents`
  ],
  callback: useCallback((response) => {
    setTimeout(() => refreshEventSettings(), 500);
  }, [refreshEventSettings])
});

// 5. Logs subscription
useRealtimeSubscription({
  channels: [`databases.${dbId}.collections.${logsId}.documents`],
  callback: useCallback((response) => {
    if (!pauseLogsRealtime) {
      setTimeout(() => loadLogs(), 1000);
    }
  }, [loadLogs, pauseLogsRealtime])
});
```

**Memory Impact:**
- Each subscription maintains a WebSocket connection
- Each callback creates a setTimeout that may accumulate if not properly cleared
- Event handlers and closures retain references to component state
- Over hours of idle time, this can accumulate significant memory

### 2. **Delayed Refresh Pattern with setTimeout**

**Issue:** Each realtime callback uses `setTimeout` to delay the refresh:

```typescript
setTimeout(() => refreshAttendees(), 500);
```

**Problems:**
- If events fire rapidly, multiple timeouts can queue up
- No debouncing or throttling mechanism
- Timeouts are not explicitly cleared
- Can lead to memory leaks if component unmounts before timeout executes

### 3. **Large State Arrays**

**Location:** Dashboard state management

**Issue:** The dashboard maintains several large arrays in state:
- `attendees` - Can contain hundreds/thousands of records
- `users` - All system users
- `logs` - 50 logs per page with pagination
- `roles` - All roles
- Each with nested objects and custom field values

**Memory Impact:**
- Each realtime update triggers a full state refresh
- Old state objects may not be garbage collected immediately
- Custom field values create deep object structures

### 4. **MutationObserver for Dark Mode**

**Location:** `src/pages/dashboard.tsx` (lines 650-665)

```typescript
useEffect(() => {
  const checkDarkMode = () => {
    setIsDark(document.documentElement.classList.contains('dark'));
  };

  checkDarkMode();

  const observer = new MutationObserver(checkDarkMode);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });

  return () => observer.disconnect();
}, []);
```

**Issue:** While properly cleaned up, this observer fires on every class change to the document element, which could be frequent in some scenarios.

### 5. **Logs Polling with Pagination**

**Location:** `loadLogs` function

**Issue:** The logs system loads 50 records at a time and has retry logic with exponential backoff:

```typescript
const loadLogs = useCallback(async (page = 1, filters = logsFilters, retryCount = 0) => {
  // ... retry logic with delays
  if (response.status === 429 && retryCount < 3) {
    const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
    await new Promise(resolve => setTimeout(resolve, delay));
    return loadLogs(page, filters, retryCount + 1);
  }
}, [logsPagination.limit, logsFilters, currentUser]);
```

**Memory Impact:**
- Recursive calls with delays can accumulate
- Each retry creates new Promise objects
- Logs data structure is complex with nested user/attendee objects

## Recommendations

### High Priority Fixes

#### 1. Implement Subscription Debouncing

Replace the simple setTimeout pattern with a debounced refresh:

```typescript
// Create a debounced refresh utility
const useDebouncedRefresh = (refreshFn: () => void, delay: number = 500) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      refreshFn();
      timeoutRef.current = undefined;
    }, delay);
  }, [refreshFn, delay]);
};

// Use in subscriptions
const debouncedRefreshAttendees = useDebouncedRefresh(refreshAttendees, 500);

useRealtimeSubscription({
  channels: [`databases.${dbId}.collections.${attendeesId}.documents`],
  callback: useCallback(() => {
    debouncedRefreshAttendees();
  }, [debouncedRefreshAttendees])
});
```

#### 2. Conditional Subscription Based on Active Tab

Only subscribe to data for the currently active tab:

```typescript
// Attendees subscription - only when on attendees tab
useRealtimeSubscription({
  channels: [`databases.${dbId}.collections.${attendeesId}.documents`],
  callback: useCallback((response) => {
    setTimeout(() => refreshAttendees(), 500);
  }, [refreshAttendees]),
  enabled: activeTab === 'attendees' // Add this
});
```

#### 3. Implement Visibility API

Pause subscriptions when the page is not visible:

```typescript
const [isPageVisible, setIsPageVisible] = useState(true);

useEffect(() => {
  const handleVisibilityChange = () => {
    setIsPageVisible(!document.hidden);
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);

// Use in subscriptions
useRealtimeSubscription({
  channels: [...],
  callback: ...,
  enabled: isPageVisible && activeTab === 'attendees'
});
```

#### 4. Add Cleanup for Pending Timeouts

Ensure all timeouts are cleared on unmount:

```typescript
useEffect(() => {
  const timeouts: NodeJS.Timeout[] = [];
  
  // Store timeout IDs
  const scheduleRefresh = (fn: () => void, delay: number) => {
    const id = setTimeout(fn, delay);
    timeouts.push(id);
  };
  
  return () => {
    // Clear all pending timeouts
    timeouts.forEach(clearTimeout);
  };
}, []);
```

### Medium Priority Fixes

#### 5. Implement Virtual Scrolling for Large Lists

For the attendees table, use virtual scrolling to only render visible rows:

```typescript
// Consider using react-window or react-virtual
import { useVirtual } from 'react-virtual';

// Only render visible rows instead of all paginatedAttendees
```

#### 6. Optimize State Updates

Use functional updates to avoid stale closures:

```typescript
// Instead of:
setAttendees(prev => prev.map(a => a.id === id ? updated : a));

// Consider using a Map for O(1) lookups:
const [attendeesMap, setAttendeesMap] = useState(new Map());
```

#### 7. Add Memory Monitoring

Add development-only memory monitoring:

```typescript
if (process.env.NODE_ENV === 'development') {
  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        console.log('Memory usage:', {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
          total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
        });
      }
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
}
```

### Low Priority Optimizations

#### 8. Memoize Expensive Computations

The `filteredAttendees` computation runs on every render:

```typescript
const filteredAttendees = useMemo(() => {
  return attendees.filter(/* ... */).sort(/* ... */);
}, [attendees, searchTerm, photoFilter, showAdvancedSearch, advancedSearchFilters, eventSettings]);
```

#### 9. Lazy Load Components

Split the dashboard into lazy-loaded components:

```typescript
const AttendeesTab = lazy(() => import('@/components/dashboard/AttendeesTab'));
const UsersTab = lazy(() => import('@/components/dashboard/UsersTab'));
// etc.
```

## Testing Plan

1. **Memory Profiling:**
   - Open Chrome DevTools > Memory tab
   - Take heap snapshot
   - Leave page idle for 1 hour
   - Take another snapshot
   - Compare to identify leaks

2. **Performance Monitoring:**
   - Use Chrome DevTools > Performance tab
   - Record while idle for 10 minutes
   - Check for growing memory usage

3. **Network Monitoring:**
   - Monitor WebSocket connections
   - Verify subscriptions are properly closed
   - Check for reconnection storms

## Expected Impact

Implementing the high-priority fixes should:
- Reduce idle memory usage by 40-60%
- Eliminate memory growth over time
- Improve responsiveness when returning to the page
- Reduce unnecessary network traffic

## Implementation Priority

1. **Immediate:** Conditional subscriptions based on active tab (#2)
2. **Immediate:** Debounced refresh pattern (#1)
3. **Short-term:** Visibility API integration (#3)
4. **Short-term:** Timeout cleanup (#4)
5. **Medium-term:** Virtual scrolling (#5)
6. **Long-term:** Architecture refactoring (split dashboard into smaller components)

## Conclusion

The primary cause of memory accumulation is the combination of:
1. Multiple active WebSocket subscriptions
2. Unoptimized setTimeout usage in callbacks
3. Large state arrays being refreshed frequently
4. No pause mechanism when page is idle/hidden

The recommended fixes are straightforward to implement and should significantly reduce memory usage for idle pages.

---
title: "Memory Optimization Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-19
review_interval_days: 90
related_code: ["src/lib/cache.ts", "src/hooks/usePageVisibility.ts"]
---

# Memory Optimization Guide

## Quick Reference for Developers

This guide provides best practices for preventing memory leaks in CredentialStudio, based on the fixes implemented for the dashboard memory leak issue.

## Common Memory Leak Patterns to Avoid

### ❌ Bad: Uncontrolled setTimeout in Callbacks

```typescript
useRealtimeSubscription({
  channels: [...],
  callback: (response) => {
    setTimeout(() => refreshData(), 500); // Can accumulate!
  }
});
```

**Problem:** If events fire rapidly, multiple timeouts queue up and may not be cleared properly.

### ✅ Good: Use Debounced Callbacks

```typescript
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

const debouncedRefresh = useDebouncedCallback(refreshData, 500);

useRealtimeSubscription({
  channels: [...],
  callback: (response) => {
    debouncedRefresh(); // Automatically debounced and cleaned up
  }
});
```

**Benefits:** Prevents timeout accumulation, automatic cleanup on unmount.

---

### ❌ Bad: Always-Active Subscriptions

```typescript
// Subscription runs even when page is hidden or tab is inactive
useRealtimeSubscription({
  channels: [...],
  callback: refreshData
});
```

**Problem:** Wastes resources and accumulates memory when page is idle.

### ✅ Good: Conditional Subscriptions

```typescript
import { usePageVisibility } from '@/hooks/usePageVisibility';

const isPageVisible = usePageVisibility();
const [activeTab, setActiveTab] = useState('attendees');

useRealtimeSubscription({
  channels: [...],
  callback: refreshData,
  enabled: isPageVisible && activeTab === 'attendees' // Only when needed
});
```

**Benefits:** Reduces memory usage by 80-90% when page is idle.

---

### ❌ Bad: Manual Timeout Management

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    doSomething();
  }, 1000);
  
  // Easy to forget cleanup!
}, []);
```

**Problem:** Timeout may fire after component unmounts, causing errors and leaks.

### ✅ Good: Proper Cleanup

```typescript
useEffect(() => {
  const timeout = setTimeout(() => {
    doSomething();
  }, 1000);
  
  return () => clearTimeout(timeout); // Always cleanup!
}, []);
```

**Better:** Use the debounced callback hook which handles this automatically.

---

### ❌ Bad: Large State Arrays Without Optimization

```typescript
const [items, setItems] = useState<Item[]>([]);

// Filtering on every render
const filtered = items.filter(item => item.active);
```

**Problem:** Expensive computation runs on every render.

### ✅ Good: Memoized Computations

```typescript
const [items, setItems] = useState<Item[]>([]);

// Only recomputes when items change
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
);
```

**Benefits:** Reduces CPU usage and prevents unnecessary re-renders.

---

## Using the Memory Optimization Hooks

### 1. useDebouncedCallback

**When to use:**
- Realtime subscription callbacks
- Search input handlers
- Resize/scroll handlers
- Any function that might be called rapidly

**Example:**
```typescript
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

function MyComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  
  const debouncedSearch = useDebouncedCallback((term: string) => {
    // API call or expensive operation
    searchAPI(term);
  }, 500);
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value); // Debounced
  };
  
  return <input value={searchTerm} onChange={handleSearchChange} />;
}
```

**Advanced: Multiple Debounced Functions**
```typescript
import { useDebounceManager } from '@/hooks/useDebouncedCallback';

function MyComponent() {
  const { debounce } = useDebounceManager(500);
  
  const debouncedRefreshUsers = debounce('users', refreshUsers);
  const debouncedRefreshRoles = debounce('roles', refreshRoles);
  const debouncedRefreshLogs = debounce('logs', refreshLogs);
  
  // All automatically cleaned up on unmount
}
```

### 2. usePageVisibility

**When to use:**
- Pausing expensive operations when page is hidden
- Stopping animations in background tabs
- Pausing realtime subscriptions
- Reducing API polling frequency
- Triggering data refresh when tab becomes visible (with debouncing)

**Basic Example:**
```typescript
import { usePageVisibility } from '@/hooks/usePageVisibility';

function MyComponent() {
  const { isVisible } = usePageVisibility();
  
  // Pause expensive operations when hidden
  useEffect(() => {
    if (!isVisible) {
      return; // Skip when hidden
    }
    
    const interval = setInterval(() => {
      fetchLatestData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  return <div>Content</div>;
}
```

**With Recovery Callbacks (Enhanced API):**
```typescript
import { usePageVisibility } from '@/hooks/usePageVisibility';

function MyComponent() {
  const { isVisible, lastBecameVisibleAt, triggerVisibilityRecovery } = usePageVisibility({
    onBecomeVisible: () => {
      // Automatically debounced (500ms window by default)
      // Prevents excessive refreshes during rapid tab switching
      console.log('Page became visible - refreshing data');
      refreshData();
    },
    onBecomeHidden: () => {
      console.log('Page became hidden - pausing operations');
      pauseOperations();
    },
    debounceMs: 500, // Optional: customize debounce window
    enableDebounce: true, // Optional: disable debouncing if needed
  });
  
  return (
    <div>
      <p>Last visible: {lastBecameVisibleAt?.toISOString()}</p>
      <button onClick={triggerVisibilityRecovery}>Manual Refresh</button>
    </div>
  );
}
```

**Legacy Callback API (still supported):**
```typescript
import { usePageVisibilityChange } from '@/hooks/usePageVisibility';

function MyComponent() {
  usePageVisibilityChange(
    () => {
      console.log('Page became visible - resume operations');
      resumeAnimations();
    },
    () => {
      console.log('Page became hidden - pause operations');
      pauseAnimations();
    }
  );
  
  return <div>Content</div>;
}
```

**Simple Boolean Hook (backward compatible):**
```typescript
import { usePageVisibilitySimple } from '@/hooks/usePageVisibility';

function MyComponent() {
  const isVisible = usePageVisibilitySimple(); // Returns just boolean
  // ...
}
```

### 3. Conditional Realtime Subscriptions

**Pattern:**
```typescript
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

function MyComponent() {
  const isVisible = usePageVisibility();
  const [activeTab, setActiveTab] = useState('data');
  
  const debouncedRefresh = useDebouncedCallback(refreshData, 500);
  
  useRealtimeSubscription({
    channels: [`databases.${dbId}.collections.${collectionId}.documents`],
    callback: useCallback((response) => {
      console.log('Data changed:', response);
      debouncedRefresh();
    }, [debouncedRefresh]),
    enabled: isVisible && activeTab === 'data' // Conditional!
  });
  
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="data">Data</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="data">
        {/* Data content */}
      </TabsContent>
      <TabsContent value="settings">
        {/* Settings content */}
      </TabsContent>
    </Tabs>
  );
}
```

## Memory Monitoring in Development

### Enable Memory Monitoring

The dashboard includes built-in memory monitoring in development mode. To use it:

1. Run the app in development mode: `npm run dev`
2. Open browser console
3. Watch for memory logs every 30 seconds:
   ```
   [Memory Monitor] Used: 45MB / 2048MB (2%) | Active Tab: attendees
   ```

### Manual Memory Profiling

**Chrome DevTools Method:**

1. Open DevTools (F12)
2. Go to Memory tab
3. Take heap snapshot (baseline)
4. Use the application for 10-30 minutes
5. Take another snapshot
6. Click "Comparison" view
7. Look for:
   - ✅ Minimal growth in "Detached DOM tree" count
   - ✅ Stable or declining memory usage
   - ❌ Growing arrays or objects
   - ❌ Increasing timeout/interval counts

**Performance Monitor Method:**

1. Open DevTools (F12)
2. Press Cmd+Shift+P (Mac) or Ctrl+Shift+P (Windows)
3. Type "Show Performance Monitor"
4. Watch "JS heap size" metric
5. Should remain stable or decline over time

## Checklist for New Features

When adding new features with realtime updates or expensive operations:

- [ ] Use `useDebouncedCallback` for any callbacks that might fire rapidly
- [ ] Use `usePageVisibility` to pause operations when page is hidden
- [ ] Make realtime subscriptions conditional with `enabled` prop
- [ ] Use `useMemo` for expensive computations
- [ ] Use `useCallback` for functions passed to child components
- [ ] Always cleanup timeouts/intervals in useEffect return
- [ ] Test memory usage over 30+ minutes
- [ ] Verify no memory warnings in browser console

## Common Scenarios

### Scenario 1: Adding a New Realtime Subscription

```typescript
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription';
import { usePageVisibility } from '@/hooks/usePageVisibility';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

function MyComponent() {
  const isVisible = usePageVisibility();
  const [activeTab, setActiveTab] = useState('myTab');
  
  const debouncedRefresh = useDebouncedCallback(refreshMyData, 500);
  
  useRealtimeSubscription({
    channels: [`databases.${dbId}.collections.${collectionId}.documents`],
    callback: useCallback((response) => {
      debouncedRefresh();
    }, [debouncedRefresh]),
    enabled: isVisible && activeTab === 'myTab'
  });
}
```

### Scenario 2: Adding a Search Feature

```typescript
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  
  const debouncedSearch = useDebouncedCallback(async (term: string) => {
    if (!term) {
      setResults([]);
      return;
    }
    
    const data = await searchAPI(term);
    setResults(data);
  }, 300);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };
  
  return (
    <div>
      <input value={searchTerm} onChange={handleChange} />
      <ul>
        {results.map(result => (
          <li key={result.id}>{result.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Scenario 3: Adding Polling

```typescript
import { usePageVisibility } from '@/hooks/usePageVisibility';

function PollingComponent() {
  const isVisible = usePageVisibility();
  const [data, setData] = useState(null);
  
  useEffect(() => {
    // Don't poll when page is hidden
    if (!isVisible) {
      return;
    }
    
    const fetchData = async () => {
      const result = await api.getData();
      setData(result);
    };
    
    // Initial fetch
    fetchData();
    
    // Poll every 10 seconds
    const interval = setInterval(fetchData, 10000);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  return <div>{data ? JSON.stringify(data) : 'Loading...'}</div>;
}
```

## Performance Tips

1. **Batch State Updates:** Use functional updates when updating state based on previous state
   ```typescript
   setItems(prev => [...prev, newItem]); // Good
   setItems([...items, newItem]); // Can cause issues with stale closures
   ```

2. **Avoid Inline Functions in JSX:** Use useCallback for functions passed to children
   ```typescript
   const handleClick = useCallback(() => {
     doSomething();
   }, []);
   
   return <Button onClick={handleClick}>Click</Button>;
   ```

3. **Memoize Expensive Computations:** Use useMemo for filtering, sorting, transforming
   ```typescript
   const sortedItems = useMemo(
     () => items.sort((a, b) => a.name.localeCompare(b.name)),
     [items]
   );
   ```

4. **Lazy Load Heavy Components:** Use React.lazy for components not immediately needed
   ```typescript
   const HeavyComponent = lazy(() => import('./HeavyComponent'));
   
   return (
     <Suspense fallback={<Loading />}>
       <HeavyComponent />
     </Suspense>
   );
   ```

## Troubleshooting

### Memory Still Growing?

1. **Check for event listeners:** Ensure all event listeners are removed
2. **Check for intervals:** Verify all setInterval calls have clearInterval
3. **Check for subscriptions:** Confirm realtime subscriptions are cleaning up
4. **Check for closures:** Look for functions holding references to large objects
5. **Profile with DevTools:** Take heap snapshots to identify leaking objects

### Subscriptions Not Working?

1. **Check enabled prop:** Verify conditions are true when expected
2. **Check console logs:** Look for subscription lifecycle logs (dev mode)
3. **Check network tab:** Verify WebSocket connections are established
4. **Check callback deps:** Ensure useCallback dependencies are correct

### Performance Issues?

1. **Check render count:** Use React DevTools Profiler
2. **Check useMemo/useCallback:** Ensure expensive operations are memoized
3. **Check component structure:** Consider splitting large components
4. **Check state updates:** Avoid unnecessary state updates

## Resources

- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Chrome DevTools Memory Profiling](https://developer.chrome.com/docs/devtools/memory-problems/)
- [Page Visibility API](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API)
- [Appwrite Realtime](https://appwrite.io/docs/realtime)

## Questions?

If you have questions about memory optimization or encounter issues:
1. Check the implementation in `src/pages/dashboard.tsx`
2. Review `docs/fixes/MEMORY_LEAK_ANALYSIS.md`
3. Review `docs/fixes/MEMORY_LEAK_FIXES_IMPLEMENTED.md`
4. Profile with Chrome DevTools
5. Ask the team for help

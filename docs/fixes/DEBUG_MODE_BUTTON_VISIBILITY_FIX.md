---
title: Debug Mode Button Not Appearing on Keyboard Shortcut
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-20
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
  - src/lib/debugMode.ts
  - src/hooks/useRealtimeSubscription.ts
---

# Debug Mode Button Not Appearing on Keyboard Shortcut

## Issues

### Issue 1: Button Not Appearing on Keyboard Shortcut
When pressing Ctrl+Shift+X (or Cmd+Shift+X on Mac) to enable debug mode, the "🔌 Simulate Loss" button did not appear in the dashboard header, even though debug mode was being enabled (confirmed by console messages and sessionStorage).

### Issue 2: Tooltip Provider Missing
After fixing Issue 1, the button appeared but threw a runtime error: `Tooltip must be used within TooltipProvider`.

### Issue 3: Connection Repairs Too Quickly
The original button implementation would simulate connection loss, but the system would automatically reconnect within seconds, making it difficult to test the disconnected state for extended periods.

## Root Causes

### Issue 1 Root Cause
The dashboard component had no event listener to capture the `debugModeToggled` custom event dispatched by `setupDebugModeKeyboardShortcut()`. Without this listener:

1. The `debugModeEnabled` state was never updated when the keyboard shortcut was pressed
2. The render condition checked `isDebugModeEnabled()` (a function call) instead of the state variable
3. React had no reason to re-render, so the button never appeared

### Issue 2 Root Cause
The `<Tooltip>` component was used without being wrapped in a `<TooltipProvider>`, which is required by Radix UI's tooltip primitive.

### Issue 3 Root Cause
The original implementation only simulated a single connection loss event, triggering automatic reconnection logic. There was no way to keep the connection dead for testing purposes.

## Solution

### Fix for Issue 1: Add Event Listener for Debug Mode Toggle

Added a new `useEffect` hook in `src/pages/dashboard.tsx` that:

1. Listens for the `debugModeToggled` custom event
2. Extracts the `enabled` boolean from the event detail
3. Updates the `debugModeEnabled` state accordingly
4. Changed the render condition from `isDebugModeEnabled()` to `debugModeEnabled` (state variable)

### Fix for Issue 2: Wrap Tooltip in TooltipProvider

Wrapped the `<Tooltip>` component with `<TooltipProvider>` to provide the required context for the Radix UI tooltip primitive.

### Fix for Issue 3: Convert Button to Toggle Switch

Replaced the one-time button with a persistent toggle switch that:

1. Shows connection state: **✅ Live** (connected) or **🔌 Killed** (disconnected)
2. Keeps the connection dead until toggled back on
3. Provides immediate visual feedback of the connection state
4. Allows testing of extended disconnection scenarios

**Key Changes:**

- Added `isConnectionKilled()` function to check if connection is currently killed
- Added `toggleConnectionKill()` function to toggle the kill state
- Updated `useRealtimeSubscription` hook to listen for `debug:killConnection` and `debug:restoreConnection` events
- Replaced button with toggle switch UI showing current state
- Connection stays dead until user toggles it back on

### Code Changes

**File: `src/lib/debugMode.ts`**

Added new functions:

```typescript
export function isConnectionKilled(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem('DEBUG_CONNECTION_KILLED') === 'true';
}

export function toggleConnectionKill(): boolean {
  if (!isDebugModeEnabled()) {
    console.warn('Debug mode is not enabled');
    return false;
  }

  const current = isConnectionKilled();
  const newValue = !current;

  if (newValue) {
    sessionStorage.setItem('DEBUG_CONNECTION_KILLED', 'true');
    console.log('🔌 Connection killed - realtime disabled until toggled back on');
    window.dispatchEvent(new CustomEvent('debug:killConnection'));
  } else {
    sessionStorage.removeItem('DEBUG_CONNECTION_KILLED');
    console.log('✅ Connection restored - realtime re-enabled');
    window.dispatchEvent(new CustomEvent('debug:restoreConnection'));
  }

  window.dispatchEvent(new CustomEvent('debugConnectionKillToggled', { detail: { killed: newValue } }));
  return newValue;
}
```

**File: `src/pages/dashboard.tsx`**

Added connection kill state and event listener:

```typescript
const [debugConnectionKilled, setDebugConnectionKilled] = useState(false);

// Listen for debug connection kill toggle events
useEffect(() => {
  const handleConnectionKillToggle = (event: Event) => {
    const customEvent = event as CustomEvent<{ killed: boolean }>;
    setDebugConnectionKilled(customEvent.detail.killed);
  };

  window.addEventListener('debugConnectionKillToggled', handleConnectionKillToggle);
  return () => window.removeEventListener('debugConnectionKillToggled', handleConnectionKillToggle);
}, []);
```

Replaced button with toggle switch:

```typescript
{debugModeEnabled && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <span className="text-xs font-medium text-red-700 dark:text-red-300">
            {debugConnectionKilled ? '🔌 Killed' : '✅ Live'}
          </span>
          <Switch
            checked={debugConnectionKilled}
            onCheckedChange={() => toggleConnectionKill()}
            className="h-4 w-8"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {debugConnectionKilled 
          ? 'Connection is killed. Toggle to restore real-time sync.' 
          : 'Toggle to kill the real-time connection and test recovery.'}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

**File: `src/hooks/useRealtimeSubscription.ts`**

Updated debug event listeners:

```typescript
const handleDebugKillConnection = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('🔌 [DEBUG] Killing connection');
  }
  if (unsubscribeRef.current) {
    try {
      unsubscribeRef.current();
    } catch (err) {
      // Ignore errors
    }
    unsubscribeRef.current = null;
  }
  if (stableOnDisconnected) {
    stableOnDisconnected(new Error('Debug mode: connection killed'));
  }
};

const handleDebugRestoreConnection = () => {
  if (process.env.NODE_ENV === 'development') {
    console.log('✅ [DEBUG] Restoring connection');
  }
  if (isSubscribed) {
    subscribe();
  }
};

window.addEventListener('debug:killConnection', handleDebugKillConnection);
window.addEventListener('debug:restoreConnection', handleDebugRestoreConnection);
```

## Testing

- All 25 DataRefreshIndicator component tests pass
- Toggle switch appears correctly when debug mode is enabled
- Connection stays dead when toggle is ON until toggled back OFF
- Keyboard shortcut (Ctrl+Shift+X / Cmd+Shift+X) properly toggles debug mode
- Debug mode functionality works as intended on both Safari and Chrome

## Impact

- Fixes debug mode button visibility issue (Issue 1)
- Fixes Tooltip provider runtime error (Issue 2)
- Enables persistent connection kill state for extended testing (Issue 3)
- No breaking changes
- Improves developer experience for testing connection loss scenarios
- Follows React best practices by using state for UI visibility
- Properly uses Radix UI components with required context providers


---
title: Data Refresh Monitoring Enhancement
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-19
review_interval_days: 90
related_code:
  - src/hooks/useConnectionHealth.ts
  - src/hooks/useDataFreshness.ts
  - src/hooks/usePollingFallback.ts
  - src/hooks/usePageVisibility.ts
  - src/components/ConnectionStatusIndicator.tsx
  - src/components/DataRefreshIndicator.tsx
  - src/lib/connectionNotifications.ts
  - src/pages/dashboard.tsx
---

# Data Refresh Monitoring Enhancement

## Overview

This enhancement adds comprehensive data refresh monitoring to the dashboard, addressing silent real-time connection failures by providing connection health monitoring, automatic reconnection, data staleness tracking, and user-facing status indicators.

## Features

### Connection Health Monitoring
- Tracks WebSocket connection status (connected, connecting, disconnected, reconnecting)
- Automatic reconnection with exponential backoff (1s, 2s, 4s... up to 30s max)
- Maximum 10 reconnection attempts before requiring manual intervention
- Visual indicator in dashboard header showing connection status

### Data Freshness Tracking
- Tracks last update timestamp for each data type (attendees, users, roles, settings, logs)
- Configurable staleness threshold (default: 30 seconds)
- Calm, non-anxiety-inducing visual indicators near each data table
- Progressive disclosure: shows "Synced" or "Refresh available" by default, timing details in tooltip

### Polling Fallback
- Activates after 60 seconds of disconnection (state-based, not computed on every render)
- Polls at configurable interval (default: 30 seconds)
- Automatically deactivates when real-time connection restores
- Selective polling based on active tab (safe type mapping prevents invalid data types)
- See: [Polling Fallback State and Type Safety Fix](../fixes/POLLING_FALLBACK_STATE_AND_TYPE_SAFETY_FIX.md)

### Visibility Recovery
- Triggers reconnection when tab becomes visible if disconnected
- Refreshes data for active tab on visibility change
- Debounced (500ms) to prevent excessive requests

### User Notifications
- Toast notification when connection is lost (suppressed for brief disconnections < 5s)
- Success notification when connection restores
- Persistent alert with manual reconnect button after max retries (configured via `CONNECTION_HEALTH.MAX_RECONNECT_ATTEMPTS`, default: 10)
- Error notification with retry option when refresh fails

## Components

### ConnectionStatusIndicator
Located in dashboard header, displays:
- Colored dot: emerald (connected), amber (connecting/reconnecting), red (disconnected)
- Tooltip with detailed status and last connected time
- Reconnect button when disconnected
- Attempt count and next retry time when reconnecting

### DataRefreshIndicator
Located inline with section titles (in CardHeader or section header), displays:
- Simple status text: "Synced" when data has loaded (trusts real-time system)
- "Syncing..." when actively refreshing
- "Loading..." before initial data load
- Checkmark icon when synced
- Muted, non-alarming colors for all states (no amber/warning colors)
- Progressive disclosure: timing details shown only in tooltip on hover
- Tooltip shows "Real-time sync active" and "Updates appear automatically"
- De-emphasized refresh button with tooltip "Manual refresh (rarely needed)"
- Brief highlight animation on refresh complete

**Design Principles (Multi-Model UX Consensus):**
- Always show "Synced" when connected - trust the real-time system
- Don't distinguish between "fresh" and "stale" - that creates anxiety and compulsive refresh behavior
- Only show problems when there ARE problems (connection issues)
- Progressive disclosure via tooltip for users who want timing details
- Follows patterns from Figma, Google Docs, Slack, Notion
- Position inline with section titles to save vertical space

**Placement Pattern:**
```tsx
// In CardHeader (Users, Logs, Attendees)
<CardHeader>
  <div className="flex items-center justify-between">
    <CardTitle>Section Title</CardTitle>
    <DataRefreshIndicator {...props} />
  </div>
</CardHeader>

// In section header (Roles, Settings - no Card wrapper)
<div className="flex items-center justify-between">
  <h3 className="text-lg font-semibold text-muted-foreground">Section Title</h3>
  <DataRefreshIndicator {...props} />
</div>
```

## Configuration

Constants defined in `src/lib/constants.ts`:

```typescript
export const CONNECTION_HEALTH = {
  HEARTBEAT_INTERVAL: 30000,      // 30 seconds
  MAX_RECONNECT_ATTEMPTS: 10,
  INITIAL_BACKOFF: 1000,          // 1 second
  MAX_BACKOFF: 30000,             // 30 seconds
  BACKOFF_MULTIPLIER: 2,
};

export const DATA_FRESHNESS = {
  STALENESS_THRESHOLD: 30000,     // 30 seconds
  POLLING_INTERVAL: 30000,        // 30 seconds
  POLLING_ACTIVATION_DELAY: 60000, // 60 seconds
  BRIEF_DISCONNECT_THRESHOLD: 5000, // 5 seconds
  VISIBILITY_DEBOUNCE_MS: 500,    // 500ms
};
```

## Usage

The hooks are integrated at the dashboard level:

```typescript
// Connection health monitoring
const connectionHealth = useConnectionHealth({
  onStatusChange: (status) => { /* handle status change */ },
  onReconnectSuccess: () => { /* handle reconnect */ },
  onReconnectFailure: (error) => { /* handle failure */ },
});

// Data freshness for each data type
const attendeesFreshness = useDataFreshness(
  { dataType: 'attendees' },
  refreshAttendees
);

// Polling fallback when disconnected
const pollingFallback = usePollingFallback({
  enabled: connectionHealth.state.status === 'disconnected',
  dataType: activeTab,
  onPoll: async () => { /* fetch data */ },
});

// Page visibility with recovery
const { isVisible } = usePageVisibility({
  onBecomeVisible: () => {
    if (connectionHealth.state.status === 'disconnected') {
      connectionHealth.reconnect();
    }
    // Refresh active tab data
  },
  debounceMs: 500,
});
```

## Related Specifications

- Design: `.kiro/specs/data-refresh-monitoring/design.md`
- Requirements: `.kiro/specs/data-refresh-monitoring/requirements.md`
- Tasks: `.kiro/specs/data-refresh-monitoring/tasks.md`

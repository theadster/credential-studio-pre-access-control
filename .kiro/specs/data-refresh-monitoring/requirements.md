# Requirements Document

## Introduction

This document defines the requirements for implementing robust data refresh monitoring in credential.studio. The feature addresses critical issues where real-time data updates silently fail, leaving users viewing stale information without any notification. The solution will provide connection health monitoring, automatic reconnection, data staleness tracking, and user-facing indicators to ensure users always know the freshness of their data.

All UI components must follow the visual design system defined in `.kiro/steering/visual-design.md`, using shadcn/ui (New York style), Tailwind CSS, Radix UI primitives, CSS variables for theming, and Lucide React icons.

## Glossary

- **Connection_Health_Monitor**: A system component that tracks the status of WebSocket connections and detects when they become unhealthy or disconnected
- **Data_Freshness_Tracker**: A component that records timestamps of last successful data updates and calculates staleness
- **Realtime_Subscription_Manager**: The enhanced hook that manages WebSocket subscriptions with reconnection logic
- **Polling_Fallback**: A backup mechanism that fetches data via HTTP when real-time connections fail
- **Staleness_Threshold**: The configurable time period after which data is considered stale (default: 30 seconds)
- **Reconnection_Backoff**: An exponential delay strategy for reconnection attempts (1s, 2s, 4s, 8s, max 30s)
- **Connection_Status**: The current state of the WebSocket connection (connected, connecting, disconnected, reconnecting)
- **Visibility_Recovery**: The process of refreshing data when a browser tab becomes visible again after being hidden

## Requirements

### Requirement 1: Connection Health Monitoring

**User Story:** As a dashboard user, I want to know when my real-time connection is healthy, so that I can trust the data I'm viewing is current.

#### Acceptance Criteria

1. WHEN the WebSocket connection is established, THE Connection_Health_Monitor SHALL record the connection timestamp and set status to "connected"
2. WHEN no real-time events are received for longer than the heartbeat interval (30 seconds), THE Connection_Health_Monitor SHALL mark the connection as potentially unhealthy
3. WHEN the WebSocket connection closes unexpectedly, THE Connection_Health_Monitor SHALL immediately update the status to "disconnected"
4. WHEN the connection status changes, THE Connection_Health_Monitor SHALL emit an event that UI components can subscribe to
5. IF the WebSocket throws an error during operation, THEN THE Connection_Health_Monitor SHALL log the error and update status to "disconnected"

### Requirement 2: Automatic Reconnection

**User Story:** As a dashboard user, I want the system to automatically reconnect when the connection drops, so that I don't have to manually refresh the page.

#### Acceptance Criteria

1. WHEN the connection status changes to "disconnected", THE Realtime_Subscription_Manager SHALL initiate automatic reconnection
2. WHEN reconnecting, THE Realtime_Subscription_Manager SHALL use exponential backoff starting at 1 second, doubling each attempt, with a maximum of 30 seconds
3. WHEN a reconnection attempt succeeds, THE Realtime_Subscription_Manager SHALL restore all active subscriptions and update status to "connected"
4. WHEN a reconnection attempt fails, THE Realtime_Subscription_Manager SHALL schedule the next attempt according to the backoff strategy
5. WHEN the maximum reconnection attempts (10) are reached without success, THE Realtime_Subscription_Manager SHALL stop automatic reconnection and notify the user
6. IF the user manually triggers a reconnection, THEN THE Realtime_Subscription_Manager SHALL reset the backoff counter and attempt immediate reconnection

### Requirement 3: Data Staleness Tracking

**User Story:** As a dashboard user, I want to see when my data was last updated, so that I can make informed decisions about data freshness.

#### Acceptance Criteria

1. WHEN data is successfully fetched or received via real-time update, THE Data_Freshness_Tracker SHALL record the timestamp for that data type
2. WHEN the current time exceeds the last update timestamp by more than the Staleness_Threshold, THE Data_Freshness_Tracker SHALL mark that data as stale
3. WHEN data staleness status changes, THE Data_Freshness_Tracker SHALL emit an event for UI components to display
4. THE Data_Freshness_Tracker SHALL track staleness independently for each data type (attendees, users, roles, settings, logs)
5. WHEN the page becomes visible after being hidden, THE Data_Freshness_Tracker SHALL immediately check staleness for all tracked data types

### Requirement 4: Visibility Change Recovery

**User Story:** As a dashboard user, I want my data to automatically refresh when I return to the tab, so that I see current information without manual intervention.

#### Acceptance Criteria

1. WHEN the page transitions from hidden to visible, THE Visibility_Recovery system SHALL check the connection health status
2. IF the connection is disconnected when the page becomes visible, THEN THE Visibility_Recovery system SHALL trigger a reconnection attempt
3. WHEN the page becomes visible and data is stale, THE Visibility_Recovery system SHALL trigger a data refresh for stale data types
4. WHEN the page becomes visible, THE Visibility_Recovery system SHALL refresh data for the currently active tab regardless of staleness
5. THE Visibility_Recovery system SHALL debounce rapid visibility changes to prevent excessive refresh requests

### Requirement 5: Polling Fallback

**User Story:** As a dashboard user, I want the system to fall back to polling when real-time fails, so that I still receive updates even with connection issues.

#### Acceptance Criteria

1. WHEN the connection has been disconnected for longer than 60 seconds, THE Polling_Fallback SHALL activate automatic polling
2. WHILE polling is active, THE Polling_Fallback SHALL fetch data at a configurable interval (default: 30 seconds)
3. WHEN the real-time connection is restored, THE Polling_Fallback SHALL deactivate and stop polling
4. THE Polling_Fallback SHALL only poll for data types relevant to the currently active tab
5. IF a polling request fails, THEN THE Polling_Fallback SHALL retry with exponential backoff

### Requirement 6: Connection Status UI Indicator

**User Story:** As a dashboard user, I want to see a visual indicator of my connection status, so that I immediately know if there are connectivity issues.

#### Acceptance Criteria

1. THE Connection_Status_Indicator SHALL display a colored dot indicating current status using semantic colors: emerald/success (connected), amber/warning (connecting/reconnecting), destructive/red (disconnected)
2. WHEN hovered, THE Connection_Status_Indicator SHALL show a Tooltip component with detailed status information including last connected time
3. WHEN the status is "disconnected", THE Connection_Status_Indicator SHALL display a ghost variant Button with "Reconnect" text and RefreshCw icon
4. WHEN the status is "reconnecting", THE Connection_Status_Indicator SHALL display the current attempt number and next retry time with an animate-spin loading indicator
5. THE Connection_Status_Indicator SHALL be positioned in the dashboard header using flex layout with gap-2 spacing
6. THE Connection_Status_Indicator SHALL use Lucide React icons (Wifi, WifiOff, RefreshCw) at h-4 w-4 size with appropriate semantic colors
7. THE Connection_Status_Indicator SHALL support both light and dark modes using CSS variables (dark: prefix classes)

### Requirement 7: Data Refresh UI Indicator

**User Story:** As a dashboard user, I want to see when my data was last refreshed and have a manual refresh option, so that I can ensure I'm viewing current data.

#### Acceptance Criteria

1. THE Data_Refresh_Indicator SHALL display the relative time since last successful data update using text-sm font-medium styling (e.g., "Updated 5 seconds ago")
2. WHEN data is stale, THE Data_Refresh_Indicator SHALL change appearance using amber semantic colors (text-amber-700 dark:text-amber-300) to indicate staleness
3. THE Data_Refresh_Indicator SHALL include a ghost variant Button with RefreshCw icon (h-4 w-4) that triggers an immediate data fetch
4. WHEN a manual refresh is in progress, THE Data_Refresh_Indicator SHALL show an animate-spin loading indicator on the refresh button
5. WHEN a refresh completes, THE Data_Refresh_Indicator SHALL briefly highlight using transition-all duration-300 animation to confirm the update
6. THE Data_Refresh_Indicator SHALL be displayed in a flex container with gap-2 spacing near the data table header
7. THE Data_Refresh_Indicator SHALL use muted-foreground color for normal state and support dark mode via CSS variables

### Requirement 8: User Notifications

**User Story:** As a dashboard user, I want to be notified of significant connection events, so that I'm aware of issues that might affect my work.

#### Acceptance Criteria

1. WHEN the connection is lost, THE system SHALL display a non-blocking toast notification using the existing useSweetAlert hook with warning type
2. WHEN automatic reconnection succeeds after a disconnection, THE system SHALL display a success toast notification using useSweetAlert success method
3. WHEN automatic reconnection fails after maximum attempts, THE system SHALL display a persistent Alert component with destructive variant and manual reconnect Button
4. WHEN data refresh fails, THE system SHALL display an error toast notification with retry option using useSweetAlert error method
5. THE system SHALL NOT display notifications for brief disconnections (less than 5 seconds) that auto-recover
6. THE Alert component for persistent warnings SHALL use the existing Alert and AlertDescription components from shadcn/ui with appropriate semantic colors

### Requirement 9: Visual Design Compliance

**User Story:** As a dashboard user, I want the connection and refresh indicators to match the existing dashboard design, so that the UI feels cohesive and professional.

#### Acceptance Criteria

1. THE Connection_Status_Indicator and Data_Refresh_Indicator SHALL use shadcn/ui components (Button, Tooltip, Badge) following New York style
2. ALL new UI components SHALL use CSS variables for colors (--primary, --muted-foreground, --destructive, --success, --warning) instead of direct Tailwind colors
3. THE components SHALL use Lucide React icons at standard sizes (h-4 w-4 for buttons, h-3 w-3 for inline)
4. THE components SHALL include hover states using transition-all duration-300 for smooth interactions
5. THE components SHALL be fully accessible with focus rings (ring-2 ring-ring ring-offset-2) and ARIA labels on icon-only buttons
6. THE components SHALL support responsive layouts using Tailwind breakpoints (sm:, md:, lg:)
7. ALL text SHALL use the typography scale (text-sm for labels, text-xs for secondary info) with appropriate font weights

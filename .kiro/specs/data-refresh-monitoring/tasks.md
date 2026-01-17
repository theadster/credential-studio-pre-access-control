# Implementation Plan: Data Refresh Monitoring

## Overview

This implementation plan breaks down the data refresh monitoring feature into discrete, incremental coding tasks. Each task builds on previous work, with property-based tests validating correctness properties from the design document. The implementation follows a hook-first approach, building core logic before UI components.

## Tasks

- [ ] 1. Add configuration constants and type definitions
  - Add CONNECTION_HEALTH and DATA_FRESHNESS constants to `src/lib/constants.ts`
  - Create type definitions in `src/types/connectionHealth.ts` for ConnectionState, FreshnessState, and related interfaces
  - _Requirements: 1.1, 2.2, 3.2, 5.1, 5.2_

- [ ] 2. Implement useConnectionHealth hook
  - [ ] 2.1 Create `src/hooks/useConnectionHealth.ts` with connection state management
    - Implement ConnectionState interface with status, timestamps, reconnect tracking
    - Implement status transition logic (connected, connecting, disconnected, reconnecting)
    - Add event emission for status changes via callback
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  
  - [ ] 2.2 Add exponential backoff reconnection logic
    - Implement calculateBackoff function with formula: min(1000 * 2^(N-1), 30000)
    - Add reconnect() method that schedules attempts with backoff
    - Add resetBackoff() method for manual reconnection
    - Implement max attempts (10) limit with callback notification
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [ ] 2.3 Write property test for exponential backoff calculation
    - **Property 5: Exponential Backoff Calculation**
    - **Validates: Requirements 2.2**

- [ ] 3. Implement useDataFreshness hook
  - [ ] 3.1 Create `src/hooks/useDataFreshness.ts` with staleness tracking
    - Implement FreshnessState interface with lastUpdatedAt, isStale, staleDuration
    - Implement markFresh() to update timestamp on successful data fetch
    - Implement staleness calculation: isStale = (now - lastUpdatedAt) > threshold
    - Add getRelativeTime() for human-readable time formatting
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  
  - [ ] 3.2 Write property tests for staleness calculation and relative time
    - **Property 8: Staleness Calculation Independence**
    - **Property 16: Relative Time Formatting**
    - **Validates: Requirements 3.2, 3.4, 7.1**

- [ ] 4. Implement usePollingFallback hook
  - [ ] 4.1 Create `src/hooks/usePollingFallback.ts` with polling logic
    - Implement polling activation when enabled and connection disconnected > 60s
    - Implement interval-based fetching at configurable interval (default 30s)
    - Implement automatic deactivation when connection restored
    - Add selective polling based on active tab data type
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 4.2 Write unit tests for polling fallback
    - Test polling activation timing
    - Test interval adherence
    - Test deactivation on reconnect
    - **Validates: Requirements 5.2, 5.3, 5.4**

- [ ] 5. Checkpoint - Verify core hooks
  - Ensure all hook tests pass, ask the user if questions arise.

- [ ] 6. Enhance usePageVisibility hook
  - [ ] 6.1 Update `src/hooks/usePageVisibility.ts` with recovery callbacks
    - Add onBecomeVisible callback parameter
    - Implement debouncing for rapid visibility changes (500ms window)
    - Add integration point for triggering data refresh on visibility
    - _Requirements: 4.1, 4.4, 4.5_
  
  - [ ] 6.2 Write property test for visibility debouncing
    - **Property 11: Visibility Change Debouncing**
    - **Validates: Requirements 4.5**

- [ ] 7. Enhance useRealtimeSubscription hook
  - [ ] 7.1 Update `src/hooks/useRealtimeSubscription.ts` with health integration
    - Add optional connectionHealth parameter for status tracking
    - Add optional dataFreshness parameter for timestamp updates
    - Implement autoReconnect option (default: true)
    - Implement refreshOnReconnect option to fetch missed data
    - Call markFresh() on successful real-time events
    - _Requirements: 1.1, 1.3, 2.1, 2.3, 3.1, 4.2, 4.3_

- [ ] 8. Implement ConnectionStatusIndicator component
  - [ ] 8.1 Create `src/components/ConnectionStatusIndicator.tsx`
    - Implement colored dot with semantic colors (emerald/amber/red)
    - Add Tooltip with detailed status info using shadcn/ui Tooltip
    - Add Reconnect button (ghost variant) when disconnected
    - Show attempt count and next retry time when reconnecting
    - Use Lucide icons (Wifi, WifiOff, RefreshCw) at h-4 w-4
    - Support light/dark mode via CSS variables
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 9.1-9.7_
  
  - [ ] 8.2 Write unit tests for ConnectionStatusIndicator
    - Test color mapping for each status
    - Test button visibility conditions
    - Test tooltip content
    - **Property 15: Connection Status Indicator Color Mapping**
    - **Validates: Requirements 6.1**

- [ ] 9. Implement DataRefreshIndicator component
  - [ ] 9.1 Create `src/components/DataRefreshIndicator.tsx`
    - Display relative time since last update (text-sm font-medium)
    - Apply amber colors when data is stale
    - Add refresh button (ghost variant) with RefreshCw icon
    - Show animate-spin on button when refreshing
    - Add brief highlight animation on refresh complete
    - Support light/dark mode via CSS variables
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 9.1-9.7_
  
  - [ ] 9.2 Write unit tests for DataRefreshIndicator
    - Test relative time display
    - Test stale styling application
    - Test refresh button functionality
    - **Property 17: Stale Data Visual Indication**
    - **Validates: Requirements 7.2**

- [ ] 10. Checkpoint - Verify components
  - Ensure all component tests pass, ask the user if questions arise.

- [ ] 11. Implement notification integration
  - [ ] 11.1 Create notification helper functions in `src/lib/connectionNotifications.ts`
    - Implement showConnectionLostNotification using useSweetAlert warning
    - Implement showReconnectedNotification using useSweetAlert success
    - Implement showMaxRetriesAlert for persistent warning with reconnect button
    - Implement showRefreshErrorNotification with retry option
    - Add brief disconnection suppression (< 5 seconds)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_
  
  - [ ] 11.2 Write property test for notification suppression
    - **Property 18: Notification on Connection Loss**
    - **Validates: Requirements 8.1, 8.5**

- [ ] 12. Integrate into dashboard
  - [ ] 12.1 Update `src/pages/dashboard.tsx` with connection monitoring
    - Add useConnectionHealth hook at dashboard level
    - Add useDataFreshness hooks for each data type (attendees, users, roles, settings, logs)
    - Add usePollingFallback with connection state dependency
    - Update existing useRealtimeSubscription calls with new options
    - Add ConnectionStatusIndicator to dashboard header
    - Add DataRefreshIndicator near each data table
    - Wire up notification callbacks
    - _Requirements: All_
  
  - [ ] 12.2 Update visibility recovery in dashboard
    - Enhance usePageVisibility usage with recovery callbacks
    - Trigger reconnection on visibility if disconnected
    - Trigger data refresh for active tab on visibility
    - Implement debounced refresh to prevent excessive requests
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 13. Final checkpoint - Full integration testing
  - Ensure all tests pass, ask the user if questions arise.
  - Manually verify connection status indicator in dashboard header
  - Manually verify data refresh indicators near tables
  - Test reconnection flow by simulating network issues

## Notes

- All tasks including tests are required for comprehensive implementation
- Each task references specific requirements for traceability
- Property tests use Vitest with fast-check library (minimum 100 iterations)
- All test files go in `src/__tests__/` following project conventions
- UI components follow `.kiro/steering/visual-design.md` guidelines

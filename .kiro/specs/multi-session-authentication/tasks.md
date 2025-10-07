# Implementation Plan

- [x] 1. Create token refresh infrastructure
  - Create TokenRefreshManager utility class that monitors JWT expiration and automatically refreshes tokens before they expire
  - Implement timer-based refresh scheduling with configurable timing (default: 5 minutes before expiration)
  - Add retry logic with exponential backoff for failed refresh attempts (3 retries with increasing delays)
  - Implement callback system for refresh success/failure notifications
  - Add methods to start, stop, and manually trigger token refresh
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Create cross-tab coordination system
  - Create TabCoordinator utility class using BroadcastChannel API for inter-tab communication
  - Implement leader election mechanism to ensure only one tab refreshes tokens at a time
  - Add message handlers for refresh requests, denials, and completion notifications
  - Implement cleanup logic for proper resource disposal
  - Add fallback to localStorage events for browsers without BroadcastChannel support
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 7.6_

- [x] 3. Create API error handling utilities
  - Create centralized error handler utility for consistent API error responses
  - Implement token expiration detection logic that identifies JWT-related errors
  - Add error response formatter with standardized structure (code, type, message, tokenExpired flag)
  - Create helper function to check if error is token-related
  - Add logging configuration options for error handler
  - _Requirements: 4.1, 4.2, 4.3, 4.5, 5.2, 5.3, 5.5, 8.6_

- [x] 4. Create API authentication middleware
  - Create withAuth middleware wrapper for API routes
  - Implement authentication verification using createSessionClient
  - Add user profile fetching with role information
  - Attach authenticated user and profile to request object
  - Integrate error handler for consistent error responses
  - Add TypeScript types for authenticated requests
  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 5. Update AuthContext with token refresh
  - Integrate TokenRefreshManager instance into AuthContext
  - Integrate TabCoordinator instance into AuthContext
  - Update signIn method to create JWT and start token refresh timer
  - Update signOut method to stop token refresh timer and cleanup
  - Add token refresh callback handlers for success/failure notifications
  - Add cleanup logic in useEffect to stop timers on unmount
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 3.1, 3.2, 3.3, 7.1, 7.2, 7.3, 7.5_

- [x] 6. Implement session restoration on page load
  - Update AuthContext initialization to validate existing session
  - Add logic to create fresh JWT if session is valid but token is expired
  - Start token refresh timer after successful session restoration
  - Handle session restoration failures with proper cleanup
  - Add error handling for expired sessions with redirect to login
  - Preserve current URL for post-login redirect
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.4_

- [x] 7. Add session expiration notifications
  - Implement toast notifications for token refresh failures
  - Add user-friendly messages for session expiration
  - Implement single notification logic to prevent spam from multiple failed API calls
  - Add notification for successful session restoration after page refresh
  - Include return URL in login redirect after session expiration
  - _Requirements: 4.1, 4.2, 4.5_

- [x] 8. Update critical API routes with middleware
  - Update /api/profile/index.ts to use withAuth middleware
  - Update /api/users/index.ts to use withAuth middleware
  - Update /api/roles/index.ts to use withAuth middleware
  - Update /api/attendees/index.ts to use withAuth middleware
  - Update /api/event-settings/index.ts to use withAuth middleware
  - Update /api/logs/index.ts to use withAuth middleware
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Update remaining API routes with middleware
  - Update all /api/attendees/* routes to use withAuth middleware
  - Update all /api/custom-fields/* routes to use withAuth middleware
  - Update all /api/invitations/* routes to use withAuth middleware
  - Update all /api/log-settings/* routes to use withAuth middleware
  - Ensure consistent error handling across all routes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 10. Add token refresh monitoring and logging
  - Add console logging for token refresh attempts with timestamps
  - Log token refresh successes with user ID and session context
  - Log token refresh failures with error details and retry attempts
  - Add warning logs for multiple consecutive failures
  - Implement client-side logging for session restoration attempts
  - Add server-side logging for authentication failures with context
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 11. Add OAuth callback token refresh
  - Update /pages/auth/callback.tsx to create JWT after OAuth login
  - Start token refresh timer after successful OAuth authentication
  - Handle OAuth errors with proper cleanup
  - Add logging for OAuth authentication events
  - _Requirements: 1.1, 1.2, 1.6_

- [x] 12. Add magic link callback token refresh
  - Update magic link handling to create JWT after authentication
  - Start token refresh timer after successful magic link login
  - Handle magic link errors with proper cleanup
  - Add logging for magic link authentication events
  - _Requirements: 1.1, 1.2, 1.6_

- [x] 13. Create integration tests for token refresh
  - Write integration test for automatic token refresh before expiration
  - Write integration test for token refresh retry logic with failures
  - Write integration test for session restoration on page load
  - Write integration test for multi-tab token refresh coordination
  - Write integration test for logout cleanup
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.6, 7.1, 7.2_

- [x] 14. Create integration tests for API middleware
  - Write integration test for API calls with valid tokens
  - Write integration test for API calls with expired tokens
  - Write integration test for automatic retry after token refresh
  - Write integration test for error response format consistency
  - Write integration test for user profile fetching in middleware
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 15. Create unit tests for utilities
  - Write unit tests for TokenRefreshManager timer scheduling
  - Write unit tests for TokenRefreshManager retry logic
  - Write unit tests for TokenRefreshManager callback notifications
  - Write unit tests for TabCoordinator message handling
  - Write unit tests for TabCoordinator leader election
  - Write unit tests for error handler token detection
  - Write unit tests for error handler response formatting
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 5.2, 5.3_

- [x] 16. Update documentation
  - Document token refresh configuration options
  - Document API middleware usage for developers
  - Document error handling patterns
  - Add troubleshooting guide for common session issues
  - Document multi-session behavior and limitations
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

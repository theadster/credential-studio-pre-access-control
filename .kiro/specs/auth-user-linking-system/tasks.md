# Implementation Plan

## Overview

This implementation plan breaks down the auth user linking system into discrete, manageable tasks. Each task builds incrementally on previous work, following test-driven development principles where appropriate.

## Task List

- [x] 1. Create auth user search API endpoint
  - Create `POST /api/users/search` endpoint to query Appwrite auth users
  - Implement pagination (25 users per page)
  - Add search filtering by email and name
  - Check which users are already linked to the application
  - Return user data with verification status and link status
  - Add permission check for `users.read`
  - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 9.2_

- [x] 2. Create email verification API endpoint
  - Create `POST /api/users/verify-email` endpoint
  - Implement Appwrite `users.createVerification()` call
  - Add rate limiting (3 per user/hour, 20 per admin/hour)
  - Validate user exists and email is not already verified
  - Add permission check for `users.create`
  - Log verification email sends
  - Return success/error response
  - _Requirements: 8.5, 8.6, 8.7, 8.8, 8.9, 8.11_

- [x] 3. Update user creation API to link existing auth users
  - Modify `POST /api/users` to accept `authUserId` instead of email/password
  - Remove auth user creation logic (`users.create()`)
  - Remove temporary password generation
  - Remove invitation email sending
  - Validate `authUserId` exists in Appwrite auth
  - Check if user is already linked (return 409 if true)
  - Create user profile with auth user ID
  - Log the linking action
  - _Requirements: 1.3, 1.4, 1.5, 1.6, 1.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 4. Add optional team membership to user linking
  - Add `addToTeam` and `teamRole` parameters to POST /api/users
  - Implement team membership creation using Appwrite Teams API
  - Map application roles to team roles
  - Handle team membership failures gracefully (non-blocking)
  - Return team membership status in response
  - Add environment variable for team ID configuration
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 5. Create AuthUserSearch component
  - Create new React component for searching auth users
  - Implement search input with debouncing (300ms)
  - Call `/api/users/search` endpoint
  - Display loading state during search
  - Handle and display errors
  - Show "No results" message when appropriate
  - _Requirements: 2.1, 2.2, 2.7, 3.2, 3.3_

- [x] 6. Create AuthUserList component
  - Create new React component for displaying auth user list
  - Display user email, name, and creation date
  - Show email verification status badge (Verified/Unverified)
  - Show "Already Linked" badge for linked users
  - Add "Send Verification Email" button for unverified users
  - Implement verification email sending with loading state
  - Disable selection for already-linked users
  - Highlight selected user
  - Handle click to select user
  - _Requirements: 2.3, 2.4, 2.5, 3.4, 8.1, 8.2, 8.3, 8.4, 8.10_

- [x] 7. Update UserForm component for linking mode
  - Add `mode` prop to distinguish between 'link' and 'edit' modes
  - Replace email/password/name inputs with AuthUserSearch component
  - Add selected user display card
  - Update form submission to use new data structure (`authUserId`, `roleId`)
  - Add optional team membership checkbox
  - Update validation logic for new fields
  - Keep role selector and submit/cancel buttons
  - Update dialog title to "Link Existing User"
  - Update dialog description
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9_

- [x] 8. Update dashboard user management integration
  - Update "Add User" button handler to open form in 'link' mode
  - Update user save handler to call new API with `authUserId`
  - Handle new response structure with team membership status
  - Display success/error messages for linking
  - Display warning if team membership fails
  - Refresh user list after successful linking
  - _Requirements: 1.7, 5.6, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9. Update user deletion to preserve backward compatibility
  - Keep `deleteFromAuth` parameter in DELETE /api/users
  - Maintain support for deleting auth users (cleanup purposes)
  - Add optional team membership removal
  - Update logging to include deletion details
  - _Requirements: 4.7, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 10. Add error handling and validation
  - Implement standardized error responses with codes
  - Add user-friendly error messages for all scenarios
  - Validate all inputs on frontend and backend
  - Handle network failures gracefully
  - Add retry logic for transient failures
  - Display appropriate error messages in UI
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [x] 11. Add rate limiting for verification emails
  - Implement rate limit tracking (in-memory or database)
  - Enforce 3 emails per user per hour limit
  - Enforce 20 emails per admin per hour limit
  - Return 429 error when limits exceeded
  - Display rate limit errors in UI
  - _Requirements: 8.8, 8.9_

- [x] 12. Update permissions and access control ✅
  - Verify all endpoints check appropriate permissions
  - Hide UI elements based on user permissions
  - Test permission checks for all operations
  - Ensure audit logging captures administrator actions
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_
  - _Summary: `.kiro/specs/auth-user-linking-system/TASK_12_PERMISSIONS_SUMMARY.md`_

- [x] 13. Add comprehensive logging
  - Log all user linking actions
  - Log all verification email sends
  - Log all team membership operations
  - Include administrator ID, timestamp, and affected user
  - Ensure logs are stored securely
  - _Requirements: 1.6, 8.11, 9.7_

- [x] 14. Test backward compatibility
  - Verify existing user profiles load correctly
  - Verify existing users can log in
  - Verify editing existing user profiles works
  - Verify `isInvited` field is displayed correctly
  - Test deletion of old user profiles
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 15. Add integration tests
  - Test complete user linking flow
  - Test search functionality with various queries
  - Test email verification sending
  - Test team membership creation (if enabled)
  - Test error scenarios (already linked, invalid user, etc.)
  - Test permission checks
  - Test rate limiting

- [x] 16. Add documentation and cleanup
  - Update API documentation
  - Add inline code comments
  - Create user guide for administrators
  - Remove old auth user creation code
  - Remove unused imports and dependencies
  - Update environment variable documentation

## Implementation Notes

### Task Dependencies

- Tasks 1-4: Backend API endpoints (can be done in parallel)
- Tasks 5-7: Frontend components (depend on tasks 1-2)
- Task 8: Dashboard integration (depends on tasks 5-7)
- Tasks 9-14: Enhancements and testing (depend on tasks 1-8)
- Tasks 15-16: Final testing and cleanup (depend on all previous tasks)

### Testing Strategy

- Each backend endpoint should be tested with valid/invalid inputs
- Each frontend component should be tested in isolation
- Integration tests should cover the complete user flow
- Manual testing should verify UI/UX and error handling

### Environment Variables

Add these to `.env.local`:
```
# Team membership (optional)
NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID=<team-id>
APPWRITE_TEAM_MEMBERSHIP_ENABLED=true

# Rate limiting
VERIFICATION_EMAIL_USER_LIMIT=3
VERIFICATION_EMAIL_ADMIN_LIMIT=20
VERIFICATION_EMAIL_WINDOW_HOURS=1
```

### Rollout Strategy

1. Deploy backend changes first (tasks 1-4)
2. Test backend endpoints in isolation
3. Deploy frontend changes (tasks 5-8)
4. Enable for admin users only initially
5. Monitor error rates and user feedback
6. Gradually roll out to all users
7. Remove old code after successful rollout (task 16)

### Success Metrics

- User linking success rate > 95%
- Search response time < 1 second
- Linking completion time < 3 seconds
- Zero auth users created from application
- All existing user profiles continue to work
- Error messages are clear and actionable

## Risk Mitigation

### High-Risk Areas

1. **Team Membership API**: May not work as expected
   - Mitigation: Make it optional and non-blocking
   - Test thoroughly in development environment

2. **Backward Compatibility**: Existing users may break
   - Mitigation: Extensive testing with existing data
   - Keep old code paths functional during transition

3. **Rate Limiting**: May be too restrictive or too lenient
   - Mitigation: Make limits configurable via environment variables
   - Monitor usage patterns and adjust as needed

4. **Search Performance**: May be slow with many users
   - Mitigation: Implement pagination and caching
   - Add database indexes for fast lookups

### Rollback Plan

If issues arise:
1. Disable new UI with feature flag
2. Revert to old user creation flow
3. Fix issues in development
4. Re-deploy with fixes
5. Re-enable new UI

## Timeline Estimate

- Backend API endpoints (Tasks 1-4): 2-3 days
- Frontend components (Tasks 5-7): 2-3 days
- Integration and testing (Tasks 8-15): 2-3 days
- Documentation and cleanup (Task 16): 1 day

**Total Estimate**: 7-10 days

## Post-Implementation

After successful implementation:
1. Monitor error logs for issues
2. Collect user feedback
3. Optimize performance based on usage patterns
4. Consider additional features (bulk linking, etc.)
5. Update documentation based on learnings

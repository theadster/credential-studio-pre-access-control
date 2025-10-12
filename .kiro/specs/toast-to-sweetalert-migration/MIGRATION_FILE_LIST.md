# Toast to SweetAlert Migration - File List

This document lists all files that need to be migrated from `useToast` to `useSweetAlert`.

## Summary

**Total Files to Migrate:** 19 files

## Priority 1: Core Components (High Impact)

These are the main user-facing components that should be migrated first:

1. **src/pages/dashboard.tsx**
   - Main dashboard with attendee management
   - Multiple toast notifications for CRUD operations
   - High user visibility

2. **src/components/AttendeeForm.tsx**
   - Attendee creation/editing form
   - Photo upload notifications
   - Validation error notifications

3. **src/components/EventSettingsForm.tsx**
   - Event settings configuration
   - Save success/error notifications
   - Validation notifications

## Priority 2: Dialog Components (Medium Impact)

User interaction dialogs with notifications:

4. **src/components/LogSettingsDialog.tsx**
   - Log settings configuration
   - Save notifications

5. **src/components/LinkUserDialog.tsx**
   - User linking functionality
   - Success/error notifications

6. **src/components/ExportDialog.tsx**
   - Data export functionality
   - Export status notifications

7. **src/components/ImportDialog.tsx**
   - Data import functionality
   - Import status notifications

8. **src/components/LogsExportDialog.tsx**
   - Logs export functionality
   - Export status notifications

9. **src/components/LogsDeleteDialog.tsx**
   - Logs deletion functionality
   - Delete confirmation and status notifications

## Priority 3: Authentication Pages (Medium Impact)

User authentication flows:

10. **src/pages/login.tsx**
    - Login page
    - Authentication error notifications

11. **src/pages/signup.tsx**
    - Signup page
    - Registration notifications

12. **src/pages/forgot-password.tsx**
    - Password recovery
    - Email sent notifications

13. **src/pages/reset-password.tsx**
    - Password reset
    - Success/error notifications

14. **src/pages/auth/callback.tsx**
    - OAuth callback handler
    - Authentication status notifications

## Priority 4: Utility Hooks (Low Impact - Infrastructure)

These are hooks used by other components:

15. **src/hooks/useApiError.ts**
    - API error handling hook
    - Used by multiple components

16. **src/hooks/useTokenRefresh.ts**
    - Token refresh handling
    - Session management notifications

17. **src/contexts/AuthContext.tsx**
    - Authentication context
    - Global auth notifications

## Priority 5: Debug/Development Pages (Low Priority)

Development and debugging tools:

18. **src/pages/debug/fix-json.tsx**
    - JSON fixing utility
    - Debug notifications

## Files to Remove After Migration

19. **src/components/ui/toaster.tsx**
    - Old toaster component (imports useToast)
    - Will be removed in cleanup phase

## Migration Order Recommendation

Based on user impact and dependencies:

### Phase 1: Core User-Facing Components
1. dashboard.tsx
2. AttendeeForm.tsx
3. EventSettingsForm.tsx

### Phase 2: Dialog Components
4. LogSettingsDialog.tsx
5. LinkUserDialog.tsx
6. ExportDialog.tsx
7. ImportDialog.tsx
8. LogsExportDialog.tsx
9. LogsDeleteDialog.tsx

### Phase 3: Authentication Flow
10. login.tsx
11. signup.tsx
12. forgot-password.tsx
13. reset-password.tsx
14. auth/callback.tsx

### Phase 4: Infrastructure
15. useApiError.ts
16. useTokenRefresh.ts
17. AuthContext.tsx

### Phase 5: Development Tools
18. debug/fix-json.tsx

### Phase 6: Cleanup
19. Remove toaster.tsx and old toast files

## Notes

- Each file uses the pattern: `const { toast } = useToast();`
- Toast calls typically use: `toast({ title, description, variant })`
- Some files may have action buttons that need special handling
- Test each component after migration to ensure functionality is preserved
- The `useApiError` and `useTokenRefresh` hooks are used by multiple components, so their migration will have cascading effects

## Testing Checklist

After migrating each file, verify:
- [ ] Success notifications display correctly
- [ ] Error notifications display correctly
- [ ] Warning notifications display correctly (if applicable)
- [ ] Info notifications display correctly (if applicable)
- [ ] Notifications auto-dismiss at appropriate times
- [ ] Action buttons work (if applicable)
- [ ] Dark mode theme works correctly
- [ ] No console errors
- [ ] Component functionality unchanged

# Password Reset in Edit User Dialog - Enhancement

## Overview
Added password reset functionality directly in the Edit User dialog, making it even easier for administrators to help users reset their passwords without leaving the edit interface.

## What Was Added

### Password Reset Alert Card
A prominent alert card appears in the Edit User dialog for existing users, featuring:
- **Amber/Yellow theme** - Stands out without being alarming
- **Key icon** - Clear visual indicator
- **Descriptive text** - Explains what the action does
- **Send Reset Email button** - One-click password reset

## UI Design

### Visual Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Edit User Dialog                                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Email Address *                                             │
│ [user@example.com]                    (disabled)            │
│                                                             │
│ Full Name *                                                 │
│ [John Doe]                                                  │
│                                                             │
│ Role *                                                      │
│ [Administrator ▼]                                           │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔑 Password Reset                                       │ │
│ │                                                         │ │
│ │ Send a password reset email to help this user change   │ │
│ │ their password.                                         │ │
│ │                                    [Send Reset Email]   │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│                                    [Cancel] [Update User]   │
└─────────────────────────────────────────────────────────────┘
```

### Color Scheme

#### Light Mode
- **Background**: Amber-50 (`bg-amber-50`)
- **Border**: Amber-200 (`border-amber-200`)
- **Icon**: Amber-600 (`text-amber-600`)
- **Title**: Amber-900 (`text-amber-900`)
- **Description**: Amber-700 (`text-amber-700`)
- **Button Border**: Amber-300 (`border-amber-300`)
- **Button Hover**: Amber-100 (`hover:bg-amber-100`)

#### Dark Mode
- **Background**: Amber-950/20 (`dark:bg-amber-950/20`)
- **Border**: Amber-800 (`dark:border-amber-800`)
- **Icon**: Amber-400 (`dark:text-amber-400`)
- **Title**: Amber-100 (`dark:text-amber-100`)
- **Description**: Amber-300 (`dark:text-amber-300`)
- **Button Border**: Amber-700 (`dark:border-amber-700`)
- **Button Hover**: Amber-900/30 (`dark:hover:bg-amber-900/30`)

## Features

### Smart Display Logic
- **New Users**: Alert card is hidden (no password to reset yet)
- **Existing Users**: Alert card is shown
- **Invited Users**: Alert card is shown (they have auth accounts)

### Button States
1. **Normal**: "Send Reset Email" with key icon
2. **Loading**: "Sending..." with spinner
3. **Disabled**: Grayed out when form is submitting or reset is in progress

### User Flow
1. Admin opens Edit User dialog
2. Sees password reset option prominently displayed
3. Clicks "Send Reset Email" button
4. Button shows loading state
5. Success notification appears
6. User receives password reset email
7. Dialog remains open for other edits

## Technical Implementation

### API Integration
- Uses existing `/api/users/send-password-reset` endpoint
- Fetches user's auth ID from database
- Handles errors gracefully
- Shows success/error notifications

### State Management
- `sendingPasswordReset` state tracks loading
- Disables button during operation
- Prevents double-clicks
- Maintains form state

### Error Handling
- Validates user has auth ID
- Catches API errors
- Shows user-friendly error messages
- Logs errors for debugging

## Benefits

### For Administrators
✅ **Convenient**: Reset password without leaving edit dialog  
✅ **Contextual**: Available right where you're editing user info  
✅ **Clear**: Obvious what the action does  
✅ **Safe**: Doesn't interfere with other form fields  

### For Users
✅ **Quick Help**: Admins can help faster  
✅ **Secure**: Uses same secure token-based flow  
✅ **Reliable**: Same rate limiting and logging  

## Comparison with Other Locations

### Edit User Dialog (NEW)
- **Context**: Editing user details
- **Visibility**: Always visible when editing
- **Convenience**: ⭐⭐⭐⭐⭐ (Best)
- **Use Case**: Quick password reset while managing user

### User Management List
- **Context**: Viewing auth users for linking
- **Visibility**: Only when linking users
- **Convenience**: ⭐⭐⭐⭐ (Good)
- **Use Case**: Helping unlinked users

### Both Locations Available
Administrators now have password reset available in both places:
1. **Edit User Dialog** - For linked users being managed
2. **Link User Interface** - For unlinked auth users

## Accessibility

### Keyboard Navigation
- Tab to focus button
- Enter/Space to activate
- Focus ring visible

### Screen Readers
- Alert role announces content
- Button state changes announced
- Loading state communicated

### Visual Indicators
- Clear icon (key)
- Distinct color (amber)
- Loading spinner
- Disabled state visible

## Testing

### Manual Testing Checklist
- [ ] Alert appears for existing users
- [ ] Alert hidden for new users
- [ ] Button sends password reset
- [ ] Loading state shows correctly
- [ ] Success notification appears
- [ ] Error handling works
- [ ] Button disables during operation
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Responsive on mobile

### Edge Cases
- [ ] User without auth ID
- [ ] Rate limit exceeded
- [ ] Network error
- [ ] Permission denied
- [ ] Dialog closed during send

## Files Modified

### Component
**`src/components/UserForm.tsx`**
- Added `KeyRound` icon import
- Added `Alert` and `AlertDescription` imports
- Added `sendingPasswordReset` state
- Added `handleSendPasswordReset` function
- Added password reset alert card in edit mode
- Added `handleSuccess` to useApiError hook

## Configuration

No additional configuration needed - uses existing:
- `NEXT_PUBLIC_PASSWORD_RESET_URL`
- `PASSWORD_RESET_USER_LIMIT`
- `PASSWORD_RESET_ADMIN_LIMIT`
- `PASSWORD_RESET_WINDOW_HOURS`

## Permissions

Same as other password reset locations:
- Requires `users.update` permission
- Super Administrators: ✅
- Administrators: ✅
- Staff: ❌ (typically)
- Viewer: ❌

## Rate Limiting

Same limits apply:
- 3 emails per user per hour
- 20 emails per admin per hour
- Clear error messages when exceeded

## Logging

All password resets logged with:
- Action: `password_reset_email_sent`
- Administrator details
- Target user details
- Timestamp

## Best Practices

### When to Use This Location
✅ **Editing user details** - Already in the dialog  
✅ **User reports password issue** - Quick fix  
✅ **Setting up new user** - After creation  
✅ **Routine user management** - Convenient access  

### When to Use Link User Location
✅ **User not yet linked** - Only place available  
✅ **Bulk user management** - Reviewing multiple users  
✅ **Initial user setup** - Before linking  

## Future Enhancements

### Potential Improvements
1. **Show Last Reset**: Display when password was last reset
2. **Reset History**: Show how many times reset in past hour
3. **Temporary Password**: Option to generate and display temporary password
4. **Email Preview**: Show what email will look like
5. **Custom Message**: Add optional message to reset email

## Related Documentation
- [Password Reset Admin Guide](../guides/PASSWORD_RESET_ADMIN_GUIDE.md)
- [Password Reset Feature Summary](./PASSWORD_RESET_FEATURE_SUMMARY.md)
- [Password Reset UI Reference](../guides/PASSWORD_RESET_UI_REFERENCE.md)

## Status
✅ **COMPLETE** - Ready for use

## Summary

The password reset feature is now available in two convenient locations:
1. **Edit User Dialog** - For managing existing users (NEW)
2. **Link User Interface** - For helping unlinked users

This enhancement makes it even easier for administrators to help users with password issues, providing a seamless experience without leaving the user management workflow.

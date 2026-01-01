---
title: "Password Reset Admin Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/auth/"]
---

# Password Reset Admin Guide

## Overview
Administrators can send password reset emails to users, allowing them to reset their passwords without needing to remember their current password. This is useful for helping users who have forgotten their passwords or need to change them for security reasons.

## Accessing Password Reset

### From User Management

1. Navigate to **User Management** in the dashboard
2. Click the **"Link User"** button
3. Search for the user you want to help
4. Click the **"Reset Password"** button next to their name

## How It Works

### Step 1: Admin Sends Reset Email
- Admin clicks "Reset Password" button
- System generates a secure, time-limited token
- Appwrite sends password reset email to user
- Admin sees confirmation message

### Step 2: User Receives Email
- User receives email with reset link
- Link is valid for 24 hours (Appwrite default)
- Link format: `https://yourdomain.com/reset-password?userId={id}&secret={token}`

### Step 3: User Resets Password
- User clicks link in email
- Opens password reset page
- Enters new password
- Submits form
- Password is updated

### Step 4: User Can Log In
- User can now log in with new password
- Old password no longer works

## UI Features

### Reset Password Button
- **Location**: Next to each user in the auth user list
- **Icon**: Key icon (🔑)
- **States**:
  - Normal: "Reset Password"
  - Loading: "Sending..." with spinner
  - Disabled: When sending verification or reset email

### Button Visibility
- ✅ **Shown for**: All non-linked users
- ❌ **Hidden for**: Already linked users (they can reset via normal flow)

### Button Placement
The Reset Password button appears alongside the Send Verification button:
- **Unverified users**: Both buttons visible
- **Verified users**: Only Reset Password button visible
- **Linked users**: No buttons (use normal password reset flow)

## Permissions Required

### Administrator Permissions
To send password reset emails, you need:
- **Permission**: `users.update`
- **Roles with access**:
  - Super Administrator ✅
  - Administrator ✅
  - Staff ❌ (typically)
  - Viewer ❌

## Rate Limiting

### Per-User Limits
- **Limit**: 3 password reset emails per hour
- **Purpose**: Prevent email spam to users
- **Reset**: After 1 hour

### Per-Admin Limits
- **Limit**: 20 password reset emails per hour
- **Purpose**: Prevent abuse by administrators
- **Reset**: After 1 hour

### Rate Limit Messages
- **User limit**: "Too many password reset emails sent for this user. Please try again in X minutes."
- **Admin limit**: "You have sent too many password reset emails. Please try again in X minutes."

## Success Messages

### Email Sent Successfully
```
Password Reset Email Sent
Password reset email sent to user@example.com. 
User must click the link in their email to reset their password.
```

### What This Means
- ✅ Email was sent successfully
- ⏳ User must check their email
- 🔗 User must click link to complete reset
- ⏱️ Link expires in 24 hours

## Error Messages

### Common Errors

#### User Not Found
```
Error: User not found
```
**Cause**: User ID doesn't exist in Appwrite Auth  
**Solution**: Verify user exists, refresh user list

#### Insufficient Permissions
```
Error: Insufficient permissions to send password reset emails
```
**Cause**: Your role doesn't have `users.update` permission  
**Solution**: Contact super administrator to update your role

#### Rate Limit Exceeded
```
Error: Too many password reset emails sent for this user. 
Please try again in 30 minutes.
```
**Cause**: User has received 3+ reset emails in past hour  
**Solution**: Wait for rate limit to reset, or ask user to check spam folder

#### Email Delivery Failed
```
Error: Failed to send password reset email. Please try again.
```
**Cause**: Appwrite email service issue, SMTP configuration problem  
**Solution**: Check Appwrite email settings, verify SMTP configuration

## Best Practices

### When to Use Password Reset

✅ **Good Use Cases:**
- User forgot their password
- User's account may be compromised
- User requests password change
- Setting up new user account
- Security policy requires password change

❌ **Avoid Using For:**
- Regular password changes (users should do this themselves)
- Testing (use test accounts)
- Bulk operations (not designed for this)

### Communication with Users

**Before Sending:**
- Verify user actually needs password reset
- Confirm you have correct email address
- Warn user to check spam folder

**After Sending:**
- Inform user email has been sent
- Tell them to check spam/junk folder
- Remind them link expires in 24 hours
- Provide support contact if issues

### Security Considerations

1. **Verify Identity**: Ensure you're helping the right person
2. **Use Secure Channels**: Confirm request via phone/video if possible
3. **Document Requests**: Log why password reset was needed
4. **Monitor Activity**: Watch for suspicious reset patterns
5. **Rate Limits**: Don't try to bypass rate limits

## Troubleshooting

### User Didn't Receive Email

**Check:**
1. ✅ Spam/junk folder
2. ✅ Email address is correct
3. ✅ Appwrite email service is configured
4. ✅ SMTP settings are correct
5. ✅ Rate limit not exceeded

**Solutions:**
- Wait a few minutes (email delivery can be delayed)
- Check Appwrite console for email logs
- Verify SMTP configuration
- Try sending again after rate limit resets

### Reset Link Doesn't Work

**Possible Causes:**
- Link expired (24 hours)
- Link already used
- Token invalid/corrupted
- Wrong reset URL configured

**Solutions:**
- Send new password reset email
- Verify `NEXT_PUBLIC_PASSWORD_RESET_URL` is correct
- Check Appwrite console for user status

### Button Disabled/Not Clickable

**Possible Causes:**
- Already sending verification email
- Already sending password reset
- User is already linked

**Solutions:**
- Wait for current operation to complete
- Refresh page if stuck
- Check if user is already linked

## Logging and Audit Trail

### What Gets Logged

Every password reset email send is logged with:
- **Action**: `password_reset_email_sent`
- **Administrator**: Who sent the email
- **Target User**: Who received the email
- **Timestamp**: When it was sent
- **Details**: Full context of the action

### Viewing Logs

1. Go to Dashboard
2. Click "Activity Logs" tab
3. Filter by action: "password_reset_email_sent"
4. View details for each reset

### Log Details Include
```json
{
  "type": "password_reset",
  "operation": "send",
  "targetUserId": "user-123",
  "targetUserEmail": "user@example.com",
  "targetUserName": "John Doe",
  "administratorId": "admin-456",
  "administratorEmail": "admin@example.com",
  "administratorName": "Admin User",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Configuration

### Environment Variables

```bash
# Password Reset Configuration
NEXT_PUBLIC_PASSWORD_RESET_URL=https://yourdomain.com/reset-password

# Rate Limiting (optional)
PASSWORD_RESET_USER_LIMIT=3
PASSWORD_RESET_ADMIN_LIMIT=20
PASSWORD_RESET_WINDOW_HOURS=1
```

### Appwrite Configuration

1. **Email Service**: Must be enabled in Appwrite
2. **SMTP Settings**: Must be configured
3. **Email Templates**: Can be customized in Appwrite

## FAQ

### Q: Can I reset passwords for linked users?
**A:** No, the button is hidden for linked users. They should use the normal password reset flow on the login page.

### Q: How long is the reset link valid?
**A:** 24 hours (Appwrite default). After that, user needs a new link.

### Q: Can I customize the reset email?
**A:** Yes, through Appwrite email templates in the Appwrite console.

### Q: What if user doesn't receive email?
**A:** Check spam folder, verify email address, check Appwrite email logs, wait a few minutes for delivery.

### Q: Can I send multiple resets to same user?
**A:** Yes, but limited to 3 per hour per user to prevent spam.

### Q: Does this work for unverified users?
**A:** Yes, password reset works regardless of email verification status.

### Q: Can users reset their own passwords?
**A:** Yes, users can use the "Forgot Password" link on the login page. This admin feature is for helping users who can't access that flow.

## Related Documentation

- [Email Verification Testing Guide](./EMAIL_VERIFICATION_TESTING_GUIDE.md)
- [Auth User Linking Admin Guide](./AUTH_USER_LINKING_ADMIN_GUIDE.md)
- [Auth User Linking API Guide](./AUTH_USER_LINKING_API_GUIDE.md)

## Support

If you encounter issues:
1. Check Appwrite email configuration
2. Review error messages carefully
3. Check activity logs for details
4. Verify your permissions
5. Contact system administrator if needed

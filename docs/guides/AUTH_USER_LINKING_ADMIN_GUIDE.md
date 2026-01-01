---
title: "Auth User Linking - Administrator Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/users/"]
---

# Auth User Linking - Administrator Guide

## Overview

This guide explains how to use the Auth User Linking system to grant existing Appwrite users access to your CredentialStudio application. This new workflow replaces the old system where the application created new authentication accounts.

## What Changed?

### Old System (Deprecated)
- Application created new Appwrite auth accounts
- Generated temporary passwords
- Sent invitation emails
- Users had to reset passwords on first login

### New System (Current)
- Users already exist in Appwrite authentication
- Administrators link existing auth users to the application
- Assign roles and permissions
- Optionally manage team memberships
- No password management needed

## Prerequisites

Before you can link users, ensure you have:

1. **Required Permission:** `users.create` permission in your role
2. **Existing Auth Users:** Users must already have Appwrite accounts
3. **Roles Configured:** Application roles must be set up with appropriate permissions

## How to Link a User

### Step 1: Open User Management

1. Log in to CredentialStudio as an administrator
2. Navigate to the Dashboard
3. Click on the **Users** tab or section

### Step 2: Start Linking Process

1. Click the **"Add User"** or **"Link User"** button
2. A dialog titled **"Link Existing User"** will open

### Step 3: Search for the User

1. In the search box, type the user's email address or name
2. The system will display matching Appwrite auth users
3. You'll see:
   - User's email address
   - User's full name
   - Account creation date
   - Email verification status (Verified/Unverified badge)
   - Link status (Already Linked badge if applicable)

**Search Tips:**
- Search is case-insensitive
- Partial matches work (e.g., "john" finds "john@example.com")
- Results are paginated (25 users per page)
- Already-linked users are disabled and cannot be selected again

### Step 4: Verify Email (If Needed)

If the user's email is not verified:

1. You'll see an **"Unverified"** badge next to their name
2. Click the **"Send Verification Email"** button
3. The user will receive an email with a verification link
4. Wait for the user to verify their email before linking (recommended)

**Note:** You can link unverified users, but it's recommended to ensure email verification first for security.

**Rate Limits:**
- Maximum 3 verification emails per user per hour
- Maximum 20 verification emails per admin per hour

### Step 5: Select the User

1. Click on the user you want to link
2. The user will be highlighted
3. Their details will be displayed in a card

### Step 6: Assign a Role

1. From the **"Role"** dropdown, select the appropriate role:
   - **Super Administrator** - Full system access
   - **Event Manager** - Manage events and attendees
   - **Registration Staff** - Register attendees and manage credentials
   - **Viewer** - Read-only access

2. Review the role's permissions to ensure it matches the user's needs

### Step 7: Team Membership (Optional)

If team membership is enabled in your organization:

1. Check the **"Add to project team"** checkbox
2. The user will be added to the project team with a role matching their application role
3. This grants them access to project resources in Appwrite

**Note:** Team membership is optional. If it fails, the user will still be linked to the application.

### Step 8: Confirm and Link

1. Review all selections:
   - Correct user selected
   - Appropriate role assigned
   - Team membership option (if applicable)

2. Click the **"Link User"** or **"Save"** button

3. Wait for confirmation:
   - **Success:** "User linked successfully"
   - **Warning:** "User linked successfully but team membership failed" (user still has access)
   - **Error:** See troubleshooting section below

### Step 9: Verify

1. The user list will refresh automatically
2. The newly linked user should appear in the list
3. Verify their role is correct
4. The user can now log in and access the application

## Managing Linked Users

### View Linked Users

1. Navigate to the Users section in the Dashboard
2. All linked users are displayed with:
   - Email address
   - Full name
   - Assigned role
   - Link date
   - Status badges (Invited User for legacy users)

### Update User Role

1. Find the user in the list
2. Click the **"Edit"** button or icon
3. Select a new role from the dropdown
4. Click **"Save"**
5. The user's permissions will update immediately

**Note:** You cannot change which auth user is linked. To link a different auth user, you must unlink the current user first.

### Unlink a User

To remove a user's access to the application:

1. Find the user in the list
2. Click the **"Delete"** or **"Unlink"** button
3. A confirmation dialog will appear
4. Choose options:
   - **Remove from team:** Removes team membership (recommended)
   - **Delete from auth:** Also deletes the Appwrite auth account (use with caution)
5. Click **"Confirm"**

**Warning:** Deleting from auth is permanent and should only be used for cleanup purposes. The user will lose access to all Appwrite services.

## Understanding User Status

### Email Verification Status

- **Verified (Green Badge):** User has verified their email address
- **Unverified (Yellow Badge):** User has not verified their email address

### Link Status

- **Already Linked:** User is already linked to the application (cannot link again)
- **Not Linked:** User can be linked to the application

### Legacy Users

- **Invited User Badge:** User was created using the old invitation system
- These users continue to work normally
- No migration needed

## Best Practices

### 1. Verify Email First

Always ensure users have verified their email before linking them to the application. This confirms:
- The email address is valid
- The user has access to the email account
- Reduces security risks

### 2. Assign Appropriate Roles

Choose roles carefully based on the user's responsibilities:
- **Super Administrator:** Only for trusted administrators
- **Event Manager:** For event coordinators and managers
- **Registration Staff:** For front-line registration personnel
- **Viewer:** For stakeholders who need read-only access

### 3. Review Permissions

Before assigning a role, review what permissions it grants:
1. Click on the role in the dropdown
2. Review the permissions list
3. Ensure it matches the user's needs
4. Don't over-privilege users

### 4. Use Team Membership

If your organization uses Appwrite teams:
- Enable team membership for all users
- This provides consistent access control
- Makes it easier to manage project-level permissions

### 5. Regular Audits

Periodically review linked users:
- Remove users who no longer need access
- Update roles as responsibilities change
- Check for inactive accounts
- Review audit logs for suspicious activity

### 6. Document Role Assignments

Keep a record of why users were assigned specific roles:
- Helps with compliance and audits
- Makes it easier to review access later
- Provides context for future administrators

## Troubleshooting

### Problem: User Not Found in Search

**Possible Causes:**
- User doesn't have an Appwrite account yet
- Typo in search term
- User account was deleted

**Solutions:**
1. Verify the user's email address
2. Check if the user has created an Appwrite account
3. Try searching with different terms (name instead of email)
4. Ask the user to create an Appwrite account first

### Problem: "User Already Linked" Error

**Cause:** The auth user is already linked to the application

**Solutions:**
1. Search for the user in the linked users list
2. If you need to change their role, use the Edit function
3. If you need to link a different auth user, unlink the current one first
4. Check if someone else already linked this user

### Problem: "Permission Denied" Error

**Cause:** Your account doesn't have the required permission

**Solutions:**
1. Verify you have `users.create` permission
2. Contact a Super Administrator to grant you the permission
3. Check that your role includes user management permissions

### Problem: Verification Email Not Received

**Possible Causes:**
- Email in spam folder
- Rate limit exceeded
- Email service issue
- Incorrect email address

**Solutions:**
1. Ask user to check spam/junk folder
2. Wait 1 hour if rate limit was exceeded
3. Verify the email address is correct
4. Try sending again after waiting
5. Contact system administrator if issue persists

### Problem: Team Membership Failed

**Cause:** Team membership creation failed but user was still linked

**Impact:** User has application access but may not have team-level permissions

**Solutions:**
1. User can still access the application normally
2. Manually add user to team in Appwrite console
3. Contact system administrator to check team configuration
4. Verify `APPWRITE_TEAM_MEMBERSHIP_ENABLED` is configured correctly

### Problem: Search Results Are Slow

**Possible Causes:**
- Large number of auth users
- Network latency
- Server load

**Solutions:**
1. Use more specific search terms
2. Search by exact email address
3. Be patient - results may take a few seconds
4. Contact administrator if consistently slow

### Problem: Cannot Select a User

**Cause:** User is already linked (disabled in list)

**Solution:**
1. Look for "Already Linked" badge
2. Find the user in the linked users list instead
3. Use Edit function to update their role if needed

## Security Considerations

### Access Control

- Only users with `users.create` permission can link users
- All actions are logged for audit purposes
- Permissions are checked on both frontend and backend

### Email Verification

- Unverified users can be linked but it's not recommended
- Always verify email addresses before granting access
- Use verification email feature to ensure email ownership

### Rate Limiting

- Verification emails are rate-limited to prevent abuse
- 3 emails per user per hour maximum
- 20 emails per admin per hour maximum

### Audit Trail

All user management actions are logged:
- Who linked the user
- When the user was linked
- What role was assigned
- Any changes to roles or permissions

### Password Security

- Application never handles passwords
- Passwords are managed by Appwrite authentication
- Users reset passwords through Appwrite, not the application

## Frequently Asked Questions

### Q: Can I still create new auth users from the application?

**A:** No, the application no longer creates new Appwrite auth users. Users must create their own accounts through Appwrite's authentication system first.

### Q: What happens to existing users created with the old system?

**A:** They continue to work normally. No migration is needed. You'll see an "Invited User" badge for these legacy users.

### Q: Can I link the same auth user multiple times?

**A:** No, each auth user can only be linked once. If you try to link an already-linked user, you'll get an error.

### Q: What if I link a user with the wrong role?

**A:** You can easily update the role using the Edit function. Find the user in the list and change their role.

### Q: Do users need to do anything after being linked?

**A:** No, once linked, users can immediately log in and access the application with their assigned permissions.

### Q: Can I bulk link multiple users at once?

**A:** Not currently. Each user must be linked individually. This may be added in a future update.

### Q: What's the difference between unlinking and deleting from auth?

**A:** 
- **Unlinking:** Removes application access but keeps the Appwrite auth account
- **Deleting from auth:** Removes both application access AND the Appwrite auth account (permanent)

### Q: How do I know if team membership is enabled?

**A:** If you see a "Add to project team" checkbox when linking users, team membership is enabled.

### Q: Can users with unverified emails log in?

**A:** Yes, but it's a security risk. Always encourage users to verify their emails.

### Q: What happens if I unlink a user by mistake?

**A:** You can immediately link them again. Their auth account is not affected by unlinking (unless you chose "delete from auth").

## Getting Help

If you encounter issues not covered in this guide:

1. **Check Error Messages:** Error messages provide specific information about what went wrong
2. **Review Logs:** System administrators can check application logs for detailed error information
3. **Contact Support:** Reach out to your system administrator or technical support team
4. **Check Configuration:** Verify environment variables and Appwrite configuration

## Summary

The Auth User Linking system provides a secure, streamlined way to grant application access to existing Appwrite users. Key points to remember:

✅ Search for existing auth users  
✅ Verify email addresses before linking  
✅ Assign appropriate roles  
✅ Use team membership when available  
✅ Review and audit regularly  
✅ Handle errors gracefully  

By following this guide, you can effectively manage user access to your CredentialStudio application while maintaining security and compliance.

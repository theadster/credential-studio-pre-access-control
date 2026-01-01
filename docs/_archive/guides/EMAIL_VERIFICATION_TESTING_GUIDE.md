# Email Verification Testing Guide

## Overview
This guide helps you test the email verification flow after the security fix.

## Prerequisites
- Appwrite instance with email service configured
- SMTP settings configured in Appwrite console
- Test email account you can access

## Environment Setup

### Development
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_VERIFICATION_URL=http://localhost:3000/verify-email
```

### Production
```bash
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_VERIFICATION_URL=https://yourdomain.com/verify-email
```

## Test Scenarios

### Scenario 1: Happy Path - Successful Verification

**Steps:**
1. Create a test user in Appwrite Auth (unverified)
2. Log in as admin to CredentialStudio
3. Go to User Management
4. Click "Link User" button
5. Find the unverified user (should show "Unverified" badge)
6. Click "Send Verification Email" button
7. Check test email inbox
8. Click verification link in email
9. Verify success page appears
10. Check Appwrite console - user should now be verified

**Expected Results:**
- ✅ Success message: "Verification email sent to {email}. User must click the link..."
- ✅ Email received within 1-2 minutes
- ✅ Verification link works
- ✅ Success page shows with green checkmark
- ✅ Auto-redirect to login after 3 seconds
- ✅ User marked as verified in Appwrite

### Scenario 2: Already Verified User

**Steps:**
1. Find a user who is already verified
2. Try to click "Send Verification Email"

**Expected Results:**
- ✅ Button should not appear for verified users
- ✅ Only "Verified" badge shown

### Scenario 3: Rate Limiting

**Steps:**
1. Send verification email to same user
2. Immediately send again
3. Repeat 3 times quickly

**Expected Results:**
- ✅ First 3 emails send successfully
- ✅ 4th attempt shows error: "Too many verification emails sent for this user"
- ✅ Must wait 1 hour before sending again

### Scenario 4: Expired Token

**Steps:**
1. Send verification email
2. Wait 24+ hours (or modify token expiration in Appwrite)
3. Click verification link

**Expected Results:**
- ✅ Error page shows with red X icon
- ✅ Message: "Invalid verification link. Please request a new verification email."
- ✅ Options to go to login or sign up again

### Scenario 5: Invalid Token

**Steps:**
1. Send verification email
2. Modify the `secret` parameter in URL
3. Click modified link

**Expected Results:**
- ✅ Error page shows
- ✅ Message about invalid/expired link
- ✅ User not verified in Appwrite

### Scenario 6: Email Not Received

**Steps:**
1. Send verification email
2. Check spam folder
3. Check Appwrite logs

**Troubleshooting:**
- Check SMTP configuration in Appwrite
- Verify email service is enabled
- Check Appwrite function logs
- Verify sender email is not blacklisted

## Verification Checklist

### Before Deployment
- [ ] Environment variables set correctly
- [ ] Appwrite email service configured
- [ ] SMTP settings tested
- [ ] Test email received successfully
- [ ] Verification link works
- [ ] Success page displays correctly
- [ ] Error handling works
- [ ] Rate limiting enforced
- [ ] Logs show correct actions

### After Deployment
- [ ] Send test verification email in production
- [ ] Verify email delivery
- [ ] Test verification link
- [ ] Check production logs
- [ ] Monitor error rates
- [ ] Verify no automatic verification happening

## Common Issues

### Email Not Received
**Symptoms:** User doesn't receive verification email

**Causes:**
- SMTP not configured in Appwrite
- Email service disabled
- Sender email blacklisted
- Spam filters blocking

**Solutions:**
1. Check Appwrite email settings
2. Verify SMTP credentials
3. Check spam folder
4. Whitelist sender email
5. Check Appwrite logs for errors

### Verification Link Doesn't Work
**Symptoms:** Clicking link shows error

**Causes:**
- Token expired (24 hours)
- Token already used
- Invalid token format
- Wrong verification URL

**Solutions:**
1. Request new verification email
2. Check URL format
3. Verify environment variables
4. Check Appwrite console for user status

### Rate Limit Errors
**Symptoms:** "Too many verification emails" error

**Causes:**
- Sent 3+ emails within 1 hour (per user)
- Admin sent 20+ emails within 1 hour

**Solutions:**
1. Wait for rate limit to reset (1 hour)
2. Check rate limit settings in `.env`
3. Adjust limits if needed for testing

## Testing with Appwrite Console

### Check Email Service
1. Go to Appwrite Console
2. Navigate to Settings > Email
3. Verify SMTP settings
4. Send test email

### Check User Verification Status
1. Go to Auth > Users
2. Find test user
3. Check "Email Verification" column
4. Should show checkmark after verification

### Check Logs
1. Go to Functions (if using custom function)
2. Check execution logs
3. Look for email sending events

## Automated Testing

### Run Unit Tests
```bash
npx vitest --run src/pages/api/users/__tests__/verify-email.test.ts
```

**Expected:** All 16 tests pass

### Run Integration Tests
```bash
npx vitest --run src/__tests__/integration/auth-user-linking.integration.test.ts
```

## Security Verification

### Verify No Automatic Verification
1. Send verification email
2. Do NOT click link
3. Check Appwrite console
4. User should still be unverified

### Verify Token Security
1. Try to reuse token after verification
2. Should fail with error
3. Try modified token
4. Should fail with error

## Performance Testing

### Email Delivery Time
- Typical: 10-30 seconds
- Acceptable: < 2 minutes
- Issue if: > 5 minutes

### Verification Page Load
- Should load instantly
- Verification should complete in < 1 second

## Rollback Testing

If issues found:
1. Revert API endpoint changes
2. Test that old behavior works
3. Document issues found
4. Plan fix for next iteration

## Success Criteria

✅ All test scenarios pass  
✅ Emails delivered reliably  
✅ Verification links work  
✅ Error handling graceful  
✅ Rate limiting enforced  
✅ No automatic verification  
✅ Logs accurate  
✅ Performance acceptable  

## Support

If issues persist:
1. Check Appwrite documentation
2. Review error logs
3. Test SMTP configuration
4. Contact Appwrite support if needed

## Related Documentation
- [Email Verification Security Fix](../fixes/EMAIL_VERIFICATION_SECURITY_FIX.md)
- [Auth User Linking Admin Guide](./AUTH_USER_LINKING_ADMIN_GUIDE.md)
- [Auth User Linking API Guide](./AUTH_USER_LINKING_API_GUIDE.md)

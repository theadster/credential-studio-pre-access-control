# Rate Limiting - Quick Test Guide

## 5-Minute Manual Test

### Prerequisites
- [ ] Dev server running (`npm run dev`)
- [ ] Logged in as admin
- [ ] At least one user with auth account exists

### Test Steps

1. **Navigate to Users**
   ```
   Dashboard → Users tab
   ```

2. **Find Test User**
   ```
   Find any user with:
   - ✓ Has userId (auth account)
   - ✓ Not invited (isInvited = false)
   ```

3. **Test Rate Limit**
   ```
   Click edit icon → Click "Send Reset Email"
   
   Attempt 1: ✅ Success - "Password reset email sent"
   Attempt 2: ✅ Success - "Password reset email sent"
   Attempt 3: ✅ Success - "Password reset email sent"
   Attempt 4: ❌ Error - "Too many password reset emails sent"
   ```

4. **Verify Error Message**
   ```
   Should see:
   - ✓ Toast notification appears
   - ✓ Message mentions "too many" or "rate limit"
   - ✓ Message shows time to wait (e.g., "45 minutes")
   - ✓ Button re-enables after error
   ```

5. **Test Different User**
   ```
   Edit a DIFFERENT user → Click "Send Reset Email"
   
   Result: ✅ Success (separate rate limit)
   ```

### Expected Results

| Test | Expected | Status |
|------|----------|--------|
| First 3 attempts | Success | ✅ |
| 4th attempt | Rate limit error | ✅ |
| Error message clear | Shows time remaining | ✅ |
| Different user | Success | ✅ |
| No console errors | Clean console | ✅ |

### If Test Fails

**Problem:** All 4 attempts succeed
- **Cause:** Rate limiting not working
- **Check:** API endpoint has rate limit code
- **Fix:** Verify `src/pages/api/users/send-password-reset.ts` has rate limit checks

**Problem:** Error on first attempt
- **Cause:** Rate limit already hit
- **Fix:** Wait 1 hour or restart dev server

**Problem:** No error message shown
- **Cause:** Frontend error handling issue
- **Check:** Browser console for errors
- **Fix:** Verify `UserForm.tsx` has error handling

### Quick Verification Commands

```bash
# Check if rate limiter exists
ls -la src/lib/rateLimiter.ts

# Run tests
npx vitest --run src/lib/__tests__/rateLimiter.test.ts

# Check API endpoint
grep -n "rateLimiter" src/pages/api/users/send-password-reset.ts
```

### Reset Rate Limit (Development)

If you need to reset during testing:

```bash
# Restart dev server (clears in-memory store)
# Press Ctrl+C in terminal
npm run dev
```

### Success Criteria

✅ All 5 test steps pass
✅ Error message is clear and helpful
✅ Different users have independent limits
✅ No console errors

**Time:** ~5 minutes
**Result:** Rate limiting is working correctly!

---

## Advanced Test (Optional)

### Test Per-Admin Limit

1. Send password reset to 20 different users
2. 21st attempt should fail with admin rate limit error

### Test Time Window

1. Hit rate limit (4th attempt fails)
2. Wait 1 hour
3. Try again → Should succeed

### Test API Directly

```bash
# Get your session cookie from browser DevTools
# Application → Cookies → Copy session cookie value

# Test 1: Should succeed
curl -X POST http://localhost:3000/api/users/send-password-reset \
  -H "Content-Type: application/json" \
  -H "Cookie: a_session_console=YOUR_SESSION_COOKIE" \
  -d '{"authUserId": "USER_ID_HERE"}'

# Test 2-3: Should succeed
# (repeat above command)

# Test 4: Should fail with 429
# (repeat above command)
```

Expected response on 4th attempt:
```json
{
  "error": "Too many password reset emails sent for this user. Please try again in 60 minutes.",
  "code": "VERIFICATION_RATE_LIMIT",
  "resetAt": 1234567890000
}
```

---

## Troubleshooting

### Rate Limit Not Working

1. Check API endpoint:
   ```bash
   grep -A 10 "rateLimiter.check" src/pages/api/users/send-password-reset.ts
   ```

2. Check rate limiter exists:
   ```bash
   cat src/lib/rateLimiter.ts
   ```

3. Check for errors:
   ```bash
   # Look at terminal running dev server
   # Should see no errors
   ```

### Error Message Not Showing

1. Check browser console (F12)
2. Look for network errors
3. Verify UserForm error handling:
   ```bash
   grep -A 5 "handleSendPasswordReset" src/components/UserForm.tsx
   ```

### Tests Failing

```bash
# Run tests with verbose output
npx vitest --run src/lib/__tests__/rateLimiter.test.ts --reporter=verbose

# If tests fail, check:
# 1. Node version (should be 20.x)
# 2. Dependencies installed (npm install)
# 3. No syntax errors (npm run build)
```

---

## Quick Reference

**Rate Limits:**
- Per-user: 3 attempts/hour
- Per-admin: 20 attempts/hour
- Window: 1 hour

**Files:**
- Rate limiter: `src/lib/rateLimiter.ts`
- API endpoint: `src/pages/api/users/send-password-reset.ts`
- Frontend: `src/components/UserForm.tsx`
- Tests: `src/lib/__tests__/rateLimiter.test.ts`

**Environment Variables:**
```bash
PASSWORD_RESET_USER_LIMIT=3
PASSWORD_RESET_ADMIN_LIMIT=20
PASSWORD_RESET_WINDOW_HOURS=1
```

**Test Command:**
```bash
npx vitest --run src/lib/__tests__/rateLimiter.test.ts
```

**Documentation:**
- Full details: `docs/fixes/RATE_LIMITING_IMPLEMENTATION.md`
- Summary: `docs/fixes/RATE_LIMITING_COMPLETE.md`

# Login/Logout Action Standardization

## Investigation Results

Searched the entire codebase for authentication-related log actions and found:

### ✅ What's Actually Used

**Action Names (stored in database)**:
- `login` - User logs in (NEW standard)
- `logout` - User logs out (NEW standard)
- `auth_login` - User logs in (LEGACY - exists in database)
- `auth_logout` - User logs out (LEGACY - exists in database)

**NOT used in code**:
- ❌ `auth_login` - Not found in codebase, but EXISTS in database logs
- ❌ `auth_logout` - Not found in codebase, but EXISTS in database logs

### Conclusion

There **IS a difference** - it's a legacy naming issue:
1. **Old logs** used `auth_login` and `auth_logout`
2. **New logs** use `login` and `logout`
3. Both mean the same thing - just different naming conventions
4. The display was showing "Auth Login" because of the underscore formatting

## Standardization Applied

### Action Names (Database)
```
login   → Stored as: "login"
logout  → Stored as: "logout"
```

### Display Names (UI)
```
login   → Displayed as: "Log In"
logout  → Displayed as: "Log Out"
```

### Category
```
Type: system
Target: Authentication
Category: System Operation
```

## Changes Made

### 1. Dashboard Display (`src/pages/dashboard.tsx`)

**Enhanced action name formatting to handle BOTH legacy and new formats**:

**Before**:
```typescript
log.action.split('_').map(word => 
  word.charAt(0).toUpperCase() + word.slice(1)
).join(' ')
// "login" → "Login"
// "logout" → "Logout"
// "auth_login" → "Auth Login" ← PROBLEM!
// "auth_logout" → "Auth Logout" ← PROBLEM!
```

**After**:
```typescript
log.action === 'login' || log.action === 'auth_login' ? 'Log In' :
  log.action === 'logout' || log.action === 'auth_logout' ? 'Log Out' :
    log.action.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
// "login" → "Log In" ✓
// "logout" → "Log Out" ✓
// "auth_login" → "Log In" ✓ (mapped to same display)
// "auth_logout" → "Log Out" ✓ (mapped to same display)
```

### 2. Verified Consistency Across

✅ **Test Script** (`scripts/inject-test-logs.ts`)
- Uses: `'login'` and `'logout'`

✅ **Log Formatting Utility** (`src/lib/logFormatting.ts`)
- `createAuthLogDetails('login')` → "User logged in"
- `createAuthLogDetails('logout')` → "User logged out"

✅ **Dashboard Filter** (`src/pages/dashboard.tsx`)
- Filter options: "Login" and "Logout"
- Filter values: `'login'` and `'logout'`

✅ **Delete Logs Dialog** (`src/components/LogsDeleteDialog.tsx`)
- Filter options: "Login" and "Logout"
- Filter values: `'login'` and `'logout'`

✅ **Export API** (`src/pages/api/logs/export.ts`)
- Exports raw action value: `'login'` and `'logout'`

## Standard Action Names Reference

### All Supported Actions

| Action | Display Name | Category | Description |
|--------|-------------|----------|-------------|
| `create` | Create | Varies | Create a record |
| `update` | Update | Varies | Update a record |
| `delete` | Delete | Varies | Delete a record |
| `view` | View | Varies | View a record |
| `print` | Print | Attendee | Print a badge |
| `login` | Log In | System Operation | User logs in |
| `logout` | Log Out | System Operation | User logs out |
| `export` | Export | System Operation | Export data |
| `import` | Import | System Operation | Import data |
| `delete_logs` | Delete Logs | System Operation | Delete activity logs |
| `bulk_update` | Bulk Update | Attendees | Bulk update records |
| `bulk_delete` | Bulk Delete | Attendees | Bulk delete records |
| `clear_credential` | Clear Credential | Attendee | Clear badge credential |

## Example Log Entries

### Login
```json
{
  "action": "login",
  "userId": "user_123",
  "details": {
    "type": "system",
    "target": "Authentication",
    "description": "User logged in"
  }
}
```

**Displays as**:
```
Action: Log In
User: John Doe (john@example.com)
Target: Authentication
       System Operation
Details: User logged in
```

### Logout
```json
{
  "action": "logout",
  "userId": "user_123",
  "details": {
    "type": "system",
    "target": "Authentication",
    "description": "User logged out"
  }
}
```

**Displays as**:
```
Action: Log Out
User: John Doe (john@example.com)
Target: Authentication
       System Operation
Details: User logged out
```

## Future Authentication Actions

If you want to track more authentication events in the future, use these naming conventions:

| Action | Display Name | Use Case |
|--------|-------------|----------|
| `login` | Log In | Successful login |
| `logout` | Log Out | User-initiated logout |
| `login_failed` | Login Failed | Failed login attempt |
| `password_reset` | Password Reset | Password reset action |
| `password_change` | Password Change | User changed password |
| `session_expired` | Session Expired | Automatic logout |
| `mfa_enabled` | MFA Enabled | Multi-factor auth enabled |
| `mfa_disabled` | MFA Disabled | Multi-factor auth disabled |

## Testing

### Verify Display Names
1. Go to Activity Logs tab
2. Look for login/logout entries
3. Verify they show as:
   - [ ] "Log In" (not "Login" or "Auth Login")
   - [ ] "Log Out" (not "Logout" or "Auth Logout")

### Verify Filtering
1. Use action filter dropdown
2. Select "Login"
3. Verify only login actions are shown
4. Select "Logout"
5. Verify only logout actions are shown

### Verify Export
1. Export logs with login/logout entries
2. Check CSV file
3. Verify Action column shows:
   - [ ] "login" (raw value)
   - [ ] "logout" (raw value)

### Verify Delete
1. Open Delete Logs dialog
2. Check action filter options
3. Verify "Login" and "Logout" are available
4. Test deleting login/logout logs

## Files Modified

1. ✅ `src/pages/dashboard.tsx` - Enhanced action display formatting
2. ✅ `docs/fixes/LOGIN_LOGOUT_STANDARDIZATION.md` - This documentation

## Summary

- ✅ **Found legacy `auth_login` and `auth_logout` in database** - Old logs use this format
- ✅ **Standardized on `login` and `logout`** - New logs use this format
- ✅ **Added backward compatibility** - Both formats now display as "Log In" / "Log Out"
- ✅ **Enhanced display** - Shows "Log In" and "Log Out" for better readability
- ✅ **Verified consistency** - All components use the same action names going forward
- ✅ **Documented standard** - Clear reference for future development

The "Auth Login" display was caused by legacy database entries using `auth_login` instead of `login`. The fix maps both formats to the same display name, so users see consistent "Log In" / "Log Out" regardless of which format is in the database.

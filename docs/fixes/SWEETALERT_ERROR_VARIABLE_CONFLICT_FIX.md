# SweetAlert Error Variable Conflict Fix

## Issue
When credential generation or other operations failed, the application threw a runtime error instead of displaying a user-friendly SweetAlert:

```
Runtime TypeError
error is not a function
at handleGenerateCredential (src/pages/dashboard.tsx:1116:7)
```

This resulted in:
- Nasty Next.js error screens instead of friendly modals
- Poor user experience during error conditions
- Confusing technical error messages

## Root Cause
The catch blocks were using `error` as the variable name for caught exceptions:

```typescript
catch (error: any) {
  error("Error", error.message);  // ❌ error is the caught exception, not the function!
}
```

This created a naming conflict where:
1. `error` (the variable) shadowed the `error` function from `useSweetAlert`
2. When trying to call `error()`, JavaScript tried to call the caught exception object as a function
3. This resulted in "error is not a function" runtime error

## Solution

### 1. Renamed Caught Exception Variables
**File:** `src/pages/dashboard.tsx`

Changed all catch blocks from `error` to `err` to avoid shadowing the SweetAlert function:

**Before:**
```typescript
catch (error: any) {
  error("Error", error.message);  // ❌ Conflict!
}
```

**After:**
```typescript
catch (err: any) {
  error("Error", err.message || "Failed to perform operation");  // ✅ Works!
}
```

### 2. Added Fallback Error Messages
Also added fallback messages in case `err.message` is undefined:

```typescript
err.message || "Failed to generate credential"
```

This ensures users always see a meaningful error message.

### 3. Extended SweetAlert Display Duration
**File:** `src/lib/sweetalert-config.ts`

Increased the default timer from 3 seconds to 5 seconds:

**Before:**
```typescript
timer: 3000,  // 3 seconds
```

**After:**
```typescript
timer: 5000,  // 5 seconds
```

**Benefits:**
- Users have more time to read error messages
- Especially helpful for longer error descriptions
- Reduces the chance of missing important notifications

## Affected Functions

Fixed the error variable conflict in these functions:

1. `handleDeleteAttendee` - Delete attendee operation
2. `handleGenerateCredential` - Generate credential (single)
3. `handleClearCredential` - Clear credential
4. `handlePrintCredential` - Print credential
5. `handleInitializeRoles` - Initialize default roles
6. `handleSaveRole` - Save role changes
7. `handleDeleteRole` - Delete role
8. `handleSaveUser` - Save user changes
9. `handleDeleteUser` - Delete user
10. `handleExportLogs` - Export activity logs

## User Experience Improvements

### Before
```
[Red Next.js error screen]
Runtime TypeError
error is not a function
at handleGenerateCredential (src/pages/dashboard.tsx:1116:7)
```

### After
```
[SweetAlert modal - displays for 5 seconds]
❌ Error
Failed to generate credential with Switchboard Canvas: API returned 401: Unauthorized
[Auto-dismisses after 5 seconds]
```

## Error Messages by Operation

| Operation | Error Title | Fallback Message |
|-----------|-------------|------------------|
| Generate Credential | Error | Failed to generate credential |
| Clear Credential | Error | Failed to clear credential |
| Print Credential | Error | Failed to generate credential |
| Delete Attendee | Error | Failed to delete attendee |
| Initialize Roles | Error | Failed to initialize roles |
| Save Role | Error | Failed to save role |
| Delete Role | Error | Failed to delete role |
| Save User | Error | Failed to save user |
| Delete User | Error | Failed to delete user |
| Export Logs | Export Failed | Failed to export logs |

## Technical Details

### Variable Naming Convention
- `err` - Used for caught exceptions in catch blocks
- `error` - Reserved for the SweetAlert error function
- This follows common JavaScript conventions where `err` is used in callbacks

### SweetAlert Timer Configuration
```typescript
// Default configuration in sweetalert-config.ts
{
  timer: 5000,              // Display for 5 seconds
  timerProgressBar: true,   // Show countdown progress bar
  showConfirmButton: false, // Auto-dismiss (no OK button needed)
  toast: true,              // Toast-style notification
  position: 'top-end'       // Top-right corner
}
```

### Custom Duration Override
If specific operations need different durations, you can override:

```typescript
// Show for 10 seconds instead of default 5
error("Critical Error", "This is important!", { duration: 10000 });
```

## Files Modified

- `src/pages/dashboard.tsx` - Fixed 10 catch blocks with variable naming conflicts
- `src/lib/sweetalert-config.ts` - Increased default timer from 3000ms to 5000ms

## Testing Recommendations

1. **Test credential generation error:**
   - Temporarily break Switchboard configuration
   - Try generating a credential
   - Should see: SweetAlert error modal (not Next.js error screen)

2. **Test delete operations:**
   - Try deleting an attendee/user/role that doesn't exist
   - Should see: SweetAlert error modal with appropriate message

3. **Test timer duration:**
   - Trigger any error
   - Verify modal displays for 5 seconds before auto-dismissing
   - Progress bar should show countdown

4. **Test all affected operations:**
   - Generate credential (with invalid config)
   - Clear credential (with invalid ID)
   - Delete attendee (with invalid ID)
   - Initialize roles (with database error)
   - Save/delete role (with invalid data)
   - Save/delete user (with invalid data)
   - Export logs (with permission error)

## Best Practices Going Forward

### ✅ DO:
```typescript
catch (err: any) {
  error("Error", err.message || "Fallback message");
}
```

### ❌ DON'T:
```typescript
catch (error: any) {
  error("Error", error.message);  // Variable shadows function!
}
```

### Alternative Naming:
```typescript
catch (e: any) { ... }           // Short and clear
catch (err: any) { ... }         // Conventional
catch (exception: any) { ... }   // Explicit
```

## Related Issues

This fix also prevents similar issues with other SweetAlert functions:
- `success()` - Could be shadowed by a variable named `success`
- `warning()` - Could be shadowed by a variable named `warning`
- `info()` - Could be shadowed by a variable named `info`

## Future Enhancements

Consider:
1. **ESLint rule** - Add rule to prevent variable names that shadow imported functions
2. **TypeScript strict mode** - Enable stricter checks for shadowing
3. **Code review checklist** - Add item to check for variable shadowing in catch blocks
4. **Custom error types** - Create typed error objects instead of using `any`

## Notes

- The 5-second timer applies to all SweetAlert toasts (success, error, warning, info)
- Confirmation dialogs are not affected (they don't auto-dismiss)
- Loading modals are not affected (they must be manually closed)
- Users can still click to dismiss before the timer expires

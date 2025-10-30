# Step 2.1: Manual Testing Checklist

## Status: ✅ Build Successful - Ready for Manual Testing

**Date:** October 29, 2025  
**Component:** UserForm (Refactored)  
**Build Status:** ✅ Passing (Exit Code: 0)

---

## ✅ Pre-Testing Validation

### TypeScript Compilation
```bash
✅ All 10 UserForm module files: 0 errors
✅ types.ts: No errors
✅ index.ts: No errors
✅ All hooks: No errors
✅ All components: No errors
✅ UserFormContainer: No errors
```

### Build Status
```bash
✅ npm run build: SUCCESS
✅ Exit Code: 0
✅ Only ESLint warnings (test files with 'any' types)
✅ No compilation errors
✅ No runtime errors expected
```

---

## 📋 Manual Testing Checklist

### Test Environment Setup

**Prerequisites:**
1. ✅ Development server running (`npm run dev`)
2. ✅ Appwrite backend accessible
3. ✅ Test user account available
4. ✅ Test roles created
5. ✅ Browser DevTools open (Console tab)

**Access:**
- Navigate to: `http://localhost:3000/dashboard`
- Login with test credentials
- Open "Users" tab

---

## 🧪 Test Scenarios

### Scenario 1: Link Mode - Create New User from Auth User

**Steps:**
1. Click "Link Existing User" button
2. Verify dialog opens with correct title: "Link Existing User"
3. Verify description: "Search for and select an existing Appwrite auth user..."

**Auth User Search:**
4. Verify AuthUserSearch component renders
5. Verify AuthUserList shows initial users (up to 25)
6. Type in search box to filter users
7. Verify search results update

**User Selection:**
8. Click on a user from the list
9. Verify selected user card appears
10. Verify card shows:
    - User icon with primary color
    - "Selected User" label
    - Email address with mail icon
    - Name (if available) with user icon

**Role Selection:**
11. Verify "Role *" dropdown appears
12. Click role dropdown
13. Verify roles list with:
    - UserCheck icon for each role
    - Role name in bold
    - Role description (if available)
14. Select a role
15. Verify selected role shows in dropdown with icon

**Team Membership (if PROJECT_TEAM_ID exists):**
16. Verify "Add to project team" checkbox appears
17. Check the checkbox
18. Verify checkbox state updates
19. Uncheck and verify state updates

**Form Submission:**
20. Click "Link User" button
21. Verify loading state (spinner + "Link User" text)
22. Verify success (dialog closes)
23. Verify new user appears in users list
24. Verify user has correct role
25. Verify user has correct team membership (if checked)

**Expected Results:**
- ✅ All UI elements render correctly
- ✅ Search works
- ✅ Selection works
- ✅ Role assignment works
- ✅ Team membership works
- ✅ Form submits successfully
- ✅ No console errors

---

### Scenario 2: Link Mode - Validation Errors

**Steps:**
1. Click "Link Existing User" button
2. Do NOT select a user
3. Select a role
4. Click "Link User"
5. Verify error: "Please select a user to link"

**Steps:**
6. Select a user
7. Do NOT select a role
8. Click "Link User"
9. Verify error: "Please select a role for this user"

**Expected Results:**
- ✅ Validation prevents submission
- ✅ Error messages are clear
- ✅ Form stays open after error
- ✅ No console errors

---

### Scenario 3: Edit Mode - Update Existing User

**Steps:**
1. Click "Edit" button on an existing user
2. Verify dialog opens with correct title: "Edit User"
3. Verify description: "Update user information and role assignment."

**Form Fields:**
4. Verify "Email Address *" field shows user's email
5. Verify email field is DISABLED (grayed out)
6. Verify "Full Name *" field shows user's name
7. Verify name field is ENABLED
8. Verify "Role *" dropdown shows current role

**Update Name:**
9. Change the name field
10. Verify field updates as you type

**Update Role:**
11. Click role dropdown
12. Select a different role
13. Verify new role shows in dropdown

**Form Submission:**
14. Click "Update User" button
15. Verify loading state (spinner + "Update User" text)
16. Verify success (dialog closes)
17. Verify user list updates with new name/role
18. Verify changes persisted (refresh page, check again)

**Expected Results:**
- ✅ Email field is disabled
- ✅ Name field is editable
- ✅ Role can be changed
- ✅ Form submits successfully
- ✅ Changes persist
- ✅ No console errors

---

### Scenario 4: Edit Mode - Validation Errors

**Steps:**
1. Click "Edit" on a user
2. Clear the name field (delete all text)
3. Click "Update User"
4. Verify error: "Name is required" or "Please fill in all required fields"

**Steps:**
5. Enter a name
6. Clear the role (if possible, or select empty)
7. Click "Update User"
8. Verify error about role being required

**Expected Results:**
- ✅ Validation prevents submission
- ✅ Error messages are clear
- ✅ Form stays open after error
- ✅ No console errors

---

### Scenario 5: Password Reset - User with Auth Account

**Prerequisites:**
- User must have a `userId` (linked to Appwrite auth)

**Steps:**
1. Click "Edit" on a user with auth account
2. Scroll down to see password reset section
3. Verify amber-colored alert box appears
4. Verify alert shows:
    - KeyRound icon (amber color)
    - "Password Reset" title
    - Description about sending reset email
    - "Send Reset Email" button with KeyRound icon

**Send Reset:**
5. Click "Send Reset Email" button
6. Verify button shows loading state:
    - Spinner icon
    - "Sending..." text
    - Button disabled
7. Wait for completion
8. Verify success toast/notification
9. Verify button returns to normal state

**Expected Results:**
- ✅ Password reset section appears
- ✅ Button works correctly
- ✅ Loading state shows
- ✅ Success notification appears
- ✅ No console errors

---

### Scenario 6: Password Reset - Invited User (No Auth Account)

**Prerequisites:**
- User must NOT have a `userId` (invited but not signed up)
- User must have `isInvited: true`

**Steps:**
1. Click "Edit" on an invited user
2. Scroll down to see info section
3. Verify blue-colored alert box appears
4. Verify alert shows:
    - Mail icon (blue color)
    - Message: "This user was invited but hasn't created their account yet..."
5. Verify NO password reset button appears

**Expected Results:**
- ✅ Info message appears
- ✅ No password reset button
- ✅ Message is clear
- ✅ No console errors

---

### Scenario 7: Cancel Actions

**Link Mode:**
1. Click "Link Existing User"
2. Select a user and role
3. Click "Cancel" button
4. Verify dialog closes
5. Verify no user was created

**Edit Mode:**
6. Click "Edit" on a user
7. Change name and role
8. Click "Cancel" button
9. Verify dialog closes
10. Verify changes were NOT saved

**Expected Results:**
- ✅ Cancel button works
- ✅ Dialog closes
- ✅ No changes saved
- ✅ No console errors

---

### Scenario 8: Dialog Behavior

**Open/Close:**
1. Click "Link Existing User"
2. Verify dialog opens with animation
3. Click outside dialog (on backdrop)
4. Verify dialog closes
5. Click "Link Existing User" again
6. Verify form is reset (no previous selections)

**Scroll Behavior:**
7. Open dialog with long content
8. Scroll within dialog
9. Verify page behind doesn't scroll
10. Scroll to top of dialog
11. Try to scroll up more
12. Verify page behind doesn't scroll
13. Scroll to bottom of dialog
14. Try to scroll down more
15. Verify page behind doesn't scroll

**Expected Results:**
- ✅ Dialog opens/closes smoothly
- ✅ Form resets on reopen
- ✅ Scroll chaining prevented
- ✅ No console errors

---

### Scenario 9: Role Selector Component

**Rendering:**
1. Open any user form (link or edit)
2. Verify role dropdown renders
3. Verify "Role *" label appears
4. Verify placeholder: "Select a role"

**Selection:**
5. Click dropdown
6. Verify dropdown opens
7. Verify all roles appear
8. Verify each role shows:
    - UserCheck icon
    - Role name (bold)
    - Role description (if available)
9. Hover over roles
10. Verify hover effect
11. Click a role
12. Verify dropdown closes
13. Verify selected role shows with icon

**Expected Results:**
- ✅ Dropdown works correctly
- ✅ All roles visible
- ✅ Selection works
- ✅ Icons display
- ✅ No console errors

---

### Scenario 10: Loading States

**Form Submission Loading:**
1. Open any form
2. Fill in required fields
3. Click submit button
4. Immediately observe:
    - Button shows spinner
    - Button text stays visible
    - Button is disabled
    - Form fields stay visible
5. Wait for completion
6. Verify loading state clears

**Password Reset Loading:**
7. Open edit form for user with auth
8. Click "Send Reset Email"
9. Immediately observe:
    - Button shows spinner
    - Button text changes to "Sending..."
    - Button is disabled
10. Wait for completion
11. Verify loading state clears

**Expected Results:**
- ✅ Loading states are clear
- ✅ UI doesn't jump or flicker
- ✅ User can't double-submit
- ✅ No console errors

---

## 🐛 Error Scenarios to Test

### Network Errors

**Test 1: Failed User Creation**
1. Disconnect network (or use DevTools to simulate offline)
2. Try to link a user
3. Verify error handling
4. Verify error message appears
5. Verify form stays open
6. Reconnect network
7. Try again
8. Verify success

**Test 2: Failed Password Reset**
9. Disconnect network
10. Try to send password reset
11. Verify error handling
12. Verify error message appears

**Expected Results:**
- ✅ Errors handled gracefully
- ✅ Error messages are clear
- ✅ Form doesn't crash
- ✅ Can retry after error

---

### Rate Limiting

**Test: Password Reset Rate Limit**
1. Open edit form for user with auth
2. Click "Send Reset Email"
3. Wait for success
4. Immediately click "Send Reset Email" again
5. Repeat 2-3 more times quickly
6. Verify rate limit error appears
7. Verify error message mentions rate limit
8. Wait 1 minute
9. Try again
10. Verify success

**Expected Results:**
- ✅ Rate limiting works
- ✅ Error message is clear
- ✅ Can retry after waiting
- ✅ No console errors

---

## 📊 Console Checks

### During All Tests

**Monitor Console for:**
- ❌ No red errors
- ❌ No unhandled promise rejections
- ❌ No React warnings
- ❌ No TypeScript errors
- ✅ Only expected info/debug logs

**Expected Logs:**
- ✅ "[AuthContext] Starting sign in" (if logging in)
- ✅ API request logs (if enabled)
- ✅ Success messages

**Unexpected Logs:**
- ❌ "Warning: Each child in a list should have a unique key"
- ❌ "Warning: Can't perform a React state update on an unmounted component"
- ❌ "TypeError: Cannot read property 'X' of undefined"
- ❌ Any stack traces

---

## ✅ Success Criteria

### Functionality
- ✅ All link mode features work
- ✅ All edit mode features work
- ✅ All validation works
- ✅ Password reset works
- ✅ Form submission works
- ✅ Cancel works
- ✅ Dialog behavior correct

### UI/UX
- ✅ All components render correctly
- ✅ All icons display
- ✅ All colors correct (amber, blue, primary)
- ✅ Loading states clear
- ✅ Error messages helpful
- ✅ Responsive design works

### Technical
- ✅ No console errors
- ✅ No React warnings
- ✅ No TypeScript errors
- ✅ No memory leaks
- ✅ Performance acceptable

---

## 📝 Testing Notes

### Issues Found

**Issue 1:**
- Description:
- Steps to reproduce:
- Expected:
- Actual:
- Severity:

**Issue 2:**
- Description:
- Steps to reproduce:
- Expected:
- Actual:
- Severity:

### Observations

**Positive:**
-
-
-

**Needs Improvement:**
-
-
-

---

## 🎯 Test Results Summary

**Date Tested:** ___________  
**Tester:** ___________  
**Environment:** ___________

**Results:**
- Link Mode: ⬜ Pass / ⬜ Fail
- Edit Mode: ⬜ Pass / ⬜ Fail
- Password Reset: ⬜ Pass / ⬜ Fail
- Validation: ⬜ Pass / ⬜ Fail
- Error Handling: ⬜ Pass / ⬜ Fail
- UI/UX: ⬜ Pass / ⬜ Fail

**Overall Status:** ⬜ PASS / ⬜ FAIL

**Notes:**
___________________________________________
___________________________________________
___________________________________________

---

## 🚀 Next Steps After Testing

### If All Tests Pass:
1. ✅ Mark Step 2.1 as fully complete
2. ✅ Remove old UserForm.tsx (or rename to .old)
3. ✅ Update documentation
4. ✅ Move to Step 2.3

### If Issues Found:
1. 🐛 Document all issues
2. 🔧 Fix critical issues
3. 🧪 Retest
4. ✅ Verify fixes
5. 📝 Update documentation

---

## 📚 Related Documentation

- `docs/fixes/STEP_2_1_COMPLETE.md` - Refactoring completion summary
- `docs/fixes/STEP_2_1_COMPONENTS_CREATED.md` - Components details
- `docs/fixes/STEP_2_1_HOOKS_CREATED.md` - Hooks details
- `docs/fixes/USERFORM_REFACTORING_GUIDE.md` - Complete guide

---

**Ready for manual testing!** 🧪

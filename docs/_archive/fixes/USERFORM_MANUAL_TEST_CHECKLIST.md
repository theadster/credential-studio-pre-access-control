# UserForm Manual Testing Checklist

Use this checklist to verify the UserForm changes work correctly after password field removal.

## Prerequisites

- [ ] Development server is running (`npm run dev`)
- [ ] You have access to the dashboard
- [ ] You have at least one existing Appwrite auth user to link
- [ ] You have admin permissions

## Test 1: Link Existing User ✓

**Purpose:** Verify linking existing Appwrite auth users still works

1. [ ] Navigate to Dashboard → Users tab
2. [ ] Click "Link User" or "Add User" button
3. [ ] Verify dialog opens with title "Link Existing User"
4. [ ] Verify search box appears with placeholder "Search by email or name"
5. [ ] Type in search box to find a user
6. [ ] Click on a user from the list
7. [ ] Verify "Selected User" card appears showing email and name
8. [ ] Select a role from the "Role" dropdown
9. [ ] If team ID is configured, verify "Add to project team" checkbox appears
10. [ ] Click "Link User" button
11. [ ] Verify success message appears
12. [ ] Verify user appears in the users list
13. [ ] Verify user has correct role assigned

**Expected Result:** ✅ User linked successfully without any password field

---

## Test 2: Edit Existing User ✓

**Purpose:** Verify editing user profiles still works

1. [ ] Find an existing user in the users list
2. [ ] Click the edit icon (pencil) for that user
3. [ ] Verify dialog opens with title "Edit User"
4. [ ] Verify email field is **disabled** (grayed out)
5. [ ] Verify name field is **enabled** and shows current name
6. [ ] Verify role dropdown shows current role
7. [ ] **CRITICAL:** Verify NO password field appears
8. [ ] Change the user's name
9. [ ] Change the user's role
10. [ ] Click "Update User" button
11. [ ] Verify success message appears
12. [ ] Verify changes are saved in the users list

**Expected Result:** ✅ User updated successfully without any password field

---

## Test 3: Password Reset for User with Auth Account ✓

**Purpose:** Verify password reset functionality still works

1. [ ] Find a user that has an auth account (userId field populated)
2. [ ] Click the edit icon for that user
3. [ ] Verify "Password Reset" section appears (amber/yellow alert box)
4. [ ] Verify section shows:
   - Title: "Password Reset"
   - Description: "Send a password reset email..."
   - Button: "Send Reset Email"
5. [ ] Click "Send Reset Email" button
6. [ ] Verify button shows loading state ("Sending...")
7. [ ] Verify success message appears
8. [ ] Verify message mentions email was sent to user's email address

**Expected Result:** ✅ Password reset email sent successfully

---

## Test 4: Invited User (No Auth Account) ✓

**Purpose:** Verify invited users show correct message

1. [ ] Find a user that is invited but hasn't created account (isInvited=true, no userId)
2. [ ] Click the edit icon for that user
3. [ ] Verify blue info alert appears
4. [ ] Verify message says: "This user was invited but hasn't created their account yet..."
5. [ ] Verify NO "Send Reset Email" button appears

**Expected Result:** ✅ Correct message shown for invited users

---

## Test 5: Form Validation ✓

**Purpose:** Verify form validation still works correctly

### Link Mode Validation:
1. [ ] Open "Link User" dialog
2. [ ] Click "Link User" without selecting a user
3. [ ] Verify error message: "Please select a user to link"
4. [ ] Select a user
5. [ ] Click "Link User" without selecting a role
6. [ ] Verify error message: "Please select a role for this user"

### Edit Mode Validation:
1. [ ] Open edit dialog for a user
2. [ ] Clear the name field
3. [ ] Click "Update User"
4. [ ] Verify error message: "Please fill in all required fields"

**Expected Result:** ✅ All validation works correctly

---

## Test 6: Visual Inspection ✓

**Purpose:** Verify UI looks correct and no password fields appear

1. [ ] Open "Link User" dialog
   - [ ] Verify clean layout with search, user list, role selector
   - [ ] Verify NO password field anywhere
   - [ ] Verify proper spacing and alignment

2. [ ] Open "Edit User" dialog
   - [ ] Verify email field (disabled)
   - [ ] Verify name field (enabled)
   - [ ] Verify role dropdown
   - [ ] Verify NO password field anywhere
   - [ ] Verify password reset section (if user has auth account)
   - [ ] Verify proper spacing and alignment

3. [ ] Check dialog titles:
   - [ ] Link mode: "Link Existing User"
   - [ ] Edit mode: "Edit User"
   - [ ] NO "Create New User" title appears

4. [ ] Check button text:
   - [ ] Link mode: "Link User"
   - [ ] Edit mode: "Update User"
   - [ ] NO "Create User" button appears

**Expected Result:** ✅ UI is clean and no password fields visible

---

## Test 7: Console Check ✓

**Purpose:** Verify no errors or debug logs in console

1. [ ] Open browser DevTools (F12)
2. [ ] Go to Console tab
3. [ ] Clear console
4. [ ] Perform all above tests
5. [ ] Check console for:
   - [ ] NO console.log statements (we removed them)
   - [ ] NO errors related to password field
   - [ ] NO TypeScript errors
   - [ ] NO React warnings

**Expected Result:** ✅ Clean console with no password-related errors

---

## Test 8: Network Requests ✓

**Purpose:** Verify API calls don't include password field

1. [ ] Open browser DevTools (F12)
2. [ ] Go to Network tab
3. [ ] Filter by "Fetch/XHR"
4. [ ] Link a new user
5. [ ] Check the request payload to `/api/users` (POST)
6. [ ] Verify payload contains:
   - [ ] `authUserId`
   - [ ] `roleId`
   - [ ] `addToTeam` (if applicable)
   - [ ] **NO `password` field**

7. [ ] Edit an existing user
8. [ ] Check the request payload to `/api/users` (PUT)
9. [ ] Verify payload contains:
   - [ ] `id`
   - [ ] `name`
   - [ ] `roleId`
   - [ ] **NO `password` field**

**Expected Result:** ✅ No password field in any API requests

---

## Test 9: Edge Cases ✓

**Purpose:** Test unusual scenarios

1. [ ] Try to link a user that's already linked
   - [ ] Verify appropriate error message

2. [ ] Try to edit a user and cancel
   - [ ] Verify dialog closes without saving

3. [ ] Try to link a user and cancel
   - [ ] Verify dialog closes without saving

4. [ ] Open link dialog, select user, close dialog, reopen
   - [ ] Verify form is reset (no user selected)

5. [ ] Open edit dialog, make changes, close dialog, reopen
   - [ ] Verify form shows original values (changes discarded)

**Expected Result:** ✅ All edge cases handled correctly

---

## Test 10: Backward Compatibility ✓

**Purpose:** Verify old invited users still work

1. [ ] Find an old user with `isInvited: true` (if any exist)
2. [ ] Verify they can be edited
3. [ ] Verify their role can be changed
4. [ ] Verify they show correct badge/icon

**Expected Result:** ✅ Old users work exactly the same

---

## Summary Checklist

After completing all tests above:

- [ ] All 10 test sections completed
- [ ] No password fields found anywhere
- [ ] No console errors
- [ ] No API requests with password field
- [ ] All functionality works as expected
- [ ] UI looks clean and professional

## If Any Test Fails

1. **Document the failure:**
   - Which test failed?
   - What was the expected behavior?
   - What actually happened?
   - Any error messages?

2. **Check the console:**
   - Are there any errors?
   - Are there any warnings?

3. **Check the network tab:**
   - Did the API request fail?
   - What was the response?

4. **Report the issue:**
   - Include all information from above
   - Include screenshots if possible
   - Include browser and version

## Success Criteria

✅ **All tests pass** = Changes are working correctly
❌ **Any test fails** = Investigation needed

---

## Notes

- These tests verify the **frontend** changes only
- Backend API (`/api/users`) was not modified
- Password creation still works via `/api/auth/signup`
- Appwrite Auth still enforces 8-character minimum password
- This cleanup only removed unused code from UserForm component

## Time Estimate

- **Quick test** (Tests 1-3): ~5 minutes
- **Thorough test** (All tests): ~15-20 minutes
- **With documentation**: ~25-30 minutes

# Manual Testing Checklist
## Next.js 16 Migration - CredentialStudio

**Purpose:** Verify all application features work correctly after migration to Next.js 16 with Turbopack

**How to Use:**
1. Start the development server: `npm run dev`
2. Navigate to http://localhost:3000
3. Work through each section below
4. Check off items as you test them
5. Document any issues found

---

## Pre-Testing Setup

- [ ] Development server started successfully
- [ ] No console errors on initial load
- [ ] Application loads without errors
- [ ] Browser: Chrome/Firefox/Safari tested

---

## 5.3: Authentication Flows

### Login with Email/Password
- [ ] Navigate to /login
- [ ] Enter valid credentials
- [ ] Click "Sign In" button
- [ ] Verify redirect to dashboard
- [ ] Verify user profile loads correctly
- [ ] Check browser console for errors

### Login with Google OAuth
- [ ] Navigate to /login
- [ ] Click "Sign in with Google" button
- [ ] Complete Google OAuth flow
- [ ] Verify redirect to dashboard
- [ ] Verify user profile loads correctly
- [ ] Check browser console for errors

### Password Reset Flow
- [ ] Navigate to /forgot-password
- [ ] Enter email address
- [ ] Submit password reset request
- [ ] Check email for reset link
- [ ] Click reset link
- [ ] Enter new password
- [ ] Verify password reset successful
- [ ] Login with new password

### Session Management
- [ ] Login to application
- [ ] Verify session persists on page refresh
- [ ] Open application in new tab
- [ ] Verify session shared across tabs
- [ ] Wait for session timeout (if applicable)
- [ ] Verify session expiration handling

### Logout Functionality
- [ ] Click logout button
- [ ] Verify redirect to login page
- [ ] Verify session cleared
- [ ] Try to access protected page
- [ ] Verify redirect to login

**Issues Found:**
```
[Document any issues here]
```

---

## 5.4: Attendee Management Features

### Create New Attendee
- [ ] Navigate to attendees page
- [ ] Click "Add Attendee" button
- [ ] Fill in required fields
- [ ] Fill in custom fields
- [ ] Upload photo (if applicable)
- [ ] Click "Save" button
- [ ] Verify attendee created successfully
- [ ] Verify attendee appears in list

### Edit Existing Attendee
- [ ] Click on an attendee
- [ ] Modify attendee information
- [ ] Change custom field values
- [ ] Click "Save" button
- [ ] Verify changes saved successfully
- [ ] Verify changes reflected in list

### Delete Attendee
- [ ] Click delete button on an attendee
- [ ] Confirm deletion
- [ ] Verify attendee deleted successfully
- [ ] Verify attendee removed from list

### Bulk Import
- [ ] Click "Import" button
- [ ] Select CSV file
- [ ] Upload file
- [ ] Verify import progress
- [ ] Verify import completion
- [ ] Check imported attendees in list

### Bulk Export
- [ ] Click "Export" button
- [ ] Select export format (CSV/PDF)
- [ ] Download export file
- [ ] Verify file contents
- [ ] Verify all data exported correctly

### Bulk Edit
- [ ] Select multiple attendees
- [ ] Click "Bulk Edit" button
- [ ] Modify field values
- [ ] Apply changes
- [ ] Verify changes applied to all selected

### Bulk Delete
- [ ] Select multiple attendees
- [ ] Click "Bulk Delete" button
- [ ] Confirm deletion
- [ ] Verify attendees deleted successfully

### Photo Upload
- [ ] Create/edit attendee
- [ ] Click photo upload button
- [ ] Select image file
- [ ] Upload image
- [ ] Verify image uploaded to Cloudinary
- [ ] Verify image displays correctly

### Credential Generation
- [ ] Select attendee with photo
- [ ] Click "Generate Credential" button
- [ ] Verify credential generation progress
- [ ] Verify credential generated successfully
- [ ] View generated credential
- [ ] Verify credential displays correctly

### Search Functionality
- [ ] Enter search term in search box
- [ ] Verify search results update
- [ ] Try different search terms
- [ ] Verify search works correctly

### Filter Functionality
- [ ] Apply filters (role, status, etc.)
- [ ] Verify filtered results
- [ ] Clear filters
- [ ] Verify all results shown

### Pagination
- [ ] Navigate to next page
- [ ] Navigate to previous page
- [ ] Jump to specific page
- [ ] Change items per page
- [ ] Verify pagination works correctly

**Issues Found:**
```
[Document any issues here]
```

---

## 5.5: Event Configuration Features

### Update Event Settings
- [ ] Navigate to event settings
- [ ] Modify event name
- [ ] Modify event description
- [ ] Modify event dates
- [ ] Click "Save" button
- [ ] Verify settings saved successfully

### Custom Field Management

#### Create Custom Field
- [ ] Click "Add Custom Field" button
- [ ] Enter field name
- [ ] Select field type
- [ ] Configure field options
- [ ] Click "Save" button
- [ ] Verify field created successfully

#### Edit Custom Field
- [ ] Click edit on existing field
- [ ] Modify field properties
- [ ] Click "Save" button
- [ ] Verify changes saved successfully

#### Delete Custom Field
- [ ] Click delete on a field
- [ ] Confirm deletion
- [ ] Verify field deleted successfully

#### Reorder Custom Fields
- [ ] Drag and drop fields
- [ ] Verify new order saved
- [ ] Refresh page
- [ ] Verify order persisted

### Barcode Configuration
- [ ] Navigate to barcode settings
- [ ] Select barcode type (numerical/alphanumerical)
- [ ] Set barcode length
- [ ] Enable/disable barcode uniqueness
- [ ] Click "Save" button
- [ ] Verify settings saved successfully

### Integration Settings

#### Cloudinary Configuration
- [ ] Navigate to integration settings
- [ ] Enter Cloudinary API key
- [ ] Enter Cloudinary cloud name
- [ ] Test connection
- [ ] Verify connection successful
- [ ] Save settings

#### Switchboard Configuration
- [ ] Enter Switchboard API endpoint
- [ ] Enter Switchboard API key
- [ ] Enter template ID
- [ ] Test connection
- [ ] Verify connection successful
- [ ] Save settings

**Issues Found:**
```
[Document any issues here]
```

---

## 5.6: Role and Permission Management

### Create New Role
- [ ] Navigate to roles page
- [ ] Click "Add Role" button
- [ ] Enter role name
- [ ] Enter role description
- [ ] Select permissions
- [ ] Click "Save" button
- [ ] Verify role created successfully

### Edit Existing Role
- [ ] Click edit on a role
- [ ] Modify role name/description
- [ ] Change permissions
- [ ] Click "Save" button
- [ ] Verify changes saved successfully

### Delete Role
- [ ] Click delete on a role
- [ ] Confirm deletion
- [ ] Verify role deleted successfully

### Assign Permissions to Roles
- [ ] Edit a role
- [ ] Toggle various permissions
- [ ] Save changes
- [ ] Verify permissions updated

### Assign Users to Roles
- [ ] Navigate to user management
- [ ] Edit a user
- [ ] Select role from dropdown
- [ ] Save changes
- [ ] Verify role assigned successfully

### Verify Role-Based Access Control
- [ ] Login as user with limited role
- [ ] Try to access restricted features
- [ ] Verify access denied appropriately
- [ ] Login as admin
- [ ] Verify full access granted

**Issues Found:**
```
[Document any issues here]
```

---

## 5.7: Image Optimization and Uploads

### Upload Images via Cloudinary
- [ ] Navigate to attendee form
- [ ] Click photo upload button
- [ ] Select high-resolution image
- [ ] Upload image
- [ ] Verify upload progress
- [ ] Verify upload successful

### Test Image Optimization
- [ ] Upload large image (>5MB)
- [ ] Verify image optimized
- [ ] Check image file size
- [ ] Verify quality maintained

### Test Image Display in Various Sizes
- [ ] View image in attendee list (thumbnail)
- [ ] View image in attendee detail (medium)
- [ ] View image in credential (full size)
- [ ] Verify all sizes display correctly

### Test Credential Printing with Images
- [ ] Generate credential for attendee with photo
- [ ] Verify image included in credential
- [ ] Verify image quality in credential
- [ ] Download/print credential
- [ ] Verify image quality in output

**Issues Found:**
```
[Document any issues here]
```

---

## 5.8: Database Operations

### CRUD Operations for Attendees
- [ ] Create new attendee
- [ ] Read attendee details
- [ ] Update attendee information
- [ ] Delete attendee
- [ ] Verify all operations successful

### CRUD Operations for Custom Fields
- [ ] Create new custom field
- [ ] Read custom field configuration
- [ ] Update custom field properties
- [ ] Delete custom field
- [ ] Verify all operations successful

### CRUD Operations for Roles
- [ ] Create new role
- [ ] Read role details
- [ ] Update role permissions
- [ ] Delete role
- [ ] Verify all operations successful

### CRUD Operations for Users
- [ ] Create new user
- [ ] Read user details
- [ ] Update user information
- [ ] Delete user
- [ ] Verify all operations successful

### Appwrite Realtime Functionality
- [ ] Open application in two browser tabs
- [ ] Create attendee in tab 1
- [ ] Verify attendee appears in tab 2 (realtime)
- [ ] Update attendee in tab 2
- [ ] Verify update appears in tab 1 (realtime)
- [ ] Delete attendee in tab 1
- [ ] Verify deletion reflected in tab 2 (realtime)

**Issues Found:**
```
[Document any issues here]
```

---

## Performance Observations

### Development Server
- [ ] Note dev server startup time: _______ ms
- [ ] Note page load time: _______ ms
- [ ] Note navigation speed: Fast / Medium / Slow

### Hot Module Replacement (HMR)
- [ ] Make a small code change
- [ ] Note HMR update time: _______ ms
- [ ] Verify change reflected immediately
- [ ] Verify no page refresh required

### Build Performance
- [ ] Note production build time: _______ seconds
- [ ] Note bundle size: _______ MB
- [ ] Compare with baseline metrics

**Performance Notes:**
```
[Document any performance observations here]
```

---

## Browser Compatibility

### Chrome
- [ ] All features work correctly
- [ ] No console errors
- [ ] Performance is good

### Firefox
- [ ] All features work correctly
- [ ] No console errors
- [ ] Performance is good

### Safari
- [ ] All features work correctly
- [ ] No console errors
- [ ] Performance is good

**Browser Issues:**
```
[Document any browser-specific issues here]
```

---

## Overall Assessment

### Migration Success
- [ ] All features work as expected
- [ ] No critical issues found
- [ ] Performance is good or better
- [ ] No console errors
- [ ] Ready for production

### Issues Summary
```
[Summarize all issues found during testing]

Critical Issues (blocking):
- [List critical issues]

High Priority Issues (should fix):
- [List high priority issues]

Medium Priority Issues (nice to fix):
- [List medium priority issues]

Low Priority Issues (minor):
- [List low priority issues]
```

### Recommendations
```
[Provide recommendations based on testing results]

- Proceed to Phase 6 (if no critical issues)
- Fix critical issues before proceeding
- Document known issues for future reference
- etc.
```

---

## Sign-Off

**Tester Name:** _______________________  
**Date:** _______________________  
**Status:** ☐ Approved ☐ Approved with Issues ☐ Not Approved  
**Comments:**
```
[Additional comments or observations]
```

---

**Testing Complete!**

Once all manual testing is complete and documented:
1. Review all issues found
2. Determine if any are migration-related
3. Fix critical issues or rollback if necessary
4. Proceed to Phase 6: Cleanup and Documentation


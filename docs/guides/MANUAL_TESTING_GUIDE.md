# CredentialStudio Manual Testing Guide
## Appwrite Migration Validation

This comprehensive guide will help you manually test all features of CredentialStudio after the Supabase to Appwrite migration. Follow each section systematically and check off items as you complete them.

---

## Prerequisites

### Environment Setup
- [ ] Verify `.env.local` has all required Appwrite environment variables
- [ ] Confirm Appwrite project is accessible at the configured endpoint
- [ ] Ensure all Appwrite collections are created and configured
- [ ] Verify Cloudinary credentials are configured
- [ ] Check that Switchboard Canvas API credentials are set

### Test Data Preparation
- [ ] Run the data migration script if migrating from existing Supabase data
- [ ] Create test users with different roles (admin, staff, viewer)
- [ ] Prepare test attendee data (at least 50-100 records for performance testing)
- [ ] Have test images ready for photo uploads (various sizes and formats)

### Browser Setup
- [ ] Test in Chrome/Edge (primary browser)
- [ ] Test in Firefox (secondary browser)
- [ ] Test in Safari (if on macOS)
- [ ] Open browser DevTools Console to monitor for errors
- [ ] Clear browser cache and cookies before starting

---

## 1. Authentication Testing

### 1.1 Email/Password Sign Up
**Test Case**: New user registration

**Steps**:
1. Navigate to `/signup`
2. Enter a new email address
3. Enter a strong password (min 8 characters)
4. Click "Sign Up"

**Expected Results**:
- [ ] User account is created in Appwrite Auth
- [ ] User is redirected to dashboard or onboarding
- [ ] User profile document is created in `users` collection
- [ ] No console errors appear
- [ ] Success message is displayed

**Edge Cases to Test**:
- [ ] Duplicate email shows appropriate error
- [ ] Weak password is rejected with clear message
- [ ] Invalid email format is rejected
- [ ] Form validation works (required fields)


### 1.2 Email/Password Login
**Test Case**: Existing user login

**Steps**:
1. Navigate to `/login`
2. Enter registered email
3. Enter correct password
4. Click "Login"

**Expected Results**:
- [ ] User is authenticated via Appwrite Auth
- [ ] Session is created and stored in cookies
- [ ] User is redirected to dashboard
- [ ] User profile data loads correctly
- [ ] AuthContext provides user data

**Edge Cases to Test**:
- [ ] Wrong password shows error
- [ ] Non-existent email shows error
- [ ] Empty fields show validation errors
- [ ] Rate limiting works after multiple failed attempts

### 1.3 Magic Link Login
**Test Case**: Passwordless authentication

**Steps**:
1. Navigate to `/magic-link-login`
2. Enter registered email
3. Click "Send Magic Link"
4. Check email inbox
5. Click the magic link

**Expected Results**:
- [ ] Magic link email is sent via Appwrite
- [ ] Email contains valid authentication link
- [ ] Clicking link authenticates user
- [ ] User is redirected to dashboard
- [ ] Session is properly established


### 1.4 OAuth Login (Google)
**Test Case**: Third-party authentication

**Steps**:
1. Navigate to `/login`
2. Click "Sign in with Google"
3. Complete Google OAuth flow
4. Authorize the application

**Expected Results**:
- [ ] OAuth flow initiates correctly
- [ ] User is redirected to Google login
- [ ] After authorization, user returns to app
- [ ] User account is created/linked in Appwrite
- [ ] User profile is created if new user
- [ ] Session is established

### 1.5 Password Reset
**Test Case**: Forgot password flow

**Steps**:
1. Navigate to `/forgot-password`
2. Enter registered email
3. Click "Send Reset Link"
4. Check email inbox
5. Click reset link
6. Enter new password
7. Confirm new password
8. Submit

**Expected Results**:
- [ ] Reset email is sent via Appwrite
- [ ] Reset link is valid and not expired
- [ ] Password update succeeds
- [ ] User can login with new password
- [ ] Old password no longer works


### 1.6 Session Management
**Test Case**: Session persistence and logout

**Steps**:
1. Login successfully
2. Refresh the page
3. Close and reopen browser
4. Click logout

**Expected Results**:
- [ ] Session persists after page refresh
- [ ] Session persists after browser reopen (if not expired)
- [ ] User data loads on page refresh
- [ ] Logout clears session
- [ ] After logout, user is redirected to login
- [ ] Protected routes redirect to login after logout

### 1.7 Protected Routes
**Test Case**: Authorization checks

**Steps**:
1. Without logging in, try to access `/dashboard`
2. Try to access `/private`
3. Login and access the same routes

**Expected Results**:
- [ ] Unauthenticated users are redirected to login
- [ ] After login, users can access protected routes
- [ ] Redirect preserves intended destination
- [ ] No flash of protected content before redirect

---

## 2. User Management Testing

### 2.1 View User List
**Test Case**: Display all users (Admin only)

**Steps**:
1. Login as admin user
2. Navigate to users management page
3. View the user list

**Expected Results**:
- [ ] All users from Appwrite are displayed
- [ ] User data includes email, name, role
- [ ] List is paginated if many users
- [ ] Sorting works (by name, email, date)
- [ ] Search/filter functionality works


### 2.2 Create User via Invitation
**Test Case**: Invite new user

**Steps**:
1. Login as admin
2. Navigate to user invitation page
3. Enter new user email
4. Select role
5. Send invitation
6. Check recipient email
7. Click invitation link
8. Complete registration

**Expected Results**:
- [ ] Invitation is created in Appwrite
- [ ] Invitation email is sent
- [ ] Token is unique and secure
- [ ] Invitation link works
- [ ] User can set password
- [ ] User account is created with correct role
- [ ] Invitation is marked as used

**Edge Cases**:
- [ ] Expired invitation shows error
- [ ] Already used invitation shows error
- [ ] Invalid token shows error

### 2.3 Update User Role
**Test Case**: Change user permissions

**Steps**:
1. Login as admin
2. Select a user
3. Change their role
4. Save changes
5. Verify with that user's account

**Expected Results**:
- [ ] Role is updated in Appwrite
- [ ] User's permissions change immediately
- [ ] User sees appropriate UI based on new role
- [ ] Activity is logged


### 2.4 Delete User
**Test Case**: Remove user account

**Steps**:
1. Login as admin
2. Select a user
3. Click delete
4. Confirm deletion
5. Try to login as deleted user

**Expected Results**:
- [ ] User is removed from Appwrite Auth
- [ ] User document is deleted from database
- [ ] Related data is handled appropriately
- [ ] Deleted user cannot login
- [ ] Activity is logged

---

## 3. Attendee Management Testing

### 3.1 Create Single Attendee
**Test Case**: Add new attendee

**Steps**:
1. Login with appropriate permissions
2. Navigate to attendee creation form
3. Fill in required fields (firstName, lastName)
4. Fill in custom fields if configured
5. Upload photo (optional)
6. Submit form

**Expected Results**:
- [ ] Attendee is created in Appwrite
- [ ] Barcode number is auto-generated (if configured)
- [ ] Photo is uploaded to Cloudinary
- [ ] Custom field values are saved correctly
- [ ] Success message is displayed
- [ ] Attendee appears in list
- [ ] Activity is logged

**Edge Cases**:
- [ ] Duplicate barcode is rejected
- [ ] Required fields validation works
- [ ] Invalid photo format is rejected
- [ ] Large photo files are handled
- [ ] Custom field validation works


### 3.2 View Attendee List
**Test Case**: Display all attendees

**Steps**:
1. Navigate to attendees page
2. View the list
3. Test pagination
4. Test sorting
5. Test search/filter

**Expected Results**:
- [ ] All attendees load from Appwrite
- [ ] List displays correctly with all fields
- [ ] Photos display correctly
- [ ] Pagination works (next/prev, page numbers)
- [ ] Sorting works (by name, barcode, date)
- [ ] Search finds attendees by name/barcode
- [ ] Filter by custom fields works
- [ ] Performance is acceptable with 100+ records

### 3.3 Update Attendee
**Test Case**: Edit existing attendee

**Steps**:
1. Select an attendee
2. Click edit
3. Modify fields
4. Change photo
5. Update custom fields
6. Save changes

**Expected Results**:
- [ ] Attendee data is updated in Appwrite
- [ ] New photo replaces old one in Cloudinary
- [ ] Custom field values update correctly
- [ ] Changes reflect immediately in list
- [ ] Activity is logged
- [ ] $updatedAt timestamp is updated


### 3.4 Delete Attendee
**Test Case**: Remove attendee

**Steps**:
1. Select an attendee
2. Click delete
3. Confirm deletion

**Expected Results**:
- [ ] Attendee is deleted from Appwrite
- [ ] Photo is removed from Cloudinary (if configured)
- [ ] Attendee no longer appears in list
- [ ] Activity is logged
- [ ] Related logs remain (for audit trail)

### 3.5 Bulk Import Attendees
**Test Case**: Import multiple attendees from CSV

**Steps**:
1. Prepare CSV file with attendee data
2. Navigate to import page
3. Upload CSV file
4. Map CSV columns to fields
5. Preview import
6. Confirm import

**Expected Results**:
- [ ] CSV is parsed correctly
- [ ] Column mapping works
- [ ] Preview shows correct data
- [ ] All attendees are created in Appwrite
- [ ] Barcode numbers are generated
- [ ] Custom fields are populated
- [ ] Import summary shows success/errors
- [ ] Activity is logged

**Edge Cases**:
- [ ] Invalid CSV format shows error
- [ ] Duplicate barcodes are handled
- [ ] Missing required fields show errors
- [ ] Large files (1000+ rows) are handled
- [ ] Partial import on errors works


### 3.6 Bulk Export Attendees
**Test Case**: Export attendees to CSV

**Steps**:
1. Navigate to attendees page
2. Select attendees (or export all)
3. Click export
4. Choose format (CSV/PDF)
5. Download file

**Expected Results**:
- [ ] Export file is generated
- [ ] All selected attendees are included
- [ ] All fields are exported correctly
- [ ] Custom fields are included
- [ ] File downloads successfully
- [ ] CSV format is valid
- [ ] PDF format is readable (if applicable)

### 3.7 Bulk Delete Attendees
**Test Case**: Delete multiple attendees

**Steps**:
1. Select multiple attendees
2. Click bulk delete
3. Confirm deletion

**Expected Results**:
- [ ] All selected attendees are deleted
- [ ] Deletion is atomic (all or none if possible)
- [ ] Success/error summary is shown
- [ ] Activity is logged for each deletion
- [ ] Photos are cleaned up

---

## 4. Custom Fields Testing

### 4.1 Create Custom Field
**Test Case**: Add new custom field

**Steps**:
1. Login as admin
2. Navigate to custom fields settings
3. Click "Add Custom Field"
4. Enter field name
5. Select field type (text, number, date, select, checkbox)
6. Configure options (for select type)
7. Set required flag
8. Save

**Expected Results**:
- [ ] Custom field is created in Appwrite
- [ ] Field appears in attendee forms
- [ ] Field validation works based on type
- [ ] Required flag is enforced
- [ ] Activity is logged


### 4.2 Update Custom Field
**Test Case**: Modify existing custom field

**Steps**:
1. Select a custom field
2. Edit properties
3. Save changes
4. Test with attendee form

**Expected Results**:
- [ ] Custom field is updated in Appwrite
- [ ] Changes reflect in attendee forms
- [ ] Existing attendee data is preserved
- [ ] Validation updates correctly

### 4.3 Reorder Custom Fields
**Test Case**: Change field display order

**Steps**:
1. Navigate to custom fields settings
2. Drag and drop fields to reorder
3. Save order
4. Check attendee form

**Expected Results**:
- [ ] Field order is saved in Appwrite
- [ ] Attendee form displays fields in new order
- [ ] Order persists after page refresh

### 4.4 Delete Custom Field
**Test Case**: Remove custom field

**Steps**:
1. Select a custom field
2. Click delete
3. Confirm deletion
4. Check attendee forms and data

**Expected Results**:
- [ ] Custom field is deleted from Appwrite
- [ ] Field no longer appears in forms
- [ ] Existing attendee data is handled gracefully
- [ ] No errors when viewing attendees with old data

---

## 5. Event Settings Testing

### 5.1 View Event Settings
**Test Case**: Display current configuration

**Steps**:
1. Login as admin
2. Navigate to event settings
3. View all settings

**Expected Results**:
- [ ] Settings load from Appwrite
- [ ] All configuration options are displayed
- [ ] Current values are shown correctly


### 5.2 Update Barcode Settings
**Test Case**: Configure barcode generation

**Steps**:
1. Navigate to event settings
2. Change barcode type (numerical/alphanumerical)
3. Change barcode length
4. Enable/disable auto-generation
5. Save settings
6. Create new attendee to test

**Expected Results**:
- [ ] Settings are saved in Appwrite
- [ ] New attendees get barcodes per new settings
- [ ] Barcode uniqueness is enforced
- [ ] Validation works for manual entry

### 5.3 Update Switchboard Settings
**Test Case**: Configure credential printing

**Steps**:
1. Navigate to event settings
2. Update Switchboard API credentials
3. Configure field mappings
4. Save settings

**Expected Results**:
- [ ] Settings are saved in Appwrite
- [ ] Field mappings are stored correctly
- [ ] Credentials are encrypted/secure
- [ ] Test print works with new settings

### 5.4 Update General Event Info
**Test Case**: Modify event details

**Steps**:
1. Update event name
2. Update event dates
3. Update other event metadata
4. Save changes

**Expected Results**:
- [ ] All changes are saved in Appwrite
- [ ] Changes reflect throughout the app
- [ ] Activity is logged

---

## 6. Role and Permission Testing

### 6.1 Create Role
**Test Case**: Add new role

**Steps**:
1. Login as admin
2. Navigate to roles management
3. Click "Create Role"
4. Enter role name and description
5. Configure permissions
6. Save role

**Expected Results**:
- [ ] Role is created in Appwrite
- [ ] Permissions are stored as JSON
- [ ] Role appears in user assignment dropdown
- [ ] Activity is logged


### 6.2 Update Role Permissions
**Test Case**: Modify role access

**Steps**:
1. Select a role
2. Change permissions (add/remove)
3. Save changes
4. Test with user having that role

**Expected Results**:
- [ ] Permissions are updated in Appwrite
- [ ] Users with role see immediate permission changes
- [ ] UI updates based on new permissions
- [ ] API endpoints enforce new permissions

### 6.3 Permission Enforcement - Admin Role
**Test Case**: Verify admin access

**Steps**:
1. Login as admin user
2. Try to access all features
3. Try all CRUD operations

**Expected Results**:
- [ ] Admin can access all pages
- [ ] Admin can create/read/update/delete all entities
- [ ] Admin can manage users and roles
- [ ] Admin can view and configure settings
- [ ] Admin can view all logs

### 6.4 Permission Enforcement - Staff Role
**Test Case**: Verify staff access

**Steps**:
1. Login as staff user
2. Try to access various features
3. Try CRUD operations

**Expected Results**:
- [ ] Staff can manage attendees
- [ ] Staff cannot access admin settings
- [ ] Staff cannot manage users/roles
- [ ] Staff has limited log access
- [ ] Unauthorized actions show appropriate errors


### 6.5 Permission Enforcement - Viewer Role
**Test Case**: Verify read-only access

**Steps**:
1. Login as viewer user
2. Try to access various features
3. Try to modify data

**Expected Results**:
- [ ] Viewer can view attendees
- [ ] Viewer cannot create/edit/delete attendees
- [ ] Viewer cannot access settings
- [ ] Viewer cannot manage users
- [ ] Edit/delete buttons are hidden or disabled
- [ ] API calls for modifications are rejected

### 6.6 Delete Role
**Test Case**: Remove role

**Steps**:
1. Create a test role
2. Assign it to a user
3. Try to delete the role
4. Reassign users if needed
5. Delete role

**Expected Results**:
- [ ] Cannot delete role if users are assigned
- [ ] After reassigning users, role can be deleted
- [ ] Role is removed from Appwrite
- [ ] Activity is logged

---

## 7. Activity Logging Testing

### 7.1 View Activity Logs
**Test Case**: Display audit trail

**Steps**:
1. Login with log viewing permissions
2. Navigate to logs page
3. View recent activities

**Expected Results**:
- [ ] Logs load from Appwrite
- [ ] Logs show user, action, timestamp
- [ ] Logs are sorted by date (newest first)
- [ ] Pagination works
- [ ] Details are expandable


### 7.2 Filter Logs
**Test Case**: Search and filter logs

**Steps**:
1. Navigate to logs page
2. Filter by user
3. Filter by action type
4. Filter by date range
5. Search by keywords

**Expected Results**:
- [ ] Filters work correctly
- [ ] Multiple filters can be combined
- [ ] Results update in real-time
- [ ] Clear filters works

### 7.3 Export Logs
**Test Case**: Download audit trail

**Steps**:
1. Navigate to logs page
2. Apply filters (optional)
3. Click export
4. Download file

**Expected Results**:
- [ ] Export file is generated
- [ ] All filtered logs are included
- [ ] File format is valid (CSV/PDF)
- [ ] All log details are included

### 7.4 Delete Logs
**Test Case**: Clean up old logs (Admin only)

**Steps**:
1. Login as admin
2. Select logs to delete
3. Confirm deletion

**Expected Results**:
- [ ] Selected logs are deleted from Appwrite
- [ ] Only admin can delete logs
- [ ] Deletion itself is logged
- [ ] Cannot delete all logs (keep audit trail)

### 7.5 Log Settings
**Test Case**: Configure what gets logged

**Steps**:
1. Login as admin
2. Navigate to log settings
3. Enable/disable various log types
4. Save settings
5. Perform actions to test

**Expected Results**:
- [ ] Settings are saved in Appwrite
- [ ] Disabled log types are not recorded
- [ ] Enabled log types are recorded
- [ ] Settings persist after refresh


---

## 8. Real-time Updates Testing

### 8.1 Real-time Attendee Updates
**Test Case**: Live data synchronization

**Steps**:
1. Open dashboard in two browser windows
2. Login as different users in each
3. In window 1, create an attendee
4. Observe window 2

**Expected Results**:
- [ ] New attendee appears in window 2 without refresh
- [ ] Update happens within 1-2 seconds
- [ ] No console errors
- [ ] UI updates smoothly

### 8.2 Real-time Attendee Edits
**Test Case**: Live edit synchronization

**Steps**:
1. Open attendee list in two windows
2. In window 1, edit an attendee
3. Observe window 2

**Expected Results**:
- [ ] Changes appear in window 2 without refresh
- [ ] All fields update correctly
- [ ] Photo updates if changed

### 8.3 Real-time Attendee Deletion
**Test Case**: Live deletion synchronization

**Steps**:
1. Open attendee list in two windows
2. In window 1, delete an attendee
3. Observe window 2

**Expected Results**:
- [ ] Deleted attendee disappears from window 2
- [ ] No errors occur
- [ ] List updates smoothly


### 8.4 Real-time Log Updates
**Test Case**: Live log synchronization

**Steps**:
1. Open logs page in two windows
2. In window 1, perform logged actions
3. Observe window 2

**Expected Results**:
- [ ] New logs appear in window 2 without refresh
- [ ] Logs appear in correct order
- [ ] All log details are visible

### 8.5 Real-time Connection Handling
**Test Case**: Connection resilience

**Steps**:
1. Open dashboard
2. Disconnect internet
3. Reconnect internet
4. Perform actions

**Expected Results**:
- [ ] App detects disconnection
- [ ] App shows offline indicator (if implemented)
- [ ] App reconnects automatically
- [ ] Real-time updates resume after reconnection
- [ ] No data loss occurs

---

## 9. Credential Generation Testing

### 9.1 Generate Single Credential
**Test Case**: Print one credential

**Steps**:
1. Select an attendee with photo
2. Click "Generate Credential"
3. Wait for processing

**Expected Results**:
- [ ] Credential is generated via Switchboard API
- [ ] Credential URL is saved in Appwrite
- [ ] Generation timestamp is recorded
- [ ] Credential can be downloaded/viewed
- [ ] Activity is logged


### 9.2 Bulk Credential Generation
**Test Case**: Print multiple credentials

**Steps**:
1. Select multiple attendees
2. Click "Generate Credentials"
3. Wait for batch processing

**Expected Results**:
- [ ] All credentials are generated
- [ ] Progress indicator shows status
- [ ] Success/error summary is displayed
- [ ] All credential URLs are saved
- [ ] Activity is logged for each

**Edge Cases**:
- [ ] Attendees without photos are handled
- [ ] API rate limits are respected
- [ ] Partial failures are handled gracefully
- [ ] Large batches (50+) complete successfully

### 9.3 Regenerate Credential
**Test Case**: Replace existing credential

**Steps**:
1. Select attendee with existing credential
2. Click "Regenerate Credential"
3. Confirm action

**Expected Results**:
- [ ] New credential is generated
- [ ] Old credential URL is replaced
- [ ] New timestamp is recorded
- [ ] Activity is logged

---

## 10. UI/UX Testing

### 10.1 Responsive Design
**Test Case**: Mobile and tablet layouts

**Steps**:
1. Open app on desktop (1920x1080)
2. Open app on tablet (768x1024)
3. Open app on mobile (375x667)
4. Test all major pages

**Expected Results**:
- [ ] Layout adapts to screen size
- [ ] All features are accessible on mobile
- [ ] Navigation works on all devices
- [ ] Forms are usable on mobile
- [ ] Tables scroll horizontally if needed
- [ ] Touch targets are appropriately sized


### 10.2 Error Messages
**Test Case**: User-friendly error handling

**Steps**:
1. Trigger various errors intentionally
2. Check error messages

**Expected Results**:
- [ ] Network errors show clear messages
- [ ] Validation errors are specific
- [ ] Authentication errors are helpful
- [ ] Permission errors explain the issue
- [ ] Error messages are not technical jargon
- [ ] Errors don't expose sensitive info

### 10.3 Loading States
**Test Case**: User feedback during operations

**Steps**:
1. Perform various operations
2. Observe loading indicators

**Expected Results**:
- [ ] Loading spinners appear during API calls
- [ ] Buttons show loading state when clicked
- [ ] Skeleton loaders appear for lists
- [ ] Progress bars show for long operations
- [ ] User cannot double-submit forms

### 10.4 Success Feedback
**Test Case**: Confirmation messages

**Steps**:
1. Perform successful operations
2. Check for feedback

**Expected Results**:
- [ ] Success messages appear after actions
- [ ] Messages are clear and specific
- [ ] Messages auto-dismiss after few seconds
- [ ] Messages don't block UI
- [ ] Toast notifications work correctly

### 10.5 Form Validation
**Test Case**: Client-side validation

**Steps**:
1. Try to submit forms with invalid data
2. Check validation messages

**Expected Results**:
- [ ] Required fields show errors when empty
- [ ] Email format is validated
- [ ] Number fields only accept numbers
- [ ] Date fields validate date format
- [ ] Custom field validation works
- [ ] Errors appear inline near fields
- [ ] Form cannot be submitted with errors


---

## 11. Performance Testing

### 11.1 Page Load Performance
**Test Case**: Initial load times

**Steps**:
1. Clear browser cache
2. Open DevTools Network tab
3. Navigate to each major page
4. Record load times

**Expected Results**:
- [ ] Login page loads in < 2 seconds
- [ ] Dashboard loads in < 3 seconds
- [ ] Attendee list loads in < 3 seconds
- [ ] No unnecessary API calls
- [ ] Images are optimized
- [ ] JavaScript bundles are reasonable size

### 11.2 Large Dataset Performance
**Test Case**: Performance with production-like data

**Steps**:
1. Ensure database has 500+ attendees
2. Navigate to attendee list
3. Test pagination
4. Test search
5. Test sorting

**Expected Results**:
- [ ] List loads in < 3 seconds
- [ ] Pagination is smooth
- [ ] Search returns results in < 1 second
- [ ] Sorting completes in < 2 seconds
- [ ] No browser freezing
- [ ] Memory usage is reasonable

### 11.3 Concurrent User Testing
**Test Case**: Multiple users simultaneously

**Steps**:
1. Open app in 5+ browser windows
2. Login as different users
3. Perform various operations simultaneously

**Expected Results**:
- [ ] All users can work without conflicts
- [ ] Real-time updates work for all users
- [ ] No race conditions occur
- [ ] Data integrity is maintained
- [ ] Performance remains acceptable


### 11.4 API Response Times
**Test Case**: Backend performance

**Steps**:
1. Open DevTools Network tab
2. Perform various operations
3. Check API response times

**Expected Results**:
- [ ] GET requests complete in < 500ms
- [ ] POST requests complete in < 1 second
- [ ] Bulk operations complete in reasonable time
- [ ] No timeout errors
- [ ] Appwrite API calls are efficient

---

## 12. Data Integrity Testing

### 12.1 Data Consistency
**Test Case**: Verify data accuracy

**Steps**:
1. Create test data with known values
2. Retrieve data through different endpoints
3. Compare values

**Expected Results**:
- [ ] Data retrieved matches data created
- [ ] No data corruption occurs
- [ ] Timestamps are accurate
- [ ] Relationships are preserved
- [ ] JSON fields parse correctly

### 12.2 Custom Field Data Integrity
**Test Case**: Custom field values

**Steps**:
1. Create attendee with custom field values
2. Update custom field definition
3. View attendee data
4. Delete custom field
5. View attendee data again

**Expected Results**:
- [ ] Custom field values are stored correctly
- [ ] Values persist after field updates
- [ ] Values remain after field deletion
- [ ] No data loss occurs
- [ ] Invalid values are rejected


### 12.3 Relationship Integrity
**Test Case**: Foreign key relationships

**Steps**:
1. Create user with role
2. Delete role
3. Check user data
4. Create attendee
5. Delete attendee
6. Check logs

**Expected Results**:
- [ ] Cannot delete role if users are assigned
- [ ] Deleting attendee doesn't delete logs
- [ ] Orphaned references are handled gracefully
- [ ] Cascade deletes work where appropriate

### 12.4 Concurrent Update Handling
**Test Case**: Simultaneous edits

**Steps**:
1. Open same attendee in two windows
2. Edit different fields in each window
3. Save both

**Expected Results**:
- [ ] Last write wins (or conflict resolution)
- [ ] No data corruption occurs
- [ ] User is notified of conflicts (if implemented)
- [ ] $updatedAt reflects latest change

---

## 13. Security Testing

### 13.1 Session Security
**Test Case**: Session hijacking prevention

**Steps**:
1. Login and get session cookie
2. Try to use session from different IP (if possible)
3. Try to modify session cookie
4. Check session expiration

**Expected Results**:
- [ ] Sessions are HTTP-only cookies
- [ ] Sessions have secure flag in production
- [ ] Modified sessions are rejected
- [ ] Sessions expire after configured time
- [ ] Expired sessions redirect to login


### 13.2 API Authorization
**Test Case**: Endpoint protection

**Steps**:
1. Try to access API endpoints without authentication
2. Try to access endpoints with insufficient permissions
3. Try to access other users' data

**Expected Results**:
- [ ] Unauthenticated requests return 401
- [ ] Unauthorized requests return 403
- [ ] Users cannot access others' private data
- [ ] Admin endpoints require admin role
- [ ] API key is never exposed to client

### 13.3 Input Sanitization
**Test Case**: XSS and injection prevention

**Steps**:
1. Try to input HTML/JavaScript in text fields
2. Try SQL injection patterns (if applicable)
3. Try special characters in all fields

**Expected Results**:
- [ ] HTML is escaped in output
- [ ] Scripts don't execute
- [ ] Special characters are handled safely
- [ ] No injection vulnerabilities
- [ ] File uploads are validated

### 13.4 Rate Limiting
**Test Case**: Abuse prevention

**Steps**:
1. Make rapid repeated requests
2. Try multiple login attempts
3. Try bulk operations repeatedly

**Expected Results**:
- [ ] Rate limiting is enforced
- [ ] Too many requests return 429
- [ ] User is notified of rate limit
- [ ] Rate limit resets after time period

---

## 14. Browser Compatibility Testing

### 14.1 Chrome/Edge Testing
**Test Case**: Chromium-based browsers

**Steps**:
1. Test all features in Chrome
2. Test all features in Edge

**Expected Results**:
- [ ] All features work correctly
- [ ] UI renders properly
- [ ] No console errors
- [ ] Performance is good


### 14.2 Firefox Testing
**Test Case**: Mozilla Firefox

**Steps**:
1. Test all features in Firefox
2. Check for Firefox-specific issues

**Expected Results**:
- [ ] All features work correctly
- [ ] UI renders properly
- [ ] No console errors
- [ ] Real-time updates work

### 14.3 Safari Testing (macOS/iOS)
**Test Case**: WebKit-based browsers

**Steps**:
1. Test all features in Safari
2. Check for Safari-specific issues

**Expected Results**:
- [ ] All features work correctly
- [ ] UI renders properly
- [ ] Date pickers work
- [ ] File uploads work
- [ ] No console errors

---

## 15. Migration Validation

### 15.1 Data Migration Verification
**Test Case**: Migrated data accuracy

**Steps**:
1. Compare record counts (Supabase vs Appwrite)
2. Spot check individual records
3. Verify relationships
4. Check for missing data

**Expected Results**:
- [ ] All users migrated successfully
- [ ] All attendees migrated successfully
- [ ] All roles migrated successfully
- [ ] All custom fields migrated successfully
- [ ] All event settings migrated successfully
- [ ] All logs migrated successfully
- [ ] All invitations migrated successfully
- [ ] Record counts match
- [ ] No data corruption
- [ ] Relationships are intact


### 15.2 User Authentication Migration
**Test Case**: Migrated users can login

**Steps**:
1. Get list of users from old system
2. Try to login as each user
3. Verify user data

**Expected Results**:
- [ ] All users can login with existing credentials
- [ ] User profiles are complete
- [ ] Roles are assigned correctly
- [ ] Permissions work correctly

### 15.3 Photo Migration
**Test Case**: Attendee photos

**Steps**:
1. Check attendees with photos
2. Verify photo URLs work
3. Check photo display in UI

**Expected Results**:
- [ ] All photo URLs are valid
- [ ] Photos display correctly
- [ ] Cloudinary links work
- [ ] No broken images

---

## 16. Edge Cases and Error Scenarios

### 16.1 Network Interruption
**Test Case**: Offline handling

**Steps**:
1. Start an operation
2. Disconnect network mid-operation
3. Reconnect network

**Expected Results**:
- [ ] User is notified of network issue
- [ ] Operation fails gracefully
- [ ] User can retry operation
- [ ] No data corruption occurs

### 16.2 Large File Upload
**Test Case**: Photo size limits

**Steps**:
1. Try to upload very large photo (>10MB)
2. Try to upload invalid file type
3. Try to upload corrupted image

**Expected Results**:
- [ ] Large files are rejected with clear message
- [ ] Invalid types are rejected
- [ ] Corrupted files are rejected
- [ ] File size limit is enforced


### 16.3 Expired Session
**Test Case**: Session timeout handling

**Steps**:
1. Login
2. Wait for session to expire (or manually expire)
3. Try to perform an operation

**Expected Results**:
- [ ] User is notified of expired session
- [ ] User is redirected to login
- [ ] After re-login, user returns to intended page
- [ ] No data loss occurs

### 16.4 Duplicate Data
**Test Case**: Uniqueness constraints

**Steps**:
1. Try to create attendee with duplicate barcode
2. Try to create user with duplicate email
3. Try to create role with duplicate name

**Expected Results**:
- [ ] Duplicates are rejected
- [ ] Clear error message is shown
- [ ] User can correct the issue
- [ ] No partial data is created

### 16.5 Missing Required Data
**Test Case**: Data dependencies

**Steps**:
1. Try to create attendee without event settings
2. Try to assign non-existent role to user
3. Try to use deleted custom field

**Expected Results**:
- [ ] Missing dependencies are detected
- [ ] Clear error message is shown
- [ ] Application doesn't crash
- [ ] User is guided to fix the issue

---

## 17. Accessibility Testing

### 17.1 Keyboard Navigation
**Test Case**: Keyboard-only usage

**Steps**:
1. Navigate entire app using only keyboard
2. Use Tab to move between elements
3. Use Enter/Space to activate buttons
4. Use arrow keys in lists

**Expected Results**:
- [ ] All interactive elements are reachable
- [ ] Focus indicators are visible
- [ ] Tab order is logical
- [ ] Keyboard shortcuts work (if any)
- [ ] No keyboard traps exist


### 17.2 Screen Reader Compatibility
**Test Case**: Assistive technology support

**Steps**:
1. Use screen reader (NVDA, JAWS, or VoiceOver)
2. Navigate through pages
3. Fill out forms
4. Interact with components

**Expected Results**:
- [ ] All content is announced
- [ ] Form labels are associated correctly
- [ ] Error messages are announced
- [ ] Button purposes are clear
- [ ] Images have alt text
- [ ] ARIA labels are appropriate

### 17.3 Color Contrast
**Test Case**: Visual accessibility

**Steps**:
1. Check text contrast ratios
2. Test with color blindness simulators
3. Check focus indicators

**Expected Results**:
- [ ] Text meets WCAG AA standards (4.5:1)
- [ ] Important info isn't color-only
- [ ] Focus indicators are visible
- [ ] Links are distinguishable

---

## 18. Documentation Verification

### 18.1 README Accuracy
**Test Case**: Setup instructions

**Steps**:
1. Follow README setup instructions
2. Verify all steps work
3. Check for outdated information

**Expected Results**:
- [ ] Setup instructions are accurate
- [ ] All environment variables are documented
- [ ] Appwrite setup is explained
- [ ] No Supabase references remain
- [ ] Commands work as documented

### 18.2 API Documentation
**Test Case**: Endpoint documentation

**Steps**:
1. Review API documentation
2. Test documented endpoints
3. Verify request/response formats

**Expected Results**:
- [ ] All endpoints are documented
- [ ] Request formats are correct
- [ ] Response formats are correct
- [ ] Authentication is explained
- [ ] Error codes are documented


---

## 19. Production Readiness Checklist

### 19.1 Environment Configuration
- [ ] All environment variables are set correctly
- [ ] API keys are secure and not exposed
- [ ] Appwrite project is in production mode
- [ ] CORS settings are configured properly
- [ ] SSL/TLS is enabled
- [ ] Domain is configured correctly

### 19.2 Performance Optimization
- [ ] Images are optimized
- [ ] JavaScript bundles are minimized
- [ ] Caching is configured
- [ ] CDN is set up (if applicable)
- [ ] Database indexes are created
- [ ] API response times are acceptable

### 19.3 Security Hardening
- [ ] All dependencies are up to date
- [ ] Security headers are configured
- [ ] Rate limiting is enabled
- [ ] Input validation is comprehensive
- [ ] Error messages don't leak sensitive info
- [ ] Logging excludes sensitive data

### 19.4 Monitoring and Logging
- [ ] Error tracking is set up (Sentry, etc.)
- [ ] Analytics are configured
- [ ] Performance monitoring is enabled
- [ ] Uptime monitoring is configured
- [ ] Log aggregation is set up
- [ ] Alerts are configured

### 19.5 Backup and Recovery
- [ ] Appwrite backups are configured
- [ ] Backup restoration is tested
- [ ] Disaster recovery plan exists
- [ ] Data retention policy is defined

---

## 20. Final Validation

### 20.1 Smoke Test
**Test Case**: Critical path verification

**Steps**:
1. Login as admin
2. Create an attendee
3. Upload photo
4. Generate credential
5. View logs
6. Logout

**Expected Results**:
- [ ] All steps complete successfully
- [ ] No errors occur
- [ ] Performance is acceptable
- [ ] Data is saved correctly


### 20.2 User Acceptance Testing
**Test Case**: Real-world usage

**Steps**:
1. Have actual users test the application
2. Observe their workflow
3. Collect feedback
4. Document issues

**Expected Results**:
- [ ] Users can complete their tasks
- [ ] Workflow is intuitive
- [ ] No major usability issues
- [ ] Performance meets expectations
- [ ] Users are satisfied with migration

### 20.3 Regression Testing
**Test Case**: Verify no features broke

**Steps**:
1. Test all features that existed before migration
2. Compare behavior with old system
3. Verify feature parity

**Expected Results**:
- [ ] All original features still work
- [ ] No functionality was lost
- [ ] Behavior matches old system
- [ ] Performance is equal or better

---

## Test Results Summary

### Overall Statistics
- **Total Test Cases**: ___
- **Passed**: ___
- **Failed**: ___
- **Blocked**: ___
- **Not Tested**: ___

### Critical Issues Found
1. 
2. 
3. 

### Medium Issues Found
1. 
2. 
3. 

### Minor Issues Found
1. 
2. 
3. 

### Performance Metrics
- **Average Page Load Time**: ___ seconds
- **Average API Response Time**: ___ ms
- **Largest Dataset Tested**: ___ records
- **Concurrent Users Tested**: ___

### Browser Compatibility
- **Chrome**: ✓ / ✗
- **Firefox**: ✓ / ✗
- **Safari**: ✓ / ✗
- **Edge**: ✓ / ✗

### Sign-off
- **Tested By**: _______________
- **Date**: _______________
- **Approved By**: _______________
- **Date**: _______________

---

## Notes and Observations

Use this section to document any additional findings, concerns, or recommendations:


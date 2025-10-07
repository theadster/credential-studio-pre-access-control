# Manual Testing Guide: Integration Fields Mapping Fix

## Overview

This guide provides detailed step-by-step instructions for manually testing the integration fields mapping fix. The fix ensures that all Cloudinary, Switchboard Canvas, and OneSimpleAPI integration settings are properly saved, retrieved, and displayed in the UI.

## Prerequisites

Before starting the tests, ensure:

1. ✅ The development server is running (`npm run dev`)
2. ✅ You have admin access to the application
3. ✅ You have access to the Appwrite console (for Task 7.4)
4. ✅ Event settings have been created (or you can create new ones during testing)

## Test Environment Setup

### Starting the Development Server

```bash
npm run dev
```

The application should be accessible at `http://localhost:3000`

### Accessing Event Settings

1. Log in to the application with admin credentials
2. Navigate to the Dashboard
3. Click on "Event Settings" or the settings icon
4. The Event Settings Form should open in a modal dialog

---

## Task 7.1: Test Cloudinary Integration UI

### Objective
Verify that all Cloudinary integration fields display current values correctly and persist after saving.

### Test Steps

#### Step 1: Open Event Settings Form
1. Navigate to the dashboard
2. Click on "Event Settings" button/icon
3. **Expected**: Event Settings modal opens
4. Click on the "Integrations" tab
5. **Expected**: Integration settings are displayed

#### Step 2: Verify Cloudinary Section Visibility
1. Locate the "Cloudinary Integration" card
2. **Expected**: Card has a title "Cloudinary Integration" with a Settings icon
3. **Expected**: Card has a description "Configure Cloudinary for image uploads and management"

#### Step 3: Enable Cloudinary Integration
1. Find the "Enable Cloudinary Integration" toggle switch
2. If disabled, toggle it ON
3. **Expected**: Additional Cloudinary configuration fields appear below the toggle

#### Step 4: Verify API Credentials Fields Display
Check that the following fields are visible and display current values:

- [ ] **Cloud Name** field
  - Input field with placeholder "your-cloud-name"
  - Shows current value if previously saved
  
- [ ] **API Key** field
  - Input field with placeholder "123456789012345"
  - Shows current value if previously saved
  
- [ ] **API Secret** field
  - Password input field with placeholder "••••••••••••••••••••••••••••"
  - Shows current value if previously saved (masked)
  
- [ ] **Upload Preset** field
  - Input field with placeholder "your-upload-preset"
  - Shows current value if previously saved

#### Step 5: Verify Upload Settings Switches
Check that the following switches are visible and show current state:

- [ ] **Auto-optimize images** switch
  - Located in "Upload Settings" section
  - Shows current ON/OFF state
  - Has description: "Automatically optimize uploaded images"
  
- [ ] **Generate thumbnails** switch
  - Located in "Upload Settings" section
  - Shows current ON/OFF state
  - Has description: "Create thumbnail versions of images"

#### Step 6: Verify Crop Settings
Check that the following crop settings are visible:

- [ ] **Disable "Skip Crop" button** switch
  - Located in "Crop Settings" section
  - Shows current ON/OFF state
  - Has description: "Force users to crop their images before uploading"
  
- [ ] **Crop Aspect Ratio** dropdown
  - Located in "Crop Settings" section
  - Shows current selected value
  - Options include:
    - Square (1:1)
    - Landscape (4:3)
    - Portrait (3:4)
    - Widescreen (16:9)
    - Vertical (9:16)
    - Photo (3:2)
    - Photo Portrait (2:3)
    - Free Form

#### Step 7: Toggle Auto-optimize Images Switch
1. Click the "Auto-optimize images" switch to toggle it
2. **Expected**: Switch changes state (ON → OFF or OFF → ON)
3. **Expected**: No errors appear

#### Step 8: Toggle Generate Thumbnails Switch
1. Click the "Generate thumbnails" switch to toggle it
2. **Expected**: Switch changes state (ON → OFF or OFF → ON)
3. **Expected**: No errors appear

#### Step 9: Toggle Disable Skip Crop Button Switch
1. Click the "Disable 'Skip Crop' button" switch to toggle it
2. **Expected**: Switch changes state (ON → OFF or OFF → ON)
3. **Expected**: No errors appear

#### Step 10: Change Crop Aspect Ratio
1. Click on the "Crop Aspect Ratio" dropdown
2. Select a different aspect ratio (e.g., change from "Square (1:1)" to "Landscape (4:3)")
3. **Expected**: Dropdown shows the newly selected value
4. **Expected**: No errors appear

#### Step 11: Update API Credentials (Optional)
1. Update the Cloud Name field with a test value (e.g., "test-cloud-name")
2. Update the API Key field with a test value (e.g., "123456789")
3. Update the Upload Preset field with a test value (e.g., "test-preset")
4. **Expected**: Fields accept the input
5. **Expected**: No validation errors appear

#### Step 12: Save Settings
1. Scroll to the bottom of the form
2. Click the "Update Settings" (or "Create Settings") button
3. **Expected**: Loading indicator appears
4. **Expected**: Success toast notification appears: "Event settings updated successfully!"
5. **Expected**: Modal closes

#### Step 13: Reload Page and Verify Persistence
1. Refresh the browser page (F5 or Cmd+R)
2. Navigate back to Event Settings
3. Click on the "Integrations" tab
4. Verify the following:
   - [ ] "Enable Cloudinary Integration" toggle is still ON
   - [ ] "Auto-optimize images" switch shows the state you set in Step 7
   - [ ] "Generate thumbnails" switch shows the state you set in Step 8
   - [ ] "Disable Skip Crop button" switch shows the state you set in Step 9
   - [ ] "Crop Aspect Ratio" dropdown shows the value you selected in Step 10
   - [ ] API credentials show the values you entered (if updated in Step 11)

#### Step 14: Verify Connection Status
1. Check the "Connection Status" section at the bottom of the Cloudinary card
2. **Expected**: If all credentials are provided, status shows: "Ready to upload - all credentials provided"
3. **Expected**: If credentials are missing, status shows: "Waiting for all credentials to be configured"

### Test Results

**Pass Criteria:**
- ✅ All Cloudinary fields are visible
- ✅ All fields display current values correctly
- ✅ All switches can be toggled without errors
- ✅ Dropdown can be changed without errors
- ✅ Settings save successfully
- ✅ All settings persist after page reload

**Requirements Verified:** 1.1, 1.2, 1.3

---

## Task 7.2: Test Switchboard Integration UI

### Objective
Verify that all Switchboard Canvas integration fields display current values correctly and persist after saving.

### Test Steps

#### Step 1: Navigate to Switchboard Section
1. Open Event Settings Form (if not already open)
2. Click on the "Integrations" tab
3. Scroll down to the "Switchboard Canvas Integration" card
4. **Expected**: Card has title "Switchboard Canvas Integration" with Settings icon
5. **Expected**: Card has description "Configure credential printing and generation through Switchboard Canvas"

#### Step 2: Enable Switchboard Integration
1. Find the "Enable Switchboard Canvas Integration" toggle switch
2. If disabled, toggle it ON
3. **Expected**: Additional Switchboard configuration fields appear below the toggle

#### Step 3: Verify API Configuration Fields
Check that the following fields are visible and display current values:

- [ ] **Switchboard API Endpoint** field
  - Input field with placeholder "https://api.switchboard.ai/v1/generate"
  - Shows current value if previously saved
  - Has label with asterisk (*) indicating required field
  
- [ ] **Authentication Header Type** dropdown
  - Shows current selected value
  - Options include:
    - Bearer
    - API-Key
    - Authorization
    - X-API-Key
  - Default value: "Bearer"
  
- [ ] **Authentication Value (API Key)** field
  - Password input field with placeholder "your-switchboard-api-key"
  - Shows current value if previously saved (masked)
  - Has label with asterisk (*) indicating required field

#### Step 4: Verify Request Configuration Fields
Check that the following fields are visible:

- [ ] **API Request Body (JSON)** textarea
  - Large textarea (min-height: 200px)
  - Monospace font for code display
  - Shows current JSON template if previously saved
  - Has placeholder with example JSON structure
  - Has label with asterisk (*) indicating required field

#### Step 5: Verify Field Mappings Section
Check the Field Mappings section:

- [ ] Section has title "Field Mappings" with Link icon
- [ ] "Add Mapping" button is visible
- [ ] If custom fields exist, button is enabled
- [ ] If no custom fields exist, button is disabled with message: "Create custom fields first to add field mappings"
- [ ] If mappings exist, they are displayed with:
  - Field name and type badge
  - JSON variable mapping
  - Value mappings (for boolean/select fields)
  - Edit and Delete buttons

#### Step 6: Verify Placeholders Documentation
Check the "Available Placeholders" section:

- [ ] Section has title "Available Placeholders" with FileText icon
- [ ] Standard fields are listed (firstName, lastName, barcodeNumber, etc.)
- [ ] Custom fields are listed (if any exist)
- [ ] Mapped fields are listed (if any mappings exist)
- [ ] All placeholders use the format `{{placeholder_name}}`

#### Step 7: Change Authentication Header Type
1. Click on the "Authentication Header Type" dropdown
2. Select a different type (e.g., change from "Bearer" to "API-Key")
3. **Expected**: Dropdown shows the newly selected value
4. **Expected**: No errors appear

#### Step 8: Update Request Body Template
1. Click in the "API Request Body (JSON)" textarea
2. Modify the JSON template (e.g., add a new field or change a placeholder)
3. Example modification:
   ```json
   {
     "template_id": "{{template_id}}",
     "data": {
       "firstName": "{{firstName}}",
       "lastName": "{{lastName}}",
       "testField": "test value"
     }
   }
   ```
4. **Expected**: Textarea accepts the input
5. **Expected**: No validation errors appear

#### Step 9: Change Template ID (if visible)
Note: The Template ID field may be part of the Request Body or a separate field depending on implementation.

1. If there's a separate "Template ID" field, update it with a test value
2. **Expected**: Field accepts the input
3. **Expected**: No errors appear

#### Step 10: Update Field Mappings (if custom fields exist)
1. If you have custom fields, click "Add Mapping"
2. Select a custom field from the dropdown
3. Enter a JSON variable name
4. If it's a boolean or select field, configure value mappings
5. Click "Save" or "Add"
6. **Expected**: New mapping appears in the list
7. **Expected**: No errors appear

#### Step 11: Update API Credentials (Optional)
1. Update the "Switchboard API Endpoint" field with a test URL
2. Update the "Authentication Value (API Key)" field with a test key
3. **Expected**: Fields accept the input
4. **Expected**: No validation errors appear

#### Step 12: Save Settings
1. Scroll to the bottom of the form
2. Click the "Update Settings" button
3. **Expected**: Loading indicator appears
4. **Expected**: Success toast notification appears
5. **Expected**: Modal closes

#### Step 13: Reload Page and Verify Persistence
1. Refresh the browser page
2. Navigate back to Event Settings → Integrations tab
3. Scroll to Switchboard section
4. Verify the following:
   - [ ] "Enable Switchboard Canvas Integration" toggle is still ON
   - [ ] "Authentication Header Type" shows the value you selected in Step 7
   - [ ] "API Request Body" shows the template you modified in Step 8
   - [ ] "Template ID" shows the value you entered (if applicable)
   - [ ] Field mappings show the mappings you created in Step 10
   - [ ] API credentials show the values you entered (if updated in Step 11)

#### Step 14: Verify Connection Status
1. Check the connection status section at the bottom of the Switchboard card
2. **Expected**: Status indicator shows whether configuration is complete

### Test Results

**Pass Criteria:**
- ✅ All Switchboard fields are visible
- ✅ All fields display current values correctly
- ✅ Authentication header type can be changed
- ✅ Request body can be updated
- ✅ Field mappings can be created/edited
- ✅ Settings save successfully
- ✅ All settings persist after page reload

**Requirements Verified:** 2.1, 2.2, 2.3

---

## Task 7.3: Test OneSimpleAPI Integration UI

### Objective
Verify that all OneSimpleAPI integration fields display current values correctly and persist after saving.

### Test Steps

#### Step 1: Navigate to OneSimpleAPI Section
1. Open Event Settings Form (if not already open)
2. Click on the "Integrations" tab
3. Scroll down to the "OneSimpleAPI Integration" card
4. **Expected**: Card has title with Settings icon
5. **Expected**: Card has description about PDF generation

#### Step 2: Enable OneSimpleAPI Integration
1. Find the "Enable OneSimpleAPI Integration" toggle switch
2. If disabled, toggle it ON
3. **Expected**: Additional OneSimpleAPI configuration fields appear below the toggle

#### Step 3: Verify API Configuration Fields
Check that the following fields are visible and display current values:

- [ ] **API URL** field
  - Input field for the OneSimpleAPI endpoint URL
  - Shows current value if previously saved
  - Should include authentication token in URL
  
- [ ] **Form Data Key** field
  - Input field for the form data key name
  - Shows current value if previously saved
  - Example: "html" or "template"
  
- [ ] **Form Data Value (Main Template)** textarea
  - Large textarea for the main HTML template wrapper
  - Shows current value if previously saved
  - Monospace font for code display

#### Step 4: Verify Record Template Field
Check the Record Template field:

- [ ] **Record Template** textarea
  - Large textarea (min-height: 200px)
  - Monospace font for code display
  - Shows current HTML template if previously saved
  - Has placeholder with example HTML structure
  - Description explains it repeats for each attendee

#### Step 5: Verify Available Placeholders Section
Check the "Available Placeholders" section:

- [ ] Section has title "Available Placeholders" with FileText icon
- [ ] Standard fields are listed with orange background badges
- [ ] Includes special placeholders like `{{credentialUrl}}`
- [ ] Custom fields are listed (if any exist)
- [ ] All placeholders use the format `{{placeholder_name}}`

#### Step 6: Verify Usage Information
Check the "How it works" section:

- [ ] Section explains API URL authentication
- [ ] Section explains form data usage
- [ ] Section explains bulk processing capability

#### Step 7: Update URL Field
1. Click in the "API URL" field
2. Enter or modify the URL (e.g., "https://api.onesimpleapi.com/pdf?token=test123")
3. **Expected**: Field accepts the input
4. **Expected**: No validation errors appear

#### Step 8: Change Form Data Key and Value
1. Update the "Form Data Key" field (e.g., change to "html_content")
2. Update the "Form Data Value (Main Template)" textarea
3. Example modification:
   ```html
   <!DOCTYPE html>
   <html>
   <head><title>Credentials</title></head>
   <body>
     {{records}}
   </body>
   </html>
   ```
4. **Expected**: Fields accept the input
5. **Expected**: No errors appear

#### Step 9: Update Record Template
1. Click in the "Record Template" textarea
2. Modify the HTML template
3. Example modification:
   ```html
   <div class="credential">
     <h1>{{eventName}}</h1>
     <img src="{{credentialUrl}}" alt="Credential" />
     <h2>{{firstName}} {{lastName}}</h2>
     <p>Barcode: {{barcodeNumber}}</p>
     <p>Date: {{eventDate}}</p>
     <p>Location: {{eventLocation}}</p>
   </div>
   ```
4. **Expected**: Textarea accepts the input
5. **Expected**: No errors appear

#### Step 10: Save Settings
1. Scroll to the bottom of the form
2. Click the "Update Settings" button
3. **Expected**: Loading indicator appears
4. **Expected**: Success toast notification appears
5. **Expected**: Modal closes

#### Step 11: Reload Page and Verify Persistence
1. Refresh the browser page
2. Navigate back to Event Settings → Integrations tab
3. Scroll to OneSimpleAPI section
4. Verify the following:
   - [ ] "Enable OneSimpleAPI Integration" toggle is still ON
   - [ ] "API URL" field shows the URL you entered in Step 7
   - [ ] "Form Data Key" shows the value you entered in Step 8
   - [ ] "Form Data Value" shows the template you modified in Step 8
   - [ ] "Record Template" shows the template you modified in Step 9

#### Step 12: Verify Integration Status
1. Check the "Integration Status" section at the bottom of the OneSimpleAPI card
2. **Expected**: If all fields are configured, status shows: "Ready to generate PDFs - all configuration provided"
3. **Expected**: If fields are missing, status shows: "Waiting for API URL, form data key, main template, and record template configuration"

### Test Results

**Pass Criteria:**
- ✅ All OneSimpleAPI fields are visible
- ✅ All fields display current values correctly
- ✅ URL field can be updated
- ✅ Form data key and value can be changed
- ✅ Record template can be updated
- ✅ Settings save successfully
- ✅ All settings persist after page reload

**Requirements Verified:** 3.1, 3.2, 3.3

---

## Task 7.4: Test with Missing Integration Data

### Objective
Verify that the system handles missing integration documents gracefully and can create new ones when needed.

### Test Steps

#### Step 1: Access Appwrite Console
1. Open your Appwrite console in a browser
2. Navigate to your project
3. Go to Databases → Select your database
4. **Expected**: You can see all collections including integration collections

#### Step 2: Identify Integration Collections
Locate the following collections:
- [ ] `cloudinary_integration`
- [ ] `switchboard_integration`
- [ ] `onesimpleapi_integration`

#### Step 3: Delete Integration Documents (Backup First!)
**⚠️ IMPORTANT: Only do this in a test/development environment!**

1. For each integration collection:
   - Open the collection
   - Find documents related to your test event settings
   - Note the `eventSettingsId` for reference
   - **Take a screenshot or note the data** (for backup)
   - Delete the document(s)
2. **Expected**: Documents are deleted successfully

#### Step 4: Fetch Event Settings via API
1. Return to the application
2. Open Event Settings Form
3. **Expected**: Form opens without errors
4. Click on the "Integrations" tab
5. **Expected**: Integration tab loads without errors

#### Step 5: Verify Default Values Are Shown
Check each integration section:

**Cloudinary:**
- [ ] "Enable Cloudinary Integration" toggle is OFF
- [ ] All credential fields are empty
- [ ] "Auto-optimize images" switch is OFF
- [ ] "Generate thumbnails" switch is OFF
- [ ] "Disable Skip Crop button" switch is OFF
- [ ] "Crop Aspect Ratio" dropdown shows "Square (1:1)" (default)

**Switchboard:**
- [ ] "Enable Switchboard Canvas Integration" toggle is OFF
- [ ] API Endpoint field is empty
- [ ] "Authentication Header Type" shows "Bearer" (default)
- [ ] API Key field is empty
- [ ] Request Body textarea is empty
- [ ] Field mappings list is empty

**OneSimpleAPI:**
- [ ] "Enable OneSimpleAPI Integration" toggle is OFF
- [ ] API URL field is empty
- [ ] Form Data Key field is empty
- [ ] Form Data Value textarea is empty
- [ ] Record Template textarea is empty

#### Step 6: Update Integration Settings
1. Enable Cloudinary integration
2. Fill in some Cloudinary fields:
   - Cloud Name: "test-cloud"
   - API Key: "test-key-123"
   - Upload Preset: "test-preset"
   - Toggle "Auto-optimize images" ON
   - Select "Landscape (4:3)" for Crop Aspect Ratio
3. Enable Switchboard integration
4. Fill in some Switchboard fields:
   - API Endpoint: "https://api.test.com/generate"
   - Change Auth Header Type to "API-Key"
   - API Key: "test-switchboard-key"
5. Enable OneSimpleAPI integration
6. Fill in some OneSimpleAPI fields:
   - API URL: "https://api.onesimpleapi.com/pdf?token=test"
   - Form Data Key: "html"
7. **Expected**: All fields accept input without errors

#### Step 7: Save Settings
1. Click "Update Settings" button
2. **Expected**: Success toast appears
3. **Expected**: No error messages appear
4. **Expected**: Modal closes

#### Step 8: Verify New Integration Documents Are Created
1. Return to Appwrite Console
2. Check each integration collection:
   - `cloudinary_integration`
   - `switchboard_integration`
   - `onesimpleapi_integration`
3. **Expected**: New documents exist with the `eventSettingsId` matching your event settings
4. **Expected**: Documents contain the values you entered in Step 6
5. **Expected**: Version field is set to 1 (first version)

#### Step 9: Verify Data Persistence
1. Return to the application
2. Refresh the page
3. Open Event Settings → Integrations tab
4. **Expected**: All the values you entered in Step 6 are still present
5. **Expected**: No data loss occurred

#### Step 10: Restore Original Data (Optional)
If you want to restore the original integration data:
1. Use the backup you created in Step 3
2. Manually recreate the documents in Appwrite Console
3. Or re-enter the data through the UI

### Test Results

**Pass Criteria:**
- ✅ Application handles missing integration documents without errors
- ✅ Default values are displayed when integration data is missing
- ✅ New integration documents can be created through the UI
- ✅ Created documents have correct structure and values
- ✅ Data persists after page reload

**Requirements Verified:** 1.4, 2.5, 3.4, 5.3, 6.4

---

## Task 7.5: Test Backward Compatibility

### Objective
Verify that existing event settings continue to work correctly and that no UI changes are required.

### Test Steps

#### Step 1: Verify Existing Event Settings Load
1. If you have existing event settings from before the fix, open them
2. Navigate to Event Settings Form
3. **Expected**: Form opens without errors
4. **Expected**: All tabs load correctly (General, Custom Fields, Barcode, Integrations)

#### Step 2: Verify General Tab Still Works
1. Click on the "General" tab
2. **Expected**: All general fields display correctly:
   - Event Name
   - Event Date
   - Event Time
   - Time Zone
   - Event Location
   - Banner Image URL
   - Sign In Banner URL
   - Name Field Settings (uppercase toggles)
   - Attendee List Settings (sort options)
3. **Expected**: No layout issues or missing fields

#### Step 3: Verify Custom Fields Tab Still Works
1. Click on the "Custom Fields" tab
2. **Expected**: Custom fields list displays correctly
3. **Expected**: "Add Field" button works
4. **Expected**: Drag-and-drop reordering works
5. **Expected**: Edit and Delete buttons work

#### Step 4: Verify Barcode Tab Still Works
1. Click on the "Barcode" tab
2. **Expected**: Barcode configuration displays correctly:
   - Barcode Type dropdown
   - Barcode Length input
   - "Ensure unique barcodes" switch
3. **Expected**: All fields are functional

#### Step 5: Verify Integrations Tab Displays Correctly
1. Click on the "Integrations" tab
2. **Expected**: All three integration cards are visible:
   - Cloudinary Integration
   - Switchboard Canvas Integration
   - OneSimpleAPI Integration
3. **Expected**: Cards have proper spacing and layout
4. **Expected**: No visual glitches or overlapping elements

#### Step 6: Verify API Response Format
Open browser DevTools (F12) and check the Network tab:

1. Open Event Settings Form
2. Find the GET request to `/api/event-settings`
3. Click on the request and view the Response
4. **Expected**: Response includes flattened integration fields:
   ```json
   {
     "eventName": "...",
     "cloudinaryEnabled": true,
     "cloudinaryCloudName": "...",
     "cloudinaryAutoOptimize": true,
     "cloudinaryGenerateThumbnails": false,
     "cloudinaryDisableSkipCrop": true,
     "cloudinaryCropAspectRatio": "1.33",
     "switchboardEnabled": true,
     "switchboardAuthHeaderType": "Bearer",
     "switchboardRequestBody": "...",
     "oneSimpleApiEnabled": true,
     "oneSimpleApiUrl": "...",
     "oneSimpleApiFormDataKey": "...",
     ...
   }
   ```
5. **Expected**: Field names match the flattened format (not nested objects)

#### Step 7: Verify Update Request Format
1. Make a change to any integration setting
2. Click "Update Settings"
3. In DevTools Network tab, find the PUT request to `/api/event-settings`
4. View the Request Payload
5. **Expected**: Request uses flattened field names
6. **Expected**: No nested integration objects in the request

#### Step 8: Test Mixed Updates
1. Update a general field (e.g., Event Name)
2. Update a Cloudinary field (e.g., toggle Auto-optimize)
3. Update a Switchboard field (e.g., change Auth Header Type)
4. Update a custom field (if any exist)
5. Click "Update Settings"
6. **Expected**: All updates save successfully
7. **Expected**: Success toast appears
8. Reload page and verify all changes persisted

#### Step 9: Verify No Console Errors
1. Open browser DevTools Console tab
2. Perform various actions:
   - Open Event Settings Form
   - Switch between tabs
   - Toggle integration switches
   - Update fields
   - Save settings
3. **Expected**: No JavaScript errors in console
4. **Expected**: No warning messages about missing fields
5. **Expected**: No 404 or 500 errors in Network tab

#### Step 10: Verify Cache Behavior
1. Open Event Settings Form (cache miss - fresh fetch)
2. Close the form
3. Open Event Settings Form again (cache hit - should be fast)
4. Update any setting and save
5. Open Event Settings Form again (cache invalidated - fresh fetch)
6. **Expected**: Updated values are displayed
7. **Expected**: No stale data from cache

### Test Results

**Pass Criteria:**
- ✅ Existing event settings load without errors
- ✅ All tabs function correctly
- ✅ API responses use flattened field format
- ✅ API requests use flattened field format
- ✅ No UI changes are required
- ✅ No console errors occur
- ✅ Cache invalidation works correctly

**Requirements Verified:** 5.1, 5.2, 5.3

---

## Summary Checklist

After completing all test tasks, verify the following:

### Cloudinary Integration
- [ ] All 9 fields are visible and functional
- [ ] Boolean switches toggle correctly
- [ ] Dropdown selections work
- [ ] Settings persist after save and reload
- [ ] Default values appear when data is missing

### Switchboard Integration
- [ ] All configuration fields are visible
- [ ] Auth header type dropdown works
- [ ] Request body textarea accepts input
- [ ] Field mappings can be created/edited
- [ ] Settings persist after save and reload
- [ ] Default values appear when data is missing

### OneSimpleAPI Integration
- [ ] All 5 fields are visible and functional
- [ ] URL field accepts input
- [ ] Form data fields work correctly
- [ ] Template textareas accept HTML
- [ ] Settings persist after save and reload
- [ ] Default values appear when data is missing

### System Behavior
- [ ] Missing integration documents are handled gracefully
- [ ] New integration documents can be created
- [ ] Backward compatibility is maintained
- [ ] No UI changes are required
- [ ] No console errors occur
- [ ] Cache invalidation works correctly

---

## Troubleshooting

### Issue: Fields Not Displaying
**Solution:** 
- Check browser console for errors
- Verify the GET endpoint is returning data
- Check that integration documents exist in Appwrite

### Issue: Settings Not Persisting
**Solution:**
- Check browser console for errors during save
- Verify the PUT endpoint is successful (200 status)
- Check Appwrite console to see if documents are being updated
- Clear browser cache and try again

### Issue: Default Values Not Appearing
**Solution:**
- Verify the `flattenEventSettings` helper is providing defaults
- Check that the GET endpoint handles null integration data
- Review the API response in DevTools Network tab

### Issue: Integration Documents Not Created
**Solution:**
- Check that the PUT endpoint is calling integration update functions
- Verify Appwrite permissions allow document creation
- Check server logs for error messages
- Ensure the `eventSettingsId` is being passed correctly

---

## Reporting Issues

If you encounter any issues during testing, please document:

1. **Test Task Number** (e.g., Task 7.1, Step 5)
2. **Expected Behavior** (what should happen)
3. **Actual Behavior** (what actually happened)
4. **Steps to Reproduce** (how to recreate the issue)
5. **Screenshots** (if applicable)
6. **Browser Console Errors** (if any)
7. **Network Request/Response** (from DevTools)

---

## Test Sign-Off

**Tester Name:** ___________________________

**Date:** ___________________________

**Test Environment:**
- Browser: ___________________________
- Node Version: ___________________________
- Application Version: ___________________________

**Test Results:**
- [ ] Task 7.1: Cloudinary Integration UI - PASS / FAIL
- [ ] Task 7.2: Switchboard Integration UI - PASS / FAIL
- [ ] Task 7.3: OneSimpleAPI Integration UI - PASS / FAIL
- [ ] Task 7.4: Missing Integration Data - PASS / FAIL
- [ ] Task 7.5: Backward Compatibility - PASS / FAIL

**Overall Status:** PASS / FAIL

**Notes:**
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________

---
title: "Printable Fields User Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/EventSettingsForm.tsx"]
---

# Printable Fields User Guide

## Overview

The Printable Fields feature allows event administrators to control which custom field changes trigger credential reprints. By marking fields as "printable" or "non-printable," you can avoid unnecessary reprints when updating internal information that doesn't appear on credentials.

## Table of Contents

- [What Are Printable Fields?](#what-are-printable-fields)
- [When to Use Printable Fields](#when-to-use-printable-fields)
- [How to Configure Printable Fields](#how-to-configure-printable-fields)
- [Understanding Credential Status](#understanding-credential-status)
- [Examples and Use Cases](#examples-and-use-cases)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## What Are Printable Fields?

**Printable fields** are custom fields that appear on your printed credentials. When you mark a field as "printable," any changes to that field will mark the attendee's credential as **OUTDATED**, indicating it needs to be reprinted.

**Non-printable fields** are custom fields that don't appear on credentials (like internal notes, email addresses, or tracking information). Changes to these fields won't affect the credential status, allowing you to update internal data without triggering reprints.

### Default Behavior

- **Always Printable** (cannot be changed):
  - First Name
  - Last Name
  - Barcode Number
  - Photo

- **Never Printable** (cannot be changed):
  - Notes field

- **Configurable** (you decide):
  - All custom fields you create

## When to Use Printable Fields

### Mark a Field as Printable When:

✅ The field appears on your credential design  
✅ Changes to the field require reprinting the credential  
✅ The information is visible to attendees on their badges  
✅ The field contains critical identification information  

**Examples:**
- Company Name (if shown on badge)
- Job Title (if shown on badge)
- Department (if shown on badge)
- Access Level (if shown on badge)
- Badge Type (if shown on badge)

### Mark a Field as Non-Printable When:

✅ The field is for internal tracking only  
✅ The field doesn't appear on the credential  
✅ Changes shouldn't trigger reprints  
✅ The information is administrative or operational  

**Examples:**
- Email Address (for communication only)
- Phone Number (for contact purposes)
- Registration Date (internal tracking)
- Payment Status (internal tracking)
- Dietary Restrictions (catering purposes)
- Emergency Contact (safety purposes)
- Internal Notes (staff use only)

## How to Configure Printable Fields

### Step 1: Access Event Settings

1. Log in to CredentialStudio as an administrator
2. Navigate to the **Dashboard**
3. Click on the **Settings** tab
4. Select **Custom Fields** section

### Step 2: Create or Edit a Custom Field

#### Creating a New Field:

1. Click the **"Add Custom Field"** button
2. Fill in the field details:
   - **Field Name**: Display name (e.g., "Company Name")
   - **Field Type**: Select appropriate type (text, select, etc.)
   - **Required**: Toggle if field must be filled
   - **Visible**: Toggle if field appears in forms
   - **Show on Main Page**: Toggle if field appears in attendee table

3. **Configure Printable Status**:
   - Locate the **"Printable Field"** toggle
   - Enable it if the field appears on credentials
   - Disable it if the field is for internal use only

4. Click **"Save"** to create the field

#### Editing an Existing Field:

1. Find the field in the custom fields list
2. Click the **Edit** icon (pencil)
3. Modify the **"Printable Field"** toggle as needed
4. Click **"Save"** to update the field

### Step 3: Review Printable Status

After saving, you'll see a **"Printable"** badge next to fields marked as printable in the custom fields list. This helps you quickly identify which fields affect credential status.

### Visual Indicators

![Printable Field Toggle](../images/printable-field-toggle.png)
*The Printable Field toggle in the custom field form*

![Printable Badge](../images/printable-badge.png)
*The Printable badge shown in the custom fields list*

## Understanding Credential Status

### Status Indicators

CredentialStudio displays two credential statuses:

#### 🟢 CURRENT
- The credential is up-to-date with all printable field values
- No reprinting needed
- Displayed as a green badge

#### 🔴 OUTDATED
- One or more printable fields have changed since the credential was generated
- Credential needs to be reprinted
- Displayed as a red badge

### How Status is Determined

The system compares two timestamps:

1. **Credential Generated At**: When the credential image was last created
2. **Last Significant Update**: When any printable field was last changed

**Status Logic:**
```
If Credential Generated At >= Last Significant Update:
  Status = CURRENT ✓

If Credential Generated At < Last Significant Update:
  Status = OUTDATED ✗
```

### What Triggers Status Changes

#### Actions That Mark Credentials as OUTDATED:

- ✅ Changing First Name
- ✅ Changing Last Name
- ✅ Changing Barcode Number
- ✅ Uploading/changing Photo
- ✅ Changing any custom field marked as **printable**

#### Actions That DON'T Affect Status:

- ❌ Changing Notes field
- ❌ Changing any custom field marked as **non-printable**
- ❌ Viewing attendee records
- ❌ Exporting data

### Filtering by Status

You can filter the attendees list to show only records with specific statuses:

1. Navigate to the **Attendees** tab
2. Use the **Credential Status** filter dropdown
3. Select:
   - **Show All**: Display all attendees
   - **Show Current Only**: Display only attendees with current credentials
   - **Show Outdated Only**: Display only attendees needing reprints

## Examples and Use Cases

### Example 1: Conference Badge

**Credential Design Includes:**
- First Name ✓
- Last Name ✓
- Company Name ✓
- Job Title ✓
- Badge Type ✓
- Photo ✓

**Custom Field Configuration:**
- Company Name: **Printable = ON** (appears on badge)
- Job Title: **Printable = ON** (appears on badge)
- Badge Type: **Printable = ON** (appears on badge)
- Email Address: **Printable = OFF** (not on badge)
- Phone Number: **Printable = OFF** (not on badge)

**Scenario:**
- Staff updates attendee's email address
- Result: Credential status remains **CURRENT** (no reprint needed)

- Staff updates attendee's company name
- Result: Credential status changes to **OUTDATED** (reprint needed)

### Example 2: Trade Show Exhibitor Badge

**Credential Design Includes:**
- First Name ✓
- Last Name ✓
- Company Name ✓
- Booth Number ✓
- Photo ✓

**Custom Field Configuration:**
- Company Name: **Printable = ON**
- Booth Number: **Printable = ON**
- Contact Email: **Printable = OFF**
- Lead Retrieval Code: **Printable = OFF**
- Exhibitor Package: **Printable = OFF**

**Scenario:**
- Exhibitor changes booth location
- Staff updates Booth Number field
- Result: Credential status changes to **OUTDATED** (reprint needed)

- Staff updates Lead Retrieval Code for internal tracking
- Result: Credential status remains **CURRENT** (no reprint needed)

### Example 3: Multi-Day Event

**Credential Design Includes:**
- First Name ✓
- Last Name ✓
- Organization ✓
- Access Level ✓
- Photo ✓

**Custom Field Configuration:**
- Organization: **Printable = ON**
- Access Level: **Printable = ON**
- Dietary Restrictions: **Printable = OFF**
- Session Preferences: **Printable = OFF**
- Emergency Contact: **Printable = OFF**

**Scenario:**
- Attendee upgrades from "Standard" to "VIP" access
- Staff updates Access Level field
- Result: Credential status changes to **OUTDATED** (reprint needed with new access level)

- Attendee updates dietary restrictions
- Staff updates Dietary Restrictions field
- Result: Credential status remains **CURRENT** (no reprint needed, catering team notified separately)

## Best Practices

### 1. Plan Your Credential Design First

Before configuring printable fields:
- ✅ Finalize your credential design
- ✅ Identify which fields appear on the credential
- ✅ List fields needed for internal tracking
- ✅ Configure printable flags accordingly

### 2. Be Conservative with Printable Fields

- ✅ Only mark fields as printable if they truly appear on credentials
- ✅ Avoid marking fields as printable "just in case"
- ✅ Remember: More printable fields = more potential reprints

### 3. Document Your Configuration

- ✅ Keep a record of which fields are printable
- ✅ Share this information with your team
- ✅ Include it in your event documentation
- ✅ Review configuration before each event

### 4. Review Regularly

- ✅ Review printable field configuration before each event
- ✅ Update configuration if credential design changes
- ✅ Remove unused custom fields
- ✅ Consolidate similar fields when possible

### 5. Train Your Staff

- ✅ Explain the difference between printable and non-printable fields
- ✅ Show staff how to check credential status
- ✅ Teach staff when reprints are necessary
- ✅ Provide examples of each field type

### 6. Use Descriptive Field Names

- ✅ Use clear, descriptive names for custom fields
- ✅ Include "(Printable)" in field names if helpful
- ✅ Example: "Company Name (on badge)" vs "Email (internal)"

### 7. Test Before Your Event

- ✅ Create test attendee records
- ✅ Update printable fields and verify status changes
- ✅ Update non-printable fields and verify status doesn't change
- ✅ Generate credentials and verify they're marked as CURRENT

## Troubleshooting

### Issue: Credential Status Not Updating

**Problem:** You changed a printable field but the credential status didn't change to OUTDATED.

**Solutions:**
1. Verify the field is marked as printable in Event Settings
2. Refresh the attendees page
3. Check if the value actually changed (same value = no change)
4. Verify you have the latest version of the application

### Issue: Too Many Credentials Marked as OUTDATED

**Problem:** Many credentials are marked as OUTDATED when they shouldn't be.

**Solutions:**
1. Review which fields are marked as printable
2. Consider marking some fields as non-printable
3. Check if staff are updating fields unnecessarily
4. Verify credential design matches printable field configuration

### Issue: Printable Toggle Not Visible

**Problem:** You can't see the Printable Field toggle in Event Settings.

**Solutions:**
1. Verify you're logged in as an administrator
2. Check your role permissions
3. Refresh the page
4. Clear browser cache
5. Contact system administrator

### Issue: Existing Credentials Not Affected by Configuration Changes

**Problem:** You changed a field from non-printable to printable, but existing credentials weren't marked as OUTDATED.

**Explanation:** This is expected behavior. Configuration changes only affect future updates, not existing records.

**Solution:** This is by design to prevent mass reprints when adjusting configuration. Credentials will be marked as OUTDATED when the attendee data is actually updated.

### Issue: Can't Determine Which Fields Are Printable

**Problem:** You're not sure which fields should be marked as printable.

**Solutions:**
1. Review your credential design template
2. List all fields that appear on the printed credential
3. Mark those fields as printable
4. Mark all other fields as non-printable
5. Consult with your credential designer or print vendor

## Important Notes

### Configuration Changes Don't Affect Existing Records

When you change a field's printable status:
- ✅ The change applies to future updates
- ❌ Existing credentials are NOT automatically marked as OUTDATED
- ❌ Existing credentials are NOT automatically marked as CURRENT

This prevents mass reprints when adjusting configuration. You'll see an informational message when saving Event Settings with printable flag changes:

> "Existing credential statuses will not be affected until attendee records are updated"

### Default Fields Cannot Be Changed

The following fields have fixed printable status:
- **Always Printable**: First Name, Last Name, Barcode Number, Photo
- **Never Printable**: Notes

You cannot change the printable status of these fields.

### Backward Compatibility

Existing custom fields without a printable flag are treated as **non-printable** by default. This ensures existing events continue to work without requiring configuration changes.

## Related Documentation

- **Design Document**: `.kiro/specs/printable-field-outdated-tracking/design.md`
- **Requirements**: `.kiro/specs/printable-field-outdated-tracking/requirements.md`
- **Implementation Summary**: `docs/enhancements/PRINTABLE_FIELD_TRACKING_IMPLEMENTATION.md`
- **Notes Field Enhancement**: `docs/enhancements/NOTES_FIELD_CREDENTIAL_STATUS_ENHANCEMENT.md`

## Support

If you need assistance with printable fields:
1. Review this guide thoroughly
2. Check the troubleshooting section
3. Consult your system administrator
4. Contact CredentialStudio support

---

**Last Updated**: October 2025  
**Version**: 1.0

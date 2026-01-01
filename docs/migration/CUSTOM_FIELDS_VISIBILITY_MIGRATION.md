---
title: "Custom Fields Visibility Control Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Custom Fields Visibility Control Migration

## Overview

This migration adds the `showOnMainPage` boolean attribute to the `custom_fields` collection, enabling visibility control for custom fields on the main Attendees page.

## Changes

### Database Schema Updates

1. **New Attribute**: `showOnMainPage` (boolean)
   - Required: No
   - Default: `true` (visible)
   - Purpose: Controls whether a custom field appears as a column in the main Attendees table

2. **New Index**: `showOnMainPage_idx`
   - Type: Key index
   - Purpose: Optimizes queries filtering by visibility status

## Migration Scripts

### For New Installations

The `scripts/setup-appwrite.ts` script has been updated to include the `showOnMainPage` attribute automatically when creating the custom_fields collection.

### For Existing Installations

Run the migration script to add the attribute to your existing database:

```bash
npx tsx scripts/add-show-on-main-page-attribute.ts
```

This script will:
1. Add the `showOnMainPage` boolean attribute to the custom_fields collection
2. Create an index on the attribute for performance optimization
3. Set the default value to `true` for all existing fields

## Behavior

### Default Behavior
- All existing custom fields will default to `showOnMainPage = true` (visible)
- All new custom fields will default to `showOnMainPage = true` (visible)
- Fields with `showOnMainPage = false` will be hidden from the main Attendees table but remain visible in edit/create forms

### Backward Compatibility
- If the `showOnMainPage` attribute is missing or undefined, the system treats it as `true` (visible)
- This ensures backward compatibility with any code that doesn't explicitly check the attribute

## Testing

After running the migration:

1. Verify the attribute exists:
   - Check the custom_fields collection in Appwrite Console
   - Confirm `showOnMainPage` attribute is present

2. Verify the index exists:
   - Check the indexes tab in Appwrite Console
   - Confirm `showOnMainPage_idx` is listed

3. Test functionality:
   - Create a new custom field (should default to visible)
   - Toggle visibility in Event Settings UI
   - Verify the field appears/disappears from the Attendees table
   - Verify the field always appears in edit/create forms

## Rollback

If you need to rollback this migration:

1. Delete the index:
   ```typescript
   await databases.deleteIndex(databaseId, collectionId, 'showOnMainPage_idx');
   ```

2. Delete the attribute:
   ```typescript
   await databases.deleteAttribute(databaseId, collectionId, 'showOnMainPage');
   ```

**Note**: Deleting the attribute will cause all custom fields to be visible by default (backward compatible behavior).

## Related Files

- `scripts/setup-appwrite.ts` - Updated to include showOnMainPage attribute
- `scripts/add-show-on-main-page-attribute.ts` - Migration script for existing installations
- `.kiro/specs/attendee-default-fields-enhancement/` - Feature specification

## Requirements Addressed

- Requirement 4.1: Database schema includes showOnMainPage boolean attribute
- Requirement 4.2: Default value set to true for new custom fields
- Performance optimization through index creation

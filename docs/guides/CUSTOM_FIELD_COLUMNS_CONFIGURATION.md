---
title: "Custom Field Columns Configuration"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/EventSettingsForm.tsx"]
---

# Custom Field Columns Configuration Guide

## Overview

The Custom Field Columns feature allows administrators to configure how many columns of custom fields are displayed on the Attendees page before wrapping to the next line. This helps accommodate different screen resolutions and user preferences.

## Feature Description

### What It Does

- **Configurable Layout**: Control the maximum number of custom field columns displayed on large screens (desktop)
- **Resolution Adaptation**: Adjust the layout to work better with different monitor sizes and resolutions
- **Responsive Design**: Maintains mobile-first responsive behavior while allowing desktop customization
- **Backward Compatible**: Defaults to 7 columns (the original behavior) if not configured

### Available Options

The setting allows you to choose between **3 to 10 columns** for desktop displays:

- **3 Columns**: Best for very small screens or when you want larger field displays
- **4 Columns**: Compact layout for smaller monitors
- **5 Columns**: Balanced layout for standard monitors
- **6 Columns**: Comfortable layout for larger monitors
- **7 Columns**: Default setting (original behavior)
- **8 Columns**: For wide monitors with high resolution
- **9 Columns**: For ultra-wide monitors
- **10 Columns**: Maximum density for very large displays

## Configuration

### Accessing the Setting

1. Log in as an administrator
2. Navigate to the Dashboard
3. Click on the **Settings** tab
4. Click **Edit Settings** button
5. Go to the **General** tab
6. Scroll down to the **Attendee List Settings** section
7. Find the **Custom Field Columns (Desktop)** dropdown

### Setting the Value

1. Click the dropdown menu
2. Select your preferred number of columns (3-10)
3. Click **Save Settings**
4. The change takes effect immediately on the Attendees page

## How It Works

### Responsive Behavior

The custom field grid uses a responsive layout that adapts to different screen sizes:

#### Mobile (< 768px)
- **Always displays 1 column** regardless of the setting
- Optimized for small screens
- Full-width field display

#### Tablet (768px - 1024px)
- Uses a fixed responsive layout based on field count
- 1 field: 1 column
- 2-3 fields: 2 columns
- 4-6 fields: 3 columns
- 7+ fields: 4 columns

#### Desktop (> 1024px)
- Uses your configured maximum columns setting
- 1 field: 1 column
- 2-3 fields: 3 columns
- 4-6 fields: 5 columns
- 7-9 fields: Up to 6 columns (or your configured max, whichever is lower)
- 10+ fields: Your configured maximum columns

### Example Scenarios

#### Scenario 1: Standard Monitor (1920x1080)
**Recommended Setting**: 7 columns (default)
- Provides good balance between information density and readability
- Fields are comfortably sized
- Works well for most use cases

#### Scenario 2: Small Monitor (1366x768)
**Recommended Setting**: 5 columns
- Prevents fields from becoming too cramped
- Improves readability on smaller screens
- Reduces horizontal scrolling

#### Scenario 3: Ultra-Wide Monitor (3440x1440)
**Recommended Setting**: 9-10 columns
- Takes advantage of extra horizontal space
- Displays more information without scrolling
- Ideal for power users with many custom fields

#### Scenario 4: Laptop (1440x900)
**Recommended Setting**: 6 columns
- Good compromise for laptop screens
- Maintains readability while showing more data
- Works well with typical laptop resolutions

## Technical Details

### Database Schema

The setting is stored in the `event_settings` collection:

```typescript
customFieldColumns?: number;  // Range: 3-10, Default: 7
```

### Implementation

The dashboard uses a dynamic grid calculation function that:

1. Reads the `customFieldColumns` value from event settings
2. Defaults to 7 if not set (backward compatibility)
3. Applies the configured maximum to the large screen breakpoint
4. Maintains responsive behavior for smaller screens

### Migration

For existing installations, run the migration script:

```bash
npx tsx scripts/add-custom-field-columns-attribute.ts
```

This adds the `customFieldColumns` attribute to your database with a default value of 7.

## Best Practices

### Choosing the Right Setting

1. **Consider Your Screen Resolution**
   - Measure your actual screen width
   - Test different settings to find what works best
   - Consider the most common resolution among your team

2. **Consider Your Custom Fields**
   - More fields = benefit from higher column count
   - Fewer fields = lower column count is fine
   - Field types matter (text fields need more space than checkboxes)

3. **Consider Your Users**
   - If multiple people use the system, choose a setting that works for most
   - Consider the smallest common screen size
   - Balance between information density and readability

### Testing Your Configuration

1. Set your preferred column count
2. Navigate to the Attendees page
3. Check if fields are readable and not cramped
4. Verify that wrapping behavior is acceptable
5. Test with different numbers of visible custom fields
6. Adjust if needed

### Common Issues and Solutions

#### Fields Look Cramped
**Solution**: Reduce the column count (e.g., from 7 to 5 or 6)

#### Too Much Horizontal Scrolling
**Solution**: Reduce the column count to fit more fields on screen

#### Too Much Vertical Space Used
**Solution**: Increase the column count to fit more fields per row

#### Fields Look Too Spread Out
**Solution**: Increase the column count for denser layout

## Related Features

### Custom Field Visibility

The column count setting works in conjunction with the **Show on Main Page** setting for individual custom fields:

- Only visible custom fields are counted
- Hidden fields don't affect the layout
- You can control both which fields show AND how they're laid out

### Attendee Sorting

The column count setting is independent of the attendee sorting configuration:

- Sorting affects the order of attendees
- Column count affects the layout of custom fields
- Both settings are in the same "Attendee List Settings" section

## Troubleshooting

### Setting Not Taking Effect

1. **Clear Browser Cache**: Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check Event Settings**: Verify the setting was saved correctly
3. **Check Browser Console**: Look for any JavaScript errors
4. **Restart Development Server**: If in development mode

### Layout Looks Wrong

1. **Check Screen Size**: Verify you're on a large screen (> 1024px width)
2. **Check Custom Fields**: Ensure you have visible custom fields
3. **Check Browser Zoom**: Reset browser zoom to 100%
4. **Test Different Values**: Try different column counts to isolate the issue

### Migration Failed

1. **Check Environment Variables**: Ensure all Appwrite variables are set
2. **Check API Key**: Verify your Appwrite API key has proper permissions
3. **Check Database**: Ensure the event_settings collection exists
4. **Run Setup Script**: If needed, run the full setup script first

## API Reference

### Event Settings Object

```typescript
interface EventSettings {
  // ... other fields
  customFieldColumns?: number;  // 3-10, default 7
}
```

### GET /api/event-settings

Returns event settings including `customFieldColumns`:

```json
{
  "id": "...",
  "eventName": "...",
  "customFieldColumns": 7,
  // ... other fields
}
```

### PUT /api/event-settings

Update event settings including `customFieldColumns`:

```json
{
  "customFieldColumns": 8
  // ... other fields
}
```

## Version History

### Version 1.0 (Current)
- Initial implementation
- Range: 3-10 columns
- Default: 7 columns
- Responsive behavior maintained
- Backward compatible

## Support

If you encounter issues with this feature:

1. Check this documentation first
2. Review the troubleshooting section
3. Check the browser console for errors
4. Verify your event settings configuration
5. Contact your system administrator

## Future Enhancements

Potential future improvements:

- Per-user column preferences
- Auto-detection based on screen size
- Preview mode when changing settings
- Tablet-specific column configuration
- Custom breakpoint configuration

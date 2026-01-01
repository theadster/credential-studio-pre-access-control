---
title: "Custom Field Columns - Quick Reference"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/AttendeeList.tsx"]
---

# Custom Field Columns - Quick Reference

## TL;DR

Configure how many columns of custom fields display on the Attendees page before wrapping.

**Location**: Event Settings → General → Attendee List Settings → Custom Field Columns (Desktop)  
**Range**: 3-10 columns  
**Default**: 7 columns  

## Quick Setup

### For Existing Installations
```bash
npx tsx scripts/add-custom-field-columns-attribute.ts
```

### Configure
1. Dashboard → Settings → Edit Settings
2. General tab → Attendee List Settings
3. Select column count (3-10)
4. Save

## When to Use Each Setting

| Columns | Best For | Screen Size |
|---------|----------|-------------|
| 3 | Small monitors, maximum readability | 1366x768 or smaller |
| 4 | Compact laptops | 1440x900 |
| 5 | Standard laptops | 1440x900 - 1600x900 |
| 6 | Standard monitors | 1680x1050 - 1920x1080 |
| 7 | Default, most monitors | 1920x1080 (default) |
| 8 | Large monitors | 2560x1440 |
| 9 | Ultra-wide monitors | 3440x1440 |
| 10 | Maximum density | 3840x2160 or larger |

## Responsive Behavior

| Screen Size | Behavior |
|-------------|----------|
| Mobile (< 768px) | Always 1 column |
| Tablet (768-1024px) | Fixed responsive (1-4 columns) |
| Desktop (> 1024px) | Uses your configured setting |

## Common Issues

### Fields look cramped
**Solution**: Reduce column count (e.g., 7 → 5)

### Too much scrolling
**Solution**: Reduce column count to fit more on screen

### Fields too spread out
**Solution**: Increase column count for denser layout

### Setting not working
**Solution**: Hard refresh (Ctrl+Shift+R), check you're on desktop size

## Files Modified

- `src/components/EventSettingsForm.tsx` - UI control
- `src/pages/dashboard.tsx` - Grid calculation
- `scripts/setup-appwrite.ts` - Database schema
- `scripts/add-custom-field-columns-attribute.ts` - Migration

## Documentation

- **Full Guide**: `docs/guides/CUSTOM_FIELD_COLUMNS_CONFIGURATION.md`
- **Technical Details**: `docs/enhancements/CUSTOM_FIELD_COLUMNS_SETTING.md`
- **Testing**: `docs/testing/CUSTOM_FIELD_COLUMNS_TESTING_CHECKLIST.md`

## API

```typescript
// EventSettings interface
interface EventSettings {
  customFieldColumns?: number;  // 3-10, default 7
}

// GET /api/event-settings
{
  "customFieldColumns": 7
}

// PUT /api/event-settings
{
  "customFieldColumns": 8
}
```

## Support

1. Check browser console for errors
2. Verify migration ran successfully
3. Test with different values
4. Review full documentation

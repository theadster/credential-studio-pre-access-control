---
title: "Access Control Environment Variable Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2026-01-17
review_interval_days: 180
related_code: ["src/lib/accessControlFeature.ts", ".env.example"]
---

# Access Control Environment Variable Migration

## Overview

The Access Control feature has been migrated from being configured through the Event Settings UI to being controlled via an environment variable. This change makes Access Control a global feature flag that applies to the entire application instance, rather than a per-event setting.

**Date:** January 17, 2026

## What Changed

### Before
- Access Control was enabled/disabled through the Event Settings form in the UI
- Each event could have its own Access Control configuration
- The toggle was stored in the `event_settings` table

### After
- Access Control is now enabled/disabled via the `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL` environment variable
- It's a global feature flag for the entire application
- When disabled, all Access Control UI elements are hidden across the application
- The `accessControlTimeMode` setting remains in Event Settings to control date vs. date-time mode

## Migration Steps

### For Deployment

1. **Update your `.env.local` or deployment environment variables:**
   ```bash
   # Enable Access Control globally
   NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true
   
   # Or disable it
   NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=false
   ```

2. **Restart the application** for the change to take effect

3. **Verify Access Control is working:**
   - If enabled: Access Control tab should appear in the dashboard
   - If disabled: Access Control tab should be hidden

### For Development

1. **Copy the environment variable to your `.env.local`:**
   ```bash
   NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true
   ```

2. **Restart the development server:**
   ```bash
   npm run dev
   ```

3. **Test that Access Control features are visible/hidden as expected**

## Configuration

### Environment Variable

**Variable Name:** `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL`

**Type:** String (boolean-like)

**Valid Values:**
- `true` - Access Control feature is enabled
- `false` - Access Control feature is disabled (default)

**Default:** `false` (disabled)

**Scope:** Public (visible to frontend code)

### Example `.env.local`

```bash
# Site Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ... other configuration ...

# Access Control Feature Flag
# Set to 'true' to enable the Access Control feature globally
# When disabled, the Access Control tab and all related functionality will be hidden
# Default: false (disabled)
NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true
```

## What This Affects

### Visible Changes

When `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true`:
- Access Control tab appears in the dashboard
- Access Control fields appear in the attendee form
- Access Control fields appear in the export dialog
- Access Control filters appear in the advanced filters dialog
- Mobile scanning includes access control validation

When `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=false`:
- Access Control tab is hidden
- Access Control fields are hidden from forms
- Access Control fields are hidden from export options
- Access Control filters are hidden from advanced filters
- Mobile scanning skips access control validation

### Code Changes

The feature flag is checked using:
```typescript
import { isAccessControlEnabledForEvent } from '@/lib/accessControlFeature';

// In components
if (isAccessControlEnabledForEvent(eventSettings)) {
  // Show Access Control UI
}
```

### Data Persistence

- Existing Access Control data in the database is NOT deleted
- The `accessControlTimeMode` setting remains in Event Settings
- When re-enabling Access Control, all existing data is still available

## Rollback

If you need to disable Access Control:

1. **Update the environment variable:**
   ```bash
   NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=false
   ```

2. **Restart the application**

3. **All Access Control UI will be hidden**, but data remains in the database

4. **To re-enable**, set the variable back to `true` and restart

## Related Documentation

- `.env.example` - Environment variable configuration template
- `src/lib/accessControlFeature.ts` - Feature flag implementation
- `docs/enhancements/ACCESS_CONTROL_EXPORT_ENHANCEMENT.md` - Export functionality
- `docs/guides/INTEGRATION_SECURITY_GUIDE.md` - Security considerations

## FAQ

### Q: Can I have different Access Control settings for different events?
**A:** No, Access Control is now a global feature flag. All events either have it enabled or disabled together. However, the `accessControlTimeMode` can still be configured per-event in Event Settings.

### Q: What happens to existing Access Control data if I disable the feature?
**A:** The data remains in the database. When you re-enable the feature, all data is still available.

### Q: Do I need to update Event Settings?
**A:** No, the `accessControlTimeMode` setting in Event Settings is still used to control whether Access Control uses date-only or date-time mode. You only need to set the environment variable.

### Q: How do I know if Access Control is enabled?
**A:** Check your `.env.local` or deployment environment variables for `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL`. If it's set to `true`, Access Control is enabled.

### Q: Can I change this at runtime?
**A:** No, this is an environment variable that's set at build/deployment time. You must restart the application for changes to take effect.

## Troubleshooting

### Access Control tab not appearing

**Check:**
1. Is `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true` in your `.env.local`?
2. Did you restart the development server after changing the variable?
3. Check browser console for any errors

**Solution:**
```bash
# Set the variable
NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=true

# Restart the dev server
npm run dev
```

### Access Control fields appearing when they shouldn't

**Check:**
1. Is `NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=false` in your `.env.local`?
2. Did you restart the development server?

**Solution:**
```bash
# Set the variable to false
NEXT_PUBLIC_ENABLE_ACCESS_CONTROL=false

# Restart the dev server
npm run dev
```

### Changes not taking effect

**Solution:**
1. Stop the development server (Ctrl+C)
2. Clear Next.js cache: `rm -rf .next`
3. Restart the development server: `npm run dev`

## Timeline

- **January 17, 2026**: Access Control migrated to environment variable configuration
- **Previous**: Access Control was configured through Event Settings UI

## References

- **Commit:** Check git history for the migration commit
- **Environment Variables:** `.env.example`
- **Feature Implementation:** `src/lib/accessControlFeature.ts`
- **Related Specs:** `.kiro/specs/access-control-feature/`


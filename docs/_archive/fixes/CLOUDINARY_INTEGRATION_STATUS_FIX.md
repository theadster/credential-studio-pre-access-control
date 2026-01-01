# Cloudinary Integration Status Check Fix

## Issue
In the Event Settings Integration tab, the Cloudinary connection status was showing:
```
⚠️ API credentials missing in environment variables (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)
```

Even though both `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` were correctly defined in `.env.local`.

## Root Cause
The integration status API endpoint (`src/pages/api/integrations/status.ts`) was checking for three environment variables:
1. `CLOUDINARY_CLOUD_NAME` ❌ (not an environment variable)
2. `CLOUDINARY_API_KEY` ✅
3. `CLOUDINARY_API_SECRET` ✅

However, `CLOUDINARY_CLOUD_NAME` is stored **per-event in the database**, not as an environment variable. This is by design because different events can use different Cloudinary accounts.

The status check was incorrectly requiring all three variables to be in the environment, causing it to always return `false` even when the API credentials were properly configured.

## Solution
Updated the integration status check to only verify the API credentials that should be in environment variables:

```typescript
// Check if required environment variables are configured
// Note: CLOUDINARY_CLOUD_NAME is stored per-event in the database, not in env vars
const status: IntegrationStatus = {
  cloudinary: !!(
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ),
  switchboard: !!process.env.SWITCHBOARD_API_KEY
};
```

## Architecture Note
The Cloudinary integration uses a hybrid configuration approach:
- **Environment Variables** (server-side only, secure):
  - `CLOUDINARY_API_KEY` - API authentication
  - `CLOUDINARY_API_SECRET` - API authentication
  
- **Database** (per-event configuration):
  - `cloudinaryCloudName` - The Cloudinary account to use
  - `cloudinaryUploadPreset` - Upload configuration
  - `cloudinaryEnabled` - Whether integration is active
  - Other Cloudinary settings (auto-optimize, thumbnails, etc.)

This design allows:
1. Secure credential storage (never exposed to client)
2. Multiple events to use different Cloudinary accounts
3. Per-event configuration of upload behavior

## Files Modified
- `src/pages/api/integrations/status.ts` - Fixed Cloudinary status check

## Testing
1. Ensure `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are in `.env.local`
2. Restart the development server (to load new env vars)
3. Navigate to Settings → Integrations tab
4. Verify Cloudinary shows "Ready to upload - configuration complete" when cloud name and upload preset are configured

## Related
- Event Settings Form displays the connection status
- The actual Cloudinary upload functionality uses these credentials server-side
- Client-side upload widget uses the upload preset (unsigned uploads)

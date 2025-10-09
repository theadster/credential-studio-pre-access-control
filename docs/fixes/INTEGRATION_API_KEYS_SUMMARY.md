# Integration API Keys Migration Summary

## Overview

All integration API keys have been successfully moved from the database to environment variables for improved security.

## Integrations Updated

### ✅ Switchboard Canvas
- **Files Updated:**
  - `src/pages/api/attendees/[id]/generate-credential.ts`
  - `src/pages/api/switchboard/test.ts`
- **Environment Variable:** `SWITCHBOARD_API_KEY`
- **Status:** ✅ Fixed and tested

### ✅ Cloudinary
- **Helper Module:** `src/lib/cloudinary-config.ts`
- **Environment Variables:**
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- **Status:** ✅ Helper module already in place

## Environment Variables Required

Add to `.env.local`:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Switchboard Canvas Configuration
SWITCHBOARD_API_KEY=your_switchboard_api_key
```

## Changes Made

### 1. TypeScript Interfaces Updated
- Removed `apiKey` and `apiSecret` fields from `CloudinaryIntegration`
- Removed `apiKey` field from `SwitchboardIntegration`
- Added security comments

### 2. API Routes Updated
- **Switchboard:** Now reads from `process.env.SWITCHBOARD_API_KEY`
- **Cloudinary:** Uses helper module `getCloudinaryCredentials()`

### 3. Database Schema
- Migration script created: `scripts/remove-api-key-attributes.ts`
- Run with: `npm run remove-api-keys`

### 4. Documentation Created
- [Switchboard Fix](./SWITCHBOARD_API_KEY_ENV_FIX.md)
- [Cloudinary Fix](./CLOUDINARY_API_KEY_ENV_FIX.md)
- [Integration API Keys Guide](../guides/INTEGRATION_API_KEYS_GUIDE.md)
- [Migration Guide](../migration/API_KEYS_REMOVAL_MIGRATION.md)

## Security Benefits

✅ **No credentials in database** - API keys never stored in database  
✅ **Server-side only** - Only accessible in API routes  
✅ **Easy rotation** - Update without database migrations  
✅ **Environment-specific** - Different keys for dev/staging/production  
✅ **Version control safe** - `.env.local` is gitignored  
✅ **Centralized management** - All keys in one place  

## Quick Start

### 1. Add Environment Variables

Edit `.env.local`:

```bash
# Cloudinary (get from https://cloudinary.com/console)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Switchboard Canvas (get from your dashboard)
SWITCHBOARD_API_KEY=your_switchboard_api_key
```

### 2. Run Migration Script

```bash
npm run remove-api-keys
```

This removes the API key columns from the database.

### 3. Restart Server

```bash
npm run dev
```

### 4. Test Integrations

- **Switchboard:** Generate a credential for an attendee
- **Cloudinary:** Upload a photo for an attendee

## Code Examples

### Switchboard Usage

```typescript
// Get API key from environment
const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;

// Validate configuration
if (!switchboardApiKey || !switchboardIntegration.apiEndpoint) {
  return res.status(400).json({ 
    error: 'Switchboard Canvas is not properly configured. Check SWITCHBOARD_API_KEY environment variable.' 
  });
}

// Use in API call
const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${switchboardApiKey}`
};
```

### Cloudinary Usage

```typescript
import { getCloudinaryConfig } from '@/lib/cloudinary-config';

// Get credentials from environment + settings from database
const config = getCloudinaryConfig(integration.uploadPreset);

// Configure Cloudinary SDK
const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: config.cloudName,
  api_key: config.apiKey,
  api_secret: config.apiSecret
});
```

## Troubleshooting

### "Switchboard Canvas is not properly configured"

**Solution:**
1. Add `SWITCHBOARD_API_KEY` to `.env.local`
2. Restart development server
3. Test credential generation

### "Cloudinary credentials not configured"

**Solution:**
1. Add all three Cloudinary variables to `.env.local`:
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
2. Restart development server
3. Test photo upload

### Environment Variables Not Loading

**Solution:**
1. Verify `.env.local` is in project root
2. Check variable names match exactly (case-sensitive)
3. Restart development server (required after .env changes)
4. Check you're accessing from server-side code (API routes)

## Migration Checklist

- [x] Update TypeScript interfaces
- [x] Add environment variables to `.env.local`
- [x] Update Switchboard API routes
- [x] Verify Cloudinary helper module
- [x] Create migration script
- [x] Add npm script for migration
- [x] Create documentation
- [ ] Run migration script: `npm run remove-api-keys`
- [ ] Test Switchboard integration
- [ ] Test Cloudinary integration
- [ ] Deploy to production with environment variables

## Production Deployment

When deploying to production:

1. **Set environment variables** in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Other platforms: Follow platform-specific instructions

2. **Set for correct environment:**
   - Production
   - Preview (optional)
   - Development (optional)

3. **Redeploy** after setting variables

4. **Test integrations** in production

## Related Files

- `src/lib/appwrite-integrations.ts` - TypeScript interfaces
- `src/lib/cloudinary-config.ts` - Cloudinary helper module
- `src/pages/api/attendees/[id]/generate-credential.ts` - Switchboard usage
- `src/pages/api/switchboard/test.ts` - Switchboard test endpoint
- `scripts/remove-api-key-attributes.ts` - Migration script
- `.env.local` - Environment variables

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the detailed fix documents:
   - [Switchboard Fix](./SWITCHBOARD_API_KEY_ENV_FIX.md)
   - [Cloudinary Fix](./CLOUDINARY_API_KEY_ENV_FIX.md)
3. Check the [Integration API Keys Guide](../guides/INTEGRATION_API_KEYS_GUIDE.md)

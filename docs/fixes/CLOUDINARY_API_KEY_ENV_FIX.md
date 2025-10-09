# Cloudinary API Keys Environment Variable Configuration

## Overview

Cloudinary API credentials (API Key, API Secret, and Cloud Name) are now stored securely in environment variables instead of the database. This document explains the configuration and usage.

## Configuration Helper

A dedicated helper module exists at `src/lib/cloudinary-config.ts` that provides secure access to Cloudinary credentials.

### Key Functions

```typescript
// Get credentials from environment variables
const credentials = getCloudinaryCredentials();

// Get full config with upload preset from database
const config = getCloudinaryConfig(uploadPreset);

// Check if Cloudinary is configured
if (isCloudinaryConfigured()) {
  // Proceed with Cloudinary operations
}

// Get safe config for logging (credentials redacted)
console.log(getSafeCloudinaryConfig());
```

## Environment Variables Required

Add to `.env.local`:

```bash
# Cloudinary Configuration
# Get these from your Cloudinary dashboard at https://cloudinary.com/console
# Note: cloudName is stored in the database (per event), only API credentials here
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### Where to Find These Values

1. Go to https://cloudinary.com/console
2. Navigate to your dashboard
3. Find the "Account Details" section
4. Copy:
   - **API Key** → `CLOUDINARY_API_KEY`
   - **API Secret** → `CLOUDINARY_API_SECRET`

**Note:** The **Cloud name** is stored in the database (in the Cloudinary integration collection) and is retrieved from there, not from environment variables. This allows different events to use different Cloudinary accounts.

## Usage in API Routes

### Example: Photo Upload

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { getCloudinaryConfig } from '@/lib/cloudinary-config';
import { getCloudinaryIntegration } from '@/lib/appwrite-integrations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get integration settings from database (cloudName, uploadPreset, etc.)
    const integration = await getCloudinaryIntegration(databases, eventSettingsId);
    
    if (!integration?.enabled) {
      return res.status(400).json({ error: 'Cloudinary integration not enabled' });
    }
    
    // Merge database config (cloudName, uploadPreset) with environment secrets (apiKey, apiSecret)
    const config = getCloudinaryConfig(integration.cloudName, integration.uploadPreset);
    
    // Configure Cloudinary SDK
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret
    });
    
    // Upload image
    const result = await cloudinary.uploader.upload(imageUrl, {
      upload_preset: config.uploadPreset,
      // Other options from integration settings
      auto_optimize: integration.autoOptimize,
      generate_thumbnails: integration.generateThumbnails
    });
    
    res.json(result);
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

### Example: Check Configuration

```typescript
import { isCloudinaryConfigured } from '@/lib/cloudinary-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!isCloudinaryConfigured()) {
    return res.status(500).json({ 
      error: 'Cloudinary integration not configured. Check environment variables.' 
    });
  }
  
  // Proceed with Cloudinary operations
}
```

## Database Schema

The Cloudinary integration collection stores **configuration only**, not credentials:

### Stored in Database ✅ (Configuration - Not Secret)
- `enabled` - Whether integration is enabled
- `cloudName` - Cloud name (identifies which Cloudinary account)
- `uploadPreset` - Upload preset name
- `autoOptimize` - Auto-optimization setting
- `generateThumbnails` - Thumbnail generation setting
- `disableSkipCrop` - Crop behavior setting
- `cropAspectRatio` - Aspect ratio for cropping

### Stored in Environment Variables 🔒 (Secrets)
- `CLOUDINARY_API_KEY` - API key for authentication
- `CLOUDINARY_API_SECRET` - API secret for secure operations

**Why cloudName is in the database:**
- It's configuration, not a secret
- Different events can use different Cloudinary accounts
- Can be safely displayed in the UI
- Doesn't need to be rotated for security

## Security Benefits

✅ **No credentials in database** - API keys never stored in database  
✅ **Server-side only** - Environment variables only accessible server-side  
✅ **Easy rotation** - Update credentials without database changes  
✅ **Environment-specific** - Different keys for dev/staging/production  
✅ **Helper module** - Centralized, secure credential access  
✅ **Validation** - Built-in validation and error messages  

## Error Handling

The helper module provides clear error messages:

```typescript
try {
  const credentials = getCloudinaryCredentials();
} catch (error) {
  // Error message includes which variables are missing:
  // "Cloudinary credentials not configured. Missing environment variables: 
  //  CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY. 
  //  See docs/migration/CLOUDINARY_SECRETS_MIGRATION.md for configuration instructions."
}
```

## Testing

After adding environment variables:

1. **Restart development server:**
   ```bash
   npm run dev
   ```

2. **Test configuration:**
   ```typescript
   // In any API route
   import { getSafeCloudinaryConfig } from '@/lib/cloudinary-config';
   console.log(getSafeCloudinaryConfig());
   // Should output: { cloudName: 'your-cloud', apiKey: '***REDACTED***', ... }
   ```

3. **Test upload functionality:**
   - Upload a photo for an attendee
   - Check Cloudinary dashboard for the uploaded image

## Migration from Database Storage

If you previously stored Cloudinary credentials in the database:

1. **Export credentials** from database (if needed)
2. **Add to `.env.local`:**
   ```bash
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
3. **Run migration script:**
   ```bash
   npm run remove-api-keys
   ```
4. **Restart server**
5. **Test photo uploads**

## Troubleshooting

### Error: "Cloudinary credentials not configured"

**Solution:**
1. Check `.env.local` has all three variables
2. Verify variable names match exactly (case-sensitive)
3. Restart development server
4. Check you're calling from server-side code

### Upload Fails with Authentication Error

**Solution:**
1. Verify credentials are correct in Cloudinary dashboard
2. Check API key has necessary permissions
3. Ensure you're using the correct cloud name
4. Check credentials haven't expired

### Different Cloudinary Accounts per Event

**Current Limitation:** The helper module uses a single set of credentials from environment variables.

**Workarounds:**
1. Use Cloudinary sub-accounts with different upload presets
2. Implement custom logic to select credentials based on event
3. Use Appwrite Functions with per-function environment variables
4. Use an external secrets manager (AWS Secrets Manager, etc.)

## Related Documentation

- [Integration API Keys Guide](../guides/INTEGRATION_API_KEYS_GUIDE.md)
- [API Keys Removal Migration](../migration/API_KEYS_REMOVAL_MIGRATION.md)
- [Cloudinary Config Helper](../../src/lib/cloudinary-config.ts)

## Notes

- The `cloudName` is stored in both the database and environment variables
  - Database: For display/configuration purposes
  - Environment: Required by Cloudinary SDK
- The helper module intentionally provides no way to store or retrieve credentials from the database
- All credential access must go through environment variables
- For multi-tenant scenarios, consider using Appwrite Functions or external secrets management

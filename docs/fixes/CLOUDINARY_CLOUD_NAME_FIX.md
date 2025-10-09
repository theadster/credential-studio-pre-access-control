# Cloudinary Cloud Name Configuration Fix

## Issue

The `cloudinary-config.ts` helper was incorrectly expecting `CLOUDINARY_CLOUD_NAME` from environment variables, but this value should come from the database since it's configuration (not a secret) and can vary per event.

## Root Cause

The helper module was treating `cloudName` as a secret credential when it's actually just configuration that identifies which Cloudinary account to use.

## Solution

Updated `src/lib/cloudinary-config.ts` to:
1. Get `cloudName` from database (passed as parameter)
2. Get only API credentials (`apiKey`, `apiSecret`) from environment variables

## Changes Made

### 1. Updated Helper Module

**Before:**
```typescript
export function getCloudinaryCredentials(): CloudinaryCredentials {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;  // ❌ Wrong
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  // ...
}

export function getCloudinaryConfig(uploadPreset?: string): CloudinaryConfig {
  const credentials = getCloudinaryCredentials();
  return { ...credentials, uploadPreset };
}
```

**After:**
```typescript
export function getCloudinarySecrets(): CloudinarySecrets {
  // Only get API credentials from environment
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  // ...
}

export function getCloudinaryConfig(cloudName: string, uploadPreset?: string): CloudinaryConfig {
  if (!cloudName) {
    throw new Error('Cloud name is required. This should come from the database integration settings.');
  }
  
  const secrets = getCloudinarySecrets();
  return { cloudName, ...secrets, uploadPreset };
}
```

### 2. Updated Environment Variables

**Removed from `.env.local`:**
```bash
CLOUDINARY_CLOUD_NAME=  # ❌ Not needed
```

**Kept in `.env.local`:**
```bash
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Updated Usage Pattern

**Before:**
```typescript
// ❌ Wrong - cloudName from environment
const config = getCloudinaryConfig(integration.uploadPreset);
```

**After:**
```typescript
// ✅ Correct - cloudName from database
const integration = await getCloudinaryIntegration(databases, eventSettingsId);
const config = getCloudinaryConfig(integration.cloudName, integration.uploadPreset);
```

## Why This Matters

### Configuration vs Secrets

| Property | Type | Storage | Reason |
|----------|------|---------|--------|
| `cloudName` | Configuration | Database | - Not a secret<br>- Can vary per event<br>- Safe to display in UI<br>- Doesn't need rotation |
| `apiKey` | Secret | Environment | - Authentication credential<br>- Must be kept secret<br>- Needs rotation capability<br>- Never in database |
| `apiSecret` | Secret | Environment | - Authentication credential<br>- Must be kept secret<br>- Needs rotation capability<br>- Never in database |

### Benefits

✅ **Multi-tenant support** - Different events can use different Cloudinary accounts  
✅ **Proper separation** - Configuration in database, secrets in environment  
✅ **Security** - API credentials never in database  
✅ **Flexibility** - Easy to change cloudName per event  
✅ **UI-friendly** - cloudName can be displayed/edited in settings  

## Updated API Usage

### Complete Example

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { getCloudinaryConfig } from '@/lib/cloudinary-config';
import { getCloudinaryIntegration } from '@/lib/appwrite-integrations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Get integration settings from database
    const integration = await getCloudinaryIntegration(databases, eventSettingsId);
    
    if (!integration?.enabled) {
      return res.status(400).json({ error: 'Cloudinary not enabled' });
    }
    
    // 2. Merge database config (cloudName) with environment secrets (apiKey, apiSecret)
    const config = getCloudinaryConfig(
      integration.cloudName,      // From database
      integration.uploadPreset    // From database
    );
    
    // 3. Configure Cloudinary SDK
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: config.cloudName,   // From database
      api_key: config.apiKey,         // From environment
      api_secret: config.apiSecret    // From environment
    });
    
    // 4. Use Cloudinary
    const result = await cloudinary.uploader.upload(imageUrl, {
      upload_preset: config.uploadPreset,
      auto_optimize: integration.autoOptimize,
      generate_thumbnails: integration.generateThumbnails
    });
    
    res.json(result);
  } catch (error) {
    console.error('Cloudinary error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
}
```

## Database Schema

The Cloudinary integration collection stores:

```typescript
{
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  cloudName: string;           // ✅ Configuration - stored in database
  // apiKey: removed            // ❌ Secret - moved to environment
  // apiSecret: removed         // ❌ Secret - moved to environment
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}
```

## Testing

1. **Verify environment variables:**
   ```bash
   # .env.local should have:
   CLOUDINARY_API_KEY=your_key
   CLOUDINARY_API_SECRET=your_secret
   # Should NOT have:
   # CLOUDINARY_CLOUD_NAME=...
   ```

2. **Verify database has cloudName:**
   - Check Cloudinary integration collection
   - Each integration document should have `cloudName` field

3. **Test photo upload:**
   - Upload a photo for an attendee
   - Should use cloudName from database
   - Should use API credentials from environment

## Migration Notes

- No database migration needed (cloudName already in database)
- Just remove `CLOUDINARY_CLOUD_NAME` from `.env.local`
- Update any code that calls `getCloudinaryConfig()` to pass `cloudName`

## Related Documentation

- [Cloudinary API Key Fix](./CLOUDINARY_API_KEY_ENV_FIX.md)
- [Integration API Keys Guide](../guides/INTEGRATION_API_KEYS_GUIDE.md)
- [Cloudinary Config Helper](../../src/lib/cloudinary-config.ts)

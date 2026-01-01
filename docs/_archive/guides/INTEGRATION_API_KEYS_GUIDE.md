# Integration API Keys Guide

## Overview

Integration API keys (Cloudinary, Switchboard Canvas) are stored securely in environment variables, **NOT** in the database. This guide explains how to configure and use them.

## Configuration

### 1. Add API Keys to .env.local

```bash
# Cloudinary Configuration
# Get these from: https://cloudinary.com/console
# Note: cloudName is stored in the database (per event), only API credentials here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Switchboard Canvas Configuration
# Get your API key from Switchboard Canvas dashboard
SWITCHBOARD_API_KEY=your_api_key_here
```

### 2. Restart Development Server

After adding environment variables, restart your server:

```bash
npm run dev
```

## Usage in Code

### Server-Side Only

API keys are **only accessible server-side** (API routes, server components):

```typescript
// ✅ CORRECT - Server-side (API route)
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
  const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;
  const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;
  
  // Use the keys for API calls
}
```

```typescript
// ❌ WRONG - Client-side (will be undefined)
function MyComponent() {
  const apiKey = process.env.CLOUDINARY_API_KEY; // undefined!
  // This won't work in browser
}
```

### Example: Cloudinary Upload

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { getCloudinaryConfig } from '@/lib/cloudinary-config';
import { getCloudinaryIntegration } from '@/lib/appwrite-integrations';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get integration settings from database (includes cloudName)
  const integration = await getCloudinaryIntegration(databases, eventSettingsId);
  
  // Merge database config with environment secrets
  const config = getCloudinaryConfig(integration.cloudName, integration.uploadPreset);
  
  // Use Cloudinary SDK
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: config.cloudName,  // From database
    api_key: config.apiKey,        // From environment
    api_secret: config.apiSecret   // From environment
  });
  
  // Upload image
  const result = await cloudinary.uploader.upload(imageUrl);
  res.json(result);
}
```

### Example: Switchboard Canvas API Call

```typescript
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get configuration from database
  const switchboardConfig = await getSwitchboardIntegration(databases, eventId);
  
  // Get API key from environment
  const apiKey = process.env.SWITCHBOARD_API_KEY;
  
  // Make API call
  const response = await fetch(switchboardConfig.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [switchboardConfig.authHeaderType]: apiKey
    },
    body: switchboardConfig.requestBody
  });
  
  const result = await response.json();
  res.json(result);
}
```

## Database vs Environment Variables

### Stored in Database ✅
- Integration enabled/disabled status
- API endpoints
- Configuration settings (upload preset, template ID, etc.)
- Field mappings
- Request body templates

### Stored in Environment Variables 🔒
- API keys
- API secrets
- Authentication tokens

## Security Best Practices

### ✅ DO

- Store API keys in `.env.local`
- Add `.env.local` to `.gitignore`
- Use different keys for dev/staging/production
- Rotate keys regularly
- Use environment-specific keys
- Access keys only in server-side code

### ❌ DON'T

- Commit API keys to version control
- Store API keys in the database
- Expose API keys to the client
- Use production keys in development
- Share API keys in chat/email
- Log API keys in console

## Environment Setup

### Development (.env.local)
```bash
CLOUDINARY_API_KEY=dev_key_123
CLOUDINARY_API_SECRET=dev_secret_456
SWITCHBOARD_API_KEY=dev_switchboard_789
```

### Production (Vercel/Hosting Platform)

Set environment variables in your hosting platform:

**Vercel:**
1. Go to Project Settings → Environment Variables
2. Add each variable
3. Select "Production" environment
4. Redeploy

**Other Platforms:**
- Follow platform-specific instructions for environment variables
- Ensure variables are set for the correct environment

## Troubleshooting

### API Key is Undefined

**Problem:** `process.env.CLOUDINARY_API_KEY` returns `undefined`

**Solutions:**
1. Check `.env.local` file exists in project root
2. Verify variable name matches exactly (case-sensitive)
3. Restart development server
4. Check you're accessing from server-side code

### Integration Not Working

**Problem:** Integration fails with authentication error

**Solutions:**
1. Verify API keys are correct
2. Check API key has necessary permissions
3. Ensure keys are for the correct environment
4. Check API key hasn't expired

### Different Keys for Different Events

**Problem:** Need different API keys per event

**Solution:** 
- Store multiple keys with prefixes:
  ```bash
  EVENT_1_CLOUDINARY_API_KEY=key1
  EVENT_2_CLOUDINARY_API_KEY=key2
  ```
- Or use a single account with proper access controls

## Migration from Database Storage

If you previously stored API keys in the database:

1. **Export existing keys** (if needed)
2. **Add to .env.local**
3. **Run migration script:**
   ```bash
   npm run remove-api-keys
   ```
4. **Restart server**
5. **Test integrations**

See `docs/migration/API_KEYS_REMOVAL_MIGRATION.md` for details.

## FAQ

**Q: Why not store API keys in the database?**  
A: Security. Database breaches could expose all API keys. Environment variables are more secure and easier to rotate.

**Q: Can I use different keys per event?**  
A: Yes, but you'll need to implement custom logic to select the appropriate key based on the event.

**Q: What if I need to change an API key?**  
A: Update the environment variable and restart the server. No database migration needed.

**Q: Are environment variables secure?**  
A: Yes, when properly configured. They're not exposed to the client and are separate from your codebase.

**Q: Can I access these in React components?**  
A: No. Only server-side code (API routes) can access these variables. Client-side code should call API routes instead.

## Related Documentation

- [API Keys Removal Migration](../migration/API_KEYS_REMOVAL_MIGRATION.md)
- [Integration Collections](../migration/INTEGRATION_COLLECTIONS_MIGRATION.md)
- [Appwrite Integrations](../../src/lib/appwrite-integrations.ts)

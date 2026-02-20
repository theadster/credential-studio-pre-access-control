---
title: "Integration Secrets Migration"
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: ["scripts/setup-appwrite.ts"]
---

# Integration Secrets Migration Guide

## Overview

This document describes the security improvement made to CredentialStudio's handling of third-party integration API credentials. Previously, API keys and secrets were stored in plain text in the Appwrite database, which posed a significant security risk. This has been remediated by removing secret storage from the database entirely.

## Security Issue

**Problem:** The migration script `migrate-with-integration-collections.ts` was persisting integration API credentials as plain text:
- Cloudinary: `cloudinaryApiKey`, `cloudinaryApiSecret` in `cloudinary_integrations` table
- Switchboard: `switchboardApiKey` in `switchboard_integrations` table

**Risk:** 
- Database breaches would expose API credentials
- Anyone with database read access could view secrets
- Credentials visible in database backups and logs
- Violates security best practices and compliance requirements

## Solution

API credentials are **no longer stored in the database**. Instead, they must be configured using secure methods:

### Option 1: Environment Variables (Recommended for Single-Tenant)

Best for applications serving a single organization or event.

**Configuration:**

Add to your `.env.local` file:

```bash
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Switchboard Configuration
SWITCHBOARD_API_KEY=your-switchboard-key
```

**Usage in Code:**

```typescript
// Server-side only (API routes, server components)
import { getCloudinaryCredentials } from '@/lib/cloudinary-config';

// Cloudinary
const cloudinaryConfig = getCloudinaryCredentials();
// Returns: { cloudName, apiKey, apiSecret }

// Switchboard
const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;
if (!switchboardApiKey) {
  throw new Error('Switchboard API key not configured');
}
```

**Deployment:**

- **Vercel:** Add environment variables in Project Settings → Environment Variables
- **Docker:** Pass via `-e` flags or docker-compose environment section
- **Other platforms:** Follow platform-specific environment variable configuration

### Option 2: Appwrite Functions Environment Variables (Multi-Tenant)

Best for multi-tenant applications where different events/organizations use different integration accounts.

**Configuration:**

1. Create Appwrite Functions for integration operations
2. In Appwrite Console → Functions → [Your Function] → Settings → Environment Variables
3. Add per-function environment variables:
   - Cloudinary: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - Switchboard: `SWITCHBOARD_API_KEY`

**Usage:**

```typescript
// In Appwrite Function
export default async ({ req, res, log, error }) => {
  const cloudinaryConfig = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
  
  // Use cloudinaryConfig for operations
  // ...
};
```

**For Multi-Tenant:**

Store a mapping of `eventSettingsId` → `functionId` in the database, then invoke the appropriate function based on the event. Each function can have different credentials for different tenants.

### Option 3: External Secrets Manager (Enterprise)

Best for enterprise deployments with strict security requirements.

**Supported Services:**
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault
- Google Cloud Secret Manager

**Example with AWS Secrets Manager:**

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

async function getIntegrationCredentials(eventId: string, integration: 'cloudinary' | 'switchboard') {
  const client = new SecretsManagerClient({ region: "us-east-1" });
  
  const command = new GetSecretValueCommand({
    SecretId: `credentialstudio/${integration}/${eventId}`,
  });
  
  const response = await client.send(command);
  return JSON.parse(response.SecretString);
}

// Usage
const cloudinarySecrets = await getIntegrationCredentials(eventId, 'cloudinary');
const switchboardSecrets = await getIntegrationCredentials(eventId, 'switchboard');
```

## Migration Changes

### Database Schema Changes

**Removed Columns:**
- `cloudinary_integrations.apiKey` (removed)
- `cloudinary_integrations.apiSecret` (removed)
- `switchboard_integrations.apiKey` (removed)

**Retained Columns:**
- `cloudinary_integrations.enabled`
- `cloudinary_integrations.cloudName`
- `cloudinary_integrations.uploadPreset`
- `cloudinary_integrations.autoOptimize`
- `cloudinary_integrations.generateThumbnails`
- `cloudinary_integrations.disableSkipCrop`
- `cloudinary_integrations.cropAspectRatio`

### Code Changes Required

#### 1. Update API Routes

**Before:**
```typescript
// Reading from database (INSECURE)
const cloudinary = await getCloudinaryIntegration(eventSettingsId);
const apiKey = cloudinary.apiKey;
const apiSecret = cloudinary.apiSecret;
```

**After:**
```typescript
// Reading from environment variables (SECURE)
import { getCloudinaryCredentials } from '@/lib/cloudinary-config';

const cloudinary = await getCloudinaryIntegration(eventSettingsId);
const credentials = getCloudinaryCredentials(); // Throws if not configured

// For Switchboard
const switchboard = await getSwitchboardIntegration(eventSettingsId);
const switchboardApiKey = process.env.SWITCHBOARD_API_KEY;
if (!switchboardApiKey) {
  throw new Error('Switchboard API key not configured');
}
```

#### 2. Update Event Settings Form

Remove or disable the API key/secret input fields in the UI:

```typescript
// Remove these fields from EventSettingsForm.tsx
// - cloudinaryApiKey input
// - cloudinaryApiSecret input
// - switchboardApiKey input

// Add informational message instead
<Alert>
  <AlertDescription>
    Integration API credentials are configured via environment variables for security.
    Contact your system administrator to update credentials.
  </AlertDescription>
</Alert>
```

#### 3. Update Integration Helper

Update `src/lib/appwrite-integrations.ts`:

```typescript
export function flattenEventSettings(settings: EventSettingsWithIntegrations): any {
  const { cloudinary, switchboard, oneSimpleApi, ...coreSettings } = settings;
  
  return {
    ...coreSettings,
    // Cloudinary fields
    cloudinaryEnabled: cloudinary?.enabled || false,
    cloudinaryCloudName: cloudinary?.cloudName || '',
    // REMOVED: cloudinaryApiKey and cloudinaryApiSecret
    // These are now read from environment variables
    cloudinaryUploadPreset: cloudinary?.uploadPreset || '',
    cloudinaryAutoOptimize: cloudinary?.autoOptimize || false,
    // ... other fields
  };
}
```

## Migration Checklist

- [ ] Run updated migration script: `npx tsx src/scripts/migrate-with-integration-collections.ts`
- [ ] Add integration credentials to `.env.local` (or chosen secrets method)
- [ ] Update API routes to read credentials from environment variables
- [ ] Remove credential input fields from UI forms
- [ ] Update `appwrite-integrations.ts` helper functions
- [ ] Update any code that reads API keys/secrets from database
- [ ] Test Cloudinary upload functionality
- [ ] Test Switchboard printing functionality
- [ ] Update deployment configuration with environment variables
- [ ] Document credential rotation procedures
- [ ] Add monitoring for credential expiration/rotation

## Security Best Practices

### DO ✅

- Store credentials in environment variables or secrets managers
- Use different credentials for development, staging, and production
- Rotate credentials regularly (every 90 days recommended)
- Restrict API key permissions to minimum required (upload only)
- Monitor API usage for anomalies
- Use HTTPS for all API communications
- Implement rate limiting on upload endpoints

### DON'T ❌

- Store credentials in database (plain text or encrypted)
- Commit credentials to version control
- Share credentials via email or chat
- Use production credentials in development
- Log credentials in application logs
- Expose credentials in client-side code
- Use overly permissive API keys

## Credential Rotation

When rotating Cloudinary credentials:

1. Generate new API key/secret in Cloudinary dashboard
2. Update environment variables with new credentials
3. Test functionality with new credentials
4. Revoke old credentials in Cloudinary dashboard
5. Update documentation with rotation date

## Troubleshooting

### Error: "Cloudinary credentials not configured"

**Cause:** Environment variables not set or not accessible.

**Solution:**
1. Verify `.env.local` contains credentials
2. Restart development server to load new environment variables
3. Check deployment platform environment variable configuration

### Error: "Invalid API credentials"

**Cause:** Incorrect or expired credentials.

**Solution:**
1. Verify credentials in Cloudinary dashboard
2. Check for typos in environment variables
3. Ensure no extra whitespace in credential values
4. Regenerate credentials if necessary

### Uploads fail after migration

**Cause:** Code still trying to read credentials from database.

**Solution:**
1. Search codebase for `cloudinaryApiKey` and `cloudinaryApiSecret`
2. Update all references to use environment variables
3. Clear any cached configuration

## Additional Resources

- [Cloudinary Security Best Practices](https://cloudinary.com/documentation/security)
- [Appwrite Functions Environment Variables](https://appwrite.io/docs/functions)
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)

## Support

For questions or issues related to this migration:
1. Review this documentation thoroughly
2. Check existing GitHub issues
3. Create a new issue with detailed information about your setup

---

**Last Updated:** 2025-10-07  
**Migration Script Version:** migrate-with-integration-collections.ts (security-hardened)

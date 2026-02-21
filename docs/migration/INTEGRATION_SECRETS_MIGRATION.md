---
title: Integration Secrets Migration Guide
type: runbook
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 180
related_code:
  - src/lib/appwrite-integrations.ts
  - scripts/setup-appwrite.ts
---

# Integration Secrets Migration Guide

## Overview

This guide covers secure handling of integration secrets (Cloudinary, Switchboard, OneSimpleAPI) when migrating from plaintext database storage to secure credential management.

## ⚠️ CRITICAL SECURITY ISSUE

**DO NOT store API secrets in the database in plaintext.** This poses a critical security risk:
- Exposed via database backups
- Visible in logs
- Accessible to anyone with database access
- Violates compliance requirements (PCI-DSS, SOC 2, etc.)

## Secure Approaches

### Option 1: Environment Variables (Recommended for Simple Deployments)

Store secrets as environment variables and load them at runtime:

```env
# .env.local (never commit to git)
CLOUDINARY_API_SECRET=your_secret_here
SWITCHBOARD_API_KEY=your_key_here
ONESIMPLEAPI_API_KEY=your_key_here
```

Load in your application:

```typescript
const cloudinarySecret = process.env.CLOUDINARY_API_SECRET;
const switchboardKey = process.env.SWITCHBOARD_API_KEY;
```

**Pros**: Simple, no additional infrastructure
**Cons**: Secrets visible in process environment, not ideal for multi-tenant

### Option 2: AWS Secrets Manager (Recommended for Production)

Store secrets in AWS Secrets Manager and retrieve at runtime:

```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<string> {
  try {
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await client.send(command);
    
    // Handle both SecretString and SecretBinary
    if (response.SecretString) {
      // If stored as JSON, parse it
      try {
        const parsed = JSON.parse(response.SecretString);
        return parsed.apiKey || response.SecretString;
      } catch {
        // If not JSON, return as-is
        return response.SecretString;
      }
    }
    
    if (response.SecretBinary) {
      // Handle binary secrets - SecretBinary is a Uint8Array from AWS SDK v3
      const buffer = Buffer.from(response.SecretBinary);
      return buffer.toString('utf-8');
    }
    
    throw new Error('Secret not found');
  } catch (error: any) {
    console.error(`Failed to retrieve secret ${secretName}:`, error.message);
    throw new Error(`Secret retrieval failed: ${error.message}`);
  }
}

// Usage
const cloudinarySecret = await getSecret('cloudinary/api-secret');
```

**Pros**: Secure, auditable, supports rotation
**Cons**: Requires AWS account, additional latency

### Option 3: Appwrite Encryption (If Using Appwrite Vault)

If using Appwrite's built-in encryption:

```typescript
// Store encrypted secret in database
const encryptedSecret = await encryptSecret(apiSecret);
await tablesDB.updateRow({
  databaseId: DATABASE_ID,
  tableId: EVENT_SETTINGS_TABLE_ID,
  rowId: eventSettingsId,
  data: {
    cloudinaryApiSecret: encryptedSecret,
  }
});

// Retrieve and decrypt
const encrypted = await tablesDB.getRow({
  databaseId: DATABASE_ID,
  tableId: EVENT_SETTINGS_TABLE_ID,
  rowId: eventSettingsId,
});
const decrypted = await decryptSecret(encrypted.cloudinaryApiSecret);
```

**Pros**: Integrated with Appwrite, encrypted at rest
**Cons**: Requires encryption key management

## Migration Steps

### Step 1: Identify Current Secrets

Find all plaintext secrets in the database:

```typescript
const eventSettings = await tablesDB.getRow({
  databaseId: DATABASE_ID,
  tableId: EVENT_SETTINGS_TABLE_ID,
  rowId: eventSettingsId,
});

const secrets = {
  cloudinaryApiSecret: eventSettings.cloudinaryApiSecret,
  switchboardApiKey: eventSettings.switchboardApiKey,
  oneSimpleApiKey: eventSettings.oneSimpleApiKey,
};
```

### Step 2: Move to Secure Storage

Choose one of the approaches above and migrate secrets:

```typescript
// Example: Move to environment variables
// 1. Set environment variables in your deployment
// 2. Update code to read from environment
// 3. Remove from database

// Example: Move to AWS Secrets Manager
// 1. Create secrets in AWS Secrets Manager
// 2. Update code to retrieve from AWS
// 3. Remove from database
```

### Step 3: Update Application Code

Update all code that reads integration secrets:

**Before (Insecure)**:
```typescript
const settings = await tablesDB.getRow({
  databaseId: DATABASE_ID,
  tableId: EVENT_SETTINGS_TABLE_ID,
  rowId: eventSettingsId,
});
const apiSecret = settings.cloudinaryApiSecret; // ❌ Plaintext in database
```

**After (Secure)**:
```typescript
// Option 1: Environment variables
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Option 2: AWS Secrets Manager
const apiSecret = await getSecret('cloudinary/api-secret');

// Option 3: Appwrite encryption
const encrypted = await tablesDB.getRow({
  databaseId: DATABASE_ID,
  tableId: EVENT_SETTINGS_TABLE_ID,
  rowId: eventSettingsId,
});
const apiSecret = await decryptSecret(encrypted.cloudinaryApiSecret);
```

### Step 4: Remove Secrets from Database

After migration, remove plaintext secrets from database:

```typescript
await tablesDB.updateRow({
  databaseId: DATABASE_ID,
  tableId: EVENT_SETTINGS_TABLE_ID,
  rowId: eventSettingsId,
  data: {
    cloudinaryApiSecret: null,
    switchboardApiKey: null,
    oneSimpleApiKey: null,
  }
});
```

### Step 5: Verify Migration

Test that integrations still work with new secret storage:

```bash
# Test Cloudinary integration
npm run test:cloudinary

# Test Switchboard integration
npm run test:switchboard

# Test OneSimpleAPI integration
npm run test:onesimpleapi
```

## Best Practices

1. **Never commit secrets to git**
   - Use `.gitignore` for `.env.local`
   - Use `.env.example` for template

2. **Rotate secrets regularly**
   - Set up automated rotation in AWS Secrets Manager
   - Update application to handle rotation gracefully

3. **Audit secret access**
   - Enable CloudTrail for AWS Secrets Manager
   - Log all secret retrievals
   - Alert on suspicious access patterns

4. **Use least privilege**
   - Grant only necessary permissions to retrieve secrets
   - Use IAM roles instead of access keys
   - Restrict secret access by environment

5. **Encrypt in transit**
   - Use HTTPS for all API calls
   - Use TLS for database connections
   - Encrypt environment variables in CI/CD

## Compliance

This approach helps meet compliance requirements:
- **PCI-DSS**: Secrets not stored in plaintext
- **SOC 2**: Audit trail of secret access
- **HIPAA**: Encryption of sensitive data
- **GDPR**: Secure handling of customer data

## Support

For questions about secure secret management:
- AWS Secrets Manager: https://docs.aws.amazon.com/secretsmanager/
- Appwrite Encryption: https://appwrite.io/docs/security
- Environment Variables: https://12factor.net/config


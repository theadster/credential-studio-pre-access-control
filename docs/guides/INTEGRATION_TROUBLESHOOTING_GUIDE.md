# Integration Troubleshooting Guide

## Overview

This guide provides solutions to common integration issues in credential.studio. The integration system uses a normalized database approach with optimistic locking for concurrency control, and understanding these patterns is key to troubleshooting effectively.

## Quick Diagnostic Checklist

When encountering integration issues, work through this checklist:

- [ ] Check environment variables are set correctly
- [ ] Verify integration is enabled in Event Settings
- [ ] Check browser console for client-side errors
- [ ] Review server logs for API errors
- [ ] Verify database permissions
- [ ] Check network connectivity
- [ ] Confirm Appwrite service is running
- [ ] Review recent code changes
- [ ] Check for concurrent update conflicts
- [ ] Verify integration collection exists

## Common Issues and Solutions

### 1. Optimistic Locking Conflicts

#### Symptom
```
IntegrationConflictError: Integration conflict: Cloudinary for event evt_123. 
Expected version 5, but found version 6.
```

#### Cause
Multiple users or processes attempted to update the same integration simultaneously. The version number in the database changed between when you read it and when you tried to update it.

#### How Optimistic Locking Works

1. Client reads integration document (version: 5)
2. Client modifies data locally
3. Client sends update with expectedVersion: 5
4. Server checks: current version === expectedVersion?
   - If YES: Update succeeds, increment version to 6
   - If NO: Throw IntegrationConflictError

#### Solution

**Automatic Retry (Recommended)**

The system automatically handles this in most cases:

```typescript
// In src/lib/appwrite-integrations.ts
export async function updateIntegrationWithLocking<T>(
  databases: Databases,
  collectionId: string,
  integrationType: string,
  eventSettingsId: string,
  data: any,
  expectedVersion?: number,
  getExisting?: () => Promise<T | null>
): Promise<T> {
  // ... validation code ...

  try {
    // Attempt update with version check
    const updated = await databases.updateDocument(
      DATABASE_ID,
      collectionId,
      existing.$id,
      updateData
    );
    return updated as T;
  } catch (error: any) {
    // Check if it's a version conflict
    if (error.message?.includes('version')) {
      throw new IntegrationConflictError(
        integrationType,
        eventSettingsId,
        expectedVersion!,
        existing.version
      );
    }
    throw error;
  }
}
```

**Manual Resolution**

If you encounter this error in the UI:

1. **Refresh the page** - This fetches the latest data
2. **Re-apply your changes** - Make your edits again
3. **Save** - The update will use the new version number

**Prevention**

- Avoid having multiple users edit the same integration simultaneously
- Implement UI indicators showing when someone else is editing
- Consider implementing real-time updates using Appwrite Realtime


### 2. Concurrent Create Conflicts

#### Symptom
```
Error: Document with the requested ID already exists
```

#### Cause
Two requests tried to create the same integration document at exactly the same time. This is rare but can happen during:
- Initial event setup
- Automated testing
- High-traffic scenarios
- Race conditions in client code

#### How It Happens

```
Time    Request A                Request B
----    ---------                ---------
T1      Check if exists (null)   
T2                               Check if exists (null)
T3      Create document          
T4                               Create document (FAILS!)
```

#### Solution

The system implements automatic retry with exponential backoff:

```typescript
// In src/lib/appwrite-integrations.ts
const maxRetries = 3;
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    // Try to create
    const created = await databases.createDocument(
      DATABASE_ID,
      collectionId,
      ID.unique(),
      createData
    );
    return created as T;
  } catch (createError: any) {
    // If document already exists, try to fetch and update instead
    if (createError.code === 409 || 
        createError.message?.includes('already exists')) {
      
      // Re-fetch to get the latest version
      const existing = await getExisting?.();
      if (!existing) throw createError;
      
      // Retry update with latest version
      try {
        return await databases.updateDocument(
          DATABASE_ID,
          collectionId,
          existing.$id,
          updateData
        ) as T;
      } catch (updateError) {
        if (attempt < maxRetries - 1) {
          // Exponential backoff: 50ms, 100ms, 200ms
          await new Promise(resolve => 
            setTimeout(resolve, 50 * Math.pow(2, attempt))
          );
          continue;
        }
        throw updateError;
      }
    }
    throw createError;
  }
}
```

#### Prevention

- The retry mechanism handles this automatically
- No manual intervention needed in most cases
- If you see this error repeatedly, check for client-side race conditions


### 3. getDocuments Returns Null

#### Symptom
```typescript
const cloudinary = await getCloudinaryIntegration(databases, eventSettingsId);
// cloudinary is null
```

#### Possible Causes

**1. Integration Never Created**

The integration document doesn't exist in the database yet.

**Solution:**
- Check if the integration was properly initialized during event setup
- Verify the setup script ran successfully
- Create the integration document if missing

**2. Wrong Event Settings ID**

You're querying with an incorrect `eventSettingsId`.

**Solution:**
```typescript
// Verify the ID is correct
console.log('Querying for eventSettingsId:', eventSettingsId);

// Check if event settings exist
const eventSettings = await databases.getDocument(
  DATABASE_ID,
  EVENT_SETTINGS_COLLECTION_ID,
  eventSettingsId
);
console.log('Event settings found:', eventSettings);
```

**3. Collection Doesn't Exist**

The integration collection hasn't been created in Appwrite.

**Solution:**
```bash
# Run the setup script
npm run setup:appwrite

# Or manually verify collections exist
node scripts/verify-appwrite-setup.ts
```

**4. Permission Issues**

The current user doesn't have permission to read the integration collection.

**Solution:**
- Check Appwrite collection permissions
- Verify the API key has read access
- Check user role permissions

**5. Network/Connection Issues**

Temporary network failure or Appwrite service unavailable.

**Solution:**
- Check network connectivity
- Verify Appwrite endpoint is accessible
- Check Appwrite service status
- Implement retry logic for transient failures

#### Debugging Steps

```typescript
export async function getCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string
): Promise<CloudinaryIntegration | null> {
  try {
    console.log('Fetching Cloudinary integration for:', eventSettingsId);
    
    const response = await databases.listDocuments(
      DATABASE_ID,
      CLOUDINARY_COLLECTION_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );
    
    console.log('Query response:', {
      total: response.total,
      documents: response.documents.length
    });
    
    if (response.documents.length === 0) {
      console.log('No Cloudinary integration found');
      return null;
    }
    
    return response.documents[0] as any;
  } catch (error: any) {
    console.error('Error fetching Cloudinary integration:', {
      code: error.code,
      message: error.message,
      type: error.type
    });
    
    // Return null for expected "not found" errors
    if (error.code === 404 || 
        error.code === 'document_not_found' || 
        error.code === 'collection_not_found') {
      return null;
    }
    
    // Re-throw unexpected errors
    throw error;
  }
}
```


### 4. Integration Fetch Failures with Promise.allSettled

#### Symptom
```
Error fetching integrations: Network request failed
```

Or one integration fails but blocks loading all integrations.

#### Problem

If you use `Promise.all()`, a single integration failure causes the entire fetch to fail:

```typescript
// ❌ BAD: One failure breaks everything
const [cloudinary, switchboard, oneSimpleApi] = await Promise.all([
  getCloudinaryIntegration(databases, eventSettingsId),
  getSwitchboardIntegration(databases, eventSettingsId),
  getOneSimpleApiIntegration(databases, eventSettingsId),
]);
// If any one fails, the entire operation fails
```

#### Solution: Use Promise.allSettled

```typescript
// ✅ GOOD: Partial failures are handled gracefully
const [cloudinaryResult, switchboardResult, oneSimpleApiResult] = 
  await Promise.allSettled([
    getCloudinaryIntegration(databases, eventSettingsId),
    getSwitchboardIntegration(databases, eventSettingsId),
    getOneSimpleApiIntegration(databases, eventSettingsId),
  ]);

// Helper function to extract values
function isFulfilled<T>(
  result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
  return result.status === 'fulfilled';
}

// Extract successful results, set null for failures
const cloudinaryData = isFulfilled(cloudinaryResult) 
  ? cloudinaryResult.value 
  : null;

const switchboardData = isFulfilled(switchboardResult)
  ? switchboardResult.value
  : null;

const oneSimpleApiData = isFulfilled(oneSimpleApiResult)
  ? oneSimpleApiResult.value
  : null;

// Log failures for debugging
if (!isFulfilled(cloudinaryResult)) {
  console.error('Failed to fetch Cloudinary integration:', 
    cloudinaryResult.reason);
}
if (!isFulfilled(switchboardResult)) {
  console.error('Failed to fetch Switchboard integration:', 
    switchboardResult.reason);
}
if (!isFulfilled(oneSimpleApiResult)) {
  console.error('Failed to fetch OneSimpleAPI integration:', 
    oneSimpleApiResult.reason);
}
```

#### Benefits

1. **Resilience**: One integration failure doesn't break the entire page
2. **Partial Functionality**: Users can still use working integrations
3. **Better UX**: Page loads even if some integrations are unavailable
4. **Debugging**: You can see which specific integration failed
5. **Graceful Degradation**: Failed integrations show as disabled/unavailable

#### Example: Event Settings API

```typescript
// In src/pages/api/event-settings/index.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // ... authentication code ...

  if (req.method === 'GET') {
    try {
      // Fetch core settings
      const eventSettings = await databases.getDocument(
        DATABASE_ID,
        EVENT_SETTINGS_COLLECTION_ID,
        eventSettingsId
      );

      // Fetch all integrations in parallel with graceful failure handling
      const [cloudinaryResult, switchboardResult, oneSimpleApiResult] = 
        await Promise.allSettled([
          getCloudinaryIntegration(databases, eventSettingsId),
          getSwitchboardIntegration(databases, eventSettingsId),
          getOneSimpleApiIntegration(databases, eventSettingsId),
        ]);

      // Extract results
      const cloudinary = isFulfilled(cloudinaryResult) 
        ? cloudinaryResult.value 
        : null;
      const switchboard = isFulfilled(switchboardResult)
        ? switchboardResult.value
        : null;
      const oneSimpleApi = isFulfilled(oneSimpleApiResult)
        ? oneSimpleApiResult.value
        : null;

      // Flatten into single object for backward compatibility
      const flattenedSettings = flattenEventSettings(
        eventSettings,
        cloudinary,
        switchboard,
        oneSimpleApi
      );

      return res.status(200).json(flattenedSettings);
    } catch (error) {
      console.error('Error fetching event settings:', error);
      return res.status(500).json({ 
        error: 'Failed to fetch event settings' 
      });
    }
  }
}
```


### 5. Environment Variable Issues

#### Symptom
```
Integration status check failed: API key not configured
```

Or integration appears enabled but doesn't work.

#### Verification Steps

**1. Check Environment Variables Exist**

```bash
# In your terminal
echo $CLOUDINARY_API_KEY
echo $CLOUDINARY_API_SECRET
echo $SWITCHBOARD_API_KEY
echo $ONESIMPLEAPI_API_KEY

# Or check .env.local file
cat .env.local | grep -E "(CLOUDINARY|SWITCHBOARD|ONESIMPLEAPI)"
```

**2. Verify Variables Are Loaded**

Create a test endpoint:

```typescript
// src/pages/api/debug/env-check.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const envVars = {
    cloudinary: {
      apiKey: !!process.env.CLOUDINARY_API_KEY,
      apiSecret: !!process.env.CLOUDINARY_API_SECRET,
      cloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    },
    switchboard: {
      apiKey: !!process.env.SWITCHBOARD_API_KEY,
    },
    oneSimpleApi: {
      apiKey: !!process.env.ONESIMPLEAPI_API_KEY,
    },
  };

  return res.status(200).json(envVars);
}
```

**3. Check Variable Naming**

Common mistakes:
- ❌ `CLOUDINARY_KEY` (wrong)
- ✅ `CLOUDINARY_API_KEY` (correct)
- ❌ `NEXT_PUBLIC_SWITCHBOARD_API_KEY` (wrong - should NOT be public)
- ✅ `SWITCHBOARD_API_KEY` (correct)

**4. Restart Development Server**

Environment variables are loaded at startup:

```bash
# Stop the server (Ctrl+C)
# Then restart
npm run dev
```

**5. Check .env.local vs .env**

- `.env.local` - Local development (gitignored)
- `.env` - Defaults (committed to git, no secrets)
- `.env.production` - Production overrides

Priority: `.env.local` > `.env.production` > `.env`

#### Common Environment Variable Errors

**Error: "CLOUDINARY_API_KEY is not defined"**

```typescript
// In your integration status check
if (!process.env.CLOUDINARY_API_KEY) {
  return res.status(200).json({
    cloudinary: {
      configured: false,
      message: 'CLOUDINARY_API_KEY environment variable not set'
    }
  });
}
```

**Solution:**
1. Add to `.env.local`:
   ```
   CLOUDINARY_API_KEY=your_key_here
   CLOUDINARY_API_SECRET=your_secret_here
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
   ```
2. Restart dev server
3. Verify with status check endpoint

**Error: "Cannot read property 'CLOUDINARY_API_KEY' of undefined"**

This means `process.env` itself is undefined, which shouldn't happen in Next.js. Check:
- You're running in a Next.js context (not a standalone script)
- Your Next.js version is up to date
- No webpack configuration issues


### 6. Integration Status Check Failures

#### Symptom
Integration shows as "Not Configured" even though settings are saved.

#### Integration Status Check Pattern

```typescript
// src/pages/api/integrations/status.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const status = {
      cloudinary: checkCloudinaryStatus(),
      switchboard: checkSwitchboardStatus(),
      oneSimpleApi: checkOneSimpleApiStatus(),
    };

    return res.status(200).json(status);
  } catch (error) {
    console.error('Error checking integration status:', error);
    return res.status(500).json({ error: 'Failed to check status' });
  }
}

function checkCloudinaryStatus() {
  const hasApiKey = !!process.env.CLOUDINARY_API_KEY;
  const hasApiSecret = !!process.env.CLOUDINARY_API_SECRET;
  const hasCloudName = !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

  return {
    configured: hasApiKey && hasApiSecret && hasCloudName,
    details: {
      apiKey: hasApiKey,
      apiSecret: hasApiSecret,
      cloudName: hasCloudName,
    },
    message: !hasApiKey 
      ? 'API key not configured'
      : !hasApiSecret
      ? 'API secret not configured'
      : !hasCloudName
      ? 'Cloud name not configured'
      : 'Fully configured',
  };
}

function checkSwitchboardStatus() {
  const hasApiKey = !!process.env.SWITCHBOARD_API_KEY;

  return {
    configured: hasApiKey,
    message: hasApiKey 
      ? 'Fully configured' 
      : 'API key not configured',
  };
}

function checkOneSimpleApiStatus() {
  const hasApiKey = !!process.env.ONESIMPLEAPI_API_KEY;

  return {
    configured: hasApiKey,
    message: hasApiKey 
      ? 'Fully configured' 
      : 'API key not configured',
  };
}
```

#### Using Status Check in UI

```typescript
// In EventSettingsForm or IntegrationsTab
const [integrationStatus, setIntegrationStatus] = useState<any>(null);

useEffect(() => {
  async function checkStatus() {
    try {
      const response = await fetch('/api/integrations/status');
      const status = await response.json();
      setIntegrationStatus(status);
    } catch (error) {
      console.error('Failed to check integration status:', error);
    }
  }

  checkStatus();
}, []);

// Display status indicator
<IntegrationStatusIndicator
  isReady={
    formData.cloudinaryEnabled && 
    integrationStatus?.cloudinary?.configured
  }
  statusMessage={
    !integrationStatus?.cloudinary?.configured
      ? 'API credentials not configured in environment variables'
      : 'Ready to use'
  }
/>
```

#### Troubleshooting Status Checks

**Status shows "Not Configured" but variables are set:**

1. Check if variables are server-side only (no `NEXT_PUBLIC_` prefix)
2. Verify status check endpoint is using `process.env` correctly
3. Restart development server
4. Check for typos in variable names
5. Verify `.env.local` is in the correct directory

**Status check endpoint returns 500:**

1. Check server logs for error details
2. Verify all required environment variables
3. Check for syntax errors in status check code
4. Ensure proper error handling


## Error Message Reference

### Database Errors

| Error Code | Error Message | Cause | Solution |
|------------|---------------|-------|----------|
| 404 | `document_not_found` | Document doesn't exist | Check if integration was created; verify eventSettingsId |
| 404 | `collection_not_found` | Collection doesn't exist | Run setup script: `npm run setup:appwrite` |
| 409 | `Document with the requested ID already exists` | Concurrent create conflict | Automatic retry handles this; check for race conditions |
| 401 | `Unauthorized` | Invalid API key or session | Check authentication; verify API key permissions |
| 403 | `Forbidden` | Insufficient permissions | Check user role; verify collection permissions |
| 500 | `Internal Server Error` | Appwrite service issue | Check Appwrite status; review server logs |

### Integration-Specific Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `IntegrationConflictError` | Version mismatch (optimistic locking) | Refresh page and retry; automatic retry in most cases |
| `Invalid JSON in requestBody template` | Malformed JSON in Switchboard template | Validate JSON syntax; use JSON validator |
| `API key not configured` | Missing environment variable | Add to `.env.local`; restart server |
| `Integration not enabled` | Integration disabled in settings | Enable in Event Settings UI |
| `Failed to fetch integration` | Network or permission issue | Check network; verify permissions; check Appwrite status |

### Validation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `eventSettingsId is required` | Missing required field | Ensure eventSettingsId is provided |
| `Invalid template syntax` | Malformed placeholder in template | Check template syntax: `{{fieldName}}` |
| `Field mapping must be valid JSON` | Invalid JSON in field mappings | Validate JSON structure |
| `URL must be valid` | Invalid URL format | Check URL format; include protocol (https://) |

## Performance Optimization Tips

### 1. Minimize Database Queries

**❌ Bad: Multiple sequential queries**
```typescript
const cloudinary = await getCloudinaryIntegration(databases, eventSettingsId);
const switchboard = await getSwitchboardIntegration(databases, eventSettingsId);
const oneSimpleApi = await getOneSimpleApiIntegration(databases, eventSettingsId);
// Total time: 300ms (3 × 100ms)
```

**✅ Good: Parallel queries with Promise.allSettled**
```typescript
const [cloudinaryResult, switchboardResult, oneSimpleApiResult] = 
  await Promise.allSettled([
    getCloudinaryIntegration(databases, eventSettingsId),
    getSwitchboardIntegration(databases, eventSettingsId),
    getOneSimpleApiIntegration(databases, eventSettingsId),
  ]);
// Total time: 100ms (parallel execution)
```

### 2. Use Indexes

Ensure `eventSettingsId` is indexed in all integration collections:

```typescript
// In scripts/setup-appwrite.ts
await databases.createIndex(
  databaseId,
  CLOUDINARY_COLLECTION_ID,
  'eventSettingsId_index',
  'key',
  ['eventSettingsId'],
  ['ASC']
);
```

### 3. Limit Query Results

Always use `Query.limit(1)` when fetching a single integration:

```typescript
const response = await databases.listDocuments(
  DATABASE_ID,
  CLOUDINARY_COLLECTION_ID,
  [
    Query.equal('eventSettingsId', eventSettingsId),
    Query.limit(1) // ✅ Only fetch what you need
  ]
);
```

### 4. Cache Integration Data

For read-heavy operations, consider caching:

```typescript
// Simple in-memory cache (for development)
const integrationCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string
): Promise<CloudinaryIntegration | null> {
  const cacheKey = `cloudinary:${eventSettingsId}`;
  const cached = integrationCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const data = await getCloudinaryIntegration(databases, eventSettingsId);
  
  integrationCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
  });

  return data;
}
```

### 5. Optimize flattenEventSettings

Only flatten when necessary:

```typescript
// ❌ Bad: Always flatten even when not needed
const flattened = flattenEventSettings(settings, cloudinary, switchboard, oneSimpleApi);
return flattened;

// ✅ Good: Return raw data when possible
if (req.query.format === 'raw') {
  return { settings, cloudinary, switchboard, oneSimpleApi };
}

// Only flatten for backward compatibility
const flattened = flattenEventSettings(settings, cloudinary, switchboard, oneSimpleApi);
return flattened;
```


## Cache Invalidation Patterns

### When to Invalidate Cache

Invalidate integration cache when:
- Integration settings are updated
- Integration is enabled/disabled
- Event settings are modified
- User logs out

### Cache Invalidation Strategies

**1. Time-Based Expiration (TTL)**

```typescript
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return cached.data;
}
```

**2. Manual Invalidation**

```typescript
export function invalidateIntegrationCache(eventSettingsId: string) {
  integrationCache.delete(`cloudinary:${eventSettingsId}`);
  integrationCache.delete(`switchboard:${eventSettingsId}`);
  integrationCache.delete(`onesimpleapi:${eventSettingsId}`);
}

// Call after update
await updateCloudinaryIntegration(databases, eventSettingsId, data);
invalidateIntegrationCache(eventSettingsId);
```

**3. Event-Based Invalidation**

```typescript
// Using Appwrite Realtime
const unsubscribe = client.subscribe(
  `databases.${DATABASE_ID}.collections.${CLOUDINARY_COLLECTION_ID}.documents`,
  (response) => {
    if (response.events.includes('databases.*.collections.*.documents.*.update')) {
      const eventSettingsId = response.payload.eventSettingsId;
      invalidateIntegrationCache(eventSettingsId);
    }
  }
);
```

**4. Cache Versioning**

```typescript
interface CachedData<T> {
  data: T;
  version: number;
  timestamp: number;
}

// Increment version on update
const CACHE_VERSION = 1;

function getCacheKey(eventSettingsId: string): string {
  return `cloudinary:${eventSettingsId}:v${CACHE_VERSION}`;
}

// When you update cache structure, increment CACHE_VERSION
// Old cache entries become invalid automatically
```

### Cache Invalidation in API Routes

```typescript
// src/pages/api/event-settings/index.ts
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'PUT') {
    try {
      // Update integrations
      await updateCloudinaryIntegration(databases, eventSettingsId, cloudinaryData);
      
      // Invalidate cache
      invalidateIntegrationCache(eventSettingsId);
      
      // Also invalidate SWR cache on client
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: 'Update failed' });
    }
  }
}
```

## Debugging Checklist

### Integration Not Saving

- [ ] Check browser console for errors
- [ ] Verify API endpoint is being called
- [ ] Check network tab for request/response
- [ ] Verify authentication token is valid
- [ ] Check server logs for errors
- [ ] Verify database permissions
- [ ] Check for validation errors
- [ ] Verify eventSettingsId is correct
- [ ] Check for optimistic locking conflicts
- [ ] Verify integration collection exists

### Integration Not Loading

- [ ] Check if integration document exists in database
- [ ] Verify eventSettingsId is correct
- [ ] Check database permissions
- [ ] Verify API endpoint returns data
- [ ] Check for network errors
- [ ] Verify authentication
- [ ] Check if Promise.allSettled is used
- [ ] Review server logs for errors
- [ ] Check if collection exists
- [ ] Verify indexes are created

### Integration Status Shows "Not Configured"

- [ ] Check environment variables are set
- [ ] Verify variable names are correct
- [ ] Restart development server
- [ ] Check `.env.local` file exists
- [ ] Verify status check endpoint works
- [ ] Check for typos in variable names
- [ ] Verify variables are server-side only (no NEXT_PUBLIC_)
- [ ] Check if variables are loaded in process.env
- [ ] Review status check logic
- [ ] Test with debug endpoint

### Integration Enabled But Not Working

- [ ] Verify environment variables are set
- [ ] Check API credentials are valid
- [ ] Test API endpoint directly
- [ ] Check for rate limiting
- [ ] Verify network connectivity
- [ ] Check third-party service status
- [ ] Review error logs
- [ ] Verify request format is correct
- [ ] Check for CORS issues
- [ ] Test with minimal example


## Advanced Debugging Techniques

### 1. Enable Verbose Logging

Add detailed logging to integration functions:

```typescript
export async function getCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string
): Promise<CloudinaryIntegration | null> {
  const startTime = Date.now();
  
  try {
    console.log('[Cloudinary] Fetching integration', {
      eventSettingsId,
      timestamp: new Date().toISOString(),
    });

    const response = await databases.listDocuments(
      DATABASE_ID,
      CLOUDINARY_COLLECTION_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );

    const duration = Date.now() - startTime;
    
    console.log('[Cloudinary] Fetch complete', {
      eventSettingsId,
      found: response.documents.length > 0,
      duration: `${duration}ms`,
    });

    return response.documents.length > 0 
      ? (response.documents[0] as any) 
      : null;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error('[Cloudinary] Fetch failed', {
      eventSettingsId,
      error: {
        code: error.code,
        message: error.message,
        type: error.type,
      },
      duration: `${duration}ms`,
    });

    if (error.code === 404 || 
        error.code === 'document_not_found' || 
        error.code === 'collection_not_found') {
      return null;
    }

    throw error;
  }
}
```

### 2. Create Debug Endpoints

```typescript
// src/pages/api/debug/integrations.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { databases } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Not available in production' });
  }

  const { eventSettingsId } = req.query;

  if (!eventSettingsId || typeof eventSettingsId !== 'string') {
    return res.status(400).json({ error: 'eventSettingsId required' });
  }

  try {
    // Check all integration collections
    const cloudinaryDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!,
      [Query.equal('eventSettingsId', eventSettingsId)]
    );

    const switchboardDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!,
      [Query.equal('eventSettingsId', eventSettingsId)]
    );

    const oneSimpleApiDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!,
      [Query.equal('eventSettingsId', eventSettingsId)]
    );

    return res.status(200).json({
      eventSettingsId,
      integrations: {
        cloudinary: {
          found: cloudinaryDocs.total > 0,
          count: cloudinaryDocs.total,
          documents: cloudinaryDocs.documents,
        },
        switchboard: {
          found: switchboardDocs.total > 0,
          count: switchboardDocs.total,
          documents: switchboardDocs.documents,
        },
        oneSimpleApi: {
          found: oneSimpleApiDocs.total > 0,
          count: oneSimpleApiDocs.total,
          documents: oneSimpleApiDocs.documents,
        },
      },
      environment: {
        cloudinary: {
          apiKey: !!process.env.CLOUDINARY_API_KEY,
          apiSecret: !!process.env.CLOUDINARY_API_SECRET,
          cloudName: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        },
        switchboard: {
          apiKey: !!process.env.SWITCHBOARD_API_KEY,
        },
        oneSimpleApi: {
          apiKey: !!process.env.ONESIMPLEAPI_API_KEY,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      error: 'Debug check failed',
      details: {
        code: error.code,
        message: error.message,
        type: error.type,
      },
    });
  }
}
```

### 3. Monitor Database Queries

Use Appwrite's built-in logging:

```typescript
// Enable query logging in development
if (process.env.NODE_ENV === 'development') {
  const originalListDocuments = databases.listDocuments;
  
  databases.listDocuments = async function(...args) {
    console.log('[Appwrite Query]', {
      collection: args[1],
      queries: args[2],
    });
    
    const result = await originalListDocuments.apply(this, args);
    
    console.log('[Appwrite Result]', {
      collection: args[1],
      total: result.total,
      returned: result.documents.length,
    });
    
    return result;
  };
}
```

### 4. Test Integration Isolation

Test each integration independently:

```typescript
// Test Cloudinary only
const cloudinary = await getCloudinaryIntegration(databases, eventSettingsId);
console.log('Cloudinary:', cloudinary);

// Test Switchboard only
const switchboard = await getSwitchboardIntegration(databases, eventSettingsId);
console.log('Switchboard:', switchboard);

// Test OneSimpleAPI only
const oneSimpleApi = await getOneSimpleApiIntegration(databases, eventSettingsId);
console.log('OneSimpleAPI:', oneSimpleApi);
```

## Getting Help

### Before Asking for Help

1. **Check this guide** - Most common issues are documented here
2. **Review error messages** - Read the full error message and stack trace
3. **Check server logs** - Look for detailed error information
4. **Test in isolation** - Isolate the problem to a specific integration
5. **Verify environment** - Ensure all environment variables are set
6. **Check recent changes** - Review what changed before the issue appeared

### Information to Provide

When reporting an issue, include:

1. **Error message** - Full error text and stack trace
2. **Steps to reproduce** - Exact steps that cause the issue
3. **Environment** - Development or production, Node version, etc.
4. **Integration type** - Which integration is affected
5. **Recent changes** - What changed before the issue appeared
6. **Logs** - Relevant server logs and browser console output
7. **Configuration** - Integration settings (without sensitive data)
8. **Expected behavior** - What should happen
9. **Actual behavior** - What actually happens

### Useful Debug Commands

```bash
# Check Appwrite setup
node scripts/verify-appwrite-setup.ts

# Test database connection
node -e "const { databases } = require('./src/lib/appwrite'); databases.listCollections().then(console.log).catch(console.error)"

# Check environment variables
env | grep -E "(CLOUDINARY|SWITCHBOARD|ONESIMPLEAPI)"

# View server logs
npm run dev 2>&1 | tee debug.log

# Test API endpoint
curl -X GET http://localhost:3000/api/integrations/status

# Check database documents
# (Use Appwrite Console or create a debug script)
```

## Related Documentation

- [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md) - System overview and design
- [Adding New Integration Guide](./ADDING_NEW_INTEGRATION_GUIDE.md) - Step-by-step integration creation
- [Integration Security Guide](./INTEGRATION_SECURITY_GUIDE.md) - Security best practices
- [Integration Patterns Reference](./INTEGRATION_PATTERNS_REFERENCE.md) - Code templates and patterns
- [Photo Service Integration Guide](./PHOTO_SERVICE_INTEGRATION_GUIDE.md) - Photo service specifics

## Conclusion

Most integration issues fall into a few common categories:
- **Optimistic locking conflicts** - Handled automatically with retry
- **Missing environment variables** - Check `.env.local` and restart server
- **Database permissions** - Verify Appwrite collection permissions
- **Network issues** - Use Promise.allSettled for resilience
- **Configuration errors** - Validate settings and check status endpoint

When troubleshooting:
1. Start with the Quick Diagnostic Checklist
2. Check the Error Message Reference
3. Use the Debugging Checklist for your specific issue
4. Enable verbose logging if needed
5. Test integrations in isolation

Remember: The integration system is designed to be resilient. Most issues are configuration-related and can be resolved by checking environment variables, database permissions, and following the patterns documented in this guide.

# Design Document

## Overview

This design implements optimistic locking for integration update functions to eliminate TOCTOU race conditions. The current check-then-act pattern allows concurrent requests to both check for existence, both find no record, and both attempt to create, causing conflicts. By adding a version field and implementing version checking, we ensure safe concurrent updates with clear conflict detection.

## Architecture

### Current Flow (Problematic - TOCTOU Race)
```
Request A: updateCloudinaryIntegration()
  ↓
1. Check if exists → No
  ↓
                                Request B: updateCloudinaryIntegration()
                                  ↓
                                2. Check if exists → No
                                  ↓
3. Create new record              ↓
  ↓                             4. Create new record (CONFLICT!)
Success                           ↓
                                Error or duplicate record
```

### New Flow (Optimistic Locking)
```
Request A: updateCloudinaryIntegration(expectedVersion: 1)
  ↓
1. Check if exists → Yes (version: 1)
  ↓
2. Verify version 1 == expectedVersion 1 ✓
  ↓
                                Request B: updateCloudinaryIntegration(expectedVersion: 1)
                                  ↓
                                3. Check if exists → Yes (version: 2, updated by A)
                                  ↓
                                4. Verify version 2 == expectedVersion 1 ✗
                                  ↓
5. Update with version: 2         5. Throw ConflictError
  ↓                                 ↓
Success                           Caller can retry with new version
```

## Components and Interfaces

### 1. Updated Integration Interfaces

Add version field to all integration interfaces:

```typescript
export interface CloudinaryIntegration {
  $id: string;
  eventSettingsId: string;
  version: number; // NEW: Optimistic locking version
  enabled: boolean;
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}

export interface SwitchboardIntegration {
  $id: string;
  eventSettingsId: string;
  version: number; // NEW: Optimistic locking version
  enabled: boolean;
  apiEndpoint: string;
  authHeaderType: string;
  apiKey: string;
  requestBody: string;
  templateId: string;
  fieldMappings: string;
}

export interface OneSimpleApiIntegration {
  $id: string;
  eventSettingsId: string;
  version: number; // NEW: Optimistic locking version
  enabled: boolean;
  url: string;
  formDataKey: string;
  formDataValue: string;
  recordTemplate: string;
}
```

### 2. Conflict Error Class

Create a custom error class for version conflicts:

```typescript
export class IntegrationConflictError extends Error {
  constructor(
    public integrationType: string,
    public eventSettingsId: string,
    public expectedVersion: number,
    public actualVersion: number
  ) {
    super(
      `Integration conflict: ${integrationType} for event ${eventSettingsId}. ` +
      `Expected version ${expectedVersion}, but found version ${actualVersion}. ` +
      `The integration was modified by another request.`
    );
    this.name = 'IntegrationConflictError';
  }
}
```

**Key Design Decisions:**
- Extends Error for standard error handling
- Includes all relevant context for debugging
- Clear message explains the conflict
- Can be caught specifically by type

### 3. Updated Update Functions

Refactor all three update functions with optimistic locking:

```typescript
export async function updateCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<CloudinaryIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<CloudinaryIntegration> {
  try {
    // Find existing integration
    const existing = await getCloudinaryIntegration(databases, eventSettingsId);
    
    if (existing) {
      // Update existing with version check
      const currentVersion = existing.version || 0;
      
      // If expectedVersion is provided, verify it matches
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new IntegrationConflictError(
          'Cloudinary',
          eventSettingsId,
          expectedVersion,
          currentVersion
        );
      }
      
      // Update with incremented version
      const updated = await databases.updateDocument(
        DATABASE_ID,
        CLOUDINARY_COLLECTION_ID,
        existing.$id,
        {
          ...data,
          version: currentVersion + 1
        }
      );
      return updated as CloudinaryIntegration;
    } else {
      // Create new with version 1
      try {
        const created = await databases.createDocument(
          DATABASE_ID,
          CLOUDINARY_COLLECTION_ID,
          'unique()',
          {
            eventSettingsId,
            version: 1,
            ...data,
          }
        );
        return created as CloudinaryIntegration;
      } catch (createError: any) {
        // If create fails due to duplicate, retry as update
        if (createError.code === 409 || createError.message?.includes('duplicate')) {
          // Another request created it, retry as update
          const existing = await getCloudinaryIntegration(databases, eventSettingsId);
          if (existing) {
            const updated = await databases.updateDocument(
              DATABASE_ID,
              CLOUDINARY_COLLECTION_ID,
              existing.$id,
              {
                ...data,
                version: (existing.version || 0) + 1
              }
            );
            return updated as CloudinaryIntegration;
          }
        }
        throw createError;
      }
    }
  } catch (error) {
    // Re-throw conflict errors as-is
    if (error instanceof IntegrationConflictError) {
      throw error;
    }
    
    // Wrap other errors
    console.error('Error updating Cloudinary integration:', error);
    throw new Error(`Failed to update Cloudinary integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

**Key Design Decisions:**
- `expectedVersion` is optional for backward compatibility
- When provided, version is strictly checked
- Version is incremented on every update
- Create sets version to 1
- Handles race condition on create by retrying as update
- Throws specific errors instead of returning null
- Re-throws ConflictError without wrapping

### 4. Apply Same Pattern to All Functions

The same pattern applies to `updateSwitchboardIntegration` and `updateOneSimpleApiIntegration`:

```typescript
export async function updateSwitchboardIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<SwitchboardIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<SwitchboardIntegration> {
  // Same implementation as updateCloudinaryIntegration
  // but with SWITCHBOARD_COLLECTION_ID and 'Switchboard' type
}

export async function updateOneSimpleApiIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<OneSimpleApiIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<OneSimpleApiIntegration> {
  // Same implementation as updateCloudinaryIntegration
  // but with ONESIMPLEAPI_COLLECTION_ID and 'OneSimpleAPI' type
}
```

### 5. Helper Function for DRY Implementation

To avoid code duplication, create a generic helper:

```typescript
async function updateIntegrationWithLocking<T extends { $id: string; version: number }>(
  databases: Databases,
  collectionId: string,
  integrationType: string,
  eventSettingsId: string,
  data: any,
  expectedVersion: number | undefined,
  getExisting: () => Promise<T | null>
): Promise<T> {
  try {
    const existing = await getExisting();
    
    if (existing) {
      const currentVersion = existing.version || 0;
      
      if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
        throw new IntegrationConflictError(
          integrationType,
          eventSettingsId,
          expectedVersion,
          currentVersion
        );
      }
      
      const updated = await databases.updateDocument(
        DATABASE_ID,
        collectionId,
        existing.$id,
        {
          ...data,
          version: currentVersion + 1
        }
      );
      return updated as T;
    } else {
      try {
        const created = await databases.createDocument(
          DATABASE_ID,
          collectionId,
          'unique()',
          {
            eventSettingsId,
            version: 1,
            ...data,
          }
        );
        return created as T;
      } catch (createError: any) {
        if (createError.code === 409 || createError.message?.includes('duplicate')) {
          const existing = await getExisting();
          if (existing) {
            const updated = await databases.updateDocument(
              DATABASE_ID,
              collectionId,
              existing.$id,
              {
                ...data,
                version: (existing.version || 0) + 1
              }
            );
            return updated as T;
          }
        }
        throw createError;
      }
    }
  } catch (error) {
    if (error instanceof IntegrationConflictError) {
      throw error;
    }
    console.error(`Error updating ${integrationType} integration:`, error);
    throw new Error(`Failed to update ${integrationType} integration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Then simplify the update functions:
export async function updateCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<CloudinaryIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<CloudinaryIntegration> {
  return updateIntegrationWithLocking(
    databases,
    CLOUDINARY_COLLECTION_ID,
    'Cloudinary',
    eventSettingsId,
    data,
    expectedVersion,
    () => getCloudinaryIntegration(databases, eventSettingsId)
  );
}
```

## Data Models

### Database Schema Changes

Add `version` attribute to all three integration collections:

**Cloudinary Collection:**
- Add attribute: `version` (integer, required, default: 1)

**Switchboard Collection:**
- Add attribute: `version` (integer, required, default: 1)

**OneSimpleAPI Collection:**
- Add attribute: `version` (integer, required, default: 1)

### Migration Strategy

For existing documents without version field:

**Option 1: Database Migration Script**
```typescript
// Run once to add version to existing documents
async function migrateIntegrationVersions() {
  const collections = [
    CLOUDINARY_COLLECTION_ID,
    SWITCHBOARD_COLLECTION_ID,
    ONESIMPLEAPI_COLLECTION_ID
  ];
  
  for (const collectionId of collections) {
    const docs = await databases.listDocuments(DATABASE_ID, collectionId);
    
    for (const doc of docs.documents) {
      if (!doc.version) {
        await databases.updateDocument(
          DATABASE_ID,
          collectionId,
          doc.$id,
          { version: 1 }
        );
      }
    }
  }
}
```

**Option 2: Handle Missing Version in Code**
```typescript
const currentVersion = existing.version || 0;
// Treat missing version as 0, will be set to 1 on first update
```

## Error Handling

### Conflict Error Handling in API Routes

```typescript
// In API routes that call update functions
try {
  const updated = await updateCloudinaryIntegration(
    databases,
    eventSettingsId,
    data,
    expectedVersion // from request body
  );
  return res.status(200).json(updated);
} catch (error) {
  if (error instanceof IntegrationConflictError) {
    return res.status(409).json({
      error: 'Conflict',
      message: error.message,
      expectedVersion: error.expectedVersion,
      actualVersion: error.actualVersion,
      integrationType: error.integrationType
    });
  }
  
  return res.status(500).json({
    error: 'Internal Server Error',
    message: error instanceof Error ? error.message : 'Unknown error'
  });
}
```

### Client-Side Retry Logic

```typescript
async function saveIntegrationWithRetry(data: any, maxRetries = 3) {
  let retries = 0;
  let currentVersion = data.version;
  
  while (retries < maxRetries) {
    try {
      const response = await fetch('/api/integrations/cloudinary', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          expectedVersion: currentVersion
        })
      });
      
      if (response.status === 409) {
        // Conflict - fetch latest version and retry
        const conflict = await response.json();
        currentVersion = conflict.actualVersion;
        retries++;
        continue;
      }
      
      if (!response.ok) {
        throw new Error('Failed to save integration');
      }
      
      return await response.json();
    } catch (error) {
      if (retries >= maxRetries - 1) {
        throw error;
      }
      retries++;
    }
  }
  
  throw new Error('Max retries exceeded');
}
```

## Testing Strategy

### Unit Tests

1. **Version Increment Tests**
   - Create integration, verify version is 1
   - Update integration, verify version increments to 2
   - Update again, verify version increments to 3

2. **Conflict Detection Tests**
   - Create integration with version 1
   - Attempt update with expectedVersion 1, should succeed
   - Attempt update with expectedVersion 1 again, should fail with ConflictError
   - Verify error includes correct version numbers

3. **Backward Compatibility Tests**
   - Update without expectedVersion, should succeed
   - Update existing document without version field, should work
   - Verify version is added on first update

4. **Race Condition Tests**
   - Simulate concurrent creates
   - Verify only one succeeds or both succeed with different IDs
   - Verify no duplicate records

### Integration Tests

1. **Concurrent Update Tests**
   - Start two concurrent updates with same expectedVersion
   - Verify one succeeds, one fails with conflict
   - Retry failed update with new version
   - Verify both updates eventually succeed

2. **API Route Tests**
   - Test PUT request with expectedVersion
   - Test conflict response (409 status)
   - Test successful update (200 status)
   - Verify response includes updated version

3. **All Three Integration Types**
   - Test Cloudinary integration locking
   - Test Switchboard integration locking
   - Test OneSimpleAPI integration locking
   - Verify consistent behavior across all types

## Performance Impact

### Minimal Overhead
- One additional integer field per document (negligible storage)
- Version comparison is O(1) operation
- No additional database queries (version included in existing fetch)

### Benefits
- Prevents data loss from race conditions
- Enables safe concurrent updates
- Clear error messages for conflicts

## Security Considerations

- Version field is not sensitive data
- Conflict errors don't expose sensitive information
- Version checking prevents accidental overwrites
- No new attack vectors introduced

## Rollback Plan

If issues arise:
1. Remove expectedVersion parameter from function calls
2. Keep version field in database (doesn't hurt)
3. Revert to non-checking behavior
4. Document specific issues for future fix

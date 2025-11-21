# Integration Migration Patterns

## Overview

This guide provides comprehensive patterns and procedures for migrating integration data, handling schema changes, and safely removing or replacing integrations in credential.studio. Whether you're switching photo services, updating integration schemas, or deprecating old integrations, this guide will help you do it safely with minimal risk.

## Table of Contents

1. [Migration Planning](#migration-planning)
2. [Backup Procedures](#backup-procedures)
3. [Integration Data Migration](#integration-data-migration)
4. [Photo URL Migration](#photo-url-migration)
5. [Schema Version Migration](#schema-version-migration)
6. [Safe Integration Removal](#safe-integration-removal)
7. [Rollback Strategies](#rollback-strategies)
8. [Validation and Testing](#validation-and-testing)
9. [Common Migration Scenarios](#common-migration-scenarios)
10. [Script Templates](#script-templates)

---

## Migration Planning

### Pre-Migration Checklist

Before starting any migration:

- [ ] **Document current state**: Record all integration configurations and data
- [ ] **Identify dependencies**: List all code that depends on the integration
- [ ] **Create backup**: Full backup of integration collections
- [ ] **Test environment**: Set up staging environment for testing
- [ ] **Rollback plan**: Document how to revert if migration fails
- [ ] **Communication plan**: Notify users of potential downtime
- [ ] **Validation queries**: Prepare queries to verify migration success
- [ ] **Timeline**: Estimate migration duration and schedule maintenance window

### Risk Assessment

Evaluate migration risk based on:


**Data Volume**:
- Low risk: < 100 records
- Medium risk: 100-1000 records
- High risk: > 1000 records

**Integration Criticality**:
- Low: Optional features (e.g., analytics)
- Medium: Important but not blocking (e.g., photo uploads)
- High: Critical functionality (e.g., credential printing)

**Complexity**:
- Low: Simple field renames
- Medium: Data transformation required
- High: Multiple integrations affected, complex transformations

---

## Backup Procedures

### Manual Backup via Appwrite Console

1. **Navigate to Database**:
   - Open Appwrite Console
   - Go to Databases → [Your Database]
   - Select the integration collection

2. **Export Collection Data**:
   - Click "Export" button
   - Choose JSON format
   - Save file with timestamp: `[collection]_backup_[YYYY-MM-DD].json`

3. **Document Configuration**:
   ```bash
   # Save collection schema
   # Document attributes, indexes, permissions
   ```

### Automated Backup Script

Create a backup script for all integrations:

```typescript
// scripts/backup-integrations.ts
import { Client, Databases, Query } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;


async function backupCollection(collectionId: string, name: string) {
  console.log(`Backing up ${name}...`);
  
  const allDocuments = [];
  let offset = 0;
  const limit = 100;
  
  while (true) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.limit(limit), Query.offset(offset)]
    );
    
    allDocuments.push(...response.documents);
    
    if (response.documents.length < limit) break;
    offset += limit;
  }
  
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `backups/${name}_${timestamp}.json`;
  
  await fs.writeFile(
    filename,
    JSON.stringify(allDocuments, null, 2)
  );
  
  console.log(`✓ Backed up ${allDocuments.length} documents to ${filename}`);
  return allDocuments.length;
}

async function backupAllIntegrations() {
  const integrations = [
    { id: 'cloudinary', name: 'cloudinary' },
    { id: 'switchboard', name: 'switchboard' },
    { id: 'onesimpleapi', name: 'onesimpleapi' }
  ];
  
  for (const integration of integrations) {
    await backupCollection(integration.id, integration.name);
  }
  
  console.log('✓ All integrations backed up successfully');
}

backupAllIntegrations().catch(console.error);
```

**Usage**:
```bash
# Create backups directory
mkdir -p backups

# Run backup
npx ts-node scripts/backup-integrations.ts
```

---

## Integration Data Migration

### Migrating Between Services

When switching from one service to another (e.g., Cloudinary to ImageKit):



#### Step 1: Create New Integration Collection

```typescript
// scripts/create-new-integration.ts
import { Client, Databases, ID } from 'node-appwrite';

async function createNewIntegrationCollection() {
  const databases = new Databases(client);
  
  // Create collection
  await databases.createCollection(
    DATABASE_ID,
    'imagekit', // New collection ID
    'ImageKit Integration'
  );
  
  // Create standard attributes
  await databases.createStringAttribute(
    DATABASE_ID,
    'imagekit',
    'eventSettingsId',
    255,
    true // required
  );
  
  await databases.createIntegerAttribute(
    DATABASE_ID,
    'imagekit',
    'version',
    true,
    0, // min
    undefined, // max
    1 // default
  );
  
  await databases.createBooleanAttribute(
    DATABASE_ID,
    'imagekit',
    'enabled',
    true,
    false // default
  );
  
  // Create integration-specific attributes
  await databases.createStringAttribute(
    DATABASE_ID,
    'imagekit',
    'publicKey',
    255,
    true
  );
  
  await databases.createStringAttribute(
    DATABASE_ID,
    'imagekit',
    'urlEndpoint',
    255,
    true
  );
  
  // Create index on eventSettingsId
  await databases.createIndex(
    DATABASE_ID,
    'imagekit',
    'eventSettingsId_idx',
    'key',
    ['eventSettingsId']
  );
  
  console.log('✓ ImageKit collection created');
}
```

#### Step 2: Migrate Configuration Data

```typescript
// scripts/migrate-integration-data.ts
async function migrateCloudinaryToImageKit() {
  const databases = new Databases(client);
  
  // Fetch all Cloudinary configurations
  const cloudinaryDocs = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.limit(1000)]
  );
  
  console.log(`Found ${cloudinaryDocs.documents.length} Cloudinary configs`);
  
  for (const doc of cloudinaryDocs.documents) {
    try {
      // Transform data to new format
      const newConfig = {
        eventSettingsId: doc.eventSettingsId,
        version: 1,
        enabled: doc.enabled,
        publicKey: '', // User must configure
        urlEndpoint: '', // User must configure
        // Map other fields as needed
      };
      
      // Create in new collection
      await databases.createDocument(
        DATABASE_ID,
        'imagekit',
        ID.unique(),
        newConfig
      );
      
      console.log(`✓ Migrated config for event ${doc.eventSettingsId}`);
    } catch (error) {
      console.error(`✗ Failed to migrate ${doc.eventSettingsId}:`, error);
    }
  }
  
  console.log('✓ Migration complete');
}
```

#### Step 3: Update Backend Code

Update `src/lib/appwrite-integrations.ts`:

```typescript
// Add new integration interface
export interface ImageKitIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  publicKey: string;
  urlEndpoint: string;
}

// Add getter function
export async function getImageKitIntegration(
  databases: Databases,
  eventSettingsId: string
): Promise<ImageKitIntegration | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      'imagekit',
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );
    return response.documents.length > 0 ? (response.documents[0] as any) : null;
  } catch (error: any) {
    if (error.code === 404) return null;
    throw error;
  }
}

// Add update function with optimistic locking
export async function updateImageKitIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<ImageKitIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<ImageKitIntegration> {
  return updateIntegrationWithLocking<ImageKitIntegration>(
    databases,
    'imagekit',
    'ImageKit',
    eventSettingsId,
    data,
    expectedVersion,
    () => getImageKitIntegration(databases, eventSettingsId)
  );
}
```

#### Step 4: Update API Routes

Update `src/pages/api/event-settings/index.ts`:

```typescript
// Add to extractIntegrationFields
function extractIntegrationFields(data: any) {
  return {
    // ... existing integrations
    imagekit: {
      enabled: data.imagekitEnabled,
      publicKey: data.imagekitPublicKey,
      urlEndpoint: data.imagekitUrlEndpoint,
    }
  };
}

// Add to integration updates
if (integrationFields.imagekit) {
  await updateImageKitIntegration(
    databases,
    eventSettingsId,
    integrationFields.imagekit
  );
}

// Add to flattenEventSettings
const imagekitData = await getImageKitIntegration(databases, eventSettingsId);
if (imagekitData) {
  flattened.imagekitEnabled = imagekitData.enabled;
  flattened.imagekitPublicKey = imagekitData.publicKey;
  flattened.imagekitUrlEndpoint = imagekitData.urlEndpoint;
}
```

---

## Photo URL Migration

### Scenario: Migrating from Cloudinary to ImageKit

Photo URLs are stored in attendee records. When switching services, you need to migrate these URLs.



#### Option 1: Re-upload Photos (Recommended)

The safest approach is to re-upload all photos to the new service:

```typescript
// scripts/migrate-photos.ts
import { Client, Databases, Storage, Query } from 'node-appwrite';
import axios from 'axios';

async function migratePhotosToImageKit() {
  const databases = new Databases(client);
  
  // Fetch all attendees with photos
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    'attendees',
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );
  
  console.log(`Found ${attendees.documents.length} attendees with photos`);
  
  for (const attendee of attendees.documents) {
    try {
      const oldUrl = attendee.photoUrl;
      
      // Download photo from Cloudinary
      const response = await axios.get(oldUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(response.data);
      
      // Upload to ImageKit
      const newUrl = await uploadToImageKit(buffer, attendee.$id);
      
      // Update attendee record
      await databases.updateDocument(
        DATABASE_ID,
        'attendees',
        attendee.$id,
        { photoUrl: newUrl }
      );
      
      console.log(`✓ Migrated photo for attendee ${attendee.$id}`);
    } catch (error) {
      console.error(`✗ Failed to migrate photo for ${attendee.$id}:`, error);
    }
  }
}

async function uploadToImageKit(buffer: Buffer, attendeeId: string): Promise<string> {
  // ImageKit upload implementation
  const FormData = require('form-data');
  const form = new FormData();
  
  form.append('file', buffer, `${attendeeId}.jpg`);
  form.append('fileName', `${attendeeId}.jpg`);
  
  const response = await axios.post(
    'https://upload.imagekit.io/api/v1/files/upload',
    form,
    {
      headers: {
        ...form.getHeaders(),
        'Authorization': `Basic ${Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY + ':').toString('base64')}`
      }
    }
  );
  
  return response.data.url;
}
```

#### Option 2: URL Transformation (Quick but Limited)

If photos are publicly accessible and you just need to update URLs:

```typescript
// scripts/transform-photo-urls.ts
async function transformPhotoUrls() {
  const databases = new Databases(client);
  
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    'attendees',
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );
  
  for (const attendee of attendees.documents) {
    const oldUrl = attendee.photoUrl;
    
    // Transform Cloudinary URL to ImageKit URL
    // Example: https://res.cloudinary.com/demo/image/upload/sample.jpg
    // To: https://ik.imagekit.io/demo/sample.jpg
    
    const newUrl = transformUrl(oldUrl);
    
    await databases.updateDocument(
      DATABASE_ID,
      'attendees',
      attendee.$id,
      { photoUrl: newUrl }
    );
    
    console.log(`✓ Updated URL for attendee ${attendee.$id}`);
  }
}

function transformUrl(cloudinaryUrl: string): string {
  // Extract public ID from Cloudinary URL
  const match = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+)$/);
  if (!match) return cloudinaryUrl;
  
  const publicId = match[1];
  
  // Construct ImageKit URL
  return `https://ik.imagekit.io/${process.env.IMAGEKIT_ID}/${publicId}`;
}
```

#### Validation Query

Verify all photos migrated successfully:

```typescript
// Check for unmigrated photos
const unmigrated = await databases.listDocuments(
  DATABASE_ID,
  'attendees',
  [
    Query.isNotNull('photoUrl'),
    Query.search('photoUrl', 'cloudinary') // Still has old URLs
  ]
);

console.log(`Unmigrated photos: ${unmigrated.total}`);
```

---

## Schema Version Migration

### Adding New Fields to Existing Integration

When you need to add new fields to an integration schema:



#### Step 1: Add New Attributes

```typescript
// scripts/add-integration-fields.ts
async function addNewFieldsToCloudinary() {
  const databases = new Databases(client);
  
  // Add new optional field
  await databases.createBooleanAttribute(
    DATABASE_ID,
    'cloudinary',
    'enableAITagging',
    false, // not required
    false // default value
  );
  
  await databases.createStringAttribute(
    DATABASE_ID,
    'cloudinary',
    'folder',
    255,
    false, // not required
    'credentials' // default value
  );
  
  console.log('✓ New fields added to Cloudinary integration');
}
```

#### Step 2: Update TypeScript Interface

```typescript
// src/lib/appwrite-integrations.ts
export interface CloudinaryIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  cloudName: string;
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
  // New fields
  enableAITagging?: boolean;
  folder?: string;
}
```

#### Step 3: Migrate Existing Data (if needed)

If new fields need default values based on existing data:

```typescript
// scripts/migrate-cloudinary-schema.ts
async function migrateCloudinarySchema() {
  const databases = new Databases(client);
  
  const docs = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.limit(1000)]
  );
  
  for (const doc of docs.documents) {
    // Set default values based on business logic
    const updates: any = {};
    
    if (doc.enableAITagging === undefined) {
      updates.enableAITagging = false;
    }
    
    if (doc.folder === undefined) {
      // Set folder based on event name or ID
      updates.folder = `event_${doc.eventSettingsId}`;
    }
    
    if (Object.keys(updates).length > 0) {
      await databases.updateDocument(
        DATABASE_ID,
        'cloudinary',
        doc.$id,
        updates
      );
      
      console.log(`✓ Updated ${doc.$id}`);
    }
  }
  
  console.log('✓ Schema migration complete');
}
```

### Removing Deprecated Fields

When removing fields that are no longer used:

#### Step 1: Verify Field is Unused

```typescript
// Check if field is still referenced in code
// Search codebase for field name
// Verify no active usage
```

#### Step 2: Remove from TypeScript Interface

```typescript
// Remove from interface definition
export interface CloudinaryIntegration {
  // ... other fields
  // REMOVED: deprecatedField: string;
}
```

#### Step 3: Delete Attribute (Optional)

**Warning**: Deleting attributes is permanent. Consider leaving them if there's any chance of rollback.

```typescript
// scripts/remove-deprecated-field.ts
async function removeDeprecatedField() {
  const databases = new Databases(client);
  
  // Delete attribute
  await databases.deleteAttribute(
    DATABASE_ID,
    'cloudinary',
    'deprecatedField'
  );
  
  console.log('✓ Deprecated field removed');
}
```

---

## Safe Integration Removal

### Deprecating an Integration

When removing an integration that's no longer needed:



#### Phase 1: Disable Integration

1. **Mark as deprecated in UI**:
   ```typescript
   // src/components/EventSettingsForm/IntegrationsTab.tsx
   <TabsTrigger value="oldservice" disabled>
     <AlertCircle className="mr-2 h-4 w-4" />
     Old Service (Deprecated)
   </TabsTrigger>
   ```

2. **Add deprecation notice**:
   ```typescript
   <Alert variant="warning">
     <AlertCircle className="h-4 w-4" />
     <AlertTitle>Deprecated</AlertTitle>
     <AlertDescription>
       This integration is deprecated and will be removed in a future version.
       Please migrate to [New Service].
     </AlertDescription>
   </Alert>
   ```

3. **Disable new configurations**:
   ```typescript
   // Prevent enabling deprecated integration
   if (data.oldServiceEnabled && !existingConfig) {
     throw new Error('This integration is deprecated and cannot be enabled');
   }
   ```

#### Phase 2: Archive Data

Before removing, archive all integration data:

```typescript
// scripts/archive-integration.ts
async function archiveIntegration(collectionId: string) {
  const databases = new Databases(client);
  
  // Export all documents
  const docs = await databases.listDocuments(
    DATABASE_ID,
    collectionId,
    [Query.limit(1000)]
  );
  
  // Save to archive
  const timestamp = new Date().toISOString();
  const archivePath = `archives/${collectionId}_${timestamp}.json`;
  
  await fs.writeFile(
    archivePath,
    JSON.stringify({
      collection: collectionId,
      archivedAt: timestamp,
      documentCount: docs.total,
      documents: docs.documents
    }, null, 2)
  );
  
  console.log(`✓ Archived ${docs.total} documents to ${archivePath}`);
  return archivePath;
}
```

#### Phase 3: Remove Code References

1. **Remove from backend**:
   - Delete interface from `appwrite-integrations.ts`
   - Remove getter/update functions
   - Remove from `flattenEventSettings`

2. **Remove from API routes**:
   - Remove from `extractIntegrationFields`
   - Remove update calls
   - Remove from integration fetching

3. **Remove from frontend**:
   - Delete tab component
   - Remove from `IntegrationsTab`
   - Remove from `EventSettings` type
   - Remove from form state

4. **Update documentation**:
   - Mark as removed in guides
   - Update examples to use replacement

#### Phase 4: Delete Collection (Final Step)

**Warning**: This is irreversible. Ensure archive is complete and verified.

```typescript
// scripts/delete-integration-collection.ts
async function deleteIntegrationCollection(collectionId: string) {
  const databases = new Databases(client);
  
  // Final confirmation
  console.log(`⚠️  About to delete collection: ${collectionId}`);
  console.log('This action is IRREVERSIBLE');
  console.log('Press Ctrl+C to cancel, or wait 10 seconds to proceed...');
  
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  // Delete collection
  await databases.deleteCollection(DATABASE_ID, collectionId);
  
  console.log(`✓ Collection ${collectionId} deleted`);
}
```

---

## Rollback Strategies

### Rollback Plan Template

For every migration, document the rollback procedure:

```markdown
# Rollback Plan: [Migration Name]

## Trigger Conditions
- Data integrity issues detected
- Critical functionality broken
- User-reported issues exceed threshold

## Rollback Steps

### 1. Stop Migration
- Pause migration script
- Document current state (how many records migrated)

### 2. Restore from Backup
- Identify backup file: `backups/[collection]_[date].json`
- Run restore script: `npx ts-node scripts/restore-backup.ts`

### 3. Revert Code Changes
- Git revert: `git revert [commit-hash]`
- Redeploy previous version

### 4. Verify Rollback
- Run validation queries
- Test critical functionality
- Confirm with users

## Estimated Rollback Time
- Small dataset (< 100 records): 5-10 minutes
- Medium dataset (100-1000 records): 15-30 minutes
- Large dataset (> 1000 records): 30-60 minutes
```

### Restore Script Template

```typescript
// scripts/restore-backup.ts
import { Client, Databases, ID } from 'node-appwrite';
import * as fs from 'fs/promises';

async function restoreFromBackup(backupFile: string, collectionId: string) {
  const databases = new Databases(client);
  
  // Read backup file
  const backupData = JSON.parse(await fs.readFile(backupFile, 'utf-8'));
  
  console.log(`Restoring ${backupData.length} documents to ${collectionId}`);
  
  // Delete existing documents
  const existing = await databases.listDocuments(
    DATABASE_ID,
    collectionId,
    [Query.limit(1000)]
  );
  
  for (const doc of existing.documents) {
    await databases.deleteDocument(DATABASE_ID, collectionId, doc.$id);
  }
  
  // Restore from backup
  for (const doc of backupData) {
    const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...data } = doc;
    
    await databases.createDocument(
      DATABASE_ID,
      collectionId,
      $id, // Preserve original ID
      data
    );
  }
  
  console.log('✓ Restore complete');
}

// Usage
const backupFile = process.argv[2];
const collectionId = process.argv[3];

if (!backupFile || !collectionId) {
  console.error('Usage: npx ts-node restore-backup.ts <backup-file> <collection-id>');
  process.exit(1);
}

restoreFromBackup(backupFile, collectionId).catch(console.error);
```

---

## Validation and Testing

### Pre-Migration Validation

Before starting migration:



```typescript
// scripts/validate-pre-migration.ts
async function validatePreMigration() {
  const databases = new Databases(client);
  
  console.log('Running pre-migration validation...\n');
  
  // 1. Check data integrity
  const cloudinary = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.limit(1)]
  );
  
  console.log(`✓ Cloudinary collection accessible`);
  console.log(`  Total documents: ${cloudinary.total}`);
  
  // 2. Check for required fields
  const missingFields = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.isNull('eventSettingsId')]
  );
  
  if (missingFields.total > 0) {
    console.error(`✗ Found ${missingFields.total} documents with missing eventSettingsId`);
    return false;
  }
  
  console.log(`✓ All documents have required fields`);
  
  // 3. Check for duplicates
  const allDocs = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.limit(1000)]
  );
  
  const eventIds = allDocs.documents.map(d => d.eventSettingsId);
  const duplicates = eventIds.filter((id, index) => eventIds.indexOf(id) !== index);
  
  if (duplicates.length > 0) {
    console.error(`✗ Found duplicate eventSettingsId: ${duplicates.join(', ')}`);
    return false;
  }
  
  console.log(`✓ No duplicate eventSettingsId found`);
  
  // 4. Check backup exists
  const backupExists = await fs.access('backups/cloudinary_backup.json')
    .then(() => true)
    .catch(() => false);
  
  if (!backupExists) {
    console.error(`✗ Backup file not found`);
    return false;
  }
  
  console.log(`✓ Backup file exists`);
  
  console.log('\n✓ Pre-migration validation passed');
  return true;
}
```

### Post-Migration Validation

After migration completes:

```typescript
// scripts/validate-post-migration.ts
async function validatePostMigration() {
  const databases = new Databases(client);
  
  console.log('Running post-migration validation...\n');
  
  // 1. Check document counts match
  const oldCount = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.limit(1)]
  );
  
  const newCount = await databases.listDocuments(
    DATABASE_ID,
    'imagekit',
    [Query.limit(1)]
  );
  
  if (oldCount.total !== newCount.total) {
    console.error(`✗ Document count mismatch: ${oldCount.total} vs ${newCount.total}`);
    return false;
  }
  
  console.log(`✓ Document counts match: ${newCount.total}`);
  
  // 2. Verify all eventSettingsId migrated
  const oldDocs = await databases.listDocuments(
    DATABASE_ID,
    'cloudinary',
    [Query.limit(1000)]
  );
  
  const oldEventIds = new Set(oldDocs.documents.map(d => d.eventSettingsId));
  
  const newDocs = await databases.listDocuments(
    DATABASE_ID,
    'imagekit',
    [Query.limit(1000)]
  );
  
  const newEventIds = new Set(newDocs.documents.map(d => d.eventSettingsId));
  
  const missing = [...oldEventIds].filter(id => !newEventIds.has(id));
  
  if (missing.length > 0) {
    console.error(`✗ Missing eventSettingsId in new collection: ${missing.join(', ')}`);
    return false;
  }
  
  console.log(`✓ All eventSettingsId migrated`);
  
  // 3. Verify data integrity
  for (const oldDoc of oldDocs.documents) {
    const newDoc = newDocs.documents.find(d => d.eventSettingsId === oldDoc.eventSettingsId);
    
    if (!newDoc) continue;
    
    // Check critical fields
    if (oldDoc.enabled !== newDoc.enabled) {
      console.error(`✗ Enabled mismatch for ${oldDoc.eventSettingsId}`);
      return false;
    }
  }
  
  console.log(`✓ Data integrity verified`);
  
  // 4. Test API endpoints
  try {
    const response = await fetch('/api/event-settings?eventId=test');
    if (!response.ok) {
      console.error(`✗ API endpoint test failed`);
      return false;
    }
    console.log(`✓ API endpoints working`);
  } catch (error) {
    console.error(`✗ API endpoint test failed:`, error);
    return false;
  }
  
  console.log('\n✓ Post-migration validation passed');
  return true;
}
```

### Migration Testing Checklist

- [ ] **Backup verified**: Backup file exists and is readable
- [ ] **Pre-migration validation passed**: All checks green
- [ ] **Migration script tested**: Dry run completed successfully
- [ ] **Staging environment tested**: Migration works in staging
- [ ] **Rollback tested**: Rollback procedure verified in staging
- [ ] **Performance tested**: Migration completes within acceptable time
- [ ] **Data integrity verified**: All data migrated correctly
- [ ] **API endpoints tested**: All integration endpoints working
- [ ] **UI tested**: Integration UI displays correctly
- [ ] **User acceptance**: Key users have tested and approved

---

## Common Migration Scenarios

### Scenario 1: Replacing Cloudinary with ImageKit

**Goal**: Switch photo upload service from Cloudinary to ImageKit

**Steps**:
1. Create ImageKit integration collection
2. Implement ImageKit backend functions
3. Update API routes to support ImageKit
4. Create ImageKit UI tab
5. Migrate photo URLs (re-upload recommended)
6. Test thoroughly in staging
7. Deploy to production
8. Deprecate Cloudinary (keep for 30 days)
9. Archive and remove Cloudinary

**Timeline**: 2-3 weeks

**Risk**: Medium (photos are important but not critical)



### Scenario 2: Adding New Field to Existing Integration

**Goal**: Add "folder" field to Cloudinary integration

**Steps**:
1. Add attribute to Cloudinary collection
2. Update TypeScript interface
3. Update UI to include new field
4. Update API to handle new field
5. Migrate existing records with default values
6. Test and deploy

**Timeline**: 1-2 days

**Risk**: Low (additive change, no data loss)

### Scenario 3: Removing Deprecated Integration

**Goal**: Remove old webhook integration that's no longer used

**Steps**:
1. Verify integration is truly unused (check logs, analytics)
2. Add deprecation notice in UI
3. Notify users (if any are using it)
4. Wait 30 days for users to migrate
5. Archive all integration data
6. Remove code references
7. Delete collection

**Timeline**: 30+ days (mostly waiting period)

**Risk**: Low (if truly unused)

### Scenario 4: Splitting Integration into Multiple Collections

**Goal**: Split Switchboard integration into separate "printing" and "templates" collections

**Steps**:
1. Create two new collections (printing, templates)
2. Implement backend functions for both
3. Migrate data from old collection to new collections
4. Update API routes to use new collections
5. Update UI to reflect new structure
6. Test thoroughly
7. Deploy and monitor
8. Archive old collection after 30 days

**Timeline**: 2-3 weeks

**Risk**: High (complex data transformation)

### Scenario 5: Merging Multiple Integrations

**Goal**: Merge "email" and "sms" integrations into single "notifications" integration

**Steps**:
1. Create new notifications collection with combined schema
2. Migrate data from both old collections
3. Implement unified backend functions
4. Update API routes
5. Create new unified UI
6. Test all notification types
7. Deploy
8. Archive old collections

**Timeline**: 2-3 weeks

**Risk**: High (affects multiple features)

---

## Script Templates

### Complete Migration Script Template

```typescript
// scripts/migrate-integration-template.ts
import { Client, Databases, Query, ID } from 'node-appwrite';
import * as fs from 'fs/promises';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);
const DATABASE_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;

// Configuration
const SOURCE_COLLECTION = 'old_integration';
const TARGET_COLLECTION = 'new_integration';
const BATCH_SIZE = 100;
const DRY_RUN = process.argv.includes('--dry-run');

interface MigrationStats {
  total: number;
  migrated: number;
  failed: number;
  skipped: number;
  errors: Array<{ id: string; error: string }>;
}

async function migrate() {
  console.log('='.repeat(60));
  console.log('Integration Migration Script');
  console.log('='.repeat(60));
  console.log(`Source: ${SOURCE_COLLECTION}`);
  console.log(`Target: ${TARGET_COLLECTION}`);
  console.log(`Dry Run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));
  console.log();
  
  const stats: MigrationStats = {
    total: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
    errors: []
  };
  
  try {
    // Step 1: Validate pre-conditions
    console.log('Step 1: Validating pre-conditions...');
    await validatePreConditions();
    console.log('✓ Pre-conditions validated\n');
    
    // Step 2: Create backup
    console.log('Step 2: Creating backup...');
    const backupFile = await createBackup(SOURCE_COLLECTION);
    console.log(`✓ Backup created: ${backupFile}\n`);
    
    // Step 3: Fetch source documents
    console.log('Step 3: Fetching source documents...');
    const sourceDocs = await fetchAllDocuments(SOURCE_COLLECTION);
    stats.total = sourceDocs.length;
    console.log(`✓ Found ${stats.total} documents\n`);
    
    // Step 4: Migrate documents
    console.log('Step 4: Migrating documents...');
    for (let i = 0; i < sourceDocs.length; i++) {
      const doc = sourceDocs[i];
      
      try {
        const transformed = transformDocument(doc);
        
        if (!DRY_RUN) {
          await databases.createDocument(
            DATABASE_ID,
            TARGET_COLLECTION,
            ID.unique(),
            transformed
          );
        }
        
        stats.migrated++;
        
        if ((i + 1) % 10 === 0) {
          console.log(`  Progress: ${i + 1}/${stats.total}`);
        }
      } catch (error: any) {
        stats.failed++;
        stats.errors.push({
          id: doc.$id,
          error: error.message
        });
        console.error(`  ✗ Failed to migrate ${doc.$id}: ${error.message}`);
      }
    }
    
    console.log(`✓ Migration complete\n`);
    
    // Step 5: Validate post-migration
    if (!DRY_RUN) {
      console.log('Step 5: Validating post-migration...');
      await validatePostMigration(stats);
      console.log('✓ Post-migration validation passed\n');
    }
    
    // Step 6: Print summary
    printSummary(stats);
    
  } catch (error) {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  }
}

async function validatePreConditions() {
  // Check source collection exists
  const source = await databases.listDocuments(
    DATABASE_ID,
    SOURCE_COLLECTION,
    [Query.limit(1)]
  );
  
  // Check target collection exists
  const target = await databases.listDocuments(
    DATABASE_ID,
    TARGET_COLLECTION,
    [Query.limit(1)]
  );
  
  // Check target is empty (or has expected state)
  if (target.total > 0 && !process.argv.includes('--force')) {
    throw new Error('Target collection is not empty. Use --force to override.');
  }
}

async function createBackup(collectionId: string): Promise<string> {
  const docs = await fetchAllDocuments(collectionId);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backups/${collectionId}_${timestamp}.json`;
  
  await fs.mkdir('backups', { recursive: true });
  await fs.writeFile(filename, JSON.stringify(docs, null, 2));
  
  return filename;
}

async function fetchAllDocuments(collectionId: string): Promise<any[]> {
  const allDocs = [];
  let offset = 0;
  
  while (true) {
    const response = await databases.listDocuments(
      DATABASE_ID,
      collectionId,
      [Query.limit(BATCH_SIZE), Query.offset(offset)]
    );
    
    allDocs.push(...response.documents);
    
    if (response.documents.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  
  return allDocs;
}

function transformDocument(doc: any): any {
  // Transform document from old schema to new schema
  // Customize this function for your specific migration
  
  const { $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId, ...data } = doc;
  
  return {
    eventSettingsId: data.eventSettingsId,
    version: 1,
    enabled: data.enabled || false,
    // Add your transformation logic here
    // Example: newField: data.oldField,
  };
}

async function validatePostMigration(stats: MigrationStats) {
  const targetDocs = await databases.listDocuments(
    DATABASE_ID,
    TARGET_COLLECTION,
    [Query.limit(1)]
  );
  
  if (targetDocs.total !== stats.migrated) {
    throw new Error(`Document count mismatch: expected ${stats.migrated}, got ${targetDocs.total}`);
  }
}

function printSummary(stats: MigrationStats) {
  console.log('='.repeat(60));
  console.log('Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total documents: ${stats.total}`);
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Skipped: ${stats.skipped}`);
  
  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(err => {
      console.log(`  - ${err.id}: ${err.error}`);
    });
  }
  
  console.log('='.repeat(60));
  
  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No changes were made.');
    console.log('Run without --dry-run to perform actual migration.');
  }
}

// Run migration
migrate().catch(console.error);
```

**Usage**:
```bash
# Dry run (no changes)
npx ts-node scripts/migrate-integration-template.ts --dry-run

# Actual migration
npx ts-node scripts/migrate-integration-template.ts

# Force migration (even if target not empty)
npx ts-node scripts/migrate-integration-template.ts --force
```

---

## Best Practices

### Do's ✅

- **Always create backups** before any migration
- **Test in staging** before production
- **Use dry-run mode** to validate migration logic
- **Document rollback procedures** before starting
- **Monitor during migration** for errors or issues
- **Validate data integrity** after migration
- **Keep old data** for at least 30 days after migration
- **Communicate with users** about changes and downtime
- **Use transactions** where possible for atomic operations
- **Log everything** for audit trail

### Don'ts ❌

- **Don't skip backups** - always have a safety net
- **Don't delete old data immediately** - keep for rollback
- **Don't migrate during peak hours** - schedule maintenance windows
- **Don't assume success** - always validate
- **Don't ignore errors** - investigate and fix
- **Don't rush** - take time to plan and test
- **Don't forget documentation** - update guides and examples
- **Don't skip user communication** - keep stakeholders informed

---

## Troubleshooting

### Common Issues

#### Issue: Migration script times out

**Solution**: Process in smaller batches
```typescript
const BATCH_SIZE = 50; // Reduce batch size
await new Promise(resolve => setTimeout(resolve, 100)); // Add delay between batches
```

#### Issue: Duplicate key errors

**Solution**: Check for existing documents before creating
```typescript
const existing = await databases.listDocuments(
  DATABASE_ID,
  TARGET_COLLECTION,
  [Query.equal('eventSettingsId', doc.eventSettingsId)]
);

if (existing.total > 0) {
  // Update instead of create
  await databases.updateDocument(/* ... */);
} else {
  await databases.createDocument(/* ... */);
}
```

#### Issue: Data transformation errors

**Solution**: Add validation and error handling
```typescript
function transformDocument(doc: any): any {
  try {
    // Validate required fields
    if (!doc.eventSettingsId) {
      throw new Error('Missing eventSettingsId');
    }
    
    // Transform with defaults
    return {
      eventSettingsId: doc.eventSettingsId,
      enabled: doc.enabled ?? false,
      // ... other fields with fallbacks
    };
  } catch (error) {
    console.error(`Transform error for ${doc.$id}:`, error);
    throw error;
  }
}
```

---

## Conclusion

Integration migrations require careful planning, thorough testing, and robust rollback strategies. Always prioritize data safety and user experience. When in doubt, take more time to plan and test rather than rushing into production.

For additional help:
- Review [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md)
- Check [Integration Troubleshooting Guide](./INTEGRATION_TROUBLESHOOTING_GUIDE.md)
- Consult [Adding New Integration Guide](./ADDING_NEW_INTEGRATION_GUIDE.md)

**Remember**: A successful migration is one where users don't notice anything changed, except for improvements.

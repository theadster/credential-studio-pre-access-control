# API Operators Reference

## Overview

This document provides comprehensive API documentation for database operators in CredentialStudio, including new fields in the attendee model, operator-based request examples, and error responses.

## Attendee Model

### Updated Schema

The attendee model has been enhanced with operator-managed fields for atomic tracking of credentials, photos, and views.

```typescript
interface Attendee {
  // Core identification
  $id: string;
  firstName: string;
  lastName: string;
  email?: string;
  barcodeNumber: string;
  
  // Photo management
  photoUrl?: string;
  photoUploadCount?: number;        // NEW: Tracks total photo uploads
  lastPhotoUploaded?: string;       // NEW: ISO 8601 datetime
  
  // Credential tracking
  credentialGeneratedAt?: string;   // ISO 8601 datetime
  credentialCount?: number;         // NEW: Tracks total credentials generated
  lastCredentialGenerated?: string; // NEW: ISO 8601 datetime
  
  // Activity tracking
  viewCount?: number;               // NEW: Tracks attendee views
  
  // Custom data
  customFieldValues: string;        // JSON string
  notes?: string;
  
  // Metadata
  lastSignificantUpdate?: string;   // ISO 8601 datetime
  $createdAt: string;               // ISO 8601 datetime
  $updatedAt: string;               // ISO 8601 datetime
  $permissions: string[];
}
```

### New Fields

#### credentialCount
- **Type:** `number` (integer)
- **Default:** `0`
- **Description:** Total number of credentials generated for this attendee
- **Managed by:** `Operator.increment`
- **Use case:** Dashboard statistics, reporting

#### photoUploadCount
- **Type:** `number` (integer)
- **Default:** `0`
- **Description:** Total number of photo uploads (incremented on upload, decremented on delete)
- **Managed by:** `Operator.increment` / `Operator.decrement`
- **Use case:** Photo management statistics

#### viewCount
- **Type:** `number` (integer)
- **Default:** `0`
- **Description:** Number of times attendee record was viewed
- **Managed by:** `Operator.increment`
- **Use case:** Analytics, popular attendees

#### lastCredentialGenerated
- **Type:** `string` (ISO 8601 datetime)
- **Optional:** Yes
- **Description:** Server timestamp of last credential generation
- **Managed by:** `Operator.dateSetNow`
- **Use case:** Audit trails, recent activity

#### lastPhotoUploaded
- **Type:** `string` (ISO 8601 datetime)
- **Optional:** Yes
- **Description:** Server timestamp of last photo upload
- **Managed by:** `Operator.dateSetNow`
- **Use case:** Photo management, audit trails

## API Endpoints

### Generate Credential

Generates a credential for an attendee and atomically updates tracking fields.

**Endpoint:** `POST /api/attendees/[id]/generate-credential`

**Request:**
```json
{
  "attendeeId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**Response:**
```json
{
  "success": true,
  "credential": {
    "url": "https://example.com/credential.pdf",
    "generatedAt": "2025-01-17T10:30:00.000Z"
  },
  "attendee": {
    "$id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "firstName": "John",
    "lastName": "Doe",
    "credentialCount": 5,
    "lastCredentialGenerated": "2025-01-17T10:30:00.000Z"
  }
}
```

**Operator Usage:**
```typescript
await tablesDB.updateRow({
  databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
  rowId: attendeeId,
  data: {
    credentialCount: Operator.increment(1),
    lastCredentialGenerated: Operator.dateSetNow(),
    credentialGeneratedAt: Operator.dateSetNow()
  }
});
```

**Error Responses:**

```json
// 404 - Attendee not found
{
  "error": "Attendee not found",
  "code": 404
}

// 500 - Operator failure
{
  "error": "Failed to update credential count",
  "code": 500,
  "details": "Operator execution failed"
}
```

### Upload Photo

Uploads a photo for an attendee and atomically updates tracking fields.

**Endpoint:** `POST /api/attendees/[id]/photo`

**Request:**
```typescript
// FormData with photo file
const formData = new FormData();
formData.append('photo', photoFile);
```

**Response:**
```json
{
  "success": true,
  "photoUrl": "https://res.cloudinary.com/...",
  "attendee": {
    "$id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "photoUrl": "https://res.cloudinary.com/...",
    "photoUploadCount": 3,
    "lastPhotoUploaded": "2025-01-17T10:35:00.000Z"
  }
}
```

**Operator Usage:**
```typescript
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUrl: cloudinaryUrl,
    photoUploadCount: Operator.increment(1),
    lastPhotoUploaded: Operator.dateSetNow()
  }
});
```

### Delete Photo

Deletes a photo and atomically decrements the photo count.

**Endpoint:** `DELETE /api/attendees/[id]/photo`

**Response:**
```json
{
  "success": true,
  "attendee": {
    "$id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "photoUrl": null,
    "photoUploadCount": 2,
    "lastPhotoUploaded": "2025-01-17T10:35:00.000Z"
  }
}
```

**Operator Usage:**
```typescript
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUrl: null,
    photoUploadCount: Operator.decrement(1, 0) // min: 0
  }
});
```

### Bulk Edit Attendees

Updates multiple attendees with atomic operations.

**Endpoint:** `POST /api/attendees/bulk-edit`

**Request:**
```json
{
  "attendeeIds": [
    "64f1a2b3c4d5e6f7g8h9i0j1",
    "64f1a2b3c4d5e6f7g8h9i0j2"
  ],
  "updates": {
    "viewCount": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "updated": 2,
  "failed": 0,
  "results": [
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j1",
      "success": true
    },
    {
      "id": "64f1a2b3c4d5e6f7g8h9i0j2",
      "success": true
    }
  ]
}
```

**Operator Usage:**
```typescript
// For numeric fields
if (typeof updates[field] === 'number') {
  await tablesDB.updateRows({
    databaseId: dbId,
    tableId: collectionId,
    data: {
      [field]: Operator.increment(updates[field])
    },
    queries: [
      Query.equal('$id', attendeeIds)
    ]
  });
}
```

### Update Custom Field

Updates custom field values with array operators.

**Endpoint:** `PUT /api/custom-fields/[id]`

**Request (Add Value):**
```json
{
  "attendeeId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "fieldId": "tags",
  "operation": "append",
  "value": ["vip", "speaker"]
}
```

**Response:**
```json
{
  "success": true,
  "attendee": {
    "$id": "64f1a2b3c4d5e6f7g8h9i0j1",
    "customFieldValues": {
      "tags": ["attendee", "vip", "speaker"]
    }
  }
}
```

**Operator Usage:**
```typescript
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    [`customFieldValues.${fieldId}`]: Operator.arrayAppend(['vip', 'speaker'])
  }
});
```

**Request (Remove Value):**
```json
{
  "attendeeId": "64f1a2b3c4d5e6f7g8h9i0j1",
  "fieldId": "tags",
  "operation": "remove",
  "value": "vip"
}
```

**Operator Usage:**
```typescript
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    [`customFieldValues.${fieldId}`]: Operator.arrayRemove('vip')
  }
});
```

### Create Activity Log

Creates an activity log with server-side timestamp.

**Endpoint:** `POST /api/logs`

**Request:**
```json
{
  "action": "CREDENTIAL_GENERATED",
  "details": {
    "attendeeId": "64f1a2b3c4d5e6f7g8h9i0j1",
    "attendeeName": "John Doe"
  }
}
```

**Response:**
```json
{
  "success": true,
  "log": {
    "$id": "64f1a2b3c4d5e6f7g8h9i0j3",
    "userId": "64f1a2b3c4d5e6f7g8h9i0j4",
    "action": "CREDENTIAL_GENERATED",
    "timestamp": "2025-01-17T10:30:00.000Z",
    "details": "{\"attendeeId\":\"64f1a2b3c4d5e6f7g8h9i0j1\",\"attendeeName\":\"John Doe\"}"
  }
}
```

**Operator Usage:**
```typescript
await databases.createDocument(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
  process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
  ID.unique(),
  {
    userId: user.$id,
    action: 'CREDENTIAL_GENERATED',
    timestamp: Operator.dateSetNow(),
    details: JSON.stringify(logDetails)
  }
);
```

## Operator Request Examples

### Increment Counter

```typescript
// Request
POST /api/attendees/64f1a2b3c4d5e6f7g8h9i0j1/increment-view

// Internal operator usage
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    viewCount: Operator.increment(1)
  }
});

// Response
{
  "success": true,
  "viewCount": 42
}
```

### Decrement Counter with Bounds

```typescript
// Request
DELETE /api/attendees/64f1a2b3c4d5e6f7g8h9i0j1/photo

// Internal operator usage
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    photoUploadCount: Operator.decrement(1, 0) // min: 0
  }
});

// Response
{
  "success": true,
  "photoUploadCount": 2
}
```

### Array Append

```typescript
// Request
POST /api/attendees/64f1a2b3c4d5e6f7g8h9i0j1/tags
{
  "tags": ["vip", "speaker"]
}

// Internal operator usage
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: Operator.arrayAppend(['vip', 'speaker'])
  }
});

// Response
{
  "success": true,
  "tags": ["attendee", "vip", "speaker"]
}
```

### Array Remove

```typescript
// Request
DELETE /api/attendees/64f1a2b3c4d5e6f7g8h9i0j1/tags/vip

// Internal operator usage
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    tags: Operator.arrayRemove('vip')
  }
});

// Response
{
  "success": true,
  "tags": ["attendee", "speaker"]
}
```

### Server Timestamp

```typescript
// Request
POST /api/attendees/64f1a2b3c4d5e6f7g8h9i0j1/generate-credential

// Internal operator usage
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    lastCredentialGenerated: Operator.dateSetNow()
  }
});

// Response
{
  "success": true,
  "lastCredentialGenerated": "2025-01-17T10:30:00.000Z"
}
```

### Combined Operations

```typescript
// Request
POST /api/attendees/64f1a2b3c4d5e6f7g8h9i0j1/generate-credential

// Internal operator usage
await tablesDB.updateRow({
  databaseId: dbId,
  tableId: collectionId,
  rowId: attendeeId,
  data: {
    credentialCount: Operator.increment(1),
    lastCredentialGenerated: Operator.dateSetNow(),
    credentialGeneratedAt: Operator.dateSetNow()
  }
});

// Response
{
  "success": true,
  "credentialCount": 5,
  "lastCredentialGenerated": "2025-01-17T10:30:00.000Z"
}
```

## Error Responses

### Validation Errors

**400 Bad Request - Invalid Operator Value**
```json
{
  "error": "Invalid operator value",
  "code": 400,
  "details": "Increment value must be a valid number"
}
```

**400 Bad Request - Type Mismatch**
```json
{
  "error": "Type mismatch",
  "code": 400,
  "details": "Cannot apply numeric operator to string field"
}
```

**400 Bad Request - Invalid Array**
```json
{
  "error": "Invalid array value",
  "code": 400,
  "details": "arrayAppend requires an array"
}
```

### Execution Errors

**404 Not Found - Document Not Found**
```json
{
  "error": "Document not found",
  "code": 404,
  "documentId": "64f1a2b3c4d5e6f7g8h9i0j1"
}
```

**401 Unauthorized - Permission Denied**
```json
{
  "error": "Permission denied",
  "code": 401,
  "details": "User does not have permission to update this document"
}
```

**500 Internal Server Error - Operator Failure**
```json
{
  "error": "Operator execution failed",
  "code": 500,
  "details": "Failed to increment credentialCount",
  "fallback": "Using traditional update method"
}
```

**429 Too Many Requests - Rate Limit**
```json
{
  "error": "Rate limit exceeded",
  "code": 429,
  "retryAfter": 60
}
```

### Bounds Errors

**400 Bad Request - Maximum Exceeded**
```json
{
  "error": "Maximum value exceeded",
  "code": 400,
  "field": "credentialCount",
  "max": 1000,
  "attempted": 1001
}
```

**400 Bad Request - Minimum Exceeded**
```json
{
  "error": "Minimum value exceeded",
  "code": 400,
  "field": "photoUploadCount",
  "min": 0,
  "attempted": -1
}
```

## Query Parameters

### Filtering by Operator-Managed Fields

```typescript
import { Query } from 'appwrite';

// Get attendees with credentials generated
const attendees = await databases.listDocuments(
  dbId,
  collectionId,
  [
    Query.greaterThan('credentialCount', 0)
  ]
);

// Get attendees with photos
const attendees = await databases.listDocuments(
  dbId,
  collectionId,
  [
    Query.greaterThan('photoUploadCount', 0)
  ]
);

// Get recently active attendees
const attendees = await databases.listDocuments(
  dbId,
  collectionId,
  [
    Query.greaterThan('lastCredentialGenerated', '2025-01-01T00:00:00.000Z')
  ]
);
```

### Sorting by Operator-Managed Fields

```typescript
import { Query } from 'appwrite';

// Sort by credential count (descending)
const attendees = await databases.listDocuments(
  dbId,
  collectionId,
  [
    Query.orderDesc('credentialCount')
  ]
);

// Sort by last credential generated (most recent first)
const attendees = await databases.listDocuments(
  dbId,
  collectionId,
  [
    Query.orderDesc('lastCredentialGenerated')
  ]
);
```

## Dashboard Statistics

### Get Credential Statistics

**Endpoint:** `GET /api/dashboard/stats/credentials`

**Response:**
```json
{
  "totalCredentials": 1250,
  "attendeesWithCredentials": 450,
  "averageCredentialsPerAttendee": 2.78,
  "recentGenerations": [
    {
      "attendeeId": "64f1a2b3c4d5e6f7g8h9i0j1",
      "attendeeName": "John Doe",
      "credentialCount": 5,
      "lastGenerated": "2025-01-17T10:30:00.000Z"
    }
  ]
}
```

**Implementation:**
```typescript
// Aggregate credential counts
const attendees = await databases.listDocuments(dbId, collectionId);

const totalCredentials = attendees.documents.reduce(
  (sum, attendee) => sum + (attendee.credentialCount || 0),
  0
);

const attendeesWithCredentials = attendees.documents.filter(
  attendee => (attendee.credentialCount || 0) > 0
).length;
```

### Get Photo Statistics

**Endpoint:** `GET /api/dashboard/stats/photos`

**Response:**
```json
{
  "totalPhotos": 380,
  "attendeesWithPhotos": 380,
  "photoUploadRate": 0.84,
  "recentUploads": [
    {
      "attendeeId": "64f1a2b3c4d5e6f7g8h9i0j1",
      "attendeeName": "John Doe",
      "photoUploadCount": 3,
      "lastUploaded": "2025-01-17T10:35:00.000Z"
    }
  ]
}
```

**Implementation:**
```typescript
// Aggregate photo counts
const attendees = await databases.listDocuments(dbId, collectionId);

const totalPhotos = attendees.documents.reduce(
  (sum, attendee) => sum + (attendee.photoUploadCount || 0),
  0
);

const attendeesWithPhotos = attendees.documents.filter(
  attendee => (attendee.photoUploadCount || 0) > 0
).length;
```

## Performance Metrics

### Operation Latency

Typical response times for operator-based operations:

| Operation | Traditional | With Operators | Improvement |
|-----------|-------------|----------------|-------------|
| Single increment | 150ms | 75ms | 50% faster |
| Bulk update (100) | 15s | 5s | 67% faster |
| Array append | 120ms | 60ms | 50% faster |
| Concurrent ops | Race conditions | Atomic | 100% accurate |

### Network Overhead

| Operation | Traditional | With Operators | Reduction |
|-----------|-------------|----------------|-----------|
| Single update | 2 requests | 1 request | 50% |
| Bulk update (100) | 200 requests | 1 request | 99.5% |

## Best Practices

### 1. Always Use Bounds

```typescript
// Good
await tablesDB.updateRow({
  data: {
    credentialCount: Operator.increment(1, 10000), // max
    photoUploadCount: Operator.decrement(1, 0)     // min
  }
});
```

### 2. Handle Errors Gracefully

```typescript
try {
  await tablesDB.updateRow({
    data: { credentialCount: Operator.increment(1) }
  });
} catch (error) {
  console.error('Operator failed:', error);
  // Implement fallback
}
```

### 3. Use Server Timestamps

```typescript
// Good - server time
await tablesDB.updateRow({
  data: {
    lastCredentialGenerated: Operator.dateSetNow()
  }
});

// Bad - client time (time drift issues)
await databases.updateDocument(dbId, collectionId, id, {
  lastCredentialGenerated: new Date().toISOString()
});
```

### 4. Combine Related Operations

```typescript
// Good - atomic
await tablesDB.updateRow({
  data: {
    credentialCount: Operator.increment(1),
    lastCredentialGenerated: Operator.dateSetNow()
  }
});

// Bad - separate operations
await tablesDB.updateRow({
  data: { credentialCount: Operator.increment(1) }
});
await tablesDB.updateRow({
  data: { lastCredentialGenerated: Operator.dateSetNow() }
});
```

## Migration Notes

When migrating to operators:

1. **Add new fields** to database schema
2. **Migrate existing data** to populate new fields
3. **Update API endpoints** to use operators
4. **Test thoroughly** under concurrent load
5. **Monitor performance** improvements
6. **Document changes** in API documentation

See the [Operator Migration Guide](../migration/OPERATOR_MIGRATION_GUIDE.md) for detailed migration instructions.

## Related Documentation

- [Database Operators Guide](./DATABASE_OPERATORS_GUIDE.md) - Comprehensive operator usage guide
- [Operator Migration Guide](../migration/OPERATOR_MIGRATION_GUIDE.md) - Migration patterns and procedures
- [Bulk Operations Performance](./BULK_OPERATIONS_PERFORMANCE.md) - Performance benchmarks
- [Array Operators Implementation](./ARRAY_OPERATORS_IMPLEMENTATION.md) - Array operator details

## Support

For issues or questions about operators:

1. Check the [Database Operators Guide](./DATABASE_OPERATORS_GUIDE.md)
2. Review the [Migration Guide](../migration/OPERATOR_MIGRATION_GUIDE.md)
3. Check existing tests in `src/__tests__/lib/operators.test.ts`
4. Review implementation examples in API routes

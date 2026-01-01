---
title: "Integration Data Flow"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/integrations/"]
---

# Integration Data Flow Guide

## Overview

This guide provides a comprehensive explanation of how integration data flows through the credential.studio application, from user input in the UI to storage in the database. Understanding this flow is essential for debugging issues, optimizing performance, and maintaining the integration system.

## Table of Contents

1. [Data Flow Overview](#data-flow-overview)
2. [Form Data Collection](#form-data-collection)
3. [API Request Processing](#api-request-processing)
4. [Integration Field Extraction](#integration-field-extraction)
5. [Parallel Integration Fetching](#parallel-integration-fetching)
6. [Cache Usage and Invalidation](#cache-usage-and-invalidation)
7. [Data Transformation](#data-transformation)
8. [Transaction Handling](#transaction-handling)
9. [Performance Considerations](#performance-considerations)
10. [Error Handling](#error-handling)

---

## Data Flow Overview

The integration data flow follows this high-level path:

```
User Input (UI)
  ↓
EventSettingsForm Component
  ↓
Form State Management (useEventSettingsForm hook)
  ↓
HTTP POST to /api/event-settings
  ↓
API Handler (event-settings/index.ts)
  ↓
extractIntegrationFields() - Separates integration data
  ↓
Parallel Processing:
  ├─ Core Settings Update (via Transactions)
  ├─ Custom Fields Update (via Transactions)
  └─ Integration Updates (via Optimistic Locking)
      ├─ updateCloudinaryIntegration()
      ├─ updateSwitchboardIntegration()
      └─ updateOneSimpleApiIntegration()
  ↓
Cache Invalidation
  ↓
Fetch Updated Data (with integrations)
  ↓
flattenEventSettings() - Denormalize for backward compatibility
  ↓
HTTP Response to Client
  ↓
UI Update
```


## Form Data Collection

### EventSettingsForm Component Structure

The form is organized into a container component that manages all state and delegates rendering to specialized tab components:

```typescript
// Component hierarchy
EventSettingsFormContainer
  ├─ useEventSettingsForm (custom hook for state management)
  ├─ GeneralTab (event details)
  ├─ BarcodeTab (barcode configuration)
  ├─ CustomFieldsTab (custom field management)
  └─ IntegrationsTab (integration settings)
      ├─ CloudinaryTab
      ├─ SwitchboardTab
      └─ OneSimpleApiTab
```

### Form State Management

The `useEventSettingsForm` hook centralizes all form state:

```typescript
const {
  // State
  formData,           // All form fields (core + integrations)
  customFields,       // Array of custom field definitions
  fieldMappings,      // Switchboard field mappings
  integrationStatus,  // Integration readiness indicators
  
  // Handlers
  handleInputChange,  // Updates formData on field change
  handleSubmit,       // Processes form submission
  // ... other handlers
} = useEventSettingsForm({ eventSettings, isOpen, onSave, onClose });
```

### Form Data Structure

The `formData` object contains all settings in a flattened structure:

```typescript
interface FormData {
  // Core event settings
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  timeZone: string;
  barcodeType: string;
  barcodeLength: number;
  barcodeUnique: boolean;
  // ... other core fields
  
  // Cloudinary integration (prefixed)
  cloudinaryEnabled: boolean;
  cloudinaryCloudName: string;
  cloudinaryUploadPreset: string;
  cloudinaryAutoOptimize: boolean;
  cloudinaryGenerateThumbnails: boolean;
  cloudinaryDisableSkipCrop: boolean;
  cloudinaryCropAspectRatio: string;
  
  // Switchboard integration (prefixed)
  switchboardEnabled: boolean;
  switchboardApiEndpoint: string;
  switchboardAuthHeaderType: string;
  switchboardRequestBody: string;
  switchboardTemplateId: string;
  switchboardFieldMappings: FieldMapping[];
  
  // OneSimpleAPI integration (prefixed)
  oneSimpleApiEnabled: boolean;
  oneSimpleApiUrl: string;
  oneSimpleApiFormDataKey: string;
  oneSimpleApiFormDataValue: string;
  oneSimpleApiRecordTemplate: string;
}
```

**Key Points:**
- All integration fields are prefixed with the integration name (e.g., `cloudinary`, `switchboard`)
- API credentials (API keys, secrets) are NOT included in form data for security
- Custom fields are managed separately in the `customFields` array
- Field mappings for Switchboard are stored in `fieldMappings` array


## API Request Processing

### Request Flow

When the form is submitted, the following sequence occurs:

1. **Form Submission**: User clicks "Save" button
2. **Validation**: Client-side validation (if any)
3. **HTTP POST**: Request sent to `/api/event-settings`
4. **Authentication**: Middleware verifies user session
5. **Authorization**: Permission checks (if required)
6. **Processing**: API handler processes the request
7. **Response**: Updated settings returned to client

### Request Payload

The POST request body contains:

```json
{
  "eventName": "Tech Conference 2025",
  "eventDate": "2025-06-15",
  "customFields": [
    {
      "id": "field_123",
      "fieldName": "Credential Type",
      "fieldType": "select",
      "order": 1
    }
  ],
  "cloudinaryEnabled": true,
  "cloudinaryCloudName": "my-cloud",
  "switchboardEnabled": false,
  "oneSimpleApiEnabled": false
}
```

**Important Notes:**
- The payload is a flat object with all fields at the root level
- Integration fields are prefixed (e.g., `cloudinaryEnabled`)
- Custom fields are sent as a separate array
- API credentials are NEVER sent from the client


## Integration Field Extraction

### The extractIntegrationFields Function

This critical function separates integration-specific fields from the update payload:

```typescript
function extractIntegrationFields(updateData: any) {
  // Extract Cloudinary fields (7 fields - credentials removed for security)
  const cloudinaryFields = {
    enabled: updateData.cloudinaryEnabled,
    cloudName: updateData.cloudinaryCloudName,
    uploadPreset: updateData.cloudinaryUploadPreset,
    autoOptimize: updateData.cloudinaryAutoOptimize,
    generateThumbnails: updateData.cloudinaryGenerateThumbnails,
    disableSkipCrop: updateData.cloudinaryDisableSkipCrop,
    cropAspectRatio: updateData.cloudinaryCropAspectRatio
  };

  // Extract Switchboard fields (6 fields - API key removed for security)
  const switchboardFields = {
    enabled: updateData.switchboardEnabled,
    apiEndpoint: updateData.switchboardApiEndpoint,
    authHeaderType: updateData.switchboardAuthHeaderType,
    requestBody: updateData.switchboardRequestBody,
    templateId: updateData.switchboardTemplateId,
    fieldMappings: typeof updateData.switchboardFieldMappings === 'string'
      ? updateData.switchboardFieldMappings
      : (updateData.switchboardFieldMappings !== undefined 
          ? JSON.stringify(updateData.switchboardFieldMappings) 
          : undefined)
  };

  // Extract OneSimpleAPI fields (5 fields)
  const oneSimpleApiFields = {
    enabled: updateData.oneSimpleApiEnabled,
    url: updateData.oneSimpleApiUrl,
    formDataKey: updateData.oneSimpleApiFormDataKey,
    formDataValue: updateData.oneSimpleApiFormDataValue,
    recordTemplate: updateData.oneSimpleApiRecordTemplate
  };

  // Filter out undefined values to avoid overwriting with undefined
  const filterUndefined = (obj: any) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
  };

  return {
    cloudinary: filterUndefined(cloudinaryFields),
    switchboard: filterUndefined(switchboardFields),
    oneSimpleApi: filterUndefined(oneSimpleApiFields)
  };
}
```

### Key Responsibilities

1. **Field Mapping**: Maps prefixed fields to integration-specific field names
   - `cloudinaryEnabled` → `enabled`
   - `cloudinaryCloudName` → `cloudName`

2. **Security Filtering**: Removes API credentials from the extraction
   - Cloudinary: `apiKey`, `apiSecret` are NOT extracted
   - Switchboard: `apiKey` is NOT extracted
   - These are read from environment variables at runtime

3. **Type Conversion**: Handles data type transformations
   - `fieldMappings`: Converts array to JSON string if needed

4. **Undefined Filtering**: Removes undefined values
   - Prevents overwriting existing values with undefined
   - Only sends fields that were actually changed

### Usage in API Handler

```typescript
// In PUT /api/event-settings handler
const integrationFields = extractIntegrationFields(updateData);

// Result structure:
{
  cloudinary: { enabled: true, cloudName: "my-cloud", ... },
  switchboard: { enabled: false },
  oneSimpleApi: {}
}
```


## Parallel Integration Fetching

### Promise.allSettled Pattern

The application uses `Promise.allSettled` to fetch all integrations in parallel, ensuring that failures in one integration don't block others:

```typescript
const [
  cloudinaryResult,
  switchboardResult,
  oneSimpleApiResult
] = await Promise.allSettled([
  getCloudinaryIntegration(databases, eventSettingsId),
  getSwitchboardIntegration(databases, eventSettingsId),
  getOneSimpleApiIntegration(databases, eventSettingsId),
]);
```

### Why Promise.allSettled?

**Advantages over Promise.all:**
- **Partial Failure Tolerance**: If one integration fails, others still succeed
- **Complete Results**: Returns both fulfilled and rejected promises
- **Better Error Handling**: Can handle each failure individually
- **Improved Reliability**: System remains functional even with integration issues

### Result Extraction

The application uses type-safe helper functions to extract results:

```typescript
// Type-safe extraction using isFulfilled type guard
const cloudinaryData = isFulfilled(cloudinaryResult) 
  ? cloudinaryResult.value.documents[0] 
  : null;

const switchboardData = isFulfilled(switchboardResult)
  ? switchboardResult.value.documents[0]
  : null;

const oneSimpleApiData = isFulfilled(oneSimpleApiResult)
  ? oneSimpleApiResult.value.documents[0]
  : null;
```

### Error Logging

Failed integrations are logged but don't block the response:

```typescript
if (isRejected(cloudinaryResult)) {
  const error = cloudinaryResult.reason;
  console.error('Failed to fetch Cloudinary integration:', {
    integration: 'Cloudinary',
    error: error,
    message: error instanceof Error ? error.message : 'Unknown error',
    eventSettingsId: eventSettings.$id
  });
}
```

### Benefits

1. **Performance**: All integrations fetched simultaneously (not sequentially)
2. **Resilience**: One failing integration doesn't break the entire response
3. **Observability**: Failed integrations are logged for debugging
4. **User Experience**: Users can still access working integrations

### Performance Impact

**Sequential Fetching (Bad):**
```
Cloudinary: 100ms
Switchboard: 100ms
OneSimpleAPI: 100ms
Total: 300ms
```

**Parallel Fetching (Good):**
```
All three: max(100ms, 100ms, 100ms) = 100ms
Total: 100ms (3x faster!)
```


## Cache Usage and Invalidation

### EventSettingsCache Implementation

The application uses an in-memory cache to reduce database queries for frequently accessed event settings:

```typescript
// Singleton cache instance
export const eventSettingsCache = new EventSettingsCache();

// Cache configuration
DEFAULT_TTL = 5 * 60 * 1000;      // 5 minutes
MAX_ENTRIES = 1000;                // Maximum cache entries
CLEANUP_INTERVAL = 60 * 1000;      // Cleanup every minute
```

### Cache Features

1. **TTL (Time To Live)**: Entries expire after 5 minutes
2. **LRU Eviction**: Least Recently Used entries are removed when cache is full
3. **Automatic Cleanup**: Expired entries are removed periodically
4. **Size Limits**: Maximum 1000 entries to prevent memory issues
5. **Last Accessed Tracking**: Supports LRU eviction strategy

### Cache Flow in GET Requests

```typescript
// 1. Check cache first
const cacheKey = 'event-settings';
const cachedData = eventSettingsCache.get(cacheKey);

if (cachedData) {
  // Cache hit - return immediately
  res.setHeader('X-Cache', 'HIT');
  res.setHeader('X-Cache-Age', Math.floor((Date.now() - cachedData.timestamp) / 1000).toString());
  return res.status(200).json(cachedData);
}

// 2. Cache miss - fetch from database
res.setHeader('X-Cache', 'MISS');
const eventSettings = await databases.listDocuments(...);

// 3. Store in cache for next request
eventSettingsCache.set(cacheKey, eventSettingsWithFields);

// 4. Return response
res.status(200).json(eventSettingsWithFields);
```

### Cache Invalidation

The cache is invalidated whenever event settings are updated:

```typescript
// In PUT /api/event-settings handler
// After successful update
eventSettingsCache.invalidate('event-settings');
```

**Invalidation Triggers:**
- Event settings update (core fields)
- Custom fields modification
- Integration settings change
- Any change that affects the event settings response

### Cache Headers

The API includes cache-related headers in responses:

```http
X-Cache: HIT                    # Cache hit or miss
X-Cache-Age: 45                 # Age in seconds (for cache hits)
```

### Performance Benefits

**Without Cache:**
- Every request queries database
- Multiple queries for integrations
- Response time: ~200-300ms

**With Cache:**
- Cache hit returns immediately
- No database queries
- Response time: ~5-10ms (20-60x faster!)

### Cache Statistics

Monitor cache performance:

```typescript
const stats = eventSettingsCache.getStats();
// {
//   size: 1,
//   maxSize: 1000,
//   keys: ['event-settings'],
//   utilizationPercent: 0,
//   expiredCount: 0
// }
```


## Data Transformation

### The flattenEventSettings Helper

This function transforms the normalized database structure into a flat object for backward compatibility:

```typescript
export function flattenEventSettings(settings: EventSettingsWithIntegrations): any {
  const { cloudinary, switchboard, oneSimpleApi, ...coreSettings } = settings;

  return {
    ...coreSettings,
    // Map Appwrite's automatic timestamp fields
    createdAt: coreSettings.$createdAt || coreSettings.createdAt,
    updatedAt: coreSettings.$updatedAt || coreSettings.updatedAt,
    
    // Cloudinary fields (prefixed)
    cloudinaryEnabled: cloudinary?.enabled || false,
    cloudinaryCloudName: cloudinary?.cloudName || '',
    cloudinaryUploadPreset: cloudinary?.uploadPreset || '',
    cloudinaryAutoOptimize: cloudinary?.autoOptimize || false,
    cloudinaryGenerateThumbnails: cloudinary?.generateThumbnails || false,
    cloudinaryDisableSkipCrop: cloudinary?.disableSkipCrop || false,
    cloudinaryCropAspectRatio: cloudinary?.cropAspectRatio || '1',
    
    // Switchboard fields (prefixed)
    switchboardEnabled: switchboard?.enabled || false,
    switchboardApiEndpoint: switchboard?.apiEndpoint || '',
    switchboardAuthHeaderType: switchboard?.authHeaderType || '',
    switchboardRequestBody: switchboard?.requestBody || '',
    switchboardTemplateId: switchboard?.templateId || '',
    switchboardFieldMappings: switchboard?.fieldMappings && switchboard.fieldMappings !== ''
      ? JSON.parse(switchboard.fieldMappings)
      : [],
    
    // OneSimpleAPI fields (prefixed)
    oneSimpleApiEnabled: oneSimpleApi?.enabled || false,
    oneSimpleApiUrl: oneSimpleApi?.url || '',
    oneSimpleApiFormDataKey: oneSimpleApi?.formDataKey || '',
    oneSimpleApiFormDataValue: oneSimpleApi?.formDataValue || '',
    oneSimpleApiRecordTemplate: oneSimpleApi?.recordTemplate || '',
  };
}
```

### Purpose and Benefits

1. **Backward Compatibility**: Existing code expects a flat structure
2. **Simplified Access**: No need to navigate nested objects
3. **Default Values**: Provides sensible defaults for missing integrations
4. **Type Conversion**: Parses JSON strings (e.g., fieldMappings)
5. **Field Mapping**: Maps database field names to UI field names

### Transformation Flow

```
Database Structure (Normalized):
{
  $id: "settings_123",
  eventName: "Conference",
  cloudinary: {
    $id: "cloud_456",
    enabled: true,
    cloudName: "my-cloud"
  },
  switchboard: null,
  oneSimpleApi: null
}

↓ flattenEventSettings() ↓

Flattened Structure:
{
  id: "settings_123",
  eventName: "Conference",
  cloudinaryEnabled: true,
  cloudinaryCloudName: "my-cloud",
  cloudinaryUploadPreset: "",
  switchboardEnabled: false,
  switchboardApiEndpoint: "",
  oneSimpleApiEnabled: false,
  oneSimpleApiUrl: ""
}
```

### Usage Pattern

```typescript
// 1. Fetch event settings with integrations
const eventSettingsWithIntegrations = {
  ...eventSettings,
  cloudinary: cloudinaryData || undefined,
  switchboard: switchboardData || undefined,
  oneSimpleApi: oneSimpleApiData || undefined
};

// 2. Flatten for API response
const flattenedSettings = flattenEventSettings(eventSettingsWithIntegrations);

// 3. Add custom fields
const response = {
  ...flattenedSettings,
  customFields: parsedCustomFields
};

// 4. Return to client
res.status(200).json(response);
```

### Security Note

The flattening function does NOT include API credentials:

```typescript
// SECURITY: API credentials are NOT stored in database
// They must be read from environment variables at runtime
// cloudinaryApiKey: cloudinary?.apiKey || '',      // ❌ NOT included
// cloudinaryApiSecret: cloudinary?.apiSecret || '', // ❌ NOT included
// switchboardApiKey: switchboard?.apiKey || '',     // ❌ NOT included
```


## Transaction Handling

### Core Settings vs Integrations

The application uses different strategies for updating core settings and integrations:

#### Core Settings (Transactional)

Core event settings and custom fields are updated using Appwrite Transactions:

```typescript
// Build transaction operations
const operations: TransactionOperation[] = [
  // 1. Delete custom fields
  { action: 'delete', databaseId, tableId, rowId },
  
  // 2. Update custom fields
  { action: 'update', databaseId, tableId, rowId, data },
  
  // 3. Create custom fields
  { action: 'create', databaseId, tableId, rowId, data },
  
  // 4. Update core event settings
  { action: 'update', databaseId, tableId, rowId, data },
  
  // 5. Create audit log
  { action: 'create', databaseId, tableId, rowId, data }
];

// Execute all operations atomically
await executeTransactionWithRetry(tablesDB, operations);
```

**Benefits:**
- **Atomicity**: All operations succeed or all fail
- **Consistency**: No partial updates
- **Rollback**: Automatic rollback on failure
- **Data Integrity**: Maintains referential integrity

#### Integration Settings (Optimistic Locking)

Integrations are updated separately using optimistic locking:

```typescript
// Update integrations in parallel (not in transaction)
const integrationUpdates = [];

if (Object.keys(integrationFields.cloudinary).length > 0) {
  integrationUpdates.push(
    updateCloudinaryIntegration(
      databases,
      currentSettings.$id,
      integrationFields.cloudinary
    )
  );
}

if (Object.keys(integrationFields.switchboard).length > 0) {
  integrationUpdates.push(
    updateSwitchboardIntegration(
      databases,
      currentSettings.$id,
      integrationFields.switchboard
    )
  );
}

if (Object.keys(integrationFields.oneSimpleApi).length > 0) {
  integrationUpdates.push(
    updateOneSimpleApiIntegration(
      databases,
      currentSettings.$id,
      integrationFields.oneSimpleApi
    )
  );
}

// Execute integration updates
await Promise.all(integrationUpdates);
```

**Why Not Transactions?**
- Integrations use optimistic locking with version numbers
- Each integration is independent
- Partial failures are acceptable (one integration can fail without affecting others)
- Optimistic locking provides sufficient concurrency control

### Update Flow Diagram

```
User Submits Form
  ↓
API Handler Receives Request
  ↓
┌─────────────────────────────────────┐
│ Transaction (Atomic)                │
│  1. Delete removed custom fields    │
│  2. Update modified custom fields   │
│  3. Create new custom fields        │
│  4. Update core event settings      │
│  5. Create audit log entry          │
└─────────────────────────────────────┘
  ↓
Transaction Committed
  ↓
┌─────────────────────────────────────┐
│ Integration Updates (Parallel)      │
│  ├─ Update Cloudinary (if changed)  │
│  ├─ Update Switchboard (if changed) │
│  └─ Update OneSimpleAPI (if changed)│
└─────────────────────────────────────┘
  ↓
Cache Invalidation
  ↓
Fetch Updated Data
  ↓
Return Response
```

### Error Handling

**Transaction Errors:**
- All operations are rolled back
- User sees error message
- No partial updates

**Integration Errors:**
- Failed integrations are logged
- Successful integrations are saved
- User sees warning about failed integrations
- Core settings are still updated

### Response Headers

The API includes transaction indicators:

```http
X-Transaction-Used: true           # Indicates transaction was used
X-Integration-Warnings: true       # Indicates integration failures
```


## Performance Considerations

### Query Optimization

#### 1. Parallel Fetching

**Always fetch integrations in parallel:**

```typescript
// ✅ Good: Parallel fetching (100ms total)
const [cloudinary, switchboard, oneSimpleApi] = await Promise.allSettled([
  getCloudinaryIntegration(databases, eventSettingsId),
  getSwitchboardIntegration(databases, eventSettingsId),
  getOneSimpleApiIntegration(databases, eventSettingsId),
]);

// ❌ Bad: Sequential fetching (300ms total)
const cloudinary = await getCloudinaryIntegration(databases, eventSettingsId);
const switchboard = await getSwitchboardIntegration(databases, eventSettingsId);
const oneSimpleApi = await getOneSimpleApiIntegration(databases, eventSettingsId);
```

#### 2. Cache Strategy

**Use cache for frequently accessed data:**

```typescript
// Check cache first
const cached = eventSettingsCache.get('event-settings');
if (cached) {
  return res.status(200).json(cached); // ~5ms response
}

// Cache miss - fetch from database
const data = await fetchFromDatabase(); // ~200ms response

// Store in cache
eventSettingsCache.set('event-settings', data);
```

**Cache Hit Rate Impact:**
- 90% hit rate: Average response time ~25ms
- 50% hit rate: Average response time ~100ms
- 0% hit rate: Average response time ~200ms

#### 3. Query Limits

**Always use Query.limit() to prevent over-fetching:**

```typescript
// ✅ Good: Limit results
await databases.listDocuments(
  dbId,
  collectionId,
  [Query.equal('eventSettingsId', id), Query.limit(1)]
);

// ❌ Bad: No limit (fetches all documents)
await databases.listDocuments(
  dbId,
  collectionId,
  [Query.equal('eventSettingsId', id)]
);
```

### Data Transfer Optimization

#### 1. Selective Field Updates

**Only send changed fields:**

```typescript
// Extract integration fields and filter undefined
const integrationFields = extractIntegrationFields(updateData);

// Only includes fields that were actually changed
// { enabled: true, cloudName: "new-name" }
// NOT: { enabled: true, cloudName: "new-name", uploadPreset: undefined, ... }
```

#### 2. JSON String Storage

**Store complex data as JSON strings:**

```typescript
// Switchboard field mappings stored as JSON string
fieldMappings: JSON.stringify([
  { fieldId: "123", switchboardField: "name" }
])

// Parsed on retrieval
const mappings = JSON.parse(switchboard.fieldMappings);
```

**Benefits:**
- Smaller database storage
- Faster queries (no nested object indexing)
- Easier to version and migrate

### Response Time Targets

| Operation | Target | Typical | Notes |
|-----------|--------|---------|-------|
| GET (cache hit) | <10ms | 5-10ms | Immediate response |
| GET (cache miss) | <300ms | 200-250ms | Includes 3 integration queries |
| PUT (no integrations) | <500ms | 300-400ms | Transaction overhead |
| PUT (with integrations) | <800ms | 500-700ms | Includes integration updates |

### Performance Monitoring

The API includes performance tracking headers:

```http
X-Query-Time-eventSettings: 45ms
X-Query-Time-parallelIntegrations: 120ms
X-Total-Query-Time: 165ms
X-Cache: MISS
```

**Use these headers to:**
- Identify slow queries
- Monitor cache effectiveness
- Track performance regressions
- Optimize bottlenecks

### Optimization Checklist

- [ ] Use `Promise.allSettled` for parallel integration fetching
- [ ] Implement caching for frequently accessed data
- [ ] Add `Query.limit()` to all list queries
- [ ] Filter undefined values before updates
- [ ] Use transactions for atomic operations
- [ ] Monitor performance headers
- [ ] Set appropriate cache TTL
- [ ] Implement LRU eviction for cache
- [ ] Log slow queries for investigation
- [ ] Use indexes on frequently queried fields


## Error Handling

### Error Categories

#### 1. Integration Fetch Errors

**Scenario**: Failed to fetch integration data during GET request

```typescript
const [cloudinaryResult, switchboardResult, oneSimpleApiResult] = 
  await Promise.allSettled([...]);

if (isRejected(cloudinaryResult)) {
  console.error('Failed to fetch Cloudinary integration:', {
    integration: 'Cloudinary',
    error: cloudinaryResult.reason,
    eventSettingsId: eventSettings.$id
  });
  // Continue with null value - don't fail entire request
  cloudinaryData = null;
}
```

**Handling:**
- Log error with context
- Set integration data to null
- Continue processing other integrations
- Return partial response to user

#### 2. Integration Update Errors

**Scenario**: Failed to update integration during PUT request

```typescript
const integrationUpdates = [
  updateCloudinaryIntegration(...).catch(error => {
    console.error('Failed to update Cloudinary integration:', error);
    return {
      error: 'cloudinary',
      message: error.message,
      fields: Object.keys(integrationFields.cloudinary)
    };
  })
];

const results = await Promise.all(integrationUpdates);
const errors = results.filter(r => r && 'error' in r);

if (errors.length > 0) {
  response.warnings = {
    integrations: errors,
    message: 'Some integration updates failed. Core event settings were updated successfully.'
  };
  res.setHeader('X-Integration-Warnings', 'true');
}
```

**Handling:**
- Catch errors per integration
- Log error details
- Continue with other integrations
- Return warnings in response
- Core settings still updated successfully

#### 3. Optimistic Locking Conflicts

**Scenario**: Version mismatch during concurrent updates

```typescript
if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
  throw new IntegrationConflictError(
    integrationType,
    eventSettingsId,
    expectedVersion,
    currentVersion
  );
}
```

**Response:**
```json
{
  "error": "Conflict",
  "message": "Integration conflict: Cloudinary for event settings_123...",
  "integrationType": "Cloudinary",
  "eventSettingsId": "settings_123",
  "expectedVersion": 5,
  "actualVersion": 6,
  "resolution": "Please refresh the page and try again..."
}
```

**Handling:**
- Return 409 Conflict status
- Include version information
- Provide user-friendly resolution message
- User refreshes and retries

#### 4. Transaction Errors

**Scenario**: Transaction fails during core settings update

```typescript
try {
  await executeTransactionWithRetry(tablesDB, operations);
} catch (error) {
  console.error('Transaction failed:', error);
  return res.status(500).json({
    error: 'Failed to update event settings',
    message: error.message,
    details: 'All changes have been rolled back'
  });
}
```

**Handling:**
- All operations are rolled back automatically
- Return 500 Internal Server Error
- Log error with full context
- User sees error message
- No partial updates

#### 5. Cache Errors

**Scenario**: Cache access or set fails

```typescript
try {
  cachedData = eventSettingsCache.get(cacheKey);
} catch (cacheError) {
  console.error('Cache access error:', {
    error: cacheError,
    cacheKey,
    timestamp: new Date().toISOString()
  });
  // Continue with database query
  cachedData = null;
}
```

**Handling:**
- Log error but don't fail request
- Fall back to database query
- Cache errors are non-fatal
- System remains functional

### Error Response Patterns

#### Success with Warnings

```json
{
  "id": "settings_123",
  "eventName": "Conference",
  "cloudinaryEnabled": true,
  "warnings": {
    "integrations": [
      {
        "integration": "switchboard",
        "message": "Connection timeout",
        "fields": ["enabled", "apiEndpoint"]
      }
    ],
    "message": "Some integration updates failed. Core event settings were updated successfully."
  }
}
```

**HTTP Status**: 200 OK  
**Headers**: `X-Integration-Warnings: true`

#### Conflict Error

```json
{
  "error": "Conflict",
  "message": "Integration conflict: Cloudinary for event settings_123...",
  "integrationType": "Cloudinary",
  "eventSettingsId": "settings_123",
  "expectedVersion": 5,
  "actualVersion": 6,
  "resolution": "Please refresh the page and try again..."
}
```

**HTTP Status**: 409 Conflict

#### Server Error

```json
{
  "error": "Failed to update event settings",
  "message": "Transaction execution failed",
  "details": "All changes have been rolled back"
}
```

**HTTP Status**: 500 Internal Server Error

### Error Logging Best Practices

1. **Include Context**: Always log relevant IDs and state
2. **Structured Logging**: Use objects for better searchability
3. **Error Classification**: Distinguish between expected and unexpected errors
4. **Stack Traces**: Include for unexpected errors
5. **Timestamps**: Always include for debugging
6. **User Impact**: Note whether user is affected

```typescript
console.error('Failed to fetch Cloudinary integration:', {
  integration: 'Cloudinary',
  error: error,
  message: error instanceof Error ? error.message : 'Unknown error',
  stack: error instanceof Error ? error.stack : undefined,
  eventSettingsId: eventSettings.$id,
  collectionId: cloudinaryCollectionId,
  timestamp: new Date().toISOString(),
  userImpact: 'Cloudinary settings will show as disabled'
});
```


## Complete Data Flow Example

### Scenario: User Updates Cloudinary Settings

Let's trace a complete update flow from UI to database:

#### Step 1: User Input

User enables Cloudinary and sets cloud name in the UI:

```typescript
// User changes in EventSettingsForm
formData.cloudinaryEnabled = true;
formData.cloudinaryCloudName = "my-event-photos";
formData.cloudinaryUploadPreset = "event_uploads";
```

#### Step 2: Form Submission

Form is submitted with all data:

```typescript
// POST /api/event-settings
{
  "eventName": "Tech Conference 2025",
  "eventDate": "2025-06-15",
  "cloudinaryEnabled": true,
  "cloudinaryCloudName": "my-event-photos",
  "cloudinaryUploadPreset": "event_uploads",
  "cloudinaryAutoOptimize": true,
  "switchboardEnabled": false,
  "oneSimpleApiEnabled": false,
  "customFields": [...]
}
```

#### Step 3: API Handler Processing

```typescript
// 1. Extract integration fields
const integrationFields = extractIntegrationFields(updateData);
// Result:
// {
//   cloudinary: {
//     enabled: true,
//     cloudName: "my-event-photos",
//     uploadPreset: "event_uploads",
//     autoOptimize: true
//   },
//   switchboard: { enabled: false },
//   oneSimpleApi: { enabled: false }
// }

// 2. Build transaction operations for core settings
const operations = [
  { action: 'update', tableId: 'event_settings', data: { eventName: "Tech Conference 2025", ... } },
  { action: 'create', tableId: 'logs', data: { action: 'update', ... } }
];

// 3. Execute transaction
await executeTransactionWithRetry(tablesDB, operations);
// ✅ Core settings updated atomically

// 4. Update integrations in parallel
await Promise.all([
  updateCloudinaryIntegration(databases, eventSettingsId, integrationFields.cloudinary),
  // Switchboard and OneSimpleAPI skipped (no changes)
]);
// ✅ Cloudinary integration updated with optimistic locking
```

#### Step 4: Cloudinary Integration Update

```typescript
// Inside updateCloudinaryIntegration()

// 1. Fetch existing integration
const existing = await getCloudinaryIntegration(databases, eventSettingsId);

if (existing) {
  // 2. Check version (optimistic locking)
  const currentVersion = existing.version || 0;
  
  // 3. Update with incremented version
  const updated = await databases.updateDocument(
    DATABASE_ID,
    CLOUDINARY_COLLECTION_ID,
    existing.$id,
    {
      enabled: true,
      cloudName: "my-event-photos",
      uploadPreset: "event_uploads",
      autoOptimize: true,
      version: currentVersion + 1  // Increment version
    }
  );
  // ✅ Cloudinary integration updated
} else {
  // Create new integration if doesn't exist
  const created = await databases.createDocument(
    DATABASE_ID,
    CLOUDINARY_COLLECTION_ID,
    'unique()',
    {
      eventSettingsId,
      version: 1,
      enabled: true,
      cloudName: "my-event-photos",
      uploadPreset: "event_uploads",
      autoOptimize: true
    }
  );
  // ✅ Cloudinary integration created
}
```

#### Step 5: Cache Invalidation

```typescript
// Invalidate cache after successful updates
eventSettingsCache.invalidate('event-settings');
// ✅ Cache cleared - next GET will fetch fresh data
```

#### Step 6: Fetch Updated Data

```typescript
// 1. Fetch updated event settings
const updatedEventSettings = await databases.getDocument(
  dbId,
  eventSettingsCollectionId,
  currentSettings.$id
);

// 2. Fetch updated integrations in parallel
const [cloudinaryResult, switchboardResult, oneSimpleApiResult] = 
  await Promise.allSettled([
    databases.listDocuments(dbId, cloudinaryCollectionId, [Query.equal('eventSettingsId', id)]),
    databases.listDocuments(dbId, switchboardCollectionId, [Query.equal('eventSettingsId', id)]),
    databases.listDocuments(dbId, oneSimpleApiCollectionId, [Query.equal('eventSettingsId', id)])
  ]);

// 3. Extract integration data
const cloudinaryData = isFulfilled(cloudinaryResult) 
  ? cloudinaryResult.value.documents[0] 
  : null;
// ✅ Fresh Cloudinary data retrieved
```

#### Step 7: Data Transformation

```typescript
// 1. Combine event settings with integrations
const eventSettingsWithIntegrations = {
  ...updatedEventSettings,
  cloudinary: cloudinaryData,
  switchboard: switchboardData,
  oneSimpleApi: oneSimpleApiData
};

// 2. Flatten for backward compatibility
const flattenedSettings = flattenEventSettings(eventSettingsWithIntegrations);
// Result:
// {
//   id: "settings_123",
//   eventName: "Tech Conference 2025",
//   cloudinaryEnabled: true,
//   cloudinaryCloudName: "my-event-photos",
//   cloudinaryUploadPreset: "event_uploads",
//   cloudinaryAutoOptimize: true,
//   ...
// }

// 3. Add custom fields
const response = {
  ...flattenedSettings,
  customFields: parsedCustomFields
};
```

#### Step 8: Response to Client

```typescript
// Send response with headers
res.setHeader('X-Transaction-Used', 'true');
res.setHeader('X-Query-Time-eventSettings', '45ms');
res.setHeader('X-Query-Time-parallelIntegrations', '120ms');
res.status(200).json(response);
// ✅ Client receives updated settings
```

#### Step 9: UI Update

```typescript
// In EventSettingsForm
onSave(response);
// ✅ Form state updated with new values
// ✅ User sees success message
// ✅ Cloudinary integration now active
```

### Timeline

```
0ms    - User clicks Save
10ms   - POST request sent
50ms   - API handler starts processing
100ms  - Transaction executed (core settings + audit log)
150ms  - Cloudinary integration updated
160ms  - Cache invalidated
200ms  - Fresh data fetched (parallel queries)
250ms  - Data flattened and response prepared
260ms  - Response sent to client
270ms  - UI updated
```

**Total Time**: ~270ms from click to UI update


## Debugging Tips

### 1. Trace Request Flow

Use the performance headers to identify bottlenecks:

```bash
# Make a request and inspect headers
curl -i http://localhost:3000/api/event-settings

# Look for these headers:
X-Cache: MISS
X-Query-Time-eventSettings: 45ms
X-Query-Time-parallelIntegrations: 120ms
X-Total-Query-Time: 165ms
```

**Interpretation:**
- High `X-Query-Time-parallelIntegrations`: Integration queries are slow
- `X-Cache: MISS`: Cache not being used effectively
- High `X-Total-Query-Time`: Overall database performance issue

### 2. Check Integration Status

Verify which integrations are being fetched:

```typescript
// In browser console after GET request
const response = await fetch('/api/event-settings');
const data = await response.json();

console.log('Cloudinary:', data.cloudinaryEnabled ? 'Enabled' : 'Disabled');
console.log('Switchboard:', data.switchboardEnabled ? 'Enabled' : 'Disabled');
console.log('OneSimpleAPI:', data.oneSimpleApiEnabled ? 'Enabled' : 'Disabled');
```

### 3. Monitor Cache Effectiveness

Check cache statistics:

```typescript
// In API handler or debug endpoint
const stats = eventSettingsCache.getStats();
console.log('Cache stats:', stats);
// {
//   size: 1,
//   maxSize: 1000,
//   utilizationPercent: 0,
//   expiredCount: 0
// }
```

**What to look for:**
- `size` growing: Cache is being used
- `expiredCount` high: TTL might be too short
- `utilizationPercent` near 100: Consider increasing MAX_ENTRIES

### 4. Verify Integration Updates

Check if integration updates are being applied:

```typescript
// After PUT request, check response
const response = await fetch('/api/event-settings', {
  method: 'PUT',
  body: JSON.stringify({ cloudinaryEnabled: true, ... })
});

const data = await response.json();

// Check for warnings
if (data.warnings) {
  console.error('Integration warnings:', data.warnings);
}

// Verify integration was updated
console.log('Cloudinary enabled:', data.cloudinaryEnabled);
```

### 5. Inspect Transaction Operations

Add logging to see what operations are being executed:

```typescript
// In buildEventSettingsTransactionOperations()
console.log(`[Transaction] Building ${operations.length} operations:`, 
  operations.map(op => `${op.action} ${op.tableId}`)
);
```

### 6. Check Optimistic Locking

Verify version numbers are being tracked:

```typescript
// In updateCloudinaryIntegration()
console.log('Cloudinary version check:', {
  expectedVersion,
  currentVersion: existing.version,
  willConflict: expectedVersion !== undefined && existing.version !== expectedVersion
});
```

### 7. Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Stale data | UI shows old values | Check cache invalidation |
| Slow responses | High response times | Enable caching, optimize queries |
| Integration conflicts | 409 errors | Implement retry logic in UI |
| Missing integrations | Null integration data | Check Promise.allSettled error handling |
| Partial updates | Some fields not saving | Verify extractIntegrationFields() |
| Cache not working | Always X-Cache: MISS | Check cache TTL and invalidation |

### 8. Logging Best Practices

Add structured logging for debugging:

```typescript
console.log('[Event Settings] Processing update:', {
  eventSettingsId: currentSettings.$id,
  hasCloudinaryChanges: Object.keys(integrationFields.cloudinary).length > 0,
  hasSwitchboardChanges: Object.keys(integrationFields.switchboard).length > 0,
  hasOneSimpleApiChanges: Object.keys(integrationFields.oneSimpleApi).length > 0,
  customFieldsCount: customFields?.length || 0,
  timestamp: new Date().toISOString()
});
```

### 9. Network Debugging

Use browser DevTools to inspect requests:

```javascript
// In Network tab, filter by "event-settings"
// Check:
// - Request payload (what's being sent)
// - Response body (what's being returned)
// - Response headers (cache status, performance metrics)
// - Timing (how long each phase takes)
```

### 10. Database Debugging

Query Appwrite directly to verify data:

```bash
# Check event settings
curl -X GET \
  'https://[APPWRITE_ENDPOINT]/v1/databases/[DB_ID]/collections/[COLLECTION_ID]/documents' \
  -H 'X-Appwrite-Project: [PROJECT_ID]' \
  -H 'X-Appwrite-Key: [API_KEY]'

# Check Cloudinary integration
curl -X GET \
  'https://[APPWRITE_ENDPOINT]/v1/databases/[DB_ID]/collections/[CLOUDINARY_COLLECTION_ID]/documents' \
  -H 'X-Appwrite-Project: [PROJECT_ID]' \
  -H 'X-Appwrite-Key: [API_KEY]'
```

---

## Summary

The integration data flow in credential.studio is designed for:

- **Performance**: Parallel fetching, caching, and optimized queries
- **Reliability**: Graceful error handling and partial failure tolerance
- **Consistency**: Transactions for core settings, optimistic locking for integrations
- **Security**: API credentials never stored in database or sent to client
- **Maintainability**: Clear separation of concerns and well-defined data transformations

By understanding this flow, you can:
- Debug integration issues effectively
- Optimize performance bottlenecks
- Extend the system with new integrations
- Maintain data consistency and integrity
- Provide a better user experience

For more information, see:
- [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md)
- [Integration Patterns Reference](./INTEGRATION_PATTERNS_REFERENCE.md)
- [Integration Troubleshooting Guide](./INTEGRATION_TROUBLESHOOTING_GUIDE.md)


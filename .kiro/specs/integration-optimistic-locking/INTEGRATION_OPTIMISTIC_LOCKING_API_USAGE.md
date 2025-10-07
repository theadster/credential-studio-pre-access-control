# Integration Fields Mapping & Optimistic Locking - API Usage Guide

## Overview

The event settings API provides complete field mapping for all three integration types (Cloudinary, Switchboard Canvas, OneSimpleAPI) with optimistic locking support to prevent race conditions. This guide explains the complete field mapping, how to use the API correctly, and how to handle errors.

## Complete Field Mapping

### Cloudinary Integration (9 Fields)

All Cloudinary integration fields are properly mapped between the flattened API format and the normalized collection:

| Flattened Field Name | Collection Field | Type | Default | Description |
|---------------------|------------------|------|---------|-------------|
| `cloudinaryEnabled` | `enabled` | boolean | `false` | Enable/disable Cloudinary integration |
| `cloudinaryCloudName` | `cloudName` | string | `''` | Cloudinary cloud name |
| `cloudinaryApiKey` | `apiKey` | string | `''` | Cloudinary API key |
| `cloudinaryApiSecret` | `apiSecret` | string | `''` | Cloudinary API secret |
| `cloudinaryUploadPreset` | `uploadPreset` | string | `''` | Upload preset name |
| `cloudinaryAutoOptimize` | `autoOptimize` | boolean | `false` | Auto-optimize uploaded images |
| `cloudinaryGenerateThumbnails` | `generateThumbnails` | boolean | `false` | Generate thumbnails automatically |
| `cloudinaryDisableSkipCrop` | `disableSkipCrop` | boolean | `false` | Disable the skip crop button |
| `cloudinaryCropAspectRatio` | `cropAspectRatio` | string | `'1'` | Crop aspect ratio (e.g., '1', '16:9') |

### Switchboard Canvas Integration (7 Fields)

All Switchboard integration fields are properly mapped:

| Flattened Field Name | Collection Field | Type | Default | Description |
|---------------------|------------------|------|---------|-------------|
| `switchboardEnabled` | `enabled` | boolean | `false` | Enable/disable Switchboard integration |
| `switchboardApiEndpoint` | `apiEndpoint` | string | `''` | Switchboard API endpoint URL |
| `switchboardAuthHeaderType` | `authHeaderType` | string | `''` | Authentication header type |
| `switchboardApiKey` | `apiKey` | string | `''` | Switchboard API key |
| `switchboardRequestBody` | `requestBody` | string | `''` | Request body template |
| `switchboardTemplateId` | `templateId` | string | `''` | Template ID for credential printing |
| `switchboardFieldMappings` | `fieldMappings` | array/string | `[]` | Field mappings (stored as JSON string) |

**Note**: `switchboardFieldMappings` is stored as a JSON string in the collection but automatically parsed to an array in GET responses and serialized from array/object in PUT requests.

### OneSimpleAPI Integration (5 Fields)

All OneSimpleAPI integration fields are properly mapped:

| Flattened Field Name | Collection Field | Type | Default | Description |
|---------------------|------------------|------|---------|-------------|
| `oneSimpleApiEnabled` | `enabled` | boolean | `false` | Enable/disable OneSimpleAPI integration |
| `oneSimpleApiUrl` | `url` | string | `''` | API endpoint URL |
| `oneSimpleApiFormDataKey` | `formDataKey` | string | `''` | Form data key for API requests |
| `oneSimpleApiFormDataValue` | `formDataValue` | string | `''` | Form data value for API requests |
| `oneSimpleApiRecordTemplate` | `recordTemplate` | string | `''` | Record template for data formatting |

## API Usage

### GET /api/event-settings

Fetches event settings with all integration fields properly mapped to the flattened format.

**Response Example**:
```json
{
  "$id": "event-123",
  "eventName": "My Event",
  "eventDate": "2025-10-15",
  
  // Cloudinary fields (all 9 fields)
  "cloudinaryEnabled": true,
  "cloudinaryCloudName": "my-cloud",
  "cloudinaryApiKey": "abc123",
  "cloudinaryApiSecret": "secret123",
  "cloudinaryUploadPreset": "event-photos",
  "cloudinaryAutoOptimize": true,
  "cloudinaryGenerateThumbnails": true,
  "cloudinaryDisableSkipCrop": false,
  "cloudinaryCropAspectRatio": "16:9",
  
  // Switchboard fields (all 7 fields)
  "switchboardEnabled": true,
  "switchboardApiEndpoint": "https://api.switchboard.com",
  "switchboardAuthHeaderType": "Bearer",
  "switchboardApiKey": "key123",
  "switchboardRequestBody": "{{template}}",
  "switchboardTemplateId": "template-456",
  "switchboardFieldMappings": [
    {"source": "firstName", "target": "first_name"}
  ],
  
  // OneSimpleAPI fields (all 5 fields)
  "oneSimpleApiEnabled": true,
  "oneSimpleApiUrl": "https://api.example.com/webhook",
  "oneSimpleApiFormDataKey": "event_data",
  "oneSimpleApiFormDataValue": "{{data}}",
  "oneSimpleApiRecordTemplate": "{{json}}",
  
  "customFields": [...]
}
```

### PUT /api/event-settings

Updates event settings including integration fields. The API automatically:
- Extracts integration-specific fields from the request
- Updates each integration in its respective collection
- Handles partial updates (only provided fields are updated)
- Validates and increments version numbers for optimistic locking
- Invalidates cache after successful updates

**Request Example (Partial Update)**:
```json
{
  "eventName": "Updated Event Name",
  
  // Update only some Cloudinary fields
  "cloudinaryAutoOptimize": true,
  "cloudinaryGenerateThumbnails": false,
  
  // Update Switchboard template
  "switchboardTemplateId": "new-template-789"
}
```

**Request Example (Complete Update with Version Check)**:
```json
{
  "eventName": "My Event",
  
  // Cloudinary with version check
  "cloudinaryEnabled": true,
  "cloudinaryCloudName": "my-cloud",
  "cloudinaryAutoOptimize": true,
  "cloudinaryExpectedVersion": 5,
  
  // Switchboard with version check
  "switchboardEnabled": true,
  "switchboardApiEndpoint": "https://api.switchboard.com",
  "switchboardExpectedVersion": 3,
  
  // OneSimpleAPI with version check
  "oneSimpleApiEnabled": true,
  "oneSimpleApiUrl": "https://api.example.com",
  "oneSimpleApiExpectedVersion": 2
}
```

## Error Handling

The API handles integration update errors gracefully with specific error types:

### 1. IntegrationConflictError (409 Conflict)

Thrown when optimistic locking detects a version mismatch, indicating concurrent modification.

**When it occurs**:
- Another request updated the integration between your GET and PUT requests
- The `expectedVersion` doesn't match the current version in the database

**Response Format**:
```json
{
  "error": "Conflict",
  "message": "Integration conflict: Cloudinary for event event-123. Expected version 1, but found version 2. The integration was modified by another request.",
  "integrationType": "Cloudinary",
  "eventSettingsId": "event-123",
  "expectedVersion": 1,
  "actualVersion": 2
}
```

**How to handle**:
1. Fetch the latest event settings (GET /api/event-settings)
2. Merge your changes with the latest data
3. Retry the update with the new version number

### 2. Partial Update Failures

Individual integration updates are wrapped in try-catch blocks. If one integration fails, others may still succeed.

**Behavior**:
- Errors are logged but don't fail the entire request
- The response includes successfully updated data
- Check server logs for specific integration errors

**Example scenario**:
```javascript
// Request updates all three integrations
PUT /api/event-settings
{
  "cloudinaryEnabled": true,
  "switchboardEnabled": true,
  "oneSimpleApiEnabled": true
}

// If Switchboard update fails:
// - Cloudinary update succeeds
// - OneSimpleAPI update succeeds
// - Error logged: "Failed to update Switchboard integration: [error details]"
// - Response returns with updated Cloudinary and OneSimpleAPI data
```

### 3. Validation Errors (400 Bad Request)

Thrown when request data is invalid or missing required fields.

**Common causes**:
- Invalid field types (e.g., string instead of boolean)
- Missing required authentication
- Malformed JSON in request body

### 4. Internal Server Errors (500)

Thrown for unexpected errors during processing.

**Response Format**:
```json
{
  "error": "Internal Server Error",
  "message": "Failed to update event settings"
}
```

## Best Practices

### 1. Always Fetch Before Update

To ensure you have the latest data and avoid conflicts:

```typescript
// ✅ Good: Fetch latest data first
const response = await fetch('/api/event-settings');
const settings = await response.json();

// Make your changes
const updatedSettings = {
  ...settings,
  cloudinaryAutoOptimize: true,
  cloudinaryGenerateThumbnails: false
};

// Update with current data
await fetch('/api/event-settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updatedSettings)
});
```

```typescript
// ❌ Bad: Update without fetching
await fetch('/api/event-settings', {
  method: 'PUT',
  body: JSON.stringify({
    cloudinaryAutoOptimize: true
    // Missing other fields - may overwrite with defaults
  })
});
```

### 2. Use Optimistic Locking for Critical Updates

For updates where data consistency is critical, include version checks:

```typescript
// Fetch current settings
const response = await fetch('/api/event-settings');
const settings = await response.json();

// Update with version check
const updateResponse = await fetch('/api/event-settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eventName: 'Updated Event',
    
    // Include version for optimistic locking
    cloudinaryEnabled: true,
    cloudinaryCloudName: 'my-cloud',
    cloudinaryExpectedVersion: settings.cloudinary?.version,
    
    switchboardEnabled: true,
    switchboardExpectedVersion: settings.switchboard?.version,
    
    oneSimpleApiEnabled: true,
    oneSimpleApiExpectedVersion: settings.oneSimpleApi?.version
  })
});

if (updateResponse.status === 409) {
  // Handle conflict
  const conflict = await updateResponse.json();
  console.error('Conflict detected:', conflict);
  
  // Retry with latest version or show error to user
}
```

### 3. Handle Partial Updates Correctly

You can update only specific fields without affecting others:

```typescript
// Update only Cloudinary auto-optimize setting
await fetch('/api/event-settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cloudinaryAutoOptimize: true
    // Other fields remain unchanged
  })
});
```

### 4. Handle Boolean Fields Explicitly

Boolean fields should be explicitly set to avoid confusion:

```typescript
// ✅ Good: Explicit boolean values
{
  cloudinaryAutoOptimize: true,
  cloudinaryGenerateThumbnails: false,
  cloudinaryDisableSkipCrop: false
}

// ❌ Bad: Relying on undefined/null
{
  cloudinaryAutoOptimize: true
  // Missing booleans may default to false
}
```

### 5. Handle Field Mappings Correctly

Switchboard field mappings can be sent as array or string:

```typescript
// ✅ Option 1: Send as array (automatically serialized)
{
  switchboardFieldMappings: [
    { source: 'firstName', target: 'first_name' },
    { source: 'lastName', target: 'last_name' }
  ]
}

// ✅ Option 2: Send as JSON string
{
  switchboardFieldMappings: JSON.stringify([
    { source: 'firstName', target: 'first_name' }
  ])
}

// ❌ Bad: Send as plain object
{
  switchboardFieldMappings: { source: 'firstName' }
  // Should be an array
}
```

## Advanced Usage Examples

### Retry Logic with Exponential Backoff

Handle conflicts automatically with retry logic:

```typescript
async function updateIntegrationWithRetry(
  data: any, 
  maxRetries = 3,
  baseDelay = 100
) {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      // Fetch latest version
      const settingsResponse = await fetch('/api/event-settings');
      if (!settingsResponse.ok) {
        throw new Error('Failed to fetch settings');
      }
      const settings = await settingsResponse.json();
      
      // Update with current version
      const updateResponse = await fetch('/api/event-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          cloudinaryExpectedVersion: settings.cloudinary?.version,
          switchboardExpectedVersion: settings.switchboard?.version,
          oneSimpleApiExpectedVersion: settings.oneSimpleApi?.version
        })
      });
      
      if (updateResponse.status === 409) {
        // Conflict - retry with exponential backoff
        retries++;
        const delay = baseDelay * Math.pow(2, retries);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      if (!updateResponse.ok) {
        const error = await updateResponse.json();
        throw new Error(error.message || 'Failed to update integration');
      }
      
      return await updateResponse.json();
    } catch (error) {
      if (retries >= maxRetries - 1) {
        throw error;
      }
      retries++;
      const delay = baseDelay * Math.pow(2, retries);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Max retries exceeded');
}

// Usage
try {
  const result = await updateIntegrationWithRetry({
    cloudinaryAutoOptimize: true,
    cloudinaryGenerateThumbnails: false
  });
  console.log('Update successful:', result);
} catch (error) {
  console.error('Update failed after retries:', error);
}
```

### Updating Multiple Integrations Atomically

Update all three integrations with version checks:

```typescript
async function updateAllIntegrations(
  cloudinaryData: any,
  switchboardData: any,
  oneSimpleApiData: any
) {
  // Fetch current settings
  const response = await fetch('/api/event-settings');
  const settings = await response.json();
  
  // Prepare update with all integrations
  const updateData = {
    // Cloudinary fields
    ...cloudinaryData,
    cloudinaryExpectedVersion: settings.cloudinary?.version,
    
    // Switchboard fields
    ...switchboardData,
    switchboardExpectedVersion: settings.switchboard?.version,
    
    // OneSimpleAPI fields
    ...oneSimpleApiData,
    oneSimpleApiExpectedVersion: settings.oneSimpleApi?.version
  };
  
  // Update all at once
  const updateResponse = await fetch('/api/event-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateData)
  });
  
  if (updateResponse.status === 409) {
    const conflict = await updateResponse.json();
    throw new Error(
      `Conflict in ${conflict.integrationType}: ` +
      `Expected version ${conflict.expectedVersion}, ` +
      `found ${conflict.actualVersion}`
    );
  }
  
  if (!updateResponse.ok) {
    throw new Error('Failed to update integrations');
  }
  
  return await updateResponse.json();
}
```

### Conditional Updates Based on Integration State

Update only if integration is enabled:

```typescript
async function updateCloudinaryIfEnabled(updates: any) {
  const response = await fetch('/api/event-settings');
  const settings = await response.json();
  
  if (!settings.cloudinaryEnabled) {
    console.log('Cloudinary is disabled, skipping update');
    return settings;
  }
  
  // Update only Cloudinary fields
  const updateResponse = await fetch('/api/event-settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...updates,
      cloudinaryExpectedVersion: settings.cloudinary?.version
    })
  });
  
  return await updateResponse.json();
}
```

## Common Pitfalls and Solutions

### Pitfall 1: Missing Fields in Updates

**Problem**: Sending incomplete data may not update all intended fields.

```typescript
// ❌ Problem: Only sending one field
await fetch('/api/event-settings', {
  method: 'PUT',
  body: JSON.stringify({
    cloudinaryAutoOptimize: true
    // Other Cloudinary fields not included
  })
});
```

**Solution**: Fetch current settings first, then merge your changes.

```typescript
// ✅ Solution: Merge with existing data
const current = await fetch('/api/event-settings').then(r => r.json());
await fetch('/api/event-settings', {
  method: 'PUT',
  body: JSON.stringify({
    ...current,
    cloudinaryAutoOptimize: true
  })
});
```

### Pitfall 2: Incorrect Field Names

**Problem**: Using wrong field names (especially for OneSimpleAPI).

```typescript
// ❌ Wrong: Old field names
{
  oneSimpleApiApiUrl: 'https://api.example.com',  // Wrong!
  oneSimpleApiApiKey: 'key123'                     // Wrong!
}

// ✅ Correct: Current field names
{
  oneSimpleApiUrl: 'https://api.example.com',
  oneSimpleApiFormDataKey: 'event_data',
  oneSimpleApiFormDataValue: 'value',
  oneSimpleApiRecordTemplate: '{{json}}'
}
```

### Pitfall 3: Not Handling 409 Conflicts

**Problem**: Ignoring conflict errors leads to lost updates.

```typescript
// ❌ Problem: Not checking response status
const response = await fetch('/api/event-settings', {
  method: 'PUT',
  body: JSON.stringify(data)
});
const result = await response.json(); // May contain error
```

**Solution**: Always check response status and handle conflicts.

```typescript
// ✅ Solution: Check status and handle conflicts
const response = await fetch('/api/event-settings', {
  method: 'PUT',
  body: JSON.stringify(data)
});

if (response.status === 409) {
  // Handle conflict - retry or show error
  const conflict = await response.json();
  console.error('Conflict:', conflict);
  // Implement retry logic or user notification
} else if (!response.ok) {
  throw new Error('Update failed');
}

const result = await response.json();
```

### Pitfall 4: Switchboard Field Mappings Format

**Problem**: Sending field mappings in wrong format.

```typescript
// ❌ Wrong: Empty string instead of empty array
{
  switchboardFieldMappings: ''
}

// ✅ Correct: Empty array or valid JSON
{
  switchboardFieldMappings: []
}

// ✅ Also correct: Valid array with mappings
{
  switchboardFieldMappings: [
    { source: 'firstName', target: 'first_name' }
  ]
}
```

## Backward Compatibility

### Optional Version Checking

The `expectedVersion` parameter is optional. If not provided, updates proceed without version checking, maintaining backward compatibility.

```typescript
// Without version checking (backward compatible)
await fetch('/api/event-settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    cloudinaryEnabled: true,
    cloudinaryCloudName: 'my-cloud'
    // No expectedVersion - update proceeds without version check
  })
});
```

### Default Values

When integration documents don't exist or fields are missing, the API returns sensible defaults:

- Booleans: `false`
- Strings: `''` (empty string)
- Arrays: `[]` (empty array)
- Crop aspect ratio: `'1'`

This ensures the frontend always receives valid data even for new or incomplete integrations.

## Integration Collections Architecture

### Normalized Data Model

Integration data is stored in separate Appwrite collections for better data organization and scalability:

```
event_settings (main collection)
├── cloudinary_integration (1:1 relationship)
├── switchboard_integration (1:1 relationship)
└── onesimpleapi_integration (1:1 relationship)
```

Each integration collection includes:
- `$id`: Unique document ID
- `eventSettingsId`: Foreign key to event_settings
- `version`: Version number for optimistic locking
- Integration-specific fields

### Flattened API Response

The API automatically flattens the normalized structure into a single object for backward compatibility:

```typescript
// Database structure (normalized)
{
  eventSettings: { $id: '123', eventName: 'My Event' },
  cloudinary: { $id: 'c1', eventSettingsId: '123', enabled: true, ... },
  switchboard: { $id: 's1', eventSettingsId: '123', enabled: true, ... }
}

// API response (flattened)
{
  $id: '123',
  eventName: 'My Event',
  cloudinaryEnabled: true,
  cloudinaryCloudName: '...',
  switchboardEnabled: true,
  switchboardApiEndpoint: '...'
}
```

### Version Management

Each integration maintains its own version number:
- Starts at 1 when created
- Increments by 1 on each update
- Used for optimistic locking to prevent conflicts
- Independent versioning per integration type

## Testing Guide

### Manual Testing

#### Test 1: Complete Field Mapping

Verify all fields are properly mapped:

1. Open event settings in the UI
2. Enable Cloudinary integration
3. Set all Cloudinary fields:
   - Cloud name, API key, API secret, upload preset
   - Toggle auto-optimize, generate thumbnails, disable skip crop
   - Set crop aspect ratio
4. Save settings
5. Reload page
6. Verify all fields persist correctly

Repeat for Switchboard and OneSimpleAPI integrations.

#### Test 2: Partial Updates

Verify partial updates work correctly:

1. Fetch current settings via API
2. Update only one field (e.g., `cloudinaryAutoOptimize: true`)
3. Verify other fields remain unchanged
4. Check that only the updated field changed

#### Test 3: Optimistic Locking Conflicts

Test conflict detection:

1. Open two browser tabs with the same event settings form
2. In Tab 1: Change `cloudinaryAutoOptimize` to `true`
3. In Tab 2: Change `cloudinaryGenerateThumbnails` to `true`
4. Save Tab 1 (should succeed)
5. Save Tab 2 (should receive 409 Conflict)
6. Verify error message includes:
   - Integration type (Cloudinary)
   - Expected version
   - Actual version
   - Event settings ID

#### Test 4: Missing Integration Data

Test default values:

1. Create new event settings (no integrations exist)
2. Fetch via GET endpoint
3. Verify all integration fields have default values:
   - Booleans: `false`
   - Strings: `''`
   - Arrays: `[]`
4. Update integration fields
5. Verify new integration documents are created

### Automated Testing

Integration tests are available in:
- `src/pages/api/event-settings/__tests__/complete-field-mapping.test.ts`
- `src/pages/api/event-settings/__tests__/partial-integration-updates.test.ts`
- `src/pages/api/event-settings/__tests__/optimistic-locking-conflict.test.ts`
- `src/pages/api/event-settings/__tests__/integration-error-handling.test.ts`

Run tests:
```bash
npm test -- event-settings
```

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **4.1**: Throws specific IntegrationConflictError type
- **4.2**: Error includes expected and actual version
- **4.3**: Error includes integration type and eventSettingsId
- **4.4**: Calling code can distinguish conflicts from other errors

## Related Files

- `src/lib/appwrite-integrations.ts` - Integration helper functions with optimistic locking
- `src/pages/api/event-settings/index.ts` - API route with error handling
- `.kiro/specs/integration-optimistic-locking/` - Full specification and design documents

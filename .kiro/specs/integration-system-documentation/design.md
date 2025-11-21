# Design Document

## Overview

This design document outlines the comprehensive documentation system for credential.studio's integration architecture. The integration system follows a normalized database pattern with separate collections for each integration type, optimistic locking for concurrency control, and a clean separation between database-stored configuration and environment variable secrets.

The documentation will be delivered as a series of markdown guides stored in the `docs/guides/` directory, following the project's documentation organization standards. These guides will serve as the authoritative reference for developers working with integrations.

## Architecture

### Current Integration System Architecture

The integration system uses a **normalized database approach** with the following key characteristics:

1. **Separate Collections**: Each integration type has its own Appwrite collection (e.g., `cloudinary`, `switchboard`, `onesimpleapi`)
2. **Event Settings Link**: All integrations link to the main `event_settings` collection via `eventSettingsId`
3. **Optimistic Locking**: Each integration document includes a `version` field for concurrency control
4. **Security-First**: API credentials are stored in environment variables, never in the database
5. **Flattened View**: A helper function (`flattenEventSettings`) provides backward compatibility by denormalizing integration data

### Integration Data Flow

```
User Input (UI) 
  → EventSettingsForm Component
    → Event Settings API Handler (/api/event-settings)
      → extractIntegrationFields() - Separates integration data
        → updateXIntegration() - Updates specific integration collection
          → updateIntegrationWithLocking() - Handles optimistic locking
            → Appwrite Database (separate collections)
```

### Database Schema Pattern

Each integration collection follows this pattern:

```typescript
interface IntegrationCollection {
  $id: string;                    // Appwrite document ID
  eventSettingsId: string;        // Foreign key to event_settings
  version: number;                // Optimistic locking version
  enabled: boolean;               // Integration enable/disable toggle
  // ... integration-specific fields
}
```

## Components and Interfaces

### 1. Documentation Structure

The documentation will be organized into the following guides:

#### Primary Guides

1. **`INTEGRATION_ARCHITECTURE_GUIDE.md`**
   - Complete overview of the integration system
   - Database schema patterns
   - Data flow diagrams
   - File organization and responsibilities

2. **`ADDING_NEW_INTEGRATION_GUIDE.md`**
   - Step-by-step procedure for adding integrations
   - Checklist format with verification steps
   - Code templates and examples
   - Common pitfalls and troubleshooting

3. **`PHOTO_SERVICE_INTEGRATION_GUIDE.md`**
   - Specific guidance for photo upload services
   - Replacing Cloudinary walkthrough
   - Photo URL handling patterns
   - Testing checklist for photo integrations

4. **`INTEGRATION_SECURITY_GUIDE.md`**
   - Security best practices
   - Environment variable management
   - API credential handling
   - Security audit checklist

#### Supporting Documentation

5. **`INTEGRATION_PATTERNS_REFERENCE.md`**
   - Code templates for common patterns
   - TypeScript interfaces
   - API function templates
   - UI component templates

6. **`INTEGRATION_TROUBLESHOOTING_GUIDE.md`**
   - Common issues and solutions
   - Debugging techniques
   - Error message reference
   - Performance optimization tips

### 2. Code Templates

The documentation will include reusable code templates for:

#### Integration Interface Template

```typescript
export interface XIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  // Integration-specific fields
  field1: string;
  field2: boolean;
  // ... more fields
}
```

#### Getter Function Template

```typescript
export async function getXIntegration(
  databases: Databases,
  eventSettingsId: string
): Promise<XIntegration | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      X_COLLECTION_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );
    return response.documents.length > 0 ? (response.documents[0] as any) : null;
  } catch (error: any) {
    if (error.code === 404 || error.code === 'document_not_found' || error.code === 'collection_not_found') {
      return null;
    }
    console.error('Error fetching X integration:', error);
    throw error;
  }
}
```

#### Update Function Template

```typescript
export async function updateXIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<XIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<XIntegration> {
  return updateIntegrationWithLocking<XIntegration>(
    databases,
    X_COLLECTION_ID,
    'X',
    eventSettingsId,
    data,
    expectedVersion,
    () => getXIntegration(databases, eventSettingsId)
  );
}
```

#### UI Tab Component Template

```typescript
export const XTab = memo(function XTab({
  formData,
  onInputChange,
  integrationStatus
}: XTabProps) {
  const isReady = !!(formData.xField1 && formData.xField2 && integrationStatus?.x);
  const statusMessage = getStatusMessage(formData, integrationStatus);

  return (
    <div className="space-y-6">
      <IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />
      
      {/* Configuration sections */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Configuration</h4>
        </div>
        {/* Form fields */}
      </div>
    </div>
  );
});
```

### 3. Step-by-Step Procedures

#### Adding a New Integration (High-Level Steps)

1. **Database Setup**
   - Create Appwrite collection
   - Define attributes and indexes
   - Set up permissions

2. **Backend Implementation**
   - Add interface to `appwrite-integrations.ts`
   - Implement getter function
   - Implement update function with optimistic locking
   - Add to `flattenEventSettings` helper

3. **API Integration**
   - Update `extractIntegrationFields` in event-settings API
   - Add integration update call
   - Handle errors and conflicts

4. **Frontend Implementation**
   - Create integration tab component
   - Add to IntegrationsTab
   - Implement form state management
   - Add to EventSettings type

5. **Environment Configuration**
   - Add environment variables
   - Document in .env.example
   - Update setup documentation

6. **Testing & Verification**
   - Test create/update/delete operations
   - Verify optimistic locking
   - Test error handling
   - Validate security (no credentials in database)

## Data Models

### Integration Collection Schema

Each integration collection includes these standard fields:

```typescript
{
  $id: string;              // Auto-generated by Appwrite
  eventSettingsId: string;  // Required, indexed
  version: number;          // Required, default: 1
  enabled: boolean;         // Required, default: false
  // ... integration-specific fields
  $createdAt: string;       // Auto-generated by Appwrite
  $updatedAt: string;       // Auto-generated by Appwrite
}
```

### Example: Cloudinary Integration

```typescript
interface CloudinaryIntegration {
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
}
```

**Security Note**: API credentials (apiKey, apiSecret) are NOT stored in the database. They are read from environment variables at runtime.

### Example: Switchboard Integration

```typescript
interface SwitchboardIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  apiEndpoint: string;
  authHeaderType: string;
  requestBody: string;        // JSON template with placeholders
  templateId: string;
  fieldMappings: string;      // JSON string of field mappings
}
```

**Security Note**: API key is NOT stored in the database. It is read from the SWITCHBOARD_API_KEY environment variable.

### Example: OneSimpleAPI Integration

```typescript
interface OneSimpleApiIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  url: string;
  formDataKey: string;
  formDataValue: string;      // Template with placeholders
  recordTemplate: string;     // Template with placeholders
}
```

### EventSettings Type (Frontend)

The frontend uses a flattened type that includes all integration fields:

```typescript
interface EventSettings {
  // Core fields
  id?: string;
  eventName: string;
  eventDate: string;
  // ... other core fields
  
  // Cloudinary fields (prefixed)
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  // ... other cloudinary fields
  
  // Switchboard fields (prefixed)
  switchboardEnabled?: boolean;
  switchboardApiEndpoint?: string;
  // ... other switchboard fields
  
  // OneSimpleAPI fields (prefixed)
  oneSimpleApiEnabled?: boolean;
  oneSimpleApiUrl?: string;
  // ... other onesimpleapi fields
}
```

## Error Handling

### Optimistic Locking Conflicts

When concurrent updates occur, the system uses optimistic locking to prevent conflicts:

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
      `Expected version ${expectedVersion}, but found version ${actualVersion}.`
    );
    this.name = 'IntegrationConflictError';
  }
}
```

**Handling Strategy**:
1. Detect version mismatch during update
2. Throw `IntegrationConflictError`
3. API returns 409 Conflict status
4. Frontend displays error message
5. User refreshes and retries

### Concurrent Create Conflicts

When multiple requests try to create the same integration simultaneously:

```typescript
// Retry mechanism with exponential backoff
const maxRetries = 3;
for (let attempt = 0; attempt < maxRetries; attempt++) {
  try {
    // Re-fetch to get the latest version
    const existing = await getExisting();
    if (!existing) throw createError;
    
    // Attempt update with latest version
    return await databases.updateDocument(/* ... */);
  } catch (updateError) {
    if (attempt < maxRetries - 1) {
      // Exponential backoff: 50ms, 100ms, 200ms
      await new Promise(resolve => setTimeout(resolve, 50 * Math.pow(2, attempt)));
      continue;
    }
    throw updateError;
  }
}
```

### Integration Fetch Failures

When fetching integrations fails (network, permissions, etc.):

```typescript
// Use Promise.allSettled to handle partial failures
const [cloudinaryResult, switchboardResult, oneSimpleApiResult] = 
  await Promise.allSettled([
    getCloudinaryIntegration(databases, eventSettingsId),
    getSwitchboardIntegration(databases, eventSettingsId),
    getOneSimpleApiIntegration(databases, eventSettingsId),
  ]);

// Extract successful results, set null for failures
const cloudinaryData = isFulfilled(cloudinaryResult) 
  ? cloudinaryResult.value 
  : null;
```

**Benefits**:
- Partial failures don't block the entire response
- Failed integrations return null
- Errors are logged for debugging
- User can still access working integrations

### Validation Errors

Integration-specific validation (e.g., JSON syntax in Switchboard request body):

```typescript
export async function updateSwitchboardIntegration(/* ... */) {
  // Validate requestBody JSON if provided
  if (data.requestBody !== undefined && data.requestBody !== null && data.requestBody !== '') {
    try {
      JSON.parse(data.requestBody);
    } catch (error) {
      throw new Error(
        `Invalid JSON in Switchboard requestBody template. ${error.message}. ` +
        `Please ensure the template is valid JSON before saving.`
      );
    }
  }
  // ... continue with update
}
```

## Testing Strategy

### Unit Testing

Test individual integration functions:

```typescript
describe('getCloudinaryIntegration', () => {
  it('should return integration when it exists', async () => {
    // Test successful fetch
  });
  
  it('should return null when integration does not exist', async () => {
    // Test 404 handling
  });
  
  it('should throw error for network failures', async () => {
    // Test error propagation
  });
});

describe('updateCloudinaryIntegration', () => {
  it('should create new integration when none exists', async () => {
    // Test creation
  });
  
  it('should update existing integration', async () => {
    // Test update
  });
  
  it('should throw conflict error on version mismatch', async () => {
    // Test optimistic locking
  });
  
  it('should retry on concurrent create conflicts', async () => {
    // Test retry mechanism
  });
});
```

### Integration Testing

Test the complete flow from API to database:

```typescript
describe('POST /api/event-settings', () => {
  it('should update integration settings', async () => {
    // Test full update flow
  });
  
  it('should handle integration conflicts gracefully', async () => {
    // Test conflict resolution
  });
  
  it('should validate integration data', async () => {
    // Test validation errors
  });
});
```

### Manual Testing Checklist

For each new integration:

- [ ] Create integration with all fields
- [ ] Update integration fields
- [ ] Toggle enabled/disabled
- [ ] Test with missing environment variables
- [ ] Test concurrent updates (optimistic locking)
- [ ] Test with invalid data (validation)
- [ ] Verify no credentials in database
- [ ] Test integration deletion (if applicable)
- [ ] Test cache invalidation
- [ ] Test UI state management

### Security Testing

- [ ] Verify API credentials are in environment variables only
- [ ] Confirm credentials are never sent to client
- [ ] Check that database queries don't expose secrets
- [ ] Validate that logs don't contain sensitive data
- [ ] Test permission boundaries (who can update integrations)

## Documentation Deliverables

### File Structure

```
docs/guides/
├── INTEGRATION_ARCHITECTURE_GUIDE.md
├── ADDING_NEW_INTEGRATION_GUIDE.md
├── PHOTO_SERVICE_INTEGRATION_GUIDE.md
├── INTEGRATION_SECURITY_GUIDE.md
├── INTEGRATION_PATTERNS_REFERENCE.md
└── INTEGRATION_TROUBLESHOOTING_GUIDE.md
```

### Content Organization

Each guide will follow this structure:

1. **Introduction**
   - Purpose and scope
   - Prerequisites
   - Related guides

2. **Main Content**
   - Detailed explanations
   - Code examples
   - Diagrams (Mermaid)
   - Step-by-step procedures

3. **Examples**
   - Real-world scenarios
   - Complete code samples
   - Before/after comparisons

4. **Reference**
   - Quick reference tables
   - Checklists
   - Common patterns

5. **Troubleshooting**
   - Common issues
   - Solutions
   - Debugging tips

### Documentation Standards

- Use clear, concise language
- Include code examples for all concepts
- Provide visual diagrams where helpful
- Link between related guides
- Keep examples up-to-date with codebase
- Include security warnings where appropriate
- Use consistent formatting and terminology

### Maintenance Plan

- Review documentation quarterly
- Update when integration system changes
- Add new examples as patterns emerge
- Incorporate feedback from developers
- Keep troubleshooting section current

## Implementation Approach

### Phase 1: Core Architecture Documentation

1. Create `INTEGRATION_ARCHITECTURE_GUIDE.md`
   - Document current system architecture
   - Create data flow diagrams
   - Explain design decisions
   - List all involved files

2. Create `INTEGRATION_PATTERNS_REFERENCE.md`
   - Extract code templates from existing integrations
   - Document common patterns
   - Provide reusable snippets

### Phase 2: Procedural Guides

3. Create `ADDING_NEW_INTEGRATION_GUIDE.md`
   - Write step-by-step procedure
   - Create verification checklists
   - Include troubleshooting tips

4. Create `PHOTO_SERVICE_INTEGRATION_GUIDE.md`
   - Document photo service patterns
   - Provide Cloudinary replacement guide
   - Include testing procedures

### Phase 3: Security and Troubleshooting

5. Create `INTEGRATION_SECURITY_GUIDE.md`
   - Document security best practices
   - Explain credential management
   - Provide security audit checklist

6. Create `INTEGRATION_TROUBLESHOOTING_GUIDE.md`
   - Compile common issues
   - Document solutions
   - Add debugging techniques

### Phase 4: Review and Polish

7. Review all documentation for:
   - Accuracy
   - Completeness
   - Clarity
   - Consistency

8. Update `docs/README.md` with links to new guides

9. Create example integration (optional)
   - Implement a simple example integration
   - Use it to validate documentation
   - Include as reference implementation

## Success Criteria

The documentation will be considered successful when:

1. **Completeness**: All aspects of the integration system are documented
2. **Clarity**: Developers can follow guides without confusion
3. **Accuracy**: Code examples work without modification
4. **Usability**: Time to add new integration reduced from 3-4 hours to 30-60 minutes
5. **Maintainability**: Documentation is easy to update as system evolves
6. **Discoverability**: Developers can quickly find relevant information

## Future Enhancements

Potential improvements to consider:

1. **Integration Generator CLI**
   - Command-line tool to scaffold new integrations
   - Generates boilerplate code from templates
   - Reduces manual work and errors

2. **Integration Testing Framework**
   - Automated tests for integration patterns
   - Mock integration services for testing
   - CI/CD integration

3. **Integration Marketplace**
   - Pre-built integration templates
   - Community-contributed integrations
   - One-click installation

4. **Visual Integration Builder**
   - UI for creating integrations
   - Drag-and-drop field mapping
   - Visual template editor

5. **Integration Monitoring**
   - Dashboard for integration health
   - Usage analytics
   - Error tracking and alerts

These enhancements are out of scope for this documentation project but should be considered for future development.

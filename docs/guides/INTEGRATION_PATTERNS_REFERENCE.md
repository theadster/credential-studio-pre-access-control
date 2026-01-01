---
title: "Integration Patterns Reference"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/integrations/"]
---

# Integration Patterns Reference

This document provides reusable code templates and patterns for implementing integrations in credential.studio. Use these templates as starting points when adding new integrations to the system.

## Table of Contents

1. [TypeScript Interface Template](#typescript-interface-template)
2. [Getter Function Pattern](#getter-function-pattern)
3. [Update Function Pattern](#update-function-pattern)
4. [UI Tab Component Template](#ui-tab-component-template)
5. [Database Collection Creation Pattern](#database-collection-creation-pattern)
6. [FlattenEventSettings Helper Pattern](#flatteneventtings-helper-pattern)
7. [ExtractIntegrationFields Pattern](#extractintegrationfields-pattern)

---

## TypeScript Interface Template

Every integration requires a TypeScript interface that defines its data structure. All integrations follow a standard pattern with required fields for linking and versioning.

### Standard Integration Interface

```typescript
export interface XIntegration {
  // Required Appwrite fields
  $id: string;                    // Appwrite document ID (auto-generated)
  eventSettingsId: string;        // Foreign key to event_settings collection
  version: number;                // Optimistic locking version (starts at 1)
  
  // Required integration control
  enabled: boolean;               // Enable/disable toggle for the integration
  
  // Integration-specific configuration fields
  field1: string;                 // Example: API endpoint, cloud name, etc.
  field2: boolean;                // Example: feature toggles
  field3: string;                 // Example: template strings, JSON configs
  // ... add more fields as needed
}
```

### Real-World Examples

#### Cloudinary Integration
```typescript
export interface CloudinaryIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  cloudName: string;
  // SECURITY: API credentials removed from database schema
  // Use CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET environment variables
  uploadPreset: string;
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}
```

#### Switchboard Integration
```typescript
export interface SwitchboardIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  apiEndpoint: string;
  authHeaderType: string;
  // SECURITY: API key removed from database schema
  // Use SWITCHBOARD_API_KEY environment variable
  requestBody: string;        // JSON template with placeholders
  templateId: string;
  fieldMappings: string;      // JSON string of field mappings
}
```

#### OneSimpleAPI Integration
```typescript
export interface OneSimpleApiIntegration {
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

### Key Points

- **Always include**: `$id`, `eventSettingsId`, `version`, `enabled`
- **Security**: Never store API keys or secrets in the database - use environment variables
- **Templates**: Store template strings as plain strings, not JSON objects
- **JSON fields**: Store complex data structures as JSON strings (e.g., `fieldMappings`)

---

## Getter Function Pattern

Getter functions fetch integration data from the database. They follow a consistent error handling pattern that distinguishes between "not found" (returns null) and actual errors (throws).

### Template

```typescript
/**
 * Get X integration for an event
 * 
 * @param databases - Appwrite Databases instance
 * @param eventSettingsId - The event settings ID to fetch integration for
 * @returns The integration document or null if not found
 * @throws Error for network, permission, or other non-404 errors
 */
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
    // Return null only for not-found errors (404 or collection doesn't exist)
    if (error.code === 404 || error.code === 'document_not_found' || error.code === 'collection_not_found') {
      return null;
    }

    // For all other errors (network, permission, etc.), log and re-throw
    console.error('Error fetching X integration:', error);
    throw error;
  }
}
```

### Real-World Example: Cloudinary

```typescript
export async function getCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string
): Promise<CloudinaryIntegration | null> {
  try {
    const response = await databases.listDocuments(
      DATABASE_ID,
      CLOUDINARY_COLLECTION_ID,
      [Query.equal('eventSettingsId', eventSettingsId), Query.limit(1)]
    );

    return response.documents.length > 0 ? (response.documents[0] as any) : null;
  } catch (error: any) {
    if (error.code === 404 || error.code === 'document_not_found' || error.code === 'collection_not_found') {
      return null;
    }

    console.error('Error fetching Cloudinary integration:', error);
    throw error;
  }
}
```

### Key Points

- **Use `listDocuments` with `Query.limit(1)`** instead of `getDocument` to avoid errors when document doesn't exist
- **Return `null` for 404 errors** - this is expected when integration hasn't been configured yet
- **Throw for other errors** - network issues, permissions, etc. should propagate
- **Type cast response** - Appwrite returns generic documents, cast to your interface type

---

## Update Function Pattern

Update functions handle both creating new integrations and updating existing ones with optimistic locking for concurrency control.

### Template

```typescript
/**
 * Update X integration with optimistic locking
 * 
 * @param databases - Appwrite Databases instance
 * @param eventSettingsId - The event settings ID this integration belongs to
 * @param data - The data to create or update (partial, excluding system fields)
 * @param expectedVersion - Optional version for optimistic locking
 * @returns The created or updated integration document
 * @throws IntegrationConflictError when version mismatch is detected
 * @throws Error for validation failures or other errors
 */
export async function updateXIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<XIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<XIntegration> {
  // Optional: Add validation logic here
  // Example: Validate JSON templates, required fields, etc.
  if (data.someField !== undefined && data.someField !== null && data.someField !== '') {
    try {
      JSON.parse(data.someField);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(
        `Invalid JSON in X someField template. ${errorMessage}. ` +
        `Please ensure the template is valid JSON before saving.`
      );
    }
  }

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

### Real-World Example: Switchboard with Validation

```typescript
export async function updateSwitchboardIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<SwitchboardIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<SwitchboardIntegration> {
  // Validate requestBody JSON if provided
  if (data.requestBody !== undefined && data.requestBody !== null && data.requestBody !== '') {
    try {
      JSON.parse(data.requestBody);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown JSON parse error';
      throw new Error(
        `Invalid JSON in Switchboard requestBody template. ${errorMessage}. ` +
        `Please ensure the template is valid JSON before saving.`
      );
    }
  }

  return updateIntegrationWithLocking<SwitchboardIntegration>(
    databases,
    SWITCHBOARD_COLLECTION_ID,
    'Switchboard',
    eventSettingsId,
    data,
    expectedVersion,
    () => getSwitchboardIntegration(databases, eventSettingsId)
  );
}
```

### The Generic Helper: updateIntegrationWithLocking

This helper function is already implemented in `src/lib/appwrite-integrations.ts` and handles:
- Fetching existing integration
- Version checking for optimistic locking
- Creating new integration if none exists
- Updating existing integration with version increment
- Retry logic for concurrent create conflicts

**You don't need to implement this** - just call it from your update function.

### Key Points

- **Use `Partial<Omit<...>>` type** - Allows partial updates, excludes system fields
- **Add validation before calling helper** - Validate JSON, required fields, etc.
- **Pass getter function** - The helper needs to fetch existing integration
- **Handle `IntegrationConflictError`** - This is thrown when versions don't match

---

## UI Tab Component Template

UI tab components provide the user interface for configuring integrations. They follow a consistent pattern with status indicators, section grouping, and form controls.

### Template Structure

```typescript
import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { IntegrationStatusIndicator } from '@/components/IntegrationStatusIndicator';
import { EventSettings, IntegrationStatus } from './types';

interface XTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
  integrationStatus: IntegrationStatus | null;
}

function getStatusMessage(
  formData: EventSettings,
  integrationStatus: IntegrationStatus | null
): string {
  // Check if required fields are configured
  if (!formData.xField1 || !formData.xField2) {
    return "Waiting for required fields to be configured";
  }
  
  // Check if integration status is being loaded
  if (integrationStatus === null) {
    return "Checking API credentials...";
  }
  
  // Check if API credentials are configured
  return integrationStatus.x
    ? "Ready - configuration complete"
    : "⚠️ API credentials missing in environment variables (X_API_KEY)";
}

export const XTab = memo(function XTab({
  formData,
  onInputChange,
  integrationStatus
}: XTabProps) {
  // Determine if integration is ready
  const isReady = !!(
    formData.xField1 && 
    formData.xField2 && 
    integrationStatus?.x
  );
  
  const statusMessage = getStatusMessage(formData, integrationStatus);

  return (
    <div className="space-y-6">
      {/* Status Indicator */}
      <IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />

      {/* Configuration Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Configuration</h4>
        </div>

        {/* Text Input Example */}
        <div className="space-y-2">
          <Label htmlFor="xField1" className="text-sm font-medium">
            Field 1 Label
          </Label>
          <Input
            id="xField1"
            value={formData.xField1 || ""}
            onChange={(e) => onInputChange("xField1", e.target.value)}
            placeholder="Enter value..."
            className="h-10"
          />
          <p className="text-xs text-muted-foreground">
            Helper text explaining what this field does
          </p>
        </div>

        {/* Security Notice (if applicable) */}
        <div className="col-span-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                API Credentials Configured Securely
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                API credentials are configured via environment variables for security.
                Contact your system administrator to update credentials.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Settings</h4>
        </div>

        {/* Switch Example */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Feature Toggle</Label>
              <p className="text-xs text-muted-foreground">
                Description of what this toggle does
              </p>
            </div>
            <Switch
              checked={formData.xFeatureEnabled || false}
              onCheckedChange={(checked) => onInputChange("xFeatureEnabled", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
```

### Key Components

#### IntegrationStatusIndicator
Shows whether the integration is ready to use:
```typescript
<IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />
```

#### Section Headers with Icons
Group related settings:
```typescript
<div className="flex items-center gap-2">
  <Settings className="h-4 w-4" />
  <h4 className="text-sm font-semibold">Section Title</h4>
</div>
```

#### Form Controls
- **Text Input**: Use `Input` component with labels and helper text
- **Switch**: Use `Switch` component for boolean toggles
- **Select**: Use `Select` component for dropdown options

### Key Points

- **Use `memo`** - Prevents unnecessary re-renders
- **Status indicator first** - Always show integration status at the top
- **Group with sections** - Use Settings icon and headers to organize
- **Helper text** - Provide clear descriptions for all fields
- **Security notices** - Highlight when credentials are in environment variables
- **Responsive grid** - Use `grid-cols-1 md:grid-cols-2` for responsive layouts

---

## Database Collection Creation Pattern

When adding a new integration, you need to create a database collection in the setup script. Follow this pattern for consistency.

### Template

```typescript
async function createXIntegrationCollection(databaseId: string) {
  try {
    console.log('\nCreating x_integration collection...');
    
    // Create collection with permissions
    await databases.createCollection(
      databaseId,
      'x_integration',  // Collection ID (use snake_case)
      'X Integration',  // Display name (use Title Case)
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Create required attributes
    console.log('  Creating attributes...');
    
    // Foreign key to event_settings
    await databases.createStringAttribute(
      databaseId, 
      'x_integration', 
      'eventSettingsId', 
      255, 
      true  // required
    );
    await waitForAttribute(databaseId, 'x_integration', 'eventSettingsId');

    // Version for optimistic locking
    await databases.createIntegerAttribute(
      databaseId, 
      'x_integration', 
      'version', 
      true,  // required
      1      // default value
    );
    await waitForAttribute(databaseId, 'x_integration', 'version');

    // Enabled toggle
    await databases.createBooleanAttribute(
      databaseId, 
      'x_integration', 
      'enabled', 
      true,  // required
      false  // default value
    );
    await waitForAttribute(databaseId, 'x_integration', 'enabled');

    // Integration-specific fields
    await databases.createStringAttribute(
      databaseId, 
      'x_integration', 
      'field1', 
      255, 
      false  // optional
    );
    await waitForAttribute(databaseId, 'x_integration', 'field1');

    // Add more attributes as needed...

    // Create indexes
    console.log('  Creating indexes...');
    await databases.createIndex(
      databaseId, 
      'x_integration', 
      'eventSettingsId_idx', 
      IndexType.Key, 
      ['eventSettingsId']
    );

    console.log('✓ X Integration collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ X Integration collection already exists');
    } else {
      throw error;
    }
  }
}
```

### Real-World Example: Cloudinary

```typescript
async function createCloudinaryCollection(databaseId: string) {
  try {
    console.log('\nCreating cloudinary collection...');
    
    await databases.createCollection(
      databaseId,
      'cloudinary',
      'Cloudinary Integration',
      [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ]
    );

    // Required fields
    await databases.createStringAttribute(databaseId, 'cloudinary', 'eventSettingsId', 255, true);
    await waitForAttribute(databaseId, 'cloudinary', 'eventSettingsId');

    await databases.createIntegerAttribute(databaseId, 'cloudinary', 'version', true, 1);
    await waitForAttribute(databaseId, 'cloudinary', 'version');

    await databases.createBooleanAttribute(databaseId, 'cloudinary', 'enabled', true, false);
    await waitForAttribute(databaseId, 'cloudinary', 'enabled');

    // Cloudinary-specific fields
    await databases.createStringAttribute(databaseId, 'cloudinary', 'cloudName', 255, false);
    await waitForAttribute(databaseId, 'cloudinary', 'cloudName');

    await databases.createStringAttribute(databaseId, 'cloudinary', 'uploadPreset', 255, false);
    await waitForAttribute(databaseId, 'cloudinary', 'uploadPreset');

    await databases.createBooleanAttribute(databaseId, 'cloudinary', 'autoOptimize', false, false);
    await waitForAttribute(databaseId, 'cloudinary', 'autoOptimize');

    // ... more attributes

    // Create index
    await databases.createIndex(
      databaseId, 
      'cloudinary', 
      'eventSettingsId_idx', 
      IndexType.Key, 
      ['eventSettingsId']
    );

    console.log('✓ Cloudinary collection created');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('✓ Cloudinary collection already exists');
    } else {
      throw error;
    }
  }
}
```

### Key Points

- **Use snake_case for collection IDs** - e.g., `x_integration`, `cloudinary`
- **Always include**: `eventSettingsId`, `version`, `enabled`
- **Wait for attributes** - Appwrite creates attributes asynchronously
- **Create index on eventSettingsId** - Required for efficient queries
- **Handle 409 errors** - Collection might already exist
- **Set appropriate defaults** - `version: 1`, `enabled: false`

---

## FlattenEventSettings Helper Pattern

The `flattenEventSettings` helper converts the normalized integration structure (separate collections) into a flat object for backward compatibility with existing code.

### Template

```typescript
/**
 * Helper to convert event settings with integrations to flat format
 * Maps integration fields to prefixed fields for backward compatibility
 */
export function flattenEventSettings(settings: EventSettingsWithIntegrations): any {
  const { x, ...coreSettings } = settings;

  return {
    ...coreSettings,
    // Map Appwrite's automatic timestamp fields
    createdAt: (coreSettings as any).$createdAt || (coreSettings as any).createdAt,
    updatedAt: (coreSettings as any).$updatedAt || (coreSettings as any).updatedAt,
    
    // X Integration fields (prefixed with 'x')
    xEnabled: x?.enabled || false,
    xField1: x?.field1 || '',
    xField2: x?.field2 || false,
    // ... map all integration fields with prefix
    
    // SECURITY: API credentials are NOT stored in database
    // They must be read from environment variables at runtime
    // xApiKey: x?.apiKey || '',  // ❌ NEVER DO THIS
  };
}
```

### Real-World Example: Cloudinary

```typescript
export function flattenEventSettings(settings: EventSettingsWithIntegrations): any {
  const { cloudinary, switchboard, oneSimpleApi, ...coreSettings } = settings;

  return {
    ...coreSettings,
    createdAt: (coreSettings as any).$createdAt || (coreSettings as any).createdAt,
    updatedAt: (coreSettings as any).$updatedAt || (coreSettings as any).updatedAt,
    
    // Cloudinary fields
    cloudinaryEnabled: cloudinary?.enabled || false,
    cloudinaryCloudName: cloudinary?.cloudName || '',
    // SECURITY: API credentials are NOT stored in database
    cloudinaryUploadPreset: cloudinary?.uploadPreset || '',
    cloudinaryAutoOptimize: cloudinary?.autoOptimize || false,
    cloudinaryGenerateThumbnails: cloudinary?.generateThumbnails || false,
    cloudinaryDisableSkipCrop: cloudinary?.disableSkipCrop || false,
    cloudinaryCropAspectRatio: cloudinary?.cropAspectRatio || '1',
    
    // ... other integrations
  };
}
```

### Key Points

- **Prefix all fields** - Use integration name as prefix (e.g., `cloudinary`, `x`)
- **Provide defaults** - Use `|| false` or `|| ''` for missing values
- **Map timestamps** - Handle Appwrite's `$createdAt` and `$updatedAt`
- **Never include secrets** - Don't map API keys or credentials
- **Parse JSON fields** - Convert JSON strings to objects if needed

---

## ExtractIntegrationFields Pattern

The `extractIntegrationFields` function separates integration data from the main update payload in API handlers. This allows updating integrations independently from core event settings.

### Template

```typescript
/**
 * Extract integration fields from the update payload
 * Filters out undefined values to avoid overwriting with undefined
 */
function extractIntegrationFields(updateData: any) {
  // Extract X integration fields
  const xFields = {
    enabled: updateData.xEnabled,
    field1: updateData.xField1,
    field2: updateData.xField2,
    // ... extract all integration fields
  };

  // Filter out undefined values to avoid overwriting with undefined
  const filterUndefined = (obj: any) => {
    return Object.fromEntries(
      Object.entries(obj).filter(([_, v]) => v !== undefined)
    );
  };

  return {
    x: filterUndefined(xFields),
  };
}
```

### Real-World Example: All Three Integrations

```typescript
function extractIntegrationFields(updateData: any) {
  // Extract Cloudinary fields (7 fields - credentials removed for security)
  const cloudinaryFields = {
    enabled: updateData.cloudinaryEnabled,
    cloudName: updateData.cloudinaryCloudName,
    // SECURITY: API credentials are NOT stored in database
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
    // SECURITY: API key is NOT stored in database
    requestBody: updateData.switchboardRequestBody,
    templateId: updateData.switchboardTemplateId,
    fieldMappings: typeof updateData.switchboardFieldMappings === 'string'
      ? updateData.switchboardFieldMappings
      : (updateData.switchboardFieldMappings !== undefined ? JSON.stringify(updateData.switchboardFieldMappings) : undefined)
  };

  // Extract OneSimpleAPI fields (5 fields)
  const oneSimpleApiFields = {
    enabled: updateData.oneSimpleApiEnabled,
    url: updateData.oneSimpleApiUrl,
    formDataKey: updateData.oneSimpleApiFormDataKey,
    formDataValue: updateData.oneSimpleApiFormDataValue,
    recordTemplate: updateData.oneSimpleApiRecordTemplate
  };

  // Filter out undefined values
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

### Usage in API Handler

```typescript
// In your PUT /api/event-settings handler:

// Extract integration fields
const integrationFields = extractIntegrationFields(updateData);

// Update integrations separately (outside transaction)
const integrationUpdates = [];

if (Object.keys(integrationFields.x).length > 0) {
  integrationUpdates.push(
    updateXIntegration(
      databases,
      currentSettings.$id,
      integrationFields.x
    ).catch(error => {
      if (error instanceof IntegrationConflictError) {
        throw error;  // Re-throw conflicts to return 409
      }
      console.error('Failed to update X integration:', error);
      return {
        error: 'x',
        message: error instanceof Error ? error.message : 'Unknown error',
        fields: Object.keys(integrationFields.x)
      };
    })
  );
}

// Execute all integration updates
if (integrationUpdates.length > 0) {
  const integrationResults = await Promise.all(integrationUpdates);
  // Handle results...
}
```

### Key Points

- **Extract by prefix** - Look for fields starting with integration name
- **Filter undefined** - Only include fields that are actually being updated
- **Handle JSON serialization** - Convert objects to strings if needed
- **Never extract secrets** - Skip API keys and credentials
- **Return object with integration names as keys** - Makes it easy to iterate

---

## Complete Integration Checklist

When adding a new integration, use this checklist to ensure you've implemented all patterns:

### Backend (`src/lib/appwrite-integrations.ts`)
- [ ] TypeScript interface with required fields (`$id`, `eventSettingsId`, `version`, `enabled`)
- [ ] Getter function with proper error handling
- [ ] Update function with validation and optimistic locking
- [ ] Add to `flattenEventSettings` helper
- [ ] Export all functions and types

### API Handler (`src/pages/api/event-settings/index.ts`)
- [ ] Add fields to `extractIntegrationFields` function
- [ ] Add update call in integration updates section
- [ ] Handle `IntegrationConflictError` for 409 responses
- [ ] Fetch updated integration data after save

### UI Component (`src/components/EventSettingsForm/`)
- [ ] Create tab component with status indicator
- [ ] Add to `IntegrationsTab` component
- [ ] Add fields to `EventSettings` type
- [ ] Implement form state management

### Database Setup (`scripts/setup-appwrite.ts`)
- [ ] Create collection creation function
- [ ] Add required attributes with proper types
- [ ] Create index on `eventSettingsId`
- [ ] Call function in main setup flow

### Environment Variables
- [ ] Add API credentials to `.env.local`
- [ ] Document in `.env.example`
- [ ] Add to environment validation

### Testing
- [ ] Test create/update/delete operations
- [ ] Test optimistic locking conflicts
- [ ] Test validation errors
- [ ] Verify no credentials in database

---

## Additional Resources

- [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md) - Complete system overview
- [Adding New Integration Guide](./ADDING_NEW_INTEGRATION_GUIDE.md) - Step-by-step procedure
- [Integration Security Guide](./INTEGRATION_SECURITY_GUIDE.md) - Security best practices
- [Integration Troubleshooting Guide](./INTEGRATION_TROUBLESHOOTING_GUIDE.md) - Common issues

---

## Questions?

If you encounter issues or have questions about these patterns:

1. Check the existing integrations (Cloudinary, Switchboard, OneSimpleAPI) for working examples
2. Review the [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md) for system design
3. Consult the [Integration Troubleshooting Guide](./INTEGRATION_TROUBLESHOOTING_GUIDE.md) for common problems
4. Ask the development team for clarification

Remember: Consistency is key. Following these patterns ensures all integrations work the same way and are easy to maintain.

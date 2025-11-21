# Integration Type Examples

## Overview

This guide provides detailed examples of the three integration types supported by credential.studio: Photo Integration (Cloudinary), Printing Integration (Switchboard Canvas), and Webhook Integration (OneSimpleAPI). Each integration type serves a different purpose and follows specific patterns.

## Table of Contents

1. [Photo Integration (Cloudinary Pattern)](#photo-integration-cloudinary-pattern)
2. [Printing Integration (Switchboard Pattern)](#printing-integration-switchboard-pattern)
3. [Webhook Integration (OneSimpleAPI Pattern)](#webhook-integration-onesimpleapi-pattern)
4. [Integration Type Comparison](#integration-type-comparison)
5. [Choosing the Right Integration Pattern](#choosing-the-right-integration-pattern)

---

## Photo Integration (Cloudinary Pattern)

### Purpose

Photo integrations handle image upload, storage, transformation, and delivery. The Cloudinary pattern is designed for services that provide cloud-based image management with features like automatic optimization, cropping, and CDN delivery.

### Use Cases

- Attendee photo uploads during registration
- Profile picture management
- Badge photo requirements
- Image optimization and transformation
- Thumbnail generation
- CDN-delivered images for fast loading

### Configuration Options

#### 1. Cloud Name (Required)
```typescript
cloudName: string
```

**Description:** Your Cloudinary account identifier  
**Example:** `"my-event-company"`  
**Where to find:** Cloudinary Dashboard → Account Details  
**Purpose:** Identifies which Cloudinary account to use for uploads

#### 2. Upload Preset (Required)
```typescript
uploadPreset: string
```

**Description:** Predefined upload configuration  
**Example:** `"event_photos_unsigned"`  
**Where to find:** Cloudinary Dashboard → Settings → Upload → Upload Presets  
**Purpose:** Defines upload rules, transformations, and folder structure  
**Important:** Must be an "unsigned" preset for client-side uploads

#### 3. API Credentials (Environment Variables Only)
```bash
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnopqrstuvwxyz123456
```

**Description:** Authentication credentials for server-side operations  
**Security:** NEVER stored in database, only in environment variables  
**Purpose:** Enables server-side image management and validation  
**Where to find:** Cloudinary Dashboard → Account Details → API Keys

#### 4. Auto-Optimize Images
```typescript
autoOptimize: boolean
```

**Description:** Automatically optimize uploaded images for web delivery  
**Default:** `false`  
**Effect:** Applies automatic format conversion (WebP, AVIF) and quality optimization  
**Use when:** You want to reduce image file sizes without manual intervention


#### 5. Generate Thumbnails
```typescript
generateThumbnails: boolean
```

**Description:** Create thumbnail versions of uploaded images  
**Default:** `false`  
**Effect:** Generates smaller versions for list views and previews  
**Use when:** You need multiple image sizes for different contexts

#### 6. Disable Skip Crop
```typescript
disableSkipCrop: boolean
```

**Description:** Force users to crop images before uploading  
**Default:** `false`  
**Effect:** Removes the "Skip Crop" button from the upload widget  
**Use when:** You require consistent image dimensions (e.g., badge photos)

#### 7. Crop Aspect Ratio
```typescript
cropAspectRatio: string
```

**Description:** Required aspect ratio for cropped images  
**Default:** `"1"` (square)  
**Options:**
- `"1"` - Square (1:1)
- `"1.33"` - Landscape (4:3)
- `"0.75"` - Portrait (3:4)
- `"1.78"` - Widescreen (16:9)
- `"0.56"` - Vertical (9:16)

**Use when:** You need specific image dimensions for badges or credentials

### Database Schema

```typescript
interface CloudinaryIntegration {
  $id: string;                    // Appwrite document ID
  eventSettingsId: string;        // Link to event settings
  version: number;                // Optimistic locking version
  enabled: boolean;               // Integration on/off toggle
  cloudName: string;              // Cloudinary account name
  uploadPreset: string;           // Upload preset name
  autoOptimize: boolean;          // Auto-optimization flag
  generateThumbnails: boolean;    // Thumbnail generation flag
  disableSkipCrop: boolean;       // Force crop flag
  cropAspectRatio: string;        // Aspect ratio value
}
```


**Security Note:** API credentials (`apiKey`, `apiSecret`) are NOT stored in the database. They are read from environment variables at runtime.

### Implementation Example

#### Backend Integration Functions

```typescript
// Get Cloudinary integration
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
    if (error.code === 404 || error.code === 'document_not_found') {
      return null;
    }
    throw error;
  }
}

// Update Cloudinary integration with optimistic locking
export async function updateCloudinaryIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<CloudinaryIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<CloudinaryIntegration> {
  return updateIntegrationWithLocking<CloudinaryIntegration>(
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

#### Frontend UI Component

```typescript
export const CloudinaryTab = memo(function CloudinaryTab({
  formData,
  onInputChange,
  integrationStatus
}: CloudinaryTabProps) {
  const isReady = !!(
    formData.cloudinaryCloudName && 
    formData.cloudinaryUploadPreset && 
    integrationStatus?.cloudinary
  );

  return (
    <div className="space-y-6">
      <IntegrationStatusIndicator isReady={isReady} />
      
      {/* Cloud Name Input */}
      <Input
        value={formData.cloudinaryCloudName || ""}
        onChange={(e) => onInputChange("cloudinaryCloudName", e.target.value)}
        placeholder="your-cloud-name"
      />
      
      {/* Upload Preset Input */}
      <Input
        value={formData.cloudinaryUploadPreset || ""}
        onChange={(e) => onInputChange("cloudinaryUploadPreset", e.target.value)}
        placeholder="your-upload-preset"
      />
      
      {/* Auto-Optimize Toggle */}
      <Switch
        checked={formData.cloudinaryAutoOptimize || false}
        onCheckedChange={(checked) => onInputChange("cloudinaryAutoOptimize", checked)}
      />
      
      {/* Crop Aspect Ratio Select */}
      <Select
        value={formData.cloudinaryCropAspectRatio || "1"}
        onValueChange={(value) => onInputChange("cloudinaryCropAspectRatio", value)}
      >
        <SelectItem value="1">Square (1:1)</SelectItem>
        <SelectItem value="1.33">Landscape (4:3)</SelectItem>
        {/* ... more options */}
      </Select>
    </div>
  );
});
```


### Usage in Application

#### Photo Upload Widget Integration

```typescript
// In AttendeeForm component
const cloudinaryWidget = useCloudinaryWidget({
  cloudName: eventSettings.cloudinaryCloudName,
  uploadPreset: eventSettings.cloudinaryUploadPreset,
  cropping: true,
  croppingAspectRatio: parseFloat(eventSettings.cloudinaryCropAspectRatio || "1"),
  showSkipCropButton: !eventSettings.cloudinaryDisableSkipCrop,
  onSuccess: (result) => {
    setPhotoUrl(result.secure_url);
  }
});
```

#### Photo URL Storage

```typescript
// Attendee record with photo URL
interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  photoUrl: string;  // Cloudinary URL: https://res.cloudinary.com/[cloud]/image/upload/[id]
  // ... other fields
}
```

### Alternative Photo Services

To replace Cloudinary with another photo service:

1. **Maintain the same interface structure** (enabled, configuration fields)
2. **Store service-specific configuration** in the database
3. **Keep API credentials in environment variables**
4. **Implement similar upload widget integration**
5. **Store photo URLs in the same format** (full HTTPS URLs)

**Example alternatives:**
- **Uploadcare** - Similar widget-based upload
- **Imgix** - URL-based image transformation
- **ImageKit** - Real-time image optimization
- **AWS S3 + CloudFront** - Custom implementation

---

## Printing Integration (Switchboard Pattern)

### Purpose

Printing integrations handle credential generation and printing through external APIs. The Switchboard pattern is designed for services that accept JSON payloads with template data and return generated credentials (PDFs, images, etc.).

### Use Cases

- Badge printing for events
- Credential generation with custom designs
- Certificate printing
- Name tag generation
- QR code credential creation
- Bulk credential printing

### Configuration Options

#### 1. API Endpoint (Required)
```typescript
apiEndpoint: string
```

**Description:** The full URL for the printing service API  
**Example:** `"https://api.switchboard.ai/v1/generate"`  
**Purpose:** Defines where to send credential generation requests  
**Format:** Must be a valid HTTPS URL


#### 2. Authentication Header Type
```typescript
authHeaderType: string
```

**Description:** The type of authentication header to use  
**Default:** `"Bearer"`  
**Options:**
- `"Bearer"` - Bearer token authentication (most common)
- `"Basic"` - Basic authentication
- `"API-Key"` - Custom API key header
- `"X-API-Key"` - Alternative API key header

**Purpose:** Specifies how the API key is sent in the request header

#### 3. API Key (Environment Variable Only)
```bash
SWITCHBOARD_API_KEY=your_api_key_here
```

**Description:** Authentication credential for the printing service  
**Security:** NEVER stored in database, only in environment variables  
**Purpose:** Authenticates requests to the printing API  
**Format:** Depends on the service (usually alphanumeric string)

#### 4. Template ID (Required)
```typescript
templateId: string
```

**Description:** Identifier for the credential design template  
**Example:** `"template_abc123"`  
**Purpose:** Tells the printing service which design to use  
**Where to find:** Provided by the printing service after template creation

#### 5. Request Body (Required)
```typescript
requestBody: string  // JSON string
```

**Description:** The JSON payload template sent to the printing API  
**Format:** Valid JSON with placeholder variables  
**Purpose:** Defines the structure of data sent to the printing service

**Example:**
```json
{
  "template_id": "{{template_id}}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "barcodeNumber": "{{barcodeNumber}}",
    "photoUrl": "{{photoUrl}}",
    "eventName": "{{eventName}}",
    "customField1": "{{customFieldName}}"
  }
}
```

**Validation:** Must be valid JSON (validated on save)


#### 6. Field Mappings (Optional)
```typescript
fieldMappings: string  // JSON string of FieldMapping[]
```

**Description:** Maps custom field responses to different variable names  
**Purpose:** Transforms field values before sending to the printing API  
**Use when:** You need to convert boolean/select values or rename fields

**Field Mapping Structure:**
```typescript
interface FieldMapping {
  fieldId: string;           // Custom field ID
  fieldName: string;         // Display name
  fieldType: string;         // Field type (text, boolean, select, etc.)
  jsonVariable: string;      // Variable name in JSON request
  valueMapping?: {           // Optional value transformations
    [key: string]: string;   // Original value → Transformed value
  };
}
```

**Example:**
```json
[
  {
    "fieldId": "field_123",
    "fieldName": "VIP Status",
    "fieldType": "boolean",
    "jsonVariable": "isVIP",
    "valueMapping": {
      "Yes": "true",
      "No": "false"
    }
  },
  {
    "fieldId": "field_456",
    "fieldName": "Access Level",
    "fieldType": "select",
    "jsonVariable": "accessLevel",
    "valueMapping": {
      "Full Access": "FULL",
      "Limited Access": "LIMITED",
      "No Access": "NONE"
    }
  }
]
```

### Template Placeholder System

The Switchboard pattern uses a placeholder system for dynamic data replacement:

#### Standard Placeholders

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `{{template_id}}` | Template identifier | `"template_abc123"` |
| `{{firstName}}` | Attendee first name | `"John"` |
| `{{lastName}}` | Attendee last name | `"Doe"` |
| `{{barcodeNumber}}` | Attendee barcode | `"123456789"` |
| `{{photoUrl}}` | Photo URL | `"https://..."` |
| `{{eventName}}` | Event name | `"Tech Conference 2025"` |
| `{{eventDate}}` | Event date | `"2025-07-15"` |
| `{{eventTime}}` | Event time | `"09:00 AM"` |
| `{{eventLocation}}` | Event location | `"Convention Center"` |

#### Custom Field Placeholders

Custom fields are automatically available as placeholders using their internal field name:

```
{{customFieldInternalName}}
```

**Example:**
- Custom field: "Company Name" (internal: `companyName`)
- Placeholder: `{{companyName}}`
- Value: `"Acme Corp"`

#### Field Mapping Transformation

When field mappings are configured, values are transformed before replacement:

**Without mapping:**
```json
{
  "vipStatus": "Yes"  // Raw value from form
}
```

**With mapping:**
```json
{
  "isVIP": "true"  // Transformed value
}
```


### Database Schema

```typescript
interface SwitchboardIntegration {
  $id: string;                    // Appwrite document ID
  eventSettingsId: string;        // Link to event settings
  version: number;                // Optimistic locking version
  enabled: boolean;               // Integration on/off toggle
  apiEndpoint: string;            // API URL
  authHeaderType: string;         // Authentication type
  requestBody: string;            // JSON template (as string)
  templateId: string;             // Template identifier
  fieldMappings: string;          // JSON array of mappings (as string)
}
```

**Security Note:** API key is NOT stored in the database. It is read from the `SWITCHBOARD_API_KEY` environment variable.

### Implementation Example

#### Backend Integration Functions

```typescript
// Update Switchboard integration with JSON validation
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
      throw new Error(
        `Invalid JSON in Switchboard requestBody template. ${error.message}. ` +
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

#### Credential Generation API

```typescript
// Generate credential using Switchboard
export async function generateCredential(attendee: Attendee, eventSettings: EventSettings) {
  const apiKey = process.env.SWITCHBOARD_API_KEY;
  
  // Replace placeholders in request body
  let requestBody = eventSettings.switchboardRequestBody;
  requestBody = requestBody.replace(/\{\{template_id\}\}/g, eventSettings.switchboardTemplateId);
  requestBody = requestBody.replace(/\{\{firstName\}\}/g, attendee.firstName);
  requestBody = requestBody.replace(/\{\{lastName\}\}/g, attendee.lastName);
  requestBody = requestBody.replace(/\{\{barcodeNumber\}\}/g, attendee.barcodeNumber);
  // ... replace other placeholders
  
  // Apply field mappings
  const fieldMappings = JSON.parse(eventSettings.switchboardFieldMappings || '[]');
  for (const mapping of fieldMappings) {
    const fieldValue = attendee.customFieldValues[mapping.fieldId];
    const transformedValue = mapping.valueMapping?.[fieldValue] || fieldValue;
    requestBody = requestBody.replace(
      new RegExp(`\\{\\{${mapping.jsonVariable}\\}\\}`, 'g'),
      transformedValue
    );
  }
  
  // Send request to Switchboard API
  const response = await fetch(eventSettings.switchboardApiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [eventSettings.switchboardAuthHeaderType]: apiKey
    },
    body: requestBody
  });
  
  return response.json();
}
```


#### Frontend UI Component

```typescript
export const SwitchboardTab = memo(function SwitchboardTab({
  formData,
  onInputChange,
  integrationStatus,
  customFields,
  fieldMappings,
  onAddFieldMapping,
  onEditFieldMapping,
  onDeleteFieldMapping
}: SwitchboardTabProps) {
  const isReady = !!(
    formData.switchboardApiEndpoint && 
    formData.switchboardTemplateId && 
    integrationStatus?.switchboard
  );

  return (
    <div className="space-y-6">
      <IntegrationStatusIndicator isReady={isReady} />
      
      {/* API Endpoint */}
      <Input
        value={formData.switchboardApiEndpoint || ""}
        onChange={(e) => onInputChange("switchboardApiEndpoint", e.target.value)}
        placeholder="https://api.switchboard.ai/v1/generate"
      />
      
      {/* Template ID */}
      <Input
        value={formData.switchboardTemplateId || ""}
        onChange={(e) => onInputChange("switchboardTemplateId", e.target.value)}
        placeholder="template_abc123"
      />
      
      {/* Request Body Template */}
      <Textarea
        value={formData.switchboardRequestBody || ""}
        onChange={(e) => onInputChange("switchboardRequestBody", e.target.value)}
        placeholder={`{
  "template_id": "{{template_id}}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}"
  }
}`}
        className="font-mono"
      />
      
      {/* Field Mappings */}
      <div>
        <Button onClick={onAddFieldMapping}>Add Field Mapping</Button>
        {fieldMappings.map(mapping => (
          <div key={mapping.fieldId}>
            <span>{mapping.fieldName} → {mapping.jsonVariable}</span>
            <Button onClick={() => onEditFieldMapping(mapping)}>Edit</Button>
            <Button onClick={() => onDeleteFieldMapping(mapping.fieldId, mapping.jsonVariable)}>
              Delete
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
});
```

### Alternative Printing Services

To replace Switchboard with another printing service:

1. **Maintain the same interface structure** (endpoint, auth, template)
2. **Adapt the request body format** to match the new service's API
3. **Keep API credentials in environment variables**
4. **Implement similar placeholder replacement logic**
5. **Adjust field mapping transformations** as needed

**Example alternatives:**
- **PrintNode** - Direct printer integration
- **DocRaptor** - HTML to PDF conversion
- **CloudConvert** - Document conversion API
- **Custom printing service** - Your own API

---

## Webhook Integration (OneSimpleAPI Pattern)

### Purpose

Webhook integrations send data to external systems when events occur. The OneSimpleAPI pattern is designed for services that accept HTTP POST requests with form data or JSON payloads, typically for notifications, data synchronization, or triggering external workflows.

### Use Cases

- Send attendee data to external CRM systems
- Trigger email notifications
- Sync data with marketing platforms
- Send credentials to document management systems
- Integrate with custom business workflows
- Bulk data export to external services


### Configuration Options

#### 1. Webhook URL (Required)
```typescript
url: string
```

**Description:** The endpoint URL to send webhook notifications  
**Example:** `"https://api.example.com/webhook/attendees"`  
**Purpose:** Defines where to send the webhook payload  
**Format:** Must be a valid HTTPS URL  
**Security:** Should use HTTPS for secure data transmission

#### 2. Form Data Key
```typescript
formDataKey: string
```

**Description:** The key name for the form data payload  
**Default:** `"data"`  
**Example:** `"attendees"`, `"records"`, `"payload"`  
**Purpose:** Specifies the field name when sending form-encoded data  
**Use when:** The receiving API expects a specific field name

#### 3. Form Data Value Template (Required)
```typescript
formDataValue: string  // HTML template
```

**Description:** The main HTML wrapper template containing all attendee records  
**Format:** HTML with placeholder variables  
**Purpose:** Defines the overall structure of the webhook payload

**Example:**
```html
<html>
  <head>
    <title>{{eventName}} - Attendee List</title>
  </head>
  <body>
    <h1>{{eventName}}</h1>
    <p>Date: {{eventDate}} at {{eventTime}}</p>
    <p>Location: {{eventLocation}}</p>
    <div class="attendees">
      {{credentialRecords}}
    </div>
  </body>
</html>
```

**Special Placeholder:** `{{credentialRecords}}` - This is where all individual attendee records are inserted

#### 4. Record Template (Required)
```typescript
recordTemplate: string  // HTML template
```

**Description:** The HTML template for each individual attendee record  
**Format:** HTML with placeholder variables  
**Purpose:** Defines how each attendee's data is formatted

**Example:**
```html
<div class="attendee-record">
  <div class="header">
    <h3>{{firstName}} {{lastName}}</h3>
    <span class="barcode">{{barcodeNumber}}</span>
  </div>
  <div class="details">
    <img src="{{photoUrl}}" alt="Photo" class="photo" />
    <div class="info">
      <p><strong>Event:</strong> {{eventName}}</p>
      <p><strong>Date:</strong> {{eventDate}}</p>
      <p><strong>Company:</strong> {{companyName}}</p>
      <p><strong>VIP:</strong> {{vipStatus}}</p>
    </div>
  </div>
  <div class="actions">
    <a href="{{credentialUrl}}" class="btn">View Credential</a>
  </div>
</div>
```

### Template Placeholder System

The OneSimpleAPI pattern uses a two-level template system:

#### Level 1: Form Data Value Template (Wrapper)

This template wraps all attendee records and includes event-level information.

**Available Placeholders:**

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `{{credentialRecords}}` | All attendee records (required) | `<div>...</div><div>...</div>` |
| `{{eventName}}` | Event name | `"Tech Conference 2025"` |
| `{{eventDate}}` | Event date | `"2025-07-15"` |
| `{{eventTime}}` | Event time | `"09:00 AM"` |
| `{{eventLocation}}` | Event location | `"Convention Center"` |

**Custom field placeholders** are also available at this level.


#### Level 2: Record Template (Individual Records)

This template is repeated for each attendee and inserted where `{{credentialRecords}}` appears.

**Available Placeholders:**

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `{{firstName}}` | Attendee first name | `"John"` |
| `{{lastName}}` | Attendee last name | `"Doe"` |
| `{{barcodeNumber}}` | Attendee barcode | `"123456789"` |
| `{{photoUrl}}` | Photo URL | `"https://..."` |
| `{{credentialUrl}}` | Credential URL | `"https://..."` |
| `{{eventName}}` | Event name | `"Tech Conference 2025"` |
| `{{eventDate}}` | Event date | `"2025-07-15"` |
| `{{eventTime}}` | Event time | `"09:00 AM"` |
| `{{eventLocation}}` | Event location | `"Convention Center"` |

**Custom field placeholders** are available using the internal field name:
```
{{customFieldInternalName}}
```

### Template Processing Flow

1. **For each attendee:**
   - Take the Record Template
   - Replace all placeholders with attendee-specific data
   - Append to a collection of processed records

2. **After all attendees are processed:**
   - Take the Form Data Value Template
   - Replace `{{credentialRecords}}` with all processed records
   - Replace event-level placeholders
   - Send the final HTML to the webhook URL

**Example Processing:**

**Input:**
- 2 attendees: John Doe, Jane Smith
- Record Template: `<div>{{firstName}} {{lastName}}</div>`
- Form Data Value Template: `<html><body>{{credentialRecords}}</body></html>`

**Output:**
```html
<html>
  <body>
    <div>John Doe</div>
    <div>Jane Smith</div>
  </body>
</html>
```

### Database Schema

```typescript
interface OneSimpleApiIntegration {
  $id: string;                    // Appwrite document ID
  eventSettingsId: string;        // Link to event settings
  version: number;                // Optimistic locking version
  enabled: boolean;               // Integration on/off toggle
  url: string;                    // Webhook endpoint URL
  formDataKey: string;            // Form data field name
  formDataValue: string;          // HTML wrapper template
  recordTemplate: string;         // HTML record template
}
```

**Security Note:** Unlike other integrations, OneSimpleAPI typically doesn't require API credentials. If authentication is needed, it should be implemented through URL parameters or custom headers.

### Implementation Example

#### Backend Integration Functions

```typescript
// Update OneSimpleAPI integration
export async function updateOneSimpleApiIntegration(
  databases: Databases,
  eventSettingsId: string,
  data: Partial<Omit<OneSimpleApiIntegration, '$id' | 'eventSettingsId' | 'version'>>,
  expectedVersion?: number
): Promise<OneSimpleApiIntegration> {
  return updateIntegrationWithLocking<OneSimpleApiIntegration>(
    databases,
    ONESIMPLEAPI_COLLECTION_ID,
    'OneSimpleAPI',
    eventSettingsId,
    data,
    expectedVersion,
    () => getOneSimpleApiIntegration(databases, eventSettingsId)
  );
}
```


#### Webhook Sending Logic

```typescript
// Send webhook with attendee data
export async function sendWebhook(
  attendees: Attendee[],
  eventSettings: EventSettings,
  oneSimpleApiConfig: OneSimpleApiIntegration
) {
  // Process each attendee record
  const processedRecords = attendees.map(attendee => {
    let record = oneSimpleApiConfig.recordTemplate;
    
    // Replace standard placeholders
    record = record.replace(/\{\{firstName\}\}/g, attendee.firstName);
    record = record.replace(/\{\{lastName\}\}/g, attendee.lastName);
    record = record.replace(/\{\{barcodeNumber\}\}/g, attendee.barcodeNumber);
    record = record.replace(/\{\{photoUrl\}\}/g, attendee.photoUrl || '');
    record = record.replace(/\{\{credentialUrl\}\}/g, attendee.credentialUrl || '');
    
    // Replace event placeholders
    record = record.replace(/\{\{eventName\}\}/g, eventSettings.eventName);
    record = record.replace(/\{\{eventDate\}\}/g, eventSettings.eventDate);
    record = record.replace(/\{\{eventTime\}\}/g, eventSettings.eventTime);
    record = record.replace(/\{\{eventLocation\}\}/g, eventSettings.eventLocation);
    
    // Replace custom field placeholders
    for (const [fieldName, value] of Object.entries(attendee.customFieldValues)) {
      const regex = new RegExp(`\\{\\{${fieldName}\\}\\}`, 'g');
      record = record.replace(regex, String(value));
    }
    
    return record;
  }).join('\n');
  
  // Build final payload
  let finalPayload = oneSimpleApiConfig.formDataValue;
  finalPayload = finalPayload.replace(/\{\{credentialRecords\}\}/g, processedRecords);
  finalPayload = finalPayload.replace(/\{\{eventName\}\}/g, eventSettings.eventName);
  finalPayload = finalPayload.replace(/\{\{eventDate\}\}/g, eventSettings.eventDate);
  finalPayload = finalPayload.replace(/\{\{eventTime\}\}/g, eventSettings.eventTime);
  finalPayload = finalPayload.replace(/\{\{eventLocation\}\}/g, eventSettings.eventLocation);
  
  // Send to webhook URL
  const formData = new FormData();
  formData.append(oneSimpleApiConfig.formDataKey, finalPayload);
  
  const response = await fetch(oneSimpleApiConfig.url, {
    method: 'POST',
    body: formData
  });
  
  return response;
}
```

#### Frontend UI Component

```typescript
export const OneSimpleApiTab = memo(function OneSimpleApiTab({
  formData,
  onInputChange,
  customFields
}: OneSimpleApiTabProps) {
  return (
    <div className="space-y-6">
      {/* Webhook URL */}
      <Input
        value={formData.oneSimpleApiUrl || ""}
        onChange={(e) => onInputChange("oneSimpleApiUrl", e.target.value)}
        placeholder="https://api.example.com/webhook"
      />
      
      {/* Form Data Key */}
      <Input
        value={formData.oneSimpleApiFormDataKey || ""}
        onChange={(e) => onInputChange("oneSimpleApiFormDataKey", e.target.value)}
        placeholder="data"
      />
      
      {/* Form Data Value Template */}
      <Textarea
        value={formData.oneSimpleApiFormDataValue || ""}
        onChange={(e) => onInputChange("oneSimpleApiFormDataValue", e.target.value)}
        placeholder={`<html>
  <body>
    <h1>{{eventName}}</h1>
    {{credentialRecords}}
  </body>
</html>`}
        className="font-mono min-h-[150px]"
      />
      
      {/* Record Template */}
      <Textarea
        value={formData.oneSimpleApiRecordTemplate || ""}
        onChange={(e) => onInputChange("oneSimpleApiRecordTemplate", e.target.value)}
        placeholder={`<div>
  <h3>{{firstName}} {{lastName}}</h3>
  <p>{{barcodeNumber}}</p>
</div>`}
        className="font-mono min-h-[150px]"
      />
    </div>
  );
});
```

### Alternative Webhook Services

The OneSimpleAPI pattern is flexible and can work with many webhook-based services:

**Example alternatives:**
- **Zapier Webhooks** - Trigger Zapier workflows
- **Make (Integromat)** - Automation platform webhooks
- **n8n** - Self-hosted workflow automation
- **Custom webhooks** - Your own API endpoints
- **Slack Webhooks** - Send notifications to Slack
- **Discord Webhooks** - Send notifications to Discord

**Adaptation tips:**
1. Adjust the payload format (HTML, JSON, XML) as needed
2. Add authentication headers if required
3. Modify template structure to match API expectations
4. Consider rate limiting for bulk operations


---

## Integration Type Comparison

### Feature Comparison Table

| Feature | Photo (Cloudinary) | Printing (Switchboard) | Webhook (OneSimpleAPI) |
|---------|-------------------|----------------------|----------------------|
| **Primary Purpose** | Image upload & management | Credential generation | Data synchronization |
| **Data Flow** | Client → Service → Storage | Server → Service → PDF/Image | Server → External System |
| **Authentication** | API Key + Secret (env vars) | API Key (env vars) | Optional (URL/headers) |
| **Configuration Storage** | Database | Database | Database |
| **Template System** | Upload preset | JSON with placeholders | HTML with placeholders |
| **Field Mapping** | No | Yes (optional) | No |
| **Bulk Operations** | Individual uploads | Individual generation | Batch sending |
| **Real-time Processing** | Yes (client-side) | Yes (server-side) | Yes (server-side) |
| **Response Type** | Image URL | PDF/Image URL | HTTP status |
| **Error Handling** | Widget errors | API errors | HTTP errors |
| **Retry Logic** | Widget handles | Manual retry | Manual retry |
| **Cost Model** | Per upload/transformation | Per generation | Per request |

### Use Case Comparison

| Scenario | Recommended Integration | Reason |
|----------|------------------------|--------|
| Attendee photo uploads | Photo (Cloudinary) | Optimized for image handling, CDN delivery |
| Badge printing | Printing (Switchboard) | Designed for credential generation |
| CRM synchronization | Webhook (OneSimpleAPI) | Flexible data export format |
| Certificate generation | Printing (Switchboard) | Template-based document creation |
| Profile pictures | Photo (Cloudinary) | Image optimization and cropping |
| Email notifications | Webhook (OneSimpleAPI) | Can trigger external email services |
| QR code credentials | Printing (Switchboard) | Supports dynamic QR code generation |
| Marketing platform sync | Webhook (OneSimpleAPI) | Flexible payload format |
| Thumbnail generation | Photo (Cloudinary) | Built-in transformation features |
| Bulk credential export | Webhook (OneSimpleAPI) | Batch processing support |

### Technical Comparison

#### Complexity Level

1. **Photo Integration (Low-Medium)**
   - Simple configuration (cloud name, preset)
   - Client-side widget handles most complexity
   - Minimal server-side logic
   - Standard image URL storage

2. **Printing Integration (Medium-High)**
   - Complex JSON template configuration
   - Field mapping system
   - Placeholder replacement logic
   - Server-side API integration
   - Error handling for generation failures

3. **Webhook Integration (Medium)**
   - Two-level template system
   - HTML template processing
   - Batch record processing
   - Simple HTTP POST requests
   - Flexible payload format

#### Maintenance Requirements

| Aspect | Photo | Printing | Webhook |
|--------|-------|----------|---------|
| **Configuration Updates** | Rare | Occasional | Occasional |
| **Template Changes** | Rare | Frequent | Frequent |
| **API Changes** | Rare | Occasional | Rare |
| **Credential Rotation** | Annual | Annual | N/A |
| **Testing Needs** | Low | High | Medium |
| **Documentation** | Low | High | Medium |

#### Performance Characteristics

| Metric | Photo | Printing | Webhook |
|--------|-------|----------|---------|
| **Latency** | Low (client-side) | Medium (API call) | Medium (API call) |
| **Throughput** | High (parallel) | Medium (sequential) | High (batch) |
| **Bandwidth** | High (images) | Low (JSON) | Medium (HTML) |
| **Caching** | Yes (CDN) | No | No |
| **Rate Limits** | High | Medium | Varies |


---

## Choosing the Right Integration Pattern

### Decision Tree

```
Do you need to handle images?
├─ Yes → Use Photo Integration Pattern
│  └─ Examples: Cloudinary, Uploadcare, ImageKit
│
└─ No → Do you need to generate documents/credentials?
   ├─ Yes → Use Printing Integration Pattern
   │  └─ Examples: Switchboard, PrintNode, DocRaptor
   │
   └─ No → Do you need to send data to external systems?
      ├─ Yes → Use Webhook Integration Pattern
      │  └─ Examples: OneSimpleAPI, Zapier, custom webhooks
      │
      └─ Consider if you need an integration at all

```

### Selection Criteria

#### Choose Photo Integration When:

✅ You need to upload and store images  
✅ You want automatic image optimization  
✅ You need image transformations (crop, resize, format)  
✅ You want CDN delivery for fast loading  
✅ You need thumbnail generation  
✅ You want client-side upload widgets  

❌ Don't use for: Document generation, data export, notifications

**Example scenarios:**
- Attendee profile photos
- Badge photos with specific dimensions
- Event photos and galleries
- Logo uploads
- Document scans (if treated as images)

#### Choose Printing Integration When:

✅ You need to generate PDFs or images from templates  
✅ You want dynamic credential creation  
✅ You need to merge data with design templates  
✅ You want professional printing output  
✅ You need QR codes or barcodes on credentials  
✅ You want field value transformations  

❌ Don't use for: Image uploads, simple data export, real-time notifications

**Example scenarios:**
- Event badges and credentials
- Certificates and awards
- Name tags with custom designs
- Tickets with QR codes
- Personalized documents
- Bulk credential generation

#### Choose Webhook Integration When:

✅ You need to send data to external systems  
✅ You want to trigger external workflows  
✅ You need flexible payload formats  
✅ You want to synchronize data  
✅ You need batch data export  
✅ You want to integrate with automation platforms  

❌ Don't use for: Image uploads, document generation, real-time user interactions

**Example scenarios:**
- CRM synchronization
- Email notification triggers
- Marketing platform integration
- Custom business workflows
- Data warehouse exports
- Third-party API integration

### Combining Multiple Integrations

You can enable multiple integrations simultaneously for comprehensive functionality:

#### Common Combinations

**1. Photo + Printing**
```
Use Case: Event badges with photos
- Photo Integration: Upload and store attendee photos
- Printing Integration: Generate badges with photos embedded
```

**2. Photo + Webhook**
```
Use Case: Profile sync with external CRM
- Photo Integration: Upload profile pictures
- Webhook Integration: Send profile data including photo URLs to CRM
```

**3. Printing + Webhook**
```
Use Case: Credential generation with notifications
- Printing Integration: Generate credentials
- Webhook Integration: Notify external system when credentials are ready
```

**4. All Three**
```
Use Case: Complete event management workflow
- Photo Integration: Attendee photo uploads
- Printing Integration: Generate badges with photos
- Webhook Integration: Sync all data to external systems
```

### Implementation Checklist

When implementing a new integration, use this checklist:

#### Photo Integration Checklist

- [ ] Obtain cloud name from service provider
- [ ] Create unsigned upload preset
- [ ] Configure environment variables (API key, secret)
- [ ] Set up crop aspect ratio requirements
- [ ] Test upload widget integration
- [ ] Verify image URL storage
- [ ] Test image transformations
- [ ] Configure CDN settings (if applicable)
- [ ] Set up thumbnail generation (if needed)
- [ ] Test error handling

#### Printing Integration Checklist

- [ ] Obtain API endpoint URL
- [ ] Get API key and configure environment variable
- [ ] Create template in printing service
- [ ] Get template ID
- [ ] Design JSON request body structure
- [ ] Map all required placeholders
- [ ] Configure field mappings (if needed)
- [ ] Test credential generation
- [ ] Verify PDF/image output
- [ ] Test error handling
- [ ] Set up retry logic (if needed)
- [ ] Test with various data scenarios

#### Webhook Integration Checklist

- [ ] Obtain webhook endpoint URL
- [ ] Design HTML wrapper template
- [ ] Design record template
- [ ] Map all required placeholders
- [ ] Test with sample data
- [ ] Verify payload format
- [ ] Test with single record
- [ ] Test with multiple records
- [ ] Test with custom fields
- [ ] Verify external system receives data correctly
- [ ] Test error handling
- [ ] Set up monitoring (if needed)

### Best Practices by Integration Type

#### Photo Integration Best Practices

1. **Always use unsigned upload presets** for client-side uploads
2. **Store only URLs in database**, not image data
3. **Use CDN URLs** for optimal performance
4. **Implement image validation** (size, format, dimensions)
5. **Provide crop guidance** to users (aspect ratio indicators)
6. **Handle upload failures gracefully** with retry options
7. **Consider bandwidth costs** for high-resolution images
8. **Use lazy loading** for image galleries

#### Printing Integration Best Practices

1. **Validate JSON templates** before saving
2. **Use meaningful placeholder names** (descriptive, not cryptic)
3. **Document all available placeholders** for users
4. **Test with edge cases** (missing data, special characters)
5. **Implement field mappings** for boolean/select transformations
6. **Cache template configurations** to reduce API calls
7. **Provide template preview** functionality
8. **Log generation failures** for debugging
9. **Consider rate limits** for bulk operations
10. **Store generated URLs** for future reference

#### Webhook Integration Best Practices

1. **Use HTTPS URLs** for security
2. **Validate HTML templates** for syntax errors
3. **Escape special characters** in data
4. **Test with various record counts** (1, 10, 100+)
5. **Implement timeout handling** for slow endpoints
6. **Log webhook responses** for debugging
7. **Provide retry mechanism** for failures
8. **Consider payload size limits** of receiving service
9. **Document expected response format** from webhook
10. **Monitor webhook success rates**

### Migration Strategies

#### Migrating Between Photo Services

1. **Export existing photo URLs** from database
2. **Download images** from old service (if needed)
3. **Upload to new service** using their API
4. **Update URLs** in database
5. **Test image access** from new URLs
6. **Update integration configuration**
7. **Verify all images load correctly**
8. **Decommission old service** after verification period

#### Migrating Between Printing Services

1. **Document current template structure**
2. **Recreate templates** in new service
3. **Map field names** between services
4. **Update JSON request body** format
5. **Test credential generation** with sample data
6. **Update API endpoint** and credentials
7. **Run parallel testing** (old and new)
8. **Switch over** after successful testing
9. **Monitor for issues** in production

#### Migrating Between Webhook Services

1. **Document current payload format**
2. **Set up new webhook endpoint**
3. **Adapt templates** to new format requirements
4. **Test with sample data**
5. **Run parallel webhooks** (send to both)
6. **Verify data reception** in new system
7. **Switch over** after successful testing
8. **Decommission old webhook** after verification

---

## Conclusion

Understanding the three integration patterns (Photo, Printing, Webhook) is essential for effectively extending credential.studio functionality. Each pattern serves distinct purposes:

- **Photo Integration**: Image upload and management
- **Printing Integration**: Document and credential generation
- **Webhook Integration**: Data synchronization and external workflows

By following the examples, best practices, and guidelines in this document, you can successfully implement, maintain, and migrate integrations to meet your specific event management needs.

For more detailed information, refer to:
- [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md)
- [Adding New Integration Guide](./ADDING_NEW_INTEGRATION_GUIDE.md)
- [Integration Security Guide](./INTEGRATION_SECURITY_GUIDE.md)
- [Integration Troubleshooting Guide](./INTEGRATION_TROUBLESHOOTING_GUIDE.md)


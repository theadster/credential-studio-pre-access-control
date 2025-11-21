# Photo Service Integration Guide

## Overview

This guide explains how photo upload services are integrated into credential.studio, using Cloudinary as the reference implementation. It provides step-by-step instructions for replacing Cloudinary with an alternative photo service, documents minimum configuration requirements, and explains photo URL storage patterns.

**Current Photo Service:** Cloudinary  
**Integration Type:** Client-side upload widget with server-side credential management  
**Photo Storage:** URLs stored in attendee records (`photoUrl` field)

## Table of Contents

1. [Cloudinary Integration Architecture](#cloudinary-integration-architecture)
2. [Minimum Configuration Requirements](#minimum-configuration-requirements)
3. [Photo URL Storage and Retrieval](#photo-url-storage-and-retrieval)
4. [Integration Points in AttendeeForm](#integration-points-in-attendeeform)
5. [Photo Upload Widget Integration](#photo-upload-widget-integration)
6. [Replacing Cloudinary with Alternative Service](#replacing-cloudinary-with-alternative-service)
7. [Testing Checklist](#testing-checklist)
8. [Photo URL Transformation and Optimization](#photo-url-transformation-and-optimization)
9. [Migration Strategy for Existing Photos](#migration-strategy-for-existing-photos)

---

## Cloudinary Integration Architecture

### Overview

Cloudinary integration follows the normalized database pattern with configuration stored separately from core event settings.

### Database Schema

```typescript
interface CloudinaryIntegration {
  $id: string;                    // Appwrite document ID
  eventSettingsId: string;        // Links to event_settings
  version: number;                // Optimistic locking version
  enabled: boolean;               // Enable/disable toggle
  
  // Configuration fields
  cloudName: string;              // Cloudinary cloud name
  uploadPreset: string;           // Upload preset name
  autoOptimize: boolean;          // Auto-optimize images
  generateThumbnails: boolean;    // Generate thumbnails
  disableSkipCrop: boolean;       // Force cropping
  cropAspectRatio: string;        // Crop aspect ratio (e.g., "1", "16:9", "free")
}
```

**Security Note:** API credentials (`CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are stored in environment variables, NOT in the database.

### Data Flow

```
User clicks "Upload Photo"
  ↓
useCloudinaryUpload hook opens widget
  ↓
Cloudinary widget (client-side)
  ↓
Photo uploaded to Cloudinary servers
  ↓
Cloudinary returns secure_url
  ↓
URL stored in attendee.photoUrl field
  ↓
Photo displayed in AttendeeForm
```


### Key Components

1. **Database Collection** (`cloudinary_integrations`)
   - Stores configuration per event
   - Linked via `eventSettingsId`
   - Version controlled for concurrent updates

2. **Backend Functions** (`src/lib/appwrite-integrations.ts`)
   - `getCloudinaryIntegration()` - Fetch configuration
   - `updateCloudinaryIntegration()` - Update with optimistic locking
   - `flattenEventSettings()` - Denormalize for UI

3. **UI Configuration** (`src/components/EventSettingsForm/CloudinaryTab.tsx`)
   - Cloud name input
   - Upload preset input
   - Optimization toggles
   - Crop settings

4. **Upload Hook** (`src/hooks/useCloudinaryUpload.ts`)
   - Widget initialization
   - Configuration management
   - Upload callbacks

5. **Photo Upload Component** (`src/components/AttendeeForm/PhotoUploadSection.tsx`)
   - Photo display
   - Upload/remove buttons
   - Placeholder with initials

---

## Minimum Configuration Requirements

### Required Fields

Every photo service integration must provide:

1. **Service Identifier**
   - Cloud name, account ID, or similar unique identifier
   - Used to route uploads to correct account

2. **Upload Configuration**
   - Upload preset, bucket name, or upload endpoint
   - Defines upload permissions and transformations

3. **Enable/Disable Toggle**
   - Boolean flag to activate/deactivate integration
   - Allows configuration without immediate activation

### Optional but Recommended Fields

4. **Image Optimization**
   - Auto-optimize toggle
   - Compression settings
   - Format conversion options

5. **Cropping Configuration**
   - Aspect ratio settings
   - Force crop toggle
   - Crop dimensions

6. **Thumbnail Generation**
   - Generate thumbnails toggle
   - Thumbnail sizes
   - Thumbnail formats

### Environment Variables

**Required:**
- Service API credentials (keys, secrets, tokens)
- Never store in database

**Optional:**
- Default upload settings
- Service endpoints (if customizable)
- Feature flags

### Example: Minimum Viable Configuration

```typescript
interface MinimalPhotoServiceIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  
  // Minimum required fields
  serviceIdentifier: string;    // e.g., cloud name, account ID
  uploadEndpoint: string;       // e.g., preset name, bucket name
}
```


---

## Photo URL Storage and Retrieval

### Storage Pattern

Photo URLs are stored directly in the attendee record:

```typescript
interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  photoUrl: string | null;      // Photo URL from service
  // ... other fields
}
```

**Key Points:**
- URLs are stored as strings, not file references
- `null` indicates no photo uploaded
- URLs are typically HTTPS secure URLs
- URLs point to external service (Cloudinary, S3, etc.)

### Retrieval Pattern

Photos are retrieved by reading the `photoUrl` field:

```typescript
// In AttendeeForm component
<img
  src={photoUrl}
  alt={`Photo of ${firstName} ${lastName}`}
  className="w-full h-full object-cover"
/>
```

**Fallback Behavior:**
- If `photoUrl` is null/empty, show placeholder with initials
- Placeholder uses first/last name initials
- Gracefully handles missing names

### URL Format Examples

**Cloudinary:**
```
https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/filename.jpg
```

**AWS S3:**
```
https://bucket-name.s3.region.amazonaws.com/folder/filename.jpg
```

**Azure Blob Storage:**
```
https://account-name.blob.core.windows.net/container/filename.jpg
```

### Database Schema

```sql
-- Attendees collection
{
  "$id": "attendee123",
  "firstName": "John",
  "lastName": "Doe",
  "barcodeNumber": "12345",
  "photoUrl": "https://res.cloudinary.com/.../photo.jpg",
  "notes": "",
  "customFieldValues": []
}
```

**Important:** The `photoUrl` field is a simple string attribute in the Appwrite `attendees` collection. No special file handling is required.

---

## Integration Points in AttendeeForm

### Component Hierarchy

```
AttendeeForm (index.tsx)
├── useCloudinaryUpload hook
├── PhotoUploadSection
│   ├── Photo display (img or placeholder)
│   ├── Upload button
│   └── Remove button
├── BasicInformationSection
└── CustomFieldsSection
```

### Key Integration Points

#### 1. Hook Initialization

**Location:** `src/components/AttendeeForm/index.tsx`

```typescript
const { isCloudinaryOpen, openUploadWidget } = useCloudinaryUpload({
  eventSettings,
  onUploadSuccess: setPhotoUrl
});
```

**Purpose:**
- Initialize upload widget with event settings
- Provide callback for successful uploads
- Track widget open/close state

#### 2. Photo Display

**Location:** `src/components/AttendeeForm/PhotoUploadSection.tsx`

```typescript
{photoUrl ? (
  <img
    src={photoUrl}
    alt={`Photo of ${firstName} ${lastName}`}
    className="w-full h-full object-cover"
  />
) : (
  <div className="placeholder">
    {getInitials(firstName, lastName)}
  </div>
)}
```

**Purpose:**
- Display uploaded photo or placeholder
- Show initials when no photo available
- Maintain aspect ratio (3:4)


#### 3. Upload Button

```typescript
<Button
  type="button"
  variant="outline"
  onClick={onUpload}
  className="w-full"
>
  <Camera className="mr-2 h-4 w-4" />
  {photoUrl ? 'Change Photo' : 'Upload Photo'}
</Button>
```

**Purpose:**
- Trigger upload widget
- Show appropriate text (Upload vs Change)
- Prevent form submission (type="button")

#### 4. Remove Button

```typescript
{photoUrl && (
  <Button
    type="button"
    variant="ghost"
    onClick={onRemove}
    className="w-full"
  >
    <X className="mr-2 h-4 w-4" />
    Remove Photo
  </Button>
)}
```

**Purpose:**
- Clear photo URL
- Only shown when photo exists
- Revert to placeholder state

#### 5. Dialog Interaction Handling

**Critical:** The AttendeeForm dialog uses `modal={false}` to allow interaction with the Cloudinary widget:

```typescript
<Dialog open={isOpen} onOpenChange={handleDialogOpenChange} modal={false}>
  <DialogContent
    onInteractOutside={(e) => {
      // Prevent dialog from closing when Cloudinary widget is open
      if (isCloudinaryOpen) {
        e.preventDefault();
      }
    }}
  >
```

**Why This Matters:**
- Cloudinary widget has z-index: 200 (above dialog)
- Dialog backdrop would block clicks without `modal={false}`
- `onInteractOutside` prevents accidental closure during upload

**Trade-offs:**
- Loses some modal accessibility features
- Essential for widget functionality
- Focus trapping is manually implemented

---

## Photo Upload Widget Integration

### Widget Configuration

**Location:** `src/hooks/useCloudinaryUpload.ts`

The widget configuration is memoized to prevent unnecessary recreations:

```typescript
const widgetConfig = useMemo(() => {
  if (!eventSettings?.cloudinaryCloudName || !eventSettings?.cloudinaryUploadPreset) {
    return null;
  }

  const config: CloudinaryWidgetConfig = {
    cloudName: eventSettings.cloudinaryCloudName,
    uploadPreset: eventSettings.cloudinaryUploadPreset,
    sources: ['local', 'camera', 'url'],
    defaultSource: 'local',
    multiple: false,
    cropping: true,
    croppingShowDimensions: true,
    croppingCoordinatesMode: 'custom',
    showSkipCropButton: !eventSettings.cloudinaryDisableSkipCrop,
    folder: 'attendee-photos',
    clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp'],
    maxFileSize: 10485760, // 10MB
    maxImageWidth: 4000,
    maxImageHeight: 4000,
    theme: 'minimal',
    styles: {
      palette: {
        window: '#FFFFFF',
        windowBorder: '#90A0B3',
        tabIcon: '#8b5cf6',
        menuIcons: '#5A616A',
        textDark: '#000000',
        textLight: '#FFFFFF',
        link: '#8b5cf6',
        action: '#8b5cf6',
        inactiveTabIcon: '#0E2F5A',
        error: '#F44235',
        inProgress: '#8b5cf6',
        complete: '#20B832',
        sourceBg: '#E4EBF1'
      }
    },
    showAdvancedOptions: false,
    showPoweredBy: false
  };

  // Add aspect ratio if not "free"
  if (eventSettings.cloudinaryCropAspectRatio !== 'free') {
    config.croppingAspectRatio = parseFloat(eventSettings.cloudinaryCropAspectRatio);
  }

  return config;
}, [
  eventSettings?.cloudinaryCloudName,
  eventSettings?.cloudinaryUploadPreset,
  eventSettings?.cloudinaryCropAspectRatio,
  eventSettings?.cloudinaryDisableSkipCrop
]);
```

### Widget Lifecycle

1. **Initialization**
   ```typescript
   useEffect(() => {
     if (!widgetConfig || !window.cloudinary) return;
     
     // Destroy previous widget
     if (widgetRef.current) {
       widgetRef.current.destroy();
     }
     
     // Create new widget
     widgetRef.current = window.cloudinary.createUploadWidget(
       widgetConfig,
       handleUploadCallback
     );
     
     // Cleanup on unmount
     return () => {
       if (widgetRef.current) {
         widgetRef.current.destroy();
       }
     };
   }, [widgetConfig, handleUploadCallback]);
   ```

2. **Opening Widget**
   ```typescript
   const openUploadWidget = () => {
     if (!eventSettings?.cloudinaryCloudName || !eventSettings?.cloudinaryUploadPreset) {
       error("Error", "Cloudinary not configured.");
       return;
     }
     
     if (widgetRef.current) {
       setIsCloudinaryOpen(true);
       widgetRef.current.open();
     }
   };
   ```

3. **Upload Callback**
   ```typescript
   const handleUploadCallback = useCallback((
     uploadError: CloudinaryError | null,
     result: CloudinaryUploadResult
   ) => {
     setIsCloudinaryOpen(false);
     
     if (!uploadError && result?.event === 'success' && result.info) {
       onUploadSuccess(result.info.secure_url);
       success("Success", "Photo uploaded successfully!");
     } else if (uploadError) {
       error("Upload Error", uploadError.message);
     }
   }, [onUploadSuccess, success, error]);
   ```


### Widget Script Loading

The Cloudinary widget script must be loaded in the application:

**Location:** `src/pages/_document.tsx` or `public/index.html`

```html
<script 
  src="https://upload-widget.cloudinary.com/global/all.js" 
  type="text/javascript"
></script>
```

**Important:** The script must be loaded before the widget is initialized. Use `typeof window !== 'undefined' && window.cloudinary` to check availability.

### Configuration Options

| Option | Type | Description | Default |
|--------|------|-------------|---------|
| `cloudName` | string | Cloudinary cloud name | Required |
| `uploadPreset` | string | Upload preset name | Required |
| `sources` | string[] | Upload sources (local, camera, url) | ['local', 'camera', 'url'] |
| `multiple` | boolean | Allow multiple uploads | false |
| `cropping` | boolean | Enable cropping | true |
| `croppingAspectRatio` | number | Crop aspect ratio | 1 (square) |
| `showSkipCropButton` | boolean | Show skip crop button | true |
| `folder` | string | Upload folder path | 'attendee-photos' |
| `clientAllowedFormats` | string[] | Allowed file formats | ['jpg', 'jpeg', 'png', 'webp'] |
| `maxFileSize` | number | Max file size in bytes | 10485760 (10MB) |
| `maxImageWidth` | number | Max image width | 4000 |
| `maxImageHeight` | number | Max image height | 4000 |

---

## Replacing Cloudinary with Alternative Service

### Step-by-Step Replacement Guide

#### Phase 1: Evaluate Alternative Service

**Questions to Answer:**

1. **Upload Method**
   - Client-side widget? (like Cloudinary)
   - Direct API upload?
   - Pre-signed URL upload?

2. **Authentication**
   - API keys required?
   - OAuth tokens?
   - Pre-signed URLs?

3. **Features**
   - Image cropping?
   - Format conversion?
   - Optimization?
   - Thumbnails?

4. **URL Format**
   - Direct URLs?
   - CDN URLs?
   - Transformation parameters?

#### Phase 2: Database Schema

**Option A: Reuse Cloudinary Collection**

If the new service has similar configuration:

```typescript
// Rename collection and fields
interface NewServiceIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  
  // Rename fields to match new service
  accountId: string;          // was: cloudName
  uploadConfig: string;       // was: uploadPreset
  autoOptimize: boolean;
  generateThumbnails: boolean;
  disableSkipCrop: boolean;
  cropAspectRatio: string;
}
```

**Option B: Create New Collection**

If the new service has different requirements:

```typescript
interface NewServiceIntegration {
  $id: string;
  eventSettingsId: string;
  version: number;
  enabled: boolean;
  
  // Service-specific fields
  bucketName: string;
  region: string;
  accessLevel: string;
  // ... other fields
}
```

#### Phase 3: Backend Implementation

**File:** `src/lib/appwrite-integrations.ts`

1. **Add Interface**
   ```typescript
   export interface NewServiceIntegration {
     $id: string;
     eventSettingsId: string;
     version: number;
     enabled: boolean;
     // ... service-specific fields
   }
   ```

2. **Add Collection ID**
   ```typescript
   const NEW_SERVICE_COLLECTION_ID = 
     process.env.NEXT_PUBLIC_APPWRITE_NEW_SERVICE_COLLECTION_ID || 
     'new_service';
   ```

3. **Add Getter Function**
   ```typescript
   export async function getNewServiceIntegration(
     databases: Databases,
     eventSettingsId: string
   ): Promise<NewServiceIntegration | null> {
     // Follow Cloudinary pattern
   }
   ```

4. **Add Update Function**
   ```typescript
   export async function updateNewServiceIntegration(
     databases: Databases,
     eventSettingsId: string,
     data: Partial<Omit<NewServiceIntegration, '$id' | 'eventSettingsId' | 'version'>>,
     expectedVersion?: number
   ): Promise<NewServiceIntegration> {
     return updateIntegrationWithLocking<NewServiceIntegration>(
       databases,
       NEW_SERVICE_COLLECTION_ID,
       'NewService',
       eventSettingsId,
       data,
       expectedVersion,
       () => getNewServiceIntegration(databases, eventSettingsId)
     );
   }
   ```

5. **Update flattenEventSettings**
   ```typescript
   // Add to parallel fetch
   const [cloudinary, switchboard, oneSimpleApi, newService] = 
     await Promise.all([
       getCloudinaryIntegration(databases, eventSettingsId),
       getSwitchboardIntegration(databases, eventSettingsId),
       getOneSimpleApiIntegration(databases, eventSettingsId),
       getNewServiceIntegration(databases, eventSettingsId),
     ]);
   
   // Add to flattened output
   return {
     ...eventSettings,
     newServiceEnabled: newService?.enabled ?? false,
     newServiceAccountId: newService?.accountId ?? '',
     // ... other fields
   };
   ```


#### Phase 4: API Integration

**File:** `src/pages/api/event-settings/index.ts`

1. **Update extractIntegrationFields**
   ```typescript
   function extractIntegrationFields(formData: any) {
     return {
       // ... existing integrations
       newService: {
         enabled: formData.newServiceEnabled ?? false,
         accountId: formData.newServiceAccountId ?? '',
         uploadConfig: formData.newServiceUploadConfig ?? '',
         // ... other fields
       }
     };
   }
   ```

2. **Add Update Call**
   ```typescript
   // In PUT handler
   if (integrationFields.newService) {
     integrationUpdates.push(
       updateNewServiceIntegration(
         databases,
         eventSettingsId,
         integrationFields.newService
       ).catch((error) => {
         console.error('Failed to update NewService integration:', error);
         return null;
       })
     );
   }
   ```

#### Phase 5: Frontend UI

**File:** `src/components/EventSettingsForm/NewServiceTab.tsx`

Create a new tab component following the Cloudinary pattern:

```typescript
import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { IntegrationStatusIndicator } from '@/components/IntegrationStatusIndicator';

export const NewServiceTab = memo(function NewServiceTab({
  formData,
  onInputChange,
  integrationStatus
}: NewServiceTabProps) {
  const isReady = !!(
    formData.newServiceAccountId && 
    formData.newServiceUploadConfig && 
    integrationStatus?.newService
  );
  
  return (
    <div className="space-y-6">
      <IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />
      
      {/* Configuration fields */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Configuration</h4>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="newServiceAccountId">Account ID</Label>
          <Input
            id="newServiceAccountId"
            value={formData.newServiceAccountId || ""}
            onChange={(e) => onInputChange("newServiceAccountId", e.target.value)}
            placeholder="your-account-id"
          />
        </div>
        
        {/* Add more fields as needed */}
      </div>
    </div>
  );
});
```

**Add to IntegrationsTab:**

```typescript
// In src/components/EventSettingsForm/IntegrationsTab.tsx
import { NewServiceTab } from './NewServiceTab';

const tabs = [
  { id: 'cloudinary', label: 'Cloudinary', icon: Image },
  { id: 'newservice', label: 'New Service', icon: Upload }, // Add your tab
  // ... other tabs
];

{activeTab === 'newservice' && (
  <NewServiceTab
    formData={formData}
    onInputChange={onInputChange}
    integrationStatus={integrationStatus}
  />
)}
```

#### Phase 6: Upload Hook

**File:** `src/hooks/useNewServiceUpload.ts`

Create a new hook following the Cloudinary pattern:

```typescript
import { useState, useCallback } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface EventSettings {
  newServiceAccountId?: string;
  newServiceUploadConfig?: string;
  // ... other fields
}

interface UseNewServiceUploadProps {
  eventSettings?: EventSettings;
  onUploadSuccess: (url: string) => void;
}

export function useNewServiceUpload({ 
  eventSettings, 
  onUploadSuccess 
}: UseNewServiceUploadProps) {
  const { success, error } = useSweetAlert();
  const [isUploading, setIsUploading] = useState(false);

  const openUploadWidget = useCallback(async () => {
    if (!eventSettings?.newServiceAccountId || !eventSettings?.newServiceUploadConfig) {
      error("Error", "New Service not configured.");
      return;
    }

    setIsUploading(true);

    try {
      // Implement your upload logic here
      // This will vary based on the service:
      
      // Option 1: Client-side widget (like Cloudinary)
      // - Initialize widget
      // - Open widget
      // - Handle callback
      
      // Option 2: Direct API upload
      // - Get file from input
      // - Upload to service API
      // - Get URL from response
      
      // Option 3: Pre-signed URL upload
      // - Request pre-signed URL from backend
      // - Upload file to pre-signed URL
      // - Get final URL
      
      const photoUrl = "https://example.com/photo.jpg"; // Replace with actual URL
      
      onUploadSuccess(photoUrl);
      success("Success", "Photo uploaded successfully!");
    } catch (err) {
      error("Upload Error", err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
    }
  }, [eventSettings, onUploadSuccess, success, error]);

  return {
    isUploading,
    openUploadWidget
  };
}
```


#### Phase 7: Update AttendeeForm

**File:** `src/components/AttendeeForm/index.tsx`

Replace the Cloudinary hook with your new service hook:

```typescript
// Before:
// import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
// const { isCloudinaryOpen, openUploadWidget } = useCloudinaryUpload({
//   eventSettings,
//   onUploadSuccess: setPhotoUrl
// });

// After:
import { useNewServiceUpload } from '@/hooks/useNewServiceUpload';

const { isUploading, openUploadWidget } = useNewServiceUpload({
  eventSettings,
  onUploadSuccess: setPhotoUrl
});

// Update dialog interaction handling if needed
<Dialog open={isOpen} onOpenChange={handleDialogOpenChange} modal={!isUploading}>
  <DialogContent
    onInteractOutside={(e) => {
      if (isUploading) {
        e.preventDefault();
      }
    }}
  >
```

**Note:** The `PhotoUploadSection` component doesn't need changes - it's service-agnostic and only cares about the `photoUrl` string.

#### Phase 8: Environment Variables

Add environment variables for the new service:

```bash
# .env.local
NEW_SERVICE_API_KEY=your_api_key_here
NEW_SERVICE_API_SECRET=your_api_secret_here
NEXT_PUBLIC_APPWRITE_NEW_SERVICE_COLLECTION_ID=new_service
```

Update `.env.example`:

```bash
# New Service Integration
NEW_SERVICE_API_KEY=
NEW_SERVICE_API_SECRET=
NEXT_PUBLIC_APPWRITE_NEW_SERVICE_COLLECTION_ID=new_service
```

#### Phase 9: Database Setup

Run the setup script to create the new collection:

```bash
npm run setup:appwrite
```

Or manually create in Appwrite Console:
1. Create collection `new_service`
2. Add attributes (eventSettingsId, version, enabled, etc.)
3. Create index on `eventSettingsId`
4. Set permissions

---

## Testing Checklist

### Configuration Testing

- [ ] **Enable Integration**
  - Toggle integration on in Event Settings
  - Verify configuration saves correctly
  - Check integration status indicator shows "Ready"

- [ ] **Disable Integration**
  - Toggle integration off
  - Verify upload button is disabled or hidden
  - Check that existing photos still display

- [ ] **Invalid Configuration**
  - Leave required fields empty
  - Verify error messages display
  - Check that upload fails gracefully

### Upload Testing

- [ ] **Upload New Photo**
  - Click "Upload Photo" button
  - Select image file
  - Verify upload completes successfully
  - Check photo displays in form
  - Verify URL is saved to database

- [ ] **Change Existing Photo**
  - Upload initial photo
  - Click "Change Photo" button
  - Upload different image
  - Verify new photo replaces old one
  - Check URL is updated in database

- [ ] **Remove Photo**
  - Upload photo
  - Click "Remove Photo" button
  - Verify photo is removed
  - Check placeholder with initials displays
  - Verify URL is cleared in database

### File Format Testing

- [ ] **Supported Formats**
  - Test JPEG upload
  - Test PNG upload
  - Test WebP upload
  - Verify all formats work correctly

- [ ] **Unsupported Formats**
  - Try uploading GIF
  - Try uploading BMP
  - Try uploading TIFF
  - Verify appropriate error messages

### File Size Testing

- [ ] **Within Limits**
  - Upload 1MB file
  - Upload 5MB file
  - Upload 10MB file (max)
  - Verify all uploads succeed

- [ ] **Exceeds Limits**
  - Try uploading 15MB file
  - Try uploading 20MB file
  - Verify error message displays
  - Check upload is rejected

### Cropping Testing

- [ ] **Crop Enabled**
  - Upload photo with cropping enabled
  - Verify crop interface appears
  - Crop image
  - Verify cropped version is saved

- [ ] **Crop Disabled**
  - Disable cropping in settings
  - Upload photo
  - Verify no crop interface
  - Verify original image is saved

- [ ] **Aspect Ratio**
  - Set aspect ratio to 1:1 (square)
  - Upload and crop photo
  - Verify correct aspect ratio
  - Test other ratios (16:9, 4:3, etc.)

- [ ] **Skip Crop**
  - Enable "Skip Crop" button
  - Upload photo
  - Click "Skip Crop"
  - Verify original image is saved

- [ ] **Force Crop**
  - Disable "Skip Crop" button
  - Upload photo
  - Verify crop is required
  - Check "Skip Crop" button is hidden


### Optimization Testing

- [ ] **Auto-Optimize Enabled**
  - Enable auto-optimize in settings
  - Upload large photo
  - Verify optimized version is saved
  - Check file size is reduced

- [ ] **Auto-Optimize Disabled**
  - Disable auto-optimize
  - Upload photo
  - Verify original quality is maintained

- [ ] **Thumbnail Generation**
  - Enable thumbnail generation
  - Upload photo
  - Verify thumbnails are created
  - Check thumbnail URLs are accessible

### Integration Testing

- [ ] **Multiple Events**
  - Configure integration for Event A
  - Configure integration for Event B
  - Verify each event uses its own configuration
  - Check photos don't mix between events

- [ ] **Concurrent Uploads**
  - Open two attendee forms
  - Upload photos simultaneously
  - Verify both uploads succeed
  - Check no conflicts occur

- [ ] **Form Validation**
  - Try saving attendee without photo
  - Verify form saves successfully
  - Check photo is optional (unless required)

### Error Handling Testing

- [ ] **Network Errors**
  - Disconnect network
  - Try uploading photo
  - Verify error message displays
  - Reconnect and retry
  - Check upload succeeds

- [ ] **Service Errors**
  - Use invalid credentials
  - Try uploading photo
  - Verify error message displays
  - Fix credentials and retry

- [ ] **Timeout Errors**
  - Upload very large file
  - Wait for timeout
  - Verify timeout error displays
  - Check form remains usable

### Security Testing

- [ ] **Credentials Not Exposed**
  - Inspect network requests
  - Verify API keys not in requests
  - Check credentials not in database
  - Confirm environment variables used

- [ ] **URL Security**
  - Check photo URLs use HTTPS
  - Verify URLs are publicly accessible
  - Test URL expiration (if applicable)

### Performance Testing

- [ ] **Upload Speed**
  - Upload 1MB photo
  - Measure upload time
  - Verify reasonable performance
  - Check progress indicator works

- [ ] **Display Performance**
  - Load form with photo
  - Measure render time
  - Verify photo loads quickly
  - Check no layout shift

### Accessibility Testing

- [ ] **Keyboard Navigation**
  - Tab to upload button
  - Press Enter to open widget
  - Navigate widget with keyboard
  - Verify all actions accessible

- [ ] **Screen Reader**
  - Use screen reader
  - Navigate to photo section
  - Verify alt text is read
  - Check button labels are clear

- [ ] **Focus Management**
  - Open upload widget
  - Verify focus moves to widget
  - Close widget
  - Verify focus returns to button

---

## Photo URL Transformation and Optimization

### Cloudinary Transformations

Cloudinary URLs support transformation parameters for on-the-fly image manipulation:

#### Basic Transformations

**Original URL:**
```
https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/photo.jpg
```

**Resize to 300x400:**
```
https://res.cloudinary.com/cloud-name/image/upload/w_300,h_400,c_fill/v1234567890/folder/photo.jpg
```

**Generate Thumbnail (150x150):**
```
https://res.cloudinary.com/cloud-name/image/upload/w_150,h_150,c_thumb/v1234567890/folder/photo.jpg
```

**Auto-optimize Quality:**
```
https://res.cloudinary.com/cloud-name/image/upload/q_auto/v1234567890/folder/photo.jpg
```

**Convert to WebP:**
```
https://res.cloudinary.com/cloud-name/image/upload/f_webp/v1234567890/folder/photo.jpg
```

#### Transformation Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `w_` | Width in pixels | `w_300` |
| `h_` | Height in pixels | `h_400` |
| `c_` | Crop mode | `c_fill`, `c_thumb`, `c_scale` |
| `q_` | Quality | `q_auto`, `q_80` |
| `f_` | Format | `f_webp`, `f_jpg` |
| `g_` | Gravity | `g_face`, `g_center` |
| `r_` | Radius | `r_max` (circle) |
| `e_` | Effects | `e_grayscale`, `e_blur` |

#### Implementation Example

Create a helper function to generate transformed URLs:

```typescript
// src/lib/photoTransformations.ts

export function getPhotoUrl(
  originalUrl: string,
  options?: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'webp' | 'jpg' | 'png';
    crop?: 'fill' | 'thumb' | 'scale';
  }
): string {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl;
  }

  const { width, height, quality = 'auto', format, crop = 'fill' } = options || {};

  // Parse URL
  const parts = originalUrl.split('/upload/');
  if (parts.length !== 2) return originalUrl;

  // Build transformation string
  const transformations: string[] = [];
  
  if (width) transformations.push(`w_${width}`);
  if (height) transformations.push(`h_${height}`);
  if (crop) transformations.push(`c_${crop}`);
  if (quality) transformations.push(`q_${quality}`);
  if (format) transformations.push(`f_${format}`);

  const transformString = transformations.join(',');

  // Reconstruct URL
  return `${parts[0]}/upload/${transformString}/${parts[1]}`;
}

// Usage examples:
// Thumbnail: getPhotoUrl(url, { width: 150, height: 150, crop: 'thumb' })
// Optimized: getPhotoUrl(url, { quality: 'auto', format: 'webp' })
// Display: getPhotoUrl(url, { width: 800, height: 1000, crop: 'fill' })
```


### Alternative Service Transformations

#### AWS S3 with CloudFront

Use Lambda@Edge or CloudFront Functions for transformations:

```typescript
// CloudFront URL with transformation query params
const transformedUrl = `${originalUrl}?w=300&h=400&fit=cover`;
```

#### Azure Blob Storage with CDN

Use Azure CDN rules or Azure Functions:

```typescript
// Azure CDN URL with transformation
const transformedUrl = originalUrl.replace(
  '.blob.core.windows.net',
  '.azureedge.net'
) + '?width=300&height=400';
```

#### imgix

imgix provides URL-based transformations:

```typescript
// imgix transformation
const transformedUrl = `${originalUrl}?w=300&h=400&fit=crop&auto=format`;
```

### Optimization Best Practices

1. **Lazy Loading**
   ```typescript
   <img
     src={photoUrl}
     loading="lazy"
     alt="Attendee photo"
   />
   ```

2. **Responsive Images**
   ```typescript
   <img
     src={getPhotoUrl(photoUrl, { width: 800 })}
     srcSet={`
       ${getPhotoUrl(photoUrl, { width: 400 })} 400w,
       ${getPhotoUrl(photoUrl, { width: 800 })} 800w,
       ${getPhotoUrl(photoUrl, { width: 1200 })} 1200w
     `}
     sizes="(max-width: 768px) 100vw, 800px"
     alt="Attendee photo"
   />
   ```

3. **WebP with Fallback**
   ```typescript
   <picture>
     <source 
       srcSet={getPhotoUrl(photoUrl, { format: 'webp' })} 
       type="image/webp" 
     />
     <img 
       src={photoUrl} 
       alt="Attendee photo" 
     />
   </picture>
   ```

4. **Placeholder Images**
   ```typescript
   const [imageLoaded, setImageLoaded] = useState(false);
   
   <div className="relative">
     {!imageLoaded && (
       <div className="absolute inset-0 bg-gray-200 animate-pulse" />
     )}
     <img
       src={photoUrl}
       onLoad={() => setImageLoaded(true)}
       className={imageLoaded ? 'opacity-100' : 'opacity-0'}
       alt="Attendee photo"
     />
   </div>
   ```

---

## Migration Strategy for Existing Photos

### Scenario 1: Migrating from Cloudinary to Another Service

#### Step 1: Audit Existing Photos

```typescript
// Script: scripts/audit-photos.ts
import { databases } from '@/lib/appwrite';

async function auditPhotos() {
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    ATTENDEES_COLLECTION_ID,
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );

  const stats = {
    total: attendees.documents.length,
    cloudinary: 0,
    other: 0,
    broken: []
  };

  for (const attendee of attendees.documents) {
    const url = attendee.photoUrl;
    
    if (url.includes('cloudinary.com')) {
      stats.cloudinary++;
    } else {
      stats.other++;
    }

    // Test URL accessibility
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) {
        stats.broken.push({ id: attendee.$id, url });
      }
    } catch (error) {
      stats.broken.push({ id: attendee.$id, url, error: error.message });
    }
  }

  console.log('Photo Audit Results:', stats);
  return stats;
}
```

#### Step 2: Download Photos from Cloudinary

```typescript
// Script: scripts/download-photos.ts
import fs from 'fs';
import path from 'path';
import https from 'https';

async function downloadPhoto(url: string, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

async function downloadAllPhotos() {
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    ATTENDEES_COLLECTION_ID,
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );

  const downloadDir = './photo-migration';
  if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
  }

  for (const attendee of attendees.documents) {
    const url = attendee.photoUrl;
    if (!url.includes('cloudinary.com')) continue;

    const filename = path.join(downloadDir, `${attendee.$id}.jpg`);
    
    try {
      await downloadPhoto(url, filename);
      console.log(`Downloaded: ${attendee.$id}`);
    } catch (error) {
      console.error(`Failed to download ${attendee.$id}:`, error);
    }
  }
}
```

#### Step 3: Upload to New Service

```typescript
// Script: scripts/upload-to-new-service.ts
import fs from 'fs';
import path from 'path';

async function uploadToNewService(
  filePath: string,
  attendeeId: string
): Promise<string> {
  // Implement upload logic for your new service
  // This will vary based on the service
  
  // Example for AWS S3:
  // const s3 = new AWS.S3();
  // const fileContent = fs.readFileSync(filePath);
  // const params = {
  //   Bucket: 'your-bucket',
  //   Key: `attendee-photos/${attendeeId}.jpg`,
  //   Body: fileContent,
  //   ContentType: 'image/jpeg'
  // };
  // const result = await s3.upload(params).promise();
  // return result.Location;
  
  return 'https://new-service.com/photo.jpg';
}

async function migrateAllPhotos() {
  const downloadDir = './photo-migration';
  const files = fs.readdirSync(downloadDir);

  for (const file of files) {
    const attendeeId = path.basename(file, '.jpg');
    const filePath = path.join(downloadDir, file);

    try {
      // Upload to new service
      const newUrl = await uploadToNewService(filePath, attendeeId);

      // Update attendee record
      await databases.updateDocument(
        DATABASE_ID,
        ATTENDEES_COLLECTION_ID,
        attendeeId,
        { photoUrl: newUrl }
      );

      console.log(`Migrated: ${attendeeId}`);
    } catch (error) {
      console.error(`Failed to migrate ${attendeeId}:`, error);
    }
  }
}
```


#### Step 4: Verify Migration

```typescript
// Script: scripts/verify-migration.ts

async function verifyMigration() {
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    ATTENDEES_COLLECTION_ID,
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );

  const results = {
    total: attendees.documents.length,
    migrated: 0,
    notMigrated: 0,
    broken: []
  };

  for (const attendee of attendees.documents) {
    const url = attendee.photoUrl;

    // Check if URL is from new service
    if (url.includes('new-service.com')) {
      results.migrated++;

      // Verify URL is accessible
      try {
        const response = await fetch(url, { method: 'HEAD' });
        if (!response.ok) {
          results.broken.push({ id: attendee.$id, url, status: response.status });
        }
      } catch (error) {
        results.broken.push({ id: attendee.$id, url, error: error.message });
      }
    } else {
      results.notMigrated++;
    }
  }

  console.log('Migration Verification:', results);
  
  if (results.broken.length > 0) {
    console.error('Broken URLs:', results.broken);
  }

  return results;
}
```

#### Step 5: Rollback Plan

Keep Cloudinary URLs as backup during migration:

```typescript
// Add backup field to attendee schema
interface Attendee {
  id: string;
  photoUrl: string;
  photoUrlBackup?: string;  // Cloudinary URL backup
}

// During migration, save backup
await databases.updateDocument(
  DATABASE_ID,
  ATTENDEES_COLLECTION_ID,
  attendeeId,
  {
    photoUrlBackup: oldCloudinaryUrl,
    photoUrl: newServiceUrl
  }
);

// Rollback if needed
async function rollbackMigration() {
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    ATTENDEES_COLLECTION_ID,
    [Query.isNotNull('photoUrlBackup'), Query.limit(1000)]
  );

  for (const attendee of attendees.documents) {
    await databases.updateDocument(
      DATABASE_ID,
      ATTENDEES_COLLECTION_ID,
      attendee.$id,
      {
        photoUrl: attendee.photoUrlBackup,
        photoUrlBackup: null
      }
    );
  }

  console.log(`Rolled back ${attendees.documents.length} photos`);
}
```

### Scenario 2: Migrating Between Cloudinary Accounts

If you're moving to a different Cloudinary account:

```typescript
// Script: scripts/migrate-cloudinary-accounts.ts

async function migrateCloudinaryAccounts(
  oldCloudName: string,
  newCloudName: string
) {
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    ATTENDEES_COLLECTION_ID,
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );

  for (const attendee of attendees.documents) {
    const oldUrl = attendee.photoUrl;
    
    if (!oldUrl.includes(oldCloudName)) continue;

    // Replace cloud name in URL
    const newUrl = oldUrl.replace(
      `cloudinary.com/${oldCloudName}/`,
      `cloudinary.com/${newCloudName}/`
    );

    // Note: You'll need to copy the actual images to the new account
    // This just updates the URLs

    await databases.updateDocument(
      DATABASE_ID,
      ATTENDEES_COLLECTION_ID,
      attendee.$id,
      { photoUrl: newUrl }
    );

    console.log(`Updated: ${attendee.$id}`);
  }
}
```

### Scenario 3: URL Format Changes

If the new service uses a different URL format:

```typescript
// Script: scripts/transform-urls.ts

function transformUrl(oldUrl: string): string {
  // Example: Transform Cloudinary URL to S3 URL
  
  // Extract filename from Cloudinary URL
  const match = oldUrl.match(/\/([^/]+)\.(jpg|jpeg|png|webp)$/);
  if (!match) return oldUrl;
  
  const [, filename, extension] = match;
  
  // Construct new S3 URL
  return `https://bucket-name.s3.region.amazonaws.com/attendee-photos/${filename}.${extension}`;
}

async function transformAllUrls() {
  const attendees = await databases.listDocuments(
    DATABASE_ID,
    ATTENDEES_COLLECTION_ID,
    [Query.isNotNull('photoUrl'), Query.limit(1000)]
  );

  for (const attendee of attendees.documents) {
    const newUrl = transformUrl(attendee.photoUrl);

    await databases.updateDocument(
      DATABASE_ID,
      ATTENDEES_COLLECTION_ID,
      attendee.$id,
      { photoUrl: newUrl }
    );
  }
}
```

### Migration Best Practices

1. **Test on Staging First**
   - Run migration on staging environment
   - Verify all photos load correctly
   - Test upload functionality
   - Check performance

2. **Batch Processing**
   - Process photos in batches (e.g., 100 at a time)
   - Add delays between batches to avoid rate limits
   - Log progress for monitoring

3. **Error Handling**
   - Catch and log all errors
   - Continue processing on individual failures
   - Create error report for manual review

4. **Backup Everything**
   - Export all photo URLs before migration
   - Keep Cloudinary account active during transition
   - Maintain backup URLs in database

5. **Gradual Rollout**
   - Migrate one event at a time
   - Monitor for issues
   - Adjust process based on learnings

6. **Communication**
   - Notify users of migration schedule
   - Provide status updates
   - Document any downtime

---

## Troubleshooting

### Common Issues

#### Issue: Upload Widget Not Opening

**Symptoms:**
- Click upload button, nothing happens
- No error messages displayed

**Causes:**
- Widget script not loaded
- Configuration missing
- JavaScript errors

**Solutions:**
1. Check browser console for errors
2. Verify widget script is loaded: `console.log(window.cloudinary)`
3. Check event settings have required fields
4. Verify environment variables are set

#### Issue: Photos Not Displaying

**Symptoms:**
- Broken image icon
- Placeholder shows instead of photo
- Network errors in console

**Causes:**
- Invalid URL
- CORS issues
- Service outage
- Expired URLs

**Solutions:**
1. Test URL directly in browser
2. Check CORS configuration
3. Verify service status
4. Check URL expiration settings

#### Issue: Upload Fails Silently

**Symptoms:**
- Upload appears to complete
- No photo URL saved
- No error message

**Causes:**
- Callback not firing
- URL extraction failing
- Database update failing

**Solutions:**
1. Add console.log in upload callback
2. Check callback parameters
3. Verify database permissions
4. Test with simple upload

#### Issue: Cropping Not Working

**Symptoms:**
- Crop interface doesn't appear
- Skip crop button missing
- Aspect ratio incorrect

**Causes:**
- Cropping disabled in config
- Invalid aspect ratio value
- Widget version issue

**Solutions:**
1. Check `cropping: true` in config
2. Verify aspect ratio is valid number
3. Update widget script version
4. Test with default settings

### Getting Help

If you encounter issues not covered here:

1. **Check Documentation**
   - [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md)
   - [Integration Patterns Reference](./INTEGRATION_PATTERNS_REFERENCE.md)
   - [Integration Troubleshooting Guide](./INTEGRATION_TROUBLESHOOTING_GUIDE.md)

2. **Review Existing Code**
   - Study Cloudinary implementation
   - Check similar integrations
   - Look for patterns

3. **Test Incrementally**
   - Start with minimal configuration
   - Add features one at a time
   - Test after each change

4. **Ask for Help**
   - Provide error messages
   - Share configuration
   - Describe expected vs actual behavior

---

## Summary

This guide covered:

✅ Cloudinary integration architecture and patterns  
✅ Minimum configuration requirements for photo services  
✅ Photo URL storage and retrieval patterns  
✅ Integration points in AttendeeForm component  
✅ Photo upload widget integration details  
✅ Step-by-step guide for replacing Cloudinary  
✅ Comprehensive testing checklist  
✅ Photo URL transformation and optimization  
✅ Migration strategies for existing photos  

**Key Takeaways:**

1. Photo services integrate via normalized database collections
2. URLs are stored as simple strings in attendee records
3. Upload widgets can be client-side or server-side
4. Configuration is event-specific and version-controlled
5. Security requires environment variables for credentials
6. Migration requires careful planning and testing

**Next Steps:**

- Review [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md) for system overview
- Study [Integration Patterns Reference](./INTEGRATION_PATTERNS_REFERENCE.md) for code templates
- Follow [Adding New Integration Guide](./ADDING_NEW_INTEGRATION_GUIDE.md) for implementation
- Consult [Integration Security Guide](./INTEGRATION_SECURITY_GUIDE.md) for security best practices

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-20  
**Maintained By:** credential.studio Development Team

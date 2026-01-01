# Design Document: Mobile Settings Passcode

## Overview

This feature adds a 4-digit numerical passcode to the Access Control settings in Event Settings. The passcode provides an additional security layer for the mobile app's settings menu, ensuring only authorized staff can modify mobile app configurations. The passcode is stored in the Appwrite database and exposed through the Mobile API's event-info endpoint for consumption by the mobile application.

## Architecture

### System Components

```mermaid
graph TD
    A[Web UI - Access Control Tab] -->|Save| B[Event Settings API]
    B -->|Store| C[Appwrite Database]
    C -->|Retrieve| D[Mobile Event Info API]
    D -->|Response| E[Mobile App]
    E -->|Validate| F[Mobile Settings Menu]
```

### Data Flow

1. **Configuration Flow** (Web → Database):
   - Administrator enters 4-digit passcode in Access Control settings
   - Form validates passcode format (exactly 4 numerical digits)
   - Event Settings API stores passcode in `event_settings` collection
   - Cache is invalidated to ensure fresh data

2. **Consumption Flow** (Database → Mobile):
   - Mobile app requests event information via `/api/mobile/event-info`
   - API retrieves event settings including passcode
   - Mobile app receives passcode in response
   - Mobile app enforces passcode protection on settings menu

### Integration Points

- **Frontend**: `AccessControlTab.tsx` component
- **Backend**: Event Settings API (`/api/event-settings`)
- **Mobile API**: Event Info endpoint (`/api/mobile/event-info`)
- **Database**: Appwrite `event_settings` collection
- **Types**: `EventSettings` interface

## Components and Interfaces

### 1. Database Schema

**New Attribute in `event_settings` Collection:**

```typescript
{
  name: 'mobileSettingsPasscode',
  type: 'string',
  size: 4,
  required: false,
  default: null,
  array: false
}
```

**Rationale:**
- String type allows for leading zeros (e.g., "0123")
- Size of 4 enforces the 4-digit requirement at database level
- Optional field (not required) allows events without passcode protection
- Null default indicates no passcode is set

### 2. TypeScript Interfaces

**Update `EventSettings` Interface:**

```typescript
export interface EventSettings {
  // ... existing fields
  
  /** 4-digit numerical passcode for mobile app settings protection */
  mobileSettingsPasscode?: string | null;
}
```

### 3. Frontend Component

**AccessControlTab Component Updates:**

Add new passcode input field in the Access Control tab, positioned after the existing access control configuration:

```typescript
{/* Mobile Settings Passcode - Only visible when access control is enabled */}
{accessControlEnabled && (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Smartphone className="h-5 w-5" />
        Mobile App Security
      </CardTitle>
      <CardDescription>
        Configure security settings for the mobile scanning app
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="mobileSettingsPasscode" className="text-base font-medium">
          Settings Menu Passcode
        </Label>
        <Input
          id="mobileSettingsPasscode"
          type="text"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          value={formData.mobileSettingsPasscode || ''}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
            onInputChange("mobileSettingsPasscode", value || null);
          }}
          placeholder="Enter 4-digit code"
          className="w-48"
        />
        <p className="text-sm text-muted-foreground">
          Set a 4-digit code to protect the mobile app settings menu. Leave empty to disable passcode protection.
        </p>
      </div>
    </CardContent>
  </Card>
)}
```

**UI/UX Considerations:**
- Only visible when access control is enabled (logical grouping)
- Input restricted to 4 numerical digits
- Clear placeholder and help text
- Allows clearing (setting to null) to disable protection
- Uses `inputMode="numeric"` for mobile keyboard optimization
- Pattern validation for HTML5 form validation

### 4. Backend API Updates

**Event Settings API (`/api/event-settings`):**

The existing API already handles dynamic fields through the `updateData` object. No structural changes needed, but validation should be added:

```typescript
// Add validation for mobile settings passcode
if (updateData.mobileSettingsPasscode !== undefined) {
  // Validate passcode format if provided
  if (updateData.mobileSettingsPasscode !== null) {
    const passcodeRegex = /^[0-9]{4}$/;
    if (!passcodeRegex.test(updateData.mobileSettingsPasscode)) {
      return res.status(400).json({
        error: 'Invalid passcode format. Must be exactly 4 numerical digits.'
      });
    }
  }
}
```

**Mobile Event Info API (`/api/mobile/event-info`):**

Update the response to include the passcode:

```typescript
return res.status(200).json({
  success: true,
  data: {
    eventName: eventSettings.eventName || 'Event',
    eventDate: eventSettings.eventDate || null,
    eventLocation: eventSettings.eventLocation || null,
    eventTime: eventSettings.eventTime || null,
    timeZone: eventSettings.timeZone || null,
    mobileSettingsPasscode: eventSettings.mobileSettingsPasscode || null, // NEW
    updatedAt: eventSettings.$updatedAt
  }
});
```

### 5. Database Migration Script

**Create Appwrite Attribute:**

```typescript
// scripts/add-mobile-settings-passcode-attribute.ts
import { Client, Databases } from 'appwrite';

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!)
  .setKey(process.env.APPWRITE_API_KEY!);

const databases = new Databases(client);

async function addMobileSettingsPasscodeAttribute() {
  try {
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const collectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    console.log('Adding mobileSettingsPasscode attribute...');
    
    await databases.createStringAttribute(
      databaseId,
      collectionId,
      'mobileSettingsPasscode',
      4,           // size: exactly 4 characters
      false,       // required: false (optional field)
      null,        // default: null
      false        // array: false
    );

    console.log('✓ Successfully added mobileSettingsPasscode attribute');
    console.log('  - Type: string');
    console.log('  - Size: 4 characters');
    console.log('  - Required: false');
    console.log('  - Default: null');
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ Attribute already exists, skipping...');
    } else {
      console.error('✗ Error adding attribute:', error.message);
      throw error;
    }
  }
}

addMobileSettingsPasscodeAttribute()
  .then(() => {
    console.log('\n✓ Migration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });
```

## Data Models

### Event Settings Document

```typescript
{
  $id: string;
  eventName: string;
  eventDate: string;
  // ... other existing fields
  accessControlEnabled: boolean;
  accessControlTimeMode: 'date_only' | 'date_time';
  mobileSettingsPasscode: string | null; // NEW: "1234" or null
  $createdAt: string;
  $updatedAt: string;
}
```

### Mobile API Response

```typescript
{
  success: true,
  data: {
    eventName: string;
    eventDate: string | null;
    eventLocation: string | null;
    eventTime: string | null;
    timeZone: string | null;
    mobileSettingsPasscode: string | null; // NEW: "1234" or null
    updatedAt: string;
  }
}
```

## Error Handling

### Validation Errors

**Frontend Validation:**
- Input restricted to numerical characters only
- Maximum length enforced at 4 characters
- HTML5 pattern validation provides immediate feedback
- Empty value treated as null (no passcode)

**Backend Validation:**
```typescript
// Passcode format validation
if (mobileSettingsPasscode !== null && !/^[0-9]{4}$/.test(mobileSettingsPasscode)) {
  return res.status(400).json({
    error: 'INVALID_PASSCODE_FORMAT',
    message: 'Mobile settings passcode must be exactly 4 numerical digits (0-9)'
  });
}
```

### Database Errors

**Attribute Creation:**
- Handle 409 conflict if attribute already exists
- Validate environment variables before attempting creation
- Provide clear error messages for configuration issues

**Document Update:**
- Existing error handling in Event Settings API covers passcode updates
- Transaction support ensures atomic updates
- Cache invalidation on successful update

### API Errors

**Mobile Event Info API:**
- Existing error handling covers missing event settings
- Passcode field returns null if not set (no error)
- Maintains backward compatibility with existing mobile apps

## Testing Strategy

### Unit Tests

**Frontend Component Tests:**
```typescript
describe('AccessControlTab - Mobile Settings Passcode', () => {
  it('should render passcode input when access control is enabled', () => {
    // Test visibility based on accessControlEnabled
  });

  it('should validate passcode format (4 digits only)', () => {
    // Test input validation
  });

  it('should allow clearing passcode to disable protection', () => {
    // Test null value handling
  });

  it('should strip non-numerical characters from input', () => {
    // Test input sanitization
  });
});
```

**Backend API Tests:**
```typescript
describe('Event Settings API - Mobile Passcode', () => {
  it('should accept valid 4-digit passcode', async () => {
    // Test valid passcode: "1234"
  });

  it('should accept null to disable passcode', async () => {
    // Test null value
  });

  it('should reject passcode with less than 4 digits', async () => {
    // Test validation: "123"
  });

  it('should reject passcode with more than 4 digits', async () => {
    // Test validation: "12345"
  });

  it('should reject passcode with non-numerical characters', async () => {
    // Test validation: "12a4"
  });
});

describe('Mobile Event Info API - Passcode Field', () => {
  it('should include passcode in response when set', async () => {
    // Test passcode presence
  });

  it('should return null for passcode when not set', async () => {
    // Test null handling
  });

  it('should maintain backward compatibility', async () => {
    // Test response structure
  });
});
```

### Integration Tests

**End-to-End Flow:**
1. Set passcode in web UI
2. Verify passcode saved to database
3. Retrieve passcode via Mobile API
4. Verify correct value returned

**Cache Invalidation:**
1. Set passcode
2. Verify cache invalidated
3. Retrieve via Mobile API
4. Verify fresh data returned

### Manual Testing Checklist

**Web UI:**
- [ ] Passcode input only visible when access control enabled
- [ ] Can enter 4-digit passcode
- [ ] Non-numerical characters rejected
- [ ] Can clear passcode to disable
- [ ] Form saves successfully with passcode
- [ ] Form saves successfully without passcode
- [ ] Validation errors display correctly

**Mobile API:**
- [ ] Passcode returned when set
- [ ] Null returned when not set
- [ ] Response structure correct
- [ ] Backward compatible with existing apps

**Database:**
- [ ] Attribute created successfully
- [ ] Passcode stored correctly
- [ ] Null values handled correctly
- [ ] Updates work as expected

## Mobile App Implementation Prompt

### Overview for Mobile Development Team

We've added a new security feature to protect the mobile app's settings menu with a 4-digit passcode. This document provides everything you need to implement this feature in the mobile app.

### API Integration

**Endpoint:** `GET /api/mobile/event-info`

**Authentication:** Required (existing session-based auth)

**Response Structure:**
```json
{
  "success": true,
  "data": {
    "eventName": "My Event 2025",
    "eventDate": "2025-07-15T00:00:00.000Z",
    "eventLocation": "Convention Center",
    "eventTime": "9:00 AM",
    "timeZone": "America/New_York",
    "mobileSettingsPasscode": "1234",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**New Field:**
- `mobileSettingsPasscode`: `string | null`
  - Contains a 4-digit numerical code (e.g., "1234") when passcode protection is enabled
  - `null` when passcode protection is disabled
  - Always present in response (never undefined)

### Implementation Requirements

**1. Fetch Passcode on App Launch:**
```typescript
// Pseudo-code example
async function fetchEventInfo() {
  const response = await fetch('/api/mobile/event-info', {
    headers: {
      'Authorization': `Bearer ${sessionToken}`
    }
  });
  
  const { data } = await response.json();
  
  // Store passcode in app state/storage
  setMobileSettingsPasscode(data.mobileSettingsPasscode);
}
```

**2. Protect Settings Menu:**
```typescript
// Pseudo-code example
function openSettingsMenu() {
  const passcode = getMobileSettingsPasscode();
  
  if (passcode === null) {
    // No passcode protection - open settings directly
    navigateToSettings();
  } else {
    // Passcode protection enabled - show passcode prompt
    showPasscodePrompt(passcode);
  }
}
```

**3. Passcode Validation:**
```typescript
// Pseudo-code example
function validatePasscode(userInput: string, correctPasscode: string): boolean {
  // Simple string comparison
  return userInput === correctPasscode;
}

function showPasscodePrompt(correctPasscode: string) {
  // Show UI for entering 4-digit code
  const userInput = await promptForPasscode();
  
  if (validatePasscode(userInput, correctPasscode)) {
    // Correct passcode - open settings
    navigateToSettings();
  } else {
    // Incorrect passcode - show error
    showError('Incorrect passcode. Please try again.');
  }
}
```

### UI/UX Guidelines

**Passcode Input Screen:**
- Display 4 input boxes for digits (one per digit)
- Use numerical keyboard
- Show dots/asterisks for entered digits (security)
- Clear button to reset input
- Submit button or auto-submit after 4 digits
- Error message for incorrect passcode
- Cancel button to return to main screen

**User Experience:**
- Limit passcode attempts (e.g., 3 attempts before timeout)
- Provide clear error messages
- Consider biometric authentication as alternative (if supported)
- Cache successful authentication for session (don't ask repeatedly)

### Error Handling

**API Errors:**
```typescript
// Handle missing or invalid response
if (!data.mobileSettingsPasscode && data.mobileSettingsPasscode !== null) {
  // Field missing - treat as no passcode protection
  console.warn('mobileSettingsPasscode field missing from API response');
  setMobileSettingsPasscode(null);
}
```

**Network Errors:**
- Cache last known passcode value
- Allow offline access if passcode was previously validated
- Sync when connection restored

**Edge Cases:**
- Event settings updated while app running → Refresh on next app launch
- Passcode removed by admin → Next API call returns null, disable protection
- Passcode changed by admin → Next API call returns new code, require re-authentication

### Testing Checklist

**Functional Tests:**
- [ ] Passcode prompt appears when passcode is set
- [ ] Settings open directly when passcode is null
- [ ] Correct passcode grants access
- [ ] Incorrect passcode shows error
- [ ] Can retry after incorrect attempt
- [ ] Passcode input accepts only numerical digits
- [ ] Passcode input limited to 4 digits

**Integration Tests:**
- [ ] API returns passcode correctly
- [ ] API returns null correctly
- [ ] App handles API errors gracefully
- [ ] App handles network errors gracefully

**Security Tests:**
- [ ] Passcode not logged or exposed
- [ ] Passcode stored securely in app
- [ ] Passcode input masked (dots/asterisks)
- [ ] Attempt limiting works correctly

### Example API Requests

**Request:**
```http
GET /api/mobile/event-info HTTP/1.1
Host: your-domain.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Response (with passcode):**
```json
{
  "success": true,
  "data": {
    "eventName": "Tech Conference 2025",
    "eventDate": "2025-07-15T00:00:00.000Z",
    "eventLocation": "Convention Center",
    "eventTime": "9:00 AM",
    "timeZone": "America/New_York",
    "mobileSettingsPasscode": "5678",
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Response (without passcode):**
```json
{
  "success": true,
  "data": {
    "eventName": "Tech Conference 2025",
    "eventDate": "2025-07-15T00:00:00.000Z",
    "eventLocation": "Convention Center",
    "eventTime": "9:00 AM",
    "timeZone": "America/New_York",
    "mobileSettingsPasscode": null,
    "updatedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

### Security Considerations

**Best Practices:**
- Store passcode securely (encrypted storage if available)
- Clear passcode from memory when app backgrounds
- Don't log passcode values
- Use secure input methods (masked input)
- Implement attempt limiting to prevent brute force
- Consider session-based authentication (don't ask every time)

**Recommendations:**
- Add biometric authentication as alternative (Face ID, Touch ID, fingerprint)
- Allow "Remember me" option for trusted devices
- Provide admin override mechanism for locked-out users
- Log authentication attempts for audit purposes

### Support and Questions

For questions or issues during implementation:
1. Check the API response structure matches documentation
2. Verify authentication headers are correct
3. Test with both passcode-enabled and passcode-disabled scenarios
4. Contact backend team if API behavior differs from documentation

## Conclusion

This design provides a straightforward, secure implementation of mobile settings passcode protection. The feature integrates seamlessly with existing access control settings, follows established patterns in the codebase, and provides clear documentation for mobile app implementation.

Key benefits:
- Simple 4-digit passcode for ease of use
- Optional feature (can be disabled)
- Minimal database changes (single attribute)
- Backward compatible with existing mobile apps
- Clear validation and error handling
- Comprehensive mobile implementation guide

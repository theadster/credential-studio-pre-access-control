# Mobile App: Scan Log Upload Validation Error - localId Type Mismatch

## Issue Summary

When the mobile app attempts to upload scan logs, the server rejects the request with a validation error:

```
Invalid request body
- logs.0.localId: Expected string, received number
- logs.1.localId: Expected string, received number
- logs.2.localId: Expected string, received number
- logs.3.localId: Expected string, received number
```

The mobile app is sending `localId` as a **number** (e.g., `123456789`), but the server expects it to be a **string** (e.g., `"123456789"` or `"550e8400-e29b-41d4-a716-446655440000"`).

## Root Cause

The mobile app is generating or storing `localId` as a numeric value instead of a string. This causes the Zod validation schema to reject the request.

## Expected Format

According to the scan log schema (`src/types/scanLog.ts`), `localId` must be:

```typescript
localId: z.string().min(1, 'Local ID is required')
```

### Valid Examples
- ✅ `"550e8400-e29b-41d4-a716-446655440000"` (UUID)
- ✅ `"scan-2025-12-06-001"` (Custom string format)
- ✅ `"123456789"` (Numeric string)
- ✅ `"abc123def456"` (Alphanumeric string)

### Invalid Examples
- ❌ `123456789` (Number - causes the error)
- ❌ `null` (Must be a string)
- ❌ `""` (Empty string - minimum length is 1)

## What Needs to be Fixed in the Mobile App

### 1. Generate localId as a String

When creating a scan log record, ensure `localId` is generated as a string:

```typescript
// ❌ WRONG - generates a number
const localId = Date.now(); // Returns: 1733529613265 (number)

// ✅ CORRECT - generates a string
const localId = Date.now().toString(); // Returns: "1733529613265" (string)

// ✅ ALSO CORRECT - use UUID library
import { v4 as uuidv4 } from 'uuid';
const localId = uuidv4(); // Returns: "550e8400-e29b-41d4-a716-446655440000" (string)

// ✅ ALSO CORRECT - custom format
const localId = `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### 2. Ensure localId is Unique

Each scan log must have a unique `localId` for deduplication:

```typescript
// Generate unique ID for each scan
function generateLocalId(): string {
  // Option 1: Timestamp + random
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Option 2: UUID (requires uuid library)
  // return uuidv4();
  
  // Option 3: Device ID + timestamp + counter
  // return `${deviceId}-${Date.now()}-${scanCounter++}`;
}

// When creating a scan log
const scanLog = {
  localId: generateLocalId(), // Must be a string
  attendeeId: attendee?.id || null,
  barcodeScanned: barcode,
  result: 'approved' || 'denied',
  denialReason: denialReason || null,
  profileId: profile?.id || null,
  profileVersion: profile?.version || null,
  deviceId: getDeviceId(),
  scannedAt: new Date().toISOString(),
};
```

### 3. Verify Before Upload

Before uploading logs, ensure all `localId` values are strings:

```typescript
// Validate logs before upload
function validateLogsBeforeUpload(logs: any[]): boolean {
  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    
    // Check localId is a string
    if (typeof log.localId !== 'string') {
      console.error(`Log ${i}: localId must be a string, got ${typeof log.localId}`);
      return false;
    }
    
    // Check localId is not empty
    if (log.localId.length === 0) {
      console.error(`Log ${i}: localId cannot be empty`);
      return false;
    }
    
    // Check other required fields
    if (typeof log.barcodeScanned !== 'string') {
      console.error(`Log ${i}: barcodeScanned must be a string`);
      return false;
    }
    
    if (!['approved', 'denied'].includes(log.result)) {
      console.error(`Log ${i}: result must be 'approved' or 'denied'`);
      return false;
    }
    
    // Check denied scans have denial reason
    if (log.result === 'denied' && !log.denialReason) {
      console.error(`Log ${i}: denied scans must have a denialReason`);
      return false;
    }
  }
  
  return true;
}

// Before uploading
if (!validateLogsBeforeUpload(pendingLogs)) {
  console.error('Validation failed - fix logs before uploading');
  return;
}

// Upload logs
await uploadLogs(pendingLogs);
```

### 4. Handle Upload Response

When the server responds with validation errors, parse and display them:

```typescript
async function uploadLogs(logs: any[]): Promise<void> {
  try {
    const response = await fetch('/api/mobile/scan-logs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      if (response.status === 400 && errorData.error?.details) {
        // Validation error - show details
        console.error('Validation errors:');
        errorData.error.details.forEach((detail: any) => {
          console.error(`  ${detail.path}: ${detail.message}`);
        });
        
        // Example: logs.0.localId: Expected string, received number
        // This means the first log's localId is a number
        
        return;
      }
      
      throw new Error(`Upload failed: ${response.status} - ${JSON.stringify(errorData)}`);
    }
    
    const result = await response.json();
    console.log(`Upload successful: ${result.data.received} logs received, ${result.data.duplicates} duplicates`);
    
    // Clear uploaded logs from local storage
    await clearUploadedLogs();
    
  } catch (error) {
    console.error('Upload failed:', error);
    // Retry later
  }
}
```

## Complete Example: Scan Log Creation

Here's a complete example of how to create and upload scan logs correctly:

```typescript
import { v4 as uuidv4 } from 'uuid';

interface ScanLog {
  localId: string;           // ← MUST BE STRING
  attendeeId: string | null;
  barcodeScanned: string;
  result: 'approved' | 'denied';
  denialReason: string | null;
  profileId: string | null;
  profileVersion: number | null;
  deviceId: string;
  scannedAt: string;
}

// When a scan happens
function createScanLog(
  barcode: string,
  attendee: any,
  result: 'approved' | 'denied',
  denialReason: string | null,
  profile: any
): ScanLog {
  return {
    localId: uuidv4(), // ← Generate as string (UUID)
    attendeeId: attendee?.id || null,
    barcodeScanned: barcode,
    result,
    denialReason,
    profileId: profile?.id || null,
    profileVersion: profile?.version || null,
    deviceId: getDeviceId(), // Must return a string
    scannedAt: new Date().toISOString(), // ISO datetime string
  };
}

// Store locally
async function saveScanLog(log: ScanLog): Promise<void> {
  const logs = await getStoredLogs();
  logs.push(log);
  await storeLogsLocally(logs);
}

// Upload when connected
async function syncLogs(): Promise<void> {
  const logs = await getStoredLogs();
  
  if (logs.length === 0) {
    console.log('No logs to sync');
    return;
  }
  
  try {
    const response = await fetch('/api/mobile/scan-logs', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ logs }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Upload failed: ${JSON.stringify(error)}`);
    }
    
    const result = await response.json();
    console.log(`Synced ${result.data.received} logs`);
    
    // Clear uploaded logs
    await clearStoredLogs();
    
  } catch (error) {
    console.error('Sync failed:', error);
    // Logs remain in storage for retry
  }
}
```

## Web Backend Status

The web backend is **correctly configured**:

### ✅ Scan Log Upload Endpoint
- `POST /api/mobile/scan-logs` - Accepts batch uploads
- Validates all fields including `localId` type
- Returns clear validation error messages
- Stores logs with proper deduplication

### ✅ Validation Schema
- `src/types/scanLog.ts` - Defines exact schema
- `localId` must be a string
- Denied scans must have `denialReason`
- All datetime fields must be ISO 8601 format

### ✅ Error Handling
- Returns 400 with detailed validation errors
- Includes field path and error message
- Helps identify exactly which field is wrong

## Testing the Fix

After updating the mobile app:

1. **Create a scan log**
   - Verify `localId` is a string
   - Log the type: `console.log(typeof log.localId)` should be `"string"`

2. **Upload a single log**
   - Verify the upload succeeds
   - Check the response: `{ success: true, data: { received: 1, duplicates: 0, errors: [] } }`

3. **Upload multiple logs**
   - Create 5-10 scan logs
   - Upload them in a batch
   - Verify all are received

4. **Check deduplication**
   - Upload the same logs again
   - Verify they're marked as duplicates
   - Check the response: `{ received: 0, duplicates: 5, errors: [] }`

## Related Requirements

- **Requirement 10.1**: "WHEN a badge is scanned THEN the System SHALL create a local scan log record with timestamp, barcode, result, profile used, and denial reason if applicable"
- **Requirement 10.2**: "WHEN the device has connectivity THEN the System SHALL upload pending scan logs to the server"

## Files Involved

### Web Backend (Working Correctly)
- `src/types/scanLog.ts` - Type definitions and validation schema
- `src/pages/api/mobile/scan-logs.ts` - Upload endpoint
- `src/__tests__/lib/scanLog.property.test.ts` - Validation tests

### Mobile App (Needs Fix)
- Scan log creation - Must generate `localId` as string
- Local storage - Must store `localId` as string
- Upload service - Must validate types before uploading

## Notes

- `localId` is used for deduplication - each scan must have a unique ID
- The server stores `localId` to prevent duplicate uploads if the mobile app retries
- Use UUID or timestamp-based IDs for uniqueness
- Always convert numeric IDs to strings before uploading
- The validation error clearly shows which logs have the wrong type

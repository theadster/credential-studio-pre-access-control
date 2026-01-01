# Mobile App: DENIED Scan Results Not Uploading

## Issue Summary

When a badge scan is DENIED on the mobile app, the scanner correctly displays a red denial screen with the reason, but the scan log is never uploaded to the server. As a result, DENIED scans do not appear in the Access Control Scan Logs on the web dashboard.

## Root Cause

The mobile app (built with Rork/React Native) is not uploading scan logs for DENIED results. The web backend is correctly configured to receive and store both approved and denied scan logs via the `POST /api/mobile/scan-logs` endpoint.

## Expected Behavior

According to Requirement 10.1 and 10.2:
- **Every badge scan** (approved or denied) should create a local scan log record
- Scan logs should be uploaded to the server when connectivity is available
- DENIED scans must include a `denialReason` field

## What Needs to be Fixed

The mobile app's scan logging logic needs to be updated to:

### 1. Create Scan Logs for ALL Results
Currently, the app likely only creates logs for approved scans. It needs to create logs for both:
- ✅ Approved scans
- ❌ Denied scans (currently missing)

### 2. Include Denial Reasons
When a scan is denied, the log must include the `denialReason`:
- `"Access disabled"` - when `accessEnabled` is false
- `"Badge not yet valid (valid from: ...)"` - when current time is before `validFrom`
- `"Badge has expired (expired: ...)"` - when current time is after `validUntil`
- `"Access requirements not met"` - when approval profile rules fail
- `"Badge not found"` - when barcode doesn't exist in local data

### 3. Upload All Pending Logs
The sync service must upload all pending logs (both approved and denied) to the server:
```
POST /api/mobile/scan-logs
Content-Type: application/json

{
  "logs": [
    {
      "localId": "unique-id-1",
      "attendeeId": "attendee-123",
      "barcodeScanned": "ABC123",
      "result": "approved",
      "denialReason": null,
      "profileId": "profile-456",
      "profileVersion": 2,
      "deviceId": "device-789",
      "scannedAt": "2025-07-15T14:30:00Z"
    },
    {
      "localId": "unique-id-2",
      "attendeeId": "attendee-124",
      "barcodeScanned": "DEF456",
      "result": "denied",
      "denialReason": "Badge has expired (expired: Jul 14, 2025 11:59 PM)",
      "profileId": "profile-456",
      "profileVersion": 2,
      "deviceId": "device-789",
      "scannedAt": "2025-07-15T14:31:00Z"
    }
  ]
}
```

## Web Backend Status

The web backend is **fully implemented and working correctly**:

### ✅ Scan Log Upload Endpoint
- `POST /api/mobile/scan-logs` - Accepts batch uploads
- Handles deduplication using `localId`
- Stores both approved and denied results
- Includes denial reasons in the database

### ✅ Scan Log Viewer
- `GET /api/scan-logs` - Lists logs with filtering
- Supports filtering by `result` (approved/denied)
- Displays denial reasons
- Includes export functionality

### ✅ Database Schema
- `scan_logs` collection properly configured
- Stores all required fields including `denialReason`
- Indexes on `scannedAt`, `deviceId`, `operatorId`

## Testing the Fix

After updating the mobile app to upload DENIED scans:

1. Scan a badge that should be denied (e.g., expired badge)
2. Verify the red denial screen appears with the reason
3. Ensure the device has connectivity
4. Check the Access Control Scan Logs on the web dashboard
5. The DENIED scan should now appear with the denial reason

## Related Requirements

- **Requirement 10.1**: "WHEN a badge is scanned THEN the System SHALL create a local scan log record with timestamp, barcode, result, profile used, and denial reason if applicable"
- **Requirement 10.2**: "WHEN the device has connectivity THEN the System SHALL upload pending scan logs to the server"
- **Requirement 8.1-8.5**: Denial reasons must be captured and displayed

## Files Involved

### Web Backend (Working Correctly)
- `src/pages/api/mobile/scan-logs.ts` - Upload endpoint
- `src/pages/api/scan-logs/index.ts` - Viewer endpoint
- `src/types/scanLog.ts` - Type definitions
- `src/lib/scanEvaluation.ts` - Denial reason generation

### Mobile App (Needs Fix)
- Scan result handler - Must create logs for denied scans
- Sync service - Must upload all pending logs
- Local storage - Must persist denied scan logs

## Notes

- The web backend correctly handles empty `denialReason` for approved scans
- The mobile app should use the denial reasons from `scanEvaluation.ts` DENIAL_REASONS constants
- Scan logs are deduplicated by `localId` to prevent duplicates on retry

# Mobile App Builder Integration Checklist

Complete checklist for integrating credential.studio mobile APIs into your mobile app.

## Pre-Integration Setup

- [ ] Obtain valid JWT token from credential.studio authentication
- [ ] Confirm base URL: `https://your-domain.com/api/mobile`
- [ ] Verify user has required permissions:
  - [ ] `attendees.read` for attendee data
  - [ ] `approvalProfiles.read` for approval profiles
  - [ ] `scanLogs.write` for uploading scans
- [ ] Test connection with sample cURL command
- [ ] Review API documentation and quick reference

## API Integration

### 1. Event Information

- [ ] Implement GET `/event-info` endpoint call
- [ ] Display event name in app header
- [ ] Display event date, location, time if available
- [ ] Cache event info locally
- [ ] Refresh event info on app startup

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "eventName": "string",
    "eventDate": "string|null",
    "eventLocation": "string|null",
    "eventTime": "string|null",
    "timeZone": "string|null"
  }
}
```

### 2. Approval Profiles

- [ ] Implement GET `/sync/profiles` endpoint call
- [ ] Store profiles locally with version tracking
- [ ] Implement version comparison logic
- [ ] Only sync profiles with newer versions
- [ ] Parse and cache approval rules
- [ ] Handle profile deletion (isDeleted flag)

**Key Fields:**
- `id` - Profile identifier
- `version` - Version number for comparison
- `rules` - Approval logic (AND/OR conditions)
- `isDeleted` - Whether profile is deleted

**Version Comparison Logic:**
```
If local version < server version → Sync
If local version = server version → Skip
If profile not in local → Sync
```

### 3. Attendee Data

- [ ] Implement GET `/sync/attendees` endpoint call
- [ ] Store attendees locally
- [ ] Implement full sync on first launch
- [ ] Implement delta sync with `since` parameter
- [ ] Handle pagination (limit/offset)
- [ ] Cache custom field mappings

**Full Sync:**
```
GET /sync/attendees
```

**Delta Sync (after 1 hour):**
```
GET /sync/attendees?since=2024-01-15T09:30:00Z
```

**With Pagination:**
```
GET /sync/attendees?limit=50&offset=0
```

**Critical Fields:**
- `id` - Attendee identifier
- `barcodeNumber` - Barcode to scan
- `firstName`, `lastName` - Display name
- `photoUrl` - Photo if available
- `customFieldValues` - Custom data by field ID
- `customFieldValuesByName` - Custom data by display name
- `accessControl.accessEnabled` - **BOOLEAN** - Access permission
- `accessControl.validFrom` - Start of access window
- `accessControl.validUntil` - End of access window

### 4. Access Control Logic

- [ ] Check `accessControl.accessEnabled` is boolean
- [ ] Implement access window validation:
  - [ ] If `validFrom` exists, check current time >= validFrom
  - [ ] If `validUntil` exists, check current time <= validUntil
  - [ ] If both exist, check current time is within window
- [ ] Handle null values for validFrom/validUntil
- [ ] Implement fallback field search if needed:
  - [ ] `accessControl.enabled`
  - [ ] `accessControl.active`
  - [ ] `accessControl.isActive`
  - [ ] `accessControl.status`
  - [ ] `accessEnabled`
  - [ ] `access_enabled`
  - [ ] `enabled`
  - [ ] `active`
  - [ ] `isActive`
  - [ ] `is_active`
  - [ ] `status`
  - [ ] `activation.enabled`
  - [ ] `activation.active`
  - [ ] `activation.status`

**Recommended Access Check:**
```javascript
function isAccessAllowed(attendee) {
  // Check if access is enabled
  if (!attendee.accessControl.accessEnabled) {
    return false;
  }
  
  // Check activation window
  const now = new Date();
  
  if (attendee.accessControl.validFrom) {
    const validFrom = new Date(attendee.accessControl.validFrom);
    if (now < validFrom) {
      return false;
    }
  }
  
  if (attendee.accessControl.validUntil) {
    const validUntil = new Date(attendee.accessControl.validUntil);
    if (now > validUntil) {
      return false;
    }
  }
  
  return true;
}
```

### 5. Barcode Scanning

- [ ] Implement barcode scanner integration
- [ ] Call GET `/debug/attendee/{barcode}` for single lookup
- [ ] Display attendee information
- [ ] Evaluate approval rules against attendee data
- [ ] Show approval/denial result

**Debug Endpoint:**
```
GET /debug/attendee/3266565
```

**Response:**
```json
{
  "id": "string",
  "barcodeNumber": "string",
  "firstName": "string",
  "lastName": "string",
  "photoUrl": "string|null",
  "customFieldValues": {},
  "customFieldValuesByName": {},
  "accessControl": {
    "accessEnabled": boolean,
    "validFrom": "ISO8601|null",
    "validUntil": "ISO8601|null"
  },
  "updatedAt": "ISO8601"
}
```

### 6. Scan Log Upload

- [ ] Generate unique `localId` for each scan
- [ ] Collect scan data:
  - [ ] `localId` - Unique identifier
  - [ ] `attendeeId` - Attendee ID (if found)
  - [ ] `barcodeScanned` - Barcode that was scanned
  - [ ] `result` - "approved" or "denied"
  - [ ] `denialReason` - Reason if denied
  - [ ] `profileId` - Profile used for evaluation
  - [ ] `profileVersion` - Profile version used
  - [ ] `deviceId` - Mobile device identifier
  - [ ] `scannedAt` - ISO 8601 timestamp
- [ ] Batch scans locally
- [ ] Upload batch via POST `/scan-logs`
- [ ] Handle deduplication (duplicates count in response)
- [ ] Retry failed uploads

**Upload Request:**
```json
{
  "logs": [
    {
      "localId": "scan-001",
      "attendeeId": "attendee-1",
      "barcodeScanned": "12345",
      "result": "approved",
      "denialReason": null,
      "profileId": "profile-1",
      "profileVersion": 1,
      "deviceId": "device-001",
      "scannedAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Upload Response:**
```json
{
  "success": true,
  "data": {
    "received": 10,
    "duplicates": 0,
    "errors": []
  }
}
```

## Data Synchronization Strategy

### Initial Setup
```
1. Get event info
2. Sync all profiles (no versions parameter)
3. Sync all attendees (no since parameter)
4. Cache all data locally
```

### Periodic Sync (every 1 hour)
```
1. Sync profiles with version comparison
2. Sync attendees with since parameter
3. Update local cache
```

### On-Demand Sync
```
1. User initiates manual sync
2. Perform full sync of both profiles and attendees
3. Update local cache
4. Show sync status to user
```

### Offline Support
```
1. Cache all data locally
2. Use cached data when offline
3. Queue scan logs for upload
4. Upload queued logs when online
```

## Error Handling

- [ ] Handle 400 Bad Request (invalid parameters)
  - [ ] Validate ISO 8601 timestamps
  - [ ] Validate JSON parameters
  - [ ] Show user-friendly error message

- [ ] Handle 403 Forbidden (insufficient permissions)
  - [ ] Check user role
  - [ ] Request additional permissions if needed
  - [ ] Show permission error to user

- [ ] Handle 404 Not Found (attendee not found)
  - [ ] Show "Attendee not found" message
  - [ ] Suggest checking barcode
  - [ ] Allow retry

- [ ] Handle 405 Method Not Allowed
  - [ ] Verify correct HTTP method
  - [ ] Check API documentation

- [ ] Handle 500 Server Error
  - [ ] Implement retry logic
  - [ ] Show error message
  - [ ] Log error for debugging

- [ ] Handle network errors
  - [ ] Implement exponential backoff
  - [ ] Queue requests for retry
  - [ ] Show offline indicator

## Performance Optimization

- [ ] Implement local caching
  - [ ] Cache attendees locally
  - [ ] Cache profiles locally
  - [ ] Cache event info locally
  - [ ] Cache custom field mappings

- [ ] Implement pagination
  - [ ] Use limit parameter (50-100 recommended)
  - [ ] Implement offset-based pagination
  - [ ] Show loading indicator during pagination

- [ ] Implement delta sync
  - [ ] Track last sync timestamp
  - [ ] Use `since` parameter for incremental sync
  - [ ] Reduce bandwidth usage

- [ ] Batch operations
  - [ ] Batch scan log uploads (10-50 per batch)
  - [ ] Batch profile version checks
  - [ ] Reduce network requests

- [ ] Optimize data transfer
  - [ ] Use gzip compression
  - [ ] Minimize payload size
  - [ ] Cache responses

## Security Considerations

- [ ] Store JWT token securely
  - [ ] Use secure storage (Keychain/Keystore)
  - [ ] Don't log token
  - [ ] Refresh token before expiry

- [ ] Validate SSL certificates
  - [ ] Implement certificate pinning if needed
  - [ ] Verify HTTPS connection

- [ ] Protect local data
  - [ ] Encrypt sensitive data locally
  - [ ] Use secure database
  - [ ] Clear data on logout

- [ ] Validate API responses
  - [ ] Check response structure
  - [ ] Validate data types
  - [ ] Handle unexpected responses

## Testing Checklist

### Unit Tests
- [ ] Test access control logic
- [ ] Test timestamp validation
- [ ] Test barcode parsing
- [ ] Test data caching
- [ ] Test error handling

### Integration Tests
- [ ] Test API connectivity
- [ ] Test authentication flow
- [ ] Test data synchronization
- [ ] Test scan log upload
- [ ] Test offline functionality

### Manual Testing
- [ ] Test with valid JWT token
- [ ] Test with invalid token (403)
- [ ] Test with missing attendee (404)
- [ ] Test with network errors
- [ ] Test with large datasets
- [ ] Test pagination
- [ ] Test delta sync
- [ ] Test scan log upload
- [ ] Test offline mode
- [ ] Test access control logic

### Test Scenarios
- [ ] Attendee with accessEnabled = true and valid date range
- [ ] Attendee with accessEnabled = false
- [ ] Attendee with activation window (validFrom and validUntil)
- [ ] Attendee outside activation window
- [ ] Missing attendee (404 response)
- [ ] Duplicate scan logs
- [ ] Network timeout
- [ ] Invalid JWT token
- [ ] Insufficient permissions

## Deployment Checklist

- [ ] Update base URL to production domain
- [ ] Verify JWT token generation
- [ ] Test all endpoints in production
- [ ] Implement error logging
- [ ] Implement analytics
- [ ] Set up monitoring
- [ ] Create user documentation
- [ ] Train support team
- [ ] Plan rollout strategy

## Documentation

- [ ] Review API Quick Reference
- [ ] Review Testing Guide
- [ ] Review Implementation Summary
- [ ] Document any custom modifications
- [ ] Create user guide for app
- [ ] Create troubleshooting guide

## Support Resources

- **Quick Reference:** `MOBILE_API_QUICK_REFERENCE.md`
- **Testing Guide:** `MOBILE_API_TESTING_GUIDE.md`
- **Implementation Summary:** `MOBILE_API_IMPLEMENTATION_SUMMARY.md`
- **Base URL:** `https://your-domain.com/api/mobile`
- **Authentication:** Bearer token (JWT)

## Common Issues & Solutions

### Issue: 403 Forbidden
**Solution:**
- Verify JWT token is valid
- Check user role has required permissions
- Verify user is authenticated

### Issue: 404 Not Found (Attendee)
**Solution:**
- Verify barcode is correct
- Check attendee exists in system
- Try debug endpoint to verify

### Issue: Empty Attendee List
**Solution:**
- Verify attendees exist in database
- Check `since` parameter is not in future
- Verify user has read permission

### Issue: Duplicate Scan Logs
**Solution:**
- Ensure unique `localId` for each scan
- Check deduplication is working
- Verify `localId` format is consistent

### Issue: Slow Sync
**Solution:**
- Implement pagination
- Use delta sync with `since` parameter
- Reduce batch size
- Check network connection

## Sign-Off

- [ ] All endpoints tested and working
- [ ] Error handling implemented
- [ ] Performance optimized
- [ ] Security measures in place
- [ ] Documentation reviewed
- [ ] Team trained
- [ ] Ready for production deployment

---

**Last Updated:** 2024-01-15
**API Version:** 1.0
**Status:** Production Ready

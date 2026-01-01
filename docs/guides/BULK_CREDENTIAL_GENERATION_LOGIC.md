---
title: "Bulk Credential Generation Logic"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/pages/api/attendees/"]
---

# Bulk Credential Generation Logic

## Overview
The bulk credential generation feature intelligently determines which attendees need their credentials generated or regenerated based on credential status (CURRENT vs OUTDATED).

## Credential Status Logic

### When a Credential is Considered CURRENT
A credential is considered **CURRENT** and will be **skipped** during bulk generation if:

1. **Recent Generation**: The credential was generated at approximately the same time as the last record update
   - Uses a 5-second tolerance window to account for processing time
   - Formula: `|credentialGeneratedAt - updatedAt| <= 5000ms`

2. **Future Generation**: The credential was generated AFTER the last record update
   - This can happen if only the credential was regenerated without other changes
   - Formula: `credentialGeneratedAt > updatedAt`

### When a Credential is Considered OUTDATED
A credential is considered **OUTDATED** and will be **regenerated** during bulk generation if:

1. **No Credential**: The attendee has no credential URL at all
   - `!credentialUrl || credentialUrl.trim() === ''`

2. **Missing Timestamp**: The credential exists but has no generation timestamp
   - This handles legacy data from before timestamps were tracked
   - `credentialUrl exists && !credentialGeneratedAt`

3. **Outdated Credential**: The credential was generated BEFORE the last record update
   - Indicates the attendee data has changed since credential generation
   - Formula: `credentialGeneratedAt < updatedAt` (with 5-second tolerance)

## Implementation

### Location
`src/pages/dashboard.tsx` - `handleBulkGenerateCredentials()` function

### Code Flow

```typescript
const attendeesNeedingCredentials = selectedAttendeesData.filter(attendee => {
  // 1. No credential at all - NEEDS GENERATION
  if (!attendee.credentialUrl || attendee.credentialUrl.trim() === '') {
    return true;
  }
  
  // 2. Has credential but no generation timestamp - OUTDATED (legacy data)
  if (!attendee.credentialGeneratedAt) {
    return true;
  }
  
  // 3. Has credential with timestamp - check if it's outdated
  if (attendee.updatedAt) {
    const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
    const recordUpdatedAt = new Date(attendee.updatedAt);
    
    const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
    const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance

    if (isCredentialFromSameUpdate) {
      return false; // CURRENT - skip
    } else if (credentialGeneratedAt > recordUpdatedAt) {
      return false; // CURRENT - skip
    } else {
      return true; // OUTDATED - regenerate
    }
  }
  
  // Has credential and timestamp but no updatedAt (shouldn't happen) - treat as current
  return false;
});
```

## User Experience

### Bulk Generation Process

1. **User selects attendees** from the dashboard
2. **System filters** to find attendees needing credentials:
   - Attendees with no credentials
   - Attendees with outdated credentials
3. **User is notified** if all selected attendees have current credentials
4. **Progress modal** shows generation progress for each attendee
5. **Summary** displays success/error counts

### Notification Messages

**All Current:**
```
Title: "All Selected Attendees Have Current Credentials"
Description: "All selected attendees already have current credentials generated."
```

**Some Need Generation:**
- Progress modal shows: "Generating credentials for X attendees..."
- Current attendee being processed is displayed
- Progress bar shows completion percentage

## Why the 5-Second Tolerance?

The 5-second tolerance window accounts for:

1. **Processing Time**: The time between when the credential is generated and when the database record is updated
2. **Network Latency**: Delays in API calls and database operations
3. **Timestamp Precision**: Minor differences in timestamp recording
4. **Concurrent Operations**: Multiple updates happening in quick succession

Without this tolerance, credentials generated as part of the same update operation might be incorrectly flagged as outdated.

## Database Fields

### Required Fields for Status Determination

1. **credentialUrl** (string): The URL of the generated credential image
2. **credentialGeneratedAt** (ISO 8601 string): Timestamp when credential was generated
3. **updatedAt** (ISO 8601 string): Timestamp when record was last updated (Appwrite automatic)

### Field Updates During Generation

When a credential is generated via `/api/attendees/[id]/generate-credential`:

```typescript
await databases.updateDocument(dbId, attendeesCollectionId, id, {
  credentialUrl,
  credentialGeneratedAt: new Date().toISOString()
});
```

This update also triggers Appwrite to update the `updatedAt` field automatically.

## Related Features

### Bulk PDF Export
The bulk PDF export feature (`/api/attendees/bulk-export-pdf`) uses similar logic:

- **Requires**: All attendees must have credentials
- **Checks**: Credentials must be CURRENT (not outdated)
- **Errors**: Returns specific error types:
  - `missing_credentials`: Some attendees have no credentials
  - `outdated_credentials`: Some attendees have outdated credentials

### Single Credential Generation
Individual credential generation always regenerates regardless of status:

- User explicitly requests generation
- No status check is performed
- Always updates both `credentialUrl` and `credentialGeneratedAt`

## Edge Cases Handled

### 1. Legacy Data (No Timestamp)
**Scenario**: Attendee has credential but no `credentialGeneratedAt`
**Handling**: Treat as OUTDATED and regenerate
**Reason**: Ensures all credentials have proper timestamps going forward

### 2. Manual URL Updates
**Scenario**: Admin manually updates `credentialUrl` without generating
**Handling**: If no timestamp, treated as OUTDATED
**Reason**: Prevents invalid credentials from being considered current

### 3. Concurrent Updates
**Scenario**: Multiple users editing same attendee
**Handling**: 5-second tolerance prevents false positives
**Reason**: Allows for processing delays without incorrect status

### 4. Time Zone Differences
**Scenario**: Server and client in different time zones
**Handling**: All timestamps use ISO 8601 UTC format
**Reason**: Consistent comparison regardless of location

## Testing Scenarios

### Test Case 1: New Attendee (No Credential)
- **Setup**: Create attendee without generating credential
- **Expected**: Included in bulk generation
- **Status**: NEEDS GENERATION

### Test Case 2: Current Credential
- **Setup**: Generate credential, don't modify attendee
- **Expected**: Skipped in bulk generation
- **Status**: CURRENT

### Test Case 3: Outdated Credential
- **Setup**: Generate credential, then edit attendee name
- **Expected**: Included in bulk generation
- **Status**: OUTDATED

### Test Case 4: Legacy Credential
- **Setup**: Attendee with credential but no timestamp
- **Expected**: Included in bulk generation
- **Status**: OUTDATED (legacy)

### Test Case 5: All Current
- **Setup**: Select multiple attendees with current credentials
- **Expected**: Show "all current" message, no generation
- **Status**: ALL CURRENT

## Performance Considerations

### Filtering Performance
- Filtering happens client-side on already-loaded data
- No additional API calls required for status determination
- O(n) complexity where n = number of selected attendees

### Generation Performance
- Credentials generated sequentially (not parallel)
- Prevents overwhelming the Switchboard API
- Progress updates after each credential
- Typical time: 2-5 seconds per credential

## Future Improvements

1. **Parallel Generation**: Generate multiple credentials simultaneously with rate limiting
2. **Smart Batching**: Group attendees by credential status for better UX
3. **Dry Run Mode**: Preview which attendees will be regenerated before starting
4. **Status Indicator**: Show credential status (CURRENT/OUTDATED) in the UI
5. **Auto-Regeneration**: Option to automatically regenerate outdated credentials on save
6. **Credential History**: Track all credential generations with full history

## Related Documentation

- [Credential Generation Fixes](../fixes/CREDENTIAL_GENERATION_FIXES_SUMMARY.md)
- [Credential Status Fix](../fixes/CREDENTIAL_STATUS_FIX.md)
- [Switchboard Configuration Guide](./SWITCHBOARD_CONFIGURATION_GUIDE.md)

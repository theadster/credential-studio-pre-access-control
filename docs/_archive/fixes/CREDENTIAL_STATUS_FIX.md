# Credential Status Fix - CURRENT vs OUTDATED

## Issue

After generating a credential, the status immediately showed as "OUTDATED" instead of "CURRENT".

## Root Cause

The credential status logic compares two timestamps:
- `credentialGeneratedAt` - When the credential was generated
- `updatedAt` / `$updatedAt` - When the attendee record was last updated

The problem was a timing mismatch:

1. We set `credentialGeneratedAt = new Date()` (e.g., `10:00:00.000Z`)
2. We call `updateDocument()` to save the credential URL
3. Appwrite automatically sets `$updatedAt` when the update completes
4. Due to processing time, `$updatedAt` was a few milliseconds AFTER `credentialGeneratedAt`
5. The comparison logic saw: `credentialGeneratedAt < $updatedAt` → "OUTDATED"

Even though there was a 5-second tolerance, the timestamps were being set at different times, causing the issue.

## Solution

### 1. Use Consistent Timestamps

Changed the credential generation to use the same timestamp string for both:

**Before:**
```typescript
const now = new Date();
const updatedAttendee = await databases.updateDocument(dbId, collectionId, id, {
  credentialUrl,
  credentialGeneratedAt: now.toISOString()
});
```

**After:**
```typescript
const now = new Date().toISOString();
const updatedAttendee = await databases.updateDocument(dbId, collectionId, id, {
  credentialUrl,
  credentialGeneratedAt: now
});
```

### 2. Return Appwrite's Actual Update Timestamp

Include `$updatedAt` from Appwrite in the API response:

```typescript
return res.status(200).json({
  success: true,
  credentialUrl,
  generatedAt: now,
  updatedAt: updatedAttendee.$updatedAt, // Appwrite's actual timestamp
  attendee: updatedAttendee
});
```

### 3. Update Dashboard State with Correct Timestamp

Use the returned `$updatedAt` instead of creating a new timestamp:

**Before:**
```typescript
setAttendees(prev => prev.map(a => 
  a.id === attendeeId 
    ? { ...a, credentialUrl: result.credentialUrl, credentialGeneratedAt: result.generatedAt, updatedAt: new Date().toISOString() }
    : a
));
```

**After:**
```typescript
setAttendees(prev => prev.map(a => 
  a.id === attendeeId 
    ? { 
        ...a, 
        credentialUrl: result.credentialUrl, 
        credentialGeneratedAt: result.generatedAt,
        $updatedAt: result.updatedAt || result.generatedAt
      }
    : a
));
```

### 4. Use Appwrite's Timestamp in Status Logic

Updated the status comparison to use `$updatedAt`:

```typescript
const getCredentialStatus = (attendee: Attendee) => {
  if (!attendee.credentialUrl || !attendee.credentialGeneratedAt) {
    return null;
  }

  const credentialGeneratedAt = new Date(attendee.credentialGeneratedAt);
  // Use $updatedAt from Appwrite if available
  const updatedAtField = (attendee as any).$updatedAt || attendee.updatedAt;
  const recordUpdatedAt = new Date(updatedAtField);

  const timeDifference = Math.abs(credentialGeneratedAt.getTime() - recordUpdatedAt.getTime());
  const isCredentialFromSameUpdate = timeDifference <= 5000; // 5 seconds tolerance

  if (isCredentialFromSameUpdate) {
    return 'current';
  } else if (credentialGeneratedAt > recordUpdatedAt) {
    return 'current';
  } else {
    return 'outdated';
  }
};
```

## Files Modified

1. **src/pages/api/attendees/[id]/generate-credential.ts**
   - Use consistent timestamp string
   - Return `$updatedAt` in response

2. **src/pages/dashboard.tsx**
   - Update state with `$updatedAt` from API response
   - Use `$updatedAt` in status comparison logic
   - Applied to both single and bulk credential generation

## How It Works Now

### Timeline of Events

1. **T+0ms**: Generate credential, set `credentialGeneratedAt = "2025-01-10T10:00:00.000Z"`
2. **T+0ms**: Call `updateDocument()` with `credentialGeneratedAt`
3. **T+5ms**: Appwrite completes update, sets `$updatedAt = "2025-01-10T10:00:00.005Z"`
4. **T+5ms**: API returns both timestamps
5. **T+5ms**: Dashboard updates state with both timestamps
6. **T+5ms**: Status logic compares: `|10:00:00.000 - 10:00:00.005| = 5ms < 5000ms` → "CURRENT" ✓

### Status Logic

The credential is considered "CURRENT" if:
- Generated within 5 seconds of the last update (same update), OR
- Generated AFTER the last update

The credential is "OUTDATED" if:
- Generated BEFORE the last update (record was edited after credential was generated)

## Testing

After this fix:
1. ✅ Generate a credential → Status shows "CURRENT"
2. ✅ Edit the attendee → Status changes to "OUTDATED"
3. ✅ Regenerate credential → Status returns to "CURRENT"
4. ✅ Bulk generate credentials → All show "CURRENT"

## Why This Matters

The CURRENT/OUTDATED status is important for:
- **PDF Export**: Prevents exporting outdated credentials
- **Bulk Operations**: Identifies which attendees need credential regeneration
- **Data Integrity**: Ensures credentials match current attendee data
- **User Experience**: Clear visual indicator of credential freshness

## Related Logic

The same status logic is used in:
- Dashboard credential status badges
- Bulk PDF export validation
- Bulk credential generation filtering

All of these now work correctly with the Appwrite timestamp handling.

## Status: ✅ FIXED

Credentials now correctly show as "CURRENT" immediately after generation, and only show as "OUTDATED" when the attendee record is actually edited after the credential was generated.

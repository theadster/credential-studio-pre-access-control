# Log Settings Update Display Fix

## Date
January 9, 2025

## Problem
When updating log settings, the activity log entry showed:
1. **Type**: `log_settings` instead of proper category
2. **Target**: Not clearly labeled as "Log Settings"
3. **Details**: Showed all settings in the request body, not just what changed
4. **Format**: Didn't show the before/after values for changed settings

## Solution

### 1. Fixed Log Creation (`src/pages/api/log-settings/index.ts`)

**Before:**
```typescript
await databases.createDocument(
  dbId,
  logsCollectionId,
  ID.unique(),
  {
    userId: user.$id,
    action: 'update',
    details: JSON.stringify({
      type: 'log_settings',
      changes: req.body  // All settings, not just changes
    })
  }
);
```

**After:**
```typescript
// Detect what actually changed
const oldSettings = existingSettingsResult.documents.length > 0 
  ? existingSettingsResult.documents[0] 
  : DEFAULT_LOG_SETTINGS;

const changes: Record<string, { from: boolean; to: boolean }> = {};
for (const field of fields) {
  const oldValue = oldSettings[field] ?? DEFAULT_LOG_SETTINGS[field];
  const newValue = req.body[field] ?? oldValue;
  if (oldValue !== newValue) {
    changes[field] = { from: oldValue, to: newValue };
  }
}

// Only log if there were actual changes
if (Object.keys(changes).length > 0) {
  await databases.createDocument(
    dbId,
    logsCollectionId,
    ID.unique(),
    {
      userId: user.$id,
      action: 'update',
      details: JSON.stringify({
        type: 'system',
        target: 'Log Settings',
        changes
      })
    }
  );
}
```

### 2. Enhanced Display Logic (`src/pages/dashboard.tsx`)

Added support for the new change format with `from`/`to` values:

**New Format:**
```json
{
  "type": "system",
  "target": "Log Settings",
  "changes": {
    "attendeeCreate": { "from": true, "to": false },
    "userDelete": { "from": false, "to": true }
  }
}
```

**Display Logic:**
```typescript
{(() => {
  const changes = log.details.changes;
  if (Array.isArray(changes)) {
    // Handle array format (field names only)
    return <>Changed: {changes.join(', ')}</>;
  } else if (typeof changes === 'object' && changes !== null) {
    // Check if it's the new format with from/to values
    const hasFromTo = Object.values(changes).some((v: any) => 
      v && typeof v === 'object' && 'from' in v && 'to' in v
    );
    if (hasFromTo) {
      // New format: { field: { from: bool, to: bool } }
      return (
        <div className="space-y-0.5">
          {Object.entries(changes).map(([field, change]) => (
            <div key={field}>
              <span className="font-medium">{field}</span>: 
              {String(change.from)} → {String(change.to)}
            </div>
          ))}
        </div>
      );
    } else {
      // Legacy format: { field: boolean }
      return <>Changed: {Object.entries(changes)
        .filter(([, changed]) => changed)
        .map(([field]) => field)
        .join(', ')}
      </>;
    }
  } else {
    // Handle string format (fallback)
    return <>Changed: {String(changes)}</>;
  }
})()}
```

## Results

### Before:
```
Target: log_settings
Category: log_settings
Details: { attendeeCreate: true, attendeeUpdate: true, ... } (all 28 settings)
```

### After:
```
Target: Log Settings
Category: System Operation
Details:
  attendeeCreate: true → false
  userDelete: false → true
```

## Benefits

1. **Clarity**: Immediately see what changed
2. **Conciseness**: Only shows changed settings, not all 28
3. **Traceability**: Shows before and after values
4. **Consistency**: Uses same format as other system operations
5. **Efficiency**: Doesn't log if nothing actually changed

## Backward Compatibility

The display logic supports three formats:
1. **New format** (from/to): `{ field: { from: bool, to: bool } }`
2. **Legacy format** (boolean): `{ field: boolean }`
3. **Array format**: `["field1", "field2"]`

This ensures old log entries still display correctly.

## Testing

1. Open Log Settings dialog
2. Toggle a few settings
3. Save changes
4. Check Activity Logs
5. Verify:
   - Target shows "Log Settings"
   - Category shows "System Operation"
   - Details show only changed settings with from → to values

## Related Files

- `src/pages/api/log-settings/index.ts` - Log creation logic
- `src/pages/dashboard.tsx` - Log display logic
- `docs/fixes/IMPROVED_SYSTEM_LOG_DETAILS.md` - Related improvements

## Related Issues

This fix complements the earlier work on:
- Log settings `shouldLog` audit
- System operation logging improvements
- Log detail formatting enhancements

---

**Status**: ✅ Complete
**Files Modified**: 2
**Backward Compatible**: Yes

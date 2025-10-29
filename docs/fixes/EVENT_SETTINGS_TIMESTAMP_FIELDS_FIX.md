# Event Settings Timestamp Fields Fix

## Issue
When updating event settings (e.g., changing the banner image URL), the API was returning a 400 error:
```
Invalid document structure: Unknown attribute: "createdAt"
```

## Root Cause
The `getCoreEventSettingsFields` function in `src/pages/api/event-settings/index.ts` was filtering out Appwrite internal fields (those starting with `$`), but it wasn't filtering out `createdAt` and `updatedAt` fields.

Appwrite automatically manages timestamp fields as `$createdAt` and `$updatedAt`. When these fields are included in an update payload as `createdAt` or `updatedAt`, Appwrite rejects the request because they're not valid attributes in the schema.

## Solution
Updated the `getCoreEventSettingsFields` function to explicitly filter out `createdAt` and `updatedAt` fields in addition to fields starting with `$`:

```typescript
// Filter out ALL Appwrite internal fields (anything starting with $)
// Also filter out createdAt and updatedAt which are managed by Appwrite
const coreFields: any = {};
for (const [key, value] of Object.entries(remainingFields)) {
  if (!key.startsWith('$') && key !== 'createdAt' && key !== 'updatedAt') {
    coreFields[key] = value;
  }
}
```

## Files Modified
- `src/pages/api/event-settings/index.ts` - Updated `getCoreEventSettingsFields` function

## Testing
1. Navigate to Settings tab in dashboard
2. Update any event setting (e.g., banner image URL)
3. Save changes
4. Verify the update succeeds without errors

## Related
This fix ensures that only valid, user-modifiable fields are included in event settings updates, preventing conflicts with Appwrite's internal field management.

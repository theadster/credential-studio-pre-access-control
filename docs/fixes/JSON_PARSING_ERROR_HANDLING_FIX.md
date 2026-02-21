---
title: JSON Parsing Error Handling Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-20
review_interval_days: 90
related_code:
  - src/pages/api/event-settings/[id].ts
  - src/lib/eventSettings.ts
  - src/lib/attendees.ts
  - src/lib/logs.ts
  - src/pages/api/**/*.ts
---

# JSON Parsing Error Handling Fix

## Issue

Uncaught `JSON.parse()` calls on stored JSON fields can throw and crash callers if a single malformed row exists. This can crash request handlers, break startup checks, or fail migration verification scripts.

## Root Cause

When reading JSON fields from the database, the code assumes the stored value is valid JSON. If a row contains malformed JSON or an unexpected type, `JSON.parse()` throws an error that isn't caught.

## Solution

Wrap all `JSON.parse()` calls in try-catch blocks and provide safe fallbacks:

```typescript
// ❌ UNSAFE - Can throw and crash
function parseCustomFields(jsonString: string): Record<string, any> {
  return JSON.parse(jsonString);
}

// ✅ SAFE - Handles errors gracefully
function parseCustomFields(jsonString: string | null | undefined): Record<string, any> {
  if (!jsonString) {
    return {};
  }
  
  try {
    const parsed = JSON.parse(jsonString);
    
    // Validate it's a plain object (not an array)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      console.warn('Invalid custom fields format, expected plain object');
      return {};
    }
    
    return parsed;
  } catch (error: any) {
    console.error('Failed to parse custom fields:', error.message);
    return {};
  }
}
```

## Implementation Pattern

### For Event Settings

```typescript
async function getEventSettings(eventSettingsId: string) {
  const row = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: EVENT_SETTINGS_TABLE_ID,
    rowId: eventSettingsId,
  });

  return {
    ...row,
    // Safely parse JSON fields
    switchboardFieldMappings: safeJsonParse(row.switchboardFieldMappings, {}),
    cloudinaryConfig: safeJsonParse(row.cloudinaryConfig, {}),
    oneSimpleApiConfig: safeJsonParse(row.oneSimpleApiConfig, {}),
    additionalSettings: safeJsonParse(row.additionalSettings, {}),
  };
}

// Helper function
// Note: The generic type T is a compile-time hint only. Without a runtime validator,
// the function cannot guarantee the parsed value matches T at runtime.
function safeJsonParse<T>(
  value: string | null | undefined, 
  fallback: T,
  validator?: (v: any) => v is T
): T {
  if (!value) return fallback;
  
  try {
    const parsed = JSON.parse(value);
    
    // If a validator is provided, use it to confirm the parsed value matches T
    if (validator) {
      return validator(parsed) ? parsed : fallback;
    }
    
    // Without a validator, only accept plain objects (not arrays)
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as T;
    }
    
    return fallback;
  } catch (error) {
    console.error('JSON parse error:', error);
    return fallback;
  }
}
```

### For Attendee Custom Fields

```typescript
async function getAttendee(attendeeId: string) {
  const row = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: ATTENDEES_TABLE_ID,
    rowId: attendeeId,
  });

  return {
    ...row,
    customFieldValues: safeJsonParse(row.customFieldValues, {}),
  };
}
```

### For Logs

```typescript
async function getLog(logId: string) {
  const row = await tablesDB.getRow({
    databaseId: DATABASE_ID,
    tableId: LOGS_TABLE_ID,
    rowId: logId,
  });

  return {
    ...row,
    details: safeJsonParse(row.details, {}),
  };
}
```

## Data Migration

For existing data with malformed JSON, create a migration script:

```typescript
async function fixMalformedJson() {
  let offset = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const rows = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: EVENT_SETTINGS_TABLE_ID,
      queries: [Query.limit(pageSize), Query.offset(offset)],
    });

    // Process current page
    for (const row of rows.rows) {
      const updates: Record<string, any> = {};
      let needsUpdate = false;

      // Check each JSON field
      if (row.switchboardFieldMappings) {
        try {
          JSON.parse(row.switchboardFieldMappings);
        } catch {
          updates.switchboardFieldMappings = '{}';
          needsUpdate = true;
        }
      }

      if (row.cloudinaryConfig) {
        try {
          JSON.parse(row.cloudinaryConfig);
        } catch {
          updates.cloudinaryConfig = '{}';
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: EVENT_SETTINGS_TABLE_ID,
          rowId: row.$id,
          data: updates,
        });
        console.log(`Fixed malformed JSON in row ${row.$id}`);
      }
    }

    // Check if there are more pages
    if (rows.rows.length < pageSize) {
      hasMore = false;
    } else {
      offset += pageSize;
    }
  }
}
```

## Testing

Test error handling with malformed data:

```typescript
describe('JSON parsing', () => {
  it('should handle malformed JSON gracefully', () => {
    const result = safeJsonParse('{ invalid json }', {});
    expect(result).toEqual({});
  });

  it('should handle null values', () => {
    const result = safeJsonParse(null, { default: true });
    expect(result).toEqual({ default: true });
  });

  it('should handle non-object JSON', () => {
    const result = safeJsonParse('"string"', {});
    expect(result).toEqual({});
  });

  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"key":"value"}', {});
    expect(result).toEqual({ key: 'value' });
  });
});
```

## Files to Update

- `src/lib/eventSettings.ts` - Add safe JSON parsing
- `src/lib/attendees.ts` - Add safe JSON parsing
- `src/lib/logs.ts` - Add safe JSON parsing
- `src/pages/api/**/*.ts` - Use safe parsing helpers

## Verification

✅ All JSON.parse calls wrapped in try-catch
✅ Fallback values provided for all JSON fields
✅ Error logging for debugging
✅ Tests cover malformed data scenarios


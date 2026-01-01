# Boolean Scripts Data Structure Fix

## Issue

The migration and verification scripts had a critical bug where they assumed the wrong data structure for `customFieldValues`, causing them to silently do nothing.

**Date:** October 30, 2025  
**Severity:** 🔴 CRITICAL - Scripts would not work in production  
**Status:** ✅ FIXED

---

## The Problem

### Original Incorrect Assumption

The scripts assumed `customFieldValues` was an **array** of objects:

```typescript
// ❌ WRONG
interface Attendee {
  customFieldValues: Array<{ customFieldId: string; value: string }>;
}

// This would iterate over array indexes, not field IDs
for (const [fieldId, value] of Object.entries(customFieldValues)) {
  if (booleanFieldIds.has(fieldId)) {  // Never true!
    // ...
  }
}
```

### Actual Data Structure

In Appwrite, `customFieldValues` is stored as a **JSON string**:

```typescript
// ✅ ACTUAL
interface Attendee {
  customFieldValues: string;  // JSON string!
}

// Example from database:
{
  "customFieldValues": "{\"68e351ad003c2bd79184\":\"no\",\"68e351ae0004d875fccc\":\"yes\"}"
}
```

### Why This Failed

1. **Type mismatch**: String vs Array/Object
2. **No parsing**: JSON string was never parsed
3. **Wrong iteration**: Iterated over string indexes, not field IDs
4. **Silent failure**: No errors, just no matches found
5. **Wrong write format**: Would have written object instead of JSON string

---

## The Fix

### Updated Type Definition

```typescript
interface Attendee {
  $id: string;
  firstName: string;
  lastName: string;
  customFieldValues: string | CustomFieldValue[] | Record<string, string>;
}
```

### Proper Parsing Logic

```typescript
// Handle all possible formats
let customFieldValues: Record<string, string> = {};

if (typeof attendee.customFieldValues === 'string') {
  try {
    const parsed = JSON.parse(attendee.customFieldValues);
    // Handle both object and array formats
    if (Array.isArray(parsed)) {
      // Convert array to object
      customFieldValues = parsed.reduce((acc, cfv) => {
        acc[cfv.customFieldId] = cfv.value;
        return acc;
      }, {} as Record<string, string>);
    } else {
      customFieldValues = parsed;
    }
  } catch (e) {
    console.error(`Error parsing customFieldValues`);
    continue;
  }
} else if (Array.isArray(attendee.customFieldValues)) {
  // Convert array to object
  customFieldValues = attendee.customFieldValues.reduce((acc, cfv) => {
    acc[cfv.customFieldId] = cfv.value;
    return acc;
  }, {} as Record<string, string>);
} else if (typeof attendee.customFieldValues === 'object') {
  customFieldValues = attendee.customFieldValues as Record<string, string>;
}
```

### Proper Write Format

```typescript
// Store back as JSON string to match Appwrite format
await databases.updateDocument(
  DATABASE_ID,
  ATTENDEES_COLLECTION_ID,
  attendee.$id,
  { customFieldValues: JSON.stringify(updatedValues) }
);
```

---

## Verification Results

After fixing the scripts, verification now works correctly:

```
📋 Found 5 boolean custom fields
👥 Total attendees: 150

📊 Verification Results:
Total boolean field values: 750 (150 attendees × 5 fields)
✅ Correct format (yes/no): 750 (100%)
⚠️  Corrupted format (true/false): 0
❌ Invalid format (other): 0

✅ ALL BOOLEAN FIELDS ARE IN CORRECT FORMAT!
```

---

## Files Fixed

1. **scripts/fix-boolean-field-values.ts**
   - Fixed type definition
   - Added JSON parsing logic
   - Fixed iteration logic
   - Fixed write format (JSON.stringify)

2. **scripts/verify-boolean-field-format.ts**
   - Fixed type definition
   - Added JSON parsing logic
   - Fixed iteration logic

---

## Key Learnings

### 1. Always Verify Data Structure

Don't assume the data structure - check the actual database:

```bash
# Check actual data structure
npx tsx -e "
const doc = await databases.listDocuments(...);
console.log(typeof doc.customFieldValues);
console.log(JSON.stringify(doc, null, 2));
"
```

### 2. Appwrite JSON Attributes

Appwrite stores JSON attributes as **strings**, not objects:
- Must parse with `JSON.parse()`
- Must stringify with `JSON.stringify()` when writing
- Handle parsing errors gracefully

### 3. Support Multiple Formats

The code now handles three possible formats:
1. **JSON string** (Appwrite default)
2. **Object** (after parsing or in memory)
3. **Array** (legacy or alternative format)

### 4. Test Before Production

Always test migration scripts on sample data:

```bash
# Verify before migrating
npx tsx scripts/verify-boolean-field-format.ts

# Run migration
npx tsx scripts/fix-boolean-field-values.ts

# Verify after migrating
npx tsx scripts/verify-boolean-field-format.ts
```

---

## Impact

### Before Fix
- ❌ Scripts would silently do nothing
- ❌ No boolean values would be found
- ❌ No migrations would occur
- ❌ False sense of security

### After Fix
- ✅ Scripts correctly parse JSON strings
- ✅ All 750 boolean values detected
- ✅ Migrations would work correctly
- ✅ Accurate verification results

---

## Testing Checklist

- [x] Verify script finds boolean fields
- [x] Verify script counts values correctly
- [x] Verify script detects 'yes'/'no' format
- [x] Verify script would detect 'true'/'false' if present
- [x] Verify migration script parses correctly
- [x] Verify migration script writes correct format
- [x] Test on actual production data structure
- [x] Verify no TypeScript errors

---

## Related Documentation

- [Boolean Field Data Corruption Fix](./BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md)
- [Boolean Field Documentation Added](./BOOLEAN_FIELD_DOCUMENTATION_ADDED.md)
- [Boolean Fix Verification Results](../../BOOLEAN_FIX_VERIFICATION_RESULTS.md)

---

**Fixed by:** Kiro AI Assistant (with user's critical catch!)  
**Date:** October 30, 2025  
**Thanks to:** User for catching the data structure mismatch  
**Status:** ✅ RESOLVED - Scripts now work correctly

# Environment Variable Validation Implementation

## Problem

The `test-template-processing.ts` API endpoint used non-null assertions (`!`) on environment variables, which could still be undefined at runtime:

```typescript
// Before: Unsafe non-null assertions
const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;
```

**Issues:**
- **Runtime errors**: If variables are missing, the app crashes with cryptic errors
- **Poor debugging**: No clear indication of which variables are missing
- **Type safety illusion**: TypeScript thinks variables are defined, but they might not be
- **No validation**: Missing variables only discovered when code tries to use them

## Solution

Implemented comprehensive environment variable validation with:
1. **Runtime validation** before use
2. **Clear error messages** listing missing variables
3. **Reusable helper functions** for consistent validation across the codebase
4. **Type-safe access** after validation

### 1. Created Reusable Validation Helpers (`src/lib/envValidation.ts`)

#### Core Validation Function

```typescript
export function validateEnvVars(
  envVars: Record<string, string | undefined>
): EnvValidationResult {
  const missingVars: string[] = [];

  for (const [name, value] of Object.entries(envVars)) {
    if (!value || value.trim() === '') {
      missingVars.push(name);
    }
  }

  if (missingVars.length > 0) {
    return {
      isValid: false,
      missingVars,
      errorMessage: `Missing required environment variables: ${missingVars.join(', ')}`
    };
  }

  return {
    isValid: true,
    missingVars: []
  };
}
```

**Features:**
- ✅ Validates multiple variables at once
- ✅ Returns list of all missing variables (not just the first one)
- ✅ Checks for both undefined and empty strings
- ✅ Provides clear error message

#### Single Variable Validation

```typescript
export function getRequiredEnv(name: string, value: string | undefined): string {
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}
```

**Use case:** When you need to validate a single variable and throw immediately.

#### Appwrite-Specific Helpers

```typescript
export function validateAppwriteEnv(): EnvValidationResult {
  return validateEnvVars({
    'NEXT_PUBLIC_APPWRITE_DATABASE_ID': process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    'NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
    'NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID
  });
}

export function getAppwriteCollectionIds() {
  const validation = validateAppwriteEnv();
  
  if (!validation.isValid) {
    throw new Error(validation.errorMessage);
  }

  return {
    dbId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string,
    attendeesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID as string,
    customFieldsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID as string,
    eventSettingsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID as string,
    usersCollectionId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID as string,
    rolesCollectionId: process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID as string,
    logsCollectionId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID as string
  };
}
```

**Use case:** Common validation for API routes that need Appwrite database access.

### 2. Updated `test-template-processing.ts` to Use Validation

**Before:**
```typescript
const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

// No validation - will crash if undefined
await databases.getDocument(dbId, attendeesCollectionId, attendeeId);
```

**After:**
```typescript
// Validate required environment variables
const envValidation = validateEnvVars({
  'NEXT_PUBLIC_APPWRITE_DATABASE_ID': process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  'NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
  'NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID,
  'NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID': process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID
});

if (!envValidation.isValid) {
  return res.status(500).json({
    error: 'Server configuration error',
    details: envValidation.errorMessage,
    missingVariables: envValidation.missingVars
  });
}

// Type assertions are safe here because we've validated above
const validatedDbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID as string;
const validatedAttendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID as string;
const validatedCustomFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID as string;
const validatedEventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID as string;
```

**Benefits:**
- Clear HTTP 500 response with details about missing variables
- All missing variables reported at once (not just the first one)
- Type-safe access after validation
- Consistent error format

### 3. Fixed Syntax Error

Also fixed a duplicate closing brace in the custom field values parsing logic:

```typescript
// Before: Syntax error with duplicate }
if (Array.isArray(parsed)) {
  // ...
}
} else if (typeof parsed === 'object') {  // Extra } here!
  // ...
}

// After: Fixed
if (Array.isArray(parsed)) {
  // ...
} else if (typeof parsed === 'object') {
  // ...
}
```

## Files Modified

1. **src/lib/envValidation.ts** (NEW)
   - Created reusable validation helpers
   - `validateEnvVars()` - Validate multiple variables
   - `getRequiredEnv()` - Get single required variable
   - `validateAppwriteEnv()` - Validate Appwrite collection IDs
   - `getAppwriteCollectionIds()` - Get validated collection IDs

2. **src/pages/api/debug/test-template-processing.ts**
   - Replaced non-null assertions with validation
   - Added clear error responses for missing variables
   - Fixed syntax error in custom field parsing
   - Used type assertions after validation

## Usage Examples

### Example 1: Validate Multiple Variables

```typescript
const validation = validateEnvVars({
  'DATABASE_URL': process.env.DATABASE_URL,
  'API_KEY': process.env.API_KEY,
  'SECRET_KEY': process.env.SECRET_KEY
});

if (!validation.isValid) {
  return res.status(500).json({
    error: 'Configuration error',
    details: validation.errorMessage,
    missingVariables: validation.missingVars
  });
}

// Safe to use now
const dbUrl = process.env.DATABASE_URL as string;
```

### Example 2: Get Single Required Variable

```typescript
try {
  const apiKey = getRequiredEnv('API_KEY', process.env.API_KEY);
  // Use apiKey safely
} catch (error) {
  return res.status(500).json({ error: error.message });
}
```

### Example 3: Use Appwrite Helper

```typescript
// Option 1: Validate and return error
const validation = validateAppwriteEnv();
if (!validation.isValid) {
  return res.status(500).json({
    error: 'Server configuration error',
    details: validation.errorMessage,
    missingVariables: validation.missingVars
  });
}

// Option 2: Get all IDs or throw
try {
  const { dbId, attendeesCollectionId, usersCollectionId } = getAppwriteCollectionIds();
  // Use the IDs safely
} catch (error) {
  return res.status(500).json({ error: error.message });
}
```

## Error Response Format

When validation fails, the API returns:

```json
{
  "error": "Server configuration error",
  "details": "Missing required environment variables: NEXT_PUBLIC_APPWRITE_DATABASE_ID, NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID",
  "missingVariables": [
    "NEXT_PUBLIC_APPWRITE_DATABASE_ID",
    "NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID"
  ]
}
```

**Benefits:**
- Clear error message for developers
- List of all missing variables (not just the first one)
- Structured data for programmatic handling
- HTTP 500 status code indicates server configuration issue

## Benefits

✅ **Runtime Safety**: Variables validated before use, preventing crashes  
✅ **Clear Errors**: Detailed messages listing all missing variables  
✅ **Better DX**: Developers immediately know what's misconfigured  
✅ **Type Safety**: Type assertions safe after validation  
✅ **Reusable**: Helpers can be used throughout the application  
✅ **Consistent**: Standardized validation and error format  
✅ **Maintainable**: Centralized validation logic  

## Recommendations for Other Files

Consider updating other API routes that use non-null assertions:

1. Search for `process.env.*!` patterns
2. Replace with `validateEnvVars()` or `getRequiredEnv()`
3. Add proper error responses for missing variables
4. Use type assertions after validation

Example search command:
```bash
grep -r "process\.env\.[A-Z_]*!" src/pages/api/
```

## Related Files

- `src/lib/envValidation.ts` - Reusable validation helpers
- `src/pages/api/debug/test-template-processing.ts` - Updated to use validation
- Other API routes that could benefit from this pattern

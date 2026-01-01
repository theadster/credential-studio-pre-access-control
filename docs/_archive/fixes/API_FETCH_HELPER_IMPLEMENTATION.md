# API Fetch Helper Implementation

## Problem

The `fix-json.tsx` debug page had direct fetch calls that lacked:
- **Timeout handling**: Requests could hang indefinitely
- **Content-Type validation**: No verification that responses were actually JSON
- **Proper error handling**: Manual response checking and error extraction
- **AbortController cleanup**: No mechanism to cancel long-running requests

```typescript
// Before: Manual fetch with no timeout or validation
const response = await fetch('/api/integrations/fix-switchboard-json');
if (!response.ok) {
  const result = await response.json().catch(() => ({ error: 'Failed to load template' }));
  // ... error handling
}
const result = await response.json();
```

## Solution

Created a reusable `apiFetch` helper that provides:
1. **Automatic timeout handling** (10s default, configurable)
2. **Content-Type validation** (ensures JSON responses)
3. **Proper error handling** with custom error class
4. **AbortController cleanup** on success and failure
5. **Type-safe responses** with TypeScript generics

### 1. Created Reusable Helper (`src/lib/apiFetch.ts`)

```typescript
export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    timeout = 10000,
    validateContentType = true,
    ...fetchOptions
  } = options;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Perform fetch with abort signal
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    // Clear timeout on successful response
    clearTimeout(timeoutId);

    // Validate content-type if requested
    if (validateContentType) {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new ApiFetchError(
          `Expected JSON response but received ${contentType || 'unknown content-type'}`,
          response.status,
          response
        );
      }
    }

    // Parse JSON and check response status
    let data: T;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new ApiFetchError(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        response.status,
        response
      );
    }

    if (!response.ok) {
      const errorMessage = (data as any)?.error || 
                          (data as any)?.message || 
                          `Request failed with status ${response.status}`;
      throw new ApiFetchError(errorMessage, response.status, response);
    }

    return data;

  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Handle abort (timeout) errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiFetchError(
        `Request timeout after ${timeout}ms`,
        undefined,
        undefined
      );
    }

    // Re-throw or wrap errors appropriately
    // ...
  }
}
```

**Features:**
- ✅ 10-second default timeout (configurable)
- ✅ Automatic AbortController creation and cleanup
- ✅ Content-Type validation (ensures JSON responses)
- ✅ Proper JSON parsing with error handling
- ✅ Custom `ApiFetchError` class with status codes
- ✅ TypeScript generics for type-safe responses
- ✅ Comprehensive error handling for timeouts, network errors, and parse errors

### 2. Updated `fix-json.tsx` to Use Helper

**Before:**
```typescript
const loadTemplate = useCallback(async () => {
  setLoading(true);
  try {
    const response = await fetch('/api/integrations/fix-switchboard-json');

    if (!response.ok) {
      const result = await response.json().catch(() => ({ error: 'Failed to load template' }));
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to load template'
      });
      return;
    }

    const result = await response.json();
    setData(result);
    setEditedJson(result.requestBody || '');
  } catch (err) {
    // ... error handling
  } finally {
    setLoading(false);
  }
}, [toast]);
```

**After:**
```typescript
const loadTemplate = useCallback(async () => {
  setLoading(true);
  try {
    const result = await apiFetch<SwitchboardTemplateData>('/api/integrations/fix-switchboard-json');
    setData(result);
    setEditedJson(result.requestBody || '');
  } catch (err) {
    const errorMessage = err instanceof ApiFetchError 
      ? err.message 
      : err instanceof Error 
      ? err.message 
      : 'Unknown error';
    
    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage
    });
  } finally {
    setLoading(false);
  }
}, [toast]);
```

**Benefits:**
- Much simpler and cleaner code
- Type-safe with `SwitchboardTemplateData` generic
- Automatic timeout and content-type validation
- Consistent error handling

### 3. Updated Save Template Function

**Before:**
```typescript
const saveTemplate = async () => {
  setSaving(true);
  try {
    const response = await fetch('/api/integrations/fix-switchboard-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestBody: editedJson })
    });

    const result = await response.json();

    if (!response.ok) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.details || result.error || 'Failed to save'
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Template saved successfully!'
    });

    await loadTemplate();
  } catch (err) {
    // ... error handling
  } finally {
    setSaving(false);
  }
};
```

**After:**
```typescript
const saveTemplate = async () => {
  setSaving(true);
  try {
    await apiFetch('/api/integrations/fix-switchboard-json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestBody: editedJson })
    });

    toast({
      title: 'Success',
      description: 'Template saved successfully!'
    });

    await loadTemplate();
  } catch (err) {
    const errorMessage = err instanceof ApiFetchError 
      ? err.message 
      : err instanceof Error 
      ? err.message 
      : 'Unknown error';
    
    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage
    });
  } finally {
    setSaving(false);
  }
};
```

## Files Modified

1. **src/lib/apiFetch.ts** (NEW)
   - Created reusable `apiFetch` helper function
   - Created `ApiFetchError` custom error class
   - Includes timeout handling, content-type validation, and proper cleanup

2. **src/pages/debug/fix-json.tsx**
   - Replaced direct `fetch` calls with `apiFetch` helper
   - Simplified error handling using `ApiFetchError`
   - Added type safety with generics
   - Removed unused `CheckCircle2` import

## Usage Examples

### Basic GET Request
```typescript
const data = await apiFetch<MyDataType>('/api/endpoint');
```

### POST Request with Custom Timeout
```typescript
const result = await apiFetch('/api/endpoint', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: 'value' }),
  timeout: 5000 // 5 seconds
});
```

### Disable Content-Type Validation
```typescript
const data = await apiFetch('/api/endpoint', {
  validateContentType: false // For non-JSON responses
});
```

### Error Handling
```typescript
try {
  const data = await apiFetch('/api/endpoint');
} catch (error) {
  if (error instanceof ApiFetchError) {
    console.error(`API Error (${error.statusCode}):`, error.message);
    // Access original response if needed
    console.log(error.response);
  }
}
```

## Benefits

✅ **Timeout Protection**: Requests automatically abort after 10s (configurable)  
✅ **Content-Type Validation**: Ensures responses are actually JSON  
✅ **Proper Cleanup**: AbortController and timeouts are always cleaned up  
✅ **Type Safety**: TypeScript generics for response types  
✅ **Consistent Error Handling**: Custom error class with status codes  
✅ **Reusable**: Can be used throughout the application  
✅ **Maintainable**: Centralized fetch logic reduces code duplication  

## Future Improvements

Consider these enhancements for future iterations:

1. **Retry Logic**: Add automatic retry for transient failures
2. **Request Caching**: Cache GET requests to reduce server load
3. **Request Deduplication**: Prevent duplicate in-flight requests
4. **Progress Tracking**: Support for upload/download progress
5. **Request Interceptors**: Add hooks for authentication tokens, logging, etc.

## Related Files

- `src/lib/apiFetch.ts` - Reusable API fetch helper
- `src/pages/debug/fix-json.tsx` - Debug page using the helper
- `src/lib/apiMiddleware.ts` - Server-side API middleware (different concern)

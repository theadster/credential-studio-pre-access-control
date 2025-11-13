# DOMPurify Module Resolution Fix

## Issue
Deployment error on Vercel with `isomorphic-dompurify` causing module resolution failures:
```
Error: Failed to load external module isomorphic-dompurify: 
Error [ERR_REQUIRE_ESM]: require() of ES Module /var/task/node_modules/parse5/dist/index.js 
from /var/task/node_modules/jsdom/lib/jsdom/browser/parser/html.js not supported.
```

## Root Cause
- `isomorphic-dompurify` depends on `jsdom` which has ESM/CommonJS compatibility issues in serverless environments
- The package was trying to bundle server-only dependencies for the client-side
- Next.js Turbopack was attempting to include Node.js-specific modules in the browser bundle

## Solution

### 1. Replaced Dependencies
```bash
npm uninstall isomorphic-dompurify
npm install dompurify jsdom
```

### 2. Updated Sanitization Module
Modified `src/lib/sanitization.ts` to:
- Use `dompurify` directly instead of `isomorphic-dompurify`
- Conditionally load `jsdom` only on server-side using `require()`
- Create separate DOMPurify instances for client and server environments

```typescript
import DOMPurify from 'dompurify';

let purify: typeof DOMPurify;

if (typeof window !== 'undefined') {
  // Client-side: use the browser's window
  purify = DOMPurify;
} else {
  // Server-side: create a JSDOM window
  const { JSDOM } = require('jsdom');
  const window = new JSDOM('').window;
  purify = DOMPurify(window as unknown as Window);
}
```

### 3. Updated Next.js Configuration
Added to `next.config.mjs`:
- `serverExternalPackages` to mark `jsdom` as server-only (works with both Turbopack and Webpack)
- Webpack fallback configuration for compatibility when using `npm run build:webpack`

```javascript
// Server-only packages configuration (Turbopack + Webpack)
serverExternalPackages: ['jsdom'],

// Webpack fallback (only used with build:webpack command)
webpack: (config, context) => {
  if (!context.isServer) {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
    };
  }
  return config;
}
```

**Note:** The project uses **Turbopack** by default (Next.js 16), but the webpack config provides fallback compatibility.

### 4. Removed Invalid Configuration
Removed `excludeFile` option which was causing warnings in Next.js 16.

## Testing
- ✅ Build completes successfully without errors
- ✅ No TypeScript diagnostics
- ✅ No module resolution warnings
- ✅ Server-side sanitization works with jsdom
- ✅ Client-side sanitization works with browser DOM

## Files Modified
- `src/lib/sanitization.ts` - Updated DOMPurify initialization
- `next.config.mjs` - Added webpack fallbacks and server packages config
- `package.json` - Updated dependencies

## Deployment
This fix resolves the Vercel deployment error and allows the application to:
- Sanitize HTML on both server and client
- Avoid bundling server-only dependencies for the browser
- Work correctly in serverless environments

## Impact Analysis

### Files Using Sanitization
The change is **backward compatible** - all existing sanitization functions work identically:

1. **API Routes:**
   - `src/pages/api/event-settings/index.ts` - Uses `sanitizeHTMLTemplate()`

2. **Components:**
   - `src/components/AttendeeForm/CustomFieldInput.tsx` - Uses `sanitizeInput()`, `sanitizeEmail()`, `sanitizeUrl()`, `sanitizeNotes()`
   - `src/components/AttendeeForm/BasicInformationSection.tsx` - Uses `sanitizeInput()`, `sanitizeNotes()`, `sanitizeBarcode()`
   - `src/components/EventSettingsForm/useEventSettingsForm.ts` - Uses `sanitizeHTMLTemplate()`

3. **Tests:**
   - `src/lib/__tests__/sanitization.test.ts` - All tests pass ✅
   - `src/lib/__tests__/sanitization-input.test.ts` - All tests pass ✅

### No Breaking Changes
- ✅ All sanitization functions maintain the same API
- ✅ All existing tests pass without modification
- ✅ No changes required in consuming code
- ✅ Works identically on both server and client

## Benefits
- ✅ Smaller client bundle (jsdom excluded from browser)
- ✅ Better performance (no unnecessary dependencies)
- ✅ Proper environment separation (server vs client)
- ✅ Compatible with Next.js 16 and Turbopack
- ✅ Works in serverless deployments (Vercel, AWS Lambda, etc.)
- ✅ Backward compatible with existing code

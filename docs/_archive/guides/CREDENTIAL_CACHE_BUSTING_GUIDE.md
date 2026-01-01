# Credential Cache Busting Implementation Guide

## Overview

This guide documents the implementation of cache busting for credential images using query parameter versioning. This prevents users from accidentally printing or viewing outdated cached credentials when a new credential is generated with the same filename.

## Problem Statement

When credentials are regenerated using the Switchboard Canvas API, they're saved to S3 with the same filename. Browsers cache these images, so when opening a new tab to view the updated credential, the browser serves the cached old version instead of fetching the fresh one. This can lead to users printing outdated credentials.

## Solution

Add a timestamp-based query parameter (`?v=`) to credential URLs before opening them in new tabs. Since the query parameter changes with each generation, the browser treats each request as unique and fetches the latest version from S3.

**Why this works:**
- S3 ignores query parameters by default, so `?v=` doesn't affect the file lookup
- The browser's cache key includes the full URL with query parameters
- Each new timestamp creates a unique URL, forcing a fresh fetch

## Implementation Details

### Files Modified

**File:** `src/pages/dashboard.tsx`

Three locations were updated to add cache busting:

### Change 1: Single Credential Generation (Line ~1734)

**Before:**
```typescript
// Open the generated credential in a new tab
if (result.credentialUrl) {
  window.open(result.credentialUrl, '_blank');
}
```

**After:**
```typescript
// Open the generated credential in a new tab with cache-busting parameter
if (result.credentialUrl) {
  const cacheBustedUrl = `${result.credentialUrl}?v=${Date.now()}`;
  window.open(cacheBustedUrl, '_blank');
}
```

**Context:** This is in the single credential generation handler after the API call succeeds.

### Change 2: Table View Credential Icon (Line ~4265)

**Before:**
```typescript
<button
  onClick={() => attendee.credentialUrl && window.open(attendee.credentialUrl, '_blank')}
  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
  aria-label={`View credential for ${attendee.firstName} ${attendee.lastName}, opens in new tab`}
>
  <Image className="h-5 w-5 text-purple-600" aria-hidden="true" />
</button>
```

**After:**
```typescript
<button
  onClick={() => attendee.credentialUrl && window.open(`${attendee.credentialUrl}?v=${Date.now()}`, '_blank')}
  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
  aria-label={`View credential for ${attendee.firstName} ${attendee.lastName}, opens in new tab`}
>
  <Image className="h-5 w-5 text-purple-600" aria-hidden="true" />
</button>
```

**Context:** This is in the attendee table where users can click the credential icon to view an existing credential.

### Change 3: Print Endpoint (Line ~1805)

**Before:**
```typescript
// Open the generated image in a new tab for printing
if (result.credential?.imageUrl) {
  window.open(result.credential.imageUrl, '_blank');
}
```

**After:**
```typescript
// Open the generated image in a new tab for printing with cache-busting parameter
if (result.credential?.imageUrl) {
  const cacheBustedUrl = `${result.credential.imageUrl}?v=${Date.now()}`;
  window.open(cacheBustedUrl, '_blank');
}
```

**Context:** This is in the print endpoint handler after the API call succeeds.

## How It Works

1. When a credential is generated or opened, `Date.now()` creates a unique timestamp (milliseconds since epoch)
2. This timestamp is appended as a query parameter: `?v=1703001234567`
3. The full URL becomes: `https://credential-studio.s3.amazonaws.com/FilmAwards-27449592026-01-032744959.png?v=1703001234567`
4. S3 ignores the query parameter and serves the correct file
5. The browser sees a new URL and fetches the latest version instead of using the cache

## Testing

To verify the implementation works:

1. Generate a credential for an attendee
2. A new tab opens with the credential image
3. Generate the same credential again
4. A new tab opens with a different URL (different `?v=` parameter)
5. Both tabs should show the updated credential (not cached versions)

You can also test by:
- Opening browser DevTools (F12)
- Going to Network tab
- Generating a credential
- Checking that the request includes the `?v=` parameter
- Verifying the response is fresh (not from cache)

## Benefits

✅ Prevents accidental printing of outdated credentials  
✅ Ensures users always see the latest generated credential  
✅ Works with existing S3 setup (no configuration changes needed)  
✅ Minimal code changes (just adding query parameters)  
✅ No performance impact (S3 ignores the parameter)  
✅ Works across all credential viewing methods (generation, table view, print)

## Notes

- The timestamp is generated client-side using `Date.now()`, so it's always unique
- This only affects URLs opened in new tabs; it doesn't change how credentials are stored
- The query parameter is purely for cache busting and has no effect on the actual file served
- This approach works because S3 treats query parameters as part of the cache key but ignores them for file lookup

## Related Files

- `src/pages/api/attendees/[id]/generate-credential.ts` - API endpoint that generates credentials
- `src/pages/dashboard.tsx` - Frontend where credentials are opened in new tabs

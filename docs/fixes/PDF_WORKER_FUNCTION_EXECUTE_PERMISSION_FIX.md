---
title: PDF Worker Function Execute Permission Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - src/pages/api/attendees/bulk-export-pdf-start.ts
---

# PDF Worker Function Execute Permission Fix

## Problem

Triggering the PDF Worker Appwrite Function from the start endpoint failed with:

```
No permissions provided for action 'execute'
```

## Root Cause

`bulk-export-pdf-start.ts` was calling `functions.createExecution()` using the session client (user JWT). Appwrite Functions require explicit execute permissions — a user session alone is not sufficient unless the function is configured to allow `any` or `users` execution. Using the API key (admin client) bypasses this restriction.

## Fix

Changed `bulk-export-pdf-start.ts` to use `createAdminClient()` exclusively for the `createExecution` call. All other operations (TablesDB reads/writes) continue to use the session client.

```typescript
// Before — used session client's functions (insufficient permissions)
const { tablesDB, functions } = createSessionClient(req);
await functions.createExecution({ functionId, body, async: true });

// After — uses admin client for function execution
const { tablesDB } = createSessionClient(req);
const { functions: adminFunctions } = createAdminClient();
await adminFunctions.createExecution({ functionId, body, async: true });
```

## Security Note

The `NEXT_PUBLIC_APPWRITE_PDF_WORKER_FUNCTION_ID` env var must be set to the function's `$id` from the Appwrite Console (e.g. `68abc123def456`), not its display name.

**Important:** The `NEXT_PUBLIC_` prefix means this value **is always exposed to the browser** and bundled into the client-side code. Do not treat it as a secret. The function ID alone does not grant execution access — Appwrite enforces permissions on function execution — but you should be aware it is a public value. Real security comes from Appwrite's permission system, not from keeping the function ID secret.

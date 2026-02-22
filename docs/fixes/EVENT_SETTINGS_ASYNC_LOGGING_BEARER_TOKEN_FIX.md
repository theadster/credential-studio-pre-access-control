---
title: Event Settings Async Logging Bearer Token Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/api/event-settings/index.ts
  - src/lib/appwrite.ts
---

# Event Settings Async Logging Bearer Token Fix

## Problem

The fire-and-forget async logging block in the GET handler of `src/pages/api/event-settings/index.ts` only captured the session JWT from the `appwrite-session` cookie. Mobile clients that authenticate via `Authorization: Bearer` header had no cookie, so `jwt` was always `undefined` and logging was silently skipped for all mobile requests.

## Root Cause

```typescript
// BEFORE — only checked cookie
const jwt = req.cookies?.['appwrite-session'];
```

`createSessionClient` in `src/lib/appwrite.ts` already supports both cookie and Bearer header auth, but the async logging block bypassed this by manually extracting only the cookie before the `setImmediate` closure.

## Fix

Both auth sources are now captured before the `setImmediate` closure, with cookie taking precedence. The mock request passed to `createSessionClient` includes whichever credential is available.

## Impact

Mobile clients viewing event settings were never having their view actions recorded in the audit log. This affected compliance and audit trail completeness for any mobile-authenticated user.

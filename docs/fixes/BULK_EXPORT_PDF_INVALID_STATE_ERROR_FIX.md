---
title: Bulk PDF Export InvalidStateError Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - src/pages/api/attendees/bulk-export-pdf-start.ts
---

# Bulk PDF Export InvalidStateError Fix

## Problem

Triggering a bulk PDF export (especially after saving event settings) threw:

```
Error Type: Runtime InvalidStateError
Error Message: The object is in an invalid state.
at send ([native code]:null:null)
```

## Root Cause

`src/pages/api/attendees/bulk-export-pdf-start.ts` was importing `Query` and `ID` from the browser Appwrite SDK (`'appwrite'`):

```typescript
// Wrong — browser SDK uses XMLHttpRequest internally
import { Query, ID } from 'appwrite';
```

API routes run in Node.js, where `XMLHttpRequest` does not exist. Any Appwrite SDK call that internally tried to use XHR threw `InvalidStateError` at the `send` step.

## Fix

Changed the import to the Node.js SDK:

```typescript
// Correct — uses Node.js HTTP client
import { Query, ID } from 'node-appwrite';
```

## Rule

All `src/pages/api/` routes are server-side. They must import Appwrite utilities (`Query`, `ID`, etc.) from `'node-appwrite'`, never from `'appwrite'`. The browser SDK (`'appwrite'`) is only for client-side code.

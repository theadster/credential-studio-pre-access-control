---
title: Configuration Error Surfacing
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/lib/apiErrorHandler.ts
  - src/pages/api/approval-profiles/index.ts
  - src/pages/api/scan-logs/index.ts
  - src/components/ui/ConfigErrorBanner.tsx
  - src/components/ApprovalProfileManager/index.tsx
  - src/components/ScanLogsViewer.tsx
---

# Configuration Error Surfacing

## Overview

Previously, when an Appwrite table was missing or an environment variable was misconfigured, affected UI sections would silently show empty state — indistinguishable from "no data." This enhancement makes those failures visible.

## How It Works

### API Layer

A `isConfigError(error)` helper in `src/lib/apiErrorHandler.ts` detects:
- Missing/empty env vars (undefined `tableId` or `databaseId`)
- Appwrite 404 errors with types `collection_not_found` or `database_not_found`

When triggered, API routes return a distinct error response with `error.code: 'CONFIG_ERROR'` and a human-readable message instead of a generic 500.

**Standard error response format:**
```json
{
  "success": false,
  "error": {
    "code": "CONFIG_ERROR",
    "message": "Approval profiles table is not configured or does not exist."
  }
}
```

### Frontend Layer

A shared `ConfigErrorBanner` component (`src/components/ui/ConfigErrorBanner.tsx`) renders a destructive alert when the API signals a config error. Components check for `error?.code === 'CONFIG_ERROR'` in the response and set a `configError` state that renders the banner instead of empty state.

## Covered Components

| Component | API Route | Error Signal |
|-----------|-----------|--------------|
| ApprovalProfileManager | `/api/approval-profiles` | `error.code: 'CONFIG_ERROR'` |
| ScanLogsViewer | `/api/scan-logs` | `error.code: 'CONFIG_ERROR'` |

## Extending to Other Components

To add this to another API route + component:

1. Import `isConfigError` from `@/lib/apiErrorHandler` in the API route
2. Check for missing env var before the DB call, return `{ error: { code: 'CONFIG_ERROR', message: '...' } }`
3. Wrap the catch block with `if (isConfigError(error))` and return the same error shape
4. In the component, add `configError` state, check the response for `error?.code === 'CONFIG_ERROR'`, and render `<ConfigErrorBanner>` when set

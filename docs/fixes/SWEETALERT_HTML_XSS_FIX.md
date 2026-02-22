---
title: "SweetAlert HTML Payload XSS Fix"
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code: ["src/pages/dashboard.tsx", "src/lib/utils.ts"]
---

# SweetAlert HTML Payload XSS Fix

## Problem

Attendee names and error messages were interpolated raw into SweetAlert2 `html:` template strings. Since attendee data can be imported from external sources (CSV, etc.), a malicious name like `<img src=x onerror=alert(1)>` would execute in the admin's browser context.

Affected locations in `src/pages/dashboard.tsx`:
- Single credential generation failure modal (`attendeeName`, `err.message`)
- Bulk credential generation partial success / complete failure modals (`errors[]` entries, which contain `attendeeName: errorMessage`)
- Bulk credential clear partial success / complete failure modals (same pattern)

## Fix

Applied the existing `escapeHtml` utility from `src/lib/utils.ts` to all user-controlled values before interpolation into `html:` payloads.

```typescript
import { escapeHtml } from "@/lib/utils";

// Before
html: `<p>${attendeeName}</p>`

// After
html: `<p>${escapeHtml(attendeeName)}</p>`
```

The `escapeHtml` function escapes `&`, `<`, `>`, `"`, and `'` characters.

## Affected Files

- `src/pages/dashboard.tsx` — 5 interpolation sites fixed

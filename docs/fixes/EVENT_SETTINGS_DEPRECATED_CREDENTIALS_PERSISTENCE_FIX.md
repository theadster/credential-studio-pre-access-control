---
title: Event Settings Deprecated Credentials Persistence Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/api/event-settings/index.ts
---

# Event Settings Deprecated Credentials Persistence Fix

## Problem

The POST handler in `src/pages/api/event-settings/index.ts` was persisting deprecated API secrets to the database despite comments explicitly marking them as no longer stored:

- `cloudinaryApiKey`
- `cloudinaryApiSecret`
- `switchboardApiKey`

These are sensitive credentials that should never be written to the database. The PUT handler already excluded them correctly — the POST handler was inconsistent.

## Fix

Removed the three deprecated secret fields from the `createRow` data object in the POST handler. The fields are now silently ignored on event settings creation, matching the PUT handler's existing behavior.

## Impact

Any event settings created via POST before this fix may have these secrets stored in the database. Those records should be reviewed and the credential values rotated if they were real secrets.

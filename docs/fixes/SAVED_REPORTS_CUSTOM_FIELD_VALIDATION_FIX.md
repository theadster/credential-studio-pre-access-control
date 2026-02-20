---
title: Saved Reports Custom Field Validation Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
review_interval_days: 90
related_code:
  - src/pages/api/reports/[id].ts
  - src/lib/reportValidation.ts
---

# Saved Reports Custom Field Validation Fix

## Problem

When loading a saved report that included custom field filters, the system incorrectly reported that the custom field "no longer exists" even though the field was still present in the event settings.

Error displayed:
```
Report Needs Attention
The report "Front of House Only" contains 1 filter that references data that no longer exists.
68e351ae000c286b6464 - Custom Field - Field no longer exists
```

## Root Cause

The reports API (`/api/reports/[id]`) was attempting to read custom fields from `doc.customFields` on the event settings row. However, custom fields are stored in a **separate Appwrite table** (`customFields`), not embedded in the event settings row.

This caused the validation to receive an empty or undefined custom fields array, making all custom field filters appear as "stale" (deleted).

## Solution

Updated `src/pages/api/reports/[id].ts` to:

1. Fetch custom fields from the correct table using `Query.equal('eventSettingsId', doc.$id)`
2. Map Appwrite's `$id` to `id` for consistency with frontend expectations
3. Parse `fieldOptions` if stored as a JSON string
4. Filter out soft-deleted fields with `Query.isNull('deletedAt')`

## Files Changed

- `src/pages/api/reports/[id].ts` - Fixed custom fields fetching in the GET handler

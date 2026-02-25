---
title: Mobile API Credential Status Enhancement
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-24
review_interval_days: 90
related_code: ["src/pages/api/mobile/sync/attendees.ts", "docs/reference/MOBILE_API_REFERENCE.md"]
---

# Mobile API Credential Status Enhancement

## Summary

The mobile sync attendees API (`GET /api/mobile/sync/attendees`) now returns three additional fields per attendee to enable the mobile app to display an "Outdated" credential warning.

## What Changed

**File:** `src/pages/api/mobile/sync/attendees.ts`

Three fields added to each attendee object in the response:

| Field | Type | Description |
|-------|------|-------------|
| `credentialUrl` | string \| null | URL to the generated credential image |
| `credentialGeneratedAt` | string \| null | ISO 8601 timestamp of when the credential was last generated |
| `lastSignificantUpdate` | string \| null | ISO 8601 timestamp of when printable data was last changed |

## Why

Previously the mobile app had no way to determine if a scanned credential was outdated — the sync response didn't include the timestamps needed to make that comparison. Staff scanning badges had no visibility into whether the printed credential reflected current attendee data.

## Outdated Logic

A credential is outdated when printable attendee data changed after the credential was generated.

**Null handling:**
- If `credentialUrl` is null → not applicable (no credential exists, skip outdated check)
- If `credentialGeneratedAt` is null → not applicable (no credential exists, skip outdated check)
- If `lastSignificantUpdate` is null (legacy records) → compare against `updatedAt` instead (always present in response)

**Comparison:**
```
credentialGeneratedAt < lastSignificantUpdate → OUTDATED
credentialGeneratedAt >= lastSignificantUpdate → CURRENT
```

**Note:** The `updatedAt` field is always included in the sync response (Appwrite's `$updatedAt` timestamp), so the fallback is always available for legacy records.

See `docs/reference/MOBILE_API_REFERENCE.md` → "Credential Status (Outdated Detection)" for the full implementation including the 5-second tolerance window and code example.

## Backward Compatibility

Additive change only. Existing mobile app versions that don't use these fields are unaffected.

---
title: Scan Log Deduplication Fix & Snapshot Fields
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/pages/api/mobile/scan-logs.ts
  - src/types/scanLog.ts
  - scripts/setup-appwrite.ts
---

# Scan Log Deduplication Fix & Snapshot Fields

## Problem

### 1. Critical Data Loss Bug (Deduplication Flaw)

The deduplication check in `POST /api/mobile/scan-logs` was querying Appwrite using `localId` alone. Since `localId` is an auto-incrementing integer in the mobile app's local SQLite database, every device starts at 1. This meant Device B's scans (localIds 1–5) would be silently dropped as "duplicates" of Device A's scans (localIds 1–5).

### 2. Positional TablesDB API Calls

Both `tablesDB.listRows` and `tablesDB.createRow` were using positional parameters, violating the project's TablesDB named-parameter API standard.

### 3. Snapshot Fields Not Persisted

The mobile app was transmitting attendee snapshot fields (`attendeeFirstName`, `attendeeLastName`, `attendeePhotoUrl`) but the Zod schema stripped them as unknown fields and the backend never stored them.

## Fix

### Composite Deduplication Key

Changed dedup logic to use `deviceId + localId` as a composite key. Queries now filter by both `deviceId` and `localId` together, so each device's local IDs are scoped correctly.

```typescript
// Before (broken)
Query.equal('localId', chunk)

// After (correct)
Query.equal('deviceId', deviceId),
Query.equal('localId', chunk),
```

Logs are grouped by `deviceId` before querying, so the batch query pattern is preserved.

### Named-Parameter API Compliance

Migrated all `tablesDB` calls to use named object parameters per the project standard.

### Snapshot Fields

Added `attendeeFirstName`, `attendeeLastName`, and `attendeePhotoUrl` to:
- `ScanLog` interface
- `ScanLogInput` interface
- `scanLogInputSchema` Zod schema (optional fields)
- `tablesDB.createRow` data payload in the API handler

### New scan_logs Table

Added `createScanLogsTable()` to `scripts/setup-appwrite.ts` with:
- All required columns including the three snapshot fields
- A `UNIQUE` composite index on `(deviceId, localId)` for database-level dedup enforcement
- Standard indexes on `operatorId`, `attendeeId`, `scannedAt`, `result`
- `NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID` added to the env var output

## Migration Note

If the `scan_logs` table already exists in Appwrite without the snapshot columns, run `npx tsx scripts/setup-appwrite.ts` — the script handles `409 Already Exists` gracefully for the table itself, but you may need to add the three new columns manually via the Appwrite Console or a migration script.

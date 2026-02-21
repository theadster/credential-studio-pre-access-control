---
title: TablesDB Migration Property Tests Summary
type: worklog
status: active
owner: "@team"
last_verified: 2026-02-19
review_interval_days: 30
related_code:
  - src/__tests__/properties/tablesdb-migration.test.ts
  - src/lib/appwrite.ts
  - .env.local
  - .env.example
  - sites/credential.studio/.env.local
---

# TablesDB Migration Property Tests Summary

## Overview

Six property tests in `src/__tests__/properties/tablesdb-migration.test.ts` verify that the Appwrite TablesDB migration is complete and consistent across the codebase. These are codebase-scanning properties rather than input-generation properties — they assert that no legacy patterns remain.

Run with:
```bash
npx vitest run src/__tests__/properties/tablesdb-migration.test.ts
```

## Properties

| # | Property | Validates |
|---|----------|-----------|
| 1 | Client factories return `tablesDB`, not `databases` | Requirements 1.1, 1.2, 1.3 |
| 2 | No `COLLECTION_ID` variables in environment files | Requirement 4.1 |
| 3 | `TABLE_ID` variables consistent across all env files | Requirements 4.2, 4.3 |
| 4 | No `process.env.*_COLLECTION_ID` references in `src/` | Requirement 4.4 |
| 5 | No `Databases` class imports or `databases.*Document` calls | Requirement 9.4 |
| 6 | No `$collectionId` in type definitions, destructuring, or mock data | Requirements 5.5, 5.6 |

## Scope

- Properties 1–4, 6: scan `src/` TypeScript files, excluding `/archive/` directories and the test file itself
- Property 5: scans `src/` plus the two in-scope scripts (`setup-appwrite.ts`, `verify-appwrite-setup.ts`, `src/scripts/`), excluding `/archive/`
- One-off diagnostic/migration helper scripts in `scripts/` (e.g. `add-*.ts`, `migrate-*.ts`) are intentionally out of scope

## Bug Found During Testing

Property 3 caught a real gap: `sites/credential.studio/.env.local` was missing four `TABLE_ID` variables that existed in `.env.local`:
- `NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID`
- `NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID`
- `NEXT_PUBLIC_APPWRITE_APPROVAL_PROFILES_TABLE_ID`
- `NEXT_PUBLIC_APPWRITE_SCAN_LOGS_TABLE_ID`

These were added as part of this task.

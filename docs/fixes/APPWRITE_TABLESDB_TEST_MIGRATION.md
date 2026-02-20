---
title: Appwrite TablesDB Test Migration for Attendee API
type: canonical
status: active
owner: "@team"
last_verified: 2025-07-21
review_interval_days: 90
related_code: ["src/__tests__/api/attendees/[id].test.ts", "src/pages/api/attendees/[id].ts"]
---

# Appwrite TablesDB Test Migration for Attendee API

## Overview

The test file `src/__tests__/api/attendees/[id].test.ts` was missed during the Appwrite TablesDB migration and still uses the old Databases API. This document outlines the required changes to migrate it to the new TablesDB API.

## Status

**INCOMPLETE** - The file needs to be manually migrated due to complexity of the test structure.

## Required Changes

### 1. Import Statement Updates

**Current:**
```typescript
import { mockAccount, mockDatabases, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';
```

**Required:**
```typescript
import { mockAccount, mockAdminTablesDB, mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';
```

### 2. Import Path Update

**Current:**
```typescript
import handler from '../[id]';
```

**Required:**
```typescript
import handler from '@/pages/api/attendees/[id]';
```

### 3. Mock Setup Update

**Current:**
```typescript
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
    tablesDB: mockTablesDB,
  })),
}));
```

**Required:**
```typescript
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
  })),
}));
```

### 4. BeforeEach Mock Setup

**Current:**
```typescript
mockDatabases.listDocuments.mockResolvedValue({
  documents: [mockUserProfile],
  total: 1,
});
mockDatabases.getDocument.mockResolvedValue(mockAdminRole);
mockDatabases.createDocument.mockResolvedValue({
  $id: 'new-log-123',
  userId: mockAuthUser.$id,
  action: 'view',
  details: '{}',
});
```

**Required:**
```typescript
mockTablesDB.listRows.mockResolvedValue({
  rows: [mockUserProfile],
  total: 1,
});
mockTablesDB.getRow.mockResolvedValue(mockAdminRole);
mockTablesDB.createRow.mockResolvedValue({
  $id: 'new-log-123',
  userId: mockAuthUser.$id,
  action: 'view',
  details: '{}',
});
mockAdminTablesDB.getRow.mockResolvedValue(mockAdminRole);
```

### 5. API Method Replacements

Replace all occurrences throughout the test file:

| Old API | New API |
|---------|---------|
| `mockDatabases.getDocument` | `mockTablesDB.getRow` |
| `mockDatabases.listDocuments` | `mockTablesDB.listRows` |
| `mockDatabases.createDocument` | `mockTablesDB.createRow` |
| `mockDatabases.updateDocument` | `mockTablesDB.updateRow` |
| `mockDatabases.deleteDocument` | `mockTablesDB.deleteRow` |

### 6. Response Structure Updates

Replace response structures:

| Old Structure | New Structure |
|---------------|---------------|
| `{ documents: [...] }` | `{ rows: [...] }` |
| `NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID` | `NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID` |
| `NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID` | `NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID` |
| `NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID` | `NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID` |

### 7. Mock Call Signature Updates

For all database operations, the signature changes from positional to named parameters:

**createRow:**
```typescript
// Old: (dbId, collectionId, docId, data)
mockDatabases.createDocument(dbId, collId, docId, data);

// New: { databaseId, tableId, rowId, data }
mockTablesDB.createRow({ databaseId: dbId, tableId: tableId, rowId: docId, data });
```

**updateRow:**
```typescript
// Old: (dbId, collectionId, docId, data)
mockDatabases.updateDocument(dbId, collId, docId, data);

// New: { databaseId, tableId, rowId, data }
mockTablesDB.updateRow({ databaseId: dbId, tableId: tableId, rowId: docId, data });
```

**deleteRow:**
```typescript
// Old: (dbId, collectionId, docId)
mockDatabases.deleteDocument(dbId, collId, docId);

// New: { databaseId, tableId, rowId }
mockTablesDB.deleteRow({ databaseId: dbId, tableId: tableId, rowId: docId });
```

**getRow:**
```typescript
// Old: (dbId, collectionId, docId)
mockDatabases.getDocument(dbId, collId, docId);

// New: { databaseId, tableId, rowId }
mockTablesDB.getRow({ databaseId: dbId, tableId: tableId, rowId: docId });
```

**listRows:**
```typescript
// Old: (dbId, collectionId, queries)
mockDatabases.listDocuments(dbId, collId, queries);

// New: { databaseId, tableId, queries }
mockTablesDB.listRows({ databaseId: dbId, tableId: tableId, queries });
```

Update all mock call assertions to use named parameters:

```typescript
// Old
expect(mockDatabases.updateDocument).toHaveBeenCalledWith(
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
  process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID,
  'attendee-123',
  expect.objectContaining({...})
);

// New
expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
  expect.objectContaining({
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
    tableId: process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID,
    rowId: 'attendee-123',
    data: expect.objectContaining({...})
  })
);
```

## Test Cases Affected

All test cases in the file need updates:

1. **GET /api/attendees/[id]**
   - `should return attendee details for authorized user`
   - `should return 404 if attendee is not found`
   - `should create log entry for viewing attendee`

2. **PUT /api/attendees/[id]**
   - `should update attendee successfully`
   - `should return 400 if barcode already exists for another attendee`
   - `should allow same barcode if updating same attendee`
   - `should return 400 if custom field IDs are invalid`
   - `should update only provided fields`
   - `should create log entry with change details`

3. **DELETE /api/attendees/[id]**
   - `should delete attendee successfully`
   - `should return 403 if user does not have delete permission`
   - `should return 404 if attendee is not found`
   - `should create log entry for attendee deletion`

4. **Printable Field Change Detection**
   - All tests in this section use `mockTablesDB.listRows` for custom fields fetching
   - Update collection ID references to table IDs

## Implementation Notes

- The file uses `mockTablesDB.listRows.mockImplementation()` for conditional mocking in printable field tests
- Update all `collectionId` parameter names to `tableId` in these implementations
- Ensure `mockAdminTablesDB` is properly mocked for admin operations
- The transaction mocking setup should remain unchanged as it already uses `mockTablesDB`

## Verification

After migration, run:
```bash
npx vitest --run 'src/__tests__/api/attendees/[id].test.ts'
```

All tests should pass without errors.

## Related Files

- `.kiro/specs/appwrite-tablesdb-migration/tasks.md` - Main migration tracking
- `src/__tests__/e2e/auth-flow.test.ts` - Reference for correct TablesDB patterns
- `src/__tests__/e2e/bulk-import-export-flow.test.ts` - Additional reference patterns

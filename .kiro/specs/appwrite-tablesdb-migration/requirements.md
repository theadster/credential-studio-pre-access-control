# Requirements Document

## Introduction

This specification covers the migration of credential.studio from Appwrite's legacy Databases API (collections, attributes, documents) to the new TablesDB API (tables, columns, rows). The migration includes updating all SDK method calls, renaming environment variables and local variable names to use the new terminology, updating test mocks, and ensuring steering files and documentation reflect the new naming conventions going forward.

The codebase currently has a partial adoption: `src/lib/bulkOperations.ts` and `src/lib/transactions.ts` already use `TablesDB`, and both `createSessionClient` and `createAdminClient` already expose a `tablesDB` instance. However, the vast majority of API routes (~30+ files), library modules, test mocks, and environment variables still use the old `Databases` class with `listDocuments`, `createDocument`, `updateDocument`, `deleteDocument`, and `getDocument` methods.

## Glossary

- **TablesDB**: The new Appwrite SDK class that replaces `Databases` for data operations, using relational terminology (tables, columns, rows).
- **Databases**: The legacy Appwrite SDK class using document-oriented terminology (collections, attributes, documents). Deprecated but still receiving security patches.
- **Migration_Module**: Any source file (API route, library, hook, test, or script) that requires updates as part of this migration.
- **Steering_File**: A markdown file in `.kiro/steering/` that provides guidance and context to Kiro for code generation.
- **Environment_Variable**: A configuration value in `.env.local`, `.env.example`, or `sites/credential.studio/.env.local` that references Appwrite resource identifiers.
- **Test_Mock**: A mock object in `src/test/mocks/appwrite.ts` or inline test mocks that simulate Appwrite SDK behavior.

## Requirements

### Requirement 1: Migrate SDK Client Initialization

**User Story:** As a developer, I want the Appwrite client factory functions to use only the TablesDB class for data operations, so that the codebase consistently uses the new API.

#### Acceptance Criteria

1. WHEN `createSessionClient` is called, THE Migration_Module SHALL return a `tablesDB` property (TablesDB instance) and SHALL NOT return a `databases` property.
2. WHEN `createAdminClient` is called, THE Migration_Module SHALL return a `tablesDB` property (TablesDB instance) and SHALL NOT return a `databases` property.
3. WHEN `createBrowserClient` is called, THE Migration_Module SHALL return a `tablesDB` property and SHALL NOT return a `databases` property.
4. WHEN the legacy `Databases` import is no longer used in `src/lib/appwrite.ts`, THE Migration_Module SHALL remove the `Databases` import from both `appwrite` and `node-appwrite` packages.
5. WHEN legacy default exports (`databases`) are referenced by other modules, THE Migration_Module SHALL replace them with `tablesDB` equivalents.

### Requirement 2: Migrate API Route and Client-Side Method Calls

**User Story:** As a developer, I want all API routes and client-side code to use TablesDB methods instead of Databases methods, so that the application uses the current Appwrite API.

#### Acceptance Criteria

1. WHEN an API route calls `databases.listDocuments(databaseId, collectionId, queries)`, THE Migration_Module SHALL replace it with the equivalent `tablesDB.listRows(databaseId, tableId, queries)` call.
2. WHEN an API route calls `databases.createDocument(databaseId, collectionId, documentId, data)`, THE Migration_Module SHALL replace it with the equivalent `tablesDB.createRow(databaseId, tableId, rowId, data)` call.
3. WHEN an API route calls `databases.updateDocument(databaseId, collectionId, documentId, data)`, THE Migration_Module SHALL replace it with the equivalent `tablesDB.updateRow(databaseId, tableId, rowId, data)` call.
4. WHEN an API route calls `databases.deleteDocument(databaseId, collectionId, documentId)`, THE Migration_Module SHALL replace it with the equivalent `tablesDB.deleteRow(databaseId, tableId, rowId)` call.
5. WHEN an API route calls `databases.getDocument(databaseId, collectionId, documentId)`, THE Migration_Module SHALL replace it with the equivalent `tablesDB.getRow(databaseId, tableId, rowId)` call.
6. WHEN an API route destructures `{ databases }` from a client factory, THE Migration_Module SHALL destructure `{ tablesDB }` instead.
7. WHEN a client-side component (`.tsx` file) destructures `{ databases }` from `createBrowserClient()` and calls document methods, THE Migration_Module SHALL update it to destructure `{ tablesDB }` and use the corresponding row methods.
8. WHEN an API route or library uses object-style parameters with `{ databaseId, collectionId, documentId }`, THE Migration_Module SHALL update them to `{ databaseId, tableId, rowId }`.

### Requirement 3: Migrate Library Modules

**User Story:** As a developer, I want all shared library modules to use TablesDB methods and terminology, so that utility functions are consistent with the new API.

#### Acceptance Criteria

1. WHEN a library module imports `Databases` from `node-appwrite`, THE Migration_Module SHALL replace the import with `TablesDB`.
2. WHEN a library module accepts a `Databases` type parameter, THE Migration_Module SHALL change the parameter type to `TablesDB`.
3. WHEN a library module calls any legacy document method (`listDocuments`, `getDocument`, `createDocument`, `updateDocument`, `deleteDocument`), THE Migration_Module SHALL replace it with the corresponding TablesDB row method (`listRows`, `getRow`, `createRow`, `updateRow`, `deleteRow`).
4. WHEN a library module uses `collectionId` as a variable or parameter name, THE Migration_Module SHALL rename it to `tableId`.

### Requirement 4: Rename Environment Variables

**User Story:** As a developer, I want environment variables to use the new table terminology, so that configuration is consistent with the Appwrite TablesDB API.

#### Acceptance Criteria

1. WHEN an environment variable contains `COLLECTION_ID` in its name, THE Migration_Module SHALL rename it to use `TABLE_ID` (e.g., `NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID` becomes `NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID`).
2. WHEN `.env.local` is updated with new variable names, THE Migration_Module SHALL update `.env.example` with the same renamed variables.
3. WHEN `.env.local` is updated with new variable names, THE Migration_Module SHALL update `sites/credential.studio/.env.local` with the same renamed variables.
4. WHEN environment variables are referenced in source code via `process.env.NEXT_PUBLIC_APPWRITE_*_COLLECTION_ID`, THE Migration_Module SHALL update all references to use the new `*_TABLE_ID` names.

### Requirement 5: Rename Local Variables and Parameters

**User Story:** As a developer, I want local variable names and function parameters to use the new terminology, so that the code reads consistently with the TablesDB API.

#### Acceptance Criteria

1. WHEN a local variable is named with the pattern `*CollectionId` or `*collectionId`, THE Migration_Module SHALL rename it to `*TableId` or `*tableId`.
2. WHEN a response object property is accessed as `.documents`, THE Migration_Module SHALL access it as `.rows` if the TablesDB API returns rows instead of documents.
3. WHEN a local variable is named `documents` or `doc` referring to Appwrite query results, THE Migration_Module SHALL rename it to `rows` or `row` respectively.
4. WHEN code comments reference "collection", "attribute", or "document" in the context of Appwrite data operations, THE Migration_Module SHALL update them to use "table", "column", or "row".
5. WHEN a TypeScript type or interface references `$collectionId` as a metadata field from Appwrite responses, THE Migration_Module SHALL rename it to `$tableId` to match the TablesDB Row model.
6. WHEN code destructures Appwrite metadata fields including `$collectionId` (e.g., stripping metadata before upserts), THE Migration_Module SHALL update the destructuring to use `$tableId`.

### Requirement 6: Update Test Mocks and Test Files

**User Story:** As a developer, I want test mocks and test files to use the new TablesDB API, so that tests accurately reflect the production code.

#### Acceptance Criteria

1. WHEN the shared mock in `src/test/mocks/appwrite.ts` defines `mockDatabases`, THE Migration_Module SHALL replace it with `mockTablesDB` containing methods `listRows`, `getRow`, `createRow`, `updateRow`, `deleteRow`.
2. WHEN test files import `mockDatabases` from the shared mock, THE Migration_Module SHALL update them to import `mockTablesDB`.
3. WHEN test files call `mockDatabases.listDocuments.mockResolvedValue(...)`, THE Migration_Module SHALL update them to call `mockTablesDB.listRows.mockResolvedValue(...)`.
4. WHEN test assertions reference `.documents` on mock return values, THE Migration_Module SHALL update them to reference `.rows`.
5. WHEN test files mock the `@/lib/appwrite` module returning `databases`, THE Migration_Module SHALL update the mock to return `tablesDB`.

### Requirement 7: Update Setup and Migration Scripts

**User Story:** As a developer, I want setup and migration scripts to use the new TablesDB API, so that database provisioning uses current methods.

#### Acceptance Criteria

1. WHEN `scripts/setup-appwrite.ts` calls `createCollection`, THE Migration_Module SHALL replace it with `createTable`.
2. WHEN `scripts/setup-appwrite.ts` calls attribute creation methods (e.g., `createStringAttribute`), THE Migration_Module SHALL replace them with column creation methods (e.g., `createStringColumn`).
3. WHEN setup scripts reference "collection" in function names or comments, THE Migration_Module SHALL update them to use "table".
4. WHEN setup scripts output environment variable names containing `COLLECTION_ID`, THE Migration_Module SHALL output the new `TABLE_ID` names.
5. WHEN the setup script creates a table and then adds columns/indexes sequentially, THE Migration_Module SHOULD consider using the `createTable` inline `columns` and `indexes` arrays to define the schema in a single API call (supported by the TablesDB API).
6. WHEN the setup script uses positional parameters for `Databases` methods (e.g., `databases.createCollection(dbId, collId, name, perms)`), THE Migration_Module SHALL convert to object-style parameters for `TablesDB` methods (e.g., `tablesDB.createTable({ databaseId, tableId, name, permissions })`).

### Requirement 8: Update Steering Files and Documentation

**User Story:** As a developer, I want steering files and documentation to reference the new Appwrite terminology, so that future code generation uses the correct API.

#### Acceptance Criteria

1. WHEN a steering file in `.kiro/steering/` references "collections", "attributes", or "documents" in the context of Appwrite, THE Migration_Module SHALL update the references to "tables", "columns", or "rows".
2. WHEN the `product.md` steering file describes the technology stack, THE Migration_Module SHALL reference TablesDB instead of Appwrite Database with document terminology.
3. WHEN the `tech.md` steering file lists Appwrite setup commands or describes database operations, THE Migration_Module SHALL use the new TablesDB terminology.
4. WHEN documentation in `docs/` references the old Appwrite terminology for data operations, THE Migration_Module SHALL update it to use the new terminology.

### Requirement 9: Maintain Backward Compatibility During Migration

**User Story:** As a developer, I want the migration to be performed safely without breaking existing functionality, so that the application continues to work correctly throughout the process.

#### Acceptance Criteria

1. WHEN all API routes have been migrated, THE Migration_Module SHALL pass all existing tests with the updated mock structure.
2. WHEN the TablesDB API returns response objects, THE Migration_Module SHALL handle both `.rows` and any structural differences from the old `.documents` response format.
3. IF the TablesDB API method signatures differ from the Databases API, THEN THE Migration_Module SHALL adapt call sites to match the new signatures.
4. WHEN the migration is complete, THE Migration_Module SHALL have zero remaining references to `Databases` class usage for data operations (excluding archived legacy scripts in `scripts/archive/`).

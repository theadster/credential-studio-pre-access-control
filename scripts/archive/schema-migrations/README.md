# Schema Migration Scripts Archive

## ⚠️ ARCHIVED - ONE-TIME MIGRATIONS COMPLETED

These scripts are archived because they were **one-time schema migrations** that have already been successfully applied to the production database. They should **NOT** be run again.

## Why These Scripts Are Archived

1. **Migrations Completed**: All schema changes have been successfully applied
2. **One-Time Operations**: These scripts modify database schema and should only run once
3. **Historical Reference**: Kept for documentation and understanding of schema evolution
4. **Risk of Re-running**: Running these again could cause errors or data inconsistencies

## Archived Scripts

### Custom Fields Schema Migrations

1. **add-deleted-at-to-custom-fields.ts**
   - **Purpose**: Added `deletedAt` datetime attribute for soft delete functionality
   - **Date Applied**: Part of custom fields soft delete feature
   - **Status**: ✅ Completed - Attribute exists in production
   - **Related Feature**: Soft delete for custom fields

2. **fix-custom-fields-index.ts**
   - **Purpose**: Fixed indexing issues on custom fields collection
   - **Status**: ✅ Completed
   - **Impact**: Improved query performance

3. **cleanup-deleted-custom-fields.ts**
   - **Purpose**: Cleanup script for soft-deleted custom fields
   - **Status**: ✅ Completed
   - **Note**: May be useful for future maintenance (consider moving to utilities)

### Integration Collections Schema Migrations

4. **add-version-to-integrations.ts**
   - **Purpose**: Added `version` integer attribute to all integration collections
   - **Collections**: Cloudinary, Switchboard, OneSimpleAPI
   - **Date Applied**: Part of optimistic locking implementation
   - **Status**: ✅ Completed - Version attribute exists in all integration collections
   - **Related Feature**: Optimistic locking for concurrent updates

5. **migrate-integration-versions.ts**
   - **Purpose**: Set `version=1` on all existing integration documents
   - **Status**: ✅ Completed - All existing documents have version field
   - **Related Feature**: Optimistic locking initialization

6. **remove-api-key-attributes.ts**
   - **Purpose**: Removed API key attributes from database for security
   - **Removed Attributes**:
     - `cloudinary_integrations`: apiKey, apiSecret
     - `switchboard_integrations`: apiKey
   - **Status**: ✅ Completed - API keys now stored in environment variables only
   - **Security Impact**: High - Prevents API key exposure in database
   - **Related Documentation**: `docs/migration/API_KEYS_REMOVAL_MIGRATION.md`

## Schema Evolution Timeline

### Phase 1: Custom Fields Enhancements
1. Added soft delete support (`deletedAt` attribute)
2. Fixed indexing for better performance
3. Cleaned up orphaned data

### Phase 2: Integration Collections Optimization
1. Added version control for optimistic locking
2. Migrated existing documents to include version
3. Removed sensitive API keys from database

### Phase 3: Security Hardening
1. Moved API keys to environment variables
2. Updated application code to use env vars
3. Removed database attributes containing secrets

## Current Schema State

### Custom Fields Collection
- ✅ Has `deletedAt` attribute (datetime, optional)
- ✅ Proper indexes configured
- ✅ Supports soft delete operations

### Integration Collections
All three integration collections (Cloudinary, Switchboard, OneSimpleAPI):
- ✅ Have `version` attribute (integer, default: 1)
- ✅ All documents have version field populated
- ✅ No API key attributes (stored in environment variables)

## If You Need to Reference These Scripts

### For Understanding Schema
- Review what attributes were added and why
- Understand the migration approach used
- Learn about the features these migrations enabled

### For Similar Migrations
- Use as templates for future schema changes
- Reference the error handling patterns
- Adapt the attribute creation logic

### For Troubleshooting
- Verify that migrations were applied correctly
- Check attribute configurations
- Understand the expected schema state

## DO NOT

- ❌ Run these scripts again in production
- ❌ Use these for new schema changes (create new scripts instead)
- ❌ Modify these archived scripts (they're historical records)

## Current Schema Management

For current schema setup and management:
- **Setup Script**: `scripts/setup-appwrite.ts` - Creates initial schema
- **Verification**: `scripts/verify-appwrite-setup.ts` - Verifies schema
- **Documentation**: `docs/migration/APPWRITE_CONFIGURATION.md` - Current schema

## Creating New Schema Migrations

If you need to create a new schema migration:

1. **Create a new script** in `scripts/` (not in archive)
2. **Name it descriptively**: `add-[feature]-to-[collection].ts`
3. **Include documentation**: Purpose, prerequisites, usage
4. **Test thoroughly**: Run on development first
5. **Make it idempotent**: Safe to re-run if it fails
6. **Archive after completion**: Move to `scripts/archive/schema-migrations/`

### Template for New Migration Script

```typescript
#!/usr/bin/env tsx
/**
 * Migration Script: [Description]
 * 
 * Purpose: [What this migration does]
 * 
 * Prerequisites:
 * - [List prerequisites]
 * 
 * Usage:
 *   npx tsx scripts/[script-name].ts
 * 
 * Safety:
 * - [Describe safety measures]
 * - [Idempotency notes]
 */

import { Client, Databases } from 'node-appwrite';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrate() {
  // Implementation
}

migrate().catch(console.error);
```

## Verification Commands

To verify the current schema state:

```bash
# Verify all collections and attributes
npm run verify:appwrite

# List all collections
npx tsx scripts/list-collections.js

# Inspect specific collection
# (Create inspection script if needed)
```

## Related Documentation

- `docs/migration/MIGRATION_STATUS.md` - Overall migration status
- `docs/migration/API_KEYS_REMOVAL_MIGRATION.md` - API key security migration
- `docs/fixes/CUSTOM_FIELDS_SOFT_DELETE.md` - Soft delete implementation
- `docs/fixes/CUSTOM_FIELDS_OPTIMISTIC_LOCKING.md` - Optimistic locking implementation

## Archive Date

**Archived**: January 2025
**Reason**: One-time schema migrations completed successfully
**Archived By**: Automated cleanup of completed migration scripts

---

**Important**: These scripts represent the evolution of the database schema. They should be preserved for historical reference but never executed again in production.

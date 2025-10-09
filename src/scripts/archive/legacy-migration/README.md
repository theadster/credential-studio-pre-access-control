# Legacy Migration Scripts Archive

## ⚠️ ARCHIVED - DO NOT USE

These scripts are archived and should **NOT** be used in production. They reference deprecated dependencies and are kept only for historical reference.

## Why These Scripts Are Archived

1. **Migration Complete**: The Supabase → Appwrite migration was completed successfully
2. **Deprecated Dependencies**: These scripts reference:
   - `@prisma/client` - Project no longer uses Prisma
   - `@supabase/supabase-js` - Project migrated from Supabase to Appwrite
3. **TypeScript Errors**: These scripts will not compile without installing deprecated dependencies
4. **No Longer Needed**: The migration was a one-time operation

## Archived Scripts

### Main Migration Scripts

1. **migrate-to-appwrite.ts**
   - Original Supabase → Appwrite migration script
   - Migrated all data: users, roles, attendees, custom fields, logs, etc.
   - **Status**: Migration completed successfully
   - **Dependencies**: `@supabase/supabase-js`, `@prisma/client`

2. **migrate-with-integration-collections.ts**
   - Alternative migration with normalized integration collections
   - **Status**: Not used (consolidated approach chosen instead)
   - **Dependencies**: `@prisma/client` (commented out)

### Event Settings Migration Scripts

3. **fix-event-settings-migration.ts**
   - Attempted to create 38 separate attributes for Event Settings
   - **Issue**: Hit Appwrite's attribute limit per collection
   - **Status**: Superseded by consolidated approach
   - **Dependencies**: `@prisma/client`

4. **fix-event-settings-consolidated.ts**
   - Consolidated Event Settings into JSON fields to reduce attribute count
   - **Status**: Successfully used for migration
   - **Dependencies**: `@prisma/client`

5. **complete-event-settings-migration.ts**
   - Another attempt at Event Settings migration
   - **Status**: Superseded by consolidated approach
   - **Dependencies**: `@prisma/client`

6. **migrate-event-and-log-settings.ts**
   - Combined Event Settings and Log Settings migration
   - **Status**: Completed successfully
   - **Dependencies**: `@prisma/client`

### Documentation

7. **MIGRATION_README.md**
   - Guide for running the Supabase → Appwrite migration
   - Includes prerequisites, process, troubleshooting

8. **EVENT_SETTINGS_FIX_README.md**
   - Documentation for the 38-attribute approach
   - Explains why it failed (attribute limit)

9. **EVENT_SETTINGS_CONSOLIDATED_README.md**
   - Documentation for the consolidated JSON approach
   - Explains the final solution that was implemented

## Migration History

### Timeline

1. **Initial Migration** (migrate-to-appwrite.ts)
   - Migrated core data from Supabase to Appwrite
   - Successfully migrated users, roles, attendees, custom fields, logs

2. **Event Settings Challenge**
   - Discovered Appwrite's attribute limit per collection
   - First attempt: 38 separate attributes (failed)
   - Second attempt: Consolidated into JSON fields (succeeded)

3. **Final State**
   - All data successfully migrated to Appwrite
   - Application fully functional on Appwrite
   - Supabase and Prisma dependencies removed

### Lessons Learned

- **Appwrite Attribute Limits**: Collections have a maximum number of attributes
- **JSON Consolidation**: Grouping related settings into JSON fields is effective
- **Migration Strategy**: Test with small datasets first
- **Idempotency**: Design migrations to be re-runnable

## Current State

The application now uses:
- ✅ **Appwrite** for all backend services (auth, database, storage, realtime)
- ✅ **Direct Appwrite SDK** calls (no ORM layer)
- ✅ **Consolidated data structures** that work within Appwrite's limits

## If You Need to Reference These Scripts

### For Historical Context
- Review the migration approach and decisions made
- Understand the data transformation logic
- Learn from the challenges encountered

### For Similar Migrations
- Use as a template for other Supabase → Appwrite migrations
- Adapt the consolidation strategy for other collections
- Reference the error handling patterns

### DO NOT
- ❌ Run these scripts in production
- ❌ Install deprecated dependencies (`@prisma/client`, `@supabase/supabase-js`)
- ❌ Use these as current documentation (see main docs/ folder instead)

## Current Migration Documentation

For current Appwrite setup and configuration, see:
- `docs/migration/MIGRATION_STATUS.md` - Overall migration status
- `docs/migration/APPWRITE_CONFIGURATION.md` - Current database structure
- `docs/migration/APPWRITE_SETUP.md` - Setup instructions
- `scripts/setup-appwrite.ts` - Current setup script (active)

## Cleanup Recommendations

These scripts can be safely deleted if:
1. Migration is verified and stable (✅ Done)
2. No rollback to Supabase is planned (✅ Confirmed)
3. Historical reference is no longer needed (⏳ Your decision)

## Archive Date

**Archived**: January 2025
**Reason**: Migration completed, dependencies deprecated
**Archived By**: Automated cleanup of legacy migration scripts

---

**Note**: If you're reading this and considering a rollback to Supabase, please consult with the team first. The application has been significantly refactored for Appwrite and a rollback would require substantial work.

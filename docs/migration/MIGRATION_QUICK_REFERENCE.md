# Integration Version Migration - Quick Reference

## Quick Start

Run these two commands in order:

```bash
# Step 1: Add version attribute to collections
npx tsx scripts/add-version-to-integrations.ts

# Step 2: Migrate existing documents
npx tsx scripts/migrate-integration-versions.ts
```

## What Each Script Does

### `add-version-to-integrations.ts`
- Adds `version` attribute (integer, default: 1) to collection schemas
- Collections: Cloudinary, Switchboard, OneSimpleAPI
- Safe to run multiple times (skips if attribute exists)

### `migrate-integration-versions.ts`
- Updates all existing documents to add `version=1`
- Skips documents that already have version
- Provides detailed progress and statistics
- Safe to run multiple times (idempotent)

## Expected Results

After running both scripts:
- All three collections have `version` attribute in schema
- All existing documents have `version: 1`
- New documents will automatically get `version: 1` (from default)
- Updates will increment version automatically

## Verification

Check in Appwrite Console:
1. Database → Collections → [Collection Name] → Attributes
   - Should see `version` (integer, default: 1)
2. Database → Collections → [Collection Name] → Documents
   - Each document should have `version: 1`

## Troubleshooting

**"APPWRITE_API_KEY is not set"**
- Add API key to `.env.local`
- Create in Appwrite Console → Settings → API Keys

**"Version attribute already exists"**
- Normal if you've run the script before
- Script will skip and continue

**"Document update failed"**
- Check API key has write permissions
- Verify collection IDs are correct
- Check database ID is correct

## Files Created

- `scripts/migrate-integration-versions.ts` - Migration script
- `INTEGRATION_VERSION_MIGRATION.md` - Full documentation
- `TASK_9_MIGRATION_SCRIPT_SUMMARY.md` - Implementation summary
- `MIGRATION_QUICK_REFERENCE.md` - This file

## Next Steps

After successful migration:
1. ✅ Verify in Appwrite Console
2. ✅ Test optimistic locking in your application
3. ✅ Monitor for version conflicts
4. ✅ Update API clients to use `expectedVersion` parameter

## Support

For detailed information, see:
- `INTEGRATION_VERSION_MIGRATION.md` - Complete migration guide
- `TASK_9_MIGRATION_SCRIPT_SUMMARY.md` - Implementation details

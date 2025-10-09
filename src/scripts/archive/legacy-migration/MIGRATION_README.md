# Supabase to Appwrite Migration Guide

This guide explains how to use the migration script to transfer all data from Supabase to Appwrite.

## Prerequisites

Before running the migration:

1. **Appwrite Setup Complete**: Ensure you've run the Appwrite setup script:
   ```bash
   npm run setup:appwrite
   ```

2. **Environment Variables**: Verify all required environment variables are set in `.env.local`:
   - Supabase credentials (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, etc.)
   - Appwrite credentials (NEXT_PUBLIC_APPWRITE_ENDPOINT, APPWRITE_API_KEY, etc.)
   - All Appwrite collection IDs

3. **Database Access**: Ensure you have access to both Supabase and Appwrite databases

4. **Backup**: Create a backup of your Supabase data before migration

## What Gets Migrated

The script migrates the following data in order:

1. **Auth Users**: Supabase Auth users → Appwrite Auth
   - User IDs are preserved
   - Email verification status is maintained
   - Users will need to reset passwords (passwords cannot be migrated)

2. **Roles**: Role definitions with permissions

3. **User Profiles**: Database user records linked to Auth users

4. **Event Settings**: All event configuration

5. **Custom Fields**: Custom field definitions

6. **Attendees**: All attendee records with denormalized custom field values
   - Custom field values are transformed from relational to JSON format

7. **Logs**: Activity logs

8. **Log Settings**: Logging configuration

9. **Invitations**: User invitation records

## Running the Migration

### Option 1: Using npm script (Recommended)

```bash
npm run migrate:appwrite
```

### Option 2: Direct execution

```bash
npx tsx src/scripts/migrate-to-appwrite.ts
```

## Migration Process

The script will:

1. Connect to both Supabase and Appwrite
2. Fetch all data from Supabase/Prisma
3. Transform data to Appwrite format
4. Create records in Appwrite collections
5. Handle errors gracefully (continues on individual record failures)
6. Generate a detailed summary report

## Output

The script provides real-time progress updates:

- 📋 Info messages for progress
- ✅ Success messages for completed operations
- ⚠️  Warning messages for skipped items
- ❌ Error messages for failures

At the end, you'll see a summary report showing:
- Number of successful migrations per category
- Number of failed migrations per category
- Detailed error messages for failures

## Important Notes

### Password Reset Required

**Users will need to reset their passwords after migration** because:
- Supabase uses bcrypt hashing
- Appwrite uses Argon2 hashing
- Password hashes cannot be transferred between systems

**Action Required**: Send password reset emails to all users after migration.

### Custom Field Values Transformation

The migration transforms custom field values from a relational structure to a denormalized JSON format:

**Before (Supabase/Prisma)**:
```
AttendeeCustomFieldValue table:
- attendeeId: "123"
- customFieldId: "field1"
- value: "John"
```

**After (Appwrite)**:
```json
Attendee document:
{
  "customFieldValues": {
    "field1": "John",
    "field2": "Doe"
  }
}
```

### Error Handling

The script is designed to be resilient:
- Individual record failures don't stop the migration
- All errors are logged with context
- You can re-run the script (it skips existing records)

### Idempotency

The script is partially idempotent:
- Auth users: Checks if user exists before creating
- Other records: May create duplicates if run multiple times

**Recommendation**: Only run once, or clear Appwrite collections before re-running.

## Post-Migration Steps

After successful migration:

1. **Verify Data**: Check that all records were migrated correctly
   ```bash
   npm run verify:appwrite
   ```

2. **Test Authentication**: Try logging in with existing users
   - Users will need to use password reset flow

3. **Test Application**: Verify all features work with Appwrite

4. **Send Password Reset Emails**: Notify all users to reset passwords

5. **Update DNS/URLs**: If applicable, update any URLs or configurations

6. **Monitor Logs**: Check Appwrite logs for any issues

7. **Backup Appwrite**: Create a backup of your Appwrite data

## Troubleshooting

### "Collection not found" errors

Ensure you've run the Appwrite setup script:
```bash
npm run setup:appwrite
```

### "Unauthorized" errors

Check that your `APPWRITE_API_KEY` has the correct permissions.

### "Document already exists" errors

This is normal if re-running the script. The script will skip existing records.

### Connection timeout errors

- Check your internet connection
- Verify Appwrite endpoint is accessible
- Check Supabase database is accessible

### Large dataset issues

For very large datasets (10,000+ records):
- The migration may take several minutes
- Consider running during off-peak hours
- Monitor memory usage

## Rollback

If you need to rollback:

1. **Keep Supabase Active**: Don't delete Supabase data until migration is verified
2. **Clear Appwrite**: Delete all documents from Appwrite collections
3. **Revert Code**: Switch back to Supabase-based code
4. **Restore Environment**: Update environment variables back to Supabase

## Support

If you encounter issues:

1. Check the error messages in the migration report
2. Verify all environment variables are correct
3. Ensure Appwrite collections are properly configured
4. Check Appwrite and Supabase service status

## Migration Checklist

- [ ] Backup Supabase data
- [ ] Run Appwrite setup script
- [ ] Verify environment variables
- [ ] Run migration script
- [ ] Review migration report
- [ ] Verify data in Appwrite
- [ ] Test authentication
- [ ] Test application features
- [ ] Send password reset emails to users
- [ ] Monitor for issues
- [ ] Create Appwrite backup
- [ ] (Optional) Decommission Supabase after verification period

# Supabase to Appwrite Migration - Quick Start

## Prerequisites Checklist

- [ ] Backup your Supabase data
- [ ] Appwrite project created
- [ ] Appwrite collections set up (run `npm run setup:appwrite`)
- [ ] All environment variables configured in `.env.local`
- [ ] Node.js 20.x or higher installed

## Quick Migration Steps

### 1. Verify Setup

```bash
# Verify Appwrite setup
npm run verify:appwrite
```

### 2. Run Migration

```bash
# Run the migration script
npm run migrate:appwrite
```

### 3. Review Results

The script will output:
- Real-time progress for each category
- Success/failure counts
- Detailed error messages if any
- Final summary report

### 4. Post-Migration Verification

```bash
# Check Appwrite dashboard
# Verify record counts match Supabase

# Test authentication
# Try logging in (users will need password reset)

# Test application features
# Verify all CRUD operations work
```

## Expected Migration Time

| Data Volume | Estimated Time |
|-------------|----------------|
| < 100 records | 1-2 minutes |
| 100-1,000 records | 2-5 minutes |
| 1,000-10,000 records | 5-15 minutes |
| > 10,000 records | 15+ minutes |

## Common Issues & Solutions

### Issue: "Collection not found"
**Solution**: Run `npm run setup:appwrite` first

### Issue: "Unauthorized" error
**Solution**: Check `APPWRITE_API_KEY` in `.env.local`

### Issue: "Document already exists"
**Solution**: This is normal if re-running. Script skips existing records.

### Issue: Users can't log in
**Solution**: Users need to reset passwords. Send password reset emails.

## Important Notes

⚠️ **Password Reset Required**: All users must reset their passwords after migration because password hashes cannot be transferred between systems.

⚠️ **Keep Supabase Active**: Don't delete Supabase data until you've fully verified the migration and tested the application.

⚠️ **One-Time Migration**: The script is designed to run once. Running multiple times may create duplicate records.

## Support

For detailed documentation, see: `src/scripts/MIGRATION_README.md`

## Rollback Plan

If issues occur:
1. Keep Supabase database active
2. Revert code to Supabase version
3. Update environment variables
4. Clear Appwrite collections if needed
5. Re-run migration after fixing issues

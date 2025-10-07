# Appwrite Implementation Notes

## Important Discoveries

### Reserved Keywords
During setup, we discovered that `order` appeared to be a reserved keyword when creating indexes, but the attribute itself was created successfully. The current implementation uses `order` as the attribute name in the `custom_fields` collection.

**Status**: The `order` attribute exists and works correctly. The error occurred during index creation, not attribute creation.

**Action**: When implementing API routes, use `order` as the field name to match the actual database schema.

### Collection Schema Verification

All 8 collections have been successfully created with the following structure:

1. ✅ **users** - 5 attributes, 3 indexes
2. ✅ **roles** - 3 attributes, 1 index
3. ✅ **attendees** - 7 attributes, 3 indexes
4. ✅ **custom_fields** - 7 attributes, 1 index (note: missing fieldOrder_idx)
5. ✅ **event_settings** - 8 attributes, 0 indexes
6. ✅ **logs** - 4 attributes, 2 indexes
7. ✅ **log_settings** - 6 attributes, 0 indexes
8. ✅ **invitations** - 5 attributes, 3 indexes

### Missing Indexes

The `custom_fields` collection is missing the `fieldOrder_idx` index due to the reserved keyword issue. This index should be created manually in the Appwrite Console:

**To create manually**:
1. Go to Appwrite Console → Databases → credentialstudio → custom_fields
2. Click "Indexes" tab
3. Click "Create Index"
4. Key: `fieldOrder_idx`
5. Type: `key`
6. Attributes: `order`
7. Click "Create"

Alternatively, the index can be created programmatically after the collection exists.

## Environment Variables Status

All required environment variables are configured in `.env.local`:

- ✅ NEXT_PUBLIC_APPWRITE_ENDPOINT
- ✅ NEXT_PUBLIC_APPWRITE_PROJECT_ID
- ✅ APPWRITE_API_KEY
- ✅ NEXT_PUBLIC_APPWRITE_DATABASE_ID
- ✅ All 8 collection IDs

## Next Steps for Implementation

1. **Task 2**: Implement core Appwrite utilities
   - Update `src/lib/appwrite.ts` with session and admin clients
   - Create `src/lib/appwriteQueries.ts` for query helpers
   - Create `src/hooks/useRealtimeSubscription.ts` for real-time functionality

2. **Task 3**: Migrate authentication system
   - Rewrite `src/contexts/AuthContext.tsx` to use Appwrite Auth
   - Update OAuth and magic link flows
   - Update ProtectedRoute component

3. **Important**: When working with custom_fields, use `order` as the attribute name, not `fieldOrder`

## Testing Recommendations

Before proceeding with data migration:
1. Test authentication flows with Appwrite Auth
2. Test CRUD operations on each collection
3. Verify permissions work as expected
4. Test real-time subscriptions
5. Validate JSON field serialization/deserialization

## Security Checklist

- ✅ API key stored in .env.local (not committed)
- ⚠️ Review collection permissions in Appwrite Console
- ⚠️ Configure OAuth providers (Google) if needed
- ⚠️ Set up proper role-based access control
- ⚠️ Enable 2FA on Appwrite account

## Performance Considerations

- All critical fields have indexes for fast lookups
- Consider adding more indexes based on query patterns
- Monitor query performance in Appwrite Console
- Use pagination for large result sets

## Backup Strategy

- Set up regular database exports
- Test restore procedures
- Keep Supabase database active during migration
- Document rollback procedures

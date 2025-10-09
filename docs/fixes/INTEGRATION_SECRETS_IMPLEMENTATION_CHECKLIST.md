# Integration Secrets Security Fix - Implementation Checklist

This checklist guides you through implementing the security fix that removes API credentials from the database.

## Phase 1: Pre-Migration Setup ✅ COMPLETE

- [x] Update migration script to remove secret fields
- [x] Create secure configuration helper (`src/lib/cloudinary-config.ts`)
- [x] Create comprehensive documentation
- [x] Add security warnings to migration script

## Phase 2: Environment Configuration ⏳ TODO

### Local Development

- [ ] Add credentials to `.env.local`:
  ```bash
  # Cloudinary
  CLOUDINARY_CLOUD_NAME=your-cloud-name
  CLOUDINARY_API_KEY=your-api-key
  CLOUDINARY_API_SECRET=your-api-secret
  
  # Switchboard
  SWITCHBOARD_API_KEY=your-switchboard-key
  ```

- [ ] Verify credentials are loaded:
  ```bash
  npm run dev
  # Check that environment variables are accessible
  ```

### Staging Environment

- [ ] Add environment variables to staging deployment platform
- [ ] Test credential access in staging
- [ ] Verify integrations work in staging

### Production Environment

- [ ] Add environment variables to production deployment platform
- [ ] Use different credentials than staging/development
- [ ] Document credential rotation procedures

## Phase 3: Code Updates ⏳ TODO

### Update Integration Helper

**File:** `src/lib/appwrite-integrations.ts`

- [ ] Remove `cloudinaryApiKey` from `flattenEventSettings()`
- [ ] Remove `cloudinaryApiSecret` from `flattenEventSettings()`
- [ ] Remove `switchboardApiKey` from `flattenEventSettings()`
- [ ] Add comment explaining credentials come from environment variables

### Update API Routes

**File:** `src/pages/api/event-settings/index.ts`

- [ ] Remove `apiKey` and `apiSecret` from Cloudinary update logic
- [ ] Remove `apiKey` from Switchboard update logic
- [ ] Add validation that environment variables are configured
- [ ] Update error messages to reference environment configuration

**Files to check for credential usage:**
```bash
# Search for all references
grep -r "cloudinaryApiKey" src/pages/api/
grep -r "cloudinaryApiSecret" src/pages/api/
grep -r "switchboardApiKey" src/pages/api/
```

- [ ] Update each file found to use environment variables instead

### Update UI Components

**File:** `src/components/EventSettingsForm.tsx`

- [ ] Remove or disable `cloudinaryApiKey` input field
- [ ] Remove or disable `cloudinaryApiSecret` input field
- [ ] Remove or disable `switchboardApiKey` input field
- [ ] Add informational alert explaining credentials are configured via environment variables
- [ ] Update form validation to not require these fields

**Example alert to add:**
```tsx
<Alert>
  <AlertDescription>
    Integration API credentials are configured via environment variables for security.
    Contact your system administrator to update credentials.
  </AlertDescription>
</Alert>
```

### Update Dashboard

**File:** `src/pages/dashboard.tsx`

- [ ] Remove `cloudinaryApiKey` from interface
- [ ] Remove `cloudinaryApiSecret` from interface
- [ ] Remove `switchboardApiKey` from interface
- [ ] Update integration status checks to not rely on these fields

### Create Switchboard Config Helper (Optional)

Similar to `src/lib/cloudinary-config.ts`, create:

**File:** `src/lib/switchboard-config.ts`

- [ ] Create `getSwitchboardApiKey()` function
- [ ] Create `isSwitchboardConfigured()` function
- [ ] Create `getSafeSwitchboardConfig()` for logging
- [ ] Add comprehensive JSDoc comments

## Phase 4: Testing ⏳ TODO

### Unit Tests

- [ ] Update test files that mock credential data
- [ ] Remove credential assertions from tests
- [ ] Add tests for environment variable validation
- [ ] Test error handling when credentials missing

**Test files to update:**
- `src/pages/api/event-settings/__tests__/integration-error-handling.test.ts`
- `src/pages/api/event-settings/__tests__/integration-update-error-handling.test.ts`
- `src/pages/api/event-settings/__tests__/cache-invalidation-integration-updates.test.ts`
- `src/pages/api/event-settings/__tests__/cache-integration-fields.test.ts`
- `src/pages/api/event-settings/__tests__/partial-integration-updates.test.ts`
- `src/pages/api/event-settings/__tests__/complete-field-mapping.test.ts`

### Integration Tests

- [ ] Test Cloudinary upload with environment variable credentials
- [ ] Test Switchboard printing with environment variable credentials
- [ ] Test error handling when credentials not configured
- [ ] Verify credentials not exposed in API responses
- [ ] Test credential validation on startup

### Manual Testing

- [ ] Upload photo via Cloudinary integration
- [ ] Print credential via Switchboard integration
- [ ] Verify event settings form works without credential inputs
- [ ] Check browser console for any credential exposure
- [ ] Verify database does not contain credentials

## Phase 5: Migration Execution ⏳ TODO

### Backup

- [ ] Export current event settings data
- [ ] Document current Cloudinary credentials (store securely!)
- [ ] Document current Switchboard credentials (store securely!)
- [ ] Create database backup

### Run Migration

- [ ] Run migration script:
  ```bash
  npx tsx src/scripts/migrate-with-integration-collections.ts
  ```

- [ ] Review migration output for warnings
- [ ] Verify collections created successfully
- [ ] Check that credentials were not migrated

### Verify Migration

- [ ] Check `cloudinary_integrations` collection schema (no apiKey/apiSecret fields)
- [ ] Check `switchboard_integrations` collection schema (no apiKey field)
- [ ] Verify documents created successfully
- [ ] Confirm credential warnings were logged

## Phase 6: Deployment ⏳ TODO

### Pre-Deployment

- [ ] Update deployment documentation
- [ ] Add environment variables to deployment platform
- [ ] Test deployment in staging environment
- [ ] Create rollback plan

### Deployment

- [ ] Deploy updated code to production
- [ ] Verify environment variables are loaded
- [ ] Monitor application logs for errors
- [ ] Test integrations in production

### Post-Deployment

- [ ] Verify Cloudinary uploads work
- [ ] Verify Switchboard printing works
- [ ] Monitor error rates
- [ ] Check for any credential exposure in logs

## Phase 7: Documentation & Cleanup ⏳ TODO

### Documentation

- [ ] Update README with environment variable requirements
- [ ] Document credential rotation procedures
- [ ] Update deployment guide
- [ ] Create runbook for credential issues

### Cleanup

- [ ] Remove old migration scripts that store credentials
- [ ] Archive outdated documentation
- [ ] Update team knowledge base
- [ ] Schedule credential rotation

## Phase 8: Security Audit ⏳ TODO

### Code Review

- [ ] Search codebase for any remaining credential storage:
  ```bash
  grep -r "apiKey.*apiSecret" src/
  grep -r "cloudinaryApiKey" src/
  grep -r "switchboardApiKey" src/
  ```

- [ ] Verify no credentials in version control:
  ```bash
  git log -p | grep -i "api.*key"
  ```

- [ ] Check for credentials in logs
- [ ] Verify credentials not in database backups

### Security Testing

- [ ] Attempt to retrieve credentials via API
- [ ] Check browser DevTools for credential exposure
- [ ] Verify database queries don't return credentials
- [ ] Test with security scanning tools

### Compliance

- [ ] Document security improvement for audit
- [ ] Update security policies
- [ ] Review against compliance requirements (PCI-DSS, SOC 2, etc.)
- [ ] Schedule next security review

## Rollback Plan

If issues occur:

1. **Immediate:** Revert code deployment
2. **Database:** Restore from backup if needed
3. **Credentials:** Ensure environment variables still configured
4. **Communication:** Notify team of rollback
5. **Investigation:** Identify and document issue
6. **Resolution:** Fix issue and redeploy

## Success Criteria

- ✅ No API credentials stored in database
- ✅ All integrations work with environment variable credentials
- ✅ No credentials exposed in API responses or logs
- ✅ Error handling works when credentials missing
- ✅ Documentation complete and accurate
- ✅ Team trained on new credential management

## Resources

- **Migration Guide:** `docs/migration/INTEGRATION_SECRETS_MIGRATION.md`
- **Fix Details:** `docs/fixes/INTEGRATION_SECRETS_SECURITY_FIX.md`
- **Summary:** `docs/fixes/INTEGRATION_SECRETS_FIX_SUMMARY.md`
- **Helper Module:** `src/lib/cloudinary-config.ts`

## Questions or Issues?

1. Review comprehensive documentation (see Resources above)
2. Check existing GitHub issues
3. Create new issue with detailed information
4. Contact security team for sensitive credential issues

---

**Last Updated:** 2025-10-07  
**Status:** Phase 1 Complete, Phases 2-8 Pending  
**Priority:** HIGH - Complete ASAP

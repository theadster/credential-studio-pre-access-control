# Task 47: Event Settings Transactions - Deployment Checklist

## Overview
This checklist guides the deployment of event settings transaction support to staging and production environments.

## Pre-Deployment Verification

### ✅ Code Verification
- [x] Transaction implementation complete in `src/pages/api/event-settings/index.ts`
- [x] All integration tests passing (6/6 tests)
- [x] Environment configuration updated in `.env.local`
- [x] `TRANSACTIONS_ENDPOINTS` includes `event-settings`

### ✅ Test Results
```
Test Files  1 passed (1)
Tests       6 passed (6)
Duration    544ms
```

**Test Coverage:**
- ✅ Atomic update of core settings + custom fields
- ✅ Atomic update with integration changes
- ✅ Rollback on custom field deletion failure
- ✅ Integration template cleanup on field deletion
- ✅ Integration conflict error handling

## Staging Deployment

### Step 1: Environment Configuration

Update staging `.env.local` or environment variables:

```bash
# Ensure these are set correctly
APPWRITE_PLAN=PRO
ENABLE_TRANSACTIONS=true
ENABLE_TRANSACTION_FALLBACK=true

# Add event-settings to the list
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit,user-linking,attendee-crud,custom-fields,roles,event-settings
```

### Step 2: Deploy to Staging

```bash
# Build and deploy
npm run build
npm run start

# Or deploy via your CI/CD pipeline
git push origin staging
```

### Step 3: Staging Testing Checklist

#### Test 1: Basic Event Settings Update
- [ ] Navigate to Event Settings page
- [ ] Update event name and date
- [ ] Click Save
- [ ] Verify settings are saved correctly
- [ ] Check logs for transaction success message

#### Test 2: Custom Field Operations
- [ ] Add a new custom field
- [ ] Modify an existing custom field
- [ ] Delete a custom field
- [ ] Verify all changes are atomic (all succeed or all fail)
- [ ] Check that integration templates are cleaned up if field is deleted

#### Test 3: Integration Settings Update
- [ ] Update Cloudinary settings
- [ ] Update Switchboard Canvas settings
- [ ] Update OneSimpleAPI settings
- [ ] Verify integration updates are atomic with core settings

#### Test 4: Complex Multi-Operation Update
- [ ] Update core settings (event name, date, barcode settings)
- [ ] Add 2 new custom fields
- [ ] Modify 1 existing custom field
- [ ] Delete 1 custom field
- [ ] Update integration settings
- [ ] Verify all operations complete atomically

#### Test 5: Error Handling
- [ ] Attempt to create duplicate custom field (should fail gracefully)
- [ ] Verify rollback occurs on error
- [ ] Check error messages are user-friendly
- [ ] Verify no partial updates occurred

#### Test 6: Performance Testing
- [ ] Update settings with 10+ custom fields
- [ ] Measure response time (should be < 3 seconds)
- [ ] Verify no performance degradation

### Step 4: Monitor Staging

Monitor for 24-48 hours:

```bash
# Check application logs
tail -f logs/application.log | grep "Event Settings Transaction"

# Look for:
# - "[Event Settings Transaction] Executing N operations atomically"
# - "[Event Settings Transaction] Successfully committed all operations"
# - Any error messages or rollback notifications
```

**Key Metrics to Monitor:**
- Transaction success rate (target: > 95%)
- Average transaction duration (target: < 3 seconds)
- Fallback usage rate (target: < 5%)
- Error rate (target: < 1%)

### Step 5: Staging Sign-Off

Before proceeding to production, verify:
- [ ] All test scenarios passed
- [ ] No errors in logs
- [ ] Performance is acceptable
- [ ] Users report no issues
- [ ] Rollback plan is documented

## Production Deployment

### Step 1: Pre-Production Checklist
- [ ] Staging has been stable for 24-48 hours
- [ ] All stakeholders have approved
- [ ] Rollback plan is ready
- [ ] Maintenance window scheduled (if needed)
- [ ] Backup of current production data taken

### Step 2: Environment Configuration

Update production `.env.local` or environment variables:

```bash
# Production configuration
APPWRITE_PLAN=PRO
ENABLE_TRANSACTIONS=true
ENABLE_TRANSACTION_FALLBACK=true

# Add event-settings to the list
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit,user-linking,attendee-crud,custom-fields,roles,event-settings
```

### Step 3: Deploy to Production

```bash
# Build and deploy
npm run build
npm run start

# Or deploy via your CI/CD pipeline
git push origin main
```

### Step 4: Production Smoke Tests

Immediately after deployment, run quick smoke tests:

#### Quick Test 1: Basic Update (2 minutes)
- [ ] Login to production
- [ ] Navigate to Event Settings
- [ ] Make a minor change (e.g., update event name)
- [ ] Save and verify

#### Quick Test 2: Custom Field Update (2 minutes)
- [ ] Add a test custom field
- [ ] Verify it appears in attendee form
- [ ] Delete the test custom field
- [ ] Verify it's removed

#### Quick Test 3: Integration Check (2 minutes)
- [ ] Verify Cloudinary integration still works
- [ ] Verify Switchboard integration still works
- [ ] Check that existing integrations are not affected

### Step 5: Production Monitoring

Monitor closely for the first 24 hours:

```bash
# Real-time log monitoring
tail -f logs/application.log | grep -E "Event Settings|Transaction"

# Check for errors
tail -f logs/error.log
```

**Critical Metrics:**
- Transaction success rate
- Response times
- Error rates
- Fallback usage
- User-reported issues

### Step 6: Post-Deployment Verification

After 24 hours:
- [ ] Review all metrics
- [ ] Check for any user-reported issues
- [ ] Verify transaction logs show expected patterns
- [ ] Confirm no data integrity issues
- [ ] Document any issues and resolutions

## Rollback Plan

If issues are detected in production:

### Immediate Rollback (< 5 minutes)

```bash
# Option 1: Disable transactions via environment variable
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit,user-linking,attendee-crud,custom-fields,roles
# Remove 'event-settings' from the list

# Option 2: Disable all transactions
ENABLE_TRANSACTIONS=false

# Restart application
npm run start
```

### Full Rollback (< 15 minutes)

```bash
# Revert to previous deployment
git revert <commit-hash>
git push origin main

# Or rollback via CI/CD
# Deploy previous stable version
```

### Post-Rollback Actions
1. Document the issue that caused rollback
2. Analyze logs to identify root cause
3. Create fix in development environment
4. Re-test in staging before attempting production again

## Success Criteria

### Staging Success Criteria
- ✅ All test scenarios pass
- ✅ No errors in logs for 24-48 hours
- ✅ Transaction success rate > 95%
- ✅ Average response time < 3 seconds
- ✅ Fallback usage < 5%

### Production Success Criteria
- ✅ Smoke tests pass immediately after deployment
- ✅ No critical errors in first 24 hours
- ✅ Transaction success rate > 95%
- ✅ No user-reported issues
- ✅ Performance metrics within acceptable range

## Monitoring Queries

### Check Transaction Success Rate
```bash
# Count successful transactions
grep "Event Settings Transaction.*Successfully committed" logs/application.log | wc -l

# Count failed transactions
grep "Event Settings Transaction.*failed" logs/application.log | wc -l
```

### Check Average Response Time
```bash
# Extract transaction durations
grep "Event Settings Transaction.*duration" logs/application.log
```

### Check Fallback Usage
```bash
# Count fallback occurrences
grep "Event Settings.*fallback" logs/application.log | wc -l
```

## Contact Information

**Deployment Lead:** [Your Name]  
**On-Call Engineer:** [Engineer Name]  
**Escalation Contact:** [Manager Name]

## Notes

- Event settings updates are typically infrequent (once per event setup)
- Low transaction volume expected (< 100 per day)
- High data integrity requirement (settings affect entire event)
- Fallback to legacy API is available if needed

## Completion Checklist

- [ ] Staging deployment complete
- [ ] Staging testing complete (all scenarios passed)
- [ ] Staging monitoring complete (24-48 hours stable)
- [ ] Production deployment complete
- [ ] Production smoke tests complete
- [ ] Production monitoring complete (24 hours stable)
- [ ] Documentation updated
- [ ] Task marked as complete

---

**Deployment Date:** _________________  
**Deployed By:** _________________  
**Sign-Off:** _________________

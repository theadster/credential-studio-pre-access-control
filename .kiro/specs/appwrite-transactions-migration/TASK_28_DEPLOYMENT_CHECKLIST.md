# Task 28: User Linking Transactions - Deployment Checklist

## Pre-Deployment Verification

### ✅ Configuration Changes
- [x] `.env.local` updated with `user-linking` in `TRANSACTIONS_ENDPOINTS`
- [x] `ENABLE_TRANSACTIONS=true` is set
- [x] `ENABLE_TRANSACTION_FALLBACK=true` is set
- [x] `APPWRITE_PLAN=PRO` is configured (1,000 operations per transaction)

### ✅ Code Verification
- [x] User linking API checks `TRANSACTIONS_ENDPOINTS` configuration
- [x] Transaction implementation includes user profile + audit log
- [x] Team membership handling is implemented
- [x] Conflict handling with retry logic is in place
- [x] Rollback on failure is implemented
- [x] Error handling uses `handleTransactionError()`

### ✅ Prerequisites
- [x] Task 25: User linking migration completed
- [x] Task 26: Conflict handling implemented
- [x] Task 27: Integration tests written and passing

## Staging Deployment

### Step 1: Deploy Configuration
```bash
# Copy .env.local to staging environment
# Ensure these variables are set:
ENABLE_TRANSACTIONS=true
ENABLE_TRANSACTION_FALLBACK=true
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit,user-linking
APPWRITE_PLAN=PRO
```

### Step 2: Verify Environment
```bash
# Check that environment variables are loaded
# Restart application if needed
```

### Step 3: Manual Testing

#### Test Case 1: Basic User Linking
- [ ] Link a new auth user to database
- [ ] Verify user profile is created
- [ ] Verify audit log is created
- [ ] Verify response includes `"usedTransactions": true`
- [ ] Check logs for transaction success message

**Expected Response:**
```json
{
  "success": true,
  "usedTransactions": true,
  "user": {
    "id": "...",
    "userId": "...",
    "email": "test@example.com",
    "name": "Test User",
    "roleId": "...",
    "role": { ... }
  }
}
```

#### Test Case 2: User Linking with Team Membership
- [ ] Enable team membership: `APPWRITE_TEAM_MEMBERSHIP_ENABLED=true`
- [ ] Set team ID: `NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID=...`
- [ ] Link user with `addToTeam: true`
- [ ] Verify team membership is created
- [ ] Verify team membership log is created
- [ ] Check team roles match user's role

**Expected Response:**
```json
{
  "success": true,
  "usedTransactions": true,
  "user": { ... },
  "teamMembership": {
    "status": "success",
    "teamId": "...",
    "membershipId": "...",
    "roles": ["member"]
  }
}
```

#### Test Case 3: Duplicate User Linking
- [ ] Attempt to link same user twice
- [ ] Verify 400 error response
- [ ] Verify error message: "User is already linked to database"
- [ ] Verify no duplicate profiles created

**Expected Response:**
```json
{
  "error": "User is already linked to database"
}
```

#### Test Case 4: Invalid Role ID
- [ ] Attempt to link user with invalid roleId
- [ ] Verify 400 error response
- [ ] Verify error message: "Invalid role ID"
- [ ] Verify no user profile created

#### Test Case 5: Unauthorized Access
- [ ] Attempt to link user without admin permissions
- [ ] Verify 403 error response
- [ ] Verify error message: "Insufficient permissions to link users"

#### Test Case 6: Transaction Rollback
- [ ] Simulate transaction failure (if possible)
- [ ] Verify no partial data created
- [ ] Verify team membership is cleaned up
- [ ] Verify appropriate error response

### Step 4: Monitor Logs
```bash
# Check application logs for:
- "[User Linking] Using transactions for atomic user profile + audit log creation"
- "[User Linking] Transaction completed successfully"
- "[User Linking] Team membership created successfully"
- No "[User Linking] Transaction failed" errors
- No "[User Linking] Using legacy approach" messages
```

### Step 5: Performance Testing
- [ ] Link 10 users sequentially
- [ ] Measure average response time (target: < 2 seconds)
- [ ] Verify all operations succeed
- [ ] Check for any timeout errors

### Step 6: Concurrent Operations Test
- [ ] Attempt to link multiple users simultaneously
- [ ] Verify all operations succeed or fail gracefully
- [ ] Check for conflict handling (409 responses)
- [ ] Verify retry logic works correctly

## Production Deployment

### Pre-Production Checklist
- [ ] All staging tests passed
- [ ] No errors in staging logs
- [ ] Performance is acceptable
- [ ] Team is notified of deployment
- [ ] Rollback plan is documented

### Step 1: Deploy to Production
```bash
# Update production .env with:
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit,user-linking
```

### Step 2: Initial Monitoring (First Hour)
- [ ] Monitor first 10 user linking operations
- [ ] Check transaction success rate (target: > 95%)
- [ ] Verify no fallback to legacy approach
- [ ] Check response times (target: < 2 seconds)
- [ ] Monitor error logs for any issues

### Step 3: Extended Monitoring (First Day)
- [ ] Track total user linking operations
- [ ] Calculate success rate
- [ ] Monitor for any conflict errors
- [ ] Check team membership creation success rate
- [ ] Verify audit logs are complete

### Step 4: Weekly Review
- [ ] Review transaction metrics
- [ ] Analyze any failures
- [ ] Check for performance degradation
- [ ] Verify data consistency

## Monitoring Metrics

### Key Performance Indicators
| Metric | Target | Actual |
|--------|--------|--------|
| Success Rate | > 95% | ___ |
| Average Duration | < 2s | ___ |
| Fallback Usage | 0% | ___ |
| Conflict Rate | < 1% | ___ |
| Team Membership Success | > 95% | ___ |

### Log Queries
```bash
# Count successful user linking operations
grep "User Linking.*Transaction completed successfully" logs.txt | wc -l

# Count failed operations
grep "User Linking.*Transaction failed" logs.txt | wc -l

# Count fallback usage (should be 0)
grep "User Linking.*Using legacy approach" logs.txt | wc -l

# Check team membership creation
grep "Team membership created successfully" logs.txt | wc -l
```

## Rollback Procedure

### If Issues Are Detected

#### Step 1: Immediate Rollback
```bash
# Update .env.local or production environment
TRANSACTIONS_ENDPOINTS=bulk-import,bulk-delete,bulk-edit
# Remove 'user-linking' from the list
```

#### Step 2: Verify Fallback
- [ ] Confirm system uses legacy approach
- [ ] Test user linking operation
- [ ] Verify operation succeeds
- [ ] Check logs for "Using legacy approach" message

#### Step 3: Investigation
- [ ] Review error logs
- [ ] Identify failure patterns
- [ ] Check transaction conflict rate
- [ ] Verify team membership cleanup
- [ ] Test in staging environment

#### Step 4: Fix and Redeploy
- [ ] Implement fix
- [ ] Test in staging
- [ ] Re-enable transactions
- [ ] Monitor closely

## Success Criteria

### Must Have
✅ User linking operations complete successfully  
✅ Audit logs created atomically  
✅ Team membership handled correctly  
✅ No partial data on failures  
✅ Success rate > 95%

### Should Have
✅ Response time < 2 seconds  
✅ Conflict handling works correctly  
✅ Rollback works on failures  
✅ Comprehensive logging

### Nice to Have
✅ Zero fallback usage  
✅ Zero transaction failures  
✅ Performance improvement over legacy

## Sign-Off

### Staging Approval
- [ ] All tests passed
- [ ] Performance acceptable
- [ ] No critical issues
- [ ] Approved by: ________________
- [ ] Date: ________________

### Production Approval
- [ ] Staging results reviewed
- [ ] Deployment plan approved
- [ ] Rollback plan documented
- [ ] Approved by: ________________
- [ ] Date: ________________

## Notes

- User linking is a critical operation for user management
- Team membership is handled outside transaction (Appwrite limitation)
- Comprehensive logging helps with troubleshooting
- Fallback to legacy approach is available if needed
- Monitor closely during initial rollout

## Contact Information

**For Issues:**
- Check logs first
- Review this checklist
- Test in staging environment
- Contact development team if needed

**Emergency Rollback:**
- Remove `user-linking` from `TRANSACTIONS_ENDPOINTS`
- System will automatically use legacy approach
- No code changes required

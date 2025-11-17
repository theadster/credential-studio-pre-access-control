# Rollback Procedure
## Next.js 16 Migration - CredentialStudio

**Document Version:** 1.0  
**Last Updated:** January 13, 2025  
**Rollback Complexity:** Low  
**Estimated Rollback Time:** 5-10 minutes

---

## Quick Rollback (Emergency)

If you need to rollback immediately:

```bash
# 1. Switch back to main branch
git checkout main

# 2. Force clean any changes
git clean -fd

# 3. Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# 4. Verify application works
npm run build
npm run dev
```

**Done!** Your application is back to the pre-migration state.

---

## Table of Contents

1. [Rollback Triggers](#rollback-triggers)
2. [Pre-Rollback Checklist](#pre-rollback-checklist)
3. [Rollback Methods](#rollback-methods)
4. [Verification Steps](#verification-steps)
5. [Post-Rollback Actions](#post-rollback-actions)
6. [Troubleshooting](#troubleshooting)

---

## Rollback Triggers

Initiate rollback if any of the following occur:

### Critical Triggers (Immediate Rollback)
- ❌ Application fails to build after multiple attempts
- ❌ Critical functionality is completely broken
- ❌ Data corruption or loss occurs
- ❌ Security vulnerabilities are introduced
- ❌ Production deployment fails repeatedly

### High Priority Triggers (Rollback Recommended)
- ⚠️ Performance degrades by >20% (worse than baseline)
- ⚠️ Multiple critical features are broken
- ⚠️ Third-party integrations fail (Appwrite, Cloudinary, Switchboard)
- ⚠️ Authentication system is compromised
- ⚠️ Database operations fail consistently

### Medium Priority Triggers (Consider Rollback)
- ⚠️ Test failure rate increases significantly (>50% failures)
- ⚠️ Development experience is severely degraded
- ⚠️ Build time increases significantly (>50% slower)
- ⚠️ Bundle size increases significantly (>30% larger)

### Low Priority Triggers (Fix Forward)
- ℹ️ Minor UI issues
- ℹ️ Non-critical warnings
- ℹ️ Individual test failures
- ℹ️ ESLint warnings

---

## Pre-Rollback Checklist

Before initiating rollback, complete these steps:

### 1. Document the Issue
```markdown
## Rollback Reason

**Date:** [Date]
**Time:** [Time]
**Initiated By:** [Name]
**Trigger:** [Critical/High/Medium]

### Issue Description
[Detailed description of what went wrong]

### Steps to Reproduce
1. [Step 1]
2. [Step 2]
3. [Step 3]

### Error Messages
```
[Paste error messages here]
```

### Impact Assessment
- [ ] Production affected
- [ ] Development blocked
- [ ] Data at risk
- [ ] Security concern
```

### 2. Notify Team
- Inform team members of rollback decision
- Document reason in team communication channel
- Set expectations for timeline

### 3. Backup Current State (Optional)
If you want to preserve migration attempt for analysis:

```bash
# Create a backup branch of failed migration
git checkout migration/nextjs-16
git branch migration/nextjs-16-failed-$(date +%Y%m%d)
git push origin migration/nextjs-16-failed-$(date +%Y%m%d)
```

---

## Rollback Methods

Choose the appropriate rollback method based on your situation:

### Method 1: Git Branch Rollback (Recommended)

**Use When:** Migration was done on `migration/nextjs-16` branch

**Steps:**

1. **Switch to main branch**
   ```bash
   git checkout main
   ```

2. **Verify you're on main**
   ```bash
   git branch
   # Should show: * main
   ```

3. **Clean any uncommitted changes**
   ```bash
   git clean -fd
   git reset --hard HEAD
   ```

4. **Remove node_modules and lock file**
   ```bash
   rm -rf node_modules package-lock.json .next
   ```

5. **Reinstall dependencies**
   ```bash
   npm install
   ```

6. **Verify installation**
   ```bash
   npm list next react react-dom
   # Should show Next.js 16.0.3, React 19.2.0
   ```

**Advantages:**
- ✅ Fastest method
- ✅ Cleanest rollback
- ✅ No risk of partial changes

**Time Required:** 2-5 minutes

---

### Method 2: Git Tag Rollback

**Use When:** You want to rollback to exact pre-migration state

**Steps:**

1. **List available tags**
   ```bash
   git tag
   # Should show: pre-migration-backup
   ```

2. **Checkout the tag**
   ```bash
   git checkout pre-migration-backup
   ```

3. **Create a new branch from tag (optional)**
   ```bash
   git checkout -b rollback-from-tag
   ```

4. **Clean and reinstall**
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   ```

**Advantages:**
- ✅ Exact pre-migration state
- ✅ Tagged for easy reference

**Time Required:** 3-5 minutes

---

### Method 3: Git Reset Rollback

**Use When:** Changes were committed to main branch (not recommended practice)

**Steps:**

1. **Find the commit before migration**
   ```bash
   git log --oneline
   # Find the commit hash before migration started
   ```

2. **Reset to that commit**
   ```bash
   git reset --hard <commit-hash>
   ```

3. **Force push (if already pushed)**
   ```bash
   git push origin main --force
   # ⚠️ WARNING: Only do this if you're sure!
   ```

4. **Clean and reinstall**
   ```bash
   rm -rf node_modules package-lock.json .next
   npm install
   ```

**Advantages:**
- ✅ Works even if changes were committed to main

**Disadvantages:**
- ⚠️ Requires force push if changes were pushed
- ⚠️ Can affect other team members

**Time Required:** 5-10 minutes

---

### Method 4: Manual Dependency Rollback

**Use When:** Only dependencies were updated, no code changes

**Steps:**

1. **Restore package.json**
   ```bash
   git checkout main -- package.json
   ```

2. **Remove node_modules and lock file**
   ```bash
   rm -rf node_modules package-lock.json
   ```

3. **Reinstall dependencies**
   ```bash
   npm install
   ```

4. **Verify versions**
   ```bash
   npm list next react react-dom
   ```

**Advantages:**
- ✅ Quick if only dependencies changed
- ✅ No need to switch branches

**Time Required:** 2-3 minutes

---

## Verification Steps

After rollback, verify the application is working correctly:

### 1. Verify Git State

```bash
# Check current branch
git branch
# Should show: * main (or your pre-migration branch)

# Check for uncommitted changes
git status
# Should show: nothing to commit, working tree clean

# Verify tag exists
git tag
# Should show: pre-migration-backup
```

### 2. Verify Dependency Versions

```bash
# Check Next.js version
npm list next
# Should show: next@15.5.2

# Check React version
npm list react
# Should show: react@19.1.1

# Check React-DOM version
npm list react-dom
# Should show: react-dom@19.1.1

# Check for any issues
npm audit
```

### 3. Verify Build Process

```bash
# Clean build artifacts
rm -rf .next

# Run production build
npm run build

# Expected: Build should complete successfully
# Expected: No critical errors
# Expected: Build time similar to baseline (~6 seconds)
```

### 4. Verify Development Server

```bash
# Start development server
npm run dev

# Expected: Server starts without errors
# Expected: Application loads at http://localhost:3000
# Expected: No console errors
```

### 5. Verify Tests

```bash
# Run test suite
npx vitest --run

# Expected: Similar results to baseline
# Expected: 1,541 passing tests
# Expected: No new test failures
```

### 6. Verify Critical Functionality

Test these critical features manually:

#### Authentication
- [ ] Login with email/password works
- [ ] Login with Google OAuth works
- [ ] Logout works
- [ ] Session management works
- [ ] Password reset works

#### Attendee Management
- [ ] View attendees list
- [ ] Create new attendee
- [ ] Edit existing attendee
- [ ] Delete attendee
- [ ] Search and filter work

#### Event Configuration
- [ ] View event settings
- [ ] Update event settings
- [ ] Manage custom fields
- [ ] Configure barcode settings

#### Integrations
- [ ] Cloudinary image upload works
- [ ] Switchboard credential generation works
- [ ] Appwrite database operations work

#### Data Operations
- [ ] Import attendees works
- [ ] Export attendees works
- [ ] Bulk operations work

---

## Post-Rollback Actions

### 1. Document Rollback

Create a rollback report:

```markdown
# Rollback Report

**Date:** [Date]
**Time:** [Time]
**Duration:** [Duration]
**Method Used:** [Method 1/2/3/4]

## Reason for Rollback
[Detailed explanation]

## Issues Encountered During Migration
1. [Issue 1]
2. [Issue 2]
3. [Issue 3]

## Rollback Steps Taken
1. [Step 1]
2. [Step 2]
3. [Step 3]

## Verification Results
- Build: [Pass/Fail]
- Tests: [Pass/Fail]
- Manual Testing: [Pass/Fail]
- Critical Features: [Pass/Fail]

## Lessons Learned
1. [Lesson 1]
2. [Lesson 2]
3. [Lesson 3]

## Next Steps
1. [Action item 1]
2. [Action item 2]
3. [Action item 3]

## Recommendations
[Recommendations for future migration attempts]
```

### 2. Notify Team

- Inform team that rollback is complete
- Share rollback report
- Discuss lessons learned
- Plan next steps

### 3. Clean Up Migration Artifacts

```bash
# Optional: Delete migration branch if no longer needed
git branch -D migration/nextjs-16

# Optional: Delete remote migration branch
git push origin --delete migration/nextjs-16

# Keep the tag for reference
# DO NOT delete: pre-migration-backup tag
```

### 4. Analyze Root Cause

- Review error logs
- Identify what went wrong
- Document blockers
- Research solutions
- Plan corrective actions

### 5. Plan Next Attempt

If planning to retry migration:

1. Address identified issues
2. Update migration plan
3. Add additional safeguards
4. Schedule new migration window
5. Communicate plan to team

---

## Troubleshooting

### Issue: "npm install" fails after rollback

**Symptoms:**
- Dependency installation errors
- Version conflicts
- Peer dependency warnings

**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and lock file
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps flag
npm install --legacy-peer-deps

# If still failing, try with force
npm install --force
```

---

### Issue: Build fails after rollback

**Symptoms:**
- TypeScript errors
- Build process crashes
- Missing dependencies

**Solution:**
```bash
# Clean all build artifacts
rm -rf .next node_modules package-lock.json

# Reinstall dependencies
npm install

# Clear Next.js cache
rm -rf .next

# Try build again
npm run build
```

---

### Issue: Application shows mixed versions

**Symptoms:**
- Some files show Next.js 16, others show 15
- Inconsistent behavior
- Strange errors

**Solution:**
```bash
# Hard reset to main branch
git checkout main
git reset --hard origin/main

# Clean everything
rm -rf node_modules package-lock.json .next

# Fresh install
npm install

# Verify versions
npm list next react react-dom
```

---

### Issue: Tests fail after rollback

**Symptoms:**
- More test failures than baseline
- New test errors
- Test environment issues

**Solution:**
```bash
# Clear test cache
rm -rf coverage node_modules/.vitest

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Run tests again
npx vitest --run
```

---

### Issue: Git conflicts during rollback

**Symptoms:**
- Merge conflicts
- Uncommitted changes blocking checkout
- Detached HEAD state

**Solution:**
```bash
# Stash any uncommitted changes
git stash

# Force checkout main
git checkout -f main

# Clean untracked files
git clean -fd

# If in detached HEAD state
git checkout main
```

---

### Issue: Environment variables missing

**Symptoms:**
- Application fails to start
- "Environment variable not found" errors
- Integration failures

**Solution:**
```bash
# Verify .env.local exists
ls -la .env.local

# If missing, restore from backup or recreate
# Check .env.example for required variables

# Restart application
npm run dev
```

---

### Issue: Database connection fails

**Symptoms:**
- Appwrite connection errors
- Database operations fail
- Authentication doesn't work

**Solution:**
1. Verify Appwrite credentials in `.env.local`
2. Check Appwrite project is accessible
3. Verify network connectivity
4. Check Appwrite service status
5. Review Appwrite console for errors

---

### Issue: Performance is still degraded

**Symptoms:**
- Slow build times persist
- Application is sluggish
- High memory usage

**Solution:**
```bash
# Clear all caches
rm -rf .next node_modules/.cache

# Restart development server
npm run dev

# If still slow, restart computer
# Check for background processes consuming resources
```

---

## Rollback Verification Checklist

Use this checklist to ensure rollback is complete:

### Git State
- [ ] On correct branch (main or pre-migration branch)
- [ ] No uncommitted changes
- [ ] pre-migration-backup tag exists
- [ ] Working tree is clean

### Dependencies
- [ ] Next.js version is 15.5.2
- [ ] React version is 19.1.1
- [ ] React-DOM version is 19.1.1
- [ ] No dependency conflicts
- [ ] npm audit shows no critical issues

### Build Process
- [ ] Production build completes successfully
- [ ] Build time is similar to baseline (~6 seconds)
- [ ] No critical build errors
- [ ] Bundle size is similar to baseline (361MB)

### Development Server
- [ ] Dev server starts without errors
- [ ] Application loads at http://localhost:3000
- [ ] No console errors
- [ ] Hot reload works

### Tests
- [ ] Test suite runs successfully
- [ ] Passing tests match baseline (1,541)
- [ ] No new test failures
- [ ] Test execution time is normal

### Critical Features
- [ ] Authentication works
- [ ] Attendee management works
- [ ] Event configuration works
- [ ] Integrations work (Appwrite, Cloudinary, Switchboard)
- [ ] Data operations work (import/export)

### Documentation
- [ ] Rollback documented
- [ ] Team notified
- [ ] Issues logged
- [ ] Lessons learned captured

---

## Emergency Contacts

If rollback fails or you need assistance:

1. **Check Documentation**
   - Review this rollback procedure
   - Check Next.js 16 migration design document
   - Review compatibility audit report

2. **Team Resources**
   - Contact team lead
   - Post in team communication channel
   - Schedule emergency meeting if needed

3. **External Resources**
   - Next.js Discord: https://nextjs.org/discord
   - Next.js GitHub Issues: https://github.com/vercel/next.js/issues
   - Stack Overflow: Tag with `next.js`

---

## Rollback Success Criteria

Rollback is considered successful when:

✅ All verification steps pass  
✅ Application builds successfully  
✅ Development server runs without errors  
✅ Tests show similar results to baseline  
✅ Critical features work correctly  
✅ No data loss occurred  
✅ Team is notified and informed  
✅ Rollback is documented  

---

## Prevention for Next Attempt

To prevent rollback in future migration attempts:

### Before Migration
1. ✅ Complete all Phase 1 tasks thoroughly
2. ✅ Review all compatibility reports
3. ✅ Test rollback procedure
4. ✅ Have team member review plan
5. ✅ Schedule migration during low-traffic period

### During Migration
1. ✅ Follow tasks in order
2. ✅ Test after each phase
3. ✅ Document issues immediately
4. ✅ Don't skip verification steps
5. ✅ Commit frequently with clear messages

### After Each Phase
1. ✅ Run full test suite
2. ✅ Test critical features manually
3. ✅ Check performance metrics
4. ✅ Verify no regressions
5. ✅ Get team member to review

---

## Conclusion

This rollback procedure provides multiple methods to safely revert the Next.js 16 migration if needed. The procedure is designed to be:

- **Fast:** 2-10 minutes depending on method
- **Safe:** No risk of data loss
- **Reliable:** Git-based, proven approach
- **Documented:** Clear steps and verification
- **Recoverable:** Multiple fallback options

**Remember:** Rollback is not a failure. It's a safety mechanism to protect the application and team. Learn from the experience and try again when ready.

---

**Document Version:** 1.0  
**Last Updated:** January 13, 2025  
**Next Review:** After migration attempt (success or rollback)

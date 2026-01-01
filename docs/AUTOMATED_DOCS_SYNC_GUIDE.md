---
title: Automated Documentation Sync Guide
type: runbook
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 180
related_code: [".github/workflows/sync-docs-between-branches.yml"]
---

# Automated Documentation Sync Guide

**Date:** December 31, 2025  
**Status:** ✅ Automated Sync Enabled

## Overview

Documentation is automatically synchronized between branches using GitHub Actions. When you commit documentation changes to one branch, they are automatically synced to the other branch.

## How It Works

### Trigger
The sync workflow triggers when:
- Changes are pushed to `main` branch
- Changes are pushed to `feature/mobile-access-control` branch
- Changes affect these paths:
  - `docs/**`
  - `scripts/**`
  - `.kiro/steering/**`
  - `.github/workflows/sync-docs-between-branches.yml`

### Process
1. **Detect Source Branch** - Determines which branch was updated
2. **Identify Target Branch** - Determines the other branch
3. **Fetch Latest** - Gets latest from both branches
4. **Sync Files** - Copies docs, scripts, and steering from source to target
5. **Commit Changes** - Auto-commits with descriptive message
6. **Push to Target** - Pushes synced changes to target branch

### Result
Documentation is automatically available on both branches within seconds of pushing.

## Workflow File

**Location:** `.github/workflows/sync-docs-between-branches.yml`

**Branches Synced:**
- `main` ↔ `feature/mobile-access-control`

**Files Synced:**
- `docs/` - All documentation
- `scripts/` - Automation scripts
- `.kiro/steering/` - Steering files

## Usage

### Normal Workflow

**Step 1: Make documentation changes**
```bash
# On any branch (main or feature/mobile-access-control)
git checkout main
# or
git checkout feature/mobile-access-control

# Edit documentation
vim docs/guides/MY_GUIDE.md

# Stage and commit
git add docs/
git commit -m "docs: add my guide"
```

**Step 2: Push changes**
```bash
git push origin main
# or
git push origin feature/mobile-access-control
```

**Step 3: Automatic sync**
- GitHub Actions workflow triggers automatically
- Documentation is synced to the other branch
- Sync commit appears in target branch within seconds

**Step 4: Verify sync**
```bash
# Switch to other branch
git checkout feature/mobile-access-control
# or
git checkout main

# Pull latest
git pull origin

# Verify documentation is synced
ls docs/guides/MY_GUIDE.md
```

## Monitoring Sync

### View Sync Status

**In GitHub:**
1. Go to **Actions** tab
2. Look for **"Sync Documentation Between Branches"** workflow
3. View recent runs and their status

**In Terminal:**
```bash
# View recent commits on both branches
git log --oneline main | head -5
git log --oneline feature/mobile-access-control | head -5

# Should see sync commits like:
# chore(docs): sync documentation from main
```

### Sync Commit Format

Sync commits follow this format:
```
chore(docs): sync documentation from [source-branch]

Automated sync of documentation, scripts, and steering files.
Source branch: [source-branch]
Target branch: [target-branch]
```

## Handling Conflicts

### If Sync Fails

**Scenario:** Both branches modified the same documentation file

**What Happens:**
1. Sync workflow detects conflict
2. Workflow fails (doesn't auto-commit)
3. GitHub Actions shows error

**How to Fix:**
```bash
# 1. Manually merge the conflicting files
git checkout main
git merge feature/mobile-access-control

# 2. Resolve conflicts in your editor
# 3. Commit the merge
git add docs/
git commit -m "chore(docs): resolve sync conflict"

# 4. Push
git push origin main

# 5. Sync workflow will retry automatically
```

### Preventing Conflicts

**Best Practice:** Avoid editing the same documentation file on different branches simultaneously.

**If you must:**
1. Sync manually before making changes
2. Make changes on one branch
3. Wait for automatic sync
4. Then make changes on other branch

## Automation Scripts Sync

The following automation scripts are also synced:
- `scripts/validate-docs-frontmatter.ts`
- `scripts/check-docs-staleness.ts`
- `scripts/check-docs-links.ts`
- `scripts/generate-docs-index.ts`

**Important:** These scripts should be identical on both branches. If you modify a script, it will be automatically synced.

## Steering Sync

The steering file is also synced:
- `.kiro/steering/documentation-organization.md`

**Important:** Steering guidelines should be consistent across branches. Updates are automatically synced.

## GitHub Actions Workflow Details

### Permissions Required
- `contents: write` - To commit and push changes
- `pull-requests: write` - For future PR-based sync (optional)

### Environment
- Runs on: `ubuntu-latest`
- Triggered by: Push events to main branches
- Paths monitored: `docs/`, `scripts/`, `.kiro/steering/`

### Git Configuration
- User: `github-actions[bot]`
- Email: `github-actions[bot]@users.noreply.github.com`

## Troubleshooting

### Sync Not Working

**Check 1: Verify workflow is enabled**
```bash
# Check if workflow file exists
ls -la .github/workflows/sync-docs-between-branches.yml
```

**Check 2: View workflow runs**
1. Go to GitHub repository
2. Click **Actions** tab
3. Look for "Sync Documentation Between Branches"
4. Check recent runs for errors

**Check 3: Verify branch names**
- Workflow syncs between `main` and `feature/mobile-access-control`
- If branch names changed, update workflow

**Check 4: Check file paths**
- Workflow monitors: `docs/`, `scripts/`, `.kiro/steering/`
- If files are in different paths, update workflow

### Sync Commits Appearing Unexpectedly

**This is normal!** Sync commits appear automatically when:
- You push documentation changes
- The workflow detects changes
- It syncs to the other branch

**To reduce sync commits:**
- Batch documentation changes together
- Push less frequently
- Or accept sync commits as part of workflow

### Merge Conflicts During Sync

**If you see merge conflicts:**
1. Don't panic - this is rare
2. Manually resolve conflicts
3. Commit the resolution
4. Push to trigger sync again

## Best Practices

### ✅ DO

- ✅ Commit documentation changes regularly
- ✅ Use descriptive commit messages
- ✅ Push changes to trigger sync
- ✅ Monitor GitHub Actions for sync status
- ✅ Keep documentation consistent across branches

### ❌ DON'T

- ❌ Edit the same doc file on different branches simultaneously
- ❌ Manually cherry-pick docs (let automation handle it)
- ❌ Disable the workflow
- ❌ Force push to branches (breaks sync)
- ❌ Ignore sync failures

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────┐
│ Developer commits docs to main or feature branch        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ GitHub Actions workflow triggers                        │
│ (on push to main or feature/mobile-access-control)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Workflow determines source and target branches          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Workflow fetches latest from both branches              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Workflow syncs docs, scripts, and steering              │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Workflow commits changes to target branch               │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Workflow pushes to target branch                        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ Documentation is now synced on both branches            │
│ ✅ Sync complete!                                       │
└─────────────────────────────────────────────────────────┘
```

## Monitoring Dashboard

### GitHub Actions View
1. Go to repository
2. Click **Actions** tab
3. Select **"Sync Documentation Between Branches"**
4. View recent runs and status

### Commit History
```bash
# View sync commits on main
git log --oneline main | grep "chore(docs): sync"

# View sync commits on feature branch
git log --oneline feature/mobile-access-control | grep "chore(docs): sync"
```

## Future Enhancements

### Possible Improvements
- [ ] Create pull requests instead of auto-committing
- [ ] Add Slack notifications for sync status
- [ ] Add sync status badge to README
- [ ] Support additional branches
- [ ] Add sync history tracking

## Support

### Questions?
- Check GitHub Actions logs for errors
- Review workflow file: `.github/workflows/sync-docs-between-branches.yml`
- See troubleshooting section above

### Issues?
- Verify branch names are correct
- Check file paths are correct
- Ensure workflow file is in `.github/workflows/`
- Verify GitHub Actions is enabled

---

**Status:** ✅ Automated Sync Active  
**Last Updated:** December 31, 2025  
**Next Review:** June 30, 2026 (180 days)

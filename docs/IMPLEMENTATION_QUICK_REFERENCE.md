---
title: Implementation Quick Reference
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: [".gitignore", ".github/workflows/sync-docs-between-branches.yml"]
---

# Implementation Quick Reference

**Quick commands to implement Option A + GitHub Actions**

## Phase 1: Update .gitignore

```bash
# Edit .gitignore
vim .gitignore

# Find and comment out these lines:
# docs/
# scripts/
# .kiro/

# Save and verify
git diff .gitignore
```

## Phase 2: Commit Changes

```bash
# Stage .gitignore
git add .gitignore

# Commit all 387 changes
git commit -m "chore: track documentation system and automation scripts

IMPLEMENTATION: Option A + GitHub Actions

This commit enables documentation tracking and automatic synchronization
between branches (main and feature/mobile-access-control).

CHANGES:
- Remove docs/, scripts/, and .kiro/ from .gitignore
- Track 137 active documentation files
- Track 4 automation scripts
- Track GitHub Actions workflows
- Track steering files

DOCUMENTATION SYSTEM:
- 137 active files organized by category
- 350 archived files in docs/_archive/
- Automated validation and monitoring
- Searchable indexes

AUTOMATION:
- Daily documentation checks
- Automatic branch synchronization
- GitHub Actions workflows

SYNCHRONIZATION:
- Automatic sync between main and feature/mobile-access-control
- Bidirectional: main ↔ feature
- Triggers on push to either branch"
```

## Phase 3: Push to Feature Branch

```bash
# Push to current branch
git push origin feature/mobile-access-control

# Monitor GitHub Actions
# Go to: https://github.com/[user]/[repo]/actions
```

## Phase 4: Sync to Main

```bash
# Switch to main
git checkout main

# Pull latest
git pull origin main

# Get commit hash from feature branch
git log origin/feature/mobile-access-control --oneline -1

# Cherry-pick (replace HASH with actual commit)
git cherry-pick HASH

# Push to main
git push origin main
```

## Phase 5: Verify

```bash
# Check main branch
git checkout main
git pull origin main
ls docs/QUICK_START_GUIDE.md
ls scripts/validate-docs-frontmatter.ts

# Check feature branch
git checkout feature/mobile-access-control
git pull origin feature/mobile-access-control
ls docs/QUICK_START_GUIDE.md
ls scripts/validate-docs-frontmatter.ts

# Test automation
npx ts-node scripts/validate-docs-frontmatter.ts
```

## Phase 6: Test Sync

```bash
# On feature branch
git checkout feature/mobile-access-control

# Create test file
cat > docs/TEST_SYNC.md << 'EOF'
---
title: Test Sync
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: []
---

# Test Sync
EOF

# Commit and push
git add docs/TEST_SYNC.md
git commit -m "test: verify sync"
git push origin feature/mobile-access-control

# Wait 30-60 seconds for GitHub Actions

# Check main branch
git checkout main
git pull origin main
ls docs/TEST_SYNC.md  # Should exist

# Clean up
git rm docs/TEST_SYNC.md
git commit -m "chore: remove test file"
git push origin main

# Wait for sync
sleep 30

# Verify on feature branch
git checkout feature/mobile-access-control
git pull origin feature/mobile-access-control
ls docs/TEST_SYNC.md  # Should NOT exist
```

## Troubleshooting

### .gitignore not working
```bash
git rm -r --cached docs/ scripts/ .kiro/
git add docs/ scripts/ .kiro/
git commit -m "chore: update git cache"
```

### Cherry-pick conflicts
```bash
# View conflicts
git status

# Edit files
vim [file]

# Continue
git add [file]
git cherry-pick --continue
```

### Workflow not triggering
1. Check: `.github/workflows/sync-docs-between-branches.yml` exists
2. Check: GitHub Actions enabled in settings
3. Check: Branch names match (`main`, `feature/mobile-access-control`)
4. Check: File paths correct (`docs/`, `scripts/`, `.kiro/steering/`)

## Daily Usage

```bash
# Make changes
vim docs/guides/MY_GUIDE.md

# Commit
git add docs/
git commit -m "docs: update guide"

# Push (triggers automatic sync)
git push origin [branch]

# Wait 30-60 seconds
# Documentation is now on both branches ✅
```

## Key Files

- **Setup Guide:** `docs/IMPLEMENTATION_SETUP_GUIDE.md`
- **Sync Guide:** `docs/AUTOMATED_DOCS_SYNC_GUIDE.md`
- **Workflow:** `.github/workflows/sync-docs-between-branches.yml`
- **Steering:** `.kiro/steering/documentation-organization.md`

## Verification Checklist

- [ ] .gitignore updated
- [ ] 387 changes committed
- [ ] Pushed to feature branch
- [ ] GitHub Actions ran successfully
- [ ] Synced to main branch
- [ ] Files exist on both branches
- [ ] Automation scripts work
- [ ] Test sync verified
- [ ] Test file cleaned up

---

**Total Time:** ~40 minutes  
**Status:** Ready to implement  
**Next:** Follow `docs/IMPLEMENTATION_SETUP_GUIDE.md` for detailed steps

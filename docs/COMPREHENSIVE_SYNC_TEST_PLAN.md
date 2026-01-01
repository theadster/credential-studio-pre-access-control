---
title: Comprehensive Sync Test Plan
type: worklog
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 30
related_code: [.github/workflows/sync-docs-between-branches.yml]
---

# Comprehensive Bidirectional Sync Test Plan

## Objective
Triple-check that bidirectional sync works for BOTH file creation AND file deletion in both directions.

## Test Sequence

### Test 1: Create file on main → verify sync to feature
- Create: `TEST_1_CREATE_MAIN.md` on main
- Expected: File appears on feature/mobile-access-control
- Status: ⏳ Pending

### Test 2: Create file on feature → verify sync to main
- Create: `TEST_2_CREATE_FEATURE.md` on feature
- Expected: File appears on main
- Status: ⏳ Pending

### Test 3: Delete file on main → verify deletion syncs to feature
- Delete: `TEST_1_CREATE_MAIN.md` from main
- Expected: File is deleted from feature/mobile-access-control
- Status: ⏳ Pending

### Test 4: Delete file on feature → verify deletion syncs to main
- Delete: `TEST_2_CREATE_FEATURE.md` from feature
- Expected: File is deleted from main
- Status: ⏳ Pending

## Workflow Changes
- Modified `.github/workflows/sync-docs-between-branches.yml` to handle deletions
- Key change: Added `rm -rf docs/ scripts/ .kiro/steering/` before checkout to detect deletions
- Changed to `git add -A` to stage all changes including deletions

## Notes
- Tests will be executed sequentially
- Each test will wait for workflow to complete
- Workflow logs will be checked to verify sync occurred
- All test files will be cleaned up after verification

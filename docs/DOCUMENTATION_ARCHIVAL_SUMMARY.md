---
title: Documentation Archival Summary
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: [scripts/check-docs-staleness.ts, .github/workflows/docs-maintenance.yml]
---

# Documentation Archival and Staleness Management - Summary

## Quick Answer

The documentation system has **comprehensive automated archival and staleness management** built in. Here's what's been set up:

## What's Automated ✅

### 1. Daily Staleness Detection
- **When:** Every day at 2 AM UTC
- **What:** Scans all documentation files
- **Checks:** `last_verified` date vs `review_interval_days`
- **Action:** Creates GitHub issue if stale docs found
- **Script:** `scripts/check-docs-staleness.ts`

### 2. Automatic Alerts
- **GitHub Issue:** "📋 Documentation Staleness Report"
- **Labels:** `documentation`, `maintenance`
- **Content:** Lists all stale files with days overdue
- **Frequency:** Daily (only if stale docs exist)

### 3. Link Validation
- **When:** Every day at 2 AM UTC
- **What:** Checks all internal documentation links
- **Action:** Creates GitHub issue if broken links found
- **Script:** `scripts/check-docs-links.ts`

### 4. Index Generation
- **When:** Every day at 2 AM UTC
- **What:** Generates searchable indexes
- **Files:** `docs/INDEX_BY_TOPIC.md`, `docs/SEARCH_INDEX.md`
- **Action:** Auto-commits updates to repository
- **Script:** `scripts/generate-docs-index.ts`

### 5. Frontmatter Validation
- **When:** Every day at 2 AM UTC
- **What:** Validates all documentation metadata
- **Checks:** Required fields, date formats, valid values
- **Script:** `scripts/validate-docs-frontmatter.ts`

## How Documentation Stays Modern

### Review Intervals

Each document type has a review schedule:

| Type | Interval | Purpose |
|------|----------|---------|
| Worklog | 30 days | Task summaries, test results (high-churn) |
| Canonical | 90 days | Guides, best practices, reference docs |
| ADR | 90 days | Architecture decisions |
| Runbook | 180 days | Operational procedures (less frequent) |

### When Stale Docs Are Detected

**GitHub automatically creates an issue** listing:
- File path
- Document title
- Days overdue
- Recommended action

**Team then:**
1. Reviews the flagged documents
2. Decides: Update, Supersede, or Archive
3. Takes appropriate action
4. Issue resolves automatically

### Three Options for Stale Docs

#### Option 1: Update (Keep Active)
```yaml
last_verified: 2026-03-15  # Update to today
review_interval_days: 90
status: active
```
- Document is still relevant
- Update the content if needed
- Reset review date
- Stays in active directory

#### Option 2: Mark Superseded
```yaml
status: superseded
```
- Document replaced by newer version
- Add note pointing to new doc
- Excluded from indexes
- Preserved for history

#### Option 3: Archive
```yaml
status: archived
```
- Move to `docs/_archive/[category]/`
- Document no longer relevant
- Excluded from indexes
- Preserved for historical record

## Archive Structure

```
docs/_archive/
├── fixes/              # Archived bug fixes
├── guides/             # Archived guides
├── testing/            # Archived test docs
├── migration/          # Archived migration docs
├── enhancements/       # Archived enhancements
└── misc/               # Archived miscellaneous
```

**Current State:**
- ✅ 137 active documentation files
- ✅ 350 archived files preserved
- ✅ Full history maintained
- ✅ Clean active documentation

## Workflow

### Daily Automated Process

```
2 AM UTC Daily
    ↓
Run staleness check
    ↓
Check frontmatter validation
    ↓
Check internal links
    ↓
Generate indexes
    ↓
Create GitHub issues (if problems found)
    ↓
Auto-commit index updates
```

### Team Response Process

```
GitHub Issue Created
    ↓
Team Reviews Flagged Docs
    ↓
Decide: Update / Supersede / Archive
    ↓
Take Action
    ↓
Commit Changes
    ↓
Issue Resolves
```

## Key Features

### ✅ Automatic Detection
- No manual tracking needed
- Runs daily without intervention
- Alerts team automatically

### ✅ Clear Lifecycle
- Active: Current and maintained
- Superseded: Replaced by newer version
- Archived: No longer relevant

### ✅ Historical Preservation
- 350 archived files preserved
- Full context maintained
- Searchable if needed

### ✅ Team Alerts
- GitHub issues for stale docs
- GitHub issues for broken links
- Clear action items

### ✅ Index Maintenance
- Auto-generated indexes
- Searchable documentation
- Browse by topic
- Auto-committed updates

## How to Respond to Alerts

### When You Get a Staleness Alert

1. **Check the issue** - Lists stale files and days overdue
2. **Review each file** - Is it still relevant?
3. **Choose action:**
   - **Update:** Edit file, update `last_verified` date
   - **Supersede:** Mark `status: superseded`, add note
   - **Archive:** Move to `docs/_archive/`, set `status: archived`
4. **Commit changes** - Push to trigger sync
5. **Issue resolves** - Next daily check won't flag it

### When You Get a Broken Links Alert

1. **Check the issue** - Lists broken links
2. **Find the files** - Locate files with broken links
3. **Fix the links** - Update or remove broken references
4. **Commit changes** - Push to trigger sync
5. **Issue resolves** - Next daily check won't flag it

## Manual Checks

Run anytime to check documentation health:

```bash
# Check for stale documentation
npx ts-node scripts/check-docs-staleness.ts

# Validate all frontmatter
npx ts-node scripts/validate-docs-frontmatter.ts

# Check for broken links
npx ts-node scripts/check-docs-links.ts

# Generate/update indexes
npx ts-node scripts/generate-docs-index.ts
```

## Best Practices

### ✅ DO
- ✅ Update `last_verified` when reviewing docs
- ✅ Archive outdated documentation
- ✅ Mark superseded documents
- ✅ Fix broken links promptly
- ✅ Use appropriate review intervals

### ❌ DON'T
- ❌ Ignore staleness alerts
- ❌ Leave broken links unfixed
- ❌ Delete archived documentation
- ❌ Forget to update frontmatter
- ❌ Mix active and archived docs

## Quarterly Maintenance

Every 3 months:
1. Review `docs/misc/` for consolidation
2. Archive outdated documentation
3. Consolidate similar documents
4. Update `docs/README.md` index
5. Check for broken links
6. Verify all frontmatter is valid

## Example: Document Lifecycle

### Day 1: Document Created
```yaml
title: New Feature Guide
type: canonical
status: active
last_verified: 2025-12-31
review_interval_days: 90
```

### Day 90: Review Due
- GitHub issue created: "Documentation Staleness Report"
- Lists: "New Feature Guide - 0 days overdue"

### Day 91: Team Reviews
- Team reads the guide
- Guide is still relevant
- Update `last_verified` to 2026-03-31
- Commit and push

### Day 181: Review Due Again
- GitHub issue created again
- Team reviews again
- Still relevant, update date again

### Day 365: Document Superseded
- New version of guide created
- Old guide marked `status: superseded`
- Add note pointing to new guide
- Commit and push
- Old guide excluded from indexes

### Day 400: Archive Old Guide
- Old guide no longer needed
- Move to `docs/_archive/guides/`
- Set `status: archived`
- Commit and push
- Preserved for history

## Current System Status

### Automation ✅
- Daily staleness detection: **ACTIVE**
- Automatic alerts: **ACTIVE**
- Link validation: **ACTIVE**
- Index generation: **ACTIVE**
- Frontmatter validation: **ACTIVE**

### Documentation ✅
- Active files: **137**
- Archived files: **350**
- Review intervals: **Configured**
- Frontmatter: **Standardized**

### Workflow ✅
- GitHub Actions: **Running daily**
- Issue creation: **Automatic**
- Index updates: **Auto-committed**
- Team alerts: **Enabled**

## Related Documentation

- **Full Guide:** `docs/DOCUMENTATION_LIFECYCLE_AND_ARCHIVAL.md`
- **Steering:** `.kiro/steering/documentation-organization.md`
- **Staleness Script:** `scripts/check-docs-staleness.ts`
- **Maintenance Workflow:** `.github/workflows/docs-maintenance.yml`

## Summary

The documentation system **automatically keeps documentation modern and current** through:

1. **Daily automated checks** - Detects stale documentation
2. **Automatic alerts** - GitHub issues notify team
3. **Clear lifecycle** - Active, Superseded, Archived states
4. **Historical preservation** - 350 archived files maintained
5. **Team-driven updates** - Team decides what to do with stale docs
6. **Index maintenance** - Auto-generated searchable indexes

**Result:** Documentation stays current, stale docs are detected automatically, and historical records are preserved. No documentation rot, no manual tracking needed.

---

**Status:** ✅ Fully Automated and Operational

The system ensures your documentation stays modern while preserving historical records. Daily automated checks keep you informed, and the clear archival process makes it easy to manage documentation as it evolves.

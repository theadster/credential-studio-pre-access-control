---
title: Documentation Lifecycle and Archival System
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: [scripts/check-docs-staleness.ts, .github/workflows/docs-maintenance.yml, .kiro/steering/documentation-organization.md]
---

# Documentation Lifecycle and Archival System

## Overview

The credential.studio documentation system includes a **comprehensive lifecycle management system** that automatically detects stale documentation, alerts the team, and provides a clear process for archiving outdated content. This ensures documentation stays modern and current while preserving historical records.

## How It Works

### 1. Documentation Lifecycle States

Every documentation file has a **status** that defines its lifecycle:

```yaml
status: active | superseded | archived
```

#### Active Status
- **Meaning:** Document is current and in use
- **Review Required:** Yes, on a schedule
- **Location:** Active docs directories (fixes/, guides/, testing/, etc.)
- **Visibility:** Included in indexes and searches

#### Superseded Status
- **Meaning:** Document has been replaced by a newer version
- **Review Required:** No (replaced)
- **Location:** Can stay in active directory or be moved to archive
- **Visibility:** Excluded from indexes, but still accessible
- **Purpose:** Maintains historical record while indicating it's outdated

#### Archived Status
- **Meaning:** Document is no longer relevant or needed
- **Review Required:** No
- **Location:** `docs/_archive/[category]/`
- **Visibility:** Excluded from indexes and searches
- **Purpose:** Preserves historical record without cluttering active docs

### 2. Review Intervals

Each document type has a **review interval** that determines how often it must be verified:

```yaml
review_interval_days: 30 | 90 | 180 | 365
```

| Document Type | Review Interval | Purpose |
|---------------|-----------------|---------|
| **Worklog** | 30 days | High-churn documentation (task summaries, test results) |
| **Canonical** | 90 days | Reference docs, guides, best practices |
| **ADR** | 90 days | Architecture decisions |
| **Runbook** | 180 days | Operational procedures (less frequently changed) |

### 3. Staleness Detection

The system automatically detects when documentation is **past its review date**:

```
Document created: 2025-12-01
Review interval: 90 days
Review due date: 2026-02-28
Current date: 2026-03-15
Status: ⚠️ STALE (15 days overdue)
```

**Stale documentation is flagged when:**
- `last_verified` date + `review_interval_days` < today's date

## Automated System

### Daily Maintenance Workflow

The GitHub Actions workflow `.github/workflows/docs-maintenance.yml` runs **daily at 2 AM UTC** and performs:

#### 1. Staleness Detection
```bash
npx ts-node scripts/check-docs-staleness.ts
```

**What it does:**
- Scans all documentation files
- Checks `last_verified` date against `review_interval_days`
- Identifies files past their review date
- Calculates days overdue

**Output:**
- ✅ If all docs current: "All documentation is current!"
- ⚠️ If stale docs found: Lists all stale files with days overdue

**Action on Failure:**
- Creates GitHub issue: "📋 Documentation Staleness Report"
- Labels: `documentation`, `maintenance`
- Notifies team to review and update

#### 2. Frontmatter Validation
```bash
npx ts-node scripts/validate-docs-frontmatter.ts
```

**What it does:**
- Validates all documentation frontmatter
- Checks required fields exist
- Verifies date formats (YYYY-MM-DD)
- Confirms status values are valid

**Ensures:**
- All docs have proper metadata
- No missing or invalid fields
- Consistent formatting

#### 3. Link Validation
```bash
npx ts-node scripts/check-docs-links.ts
```

**What it does:**
- Scans all documentation files
- Checks internal links
- Identifies broken references
- Reports link issues

**Action on Failure:**
- Creates GitHub issue: "🔗 Broken Documentation Links Found"
- Labels: `documentation`, `bug`
- Notifies team to fix broken links

#### 4. Index Generation
```bash
npx ts-node scripts/generate-docs-index.ts
```

**What it does:**
- Generates `docs/INDEX_BY_TOPIC.md` (browse by category)
- Generates `docs/SEARCH_INDEX.md` (searchable index)
- Auto-commits changes to repository
- Keeps indexes current

## Keeping Documentation Modern

### For Active Documentation

**Step 1: Review When Notified**
When GitHub creates a staleness issue, review the flagged documents:

```bash
# Run locally to see which docs are stale
npx ts-node scripts/check-docs-staleness.ts
```

**Step 2: Update or Archive**

**Option A: Update the Document**
```yaml
---
title: My Document
type: canonical
status: active
owner: "@team"
last_verified: 2026-03-15  # Update to today's date
review_interval_days: 90
related_code: []
---
```

Then commit:
```bash
git add docs/my-document.md
git commit -m "docs: update my-document - verified current"
git push origin [branch]
```

**Option B: Mark as Superseded**
If the document has been replaced by a newer version:

```yaml
---
title: My Document (Superseded)
type: canonical
status: superseded  # Mark as superseded
owner: "@team"
last_verified: 2026-03-15
review_interval_days: 90
related_code: []
---

# My Document (Superseded)

**Note:** This document has been superseded by [New Document](link-to-new-doc.md).

[Keep original content for historical reference]
```

**Option C: Archive the Document**
If the document is no longer relevant:

1. **Move the file:**
```bash
# Determine the category (fixes, guides, testing, etc.)
mv docs/guides/OLD_GUIDE.md docs/_archive/guides/OLD_GUIDE.md
```

2. **Update frontmatter:**
```yaml
---
title: Old Guide (Archived)
type: canonical
status: archived  # Mark as archived
owner: "@team"
last_verified: 2026-03-15
review_interval_days: 90
related_code: []
---
```

3. **Commit the change:**
```bash
git add docs/_archive/guides/OLD_GUIDE.md
git rm docs/guides/OLD_GUIDE.md
git commit -m "docs: archive old-guide - no longer relevant"
git push origin [branch]
```

### For Worklog Documentation (High-Churn)

Worklog documents (task summaries, test results) have a **30-day review interval**:

**Typical Lifecycle:**
1. Created during task execution
2. Reviewed and verified within 30 days
3. After 30 days, either:
   - Updated with new information (reset review date)
   - Marked as superseded (replaced by newer task)
   - Archived (task complete, no longer needed)

**Example:**
```yaml
---
title: Task 5 Implementation Summary
type: worklog
status: active
owner: "@team"
last_verified: 2026-03-15  # Update when reviewing
review_interval_days: 30
related_code: [src/components/MyComponent.tsx]
---
```

## Archive Structure

### Organization

```
docs/_archive/
├── fixes/
│   ├── OLD_BUG_FIX.md
│   └── DEPRECATED_ISSUE.md
├── guides/
│   ├── LEGACY_SETUP_GUIDE.md
│   └── OLD_WORKFLOW.md
├── testing/
│   ├── DEPRECATED_TEST_SUMMARY.md
│   └── OLD_TEST_RESULTS.md
├── migration/
│   ├── COMPLETED_MIGRATION.md
│   └── LEGACY_MIGRATION.md
├── enhancements/
│   └── SUPERSEDED_FEATURE.md
└── misc/
    └── OLD_DOCUMENTATION.md
```

### Archive Preservation

- **350 archived files** are preserved in `docs/_archive/`
- Organized by original category
- Maintain full history and context
- Searchable if needed
- Not included in active indexes

## Workflow for Archival

### When to Archive

Archive documentation when:
- ✅ Document is no longer relevant to current project
- ✅ Feature/process has been completely replaced
- ✅ Information is outdated and won't be updated
- ✅ Document is superseded by newer documentation
- ✅ Task/project is complete and archived

### When NOT to Archive

Keep documentation active when:
- ❌ Document is still referenced by active code
- ❌ Information is still relevant to current work
- ❌ Document is being actively maintained
- ❌ Historical context is important for current work

### Archival Process

**Step 1: Identify Candidate**
```bash
# Check which docs are stale
npx ts-node scripts/check-docs-staleness.ts
```

**Step 2: Decide on Action**
- Update? → Update `last_verified` date
- Supersede? → Change `status: superseded`
- Archive? → Move to `docs/_archive/` and set `status: archived`

**Step 3: Move File (if archiving)**
```bash
# Create archive directory if needed
mkdir -p docs/_archive/[category]

# Move file
mv docs/[category]/OLD_FILE.md docs/_archive/[category]/OLD_FILE.md
```

**Step 4: Update Frontmatter**
```yaml
---
title: Old Document (Archived)
type: canonical
status: archived
owner: "@team"
last_verified: 2026-03-15
review_interval_days: 90
related_code: []
---
```

**Step 5: Commit**
```bash
git add docs/_archive/[category]/OLD_FILE.md
git rm docs/[category]/OLD_FILE.md
git commit -m "docs: archive old-file - [reason]"
git push origin [branch]
```

**Step 6: Update Links**
- Find any references to the archived file
- Update links to point to new documentation
- Or add note in new doc linking to archived version

## Keeping Documentation Current

### Best Practices

#### 1. Regular Reviews
- Review your documentation on schedule
- Update `last_verified` date when reviewing
- Fix any outdated information
- Update code references if needed

#### 2. Batch Updates
- Group related documentation updates
- Update multiple docs in one commit
- Reduces sync commits between branches

#### 3. Clear Commit Messages
```bash
# Good
git commit -m "docs: update authentication guide - verified current"

# Good
git commit -m "docs: archive legacy-api-guide - replaced by new-api-guide"

# Good
git commit -m "docs: mark task-5-summary as superseded by task-6-summary"
```

#### 4. Link Maintenance
- Update links when archiving documents
- Check for broken links regularly
- Use the link validation script

#### 5. Frontmatter Accuracy
- Keep `last_verified` date current
- Use appropriate `review_interval_days`
- Maintain accurate `status` values
- Update `related_code` when code changes

### Quarterly Cleanup

**Every 3 months:**
1. Review `docs/misc/` for consolidation opportunities
2. Archive outdated documentation
3. Consolidate similar documents
4. Update `docs/README.md` index
5. Check for broken links
6. Verify all frontmatter is valid

## Monitoring and Alerts

### GitHub Issues

The system automatically creates GitHub issues for:

#### Stale Documentation
- **Title:** "📋 Documentation Staleness Report"
- **Labels:** `documentation`, `maintenance`
- **Frequency:** Daily (if stale docs found)
- **Action:** Review and update flagged documents

#### Broken Links
- **Title:** "🔗 Broken Documentation Links Found"
- **Labels:** `documentation`, `bug`
- **Frequency:** Daily (if broken links found)
- **Action:** Fix broken links

### Manual Checks

Run locally anytime:

```bash
# Check for stale documentation
npx ts-node scripts/check-docs-staleness.ts

# Validate frontmatter
npx ts-node scripts/validate-docs-frontmatter.ts

# Check for broken links
npx ts-node scripts/check-docs-links.ts

# Generate/update indexes
npx ts-node scripts/generate-docs-index.ts
```

## Example Scenarios

### Scenario 1: Update Active Documentation

**Situation:** You have a guide that's still relevant but past review date.

**Action:**
```bash
# Edit the file
vim docs/guides/MY_GUIDE.md

# Update the last_verified date
# Change: last_verified: 2025-12-01
# To:     last_verified: 2026-03-15

# Commit
git add docs/guides/MY_GUIDE.md
git commit -m "docs: update my-guide - verified current"
git push origin [branch]
```

**Result:** Document stays active, review date resets, no alert next cycle.

### Scenario 2: Archive Outdated Documentation

**Situation:** A guide for a deprecated feature that's no longer used.

**Action:**
```bash
# Move to archive
mkdir -p docs/_archive/guides
mv docs/guides/DEPRECATED_FEATURE.md docs/_archive/guides/DEPRECATED_FEATURE.md

# Update frontmatter
# Change: status: active
# To:     status: archived

# Commit
git add docs/_archive/guides/DEPRECATED_FEATURE.md
git rm docs/guides/DEPRECATED_FEATURE.md
git commit -m "docs: archive deprecated-feature - feature no longer supported"
git push origin [branch]
```

**Result:** Document moved to archive, removed from active indexes, preserved for history.

### Scenario 3: Mark as Superseded

**Situation:** A document has been replaced by a newer version.

**Action:**
```bash
# Edit the old document
vim docs/guides/OLD_GUIDE.md

# Update frontmatter
# Change: status: active
# To:     status: superseded

# Add note at top
# Add: **Note:** This guide has been superseded by [New Guide](link).

# Commit
git add docs/guides/OLD_GUIDE.md
git commit -m "docs: mark old-guide as superseded by new-guide"
git push origin [branch]
```

**Result:** Document marked as superseded, excluded from indexes, but still accessible.

## Summary

### What's Automated ✅
- Daily staleness detection
- Automatic GitHub issue creation
- Link validation
- Index generation
- Frontmatter validation

### What You Do Manually
- Review flagged documents
- Update `last_verified` date
- Decide: Update, Supersede, or Archive
- Move files to archive if needed
- Update links if necessary

### Key Metrics
- **137 active documentation files** - Current and maintained
- **350 archived files** - Historical record preserved
- **Daily checks** - Automated at 2 AM UTC
- **Review intervals** - 30-365 days depending on type
- **100% coverage** - All docs have frontmatter

### Result
✅ Documentation stays modern and current  
✅ Stale docs are automatically detected  
✅ Team is alerted to review outdated content  
✅ Historical records are preserved  
✅ Active documentation remains clean and organized  

---

**Status:** ✅ Fully Automated and Operational

The documentation lifecycle system ensures your documentation stays current while preserving historical records. The automated daily checks keep you informed, and the clear archival process makes it easy to manage documentation as it evolves.

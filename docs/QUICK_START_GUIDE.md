---
title: Documentation System Quick Start Guide
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: [".github/workflows/docs-maintenance.yml", "scripts/check-docs-staleness.ts", "scripts/validate-docs-frontmatter.ts", "scripts/check-docs-links.ts", "scripts/generate-docs-index.ts"]
---

# Documentation System Quick Start Guide

**Last Updated:** December 31, 2025

## What's New?

The credential.studio documentation system has been completely reorganized with:
- ✅ 137 active documentation files (organized and indexed)
- ✅ 350 archived files (preserved for reference)
- ✅ Automated validation and monitoring
- ✅ Searchable indexes and categorization
- ✅ GitHub Actions workflow for daily maintenance

## Finding Documentation

### Browse by Topic
Open `docs/INDEX_BY_TOPIC.md` to:
- Browse by category (guides, testing, migration, etc.)
- Browse by document type (canonical, worklog, runbook, adr)
- Find documents organized by purpose

### Search by Keywords
Open `docs/SEARCH_INDEX.md` to:
- Search for specific topics
- View keywords and metadata
- Find related source code files

### Quick Links
- **Main Guide:** `docs/README.md`
- **Topic Index:** `docs/INDEX_BY_TOPIC.md`
- **Search Index:** `docs/SEARCH_INDEX.md`
- **Archive Guide:** `docs/_archive/README.md`

## Running Automation Scripts

### Validate Documentation
```bash
npx ts-node scripts/validate-docs-frontmatter.ts
```
Checks that all documentation has valid metadata.

### Check for Stale Docs
```bash
npx ts-node scripts/check-docs-staleness.ts
```
Identifies documentation that needs review.

### Check for Broken Links
```bash
npx ts-node scripts/check-docs-links.ts
```
Finds broken internal documentation links.

### Generate Indexes
```bash
npx ts-node scripts/generate-docs-index.ts
```
Updates searchable indexes (runs automatically daily).

## GitHub Actions Workflow

The documentation system runs automated checks daily at 2 AM UTC.

**To run manually:**
1. Go to `.github/workflows/docs-maintenance.yml`
2. Click "Run workflow"
3. Select branch and click "Run workflow"

**What it does:**
- ✅ Validates all frontmatter
- ✅ Detects stale documentation
- ✅ Checks for broken links
- ✅ Generates searchable indexes
- ✅ Creates GitHub issues for problems
- ✅ Auto-commits index updates

## Documentation Structure

### Active Categories
- **Guides** (41 files) - How-to guides and best practices
- **Testing** (21 files) - Test documentation and guides
- **Enhancements** (19 files) - Feature enhancements
- **Fixes** (20 files) - Bug fixes and resolutions
- **Migration** (16 files) - Migration guides and status
- **Misc** (9 files) - Miscellaneous documentation
- **Reference** (3 files) - API and technical reference

### Archive
- **Location:** `docs/_archive/`
- **Purpose:** Historical and resolved documentation
- **Access:** See `docs/_archive/README.md`

## Document Metadata

Every active document has standardized metadata:

```yaml
---
title: Document Title
type: canonical | adr | worklog | runbook
status: active | superseded | archived
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 30 | 90 | 180 | 365
related_code: [array of file paths]
---
```

**Document Types:**
- **Canonical:** Reference docs, guides, best practices (90-day review)
- **Worklog:** High-churn documentation (30-day review)
- **Runbook:** Operational procedures (180-day review)
- **ADR:** Architecture decisions (90-day review)

## Common Tasks

### Finding a Specific Document
1. Open `docs/SEARCH_INDEX.md`
2. Search for keywords
3. Click the link to view the document

### Updating a Document
1. Edit the document
2. Update the `last_verified` date in frontmatter
3. Commit and push changes

### Creating a New Document
1. Create file in appropriate category (e.g., `docs/guides/`)
2. Add frontmatter with metadata
3. Write content
4. Run `npx ts-node scripts/validate-docs-frontmatter.ts` to verify

### Archiving a Document
1. Move file to `docs/_archive/[category]/`
2. Update `status: archived` in frontmatter
3. Update any links pointing to it

## Troubleshooting

### Frontmatter Validation Fails
**Error:** "Missing required field 'title'"

**Solution:** Add missing fields to frontmatter:
```yaml
---
title: Your Document Title
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: []
---
```

### Broken Links Found
**Error:** "Link: guides/MISSING_FILE.md"

**Solution:** See `docs/BROKEN_LINKS_ACTION_ITEMS.md` for detailed list and fixes

### Stale Documentation Alert
**Error:** "Days Overdue: 15"

**Solution:** Review the document and update `last_verified` date:
```yaml
last_verified: 2025-12-31  # Update to today's date
```

## Key Documents

### Project Overview
- `docs/DOCUMENTATION_REORGANIZATION_PROJECT_COMPLETE.md` - Full project summary

### Phase Summaries
- `docs/REORGANIZATION_COMPLETE.md` - Phase 1: Archive Migration
- `docs/PHASE_3_AUTOMATION_SETUP_COMPLETE.md` - Phase 3: Automation Setup
- `docs/PHASE_3_IMPLEMENTATION_SUMMARY.md` - Phase 3: Implementation Details

### Action Items
- `docs/BROKEN_LINKS_ACTION_ITEMS.md` - List of 65 broken links to fix

### Guides
- `docs/README.md` - Main documentation guide
- `docs/_archive/README.md` - Archive guide

## Next Steps

1. **Browse Documentation**
   - Open `docs/INDEX_BY_TOPIC.md`
   - Find what you need

2. **Fix Broken Links** (Optional)
   - See `docs/BROKEN_LINKS_ACTION_ITEMS.md`
   - Update or remove broken links

3. **Deploy GitHub Actions** (Optional)
   - Test workflow in GitHub Actions UI
   - Set up notifications

4. **Assign Owners** (Optional)
   - Replace "@team" with specific people
   - Create review schedule

## Support

For more information:
- **General Questions:** See `docs/README.md`
- **Automation Details:** See `docs/PHASE_3_IMPLEMENTATION_SUMMARY.md`
- **Broken Links:** See `docs/BROKEN_LINKS_ACTION_ITEMS.md`
- **Project Overview:** See `docs/DOCUMENTATION_REORGANIZATION_PROJECT_COMPLETE.md`

---

**Documentation System Status:** ✅ Ready to Use  
**Last Updated:** December 31, 2025  
**Next Automated Check:** January 1, 2026 at 2 AM UTC

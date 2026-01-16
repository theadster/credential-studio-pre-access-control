---
inclusion: always
---

# Documentation Organization Guidelines

Rules for creating and organizing documentation and code files. Keep the project root clean.

## Quick Reference

| Type | Location | Naming | Frontmatter Type | Review Days |
|------|----------|--------|------------------|-------------|
| Bug Fix | `docs/fixes/` | `[FEATURE]_[ISSUE]_FIX.md` | canonical | 90 |
| Migration | `docs/migration/` | `[TYPE]_MIGRATION.md` | runbook | 180 |
| Testing | `docs/testing/` | `[FEATURE]_TESTS_SUMMARY.md` | worklog | 30 |
| Guide | `docs/guides/` | `[FEATURE]_GUIDE.md` | canonical | 90 |
| Enhancement | `docs/enhancements/` | `[FEATURE]_ENHANCEMENT.md` | canonical | 90 |
| Reference | `docs/reference/` | `[SYSTEM]_REFERENCE.md` | canonical | 90 |
| Spec Task | `.kiro/specs/[name]/` | `TASK_[N]_[DESC]_SUMMARY.md` | worklog | 30 |
| Other | `docs/misc/` | Descriptive UPPERCASE | canonical | 90 |

## Directory Structure

```
docs/
├── fixes/          # Bug fixes and issue resolutions
├── migration/      # Migration documentation
├── testing/        # Test summaries and guides
├── guides/         # User guides and how-tos
├── enhancements/   # Feature enhancements
├── misc/           # Miscellaneous
├── reference/      # API and technical reference
├── _archive/       # Archived documentation
└── README.md

.kiro/specs/[spec-name]/
└── [spec-related documentation]
```

## Frontmatter Requirements (CRITICAL)

Every documentation file MUST include this frontmatter:

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
- **canonical** (90 days): Reference docs, guides, best practices
- **worklog** (30 days): High-churn documentation
- **runbook** (180 days): Operational procedures
- **adr** (90 days): Architecture decisions

**Validation fails if:**
- Frontmatter missing
- Required fields missing (title, type, status, owner, last_verified, review_interval_days)
- Invalid type or status values
- Date not in YYYY-MM-DD format
- review_interval_days is 0 or negative

## File Naming Conventions

### Documentation Files
- UPPERCASE with underscores
- Include type: SUMMARY, GUIDE, FIX, etc.
- Examples: `CREDENTIAL_GENERATION_FIX.md`, `CACHE_USAGE_GUIDE.md`

### Code Files

| File Type | Convention | Location | Example |
|-----------|-----------|----------|---------|
| React Components | PascalCase | `src/components/` | `AttendeeForm.tsx` |
| Feature Folders | PascalCase | `src/components/` | `AttendeeForm/` |
| UI Components | kebab-case | `src/components/ui/` | `alert-dialog.tsx` |
| Hooks | camelCase + `use` | `src/hooks/` | `useAttendees.ts` |
| Utilities | camelCase | `src/lib/` | `sanitize.ts` |
| Types | camelCase | `src/types/` | `dashboard.ts` |
| Constants | camelCase | `src/constants/` | `constants.ts` |
| Reducers | camelCase + `Reducer` | `src/reducers/` | `attendeesReducer.ts` |
| API Routes | kebab-case | `src/pages/api/` | `bulk-delete.ts` |
| Pages | kebab-case | `src/pages/` | `dashboard.tsx` |
| Test Files | `*.test.ts(x)` | `src/__tests__/` | `index.test.ts` |

## Test File Organization (CRITICAL - BUILD ERRORS)

### Correct Locations

| Test Type | Location | Example |
|-----------|----------|---------|
| API Route Tests | `src/__tests__/api/` | `src/__tests__/api/attendees/index.test.ts` |
| Component Tests | `src/__tests__/components/` | `src/__tests__/components/AttendeeForm/BasicInformationSection.test.tsx` |
| Utility Tests | `src/__tests__/lib/` | `src/__tests__/lib/permissions.test.ts` |
| Hook Tests | `src/__tests__/hooks/` | `src/__tests__/hooks/useAttendees.test.ts` |

### NEVER DO THIS (Causes Build Errors)

```
❌ src/pages/api/attendees/__tests__/     - WRONG: Causes build errors
❌ src/pages/api/attendees/index.test.ts  - WRONG: Treated as API route
❌ src/components/AttendeeForm/__tests__/ - WRONG: Use src/__tests__/components/
```

**Why:** Next.js treats files in `src/pages/` as routes. Test files there cause build errors.

### Test File Rules
- Format: `[filename].test.ts` or `[filename].test.tsx`
- Mirror source structure in `src/__tests__/`
- Use `.test.ts` extension (not `.spec.ts`)
- Config: `tsconfig.test.json` (separate from main tsconfig)

### Fix Misplaced Tests
```bash
find src/pages -name "*.test.ts" -o -name "*.test.tsx"  # Find misplaced
mkdir -p src/__tests__/api/[feature-name]               # Create correct dir
mv src/pages/api/[feature]/__tests__/test.ts src/__tests__/api/[feature]/test.ts
```

## What NOT to Put in Project Root

❌ Summary files, test documentation, fix documentation, implementation summaries, task summaries, configuration guides

✅ Only: `README.md`, config files (package.json, tsconfig.json), license files, .gitignore, .env

## Validation Commands

```bash
npx ts-node scripts/validate-docs-frontmatter.ts  # Validate frontmatter
npx ts-node scripts/check-docs-staleness.ts       # Check stale docs
npx ts-node scripts/check-docs-links.ts           # Check broken links
npx ts-node scripts/generate-docs-index.ts        # Generate indexes
```

## Archiving Documentation

When documentation becomes outdated:
1. Move to `docs/_archive/[category]/`
2. Update `status: archived` in frontmatter
3. Update any links pointing to it

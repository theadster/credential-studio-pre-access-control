---
inclusion: always
---

# Documentation Organization Guidelines

When creating summary files, documentation, or guides, follow this organization structure to keep the project root clean.

## 📋 Documentation System Status

**Last Updated:** December 31, 2025  
**Status:** ✅ Reorganized and Automated

The credential.studio documentation system has been completely reorganized with:
- ✅ 137 active documentation files (organized by category)
- ✅ 350 archived files (preserved in `docs/_archive/`)
- ✅ Automated validation and monitoring
- ✅ Searchable indexes and categorization
- ✅ GitHub Actions workflow for daily maintenance

**Key Resources:**
- **Quick Start:** `docs/QUICK_START_GUIDE.md`
- **Full Summary:** `docs/DOCUMENTATION_REORGANIZATION_PROJECT_COMPLETE.md`
- **Browse Docs:** `docs/INDEX_BY_TOPIC.md`
- **Search Docs:** `docs/SEARCH_INDEX.md`

## Directory Structure

```
docs/
├── fixes/          # Bug fixes and issue resolutions (20 active files)
├── migration/      # Migration-related documentation (16 active files)
├── testing/        # Test summaries and testing guides (21 active files)
├── guides/         # User guides and how-to documentation (41 active files)
├── enhancements/   # Feature enhancements (19 active files)
├── misc/           # Miscellaneous documentation (9 active files)
├── reference/      # API and technical reference (3 active files)
├── _archive/       # Archived documentation (350 files)
├── INDEX_BY_TOPIC.md       # Browse by category and type (auto-generated)
├── SEARCH_INDEX.md         # Searchable index with keywords (auto-generated)
└── README.md               # Main documentation guide

.kiro/specs/[spec-name]/
└── [spec-related summaries and documentation]
```

## 🤖 Automation System

The documentation system includes automated validation and monitoring:

### Scripts
- `scripts/validate-docs-frontmatter.ts` - Validates all frontmatter (auto-generated index files are excluded)
- `scripts/check-docs-staleness.ts` - Detects stale documentation
- `scripts/check-docs-links.ts` - Validates internal links
- `scripts/generate-docs-index.ts` - Generates searchable indexes with proper frontmatter

**Note:** The index generation script automatically adds required frontmatter to `INDEX_BY_TOPIC.md` and `SEARCH_INDEX.md`. These files are excluded from validation checks since they're always regenerated with correct frontmatter.

### GitHub Actions Workflow
- `.github/workflows/docs-maintenance.yml` - Daily automated checks at 2 AM UTC
- Creates GitHub issues for problems
- Auto-commits index updates

### Running Locally
```bash
npx ts-node scripts/validate-docs-frontmatter.ts
npx ts-node scripts/check-docs-staleness.ts
npx ts-node scripts/check-docs-links.ts
npx ts-node scripts/generate-docs-index.ts
```

## 📝 Frontmatter Requirements

All active documentation files must have standardized YAML frontmatter:

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
- **Canonical** (90-day review): Reference docs, guides, best practices
- **Worklog** (30-day review): High-churn documentation
- **Runbook** (180-day review): Operational procedures
- **ADR** (90-day review): Architecture decisions

**Important:** All new documentation files MUST include this frontmatter or validation will fail.

## Rules for New Documentation

### ⚠️ CRITICAL: Frontmatter Required

Every new documentation file MUST include frontmatter or it will fail validation:

```yaml
---
title: Your Document Title
type: canonical | adr | worklog | runbook
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: []
---

# Your Document Title

Content here...
```

**Validation will fail if:**
- ❌ Frontmatter is missing
- ❌ Required fields are missing (title, type, status, owner, last_verified, review_interval_days)
- ❌ Type is not one of: canonical, adr, worklog, runbook
- ❌ Status is not one of: active, superseded, archived
- ❌ Date format is not YYYY-MM-DD
- ❌ review_interval_days is 0 or negative

### 1. Bug Fixes and Issue Resolutions
**Location:** `docs/fixes/`

**When to use:**
- Fixing bugs or issues
- Resolving errors
- Debugging summaries
- Problem resolution documentation

**Naming convention:** `[FEATURE]_[ISSUE]_FIX.md`

**Frontmatter template:**
```yaml
---
title: [Feature] [Issue] Fix
type: canonical
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: [src/path/to/file.ts]
---
```

**Examples:**
- `CREDENTIAL_GENERATION_FIXES_SUMMARY.md`
- `CUSTOM_FIELD_VALUES_FIX.md`
- `REGEX_ESCAPE_BUG_FIX.md`

### 2. Migration Documentation
**Location:** `docs/migration/`

**When to use:**
- Database migrations
- Platform migrations (e.g., Supabase to Appwrite)
- Schema changes
- Migration scripts and guides

**Frontmatter template:**
```yaml
---
title: [Migration Type] Migration
type: runbook
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 180
related_code: [src/scripts/migrate.ts]
---
```

**Examples:**
- `MIGRATION_STATUS.md`
- `APPWRITE_CONFIGURATION.md`
- `INTEGRATION_COLLECTIONS_MIGRATION.md`

### 3. Testing Documentation
**Location:** `docs/testing/`

**When to use:**
- Test summaries
- Test coverage reports
- Testing guides
- API test documentation

**Naming convention:** `[FEATURE]_TESTS_SUMMARY.md`

**Frontmatter template:**
```yaml
---
title: [Feature] Tests Summary
type: worklog
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 30
related_code: [src/__tests__/path/to/test.ts]
---
```

**Examples:**
- `ATTENDEE_API_TESTS_SUMMARY.md`
- `E2E_TESTS_SUMMARY.md`
- `REALTIME_TESTS_SUMMARY.md`

### 4. User Guides and How-Tos
**Location:** `docs/guides/`

**When to use:**
- Configuration guides
- Setup instructions
- How-to documentation
- Best practices
- Usage examples

**Naming convention:** `[FEATURE]_GUIDE.md` or `[FEATURE]_EXAMPLE.md`

**Frontmatter template:**
```yaml
---
title: [Feature] Guide
type: canonical
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: [src/path/to/file.ts]
---
```

**Examples:**
- `SWITCHBOARD_CONFIGURATION_GUIDE.md`
- `MANUAL_TESTING_GUIDE.md`
- `CACHE_USAGE_EXAMPLE.md`

### 5. Feature Enhancements
**Location:** `docs/enhancements/`

**When to use:**
- Feature enhancement documentation
- Improvement summaries
- Enhancement tracking

**Frontmatter template:**
```yaml
---
title: [Feature] Enhancement
type: canonical
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: [src/path/to/file.ts]
---
```

### 6. Reference Documentation
**Location:** `docs/reference/`

**When to use:**
- API reference documentation
- Technical specifications
- Architecture documentation

**Frontmatter template:**
```yaml
---
title: [System] Reference
type: canonical
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: [src/path/to/file.ts]
---
```

### 7. Spec-Related Documentation
**Location:** `.kiro/specs/[spec-name]/`

**When to use:**
- Task summaries from spec implementations
- Spec-specific documentation
- Implementation details for a specific spec

**Naming convention:** `TASK_[N]_[DESCRIPTION]_SUMMARY.md`

**Frontmatter template:**
```yaml
---
title: Task [N] [Description] Summary
type: worklog
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 30
related_code: [src/path/to/file.ts]
---
```

**Examples:**
- `.kiro/specs/integration-fields-mapping-fix/TASK_6_COMPLETE_FIELD_MAPPING_TESTS_SUMMARY.md`
- `.kiro/specs/api-performance-optimization/TASK_7_ERROR_HANDLING_SUMMARY.md`

### 8. Miscellaneous Documentation
**Location:** `docs/misc/`

**When to use:**
- Documentation that doesn't fit other categories
- One-off enhancements
- Temporary documentation
- Legacy documentation

**Frontmatter template:**
```yaml
---
title: [Description]
type: canonical
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: 90
related_code: []
---
```

## File Naming Conventions

### Documentation Files
- Use UPPERCASE for documentation files
- Use underscores to separate words
- Be descriptive but concise
- Include the type of document (SUMMARY, GUIDE, FIX, etc.)

**Examples:**
- ✅ `CREDENTIAL_GENERATION_FIXES_SUMMARY.md`
- ✅ `SWITCHBOARD_CONFIGURATION_GUIDE.md`
- ✅ `CUSTOM_FIELD_API_TESTS_SUMMARY.md`
- ❌ `fix.md` (too vague)
- ❌ `documentation.md` (not descriptive)

### Code File Naming Conventions

The project uses a **mixed convention** depending on file type and location:

#### Component Files (Root Level)
- **Format:** PascalCase for standalone components
- **Location:** `src/components/`
- **Examples:**
  - ✅ `AttendeeForm.tsx`
  - ✅ `DeleteUserDialog.tsx`
  - ✅ `LogsExportDialog.tsx`
  - ✅ `RoleCard.tsx`
  - ✅ `ErrorBoundary.tsx`

#### Component Folders (Feature Components)
- **Format:** PascalCase folder names with organized subcomponents
- **Location:** `src/components/[FeatureName]/`
- **Pattern:** Feature components are organized in folders with an `index.tsx` export
- **Examples:**
  ```
  src/components/AttendeeForm/
    ├── index.tsx                      (main export)
    ├── BasicInformationSection.tsx    (PascalCase subcomponents)
    ├── CustomFieldInput.tsx
    ├── CustomFieldsSection.tsx
    ├── FormActions.tsx
    └── PhotoUploadSection.tsx

  src/components/EventSettingsForm/
    ├── index.tsx
    ├── BarcodeTab.tsx                 (PascalCase subcomponents)
    ├── CustomFieldForm.tsx
    ├── GeneralTab.tsx
    ├── constants.ts                   (camelCase utilities)
    ├── types.ts                       (camelCase types)
    ├── useEventSettingsForm.ts        (camelCase hooks)
    └── utils.ts                       (camelCase utilities)
  ```

#### UI Components (shadcn/ui)
- **Format:** kebab-case (lowercase with hyphens)
- **Location:** `src/components/ui/`
- **Examples:**
  - ✅ `alert-dialog.tsx`
  - ✅ `dropdown-menu.tsx`
  - ✅ `input-otp.tsx`
  - ✅ `toggle-group.tsx`
  - ✅ `button.tsx`

#### Hook Files
- **Format:** camelCase with `use` prefix
- **Location:** `src/hooks/` or within component folders
- **Examples:**
  - ✅ `useAttendees.ts`
  - ✅ `useEntityCRUD.ts`
  - ✅ `useEventSettingsForm.ts`
  - ✅ `useDebouncedCallback.ts`

#### Utility Files
- **Format:** camelCase
- **Location:** `src/lib/` or within component folders
- **Examples:**
  - ✅ `sanitize.ts`
  - ✅ `errorMessages.ts`
  - ✅ `logger.ts`
  - ✅ `utils.ts`
  - ✅ `permissions.ts`

#### Type Files
- **Format:** camelCase
- **Location:** `src/types/` or within component folders
- **Examples:**
  - ✅ `dashboard.ts`
  - ✅ `types.ts`
  - ✅ `attendee.ts`

#### Constant Files
- **Format:** camelCase
- **Location:** `src/constants/` or within component folders
- **Examples:**
  - ✅ `dashboard.ts`
  - ✅ `constants.ts`

#### Reducer Files
- **Format:** camelCase with `Reducer` suffix
- **Location:** `src/reducers/`
- **Examples:**
  - ✅ `attendeesReducer.ts`
  - ✅ `usersReducer.ts`

#### API Route Files
- **Format:** kebab-case
- **Location:** `src/pages/api/`
- **Examples:**
  - ✅ `bulk-delete.ts`
  - ✅ `bulk-edit.ts`
  - ✅ `generate-credential.ts`

#### Page Files
- **Format:** kebab-case
- **Location:** `src/pages/`
- **Examples:**
  - ✅ `dashboard.tsx`
  - ✅ `forgot-password.tsx`
  - ✅ `reset-password.tsx`

#### Test Files
- **Format:** `*.test.ts` or `*.test.tsx`
- **Location:** `src/__tests__/` (mirrors source structure)
- **Pattern:** Test files are organized in a dedicated `__tests__` directory that mirrors the source code structure
- **Examples:**
  ```
  src/__tests__/
  ├── api/                           (API route tests)
  │   ├── attendees/
  │   │   ├── index.test.ts
  │   │   ├── bulk-edit.test.ts
  │   │   └── id/
  │   │       └── generate-credential.test.ts
  │   ├── users/
  │   │   ├── index.test.ts
  │   │   └── search.test.ts
  │   └── roles/
  │       └── index.test.ts
  ├── components/                    (Component tests)
  │   ├── AttendeeForm/
  │   │   └── BasicInformationSection.test.tsx
  │   └── UserForm/
  │       └── RoleSelector.test.tsx
  ├── lib/                          (Utility tests)
  │   ├── permissions.test.ts
  │   └── sanitize.test.ts
  └── hooks/                        (Hook tests)
      └── useAttendees.test.ts
  ```

**Important Test File Rules:**
- ❌ **NEVER** place test files in `src/pages/` directory
- ❌ **NEVER** place test files in `src/pages/api/` directory
- ❌ **NEVER** use `__tests__` folders inside `src/pages/` or `src/pages/api/`
- ✅ **ALWAYS** place test files in `src/__tests__/` directory
- ✅ **ALWAYS** mirror the source structure in `__tests__/`
- ✅ Use `.test.ts` or `.test.tsx` extension (not `.spec.ts`)
- ✅ Test files use `tsconfig.test.json` for TypeScript configuration

**Why This Matters:**
- Next.js treats files in `src/pages/` as routes
- Test files in API routes cause build errors
- Separate test directory prevents route pollution
- Cleaner builds and faster compilation
- Better IDE support and organization
- Separate TypeScript config (`tsconfig.test.json`) provides proper type checking for tests

### Quick Reference Table

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
| Documentation | UPPERCASE | `docs/` | `SETUP_GUIDE.md` |

### Key Takeaways

- **React Components** = PascalCase (`.tsx` files that export components)
- **UI Library Components** = kebab-case (shadcn/ui convention)
- **Utilities, hooks, types, constants** = camelCase
- **Feature folders** = PascalCase (e.g., `AttendeeForm/`, `EventSettingsForm/`)
- **API routes and pages** = kebab-case
- **Test files** = `*.test.ts` or `*.test.tsx` in `src/__tests__/` (NEVER in `src/pages/`)
- **Documentation** = UPPERCASE with underscores

**Always check the existing folder structure before creating new files to maintain consistency.**

## Test File Organization (CRITICAL)

### Test File Location Rules

**✅ CORRECT Test Locations:**

1. **API Route Tests** → `src/__tests__/api/`
   ```
   src/__tests__/api/
   ├── attendees/
   │   ├── index.test.ts              ✅ Tests for src/pages/api/attendees/index.ts
   │   ├── bulk-edit.test.ts          ✅ Tests for src/pages/api/attendees/bulk-edit.ts
   │   └── id/
   │       └── generate-credential.test.ts  ✅ Tests for src/pages/api/attendees/[id]/generate-credential.ts
   ```

2. **Component Tests** → `src/__tests__/components/`
   ```
   src/__tests__/components/
   ├── AttendeeForm/
   │   └── BasicInformationSection.test.tsx  ✅ Tests for src/components/AttendeeForm/BasicInformationSection.tsx
   ```

3. **Utility Tests** → `src/__tests__/lib/`
   ```
   src/__tests__/lib/
   ├── permissions.test.ts            ✅ Tests for src/lib/permissions.ts
   └── sanitize.test.ts               ✅ Tests for src/lib/sanitize.ts
   ```

4. **Hook Tests** → `src/__tests__/hooks/`
   ```
   src/__tests__/hooks/
   └── useAttendees.test.ts           ✅ Tests for src/hooks/useAttendees.ts
   ```

**❌ INCORRECT Test Locations (NEVER DO THIS):**

```
src/pages/api/attendees/__tests__/     ❌ WRONG - Causes build errors
src/pages/api/attendees/index.test.ts  ❌ WRONG - Treated as API route
src/components/AttendeeForm/__tests__/ ❌ WRONG - Use src/__tests__/components/ instead
```

### Migration Guide for Existing Tests

If you find test files in the wrong location:

1. **Identify the test file location**
   ```bash
   # Find misplaced tests
   find src/pages -name "*.test.ts" -o -name "*.test.tsx"
   ```

2. **Create the correct directory structure**
   ```bash
   mkdir -p src/__tests__/api/[feature-name]
   ```

3. **Move the test file**
   ```bash
   mv src/pages/api/[feature]/__tests__/test.ts src/__tests__/api/[feature]/test.ts
   ```

4. **Remove empty directories**
   ```bash
   find src/pages -type d -name "__tests__" -empty -delete
   ```

5. **Clean and rebuild**
   ```bash
   npm run clean
   npm run build
   ```

### Test File Naming

- **Format:** `[filename].test.ts` or `[filename].test.tsx`
- **Match source file:** Test file should mirror the source file name
- **Examples:**
  - Source: `src/pages/api/users/index.ts` → Test: `src/__tests__/api/users/index.test.ts`
  - Source: `src/lib/permissions.ts` → Test: `src/__tests__/lib/permissions.test.ts`
  - Source: `src/components/UserForm.tsx` → Test: `src/__tests__/components/UserForm.test.tsx`

### Test TypeScript Configuration

- **Config file:** `tsconfig.test.json` (separate from main `tsconfig.json`)
- **Purpose:** Provides proper TypeScript support for test files
- **Features:**
  - Extends main `tsconfig.json` configuration
  - Includes test directories (`src/__tests__/**`, `src/test/**`)
  - Enables proper path alias resolution (`@/`) in tests
  - Adds Vitest type definitions
- **Why separate?** Main `tsconfig.json` excludes test files to keep application config clean

### Test Types

- **Unit Tests:** `*.test.ts` - Test individual functions/components
- **Integration Tests:** `*.integration.test.ts` - Test multiple components together
- **Performance Tests:** `*.performance.test.ts` - Test performance benchmarks

### Why This Structure?

1. **Prevents Build Errors:** Next.js won't treat tests as routes
2. **Clean Builds:** Test files excluded from production bundle
3. **Better Organization:** Clear separation between source and tests
4. **Faster Builds:** Fewer files to process during compilation
5. **IDE Support:** Better autocomplete and navigation
6. **Consistent Structure:** Easy to find tests for any source file

## What NOT to Put in Project Root

❌ **Never create these in project root:**
- Summary files
- Test documentation
- Fix documentation
- Implementation summaries
- Task summaries
- Configuration guides

✅ **Only these belong in project root:**
- `README.md` (main project README)
- Configuration files (package.json, tsconfig.json, etc.)
- License files
- .gitignore, .env files

## Creating New Documentation

### Step 1: Determine Category
Ask: What type of documentation is this?
- Bug fix → `docs/fixes/` (type: canonical, 90 days)
- Test summary → `docs/testing/` (type: worklog, 30 days)
- User guide → `docs/guides/` (type: canonical, 90 days)
- Migration → `docs/migration/` (type: runbook, 180 days)
- Enhancement → `docs/enhancements/` (type: canonical, 90 days)
- Reference → `docs/reference/` (type: canonical, 90 days)
- Spec task → `.kiro/specs/[spec-name]/` (type: worklog, 30 days)
- Other → `docs/misc/` (type: canonical, 90 days)

### Step 2: Add Frontmatter
Create file with required frontmatter:
```yaml
---
title: Your Document Title
type: [canonical|adr|worklog|runbook]
status: active
owner: "@team"
last_verified: YYYY-MM-DD
review_interval_days: [30|90|180|365]
related_code: [src/path/to/file.ts]
---
```

### Step 3: Choose Appropriate Name
Follow naming conventions for the category (see examples above).

### Step 4: Write Content
Add your documentation content after the frontmatter.

### Step 5: Validate
Run validation to ensure frontmatter is correct:
```bash
npx ts-node scripts/validate-docs-frontmatter.ts
```

### Step 6: Update Index
After creating documentation, the indexes will be auto-generated. No manual update needed.

## Examples

### Creating a Bug Fix Summary
```bash
# Create file with frontmatter
cat > docs/fixes/NEW_FEATURE_FIX.md << 'EOF'
---
title: New Feature Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: [src/components/NewFeature.tsx]
---

# New Feature Fix

Content here...
EOF

# Validate
npx ts-node scripts/validate-docs-frontmatter.ts
```

### Creating a Test Summary
```bash
# Create file with frontmatter
cat > docs/testing/NEW_FEATURE_TESTS_SUMMARY.md << 'EOF'
---
title: New Feature Tests Summary
type: worklog
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 30
related_code: [src/__tests__/components/NewFeature.test.tsx]
---

# New Feature Tests Summary

Content here...
EOF

# Validate
npx ts-node scripts/validate-docs-frontmatter.ts
```

### Creating a Spec Task Summary
```bash
# Create file in spec directory
cat > .kiro/specs/my-feature/TASK_1_IMPLEMENTATION_SUMMARY.md << 'EOF'
---
title: Task 1 Implementation Summary
type: worklog
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 30
related_code: [src/components/MyFeature.tsx]
---

# Task 1 Implementation Summary

Content here...
EOF

# Validate
npx ts-node scripts/validate-docs-frontmatter.ts
```

## Maintenance

### Regular Cleanup
- Review `docs/misc/` quarterly
- Archive outdated documentation
- Consolidate similar documents
- Update `docs/README.md` index

### Archiving Old Documentation
When documentation becomes outdated:
1. Move file to `docs/_archive/[category]/`
2. Update `status: archived` in frontmatter
3. Update any links pointing to it

## Automated Documentation Maintenance

The documentation system includes automated validation and monitoring:

### Daily Automated Checks
The GitHub Actions workflow (`.github/workflows/docs-maintenance.yml`) runs daily at 2 AM UTC:

1. **Frontmatter Validation** - Ensures all files have valid metadata
2. **Staleness Detection** - Identifies documentation past review interval
3. **Link Validation** - Checks for broken internal links
4. **Index Generation** - Updates searchable indexes

### Running Checks Locally
```bash
# Validate frontmatter
npx ts-node scripts/validate-docs-frontmatter.ts

# Check for stale docs
npx ts-node scripts/check-docs-staleness.ts

# Check for broken links
npx ts-node scripts/check-docs-links.ts

# Generate indexes
npx ts-node scripts/generate-docs-index.ts
```

### What Happens When Issues Are Found

**Frontmatter Validation Fails:**
- ❌ Script exits with error
- 📋 Lists all files with invalid frontmatter
- 🔧 Fix by adding missing fields or correcting values

**Stale Documentation Found:**
- ⚠️ GitHub issue created automatically
- 📄 Lists files past review interval
- 🔄 Update `last_verified` date to current date

**Broken Links Found:**
- ⚠️ GitHub issue created automatically
- 🔗 Lists all broken links with line numbers
- 🔧 Fix by updating or removing links

**Index Generation:**
- ✅ Automatically updates `INDEX_BY_TOPIC.md` and `SEARCH_INDEX.md`
- 📝 Auto-commits changes to repository

### Monitoring Documentation Health

**Check documentation status:**
```bash
# All checks pass
npx ts-node scripts/validate-docs-frontmatter.ts && \
npx ts-node scripts/check-docs-staleness.ts && \
npx ts-node scripts/check-docs-links.ts
```

**View documentation indexes:**
- Browse by topic: `docs/INDEX_BY_TOPIC.md`
- Search by keywords: `docs/SEARCH_INDEX.md`

### Important Notes

- ⚠️ **All new documentation MUST include frontmatter** or validation will fail
- 🔄 **Update `last_verified` date** when reviewing documentation
- 🔗 **Keep internal links current** - broken links will be detected
- 📅 **Review intervals matter** - stale docs will be flagged
- 🤖 **Automation runs daily** - check GitHub Actions for issues

## Quick Reference

| Type | Location | Example |
|------|----------|---------|
| Bug Fix | `docs/fixes/` | `CREDENTIAL_FIX.md` |
| Migration | `docs/migration/` | `MIGRATION_STATUS.md` |
| Test Summary | `docs/testing/` | `API_TESTS_SUMMARY.md` |
| User Guide | `docs/guides/` | `SETUP_GUIDE.md` |
| Spec Task | `.kiro/specs/[name]/` | `TASK_1_SUMMARY.md` |
| Other | `docs/misc/` | `ENHANCEMENT.md` |

## Benefits of This Structure

✅ Clean project root  
✅ Easy to find documentation  
✅ Clear organization by purpose  
✅ Scalable structure  
✅ Spec integration  
✅ Maintainable over time  

---

**Remember:** When in doubt, put it in `docs/misc/` and reorganize later. The important thing is to keep the project root clean!

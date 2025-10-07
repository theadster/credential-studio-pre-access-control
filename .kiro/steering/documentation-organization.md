---
inclusion: always
---

# Documentation Organization Guidelines

When creating summary files, documentation, or guides, follow this organization structure to keep the project root clean.

## Directory Structure

```
docs/
├── fixes/          # Bug fixes and issue resolutions
├── migration/      # Migration-related documentation
├── testing/        # Test summaries and testing guides
├── guides/         # User guides and how-to documentation
└── misc/           # Miscellaneous documentation

.kiro/specs/[spec-name]/
└── [spec-related summaries and documentation]
```

## Rules for New Documentation

### 1. Bug Fixes and Issue Resolutions
**Location:** `docs/fixes/`

**When to use:**
- Fixing bugs or issues
- Resolving errors
- Debugging summaries
- Problem resolution documentation

**Naming convention:** `[FEATURE]_[ISSUE]_FIX.md`

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

**Examples:**
- `SWITCHBOARD_CONFIGURATION_GUIDE.md`
- `MANUAL_TESTING_GUIDE.md`
- `CACHE_USAGE_EXAMPLE.md`

### 5. Spec-Related Documentation
**Location:** `.kiro/specs/[spec-name]/`

**When to use:**
- Task summaries from spec implementations
- Spec-specific documentation
- Implementation details for a specific spec

**Naming convention:** `TASK_[N]_[DESCRIPTION]_SUMMARY.md`

**Examples:**
- `.kiro/specs/integration-fields-mapping-fix/TASK_6_COMPLETE_FIELD_MAPPING_TESTS_SUMMARY.md`
- `.kiro/specs/api-performance-optimization/TASK_7_ERROR_HANDLING_SUMMARY.md`

### 6. Miscellaneous Documentation
**Location:** `docs/misc/`

**When to use:**
- Documentation that doesn't fit other categories
- One-off enhancements
- Temporary documentation
- Legacy documentation

## File Naming Conventions

### General Rules
- Use UPPERCASE for documentation files
- Use underscores to separate words
- Be descriptive but concise
- Include the type of document (SUMMARY, GUIDE, FIX, etc.)

### Examples
- ✅ `CREDENTIAL_GENERATION_FIXES_SUMMARY.md`
- ✅ `SWITCHBOARD_CONFIGURATION_GUIDE.md`
- ✅ `CUSTOM_FIELD_API_TESTS_SUMMARY.md`
- ❌ `fix.md` (too vague)
- ❌ `documentation.md` (not descriptive)

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
- Bug fix → `docs/fixes/`
- Test summary → `docs/testing/`
- User guide → `docs/guides/`
- Spec task → `.kiro/specs/[spec-name]/`
- Migration → `docs/migration/`
- Other → `docs/misc/`

### Step 2: Choose Appropriate Name
Follow naming conventions for the category.

### Step 3: Update Index
After creating documentation, update `docs/README.md` to include a link to the new file.

## Examples

### Creating a Bug Fix Summary
```bash
# Create file
touch docs/fixes/NEW_FEATURE_FIX.md

# Add content
# ...

# Update index
# Add link to docs/README.md under "Recent Fixes"
```

### Creating a Spec Task Summary
```bash
# Create file in appropriate spec folder
touch .kiro/specs/my-spec-name/TASK_1_IMPLEMENTATION_SUMMARY.md

# Add content
# ...

# No need to update docs/README.md (spec-specific)
```

### Creating a Configuration Guide
```bash
# Create file
touch docs/guides/NEW_FEATURE_CONFIGURATION_GUIDE.md

# Add content
# ...

# Update index
# Add link to docs/README.md under "Guides"
```

## Maintenance

### Regular Cleanup
- Review `docs/misc/` quarterly
- Archive outdated documentation
- Consolidate similar documents
- Update `docs/README.md` index

### Archiving Old Documentation
When documentation becomes outdated:
1. Create `docs/archive/` if it doesn't exist
2. Move old documentation there
3. Update `docs/README.md` to remove references
4. Add note in archive about why it was archived

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

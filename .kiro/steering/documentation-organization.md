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

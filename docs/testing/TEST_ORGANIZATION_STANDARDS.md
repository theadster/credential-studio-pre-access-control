# Test Organization Standards

**Last Updated**: January 2025  
**Status**: ✅ Active Standard  
**Applies To**: All test files in the project

---

## Overview

This document defines the standard location and organization for all test files in CredentialStudio. Following these standards ensures clean builds, prevents route pollution, and maintains a consistent project structure.

---

## Test File Location Standard

### Primary Rule

**ALL test files MUST be located in `src/__tests__/` directory.**

```
src/
├── __tests__/           ✅ All tests go here
│   ├── api/            (API route tests)
│   ├── components/     (Component tests)
│   ├── lib/            (Utility tests)
│   └── hooks/          (Hook tests)
├── pages/              ❌ NO tests here
├── components/         ❌ NO tests here
└── lib/                ❌ NO tests here
```

---

## Directory Structure

### Complete Test Organization

```
src/__tests__/
├── api/                                    # API Route Tests
│   ├── attendees/
│   │   ├── index.test.ts
│   │   ├── bulk-edit.test.ts
│   │   ├── bulk-delete.test.ts
│   │   ├── bulk-edit-transactions.test.ts
│   │   ├── bulk-delete-transactions.test.ts
│   │   ├── crud-transactions.test.ts
│   │   ├── import-transactions.test.ts
│   │   ├── bulk-edit-performance.test.ts
│   │   ├── bulk-operations-printable-fields.test.ts
│   │   ├── check-barcode.test.ts
│   │   ├── [id].test.ts
│   │   ├── backward-compatibility.test.ts
│   │   ├── batch-fetching.integration.test.ts
│   │   ├── import-boolean-fields.test.ts
│   │   ├── printable-field-detection.test.ts
│   │   ├── printable-field-integration.test.ts
│   │   └── id/
│   │       ├── generate-credential.test.ts
│   │       └── clear-credential.test.ts
│   ├── event-settings/
│   │   ├── index.integration.test.ts
│   │   ├── update-transactions.test.ts
│   │   ├── transactions-basic.test.ts
│   │   ├── optimistic-locking-conflict.test.ts
│   │   ├── partial-integration-failures.test.ts
│   │   ├── partial-integration-updates.test.ts
│   │   ├── complete-field-mapping.test.ts
│   │   ├── integration-error-handling.test.ts
│   │   ├── integration-update-error-handling.test.ts
│   │   ├── performance-benchmark.test.ts
│   │   ├── optimized-endpoint.integration.test.ts
│   │   ├── cache-integration-fields.test.ts
│   │   ├── cache-invalidation-integration-updates.test.ts
│   │   └── default-fields-permissions.test.ts
│   ├── roles/
│   │   ├── index.test.ts
│   │   ├── [id].test.ts
│   │   ├── crud-transactions.test.ts
│   │   └── initialize.test.ts
│   ├── users/
│   │   ├── index.test.ts
│   │   ├── team-membership.test.ts
│   │   ├── link-transactions.test.ts
│   │   ├── search.test.ts
│   │   ├── verify-email.test.ts
│   │   ├── send-password-reset.test.ts
│   │   ├── backward-compatibility.test.ts
│   │   └── permissions.test.ts
│   ├── logs/
│   │   ├── index.test.ts
│   │   ├── export.test.ts
│   │   └── delete.test.ts
│   ├── log-settings/
│   │   └── index.test.ts
│   ├── custom-fields/
│   │   └── index.test.ts
│   └── middleware-integration.test.ts
│
├── components/                             # Component Tests
│   ├── AttendeeForm/
│   │   └── BasicInformationSection.test.tsx
│   └── UserForm/
│       └── RoleSelector.test.tsx
│
├── lib/                                    # Utility Tests
│   ├── permissions.test.ts
│   └── sanitize.test.ts
│
└── hooks/                                  # Hook Tests
    └── useAttendees.test.ts
```

---

## Naming Conventions

### Test File Names

**Format:** `[source-filename].test.ts` or `[source-filename].test.tsx`

**Rules:**
- Test file name MUST match the source file name
- Use `.test.ts` for TypeScript files
- Use `.test.tsx` for React component files
- Use `.integration.test.ts` for integration tests
- Use `.performance.test.ts` for performance tests

**Examples:**

| Source File | Test File |
|-------------|-----------|
| `src/pages/api/users/index.ts` | `src/__tests__/api/users/index.test.ts` |
| `src/lib/permissions.ts` | `src/__tests__/lib/permissions.test.ts` |
| `src/components/UserForm.tsx` | `src/__tests__/components/UserForm.test.tsx` |
| `src/hooks/useAttendees.ts` | `src/__tests__/hooks/useAttendees.test.ts` |

---

## Test Types

### 1. Unit Tests
**Extension:** `.test.ts` or `.test.tsx`  
**Purpose:** Test individual functions, components, or modules in isolation

**Example:**
```typescript
// src/__tests__/lib/permissions.test.ts
describe('hasPermission', () => {
  it('should return true for admin role', () => {
    // test implementation
  });
});
```

### 2. Integration Tests
**Extension:** `.integration.test.ts`  
**Purpose:** Test multiple components or modules working together

**Example:**
```typescript
// src/__tests__/api/event-settings/index.integration.test.ts
describe('Event Settings Integration', () => {
  it('should update settings and invalidate cache', () => {
    // test implementation
  });
});
```

### 3. Performance Tests
**Extension:** `.performance.test.ts`  
**Purpose:** Test performance benchmarks and optimization

**Example:**
```typescript
// src/__tests__/api/attendees/bulk-edit-performance.test.ts
describe('Bulk Edit Performance', () => {
  it('should complete within 5 seconds for 1000 records', () => {
    // test implementation
  });
});
```

---

## Migration Guide

### Moving Existing Tests

If you find test files in the wrong location, follow these steps:

#### Step 1: Identify Misplaced Tests

```bash
# Find all test files in pages directory
find src/pages -name "*.test.ts" -o -name "*.test.tsx"

# Find all test files in components directory
find src/components -name "*.test.ts" -o -name "*.test.tsx"
```

#### Step 2: Create Target Directory

```bash
# For API tests
mkdir -p src/__tests__/api/[feature-name]

# For component tests
mkdir -p src/__tests__/components/[component-name]

# For utility tests
mkdir -p src/__tests__/lib

# For hook tests
mkdir -p src/__tests__/hooks
```

#### Step 3: Move Test Files

```bash
# Example: Move API test
mv src/pages/api/users/__tests__/index.test.ts src/__tests__/api/users/index.test.ts

# Example: Move component test
mv src/components/UserForm/__tests__/RoleSelector.test.tsx src/__tests__/components/UserForm/RoleSelector.test.tsx
```

#### Step 4: Remove Empty Directories

```bash
# Remove empty __tests__ directories
find src/pages -type d -name "__tests__" -empty -delete
find src/components -type d -name "__tests__" -empty -delete
```

#### Step 5: Clean and Rebuild

```bash
npm run clean
npm run build
npx vitest --run
```

---

## Configuration

### Vitest Configuration

The `vitest.config.ts` is configured to find tests in `src/__tests__/`:

```typescript
export default defineConfig({
  test: {
    include: [
      'src/__tests__/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      exclude: [
        'src/__tests__/',
        // ... other exclusions
      ],
    },
  },
});
```

### Next.js Configuration

The `next.config.mjs` excludes test files from the build:

```javascript
const nextConfig = {
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  excludeFile: (filePath) => {
    return filePath.includes('__tests__') || 
           filePath.endsWith('.test.ts') || 
           filePath.endsWith('.test.tsx');
  },
};
```

---

## Why This Structure?

### Benefits

1. **Prevents Build Errors**
   - Next.js won't treat test files as routes
   - No test files in production bundle
   - Cleaner build output

2. **Better Organization**
   - Clear separation between source and tests
   - Easy to find tests for any source file
   - Consistent structure across project

3. **Faster Builds**
   - Fewer files to process during compilation
   - Test files excluded from Next.js build
   - Reduced bundle size

4. **IDE Support**
   - Better autocomplete and navigation
   - Clear test file identification
   - Improved refactoring support

5. **Team Collaboration**
   - Consistent location for all tests
   - Easy onboarding for new developers
   - Clear testing standards

---

## Common Mistakes to Avoid

### ❌ DON'T: Place tests in pages directory

```
src/pages/api/users/__tests__/index.test.ts  ❌ WRONG
```

**Why:** Next.js treats this as an API route, causing build errors.

### ❌ DON'T: Place tests alongside source files

```
src/components/UserForm/__tests__/RoleSelector.test.tsx  ❌ WRONG
```

**Why:** Inconsistent with project standards, harder to maintain.

### ❌ DON'T: Use .spec.ts extension

```
src/__tests__/api/users/index.spec.ts  ❌ WRONG
```

**Why:** Project standard is `.test.ts`, not `.spec.ts`.

### ✅ DO: Place all tests in src/__tests__/

```
src/__tests__/api/users/index.test.ts  ✅ CORRECT
src/__tests__/components/UserForm/RoleSelector.test.tsx  ✅ CORRECT
```

---

## Checklist for New Tests

When creating a new test file:

- [ ] Test file is in `src/__tests__/` directory
- [ ] Directory structure mirrors source structure
- [ ] Test file name matches source file name
- [ ] Using `.test.ts` or `.test.tsx` extension
- [ ] Test file NOT in `src/pages/` directory
- [ ] Test file NOT in `src/components/` directory
- [ ] Test file NOT in `src/lib/` directory
- [ ] Imports use `@/` alias for source files
- [ ] Test runs successfully with `npx vitest --run`

---

## Enforcement

### Automated Checks

The following checks are in place to enforce test organization:

1. **Next.js Build**: Fails if test files are in pages directory
2. **Vitest Config**: Only looks for tests in `src/__tests__/`
3. **ESLint**: Can be configured to warn about misplaced tests

### Manual Review

During code review, check:

- Test files are in correct location
- Test file names follow conventions
- Directory structure mirrors source
- No `__tests__` directories in `src/pages/`

---

## Examples

### Example 1: API Route Test

**Source File:**
```
src/pages/api/users/index.ts
```

**Test File:**
```
src/__tests__/api/users/index.test.ts
```

**Test Content:**
```typescript
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/users/index';

describe('GET /api/users', () => {
  it('should return list of users', async () => {
    const { req, res } = createMocks({
      method: 'GET',
    });
    
    await handler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
  });
});
```

### Example 2: Component Test

**Source File:**
```
src/components/UserForm/RoleSelector.tsx
```

**Test File:**
```
src/__tests__/components/UserForm/RoleSelector.test.tsx
```

**Test Content:**
```typescript
import { render, screen } from '@testing-library/react';
import RoleSelector from '@/components/UserForm/RoleSelector';

describe('RoleSelector', () => {
  it('should render role options', () => {
    render(<RoleSelector roles={mockRoles} />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });
});
```

### Example 3: Utility Test

**Source File:**
```
src/lib/permissions.ts
```

**Test File:**
```
src/__tests__/lib/permissions.test.ts
```

**Test Content:**
```typescript
import { hasPermission } from '@/lib/permissions';

describe('hasPermission', () => {
  it('should return true for admin role', () => {
    const result = hasPermission('admin', 'users', 'write');
    expect(result).toBe(true);
  });
});
```

---

## FAQ

### Q: Why can't I put tests next to source files?

**A:** While this is common in some projects, Next.js treats files in `src/pages/` as routes. Test files in this directory cause build errors and route pollution.

### Q: What about component tests?

**A:** All tests, including component tests, should be in `src/__tests__/components/`. This maintains consistency across the project.

### Q: Can I use .spec.ts instead of .test.ts?

**A:** No. The project standard is `.test.ts`. Using `.spec.ts` creates inconsistency.

### Q: How do I run tests for a specific file?

**A:** Use vitest with a pattern:
```bash
npx vitest --run src/__tests__/api/users/index.test.ts
```

### Q: What if I find tests in the wrong location?

**A:** Follow the migration guide in this document to move them to the correct location.

---

## Related Documentation

- [Test File Organization Fix](../fixes/TEST_FILE_ORGANIZATION_FIX.md)
- [Documentation Organization Guidelines](../../.kiro/steering/documentation-organization.md)
- [Testing Configuration](../../.kiro/steering/testing.md)

---

## Maintenance

This document should be reviewed and updated:

- When test organization standards change
- When new test types are introduced
- When vitest configuration changes
- Quarterly as part of documentation review

---

**Last Review**: January 2025  
**Next Review**: April 2025  
**Owner**: Development Team

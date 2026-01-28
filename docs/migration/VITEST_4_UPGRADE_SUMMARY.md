---
title: Vitest 4.0.18 Upgrade Summary
type: worklog
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 30
related_code: ["package.json", "vitest.config.ts", "tsconfig.test.json"]
---

# Vitest 4.0.18 Upgrade Summary

## Status: ✅ Version Updated, ⚠️ Tests Need Fixes

### What Was Done

1. **Updated package.json** - Changed versions from `^3.2.4` to `^4.0.18`:
   - `vitest`: `^3.2.4` → `^4.0.18`
   - `@vitest/coverage-v8`: `^3.2.4` → `^4.0.18`
   - `@vitest/ui`: `^3.2.4` → `^4.0.18`

2. **Created Migration Documentation**:
   - `docs/migration/VITEST_4_0_18_UPGRADE_ANALYSIS.md` - Comprehensive breaking changes analysis
   - `docs/fixes/VITEST_4_CONSTRUCTOR_MOCKING_FIX.md` - Specific fix for constructor mocking

### Current Test Status

**Before Upgrade:**
- 106 test files failed
- 384 tests failed out of 2584 total
- 1 unhandled error

**Primary Issues:**
1. Constructor mocking with arrow functions (Vitest 4 breaking change)
2. Validation logic issues in UserForm tests
3. Unhandled errors in API error handling

### Breaking Changes Affecting Your Project

#### 1. Constructor Mocking (HIGH PRIORITY)
- **Issue**: Arrow functions cannot be constructors in Vitest 4
- **Affected File**: `src/lib/__tests__/tabCoordinator.test.ts`
- **Fix**: Convert `vi.fn(() => ...)` to `vi.fn(function() { ... })`
- **Example**:
  ```typescript
  // ❌ OLD
  global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
  
  // ✅ NEW
  global.BroadcastChannel = vi.fn(function() {
    return mockBroadcastChannel;
  }) as any;
  ```

#### 2. Coverage Configuration (MEDIUM PRIORITY)
- **Issue**: `coverage.all` and `coverage.extensions` removed
- **Current Config**: Still works but should add `coverage.include`
- **Recommendation**: Add explicit include pattern in `vitest.config.ts`

#### 3. Reporter Changes (LOW PRIORITY)
- **Issue**: Basic reporter removed
- **Your Impact**: None (using default reporter)

### Next Steps

#### Phase 1: Fix Constructor Mocks (Immediate)
```bash
# Fix the primary issue in tabCoordinator test
# Change line 24 from arrow function to function keyword
```

**File**: `src/lib/__tests__/tabCoordinator.test.ts`
**Change**: Line 24
```typescript
// Before
global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;

// After
global.BroadcastChannel = vi.fn(function() {
  return mockBroadcastChannel;
}) as any;
```

#### Phase 2: Address Remaining Test Failures
- Review `src/components/UserForm/hooks/__tests__/useUserFormValidation.test.ts`
- Review `src/components/__tests__/AuthUserSearch.test.tsx`
- Fix any other arrow function mocks used as constructors

#### Phase 3: Enhance Configuration
- Add `coverage.include` to `vitest.config.ts` for clarity
- Verify coverage reports are accurate

#### Phase 4: Verify All Tests Pass
```bash
npm run test
```

### Configuration Files Status

#### ✅ vitest.config.ts
- Current configuration is compatible with Vitest 4
- Recommendation: Add `coverage.include` for explicit coverage scope
- No breaking changes needed

#### ✅ tsconfig.test.json
- Properly configured for test files
- Includes vitest/globals types
- No changes needed

#### ✅ src/test/setup.ts
- Comprehensive test setup
- All mocks are compatible
- No changes needed

### Compatibility Notes

- **Node.js**: Your requirement `>=20.x` is compatible
- **React**: 19.2.3 is compatible with Vitest 4
- **Next.js**: 16.1.1 is compatible with Vitest 4
- **TypeScript**: 5.9.3 is compatible with Vitest 4

### Resources

- [Vitest 4.0 Migration Guide](https://main.vitest.dev/guide/migration)
- [Vitest 4.0 Release Blog](https://vitest.dev/blog/vitest-4)
- [Constructor Mocking Documentation](https://vitest.dev/api/vi#vi-spyon)

### Rollback Plan

If needed, revert to Vitest 3.2.4:
```bash
npm install vitest@^3.2.4 @vitest/coverage-v8@^3.2.4 @vitest/ui@^3.2.4
```

### Verification Checklist

- [ ] Run `npm install` to update dependencies
- [ ] Fix constructor mocks in test files
- [ ] Run `npm run test` to verify all tests pass
- [ ] Run `npm run test:coverage` to verify coverage reports
- [ ] Commit changes with message: "chore: upgrade vitest to 4.0.18"

### Timeline

- **Immediate**: Update package.json (✅ Done)
- **Today**: Fix constructor mocks
- **This week**: Address remaining test failures
- **Next week**: Verify all tests pass and coverage is accurate

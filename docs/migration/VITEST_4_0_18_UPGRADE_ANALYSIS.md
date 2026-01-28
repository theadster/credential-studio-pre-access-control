---
title: Vitest 4.0.18 Upgrade Analysis
type: runbook
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 180
related_code: ["vitest.config.ts", "tsconfig.test.json", "package.json", "src/test/setup.ts"]
---

# Vitest 4.0.18 Upgrade Analysis

## Executive Summary

Your project is **already running Vitest 4.0.18** in node_modules, but `package.json` specifies `^3.2.4`. This version mismatch needs correction. The upgrade introduces breaking changes that require attention, particularly around mock constructors and coverage reporting.

**Current Status:** 106 test failures out of 190 test files (384 failed tests out of 2584 total)

## Breaking Changes in Vitest 4.0

### 1. **Constructor Mocking (CRITICAL - Affects Your Tests)**

**What Changed:**
- `vi.fn()` and `vi.spyOn()` now require `function` or `class` keyword for constructor mocking
- Arrow functions in mocks will throw "is not a constructor" error when called with `new`

**Your Impact:** ⚠️ **HIGH**
- `src/lib/__tests__/tabCoordinator.test.ts` - Multiple failures with BroadcastChannel mocking
- Error: `[vitest] The vi.fn() mock did not use 'function' or 'class' in its implementation`

**Example Fix:**
```typescript
// ❌ OLD (Vitest 3.x)
const mockBroadcastChannel = vi.fn(() => ({
  postMessage: vi.fn(),
  close: vi.fn(),
}));

// ✅ NEW (Vitest 4.x)
const mockBroadcastChannel = vi.fn(function() {
  return {
    postMessage: vi.fn(),
    close: vi.fn(),
  };
});

// OR use class syntax
class MockBroadcastChannel {
  postMessage = vi.fn();
  close = vi.fn();
}
const mockBroadcastChannel = vi.fn(function() {
  return new MockBroadcastChannel();
});
```

### 2. **Coverage Configuration Changes**

**What Changed:**
- `coverage.all` option removed
- `coverage.extensions` option removed
- Default behavior changed to only include covered files
- Simplified exclude patterns (now only excludes `node_modules` and `.git` by default)

**Your Impact:** ⚠️ **MEDIUM**
- Your `vitest.config.ts` has custom exclude patterns - these still work but may need review
- Coverage reports will be more accurate but may show different numbers

**Current Config (Still Valid):**
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/test/',
    'src/__tests__/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData',
    'dist/',
    '.next/',
  ],
}
```

**Recommendation:** Add `coverage.include` to be explicit:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  include: ['src/**/*.{ts,tsx}'],
  exclude: [
    'node_modules/',
    'src/test/',
    'src/__tests__/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/mockData',
    'dist/',
    '.next/',
  ],
}
```

### 3. **Reporter Changes**

**What Changed:**
- Basic reporter removed
- Default reporter behavior changed
- Verbose reporter now always prints tests one-by-one

**Your Impact:** ⚠️ **LOW**
- You're using default reporter - no changes needed
- If you use `reporter: 'verbose'`, behavior will change in CI

### 4. **Module Mocking Improvements**

**What Changed:**
- Module mocking now works differently to address edge cases with classes
- `vi.spyOn()` on constructors now properly constructs instances

**Your Impact:** ⚠️ **LOW**
- Only affects advanced mocking patterns
- Your current mocks should work with fixes to constructor patterns

### 5. **Workspace Configuration**

**What Changed:**
- `workspace` option renamed to `projects` (in Vitest 3.2, kept for compatibility)

**Your Impact:** ✅ **NONE**
- You don't use workspace configuration

## Test Failures Analysis

### Current Failures (106 files, 384 tests)

**Primary Issue: Constructor Mocking**
- `src/lib/__tests__/tabCoordinator.test.ts` - BroadcastChannel mock using arrow function
- Multiple tests failing with: `() => mockBroadcastChannel is not a constructor`

**Secondary Issues:**
- `src/components/UserForm/hooks/__tests__/useUserFormValidation.test.ts` - Validation logic issues
- `src/components/__tests__/AuthUserSearch.test.tsx` - Unhandled error in useApiError hook
- Various component tests with mock-related failures

## Migration Checklist

- [ ] **Fix package.json versions** - Update to `^4.0.18` for vitest and related packages
- [ ] **Fix constructor mocks** - Convert arrow functions to `function` keyword in mocks
- [ ] **Review test failures** - Address the 384 failing tests
- [ ] **Update vitest.config.ts** - Add `coverage.include` for clarity
- [ ] **Run full test suite** - Verify all tests pass
- [ ] **Update CI/CD** - Ensure CI uses correct Vitest version

## Files Requiring Changes

### High Priority
1. `src/lib/__tests__/tabCoordinator.test.ts` - Constructor mocking
2. `src/components/UserForm/hooks/__tests__/useUserFormValidation.test.ts` - Validation tests
3. `src/components/__tests__/AuthUserSearch.test.tsx` - API error handling

### Medium Priority
4. `package.json` - Version alignment
5. `vitest.config.ts` - Coverage configuration enhancement

### Low Priority
6. Any other test files with arrow function mocks

## Recommended Action Plan

1. **Immediate:** Update `package.json` to explicitly specify `^4.0.18`
2. **Phase 1:** Fix constructor mocking patterns in test files
3. **Phase 2:** Address remaining test failures
4. **Phase 3:** Enhance vitest.config.ts with coverage.include
5. **Phase 4:** Run full test suite and verify all pass

## Resources

- [Vitest 4.0 Migration Guide](https://main.vitest.dev/guide/migration)
- [Vitest 4.0 Blog Post](https://vitest.dev/blog/vitest-4)
- [Constructor Mocking Documentation](https://vitest.dev/api/vi#vi-spyon)

## Notes

- Your project is well-structured for testing with proper test file organization
- The test setup file is comprehensive and handles necessary mocks
- Most failures are fixable with straightforward pattern updates
- No fundamental architectural changes needed

# Test Environment Isolation Fix

## Problem

The `apiErrorHandler.test.ts` file had tests that directly mutated `process.env.NODE_ENV` without proper isolation, which could cause cross-test race conditions:

```typescript
// Before: Unsafe environment mutation
it('should include stack trace in development', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';  // Direct mutation!

  // ... test code ...

  process.env.NODE_ENV = originalEnv;  // Restore (but not if test fails!)
});
```

**Issues:**
- **Race conditions**: Tests running in parallel could interfere with each other
- **No cleanup on failure**: If test fails, environment isn't restored
- **Read-only property**: TypeScript marks `NODE_ENV` as read-only
- **Brittle**: Manual save/restore pattern is error-prone
- **Test pollution**: Failed tests could affect subsequent tests

### Why This Matters

1. **Parallel test execution**: Vitest runs tests in parallel by default
2. **Shared state**: `process.env` is global and shared across all tests
3. **Unpredictable failures**: Tests could pass/fail based on execution order
4. **Hard to debug**: Race conditions are intermittent and hard to reproduce

## Solution

Updated all tests to use Vitest's `vi.stubEnv()` utility with proper cleanup in `finally` blocks.

### Implementation

**Before (Unsafe):**
```typescript
it('should include stack trace in development', () => {
  const originalEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';  // ❌ Direct mutation

  const result = formatErrorResponse(error, { includeStack: true });
  expect(result.details).toBeDefined();

  process.env.NODE_ENV = originalEnv;  // ❌ Not called if test fails
});
```

**After (Safe):**
```typescript
it('should include stack trace in development', () => {
  // ✅ Use Vitest's stubEnv utility
  vi.stubEnv('NODE_ENV', 'development');

  try {
    const result = formatErrorResponse(error, { includeStack: true });
    expect(result.details).toBeDefined();
  } finally {
    // ✅ Always restore, even if test fails
    vi.unstubAllEnvs();
  }
});
```

### Changes Made

**1. Test: "should include stack trace in development when includeStack is true"**
```typescript
// Before
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';
// ... test code ...
process.env.NODE_ENV = originalEnv;

// After
vi.stubEnv('NODE_ENV', 'development');
try {
  // ... test code ...
} finally {
  vi.unstubAllEnvs();
}
```

**2. Test: "should not include stack trace in production"**
```typescript
// Before
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
// ... test code ...
process.env.NODE_ENV = originalEnv;

// After
vi.stubEnv('NODE_ENV', 'production');
try {
  // ... test code ...
} finally {
  vi.unstubAllEnvs();
}
```

**3. Test: "should include stack trace in development logs"**
```typescript
// Before
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
// ... test code ...
consoleSpy.mockRestore();
process.env.NODE_ENV = originalEnv;

// After
vi.stubEnv('NODE_ENV', 'development');
const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
try {
  // ... test code ...
} finally {
  consoleSpy.mockRestore();
  vi.unstubAllEnvs();
}
```

## Benefits of `vi.stubEnv()`

### 1. **Proper Isolation**
- Creates isolated environment for each test
- Prevents cross-test interference
- Safe for parallel test execution

### 2. **Automatic Cleanup**
- Vitest tracks stubbed environments
- `vi.unstubAllEnvs()` restores all at once
- Works even if test fails (when in `finally` block)

### 3. **Type Safety**
- Respects TypeScript's read-only properties
- No type errors or warnings
- Better IDE support

### 4. **Vitest Integration**
- Built-in utility designed for this purpose
- Consistent with Vitest best practices
- Better test isolation guarantees

## Files Modified

**src/lib/__tests__/apiErrorHandler.test.ts**
- Updated 3 tests that mutated `NODE_ENV`
- Replaced direct mutation with `vi.stubEnv()`
- Added `try/finally` blocks for guaranteed cleanup
- All tests now properly isolated

## Testing

All tests pass with proper isolation:

```bash
npx vitest --run src/lib/__tests__/apiErrorHandler.test.ts

✓ src/lib/__tests__/apiErrorHandler.test.ts (40 tests) 9ms

Test Files  1 passed (1)
     Tests  40 passed (40)
```

## Best Practices for Environment Variables in Tests

### ✅ DO: Use `vi.stubEnv()` with cleanup

```typescript
it('should behave differently in production', () => {
  vi.stubEnv('NODE_ENV', 'production');
  
  try {
    // Test code
  } finally {
    vi.unstubAllEnvs();
  }
});
```

### ✅ DO: Use `beforeEach`/`afterEach` for multiple tests

```typescript
describe('Environment-dependent behavior', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

### ❌ DON'T: Mutate `process.env` directly

```typescript
// ❌ Bad: Direct mutation
it('test', () => {
  process.env.NODE_ENV = 'development';
  // ...
});
```

### ❌ DON'T: Forget cleanup

```typescript
// ❌ Bad: No cleanup if test fails
it('test', () => {
  vi.stubEnv('NODE_ENV', 'development');
  // ... test code ...
  vi.unstubAllEnvs();  // Won't run if test fails!
});
```

### ✅ DO: Always use `finally` for cleanup

```typescript
// ✅ Good: Cleanup always runs
it('test', () => {
  vi.stubEnv('NODE_ENV', 'development');
  
  try {
    // ... test code ...
  } finally {
    vi.unstubAllEnvs();  // Always runs!
  }
});
```

## Alternative Patterns

### Pattern 1: Individual Test Isolation (Used in this fix)

```typescript
it('test', () => {
  vi.stubEnv('VAR', 'value');
  try {
    // test
  } finally {
    vi.unstubAllEnvs();
  }
});
```

**Pros:**
- ✅ Explicit per-test isolation
- ✅ Clear what each test needs
- ✅ No shared state between tests

**Cons:**
- ⚠️ More verbose
- ⚠️ Repetitive for multiple tests

### Pattern 2: Suite-Level Setup

```typescript
describe('suite', () => {
  beforeEach(() => {
    vi.stubEnv('VAR', 'value');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('test 1', () => { /* ... */ });
  it('test 2', () => { /* ... */ });
});
```

**Pros:**
- ✅ Less repetition
- ✅ Consistent setup across tests
- ✅ Cleaner test code

**Cons:**
- ⚠️ Shared setup might not fit all tests
- ⚠️ Less explicit about dependencies

### Pattern 3: Test-Specific Overrides

```typescript
describe('suite', () => {
  beforeEach(() => {
    vi.stubEnv('VAR', 'default');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('test with default', () => { /* uses 'default' */ });
  
  it('test with override', () => {
    vi.stubEnv('VAR', 'override');  // Override for this test
    // ...
  });
});
```

## Related Vitest Utilities

- **`vi.stubEnv(name, value)`**: Stub a single environment variable
- **`vi.unstubAllEnvs()`**: Restore all stubbed environment variables
- **`vi.stubGlobal(name, value)`**: Stub global variables
- **`vi.unstubAllGlobals()`**: Restore all stubbed globals

## References

- [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
- [Vitest Environment Variables](https://vitest.dev/api/vi.html#vi-stubenv)
- [Test Isolation Best Practices](https://vitest.dev/guide/test-context.html)

## Related Files

- `src/lib/__tests__/apiErrorHandler.test.ts` - Updated test file
- `src/lib/apiErrorHandler.ts` - Code under test

---
title: Vitest 4 Constructor Mocking Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 90
related_code: ["src/lib/__tests__/tabCoordinator.test.ts", "src/test/setup.ts"]
---

# Vitest 4 Constructor Mocking Fix

## Problem

Vitest 4.0+ requires that mocks used as constructors (with `new` keyword) must use `function` or `class` syntax, not arrow functions. Arrow functions cannot be constructors in JavaScript.

**Error Message:**
```
[vitest] The vi.fn() mock did not use 'function' or 'class' in its implementation
TypeError: () => mockBroadcastChannel is not a constructor
```

## Root Cause

In Vitest 3.x, arrow function mocks could be called with `new`, but this was inconsistent with JavaScript semantics. Vitest 4.x enforces proper constructor patterns.

## Solution

### Pattern 1: Using `function` Keyword (Recommended for Simple Cases)

**Before (Vitest 3.x):**
```typescript
global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
```

**After (Vitest 4.x):**
```typescript
global.BroadcastChannel = vi.fn(function() {
  return mockBroadcastChannel;
}) as any;
```

### Pattern 2: Using `class` Syntax (Recommended for Complex Cases)

**Before:**
```typescript
const mockBroadcastChannel = vi.fn(() => ({
  postMessage: vi.fn(),
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  onmessage: null,
}));

global.BroadcastChannel = mockBroadcastChannel as any;
```

**After:**
```typescript
class MockBroadcastChannel {
  postMessage = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onmessage = null;
}

global.BroadcastChannel = vi.fn(function() {
  return new MockBroadcastChannel();
}) as any;
```

### Pattern 3: Direct Class Assignment

**Before:**
```typescript
global.BroadcastChannel = vi.fn(() => mockBroadcastChannel) as any;
```

**After:**
```typescript
class MockBroadcastChannel {
  postMessage = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onmessage = null;
}

global.BroadcastChannel = MockBroadcastChannel as any;
```

## Affected Files

### Primary
- `src/lib/__tests__/tabCoordinator.test.ts` - BroadcastChannel mock (line 24)

### Secondary (Check for similar patterns)
- Any test file using `vi.fn()` with constructor calls
- Any test file mocking global constructors (XMLHttpRequest, fetch, etc.)

## Implementation Steps

1. **Identify all arrow function mocks** used as constructors
2. **Convert to `function` keyword** for simple cases
3. **Convert to `class` syntax** for complex objects
4. **Test thoroughly** to ensure mock behavior is preserved

## Verification

After applying fixes, run:
```bash
npm run test -- src/lib/__tests__/tabCoordinator.test.ts
```

Expected output: All tests pass without "is not a constructor" errors.

## Related Changes

- Vitest 4.0 also improved `vi.spyOn()` to support constructors
- Module mocking behavior changed to be more consistent
- See [Vitest 4 Migration Guide](https://main.vitest.dev/guide/migration) for details

## Notes

- This is a breaking change from Vitest 3.x
- The change aligns with JavaScript semantics
- All existing mock behavior is preserved with proper syntax
- No functional changes needed, only syntax updates

# React Hook Order Violation Fix

## Issue
Application was crashing on dashboard load with React error #310: "Minified React error #310"

This error occurs when React hooks are called conditionally or in the wrong order, violating React's Rules of Hooks.

## Root Cause
The dashboard component had multiple violations of React's Rules of Hooks:

1. **Inline `useMemo` in JSX** (line 2937): A `useMemo` hook was being called directly inside JSX for credential stats calculation
2. **Inline IIFE in JSX** (line 2967): An immediately-invoked function expression was used for photo stats calculation
3. **Inline IIFE in JSX** (line 2907): An immediately-invoked function expression was used for days until event calculation
4. **Incorrect hook type**: `getGridColumns` was using `useCallback` when it should use `useMemo` (returns a function, not a callback)
5. **Incorrect hook type**: `getCustomFieldsWithValues` was using `useCallback` when it should use `useMemo` (returns a function, not a callback)

## Solution

### 1. Fixed Hook Types
Changed `useCallback` to `useMemo` for functions that return other functions:

```typescript
// Before (WRONG)
const getGridColumns = useCallback((fieldCount: number): string => {
  // ... implementation
}, [eventSettings?.customFieldColumns]);

// After (CORRECT)
const getGridColumns = useMemo(() => {
  const maxColumns = eventSettings?.customFieldColumns || 7;
  return (fieldCount: number): string => {
    // ... implementation
  };
}, [eventSettings?.customFieldColumns]);
```

### 2. Moved Stats Calculations to Top-Level Memoized Values
Created three new `useMemo` hooks at the component's top level:

```typescript
// Credential stats
const credentialStats = useMemo(() => {
  const attendeesWithCredentials = attendees.filter(
    a => a.credentialUrl && a.credentialUrl.trim() !== ''
  ).length;
  
  const totalCredentialCount = attendees.reduce((sum, a) => {
    const count = Number(a.credentialCount);
    return sum + (isNaN(count) || count < 0 ? 0 : count);
  }, 0);
  
  return { attendeesWithCredentials, totalCredentialCount };
}, [attendees]);

// Photo stats
const photoStats = useMemo(() => {
  const hasAtomicCounts = attendees.some(a => typeof a.photoUploadCount === 'number');
  const totalUploads = attendees.reduce((sum, a) => {
    const count = Number(a.photoUploadCount);
    if (!isNaN(count) && count >= 0) {
      return sum + count;
    }
    return sum + (a.photoUrl ? 1 : 0);
  }, 0);
  const attendeesWithPhotos = attendees.filter(a => a.photoUrl).length;
  const percentage = attendees.length > 0 ? Math.round((attendeesWithPhotos / attendees.length) * 100) : 0;
  const displayCount = hasAtomicCounts ? totalUploads : attendeesWithPhotos;
  
  return { displayCount, percentage };
}, [attendees]);

// Days until event
const daysUntilEvent = useMemo(() => {
  if (!eventSettings?.eventDate) return null;
  const eventDate = new Date(eventSettings.eventDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
}, [eventSettings?.eventDate]);
```

### 3. Updated JSX to Use Memoized Values
Replaced inline calculations with the memoized values:

```typescript
// Before (WRONG - inline useMemo)
{useMemo(() => {
  const attendeesWithCredentials = attendees.filter(...).length;
  return <p>{attendeesWithCredentials}</p>;
}, [attendees])}

// After (CORRECT - use memoized value)
<p>{credentialStats.attendeesWithCredentials}</p>
```

## React's Rules of Hooks

### What Are They?
1. **Only call hooks at the top level** - Don't call hooks inside loops, conditions, or nested functions
2. **Only call hooks from React functions** - Call hooks from React function components or custom hooks

### Why Do They Matter?
React relies on the order in which hooks are called to maintain state correctly between renders. If hooks are called conditionally or in different orders, React can't match up the state correctly, leading to bugs and crashes.

### Common Violations
- ❌ Calling hooks inside JSX expressions
- ❌ Calling hooks inside callbacks
- ❌ Calling hooks inside loops
- ❌ Calling hooks conditionally (inside if statements)
- ❌ Using `useCallback` when you should use `useMemo`

### Correct Patterns
- ✅ Call all hooks at the top level of your component
- ✅ Use `useMemo` for expensive calculations
- ✅ Use `useCallback` for callback functions passed to child components
- ✅ Use `useMemo` when returning a function (creates a factory function)

## Testing
After the fix:
1. Dashboard loads without errors
2. Stats cards display correctly
3. No React hook order violations
4. TypeScript compilation succeeds with no errors

## Files Modified
- `src/pages/dashboard.tsx` - Fixed hook violations and moved calculations to top level

## Prevention
To prevent similar issues in the future:

1. **Never call hooks inside JSX** - Always call hooks at the component's top level
2. **Use ESLint** - The `eslint-plugin-react-hooks` plugin catches these violations
3. **Understand hook types**:
   - `useMemo(() => value, deps)` - Memoize a value
   - `useCallback(() => fn, deps)` - Memoize a callback function
   - `useMemo(() => (args) => result, deps)` - Create a memoized factory function
4. **Code review** - Watch for inline calculations in JSX that should be memoized

## References
- [React Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks)
- [React Error #310](https://react.dev/errors/310)
- [useMemo vs useCallback](https://react.dev/reference/react/useMemo)

# Router API Fix

## Issue
Multiple pages in the `src/pages/` directory were incorrectly using `useRouter` from `next/navigation` (App Router API) instead of `next/router` (Pages Router API). This caused a bug where accessing `router.pathname` and `router.query` would fail since these properties don't exist in the App Router's useRouter.

## Root Cause
The project uses Next.js Pages Router (files in `src/pages/`), but several pages were importing the App Router's `useRouter` from `next/navigation`, which has a different API that doesn't include `pathname` or `query` properties.

## Files Fixed

### Implementation Files
- `src/pages/login.tsx` - Accessing `router.pathname`
- `src/pages/signup.tsx` - Using `router.push()`
- `src/pages/forgot-password.tsx` - Using `router.push()`
- `src/pages/reset-password.tsx` - Using `router.push()`
- `src/pages/magic-link-login.tsx` - Using `router.push()`

### Test Files
- `src/__tests__/integration/login-state-reset.test.tsx` - Mock was stubbing pathname on wrong router API

## Changes Made

### 1. Fixed Router Import
Changed all imports from:
```typescript
import { useRouter } from 'next/navigation';
```

To:
```typescript
import { useRouter } from 'next/router';
```

### 2. Optimized Dependency Arrays
Extracted stable values for better useEffect dependency tracking:

```typescript
const LoginPage = () => {
  const router = useRouter();
  
  // Extract pathname for stable dependency
  const pathname = router.pathname;

  // Reset loading state when component mounts or route changes
  useEffect(() => {
    console.log('[Login] Component mounted/route changed, resetting state', {
      timestamp: new Date().toISOString(),
      pathname,
    });
    
    setIsLoading(false);
    setShowPw(false);
    
    return () => {
      console.log('[Login] Component unmounting, cleaning up', {
        timestamp: new Date().toISOString(),
      });
    };
  }, [pathname]); // ✅ Depend on pathname value, not router.pathname
  
  // Destructure resetForm for stable reference in useEffect
  const { resetForm } = formik;

  // Reset form when component mounts or route changes
  useEffect(() => {
    resetForm();
  }, [pathname, resetForm]); // ✅ Include all dependencies, no eslint-disable needed
}
```

**Benefits:**
- Prevents unnecessary re-renders if the router object reference changes
- No eslint-disable comments needed - all dependencies properly tracked
- Clearer intent with explicit stable references

## Verification
- All affected pages now have no TypeScript diagnostics
- The login state reset test passes all 6 test cases
- The correct router API is now being used throughout the Pages Router pages

## Impact
This fix ensures that:
1. `router.pathname` works correctly in login.tsx for state reset logic
2. `router.query` works correctly in verify-email.tsx for reading URL parameters
3. All router navigation (`router.push()`) uses the correct API
4. Tests properly mock the Pages Router API instead of the App Router API

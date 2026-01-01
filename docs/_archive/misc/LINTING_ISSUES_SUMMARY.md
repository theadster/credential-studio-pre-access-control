# Linting Issues Summary

**Total Issues Found: 256**
- Errors: ~150
- Warnings: ~106

## Issue Categories

### 1. TypeScript `any` Type Usage (~120 instances)
**Severity: Medium**
**Files Affected:** Most component and API files

**Issue:** Using `any` type defeats TypeScript's type safety
```typescript
// Bad
const data: any = response.data;

// Good
interface ResponseData {
  id: string;
  name: string;
}
const data: ResponseData = response.data;
```

**Recommendation:** 
- Create proper TypeScript interfaces for data structures
- Use `unknown` type when type is truly unknown, then narrow it
- Can be suppressed with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` if absolutely necessary

### 2. Unused Variables (~40 instances)
**Severity: Low**
**Files Affected:** Various components and API routes

**Issue:** Variables declared but never used
```typescript
// Bad
const { data, error } = await fetch(); // error never used

// Good
const { data } = await fetch();
// or
const { data, error: _error } = await fetch(); // prefix with _ to indicate intentionally unused
```

**Recommendation:** Remove unused variables or prefix with `_` if intentionally unused

### 3. React Hook Dependencies (~15 instances)
**Severity: Medium**
**Files Affected:** Components with useEffect hooks

**Issue:** useEffect missing dependencies
```typescript
// Bad
useEffect(() => {
  loadData();
}, []); // loadData not in dependency array

// Good
useEffect(() => {
  loadData();
}, [loadData]);
```

**Recommendation:** 
- Add missing dependencies
- Use `useCallback` to memoize functions
- Add `// eslint-disable-next-line react-hooks/exhaustive-deps` with comment explaining why if intentional

### 4. Next.js Image Optimization (~10 instances)
**Severity: Low (Performance)**
**Files Affected:** Pages with images

**Issue:** Using `<img>` instead of Next.js `<Image>`
```typescript
// Bad
<img src="/logo.png" />

// Good
import Image from 'next/image';
<Image src="/logo.png" width={100} height={100} alt="Logo" />
```

**Recommendation:** Replace `<img>` with Next.js `<Image>` component for better performance

### 5. Unescaped Entities in JSX (~20 instances)
**Severity: Low**
**Files Affected:** EventSettingsForm.tsx mainly

**Issue:** Quotes not escaped in JSX
```typescript
// Bad
<p>Use "quotes" here</p>

// Good
<p>Use &quot;quotes&quot; here</p>
// or
<p>Use {'"'}quotes{'"'} here</p>
```

**Recommendation:** Escape quotes or use curly braces

### 6. Const vs Let (~5 instances)
**Severity: Low**
**Files Affected:** Various

**Issue:** Variables declared with `let` but never reassigned
```typescript
// Bad
let data = getData();

// Good
const data = getData();
```

**Recommendation:** Use `const` by default, only use `let` when reassignment is needed

### 7. Missing Alt Text (~5 instances)
**Severity: Medium (Accessibility)**
**Files Affected:** dashboard.tsx

**Issue:** Images missing alt text for accessibility
```typescript
// Bad
<img src="/photo.jpg" />

// Good
<img src="/photo.jpg" alt="User profile photo" />
```

**Recommendation:** Always provide meaningful alt text for images

### 8. Empty Interface (~1 instance)
**Severity: Low**
**Files Affected:** ui/command.tsx

**Issue:** Interface with no members
```typescript
// Bad
interface CommandDialogProps extends DialogProps {}

// Good
type CommandDialogProps = DialogProps;
```

**Recommendation:** Use type alias instead of empty interface

## Priority Fixes

### High Priority (Should Fix)
1. ✅ **Migrated API files** - Already clean!
2. Missing alt text on images (accessibility)
3. React Hook dependency warnings (potential bugs)

### Medium Priority (Nice to Have)
1. Replace `any` types with proper interfaces
2. Remove unused variables
3. Fix unescaped entities

### Low Priority (Optional)
1. Replace `<img>` with `<Image>`
2. Change `let` to `const` where appropriate
3. Fix empty interface

## Quick Fixes Available

You can auto-fix some issues with:
```bash
npm run lint -- --fix
```

This will automatically fix:
- Unused variables (by removing them)
- Const vs let issues
- Some formatting issues

## Recommended Approach

1. **Phase 1:** Complete the Appwrite migration first
2. **Phase 2:** Run `npm run lint -- --fix` to auto-fix simple issues
3. **Phase 3:** Manually fix accessibility issues (alt text)
4. **Phase 4:** Address React Hook dependencies
5. **Phase 5:** Gradually replace `any` types with proper interfaces (ongoing)

## ESLint Configuration

If you want to temporarily suppress certain rules during migration, you can update `.eslintrc.json`:

```json
{
  "extends": "next/core-web-vitals",
  "rules": {
    "@typescript-eslint/no-explicit-any": "warn", // Change from error to warning
    "@next/next/no-img-element": "warn",
    "react-hooks/exhaustive-deps": "warn"
  }
}
```

## Notes

- The migrated Appwrite API files (task 6) have **zero linting errors** ✅
- Most issues are in older Prisma/Supabase code that will be replaced during migration
- After migration is complete, we can do a comprehensive linting cleanup

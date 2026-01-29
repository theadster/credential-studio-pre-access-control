---
title: Major Package Updates Testing Plan
type: runbook
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 180
related_code: ["package.json", "src/lib/appwrite.ts", "src/components/"]
---

# Major Package Updates Testing Plan

## Overview

Testing plan for two major package updates that require verification before deployment:
1. **node-appwrite** (20.3.0 → 21.1.0) - Backend SDK
2. **framer-motion** (11.18.2 → 12.29.2) - Animation library

## Package 1: node-appwrite (20.3.0 → 21.1.0)

### Risk Assessment
- **Risk Level:** High
- **Type:** Major version update (backend SDK)
- **Impact:** Appwrite API integration, authentication, database operations, scripts

### Initial Findings
- ⚠️ **Build Issue Detected:** Scripts in `scripts/` directory import node-appwrite
- Requires careful migration of script imports
- May require updates to API calls throughout codebase

### Breaking Changes to Verify
- API method signatures
- Authentication flow
- Database query syntax
- Error handling patterns
- Type definitions
- Script compatibility

### Testing Checklist

#### Unit Tests
- [ ] Run existing Appwrite integration tests
- [ ] Verify authentication flows work
- [ ] Test database CRUD operations
- [ ] Check error handling

#### Integration Tests
- [ ] Test user authentication
- [ ] Test attendee data operations
- [ ] Test role management
- [ ] Test custom fields operations
- [ ] Test logging functionality

#### Manual Testing
- [ ] Login flow works
- [ ] Dashboard loads data correctly
- [ ] Create/update/delete operations work
- [ ] Real-time updates function
- [ ] Error messages display properly

### Files to Review
- `src/lib/appwrite.ts` - Appwrite client setup
- `src/lib/appwriteQueries.ts` - Query definitions
- `src/pages/api/**` - API routes using Appwrite
- `src/hooks/useRealtimeSubscription.ts` - Real-time operations

### Rollback Plan
```bash
npm install node-appwrite@^20.3.0
npm install
npm run test
```

---

## Package 2: framer-motion (11.18.2 → 12.29.2)

### Risk Assessment
- **Risk Level:** Medium
- **Type:** Major version update (animation library)
- **Impact:** UI animations, transitions, drag-and-drop

### Breaking Changes to Verify
- Animation API changes
- Gesture handling
- Drag-and-drop functionality
- Transition syntax
- Type definitions

### Testing Checklist

#### Visual Testing
- [ ] Modal animations work smoothly
- [ ] Page transitions are fluid
- [ ] Hover effects display correctly
- [ ] Loading animations work
- [ ] Drag-and-drop functionality works

#### Component Testing
- [ ] Dialog/Modal animations
- [ ] Sidebar animations
- [ ] Card hover effects
- [ ] Button animations
- [ ] Form field animations

#### Performance Testing
- [ ] No performance regressions
- [ ] Animations run at 60fps
- [ ] No memory leaks
- [ ] Smooth scrolling maintained

### Files to Review
- `src/components/**` - Components using framer-motion
- `src/pages/**` - Pages with animations
- `src/lib/sweetalert-config.ts` - Alert animations
- `src/hooks/usePageVisibility.ts` - Animation hooks

### Rollback Plan
```bash
npm install framer-motion@^11.18.2
npm install
npm run test
```

---

## Testing Execution Plan

### Phase 1: Pre-Update Verification
1. Document current behavior
2. Take screenshots of animated components
3. Note any existing animation issues

### Phase 2: Update Installation
```bash
npm install node-appwrite@^21.1.0 framer-motion@^12.29.2
npm install
```

### Phase 3: Build Verification
```bash
npm run build
```

### Phase 4: Type Checking
```bash
npx tsc --noEmit
```

### Phase 5: Test Suite
```bash
npm run test
```

### Phase 6: Manual Testing
1. Start dev server: `npm run dev`
2. Test authentication flows
3. Test data operations
4. Test animations and transitions
5. Test drag-and-drop
6. Test error handling

### Phase 7: Verification
- [ ] Build passes without errors
- [ ] TypeScript compilation passes
- [ ] All tests pass
- [ ] No new console errors
- [ ] Animations smooth and performant
- [ ] Data operations work correctly

---

## Success Criteria

✅ **Build:** Compiles without errors
✅ **Tests:** All existing tests pass
✅ **Types:** No TypeScript errors
✅ **Functionality:** All features work as before
✅ **Performance:** No performance regressions
✅ **Animations:** Smooth and responsive

---

## Rollback Triggers

Rollback if any of these occur:
- Build fails
- TypeScript compilation errors
- Test failures
- Runtime errors in console
- Animation performance issues
- Data operation failures
- Authentication issues

---

## Timeline

- **Preparation:** Review breaking changes
- **Installation:** Update packages
- **Verification:** Run tests and manual testing
- **Deployment:** Commit changes if all tests pass

---

## Notes

- Both updates are major versions with potential breaking changes
- Framer-motion is primarily UI-focused, lower risk
- node-appwrite is backend-focused, higher risk
- Recommend testing in order: node-appwrite first, then framer-motion
- Keep rollback commands ready during testing

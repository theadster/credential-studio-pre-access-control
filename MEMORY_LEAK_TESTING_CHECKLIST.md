# Memory Leak Fix - Testing Checklist

## Pre-Testing Setup

- [ ] Ensure you're running in development mode: `npm run dev`
- [ ] Open Chrome DevTools (F12)
- [ ] Open Console tab to see memory logs
- [ ] Note the starting memory usage

## Test 1: Basic Functionality (5 minutes)

### Objective
Verify that realtime updates still work correctly with the new conditional subscriptions.

### Steps
1. [ ] Open dashboard in two browser windows (Window A and Window B)
2. [ ] In Window A, go to Attendees tab
3. [ ] In Window B, create a new attendee
4. [ ] **Expected:** Window A shows the new attendee immediately
5. [ ] In Window A, switch to Users tab
6. [ ] In Window B, create a new user
7. [ ] **Expected:** Window A shows the new user immediately
8. [ ] Repeat for Roles, Settings, and Logs tabs
9. [ ] **Expected:** All realtime updates work correctly

### Success Criteria
- ✅ Realtime updates work on all tabs
- ✅ No errors in console
- ✅ Updates appear within 1-2 seconds

## Test 2: Tab Switching (10 minutes)

### Objective
Verify that subscriptions properly cleanup and reactivate when switching tabs.

### Steps
1. [ ] Open dashboard on Attendees tab
2. [ ] Check console for: `Realtime subscription active: ["databases...attendees..."]`
3. [ ] Switch to Users tab
4. [ ] **Expected Console Logs:**
   - `Realtime subscription cleaned up: ["databases...attendees..."]`
   - `Realtime subscription active: ["databases...users..."]`
5. [ ] Switch through all tabs (Attendees → Users → Roles → Settings → Logs)
6. [ ] **Expected:** Each tab switch shows cleanup of old subscription and activation of new one
7. [ ] Return to Attendees tab
8. [ ] Make a change in another window
9. [ ] **Expected:** Update appears in Attendees tab

### Success Criteria
- ✅ Console shows subscription cleanup on tab switch
- ✅ Console shows new subscription activation
- ✅ Only 1 subscription active at a time
- ✅ Realtime updates still work after switching

## Test 3: Page Visibility (10 minutes)

### Objective
Verify that subscriptions pause when page is hidden and resume when visible.

### Steps
1. [ ] Open dashboard on Attendees tab
2. [ ] Check console for active subscription
3. [ ] Switch to a different browser tab (hide the dashboard)
4. [ ] **Expected Console Log:** `Page visibility changed: hidden`
5. [ ] **Expected Console Log:** `Realtime subscription cleaned up: ["databases...attendees..."]`
6. [ ] Wait 10 seconds
7. [ ] Switch back to dashboard tab
8. [ ] **Expected Console Log:** `Page visibility changed: visible`
9. [ ] **Expected Console Log:** `Realtime subscription active: ["databases...attendees..."]`
10. [ ] Make a change in another window
11. [ ] **Expected:** Update appears immediately

### Success Criteria
- ✅ Subscriptions cleanup when page is hidden
- ✅ Subscriptions reactivate when page is visible
- ✅ Realtime updates work after returning to page
- ✅ No errors in console

## Test 4: Memory Monitoring (30 minutes)

### Objective
Verify that memory usage remains stable over time.

### Steps
1. [ ] Open dashboard on Attendees tab
2. [ ] Note starting memory from console log (e.g., "Used: 45MB")
3. [ ] Leave dashboard idle for 30 minutes
4. [ ] Check memory logs every 5 minutes
5. [ ] **Expected:** Memory usage stays relatively stable (±10MB)
6. [ ] Switch tabs a few times during the 30 minutes
7. [ ] **Expected:** Memory doesn't continuously grow

### Success Criteria
- ✅ Memory usage stays within ±20MB of starting value
- ✅ No continuous upward trend
- ✅ No memory warnings in console
- ✅ Memory logs show: `[Memory Monitor] Used: XXmb / XXXXmb (X%)`

### Memory Baseline Reference
- **Good:** 40-80MB for idle dashboard
- **Acceptable:** 80-150MB with some activity
- **Warning:** 150-300MB (investigate if growing)
- **Critical:** 300MB+ (memory leak likely)

## Test 5: Long-Running Stability (1+ hour)

### Objective
Verify that the dashboard can be left open for extended periods without issues.

### Steps
1. [ ] Open dashboard
2. [ ] Leave it open for 1+ hours (can be in background)
3. [ ] Periodically check memory logs (every 15-30 minutes)
4. [ ] After 1 hour, return to dashboard
5. [ ] **Expected:** Dashboard is still responsive
6. [ ] Switch between tabs
7. [ ] **Expected:** All tabs load quickly
8. [ ] Make changes in another window
9. [ ] **Expected:** Realtime updates still work

### Success Criteria
- ✅ No browser memory warnings
- ✅ Dashboard remains responsive
- ✅ Memory usage hasn't grown significantly
- ✅ All functionality still works
- ✅ No errors in console

## Test 6: Memory Profiling (Advanced)

### Objective
Use Chrome DevTools to verify no memory leaks at a deeper level.

### Steps
1. [ ] Open Chrome DevTools > Memory tab
2. [ ] Take heap snapshot (Snapshot 1)
3. [ ] Use dashboard normally for 10 minutes (switch tabs, make changes)
4. [ ] Take another heap snapshot (Snapshot 2)
5. [ ] Click "Comparison" view
6. [ ] Look for growing objects

### What to Look For
- ✅ **Good Signs:**
  - Minimal growth in "Detached DOM tree" count
  - Stable or declining memory usage
  - No large arrays growing continuously
  
- ❌ **Bad Signs:**
  - Growing "Detached DOM tree" count
  - Increasing timeout/interval counts
  - Large arrays that keep growing
  - Memory usage continuously increasing

### Success Criteria
- ✅ Heap size growth < 10MB after 10 minutes
- ✅ No detached DOM trees accumulating
- ✅ No timeout/interval leaks

## Test 7: Stress Test (Optional)

### Objective
Verify behavior under heavy load.

### Steps
1. [ ] Open dashboard
2. [ ] Rapidly switch between tabs (every 2-3 seconds) for 2 minutes
3. [ ] **Expected:** No errors, smooth transitions
4. [ ] Check memory usage
5. [ ] **Expected:** Memory stable or slightly increased
6. [ ] Stop switching and wait 1 minute
7. [ ] **Expected:** Memory stabilizes or decreases

### Success Criteria
- ✅ No errors during rapid switching
- ✅ Subscriptions properly cleanup/activate
- ✅ Memory doesn't grow excessively
- ✅ Dashboard remains responsive

## Test 8: Multi-Window Test

### Objective
Verify behavior with multiple dashboard windows open.

### Steps
1. [ ] Open dashboard in 3 browser windows
2. [ ] Each window on a different tab (Attendees, Users, Roles)
3. [ ] Leave all windows open for 15 minutes
4. [ ] Check memory in each window
5. [ ] **Expected:** Each window has only 1 active subscription
6. [ ] Make changes and verify realtime updates work in all windows

### Success Criteria
- ✅ Each window maintains its own subscription
- ✅ Memory usage reasonable in all windows
- ✅ Realtime updates work in all windows
- ✅ No cross-window interference

## Regression Testing

### Verify No Functionality Broken
- [ ] Attendee CRUD operations work
- [ ] User management works
- [ ] Role management works
- [ ] Event settings save correctly
- [ ] Logs display correctly
- [ ] Bulk operations work
- [ ] Import/export works
- [ ] Search and filtering work
- [ ] Pagination works

## Known Issues to Watch For

### If Realtime Updates Stop Working
1. Check console for subscription errors
2. Verify `enabled` prop conditions are correct
3. Check that callbacks are properly memoized
4. Verify WebSocket connection in Network tab

### If Memory Still Growing
1. Take heap snapshots to identify leaking objects
2. Check for event listeners not being removed
3. Verify all timeouts are being cleared
4. Check for closures holding large objects

### If Subscriptions Don't Cleanup
1. Check console for cleanup logs
2. Verify `enabled` prop changes correctly
3. Check that useEffect dependencies are correct
4. Verify unsubscribe function is being called

## Performance Metrics to Track

### Before Fix (Baseline)
- Memory after 1 hour idle: ~500-800MB (growing)
- Active subscriptions: 5 (always)
- Browser crashes: Yes (after 2-4 hours)

### After Fix (Target)
- Memory after 1 hour idle: <150MB (stable)
- Active subscriptions: 1 (conditional)
- Browser crashes: No

## Sign-Off

### Developer Testing
- [ ] All basic functionality tests passed
- [ ] Tab switching works correctly
- [ ] Page visibility works correctly
- [ ] Memory monitoring shows stable usage
- [ ] No errors in console
- [ ] Code reviewed and approved

**Tested by:** _______________  
**Date:** _______________  
**Notes:** _______________

### Extended Testing (1+ hour)
- [ ] Dashboard left open for 1+ hours
- [ ] No memory warnings
- [ ] Memory usage stable
- [ ] All functionality still works

**Tested by:** _______________  
**Date:** _______________  
**Notes:** _______________

### Production Ready
- [ ] All tests passed
- [ ] Documentation complete
- [ ] No known issues
- [ ] Ready for deployment

**Approved by:** _______________  
**Date:** _______________

## Rollback Plan

If critical issues are found:

1. **Immediate Rollback:**
   ```typescript
   // In dashboard.tsx, change all subscriptions to:
   enabled: true // Remove conditional logic
   ```

2. **Revert Debouncing:**
   ```typescript
   // Replace debounced callbacks with:
   setTimeout(() => refreshData(), 500)
   ```

3. **Remove New Hooks:**
   - Comment out `usePageVisibility` import and usage
   - Comment out `useDebouncedCallback` import and usage

4. **Deploy Rollback:**
   - Commit changes
   - Deploy to production
   - Monitor for stability

## Additional Resources

- **Analysis:** `docs/fixes/MEMORY_LEAK_ANALYSIS.md`
- **Implementation:** `docs/fixes/MEMORY_LEAK_FIXES_IMPLEMENTED.md`
- **Developer Guide:** `docs/guides/MEMORY_OPTIMIZATION_GUIDE.md`
- **Quick Summary:** `MEMORY_LEAK_FIX_SUMMARY.md`

## Questions or Issues?

If you encounter any issues during testing:
1. Check the console for error messages
2. Take heap snapshots for analysis
3. Review the implementation documentation
4. Contact the development team

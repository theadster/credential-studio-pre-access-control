# Manual Testing Guide: Attendees Pagination Fix

## Overview

This guide provides step-by-step instructions for manually testing the attendees pagination fix implementation. The fix ensures all attendees are fetched from the database regardless of count, with automatic batch fetching for large events.

## Prerequisites

- Development environment running (`npm run dev`)
- Access to the dashboard at `http://localhost:3000/dashboard`
- Current database with 66 attendees
- Admin or staff account with attendee read permissions

## Test Scenarios

### Test 1: Verify All Attendees Are Visible

**Objective:** Confirm that all 66 attendees in the database are accessible through the dashboard.

**Steps:**
1. Open browser and navigate to `http://localhost:3000/dashboard`
2. Log in with your admin credentials
3. Navigate to the "Attendees" tab
4. Check the pagination controls at the bottom of the attendee table

**Expected Results:**
- ✅ Pagination shows "Showing X-Y of 66" (or current total)
- ✅ Total count displays "66" (or current total)
- ✅ All pages are accessible through pagination controls
- ✅ No attendees are missing when navigating through pages

**How to Verify:**
- Note the total count displayed
- Navigate through all pages (should be 3 pages at 25 per page for 66 attendees)
- Count attendees on each page: Page 1 (25) + Page 2 (25) + Page 3 (16) = 66 total
- Verify last page shows remaining attendees (16 for 66 total)

**Pass Criteria:**
- [ ] Total count matches database count (66)
- [ ] All pages are accessible
- [ ] No duplicate attendees across pages
- [ ] No missing attendees

---

### Test 2: Verify Pagination Controls

**Objective:** Ensure pagination controls display correct information and function properly.

**Steps:**
1. On the Attendees tab, observe the pagination controls
2. Click "Next" to navigate to page 2
3. Click "Previous" to return to page 1
4. Click "Last" to jump to the final page
5. Click "First" to return to page 1
6. Try clicking page numbers directly (if available)

**Expected Results:**
- ✅ Current page indicator updates correctly
- ✅ "Previous" button disabled on first page
- ✅ "Next" button disabled on last page
- ✅ Page numbers are accurate
- ✅ Navigation is smooth without errors

**Pass Criteria:**
- [ ] All navigation buttons work correctly
- [ ] Current page indicator is accurate
- [ ] Disabled states are correct
- [ ] No console errors during navigation

---

### Test 3: Search Across All Attendees

**Objective:** Verify that search functionality operates on the complete dataset, not just the first page.

**Steps:**
1. On the Attendees tab, locate the search/filter controls
2. Enter a first name that you know exists in the database
3. Observe the filtered results
4. Clear the search
5. Try searching for a last name
6. Try searching for a barcode number

**Expected Results:**
- ✅ Search returns all matching attendees, regardless of which page they were on
- ✅ Pagination updates to reflect filtered count
- ✅ Results are accurate and complete
- ✅ Clearing search restores full dataset

**How to Verify:**
- Search for a common name (e.g., "John") - should return multiple results
- Verify results include attendees from different pages
- Check that pagination shows correct filtered count
- Clear search and verify all 66 attendees return

**Pass Criteria:**
- [ ] Search finds attendees from all pages
- [ ] Filtered count is accurate
- [ ] Clearing search restores full dataset
- [ ] No attendees are missed in search results

---

### Test 4: Filter Across All Attendees

**Objective:** Verify that filtering (photo filter, custom fields) works on the complete dataset.

**Steps:**
1. Apply the "With Photo" filter
2. Count the results and verify they're from across all pages
3. Clear the filter
4. Apply the "Without Photo" filter
5. Verify results
6. If custom field filters exist, test those as well

**Expected Results:**
- ✅ Filters operate on all 66 attendees, not just first 25
- ✅ Filtered counts are accurate
- ✅ Results include attendees from all original pages
- ✅ Multiple filters can be combined

**Pass Criteria:**
- [ ] Photo filters work correctly
- [ ] Custom field filters work correctly
- [ ] Filtered counts are accurate
- [ ] Filters can be combined

---

### Test 5: Page Load Performance

**Objective:** Ensure the page loads in acceptable time with current dataset.

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Refresh the dashboard page
4. Navigate to Attendees tab
5. Observe the API request to `/api/attendees`
6. Note the response time

**Expected Results:**
- ✅ Initial page load < 2 seconds
- ✅ API request to `/api/attendees` completes in < 500ms
- ✅ No console warnings about large events (66 < 5000)
- ✅ UI remains responsive during load

**How to Measure:**
- Network tab shows request timing
- Look for `/api/attendees` request
- Check "Time" column for duration
- Verify no errors or warnings in Console tab

**Pass Criteria:**
- [ ] Page loads in < 2 seconds
- [ ] API response time < 500ms
- [ ] No console warnings
- [ ] UI is responsive

---

### Test 6: Real-time Updates

**Objective:** Verify that real-time updates still function correctly with the pagination fix.

**Steps:**
1. Open the dashboard in two browser windows/tabs
2. In Window 1, navigate to Attendees tab, page 1
3. In Window 2, navigate to Attendees tab, page 1
4. In Window 1, create a new attendee
5. Observe Window 2 for real-time update
6. In Window 1, edit an existing attendee
7. Observe Window 2 for the update
8. In Window 1, delete an attendee
9. Observe Window 2 for the update

**Expected Results:**
- ✅ New attendee appears in Window 2 automatically
- ✅ Edited attendee updates in Window 2 automatically
- ✅ Deleted attendee disappears from Window 2 automatically
- ✅ Pagination counts update correctly
- ✅ No page refresh required

**Pass Criteria:**
- [ ] Create operations sync in real-time
- [ ] Update operations sync in real-time
- [ ] Delete operations sync in real-time
- [ ] Pagination counts update automatically
- [ ] No errors in console

---

### Test 7: Advanced Search Combinations

**Objective:** Test complex search scenarios across the full dataset.

**Steps:**
1. Apply multiple filters simultaneously:
   - First name filter
   - Last name filter
   - Photo filter
   - Custom field filter (if available)
2. Verify results are accurate
3. Remove filters one by one
4. Verify results update correctly

**Expected Results:**
- ✅ Multiple filters work together correctly
- ✅ Results are accurate for combined filters
- ✅ Removing filters updates results correctly
- ✅ No performance degradation with multiple filters

**Pass Criteria:**
- [ ] Multiple filters can be applied
- [ ] Combined filter results are accurate
- [ ] Removing filters works correctly
- [ ] Performance remains acceptable

---

### Test 8: Edge Cases

**Objective:** Test edge cases and boundary conditions.

**Steps:**
1. **Empty Search Results:**
   - Search for a name that doesn't exist
   - Verify "No attendees found" message appears
   - Verify pagination is hidden or shows 0 results

2. **Single Page Results:**
   - Apply filters to get < 25 results
   - Verify pagination is hidden or shows single page

3. **Exactly 25 Results:**
   - Apply filters to get exactly 25 results
   - Verify pagination shows 1 page

4. **Rapid Navigation:**
   - Quickly click through pages
   - Verify no race conditions or errors

**Expected Results:**
- ✅ Empty results handled gracefully
- ✅ Single page scenarios work correctly
- ✅ Boundary conditions (25, 50, 75) work correctly
- ✅ Rapid navigation doesn't cause errors

**Pass Criteria:**
- [ ] Empty results display correctly
- [ ] Single page scenarios work
- [ ] Boundary conditions handled
- [ ] No errors with rapid navigation

---

## Browser Console Checks

### What to Look For

Open browser DevTools Console (F12 → Console tab) and check for:

**Should NOT see:**
- ❌ "Large event detected: X attendees. Fetching in batches..." (66 < 5000)
- ❌ Any error messages
- ❌ Failed API requests
- ❌ React warnings or errors

**Should see (normal):**
- ✅ Successful API requests to `/api/attendees`
- ✅ Clean console with no errors
- ✅ Real-time subscription messages (if Appwrite realtime is enabled)

---

## Network Tab Verification

### API Request Analysis

1. Open DevTools → Network tab
2. Filter by "Fetch/XHR"
3. Refresh the Attendees tab
4. Find the `/api/attendees` request
5. Click on it to see details

**Check Response:**
```json
[
  {
    "id": "...",
    "firstName": "...",
    "lastName": "...",
    "barcodeNumber": "...",
    "photoUrl": "...",
    "customFieldValues": [...]
  },
  // ... should have 66 items total
]
```

**Verify:**
- [ ] Response is an array
- [ ] Array length matches total count (66)
- [ ] Each attendee has required fields
- [ ] Custom field values are included
- [ ] Response time is acceptable (< 500ms)

---

## Performance Benchmarks

### Current Dataset (66 Attendees)

| Metric | Expected | Acceptable | Needs Optimization |
|--------|----------|------------|-------------------|
| Initial Load | < 1s | < 2s | > 2s |
| API Response | < 300ms | < 500ms | > 500ms |
| Page Navigation | < 100ms | < 200ms | > 200ms |
| Search/Filter | < 200ms | < 500ms | > 500ms |
| Real-time Update | < 1s | < 2s | > 2s |

**Record Your Results:**
- Initial Load: _______ ms
- API Response: _______ ms
- Page Navigation: _______ ms
- Search/Filter: _______ ms
- Real-time Update: _______ ms

---

## Regression Testing

### Features That Should Still Work

Verify these existing features weren't broken by the pagination fix:

- [ ] Create new attendee
- [ ] Edit existing attendee
- [ ] Delete attendee
- [ ] Bulk operations (if available)
- [ ] Export attendees
- [ ] Import attendees
- [ ] Photo upload
- [ ] Credential generation
- [ ] Custom field visibility
- [ ] Role-based permissions

---

## Testing with Different Data Sizes

### Optional: Test with More Data

If you want to test the batch fetching logic with larger datasets:

**Option 1: Use Test Data Script**
```bash
# Create test data (if script exists)
node scripts/create-test-data.ts --count=5100
```

**Option 2: Manual Testing**
- Create additional test attendees to reach 5001+
- Verify console warning appears: "Large event detected: X attendees. Fetching in batches..."
- Verify all attendees are still accessible
- Verify performance is acceptable

**Expected Behavior for 5001+ Attendees:**
- Console warning appears
- Multiple API requests made (visible in Network tab)
- All attendees returned in single response
- Slightly longer load time (acceptable)

---

## Troubleshooting

### Issue: Not All Attendees Showing

**Possible Causes:**
- Database actually has fewer than 66 attendees
- Filters are applied
- Custom field visibility hiding some attendees

**How to Check:**
1. Clear all filters
2. Check database directly (Appwrite console)
3. Verify no custom field filters are active

### Issue: Slow Performance

**Possible Causes:**
- Network latency
- Database performance
- Too many custom fields
- Large photo URLs

**How to Check:**
1. Check Network tab for slow requests
2. Test on different network
3. Check Appwrite dashboard for database performance

### Issue: Real-time Updates Not Working

**Possible Causes:**
- Appwrite realtime not configured
- WebSocket connection failed
- Browser blocking WebSockets

**How to Check:**
1. Check Console for WebSocket errors
2. Verify Appwrite realtime is enabled
3. Check browser network settings

---

## Test Results Summary

### Overall Test Results

| Test | Status | Notes |
|------|--------|-------|
| 1. All Attendees Visible | ⬜ Pass / ⬜ Fail | |
| 2. Pagination Controls | ⬜ Pass / ⬜ Fail | |
| 3. Search Functionality | ⬜ Pass / ⬜ Fail | |
| 4. Filter Functionality | ⬜ Pass / ⬜ Fail | |
| 5. Page Load Performance | ⬜ Pass / ⬜ Fail | |
| 6. Real-time Updates | ⬜ Pass / ⬜ Fail | |
| 7. Advanced Search | ⬜ Pass / ⬜ Fail | |
| 8. Edge Cases | ⬜ Pass / ⬜ Fail | |

### Performance Metrics

- Initial Load Time: _______ ms
- API Response Time: _______ ms
- Total Attendees Displayed: _______
- Pages Available: _______
- Console Warnings: ⬜ None / ⬜ Present
- Console Errors: ⬜ None / ⬜ Present

### Issues Found

List any issues discovered during testing:

1. 
2. 
3. 

### Recommendations

Based on testing results:

- [ ] Ready for production
- [ ] Minor issues to address
- [ ] Major issues require fixes
- [ ] Performance optimization needed

---

## Sign-off

**Tester Name:** _______________________

**Date:** _______________________

**Environment:** _______________________

**Overall Result:** ⬜ PASS / ⬜ FAIL

**Comments:**

_______________________________________________________

_______________________________________________________

_______________________________________________________

---

## Next Steps

After completing manual testing:

1. ✅ Mark Task 5 as complete in `tasks.md`
2. ✅ Document any issues found
3. ✅ Create follow-up tasks if needed
4. ✅ Update spec documentation with findings
5. ✅ Consider performance optimizations if needed

---

## Reference

- **Spec Location:** `.kiro/specs/attendees-pagination-fix/`
- **Requirements:** `requirements.md`
- **Design:** `design.md`
- **Tasks:** `tasks.md`
- **API Implementation:** `src/pages/api/attendees/index.ts`
- **Frontend:** `src/pages/dashboard.tsx`

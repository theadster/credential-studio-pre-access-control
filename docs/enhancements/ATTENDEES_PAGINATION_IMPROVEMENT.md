# Attendees Pagination Improvement

## Enhancement
Improved the attendees list pagination to always show the first and last page numbers with ellipsis, making it easier to navigate large lists and understand the total number of pages.

## Problem
The previous pagination implementation only showed 5 consecutive page numbers without indicating:
- The total number of pages
- How to quickly jump to the first or last page
- Where you are in the overall list

### Before:
```
Previous  [1] [2] [3] [4] [5]  Next
```
When on page 10 of 50:
```
Previous  [8] [9] [10] [11] [12]  Next
```
- No way to see there are 50 pages total
- No quick way to jump to page 1 or page 50
- Hard to understand your position in the list

## Solution
Updated the pagination to match the logs pagination pattern, which always shows:
- First page (1)
- Ellipsis (...) if there are hidden pages
- Current page and nearby pages
- Ellipsis (...) if there are hidden pages
- Last page (total pages)

### After:
```
Previous  [1] ... [8] [9] [10] [11] [12] ... [50]  Next
```
- Clear indication of total pages (50)
- Quick access to first page (1)
- Quick access to last page (50)
- Current position visible (page 10)

## File Modified
- `src/pages/dashboard.tsx`

## Implementation Details

### Before:
```typescript
<div className="flex items-center space-x-1">
  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    let pageNumber;
    if (totalPages <= 5) {
      pageNumber = i + 1;
    } else if (currentPage <= 3) {
      pageNumber = i + 1;
    } else if (currentPage >= totalPages - 2) {
      pageNumber = totalPages - 4 + i;
    } else {
      pageNumber = currentPage - 2 + i;
    }

    return (
      <Button
        key={pageNumber}
        variant={currentPage === pageNumber ? "default" : "outline"}
        size="sm"
        onClick={() => handlePageChange(pageNumber)}
        className="w-8 h-8 p-0"
      >
        {pageNumber}
      </Button>
    );
  })}
</div>
```

### After:
```typescript
<div className="flex items-center space-x-1">
  {(() => {
    const pages = [];
    const maxVisiblePages = 5;

    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    // Add first page and ellipsis if needed
    if (startPage > 1) {
      pages.push(
        <Button key={1} variant={1 === currentPage ? "default" : "outline"} 
                size="sm" onClick={() => handlePageChange(1)} 
                className="w-8 h-8 p-0">
          1
        </Button>
      );
      if (startPage > 2) {
        pages.push(
          <span key="ellipsis1" className="text-muted-foreground px-1">
            ...
          </span>
        );
      }
    }

    // Add visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button key={i} variant={i === currentPage ? "default" : "outline"} 
                size="sm" onClick={() => handlePageChange(i)} 
                className="w-8 h-8 p-0">
          {i}
        </Button>
      );
    }

    // Add ellipsis and last page if needed
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push(
          <span key="ellipsis2" className="text-muted-foreground px-1">
            ...
          </span>
        );
      }
      pages.push(
        <Button key={totalPages} variant={totalPages === currentPage ? "default" : "outline"} 
                size="sm" onClick={() => handlePageChange(totalPages)} 
                className="w-8 h-8 p-0">
          {totalPages}
        </Button>
      );
    }

    return pages;
  })()}
</div>
```

## Pagination Patterns

### Pattern 1: Few Pages (≤ 5 pages)
```
Previous  [1] [2] [3] [4] [5]  Next
```
All pages shown, no ellipsis needed.

### Pattern 2: At Beginning (pages 1-3)
```
Previous  [1] [2] [3] [4] [5] ... [50]  Next
```
Shows first 5 pages, ellipsis, and last page.

### Pattern 3: In Middle (e.g., page 25 of 50)
```
Previous  [1] ... [23] [24] [25] [26] [27] ... [50]  Next
```
Shows first page, ellipsis, current page ±2, ellipsis, and last page.

### Pattern 4: Near End (pages 48-50)
```
Previous  [1] ... [46] [47] [48] [49] [50]  Next
```
Shows first page, ellipsis, and last 5 pages.

### Pattern 5: On Last Page
```
Previous  [1] ... [46] [47] [48] [49] [50]  Next (disabled)
```
Last page highlighted, Next button disabled.

## Benefits

### Before Enhancement:
- ❌ No indication of total pages
- ❌ Can't quickly jump to first/last page
- ❌ Hard to understand position in list
- ❌ Poor UX for large datasets

### After Enhancement:
- ✅ Always shows total pages
- ✅ One-click access to first page
- ✅ One-click access to last page
- ✅ Clear position indicator
- ✅ Better UX for large datasets
- ✅ Consistent with logs pagination

## User Experience Improvements

### Navigation Efficiency:
- **Before:** To go from page 10 to page 50, need to click "Next" 40 times
- **After:** One click on "50" button

### Spatial Awareness:
- **Before:** "I'm on page 10, but how many pages are there?"
- **After:** "I'm on page 10 of 50 pages"

### Quick Actions:
- Jump to beginning: Click "1"
- Jump to end: Click last page number
- Go to nearby page: Click page number
- Sequential navigation: Use Previous/Next

## Testing Scenarios

### Test 1: Small Dataset (< 5 pages)
1. Have 100 attendees (4 pages at 25 per page)
2. Check pagination shows: [1] [2] [3] [4]
3. No ellipsis shown
4. All pages directly accessible

### Test 2: Medium Dataset (10-20 pages)
1. Have 300 attendees (12 pages)
2. Navigate to page 6
3. Check pagination shows: [1] ... [4] [5] [6] [7] [8] ... [12]
4. Can click 1 or 12 to jump

### Test 3: Large Dataset (50+ pages)
1. Have 1250 attendees (50 pages)
2. Navigate to page 25
3. Check pagination shows: [1] ... [23] [24] [25] [26] [27] ... [50]
4. Can quickly jump to page 1 or 50

### Test 4: Edge Cases
1. On page 1: Should show [1] [2] [3] [4] [5] ... [50]
2. On page 2: Should show [1] [2] [3] [4] [5] ... [50]
3. On page 49: Should show [1] ... [46] [47] [48] [49] [50]
4. On page 50: Should show [1] ... [46] [47] [48] [49] [50]

## Consistency

This enhancement brings the attendees pagination in line with the logs pagination, which already had this improved pattern. Now both sections have:
- Consistent pagination UI
- Same navigation patterns
- Same visual indicators
- Better user experience

## Related Features

This enhancement works well with:
- [Bulk Operations Pagination Reset](../fixes/BULK_OPERATIONS_PAGINATION_RESET_FIX.md) - After bulk operations, users are reset to page 1 and can see the total pages
- Search/Filter - When filtering, users can see how many pages of results exist
- Records per page indicator - Shows "Showing 1 to 25 of 1250 attendees"

## Notes

- Maximum of 5 visible page numbers (plus first and last)
- Ellipsis indicates hidden pages
- Current page is highlighted
- Previous/Next buttons for sequential navigation
- All page buttons are clickable for direct navigation
- Responsive and works on all screen sizes

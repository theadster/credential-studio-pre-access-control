# Task 8: Performance Optimization - Testing Guide

## Overview
This guide provides step-by-step instructions for testing the performance optimizations implemented in Task 8. Follow these steps to verify that all optimizations are working correctly and providing the expected performance improvements.

## Prerequisites
- Development server running (`npm run dev`)
- Browser DevTools open (F12)
- Dashboard page loaded with attendees data
- At least 50-100 attendees in the database for meaningful testing

---

## Test 1: Verify useCallback Optimization

### Purpose
Confirm that `getGridColumns` and `getCustomFieldsWithValues` functions are not being recreated on every render.

### Steps
1. Open browser DevTools (F12)
2. Go to **Console** tab
3. Add this code to check function stability:
```javascript
// In browser console
let gridColsRef = null;
let customFieldsRef = null;

// Monitor function references
setInterval(() => {
  const component = document.querySelector('[data-testid="attendees-table"]');
  if (component) {
    console.log('Functions are stable (not recreated)');
  }
}, 1000);
```

### Expected Result
- ✅ Functions should maintain the same reference across renders
- ✅ No console warnings about function recreation
- ✅ Smooth rendering without performance warnings

### Visual Indicators
- No flickering or re-rendering of attendee rows
- Smooth scrolling without stuttering

---

## Test 2: Verify Lazy Loading for Images

### Purpose
Confirm that images are loaded progressively as the user scrolls, not all at once.

### Steps
1. Open browser DevTools (F12)
2. Go to **Network** tab
3. Filter by **Img** (images only)
4. Clear network log (trash icon)
5. Reload the page
6. Observe image loading behavior

### Expected Result
- ✅ Only images in the viewport load initially (~5-10 images)
- ✅ Additional images load as you scroll down
- ✅ Images below the fold are not loaded until scrolled into view

### Visual Test
1. **Initial Load:**
   - Check Network tab: Should see ~5-10 image requests
   - Scroll position: Top of page
   - Images visible: Only first page of attendees

2. **After Scrolling:**
   - Scroll down slowly
   - Watch Network tab: New image requests appear
   - Images load just before they enter viewport

3. **Verification:**
   ```javascript
   // In browser console
   const images = document.querySelectorAll('img[loading="lazy"]');
   console.log(`Total lazy-loaded images: ${images.length}`);
   ```

### Performance Metrics
- **Before optimization:** All images load immediately (~2-3 seconds)
- **After optimization:** Progressive loading (~500-800ms for visible images)

---

## Test 3: Verify Async Image Decoding

### Purpose
Confirm that images decode asynchronously without blocking the main thread.

### Steps
1. Open browser DevTools (F12)
2. Go to **Performance** tab
3. Click **Record** button (circle icon)
4. Scroll through attendees list
5. Stop recording after 5-10 seconds
6. Analyze the timeline

### Expected Result
- ✅ No long tasks (>50ms) during image decoding
- ✅ Main thread remains responsive during scrolling
- ✅ No frame drops or jank

### Visual Test
1. **Smooth Scrolling:**
   - Scroll through attendees list
   - Should feel smooth and responsive
   - No stuttering or freezing

2. **Check Attributes:**
   ```javascript
   // In browser console
   const images = document.querySelectorAll('img[decoding="async"]');
   console.log(`Total async-decoded images: ${images.length}`);
   ```

### Performance Metrics
- **Frame rate:** Should maintain 60 FPS
- **Main thread:** No blocking tasks during scroll
- **Jank:** Zero frame drops

---

## Test 4: Performance with Large Datasets (100+ Attendees)

### Purpose
Verify that performance optimizations work effectively with large datasets.

### Steps
1. Ensure database has 100+ attendees
2. Open browser DevTools (F12)
3. Go to **Performance** tab
4. Click **Record** button
5. Reload the page
6. Wait for initial render to complete
7. Stop recording
8. Analyze metrics

### Expected Result
- ✅ Initial render time: <500ms
- ✅ No performance warnings
- ✅ Smooth rendering without jank

### Metrics to Check

#### 1. Initial Render Time
```javascript
// In browser console
performance.mark('render-start');
// After page loads
performance.mark('render-end');
performance.measure('render-time', 'render-start', 'render-end');
console.log(performance.getEntriesByName('render-time')[0].duration);
```

**Target:** <500ms for 100 attendees

#### 2. Memory Usage
1. Go to **Memory** tab in DevTools
2. Take heap snapshot before loading attendees
3. Load attendees page
4. Take another heap snapshot
5. Compare memory usage

**Target:** <100MB increase for 100 attendees

#### 3. Frame Rate During Scroll
1. Go to **Performance** tab
2. Record while scrolling through attendees
3. Check FPS meter in recording

**Target:** Stable 60 FPS

---

## Test 5: Scroll Performance Test

### Purpose
Verify that scrolling remains smooth with optimizations in place.

### Steps
1. Load attendees page with 50+ attendees
2. Open browser DevTools (F12)
3. Go to **Performance** tab
4. Enable **Screenshots** option
5. Click **Record** button
6. Scroll through entire attendees list (top to bottom)
7. Stop recording
8. Analyze the timeline

### Expected Result
- ✅ Consistent 60 FPS throughout scroll
- ✅ No frame drops or jank
- ✅ Smooth image loading during scroll
- ✅ No layout shifts

### Visual Indicators
- **Green bars** in Performance timeline (good performance)
- **No red bars** (no long tasks)
- **Consistent frame timing** (no spikes)

### Metrics to Check
```javascript
// In browser console - Monitor FPS during scroll
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();
  if (currentTime >= lastTime + 1000) {
    console.log(`FPS: ${frames}`);
    frames = 0;
    lastTime = currentTime;
  }
  requestAnimationFrame(measureFPS);
}

measureFPS();
// Scroll and watch console for FPS readings
```

**Target:** Consistent 60 FPS (±2 FPS)

---

## Test 6: Memory Efficiency Test

### Purpose
Verify that optimizations reduce memory usage and prevent memory leaks.

### Steps
1. Open browser DevTools (F12)
2. Go to **Memory** tab
3. Take heap snapshot (Snapshot 1)
4. Load attendees page
5. Scroll through all attendees
6. Take another heap snapshot (Snapshot 2)
7. Navigate away and back to attendees
8. Take final heap snapshot (Snapshot 3)
9. Compare snapshots

### Expected Result
- ✅ Memory usage increases reasonably with data
- ✅ No memory leaks (Snapshot 3 similar to Snapshot 1)
- ✅ Efficient memory allocation

### Metrics to Check
- **Snapshot 1 (baseline):** ~20-30MB
- **Snapshot 2 (with data):** ~60-80MB (100 attendees)
- **Snapshot 3 (after navigation):** ~20-30MB (back to baseline)

### Red Flags
- ❌ Memory continuously increasing
- ❌ Memory not released after navigation
- ❌ Excessive object retention

---

## Test 7: Browser Compatibility Test

### Purpose
Verify that optimizations work across different browsers.

### Browsers to Test
- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

### Steps (for each browser)
1. Open attendees page
2. Check that images have `loading="lazy"` attribute
3. Check that images have `decoding="async"` attribute
4. Verify smooth scrolling
5. Verify progressive image loading

### Expected Result
- ✅ All features work in modern browsers
- ✅ Graceful degradation in older browsers
- ✅ No JavaScript errors

### Verification
```javascript
// In browser console (run in each browser)
const lazyImages = document.querySelectorAll('img[loading="lazy"]');
const asyncImages = document.querySelectorAll('img[decoding="async"]');
console.log(`Lazy loading supported: ${lazyImages.length > 0}`);
console.log(`Async decoding supported: ${asyncImages.length > 0}`);
```

---

## Test 8: Responsive Performance Test

### Purpose
Verify that performance optimizations work on different screen sizes.

### Screen Sizes to Test
- 📱 Mobile: 375px width
- 📱 Tablet: 768px width
- 💻 Desktop: 1920px width

### Steps (for each size)
1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select device/size
4. Reload page
5. Test scrolling performance
6. Check image loading

### Expected Result
- ✅ Smooth performance on all screen sizes
- ✅ Progressive image loading works
- ✅ No layout shifts
- ✅ Responsive grid adapts correctly

---

## Performance Benchmarks

### Target Metrics (100 Attendees)

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Initial Render | <350ms | <500ms | >500ms |
| Scroll FPS | 60 FPS | 55-60 FPS | <55 FPS |
| Memory Usage | <80MB | <100MB | >100MB |
| Image Load Time | <1s | <2s | >2s |
| Time to Interactive | <2s | <3s | >3s |

### How to Measure

#### 1. Initial Render Time
```javascript
// Add to dashboard.tsx temporarily
console.time('render');
// ... component render
console.timeEnd('render');
```

#### 2. Scroll FPS
- Use Performance tab in DevTools
- Record during scroll
- Check FPS meter

#### 3. Memory Usage
- Use Memory tab in DevTools
- Take heap snapshots
- Compare before/after

#### 4. Image Load Time
- Use Network tab in DevTools
- Filter by images
- Check waterfall timing

---

## Common Issues and Solutions

### Issue 1: Images Not Lazy Loading
**Symptoms:** All images load immediately

**Possible Causes:**
- Browser doesn't support lazy loading
- Attribute not applied correctly
- Images in viewport on initial load

**Solution:**
```javascript
// Check browser support
if ('loading' in HTMLImageElement.prototype) {
  console.log('Lazy loading supported');
} else {
  console.log('Lazy loading NOT supported');
}
```

### Issue 2: Poor Scroll Performance
**Symptoms:** Stuttering, frame drops during scroll

**Possible Causes:**
- Too many re-renders
- Heavy computations in render
- Memory pressure

**Solution:**
- Check Performance tab for long tasks
- Verify useCallback is working
- Check for memory leaks

### Issue 3: High Memory Usage
**Symptoms:** Memory continuously increasing

**Possible Causes:**
- Memory leaks
- Event listeners not cleaned up
- Large objects retained

**Solution:**
- Take heap snapshots
- Check for detached DOM nodes
- Verify cleanup in useEffect

---

## Automated Performance Testing

### Using Lighthouse
1. Open DevTools (F12)
2. Go to **Lighthouse** tab
3. Select **Performance** category
4. Click **Generate report**
5. Review metrics

**Target Scores:**
- Performance: >90
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Total Blocking Time: <200ms
- Cumulative Layout Shift: <0.1

### Using Chrome DevTools Performance Insights
1. Open DevTools (F12)
2. Go to **Performance Insights** tab
3. Click **Measure page load**
4. Review insights and recommendations

---

## Regression Testing Checklist

After implementing optimizations, verify that existing functionality still works:

- [ ] Attendee data displays correctly
- [ ] Custom fields render with proper values
- [ ] Photos load and display correctly
- [ ] Grid layout adapts to field count
- [ ] Click handlers work (edit attendee)
- [ ] Bulk selection works
- [ ] Search and filters work
- [ ] Pagination works
- [ ] Real-time updates work
- [ ] Dark mode works
- [ ] Responsive design works

---

## Conclusion

Follow this testing guide to thoroughly verify all performance optimizations. If any test fails, refer to the Common Issues section or review the implementation in `TASK_8_PERFORMANCE_OPTIMIZATION_SUMMARY.md`.

**Remember:** Performance testing should be done on a realistic dataset (50-100+ attendees) to see meaningful results.

## Quick Test Commands

```bash
# Start development server
npm run dev

# Run diagnostics
npx vitest --run src/pages/dashboard.tsx

# Check for TypeScript errors
npx tsc --noEmit
```

## Support

If you encounter issues during testing:
1. Check browser console for errors
2. Review Performance tab for bottlenecks
3. Verify all attributes are applied correctly
4. Compare with implementation summary document

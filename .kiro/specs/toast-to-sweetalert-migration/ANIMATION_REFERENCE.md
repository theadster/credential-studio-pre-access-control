# SweetAlert2 Animation Reference

## Animation Types Implemented

### 1. Toast Notifications (Top-Right Corner)

**Entrance Animation: `swal2-toast-show`**
```
Duration: 0.3s
Easing: cubic-bezier(0.16, 1, 0.3, 1)
Effect: Slides in from right with fade
```

**Exit Animation: `swal2-toast-hide`**
```
Duration: 0.2s
Easing: cubic-bezier(0.7, 0, 0.84, 0)
Effect: Slides out to right with fade
```

### 2. Modal Dialogs (Center Screen)

**Entrance Animation: `swal2-show`**
```
Duration: 0.3s
Easing: cubic-bezier(0.16, 1, 0.3, 1)
Effect: Elastic bounce (scale 0.7 → 1.05 → 0.95 → 1.0)
```

**Exit Animation: `swal2-hide`**
```
Duration: 0.15s
Easing: cubic-bezier(0.7, 0, 0.84, 0)
Effect: Scale down to 0.5 with fade
```

### 3. Icon Animations

**Animation: `swal2-icon-show`**
```
Duration: 0.5s
Easing: cubic-bezier(0.16, 1, 0.3, 1)
Effect: Rotate and scale (playful entrance)
  - Start: scale(0) rotate(-45deg)
  - Mid: scale(1.2) rotate(10deg)
  - End: scale(1) rotate(0deg)
```

### 4. Backdrop Animations

**Entrance: `swal2-backdrop-show`**
```
Duration: 0.2s
Effect: Fade in to 40% opacity
```

**Exit: `swal2-backdrop-hide`**
```
Duration: 0.15s
Effect: Fade out from 40% to 0%
```

### 5. Loading Spinner

**Animation: `swal2-rotate-loading`**
```
Duration: 1.5s
Iteration: Infinite
Effect: Smooth 360° rotation
```

### 6. Progress Bar

**Animation: `swal2-timer-progress`**
```
Duration: Variable (based on timer)
Effect: Linear width reduction (100% → 0%)
```

## GPU Acceleration Techniques

All animations use these performance optimizations:

1. **Transform Properties Only**
   - Uses `transform` instead of `left`, `top`, `width`, `height`
   - GPU-accelerated by default in modern browsers

2. **Opacity Transitions**
   - Uses `opacity` for fade effects
   - GPU-accelerated property

3. **Hardware Acceleration Hints**
   ```css
   will-change: transform, opacity;
   transform: translateZ(0);
   backface-visibility: hidden;
   perspective: 1000px;
   ```

4. **Composite Layers**
   - Forces creation of separate GPU layers
   - Prevents repaints of other page elements

## Accessibility Features

### Reduced Motion Support

For users who prefer reduced motion (system setting):

```css
@media (prefers-reduced-motion: reduce) {
  .swal2-popup,
  .swal2-icon,
  .swal2-loader {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

This ensures:
- Animations complete almost instantly
- No repeated animations
- Respects user preferences
- Maintains functionality without motion

## Color Themes

### Light Mode
- Success: `hsl(142 76% 36%)` - Forest green
- Info: `hsl(199 89% 48%)` - Ocean blue
- Warning: `hsl(38 92% 50%)` - Amber orange
- Destructive: `hsl(0 84.2% 60.2%)` - Coral red

### Dark Mode (Adjusted for visibility)
- Success: `hsl(142 71% 45%)` - Brighter green
- Info: `hsl(199 89% 58%)` - Brighter blue
- Warning: `hsl(38 92% 60%)` - Brighter orange
- Destructive: `hsl(0 62.8% 30.6%)` - Darker red

All colors meet WCAG AA contrast requirements.

## Animation Timing Philosophy

### Fast but Not Jarring
- Entrance: 0.3s - Long enough to be noticed, short enough to feel instant
- Exit: 0.15-0.2s - Quick dismissal doesn't waste user time
- Icons: 0.5s - Playful and attention-grabbing
- Loading: 1.5s/rotation - Smooth, not dizzying

### Easing Curves
- **Entrance**: `cubic-bezier(0.16, 1, 0.3, 1)` - "Ease out back" - Overshoots slightly for playful feel
- **Exit**: `cubic-bezier(0.7, 0, 0.84, 0)` - "Ease in" - Accelerates as it disappears

## Browser Support

All animations work in:
- ✅ Chrome/Edge (Chromium) 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

No vendor prefixes needed for modern browsers.

## Performance Metrics

Expected performance characteristics:
- **60 FPS** animations on modern devices
- **No layout reflows** during animations
- **Minimal CPU usage** (GPU handles transforms)
- **No jank** on scroll or interaction

## Testing Checklist

When testing animations:
- [ ] Smooth entrance on all notification types
- [ ] Smooth exit on all notification types
- [ ] No flickering or jank
- [ ] Works in light mode
- [ ] Works in dark mode
- [ ] Respects reduced motion preference
- [ ] Performs well on mobile devices
- [ ] No performance issues with multiple notifications

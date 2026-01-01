---
title: "Z-Index Layering System"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/styles/globals.css"]
---

# Z-Index Layering System

## Overview

The application uses a centralized z-index layering system defined with CSS custom properties to ensure consistent and maintainable stacking order across all UI components.

## Z-Index Scale

### Core Layers (defined in `src/styles/sweetalert-custom.css`)

```css
:root {
  --z-index-dialog: 50;                    /* shadcn Dialog components */
  --z-index-sweetalert-backdrop: 100;      /* SweetAlert backdrop */
  --z-index-sweetalert-container: 101;     /* SweetAlert container */
  --z-index-sweetalert-popup: 102;         /* SweetAlert popup content */
}
```

### Extended Layers (defined in `src/styles/globals.css`)

```css
:root {
  --z-index-cloudinary: 200;               /* Cloudinary upload widget */
}
```

## Layering Hierarchy

```
200 - Cloudinary Widget (highest)
     └─ Appears above all application UI
     └─ Used for image upload overlay

102 - SweetAlert Popup
     └─ Popup content and interactive elements

101 - SweetAlert Container
     └─ Container for SweetAlert modals

100 - SweetAlert Backdrop
     └─ Semi-transparent overlay for modals

50  - Dialog (shadcn)
     └─ Standard modal dialogs
     └─ Form dialogs, confirmation dialogs

1-49 - Application UI (default)
     └─ Regular page content
     └─ Navigation, cards, tables, etc.
```

## Usage

### In CSS Files

Use the CSS custom properties with `var()`:

```css
.my-component {
  z-index: var(--z-index-dialog);
}
```

### Adding New Layers

When adding a new layer:

1. **Choose an appropriate value** based on the hierarchy
2. **Define it in :root** in the appropriate CSS file
3. **Document it** in this guide
4. **Use descriptive names** (e.g., `--z-index-tooltip`, `--z-index-dropdown`)

### Best Practices

1. **Always use CSS custom properties** - Never hard-code z-index values above 50
2. **Use gaps in the scale** - Leave room for future additions (e.g., 100, 101, 102 instead of 100, 101, 102, 103...)
3. **Document new layers** - Update this guide when adding new z-index values
4. **Keep it simple** - Don't create unnecessary layers; reuse existing ones when possible

## Component-Specific Notes

### SweetAlert2

- Uses three layers: backdrop (100), container (101), popup (102)
- Ensures alerts appear above shadcn dialogs (50)
- Toast notifications use the same z-index but with transparent backdrop

### Cloudinary Widget

- Highest z-index (200) to ensure it appears above all UI
- Includes both `#cloudinary-overlay` and `.cloudinary-widget`
- Must be above SweetAlert to allow image uploads from within alerts

### shadcn Dialog

- Uses z-index 50 (Tailwind's `z-50` class)
- Standard for all modal dialogs in the application
- SweetAlert intentionally layers above this

## Migration Notes

### Previous Implementation

Before this system, hard-coded values were used:
- SweetAlert: 9999, 9998, 10000
- Cloudinary: 99999

### Benefits of New System

1. **Maintainable** - Single source of truth for z-index values
2. **Predictable** - Clear hierarchy with documented layers
3. **Flexible** - Easy to adjust relative positioning
4. **Scalable** - Room for future additions without conflicts
5. **Debuggable** - Named variables make it clear what each layer is for

## Troubleshooting

### Component Not Appearing

1. Check if the component has a z-index defined
2. Verify it's using the correct CSS custom property
3. Ensure the layer is appropriate for the component's purpose
4. Check if parent elements have `position: relative` or `z-index` that might interfere

### Stacking Order Issues

1. Review the hierarchy in this document
2. Ensure components use the correct layer
3. Check for conflicting z-index values in component styles
4. Verify `!important` is only used when necessary (e.g., overriding third-party libraries)

## Related Files

- `src/styles/sweetalert-custom.css` - SweetAlert z-index definitions
- `src/styles/globals.css` - Cloudinary z-index definitions
- `src/components/ui/dialog.tsx` - shadcn Dialog component (uses Tailwind's z-50)

## Future Considerations

When adding new UI layers, consider:

1. **Tooltips** - Typically 60-70 (above dialogs but below alerts)
2. **Dropdowns** - Typically 40-50 (at or slightly below dialog level)
3. **Modals** - Use existing dialog layer (50)
4. **Notifications** - Use existing SweetAlert layers (100-102)
5. **Loading Overlays** - Typically 150-199 (above alerts but below Cloudinary)

---

**Last Updated:** 2025-10-26
**Maintained By:** Development Team

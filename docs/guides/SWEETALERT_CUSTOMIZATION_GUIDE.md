---
title: "SweetAlert2 Customization Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/sweetAlertUtils.ts"]
---

# SweetAlert2 Customization Guide

## Overview

This guide covers how to customize the appearance and behavior of SweetAlert2 notifications in CredentialStudio. Learn how to adjust themes, durations, positions, and animations to match your needs.

## Table of Contents

- [Theme Customization](#theme-customization)
- [Duration Customization](#duration-customization)
- [Position Customization](#position-customization)
- [Animation Customization](#animation-customization)
- [Advanced Customization](#advanced-customization)

## Theme Customization

### Automatic Theme Detection

SweetAlert2 automatically detects and adapts to the application's light/dark theme. The theme is applied using Tailwind CSS custom properties.

### Color Variables

Notifications use the following CSS custom properties from your Tailwind configuration:

```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--card: 0 0% 100%;
--card-foreground: 222.2 84% 4.9%;
--primary: 222.2 47.4% 11.2%;
--primary-foreground: 210 40% 98%;
--secondary: 210 40% 96.1%;
--secondary-foreground: 222.2 47.4% 11.2%;
--muted: 210 40% 96.1%;
--muted-foreground: 215.4 16.3% 46.9%;
--destructive: 0 84.2% 60.2%;
--destructive-foreground: 210 40% 98%;
--border: 214.3 31.8% 91.4%;
--ring: 222.2 84% 4.9%;

/* Dark Mode */
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
/* ... etc */
```

### Customizing Theme Colors

To customize notification colors, update your `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        // Success color (green)
        success: {
          DEFAULT: 'hsl(142.1 76.2% 36.3%)',
          foreground: 'hsl(355.7 100% 97.3%)',
        },
        // Warning color (yellow/orange)
        warning: {
          DEFAULT: 'hsl(38 92% 50%)',
          foreground: 'hsl(48 96% 89%)',
        },
        // Info color (blue)
        info: {
          DEFAULT: 'hsl(221.2 83.2% 53.3%)',
          foreground: 'hsl(210 40% 98%)',
        },
        // Error/Destructive color (red)
        destructive: {
          DEFAULT: 'hsl(0 84.2% 60.2%)',
          foreground: 'hsl(210 40% 98%)',
        },
      },
    },
  },
};
```

### Custom CSS Overrides

For more control, you can override styles in `src/styles/sweetalert-custom.css`:

```css
/* Custom success icon color */
.swal2-icon.swal2-success [class^='swal2-success-line'] {
  background-color: hsl(var(--success));
}

.swal2-icon.swal2-success .swal2-success-ring {
  border-color: hsl(var(--success));
}

/* Custom error icon color */
.swal2-icon.swal2-error {
  border-color: hsl(var(--destructive));
  color: hsl(var(--destructive));
}

/* Custom popup background */
.swal2-popup {
  background-color: hsl(var(--card));
  color: hsl(var(--card-foreground));
  border: 1px solid hsl(var(--border));
}

/* Custom button styles */
.swal2-styled.swal2-confirm {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.swal2-styled.swal2-cancel {
  background-color: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
}
```

### Per-Notification Theme Override

You can override the theme for individual notifications:

```typescript
import Swal from 'sweetalert2';

// Custom themed notification
Swal.fire({
  title: 'Custom Theme',
  text: 'This notification has custom colors',
  icon: 'success',
  customClass: {
    popup: 'bg-blue-500 text-white',
    title: 'text-white font-bold',
    htmlContainer: 'text-blue-100',
    confirmButton: 'bg-white text-blue-500 hover:bg-blue-50',
  },
  buttonsStyling: false,
});
```

## Duration Customization

### Default Duration

By default, toast notifications auto-dismiss after 3 seconds (3000ms).

### Custom Duration Per Notification

```typescript
const { toast, success } = useSweetAlert();

// Short notification (1.5 seconds)
success('Quick message');

// Longer notification (5 seconds)
toast({
  title: 'Important Information',
  description: 'This message will stay visible longer.',
  variant: 'info',
  duration: 5000, // 5 seconds
});

// Very long notification (10 seconds)
toast({
  title: 'Critical Alert',
  description: 'Please read this carefully.',
  variant: 'warning',
  duration: 10000, // 10 seconds
});
```

### Persistent Notifications

To create a notification that doesn't auto-dismiss:

```typescript
import Swal from 'sweetalert2';

Swal.fire({
  title: 'Persistent Notification',
  text: 'This will stay until you close it',
  icon: 'info',
  toast: true,
  position: 'top-end',
  showConfirmButton: true,
  confirmButtonText: 'Close',
  timer: undefined, // No auto-dismiss
  timerProgressBar: false,
});
```

### Global Duration Configuration

To change the default duration globally, modify `src/lib/sweetalert-config.ts`:

```typescript
export const defaultSweetAlertConfig = {
  // ... other config
  timer: 5000, // Change default to 5 seconds
  timerProgressBar: true,
};
```

### Duration Recommendations

- **Success messages:** 3 seconds (default)
- **Error messages:** 5 seconds (users need time to read)
- **Warning messages:** 5 seconds (important information)
- **Info messages:** 3-4 seconds
- **With action buttons:** 5-7 seconds (users need time to click)

## Position Customization

### Available Positions

SweetAlert2 supports the following positions:

- `top` - Top center
- `top-start` - Top left
- `top-end` - Top right (default)
- `center` - Center of screen
- `center-start` - Center left
- `center-end` - Center right
- `bottom` - Bottom center
- `bottom-start` - Bottom left
- `bottom-end` - Bottom right

### Changing Position Per Notification

```typescript
import Swal from 'sweetalert2';

// Bottom right notification
Swal.fire({
  title: 'Bottom Right',
  icon: 'success',
  toast: true,
  position: 'bottom-end',
  timer: 3000,
  showConfirmButton: false,
});

// Center notification (modal style)
Swal.fire({
  title: 'Center Modal',
  text: 'This appears in the center',
  icon: 'info',
  position: 'center',
  toast: false, // Not a toast, full modal
});

// Top center notification
Swal.fire({
  title: 'Top Center',
  icon: 'warning',
  toast: true,
  position: 'top',
  timer: 3000,
});
```

### Global Position Configuration

To change the default position, modify `src/lib/sweetalert-config.ts`:

```typescript
export const defaultSweetAlertConfig = {
  // ... other config
  position: 'bottom-end', // Change default position
};
```

### Position Best Practices

- **Toast notifications:** Use `top-end` or `bottom-end` (non-intrusive)
- **Confirmation dialogs:** Use `center` (requires attention)
- **Loading states:** Use `center` (blocks interaction)
- **Quick feedback:** Use `top-end` (visible but not blocking)

## Animation Customization

### Default Animations

The default configuration uses Tailwind CSS animation classes:

```typescript
showClass: {
  popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
},
hideClass: {
  popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
},
```

### Custom Animation Classes

You can use any Tailwind animation classes:

```typescript
import Swal from 'sweetalert2';

// Slide in from right
Swal.fire({
  title: 'Slide Animation',
  icon: 'success',
  toast: true,
  position: 'top-end',
  showClass: {
    popup: 'animate-in slide-in-from-right-full duration-300',
  },
  hideClass: {
    popup: 'animate-out slide-out-to-right-full duration-200',
  },
});

// Bounce animation
Swal.fire({
  title: 'Bounce Animation',
  icon: 'success',
  toast: true,
  showClass: {
    popup: 'animate-in bounce-in duration-500',
  },
  hideClass: {
    popup: 'animate-out fade-out duration-200',
  },
});

// Fade only (subtle)
Swal.fire({
  title: 'Fade Animation',
  icon: 'info',
  toast: true,
  showClass: {
    popup: 'animate-in fade-in duration-200',
  },
  hideClass: {
    popup: 'animate-out fade-out duration-150',
  },
});
```

### Custom CSS Animations

For more control, define custom animations in `src/styles/sweetalert-custom.css`:

```css
/* Custom slide-up animation */
@keyframes slideUp {
  from {
    transform: translateY(100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes slideDown {
  from {
    transform: translateY(0);
    opacity: 1;
  }
  to {
    transform: translateY(100%);
    opacity: 0;
  }
}

.swal2-show.slide-up {
  animation: slideUp 0.3s ease-out;
}

.swal2-hide.slide-down {
  animation: slideDown 0.2s ease-in;
}
```

Then use the custom classes:

```typescript
Swal.fire({
  title: 'Custom Animation',
  icon: 'success',
  toast: true,
  showClass: {
    popup: 'slide-up',
  },
  hideClass: {
    popup: 'slide-down',
  },
});
```

### Animation Performance

For best performance:

- Use CSS transforms (translateX, translateY, scale) instead of position properties
- Keep animations under 300ms for snappy feel
- Use `will-change` for complex animations
- Test on lower-end devices

```css
/* Optimized animation */
.swal2-popup {
  will-change: transform, opacity;
}

@keyframes optimizedSlide {
  from {
    transform: translate3d(100%, 0, 0);
    opacity: 0;
  }
  to {
    transform: translate3d(0, 0, 0);
    opacity: 1;
  }
}
```

### Disabling Animations

To disable animations entirely:

```typescript
Swal.fire({
  title: 'No Animation',
  icon: 'success',
  toast: true,
  showClass: {
    popup: '', // No animation
  },
  hideClass: {
    popup: '', // No animation
  },
});
```

## Advanced Customization

### Custom Icons

Replace default icons with custom ones:

```typescript
import Swal from 'sweetalert2';

Swal.fire({
  title: 'Custom Icon',
  iconHtml: '<img src="/custom-icon.svg" />',
  customClass: {
    icon: 'border-0',
  },
});
```

### Custom HTML Content

Use custom HTML for complex notifications:

```typescript
Swal.fire({
  title: 'Custom Content',
  html: `
    <div class="space-y-4">
      <p class="text-muted-foreground">This is custom HTML content</p>
      <div class="flex gap-2">
        <button class="px-4 py-2 bg-primary text-primary-foreground rounded">
          Action 1
        </button>
        <button class="px-4 py-2 bg-secondary text-secondary-foreground rounded">
          Action 2
        </button>
      </div>
    </div>
  `,
  showConfirmButton: false,
  showCancelButton: false,
});
```

### Custom Backdrop

Customize the backdrop (overlay) behind modals:

```typescript
Swal.fire({
  title: 'Custom Backdrop',
  text: 'Notice the custom backdrop',
  backdrop: `
    rgba(0,0,123,0.4)
    url("/images/nyan-cat.gif")
    left top
    no-repeat
  `,
});
```

### Width and Padding

Adjust notification size:

```typescript
// Wider notification
Swal.fire({
  title: 'Wide Notification',
  text: 'This notification is wider than default',
  width: '600px',
  padding: '2rem',
});

// Compact notification
Swal.fire({
  title: 'Compact',
  toast: true,
  width: '250px',
  padding: '0.75rem',
});
```

### Progress Bar Customization

Customize the timer progress bar:

```css
/* Custom progress bar color */
.swal2-timer-progress-bar {
  background: linear-gradient(90deg, #00ff00, #0000ff);
  height: 4px;
}

/* Animated progress bar */
.swal2-timer-progress-bar {
  background: hsl(var(--primary));
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Responsive Design

Make notifications responsive:

```css
/* Mobile adjustments */
@media (max-width: 640px) {
  .swal2-popup.swal2-toast {
    width: calc(100vw - 2rem);
    max-width: 100%;
    margin: 1rem;
  }
  
  .swal2-container.swal2-top-end {
    top: 0.5rem;
    right: 0.5rem;
  }
}

/* Tablet adjustments */
@media (min-width: 641px) and (max-width: 1024px) {
  .swal2-popup.swal2-toast {
    max-width: 400px;
  }
}
```

### Dark Mode Specific Styles

Add dark mode specific customizations:

```css
/* Dark mode only styles */
.dark .swal2-popup {
  box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.3), 
              0 8px 10px -6px rgb(0 0 0 / 0.3);
}

.dark .swal2-timer-progress-bar {
  background: hsl(var(--primary));
  opacity: 0.8;
}

/* Light mode only styles */
.light .swal2-popup {
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 
              0 4px 6px -4px rgb(0 0 0 / 0.1);
}
```

## Configuration File Reference

### Main Configuration (`src/lib/sweetalert-config.ts`)

```typescript
export const defaultSweetAlertConfig = {
  // Styling
  customClass: getSweetAlertTheme(false),
  buttonsStyling: false,
  
  // Animations
  showClass: {
    popup: 'animate-in fade-in-0 zoom-in-95 duration-200',
  },
  hideClass: {
    popup: 'animate-out fade-out-0 zoom-out-95 duration-150',
  },
  
  // Position and behavior
  position: 'top-end',
  timer: 3000,
  timerProgressBar: true,
  showConfirmButton: false,
  toast: true,
};
```

### Custom CSS (`src/styles/sweetalert-custom.css`)

This file contains all custom styles for SweetAlert2. Modify it to change:

- Toast sizing and positioning
- Icon colors and styles
- Title and content typography
- Button styles and hover states
- Progress bar appearance
- Animation definitions

## Examples

### Branded Notification

```typescript
Swal.fire({
  title: 'CredentialStudio',
  text: 'Welcome to the event management platform',
  iconHtml: '<img src="/logo.png" class="w-12 h-12" />',
  customClass: {
    popup: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white',
    title: 'text-white font-bold text-2xl',
    htmlContainer: 'text-blue-100',
    icon: 'border-0',
  },
  buttonsStyling: false,
  confirmButtonText: 'Get Started',
  customClass: {
    confirmButton: 'bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50',
  },
});
```

### Minimal Notification

```typescript
Swal.fire({
  text: 'Saved',
  toast: true,
  position: 'bottom-end',
  showConfirmButton: false,
  timer: 2000,
  timerProgressBar: false,
  icon: undefined,
  customClass: {
    popup: 'bg-black text-white px-4 py-2 rounded-full',
  },
});
```

### Rich Content Notification

```typescript
Swal.fire({
  title: 'Export Complete',
  html: `
    <div class="space-y-4">
      <p class="text-muted-foreground">
        Your attendee list has been exported successfully.
      </p>
      <div class="bg-muted p-4 rounded-lg">
        <div class="flex justify-between text-sm">
          <span>Total Records:</span>
          <span class="font-semibold">1,234</span>
        </div>
        <div class="flex justify-between text-sm mt-2">
          <span>File Size:</span>
          <span class="font-semibold">2.4 MB</span>
        </div>
      </div>
    </div>
  `,
  icon: 'success',
  confirmButtonText: 'Download',
  showCancelButton: true,
  cancelButtonText: 'Close',
});
```

## Next Steps

- See [Usage Guide](./SWEETALERT_USAGE_GUIDE.md) for basic usage
- See [Migration Guide](./SWEETALERT_MIGRATION_GUIDE.md) for migrating from old toast system
- See [Best Practices Guide](./SWEETALERT_BEST_PRACTICES_GUIDE.md) for recommendations

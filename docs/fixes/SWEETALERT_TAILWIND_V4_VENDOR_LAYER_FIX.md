---
title: SweetAlert2 + Tailwind v4 Vendor Layer Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - src/styles/globals.css
  - src/styles/sweetalert-custom.css
  - src/lib/sweetalert-config.ts
  - src/hooks/useSweetAlert.ts
---

# SweetAlert2 + Tailwind v4 Vendor Layer Fix

## Problem

SweetAlert2 modal dialogs (`alert()`, `confirm()`) had two symptoms:
1. Success icon rendered broken — masking elements visible as gray shapes, checkmark mispositioned
2. Buttons and links inside the popup could not be clicked

## Root Causes

### 1. Preflight `box-sizing: border-box` broke icon geometry

Tailwind v4 preflight applies to all elements:

```css
*, ::after, ::before { box-sizing: border-box; border: 0 solid; margin: 0; padding: 0; }
```

SweetAlert2's icon system relies on `box-sizing: content-box` for its ring and circular-line sizing calculations. With `border-box` applied, the geometry was miscalculated and masking elements appeared as visible gray shapes.

### 2. Global border-color on `*` colored icon masking elements

The `@layer base { * { @apply border-border; } }` rule applied `border-color: var(--border)` (light gray) to every element — including SweetAlert2's masking elements (`swal2-success-circular-line-*`, `swal2-success-fix`). These must be borderless and match the popup background to create the optical illusion of the checkmark.

### 3. Tailwind utility classes on popup broke `adjustSuccessIconBackgroundColor()`

SweetAlert2's JS reads `getComputedStyle(popup).backgroundColor` and applies it to masking elements. When Tailwind v4 utility classes (`bg-card`) set the background via CSS custom properties, `getComputedStyle` could return `oklch(...)` format which SweetAlert2's color parser couldn't handle.

### 4. `alert()` and `confirm()` inherited `toast: true` and `position: 'top-end'`

`defaultSweetAlertConfig` sets `toast: true`, `position: 'top-end'`, and `showConfirmButton: false` for the toast use case. The `alert()` and `confirm()` methods called `Swal.fire()` without explicitly overriding these. SweetAlert2 rendered them as top-end positioned toasts instead of centered modals.

This caused the `pointer-events` CSS to break: the rule re-enabling clicks only matched `.swal2-center`, but the container had `.swal2-top-end` instead — so it stayed at `pointer-events: none` and nothing inside could be clicked.

### 5. Tailwind animation classes caused DOM state leakage between modals

Overriding `showClass`/`hideClass` with Tailwind animation classes (`animate-in`, `animate-out`, `fade-out-0`, `zoom-out-95`) caused two problems:

1. SweetAlert2's native `swal2-show` class was replaced — icon animations are gated behind CSS container queries that depend on this class being present.
2. The `animate-out` class from `tw-animate-css` sets `animation-fill-mode: forwards`, which locks the popup element at `opacity: 0` after the close animation completes. SweetAlert2 **reuses the same DOM container** for every `Swal.fire()` call. When a subsequent modal fires (e.g. the "PDF Ready" success alert after `closeProgressModal()`), it inherits the stuck DOM state — invisible popup, broken icon, unclickable buttons.

This was the root cause of the persistent "broken success icon + unclickable buttons" bug in the PDF generation flow. The `showProgressModal` in `sweetalert-progress.ts` had `hideClass: { popup: 'animate-out fade-out-0 zoom-out-95 duration-150' }` which locked the container at `opacity: 0`. The `alert({ icon: 'success' })` fired 300ms later into that corrupted container.

### 6. `position: static` on `.swal2-icon` broke masking element layout

A CSS rule set `position: static !important` (along with `left: auto; right: auto`) on `.swal2-popup:not(.swal2-toast) .swal2-icon`. This was the direct visual cause of the "giant ovals/circles spilling outside the popup + diagonal lines in corners" symptom.

SweetAlert2's success icon children — `swal2-success-circular-line-left`, `swal2-success-circular-line-right`, `swal2-success-fix`, and the checkmark lines — all use `position: absolute` with negative offsets calculated relative to the icon element as their positioning context. When the icon itself is `position: static`, it is no longer a positioning context. The absolutely-positioned children then escape to the nearest positioned ancestor (the popup), rendering at the wrong scale and position — appearing as giant ovals/lines at the popup edges. These misplaced elements also sat on top of the popup content, blocking all pointer events (clicks, text selection).

### 7. Custom icon animation and GPU properties

A custom `swal2-icon-show` animation with `rotate(-45deg)` interfered with the checkmark's precise rotation angles. `perspective`, `backface-visibility`, and `transform: translateZ(0)` on `.swal2-popup` created a 3D rendering context affecting masking element layout.

## Fix

### Part 1: Vendor layer for SweetAlert2 CSS (`globals.css`)

```css
@layer vendor, theme, base, components, utilities;
@import "sweetalert2/dist/sweetalert2.css" layer(vendor);
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/preflight.css" layer(base);
@import "tailwindcss/utilities.css" layer(utilities);
```

Per tailwindlabs/tailwindcss discussion #15870, this is the endorsed pattern for third-party CSS with Tailwind v4.

### Part 2: Scope border-color away from SweetAlert2 (`globals.css`)

```css
@layer base {
  *:not(.swal2-container, .swal2-container *) {
    @apply border-border;
  }
}
```

### Part 3: Restore `content-box` and fix masking elements (`sweetalert-custom.css`)

```css
/* Restore content-box sizing for icon internals */
.swal2-icon,
.swal2-icon *,
.swal2-icon *::before,
.swal2-icon *::after {
  box-sizing: content-box !important;
}

/* Fix masking elements — must match popup background and have no border */
.swal2-success-circular-line-left,
.swal2-success-circular-line-right,
.swal2-success-fix {
  background-color: var(--swal2-background) !important;
  border: none !important;
}
```

### Part 4: Use SweetAlert2's own CSS variables for theming (`sweetalert-custom.css`)

```css
:root {
  --swal2-background: hsl(0 0% 100%);
  --swal2-color: hsl(224 71.4% 4.1%);
}
.dark {
  --swal2-background: hsl(224 71.4% 4.1%);
  --swal2-color: hsl(210 20% 98%);
}
```

SweetAlert2's own CSS uses `background: var(--swal2-background)` on the popup and masking elements, so setting this variable ensures consistent color without going through `getComputedStyle`.

### Part 5: Explicit modal mode in `alert()` and `confirm()` (`useSweetAlert.ts`)

Both methods now explicitly override all toast-related defaults:

```typescript
await Swal.fire({
  toast: false,        // do NOT inherit toast:true from defaultSweetAlertConfig
  position: 'center', // do NOT inherit position:'top-end'
  showConfirmButton: true,
  timer: undefined,
  timerProgressBar: false,
  // ... rest of options
});
```

### Part 6: Simplified `pointer-events` logic (`sweetalert-custom.css`)

Flipped the default — container is `pointer-events: auto` by default, only toast containers get `pointer-events: none`:

```css
/* All containers clickable by default */
.swal2-container {
  pointer-events: auto !important;
}

/* Only toasts should not block page clicks */
.swal2-container.swal2-toast {
  pointer-events: none !important;
}
.swal2-container.swal2-toast .swal2-popup {
  pointer-events: auto !important;
}
```

### Part 7: Never set `position: static` on `.swal2-icon` (`sweetalert-custom.css`)

The icon element must remain `position: relative` (its default) so that its absolutely-positioned children use it as their positioning context. The fix removes any `position: static`, `left: auto`, or `right: auto` overrides from `.swal2-popup:not(.swal2-toast) .swal2-icon`. A comment was added to the CSS to document why this must never be re-introduced:

```css
.swal2-popup:not(.swal2-toast) .swal2-icon {
  margin: 0 auto 1rem auto !important;
  /* Do NOT set position:static — the icon's child masking elements use
   * position:absolute with negative offsets relative to the icon itself.
   * Setting static here causes them to escape to the nearest positioned
   * ancestor (the popup), rendering at wrong scale and blocking clicks. */
  transform: none !important;
}
```

### Part 8: Use SweetAlert2's native animations (`sweetalert-progress.ts`, `useSweetAlert.ts`)

Removed all `showClass`/`hideClass` overrides from both `showProgressModal` and any other `Swal.fire()` calls. Removed custom `swal2-icon-show` animation with `rotate(-45deg)`. Removed `perspective`, `backface-visibility`, `transform: translateZ(0)` from `.swal2-popup`.

SweetAlert2 reuses its DOM container between calls. Custom `hideClass` animations that use `animation-fill-mode: forwards` leave the container locked at `opacity: 0` — the next `Swal.fire()` inherits this state and renders broken. Native animations clean up properly.

## Key Rules (DO NOT VIOLATE)

1. Never apply `bg-*` or `text-*` Tailwind classes to `.swal2-popup` — use `--swal2-background` and `--swal2-color` CSS variables instead
2. Never override `showClass`/`hideClass` with Tailwind animation classes — use SweetAlert2's native animations
3. Never add `transform` properties to `.swal2-icon` or `.swal2-popup` that could affect icon masking
4. Never set `position: static` on `.swal2-icon` — its children are `position: absolute` relative to it; removing the positioning context causes them to escape to the popup and block all clicks
5. Keep SweetAlert2 CSS in the `vendor` layer, before Tailwind's layers
6. Keep the `*:not(.swal2-container, .swal2-container *)` exclusion on the global border-color rule
7. Always explicitly set `toast: false`, `position: 'center'`, `showConfirmButton: true`, `timer: undefined` in `alert()` and `confirm()` — never rely on defaults
8. Never set `pointer-events: none` on `.swal2-container` globally — scope it to `.swal2-container.swal2-toast` only

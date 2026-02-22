---
title: SweetAlert Progress Modal Loader Spinner Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code:
  - src/lib/sweetalert-progress.ts
---

# SweetAlert Progress Modal Loader Spinner Fix

## Problem

The progress modal displayed an initial loader spinner (`.swal2-loader`) when opened, but the update function never hid it. When progress updates began, the progress bar and percentage appeared alongside the spinner, creating visual clutter and confusion about the modal's state.

## Root Cause

The `showProgressModal()` function rendered the loader in the initial HTML:

```html
<div class="flex justify-center mb-4">
  <div class="swal2-loader" style="display: block; margin: 0;"></div>
</div>
```

The returned update function handled all other DOM updates (progress bar, percentage, count, current item) but never toggled the loader's visibility. It remained visible throughout the entire progress sequence.

## Fix

Added code to hide the loader spinner on the first update call:

```typescript
// Hide the initial loader spinner on first update
const loader = popup?.querySelector<HTMLElement>('.swal2-loader');
if (loader) {
  loader.style.display = 'none';
}
```

This is placed at the start of the update function, ensuring the loader is hidden as soon as progress tracking begins. The transition from "initializing" (spinner visible) to "processing" (progress bar visible) is now clean and unambiguous.

## Impact

- Cleaner visual feedback during PDF generation and other long-running operations
- Eliminates visual confusion from overlapping spinner and progress bar
- No breaking changes — the loader still appears briefly during initialization


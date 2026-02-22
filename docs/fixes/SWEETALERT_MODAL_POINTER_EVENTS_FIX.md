---
title: SweetAlert2 Modal Pointer Events Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - src/hooks/useSweetAlert.ts
  - src/pages/dashboard.tsx
  - src/styles/sweetalert-custom.css
---

# SweetAlert2 Modal Pointer Events Fix

## Problem

After the async PDF generation feature was implemented, the "PDF Ready" completion dialog rendered visually but all interactive elements (the "Done" button and the "click here to open it" link) were completely unclickable. Users had to refresh the page to dismiss the modal.

## Root Causes

### 1. Missing `backdrop: true` in `alert()`

The `alert()` method in `useSweetAlert.ts` did not pass `backdrop: true`. Without this, SweetAlert2 never adds the `.swal2-center` class to the container element.

The custom CSS in `sweetalert-custom.css` sets `pointer-events: none !important` on all `.swal2-container` elements by default (to prevent toast backdrops from blocking page clicks). It only re-enables pointer events on `.swal2-container.swal2-center:not(.swal2-toast)`.

Since `.swal2-center` was never applied, the container remained `pointer-events: none`, blocking all clicks on the popup content beneath it.

### 2. Timing conflict between `closeProgressModal()` and `alert()`

`closeProgressModal()` (which calls `Swal.close()`) was called immediately before `alert()` with no delay. SweetAlert2 needs time to fully tear down the previous modal before a new one can initialize cleanly.

## Fix

**`src/hooks/useSweetAlert.ts`** — Added `backdrop: true` and backdrop show/hide classes to the `alert()` method.

**`src/pages/dashboard.tsx`** — Wrapped the PDF Ready `alert()` call in a 300ms `setTimeout` after `closeProgressModal()`.

## Key Insight

Any `Swal.fire()` call that renders a modal dialog **must** pass `backdrop: true` to ensure `.swal2-center` is applied — otherwise the container's `pointer-events: none` default blocks all interaction.

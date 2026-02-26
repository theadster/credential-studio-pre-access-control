---
title: Safari iPad Private Browsing - Unsaved Changes Dialog Loop Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-25
review_interval_days: 90
related_code:
  - src/components/AttendeeForm/index.tsx
---

# Safari iPad Private Browsing — Unsaved Changes Dialog Loop Fix

## Bug Description

On Safari on iPad in private browsing mode only: after uploading a photo and clicking outside the attendee form dialog, the "Unsaved Changes" confirmation dialog would appear. Clicking "Keep Editing" (cancel) caused the dialog to reappear immediately and loop continuously. Clicking "Close Without Saving" worked correctly.

Did not reproduce on desktop browsers or non-private Safari on iPad.

## Root Cause

Three factors combined to cause the loop:

1. The Radix Dialog uses `modal={false}` (required so the Cloudinary upload widget can receive pointer events through the backdrop). This means Radix does not suppress outside-interaction events.

2. SweetAlert2's confirm dialog uses `backdrop: true`, rendering a full-screen overlay. When the user clicks "Keep Editing", SweetAlert2 removes its backdrop from the DOM.

3. Safari on iPad in private browsing fires a spurious focus/pointer event back at the underlying page when SweetAlert2's backdrop is removed. This re-triggers Radix's `onOpenChange(false)` → `handleCloseWithConfirmation()`.

The `isClosingRef` re-entry guard was reset to `false` synchronously inside the `.then()` callback — before Safari's event queue flushed the spurious outside-interaction event. So the guard was already `false` when the re-trigger arrived, allowing the loop.

## Fix

In `handleCloseWithConfirmation`, the "Keep Editing" (cancel) path now delays resetting `isClosingRef.current` by 100ms, giving Safari's event queue time to flush the spurious event before the guard drops.

```ts
// Before
isClosingRef.current = false; // reset immediately — too early for Safari

// After
setTimeout(() => {
  isClosingRef.current = false;
}, 100); // let Safari flush spurious outside-interaction events first
```

The "Close Without Saving" path is unchanged — `onClose()` is called immediately and the guard is no longer needed.

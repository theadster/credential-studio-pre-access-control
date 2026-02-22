---
title: SweetAlert2 Icon Rendering Fix for Tailwind v4
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-21
review_interval_days: 90
related_code:
  - src/styles/sweetalert-custom.css
  - src/lib/sweetalert-config.ts
---

# SweetAlert2 Icon Rendering Fix for Tailwind v4

## Problem

SweetAlert2 modal icons (success, error, warning, info) rendered broken — the border circle appeared but the icon internals (checkmark lines, X lines, exclamation mark) were missing or unstyled.

## Root Cause

Two issues combined:

1. Tailwind v4's preflight CSS resets box-sizing, border, position, and pseudo-element styles globally. SweetAlert2's icon internals rely on position: absolute, box-sizing: content-box, and precise em-based dimensions that the reset was wiping out.

2. sweetalert-config.ts was setting icon: 'swal2-icon-custom' in the customClass theme object. This replaced SweetAlert2's own internal icon class, breaking all the library's CSS selectors that target .swal2-success, .swal2-error, etc.

## Fix

src/styles/sweetalert-custom.css — added explicit restoration rules for all icon internals:
- Base icon layout (position, box-sizing: content-box, width, height, border-radius)
- Success icon: checkmark line tip, checkmark line long, success ring, fix element
- Error icon: X mark line left, X mark line right
- Warning and info border colors

src/lib/sweetalert-config.ts — removed icon: 'swal2-icon-custom' from getSweetAlertTheme() so SweetAlert2 manages its own icon class names.

## Applies To

All SweetAlert2 modal dialogs using icon: 'success', icon: 'error', icon: 'warning', or icon: 'info'. Toast notifications are unaffected (they use inline icons at smaller size).

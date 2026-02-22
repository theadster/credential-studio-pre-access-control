---
title: "SweetAlert2 Icon Colors - CSS Variable Refactor"
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-22
review_interval_days: 90
related_code: ["src/styles/sweetalert-custom.css"]
---

# SweetAlert2 Icon Colors — CSS Variable Refactor

## Summary

Replaced hardcoded hex color values in `src/styles/sweetalert-custom.css` with CSS custom properties, making icon colors themeable and easier to maintain.

## Changes

### Variables Added to `:root`

| Variable | Light Value | Usage |
|----------|-------------|-------|
| `--swal2-success-color` | `#16a34a` | Success icon border, text, checkmark lines |
| `--swal2-success-ring-color` | `rgba(22, 163, 74, 0.3)` | Success icon ring border |
| `--swal2-error-color` | `#ef4444` | Error icon border, text, X-mark lines |
| `--swal2-warning-color` | `#f59e0b` | Warning icon border and text |
| `--swal2-info-color` | `#0ea5e9` | Info icon border and text |
| `--swal2-question-color` | `#6366f1` | Question icon border and text |

### Dark Mode Overrides (`.dark`)

| Variable | Dark Value |
|----------|------------|
| `--swal2-success-color` | `#22c55e` |
| `--swal2-success-ring-color` | `rgba(34, 197, 94, 0.3)` |
| `--swal2-error-color` | `#f87171` |
| `--swal2-warning-color` | `#fbbf24` |
| `--swal2-info-color` | `#38bdf8` |
| `--swal2-question-color` | `#818cf8` |

## Affected Selectors

- `div:where(.swal2-icon).swal2-success` — border-color, color
- `div:where(.swal2-icon).swal2-success [class^=swal2-success-line]` — background-color
- `div:where(.swal2-icon).swal2-success .swal2-success-ring` — border-color
- `div:where(.swal2-icon).swal2-error` — border-color, color
- `div:where(.swal2-icon).swal2-error [class^=swal2-x-mark-line]` — background-color
- `div:where(.swal2-icon).swal2-warning` — border-color, color
- `div:where(.swal2-icon).swal2-info` — border-color, color
- `div:where(.swal2-icon).swal2-question` — border-color, color

## Related Files

- Styles: `src/styles/sweetalert-custom.css`
- Related docs: `docs/enhancements/SWEETALERT_PROGRESS_MODALS.md`

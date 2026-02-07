# Implementation Plan: Tailwind CSS v4 Migration

## Overview

Migrate credential.studio from Tailwind CSS v3.4.x to v4.x in 9 phases: toolchain, CSS config, animation plugin, utility renames, shadcn/ui updates, visual regression fixes, and cleanup, with verification checkpoints. Each phase is independently verifiable.

## Tasks

- [x] 1. Update build toolchain dependencies
  - [x] 1.1 Update package.json dependencies
    - Remove `tailwindcss` v3 from devDependencies
    - Remove `autoprefixer` from devDependencies
    - Remove `tailwindcss-animate` from dependencies
    - Add `tailwindcss` v4.x to devDependencies
    - Add `@tailwindcss/postcss` to devDependencies
    - Add `tw-animate-css` to dependencies
    - Run `npm install` to update lockfile
    - _Requirements: 1.1, 1.2, 1.3, 6.1_

  - [x] 1.2 Rewrite postcss.config.js
    - Replace `tailwindcss` and `autoprefixer` plugins with `@tailwindcss/postcss` as the sole plugin
    - _Requirements: 1.4, 1.2_

- [x] 2. Migrate CSS configuration
  - [x] 2.1 Rewrite src/styles/globals.css with v4 structure
    - Replace `@tailwind base/components/utilities` with `@import "tailwindcss"`
    - Add `@import "tw-animate-css"` import
    - Move `@import './sweetalert-custom.css'` after tailwindcss import
    - Add `@variant dark (&:where(.dark, .dark *))` for class-based dark mode
    - Add `@theme inline` block with all color tokens mapped to CSS variables (--color-background, --color-foreground, --color-primary, etc.), border-radius values, keyframes, and animations
    - Update `:root` CSS variables to include `hsl()` wrappers in values (e.g., `--primary: hsl(262.1 83.3% 57.8%)`)
    - Update `.dark` CSS variables to include `hsl()` wrappers in values
    - Preserve `@layer base` blocks with `@apply border-border` and `@apply bg-background text-foreground`
    - Add `@utility container` block replicating v3 container config (centered, 2rem padding, 1400px max-width at 2xl)
    - Add `button:not(:disabled) { cursor: pointer; }` base rule to restore pointer cursor
    - Migrate `@layer utilities` custom utilities (Cloudinary z-index, glass-effect, date input styling, attendee row hover, Radix popper fix) — keep as plain CSS or use `@utility` where applicable
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 7.1, 7.2, 7.3, 7.4, 9.4_

  - [x] 2.2 Update src/styles/sweetalert-custom.css for v4 variable format
    - Replace all `hsl(var(--destructive))` patterns with `var(--destructive)` since variables now contain full hsl() values
    - Apply same change for `--success`, `--warning`, `--info`, `--primary`, `--ring`, `--radius`
    - _Requirements: 8.1, 8.2, 8.3_

  - [x] 2.3 Delete tailwind.config.js
    - Remove the file since all configuration is now in CSS
    - _Requirements: 1.5, 2.6_

  - [x] 2.4 Update components.json for v4
    - Remove `tailwind.config` reference
    - Update the tailwind section to reflect CSS-based configuration
    - _Requirements: 5.3_

- [x] 3. Checkpoint - Verify build compiles
  - Ensure `npm run build` completes without errors after toolchain and CSS config changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Rename deprecated utility classes across codebase
  - [x] 4.1 Rename shadow utilities
    - Replace `shadow-sm` → `shadow-xs` across all .tsx files (careful not to replace `shadow-sm` that was already the correct v4 name in other contexts)
    - Replace bare `shadow` (as a standalone class, not prefix) → `shadow-sm` across all .tsx files
    - **IMPORTANT: Execute both shadow renames in a single pass to avoid double-rename risk (e.g., `shadow` → `shadow-sm` → `shadow-xs`)**
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Rename outline-none to outline-hidden
    - Replace `outline-none` → `outline-hidden` across all .tsx files
    - _Requirements: 4.3_

  - [x] 4.3 Rename rounded utilities
    - Replace `rounded-sm` → `rounded-xs` across all .tsx files
    - Replace bare `rounded` (as a standalone class, not prefix) → `rounded-sm` across all .tsx files
    - **IMPORTANT: Execute both rounded renames in a single pass to avoid double-rename risk (e.g., `rounded` → `rounded-sm` → `rounded-xs`)**
    - _Requirements: 4.4, 4.5_

  - [x] 4.4 Rename ring and blur utilities (if any exist)
    - Replace bare `ring` (without width suffix) → `ring-3` if found
    - Replace `blur-sm` → `blur-xs` if found
    - Replace bare `blur` → `blur-sm` if found
    - _Requirements: 4.6, 4.7, 4.8_

  - [x] 4.5 Update arbitrary value syntax in chart.tsx
    - Replace `bg-[--color-bg]` → `bg-(--color-bg)` in src/components/ui/chart.tsx
    - Replace `border-[--color-border]` → `border-(--color-border)` in src/components/ui/chart.tsx
    - _Requirements: 4.1_

- [x] 5. Update shadcn/ui components for React 19
  - [x] 5.1 Remove forwardRef from simple HTML element components
    - Update `input.tsx`, `textarea.tsx`, `button.tsx` — remove `React.forwardRef`, use function components with `ref` prop and `React.ComponentProps<>` types
    - Remove `.displayName` assignments
    - _Requirements: 5.1, 5.2_

  - [x] 5.2 Remove forwardRef from Radix primitive wrapper components
    - Update `checkbox.tsx`, `select.tsx`, `separator.tsx`, `slider.tsx`, `switch.tsx`, `toggle.tsx`, `radio-group.tsx`, `label.tsx`, `progress.tsx` — remove `React.forwardRef`, use function components with `ref` prop
    - Replace `React.ElementRef<>` and `React.ComponentPropsWithoutRef<>` with `React.ComponentProps<>`
    - Remove `.displayName` assignments
    - _Requirements: 5.1, 5.2_

  - [x] 5.3 Remove forwardRef from complex multi-export components
    - Update `dropdown-menu.tsx`, `context-menu.tsx`, `menubar.tsx`, `navigation-menu.tsx`, `dialog.tsx`, `sheet.tsx`, `alert-dialog.tsx`, `popover.tsx`, `hover-card.tsx`, `tooltip.tsx`, `accordion.tsx`, `tabs.tsx`, `command.tsx` — remove all `React.forwardRef` wrappers
    - Replace type patterns, remove `.displayName` assignments
    - _Requirements: 5.1, 5.2_

  - [x] 5.4 Remove forwardRef from remaining components
    - Update `table.tsx`, `card.tsx`, `form.tsx`, `carousel.tsx`, `scroll-area.tsx`, `resizable.tsx`, `input-otp.tsx`, `breadcrumb.tsx`, `pagination.tsx`, `drawer.tsx`, `toggle-group.tsx`, `sonner.tsx`, `skeleton.tsx`, `badge.tsx`, `calendar.tsx`, `chart.tsx`, `collapsible.tsx`, `aspect-ratio.tsx`, `avatar.tsx`
    - _Requirements: 5.1, 5.2_

- [x] 6. Fix visual regression edge cases
  - [x] 6.1 Audit bare border classes for explicit color
    - Search for elements using `border` class without an explicit border color
    - Add `border-border` where needed to prevent v4 default color change from gray-200 to currentColor
    - Focus on shadcn/ui components first, then page-level components
    - _Requirements: 5.5, 9.1_

  - [x] 6.2 Audit stacked variant usage
    - Review components using `dark:hover:`, `dark:focus:` patterns
    - Verify left-to-right stacking order produces correct results (v4 changed from right-to-left)
    - Update any patterns where order matters
    - _Requirements: 9.5_

- [x] 7. Checkpoint - Full build and lint verification
  - Run `npm run build` and verify zero errors
  - Run `npm run lint` and verify no new Tailwind-related warnings
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Write migration verification tests
  - [x] 8.1 Write unit tests for CSS config correctness
    - Test that globals.css contains `@import "tailwindcss"` and no `@tailwind` directives
    - Test that all color CSS variables in :root and .dark have hsl() wrappers
    - Test that @theme inline uses var() without hsl() double-wrapping
    - Test that postcss.config.js references @tailwindcss/postcss
    - **Property 1: All color CSS variables have hsl() wrappers**
    - **Property 2: No double hsl() wrapping in @theme inline**
    - **Property 3: All v3 theme keys migrated to v4 CSS config**
    - **Validates: Requirements 2.1, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5**

  - [x] 8.2 Write property test for deprecated utility class absence
    - Use fast-check to generate random file selections from src/**/*.tsx
    - Assert no file contains deprecated v3 class names that were removed (outline-none, bare ring, bare blur)
    - Note: shadow-* and rounded-* are renames (shadow-sm → shadow-xs, rounded-sm → rounded-[size]), not deprecated removals
    - **Property 4: No deprecated v3 utility class names in source files**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8**

  - [x] 8.3 Write property test for forwardRef removal
    - Use fast-check to generate random file selections from src/components/ui/*.tsx
    - Assert no file contains React.forwardRef
    - **Property 5: No React.forwardRef in shadcn/ui components**
    - **Validates: Requirements 5.1, 5.2**

  - [x] 8.4 Write property test for border color safety
    - Use fast-check to generate random file selections from src/**/*.tsx
    - For files using bare `border` class, assert an explicit border color class is present
    - **Property 6: Bare border classes have explicit color**
    - **Validates: Requirements 5.5, 9.1**

- [x] 9. Final checkpoint - Complete verification
  - Run `npm run build` and verify zero errors
  - Run all tests with `npx vitest --run`
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The migration is ordered so each phase can be independently verified via build
- Property tests use `fast-check` (already installed) with Vitest
- Utility renames in Phase 4 must be done carefully with regex to avoid false positives (e.g., `shadow-sm` inside `shadow-sm-something` or in comments)
- forwardRef removal in Phase 5 is the largest task by file count (~45 component files with ~100+ forwardRef instances)

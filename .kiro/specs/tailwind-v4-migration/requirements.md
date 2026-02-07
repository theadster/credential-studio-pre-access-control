# Requirements Document

## Introduction

This document defines the requirements for migrating credential.studio from Tailwind CSS v3.4.x to Tailwind CSS v4.x. The migration encompasses updating the build toolchain (PostCSS plugin, removing autoprefixer), converting the JavaScript-based configuration to CSS-first configuration using `@theme`, updating all renamed utility classes across ~490 source files, migrating the shadcn/ui component library (46 components) to v4-compatible patterns, replacing the deprecated `tailwindcss-animate` plugin with `tw-animate-css`, and updating CSS variable patterns for the custom violet theme. The migration must preserve all existing visual styling, dark mode behavior, and responsive layouts while adopting Tailwind v4 conventions.

## Glossary

- **Build_Toolchain**: The PostCSS-based compilation pipeline that processes Tailwind CSS directives into final CSS output
- **CSS_Config**: The new Tailwind v4 CSS-first configuration approach using `@theme` and `@theme inline` directives in CSS files, replacing the JavaScript `tailwind.config.js`
- **Utility_Rename**: A Tailwind v4 breaking change where certain utility class names have been renamed (e.g., `shadow-sm` → `shadow-xs`, `outline-none` → `outline-hidden`)
- **Theme_Variables**: CSS custom properties (e.g., `--primary`, `--border`) defined in `:root` and `.dark` selectors that drive the color system
- **shadcn_Components**: The 46 pre-built UI component files in `src/components/ui/` from the shadcn/ui library
- **HSL_Pattern**: The `hsl(var(--variable))` pattern used in Tailwind v3 config to reference CSS variables; in v4, the `hsl()` wrapper moves into the CSS variable value itself
- **Container_Utility**: The Tailwind container class whose center/padding/screens configuration options are removed in v4 and must be replicated via `@utility`
- **Animate_Plugin**: The `tailwindcss-animate` package (v3 plugin) being replaced by `tw-animate-css` for v4 compatibility

## Requirements

### Requirement 1: Build Toolchain Migration

**User Story:** As a developer, I want the project build toolchain updated to use Tailwind CSS v4 packages, so that the application compiles correctly with the new version.

#### Acceptance Criteria

1. WHEN the project dependencies are installed, THE Build_Toolchain SHALL use `@tailwindcss/postcss` as the PostCSS plugin instead of the `tailwindcss` plugin
2. WHEN the project dependencies are installed, THE Build_Toolchain SHALL no longer include `autoprefixer` as a PostCSS plugin since Tailwind v4 handles vendor prefixing internally
3. WHEN the project is built, THE Build_Toolchain SHALL use the `tailwindcss` v4.x package as the core dependency
4. WHEN `postcss.config.js` is loaded, THE Build_Toolchain SHALL reference `@tailwindcss/postcss` as the sole plugin entry
5. IF the `tailwind.config.js` file still exists after migration, THEN THE Build_Toolchain SHALL not depend on it for configuration since all config moves to CSS

### Requirement 2: CSS-First Configuration Migration

**User Story:** As a developer, I want the Tailwind configuration moved from `tailwind.config.js` into CSS using `@theme` directives, so that the project follows Tailwind v4 conventions.

#### Acceptance Criteria

1. WHEN `globals.css` is loaded, THE CSS_Config SHALL use `@import "tailwindcss"` instead of the `@tailwind base`, `@tailwind components`, and `@tailwind utilities` directives
2. WHEN the theme is defined, THE CSS_Config SHALL declare all custom color tokens using `@theme inline` so that shadcn_Components CSS variable references resolve correctly
3. WHEN the theme is defined, THE CSS_Config SHALL declare custom `--radius` values, keyframes (`accordion-down`, `accordion-up`), and animations within the `@theme` block
4. WHEN the dark mode is configured, THE CSS_Config SHALL use the `@variant dark (&:where(.dark, .dark *))` selector strategy to match the existing class-based dark mode behavior
5. WHEN the Container_Utility is used, THE CSS_Config SHALL define a `@utility container` block that replicates the v3 container config (centered, 2rem padding, max-width 1400px at 2xl)
6. IF the `tailwind.config.js` file is removed, THEN THE CSS_Config SHALL contain all equivalent theme extensions previously defined in JavaScript

### Requirement 3: CSS Variable and HSL Pattern Migration

**User Story:** As a developer, I want the CSS variable definitions updated to include `hsl()` wrappers directly in the variable values, so that Tailwind v4 color references work correctly.

#### Acceptance Criteria

1. WHEN Theme_Variables are defined in `:root`, THE CSS_Config SHALL store color values in `hsl()` format directly in the variable (e.g., `--primary: hsl(262.1 83.3% 57.8%)` instead of `--primary: 262.1 83.3% 57.8%`)
2. WHEN Theme_Variables are defined in `.dark`, THE CSS_Config SHALL store dark mode color values in the same wrapped format
3. WHEN `@theme inline` references Theme_Variables, THE CSS_Config SHALL use `var(--variable-name)` without an additional `hsl()` wrapper
4. WHEN custom semantic colors (`--success`, `--info`, `--warning`, `--surface`, `--surface-variant`) are defined, THE CSS_Config SHALL wrap their values in `hsl()` format consistent with the other Theme_Variables
5. WHEN chart colors (`--chart-1` through `--chart-5`) are defined for both light and dark modes, THE CSS_Config SHALL wrap their values in `hsl()` format

### Requirement 4: Utility Class Rename Migration

**User Story:** As a developer, I want all renamed Tailwind utility classes updated across the codebase, so that styling renders correctly under Tailwind v4.

#### Acceptance Criteria

1. WHEN a component uses `shadow-sm`, THE Utility_Rename SHALL replace it with `shadow-xs` across all affected files
2. WHEN a component uses `shadow` (without suffix), THE Utility_Rename SHALL replace it with `shadow-sm` across all affected files
3. WHEN a component uses `outline-none`, THE Utility_Rename SHALL replace it with `outline-hidden` across all affected files
4. WHEN a component uses `rounded-sm`, THE Utility_Rename SHALL replace it with `rounded-xs` across all affected files
5. WHEN a component uses `rounded` (without suffix), THE Utility_Rename SHALL replace it with `rounded-sm` across all affected files
6. WHEN a component uses `ring` (without explicit width), THE Utility_Rename SHALL replace it with `ring-3` to preserve the v3 default 3px ring width
7. WHEN a component uses `blur-sm`, THE Utility_Rename SHALL replace it with `blur-xs` across all affected files
8. WHEN a component uses `blur` (without suffix), THE Utility_Rename SHALL replace it with `blur-sm` across all affected files

### Requirement 5: shadcn/ui Component Migration

**User Story:** As a developer, I want the shadcn/ui components updated for Tailwind v4 and React 19 compatibility, so that the component library works correctly with the new stack.

#### Acceptance Criteria

1. WHEN a shadcn_Components file uses `React.forwardRef` unnecessarily (i.e., the ref is not forwarded to a DOM element or child component), THE shadcn_Components SHALL remove the `forwardRef` wrapper and use direct `ref` prop passing compatible with React 19; HOWEVER, IF the component forwards refs to a DOM element or Radix primitive, THE `forwardRef` wrapper SHALL be retained to preserve ref forwarding capability
2. WHEN a shadcn_Components file defines prop types, THE shadcn_Components SHALL use `React.ComponentProps<>` or `React.ComponentPropsWithoutRef<>` instead of `React.HTMLAttributes<>` combined with `forwardRef` generics
3. WHEN `components.json` is updated, THE shadcn_Components SHALL reflect the Tailwind v4 configuration format (CSS-based config path instead of JS config path)
4. WHEN shadcn_Components reference renamed utility classes, THE shadcn_Components SHALL use the updated v4 class names as defined in Requirement 4
5. IF a shadcn_Components file uses the `border` utility without an explicit color, THEN THE shadcn_Components SHALL verify the border color renders correctly since v4 changes the default border color from `gray-200` to `currentColor`

### Requirement 6: Animation Plugin Migration

**User Story:** As a developer, I want the animation plugin migrated from `tailwindcss-animate` to `tw-animate-css`, so that CSS animations continue working under Tailwind v4.

#### Acceptance Criteria

1. WHEN the project dependencies are installed, THE Animate_Plugin SHALL use `tw-animate-css` instead of `tailwindcss-animate`
2. WHEN `globals.css` is loaded, THE Animate_Plugin SHALL import `tw-animate-css` via a CSS `@import` statement instead of a JavaScript `require()` plugin
3. WHEN animation utility classes are used in components, THE Animate_Plugin SHALL ensure all existing animation classes (`animate-in`, `animate-out`, `fade-in`, `fade-out`, `slide-in`, `slide-out`, etc.) continue to function identically
4. IF any animation class names have changed between `tailwindcss-animate` and `tw-animate-css`, THEN THE Animate_Plugin SHALL update all affected component files to use the new class names

### Requirement 7: Custom CSS Utilities Migration

**User Story:** As a developer, I want custom CSS utilities preserved and migrated to Tailwind v4 syntax, so that project-specific styles continue working.

#### Acceptance Criteria

1. WHEN custom utilities are defined in `globals.css`, THE CSS_Config SHALL migrate `@layer utilities` blocks to use the `@utility` directive where the utility is a single-class utility
2. WHEN the `glass-effect` utility is defined, THE CSS_Config SHALL preserve its `backdrop-filter`, `background`, and `border` properties with both light and dark mode variants
3. WHEN the `@layer base` block applies global styles using `@apply`, THE CSS_Config SHALL preserve the `border-border` and `bg-background text-foreground` base styles
4. WHEN vendor-specific selectors (Cloudinary widget z-index, date input styling, Radix popper positioning) are defined, THE CSS_Config SHALL preserve these styles in a compatible format
5. IF `@apply` is used within `@layer` blocks, THEN THE CSS_Config SHALL ensure the `@apply` directives resolve correctly under Tailwind v4 processing rules

### Requirement 8: SweetAlert2 Custom Styles Preservation

**User Story:** As a developer, I want the SweetAlert2 custom CSS preserved during migration, so that toast notifications and alert dialogs maintain their styling.

#### Acceptance Criteria

1. WHEN `sweetalert-custom.css` is imported, THE CSS_Config SHALL ensure the import resolves correctly under the new `@import "tailwindcss"` structure
2. WHEN SweetAlert2 z-index management styles are applied, THE CSS_Config SHALL preserve the z-index layering system for modals, toasts, and overlays
3. IF `sweetalert-custom.css` uses any Tailwind-specific directives or `@apply` rules, THEN THE CSS_Config SHALL update those directives to v4-compatible syntax

### Requirement 9: Visual Regression Prevention

**User Story:** As a developer, I want the migration to produce zero visual regressions, so that the application looks identical before and after the upgrade.

#### Acceptance Criteria

1. WHEN the default border color changes from `gray-200` to `currentColor` in v4, THE Utility_Rename SHALL add explicit `border-border` classes where needed to preserve the existing border appearance
2. WHEN the default ring width changes from 3px to 1px in v4, THE Utility_Rename SHALL add explicit `ring-3` where the v3 default ring width was relied upon
3. WHEN hover behavior changes to only apply on devices that support hover in v4, THE CSS_Config SHALL verify that hover states on interactive elements behave correctly on both desktop and touch devices
4. WHEN the default button cursor changes from `pointer` to `default` in v4, THE CSS_Config SHALL add a global rule to restore `cursor: pointer` on buttons if the existing design relies on pointer cursors
5. WHEN variant stacking order changes from right-to-left to left-to-right in v4, THE CSS_Config SHALL audit any components using stacked variants (e.g., `dark:hover:`) to ensure correct behavior

### Requirement 10: Build and Runtime Verification

**User Story:** As a developer, I want the migrated application to build and run without errors, so that the migration is complete and deployable.

#### Acceptance Criteria

1. WHEN `npm run build` is executed, THE Build_Toolchain SHALL complete without errors or warnings related to Tailwind CSS
2. WHEN `npm run dev` is executed, THE Build_Toolchain SHALL start the development server with hot reload functioning correctly for CSS changes
3. WHEN `npm run lint` is executed, THE Build_Toolchain SHALL pass linting without new Tailwind-related warnings
4. IF any TypeScript files reference Tailwind configuration types, THEN THE Build_Toolchain SHALL resolve those types correctly against the v4 package

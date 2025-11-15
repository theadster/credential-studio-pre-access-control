# Implementation Plan

- [x] 1. Create type utility modules
  - Create `src/lib/typeGuards.ts` with generic type guard functions: `isError`, `hasProperty`, `isFulfilled`, `isRejected`
  - Create `src/lib/appwriteTypeHelpers.ts` with Appwrite-specific type helpers: `hasSizeProperty`, `hasDefaultProperty`
  - Add comprehensive JSDoc documentation to all utility functions
  - Export all utilities from both modules
  - _Requirements: 1.4, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Fix Appwrite attribute type issues in scripts
  - [x] 2.1 Fix `scripts/add-notes-to-attendees.ts`
    - Import `hasSizeProperty` from type helpers
    - Add type guard before accessing `attribute.size`
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.2 Fix `scripts/verify-notes-field.ts`
    - Import `hasSizeProperty` from type helpers
    - Add type guard before accessing `attribute.size`
    - _Requirements: 1.1, 1.3_
  
  - [x] 2.3 Fix `scripts/check-show-on-main-page-attribute.ts`
    - Import `hasDefaultProperty` from type helpers
    - Add type guard before accessing `attribute.default`
    - _Requirements: 1.2, 1.3_
  
  - [x] 2.4 Fix `scripts/test-visibility-filtering.ts`
    - Import `hasDefaultProperty` from type helpers
    - Add type guard before accessing `attribute.default`
    - _Requirements: 1.2, 1.3_
  
  - [x] 2.5 Fix `scripts/archive/schema-migrations/add-version-to-integrations.ts`
    - Import `hasDefaultProperty` from type helpers
    - Add type guard before accessing `attribute.default`
    - _Requirements: 1.2, 1.3_

- [x] 3. Fix unknown and implicit any type issues
  - [x] 3.1 Fix `src/components/RoleCard.tsx`
    - Add explicit type annotation to `reduce` callback parameter: `(count: number, [resource, perms]: [string, boolean | Record<string, boolean>])`
    - Add type annotation to `map` callback parameter
    - Cast `permissionCount` to `number` for ReactNode compatibility
    - _Requirements: 2.2, 2.3_
  
  - [x] 3.2 Fix `src/pages/api/event-settings/index.ts` filter callbacks
    - Add explicit type annotations to filter callback parameters (lines 1718, 1719, 1722, 1770)
    - Define interface for custom field structure
    - _Requirements: 2.2, 2.3_
  
  - [x] 3.3 Fix `src/pages/api/event-settings/index.ts` error handling
    - Import `isError` and `hasProperty` from type guards
    - Add type guards before accessing error properties (lines 1962-1976)
    - Use safe property access pattern for error objects
    - _Requirements: 2.1, 2.4_
  
  - [x] 3.4 Fix `src/components/ui/chart.tsx`
    - Add explicit type annotations to `payload.map` callback parameters
    - Define proper types for Chart component props
    - _Requirements: 2.2, 2.3_

- [x] 4. Fix Promise.allSettled type safety issues
  - [x] 4.1 Fix `src/pages/api/event-settings/index.ts` Promise.allSettled
    - Import `isFulfilled` and `isRejected` from type guards
    - Replace status checks with type guard functions (lines 2028-2045)
    - Use type guards before accessing `.value` and `.reason` properties
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 5. Fix UI component type issues
  - [x] 5.1 Fix `src/components/ui/calendar.tsx`
    - Remove `IconLeft` property from components object (line 61)
    - Use supported Calendar component properties only
    - _Requirements: 4.2, 4.3_
  
  - [x] 5.2 Fix `src/components/ui/chart.tsx` prop types
    - Add proper type definitions for `payload` and `label` props
    - Fix ChartTooltip and ChartLegend prop types
    - Add type guards for payload existence checks
    - _Requirements: 4.1, 4.3, 4.4_

- [x] 6. Fix missing type definitions
  - [x] 6.1 Add `batchCount` to bulk operation interfaces
    - Update bulk delete result interface to include optional `batchCount` property
    - Update bulk import result interface to include optional `batchCount` property
    - Fix type errors in `src/pages/api/attendees/bulk-delete.ts`
    - Fix type errors in `src/pages/api/attendees/import.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.2 Fix EventSettingsForm type definitions
    - Create discriminated union for field options types
    - Add `uppercase` property to `TextFieldOptions` interface
    - Add `options` property to `SelectFieldOptions` interface
    - Fix type errors in `src/components/EventSettingsForm/SortableCustomField.tsx`
    - Fix type errors in `src/components/EventSettingsForm/utils.ts`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [x] 6.3 Fix `src/hooks/useDebouncedCallback.ts`
    - Add initial value to `useRef<NodeJS.Timeout>()` call
    - Allow `undefined` as valid value for timeout ref
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 6.4 Fix `src/pages/private.tsx`
    - Update `createSessionClient` call to accept correct request type
    - Add proper type casting or update function signature
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Handle legacy migration scripts
  - [x] 7.1 Add `@ts-nocheck` to Prisma migration scripts
    - Add `// @ts-nocheck` comment to `src/scripts/archive/legacy-migration/complete-event-settings-migration.ts`
    - Add `// @ts-nocheck` comment to `src/scripts/archive/legacy-migration/fix-event-settings-consolidated.ts`
    - Add `// @ts-nocheck` comment to `src/scripts/archive/legacy-migration/migrate-event-and-log-settings.ts`
    - Add comments explaining these are archived legacy scripts
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 8. Handle archived schema migration scripts
  - [x] 8.1 Fix or suppress `scripts/archive/schema-migrations/add-deleted-at-to-custom-fields.ts`
    - Add `// @ts-nocheck` comment to suppress errors
    - Add comment explaining this is an archived migration script
    - Document that Appwrite SDK methods may have changed
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 9. Validate TypeScript compilation
  - Run `npx tsc --noEmit` to verify zero TypeScript errors
  - Verify all 63 errors are resolved
  - Document any remaining issues
  - _Requirements: 8.1, 8.2_

- [x] 10. Test functionality
  - Test Appwrite attribute handling in scripts
  - Test bulk operations (delete, import)
  - Test EventSettingsForm with custom fields
  - Test RoleCard component rendering
  - Test Chart and Calendar components
  - Verify no runtime errors introduced
  - _Requirements: 8.3, 8.4_

- [x] 11. Update build configuration
  - Remove `ignoreBuildErrors: true` from `next.config.mjs`
  - Run `npm run build` to verify build succeeds with type checking
  - Document the configuration change
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

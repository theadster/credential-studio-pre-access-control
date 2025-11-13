# Implementation Plan: Next.js 16 Migration

This implementation plan provides a step-by-step guide for migrating CredentialStudio from Next.js 15 to Next.js 16 with Turbopack. Each task builds incrementally on previous tasks, with comprehensive testing and validation at each stage.

## Phase 1: Pre-Migration Audit and Preparation

- [x] 1. Create backup and establish baseline
  - Create a new branch `migration/nextjs-16` from main
  - Tag current state as `pre-migration-backup`
  - Document current Next.js and React versions
  - Create a backup of the entire project directory
  - _Requirements: 14.1, 14.2, 14.4_

- [x] 1.1 Measure baseline performance metrics
  - Run production build and record build time
  - Measure production bundle size
  - Start dev server and record startup time
  - Test HMR and record response time
  - Document all metrics in a baseline report
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 1.2 Run and document current test results
  - Execute `npx vitest --run` and capture results
  - Document all passing tests
  - Document any failing or skipped tests
  - Verify test coverage for critical paths
  - Create test results baseline document
  - _Requirements: 12.8_

- [x] 1.3 Audit codebase for Next.js 16 compatibility
  - Scan all files in `src/components/` for React 19 compatibility issues
  - Scan all files in `src/pages/` for Next.js 16 Pages Router compatibility
  - Scan all files in `src/pages/api/` for API route compatibility
  - Scan all files in `src/hooks/` for React 19 hooks compatibility
  - Scan all files in `src/lib/` and `src/util/` for Next.js 16 compatibility
  - Scan all files in `src/contexts/` for React 19 context compatibility
  - Identify any usage of deprecated Next.js 15 APIs
  - Identify any usage of `serverRuntimeConfig` or `publicRuntimeConfig`
  - Identify any middleware files that need renaming
  - Identify any Sass files using tilde (~) imports
  - Identify any custom Webpack configurations
  - Document all findings in an audit report
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 1.4 Check third-party dependency compatibility
  - Verify Appwrite SDK compatibility with Next.js 16 and React 19
  - Verify Cloudinary integration compatibility
  - Verify Switchboard Canvas API compatibility
  - Verify shadcn/ui components compatibility with React 19
  - Verify Tailwind CSS compatibility
  - Verify Framer Motion compatibility
  - Verify React Hook Form and Zod compatibility
  - Check all other dependencies in package.json for compatibility
  - Document any incompatible dependencies
  - Research alternatives for incompatible dependencies
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 1.5 Create detailed rollback procedure
  - Document step-by-step rollback instructions
  - Create rollback scripts if needed
  - Test rollback procedure on a test branch
  - Document rollback triggers and decision criteria
  - Create rollback verification checklist
  - _Requirements: 14.4_

## Phase 2: Dependency Upgrades

- [x] 2. Update core Next.js and React dependencies
  - Update `next` to version `^16.0.0` in package.json
  - Update `react` to version `^19.0.0` in package.json
  - Update `react-dom` to version `^19.0.0` in package.json
  - Update `eslint-config-next` to latest compatible version
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.1 Update TypeScript type definitions
  - Update `@types/react` to version `^19.0.0`
  - Update `@types/react-dom` to version `^19.0.0`
  - Update `@types/node` to latest compatible version
  - Verify no type definition conflicts
  - _Requirements: 1.5, 9.2_

- [x] 2.2 Install updated dependencies
  - Run `npm install` to install updated dependencies
  - Resolve any peer dependency warnings
  - Resolve any dependency conflicts
  - Verify installation completed successfully
  - Check for any security vulnerabilities with `npm audit`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.3 Verify dependency installation
  - Check that Next.js 16 is installed correctly
  - Check that React 19 is installed correctly
  - Verify no duplicate React versions exist
  - Run `npm list` to verify dependency tree
  - Document any warnings or issues
  - _Requirements: 1.1, 1.2, 1.3_

## Phase 3: Configuration Migration

- [x] 3. Update next.config.mjs for Next.js 16
  - Move `experimental.turbopack` to top-level `turbopack` configuration
  - Remove `serverRuntimeConfig` if present
  - Remove `publicRuntimeConfig` if present
  - Update `skipMiddlewareUrlNormalize` to `skipProxyUrlNormalize` if present
  - Update `experimental.serverComponentsExternalPackages` to `serverExternalPackages` if present
  - Update `experimental.dynamicIO` to `cacheComponents` if present
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3.1 Configure Turbopack settings
  - Add `turbopack` configuration object to next.config.mjs
  - Configure `resolveExtensions` if custom extensions are needed
  - Configure `resolveAlias` for any module aliases
  - Add `experimental.turbopackFileSystemCacheForDev: true` for caching
  - Document all Turbopack configuration options used
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 Migrate image configuration
  - Replace `images.domains` with `images.remotePatterns`
  - Add remote patterns for `images.unsplash.com`
  - Add remote patterns for `res.cloudinary.com`
  - Configure `images.localPatterns` if local images with query strings are used
  - Set `images.maximumRedirects` to 3 or configure as needed
  - Add 16 to `images.imageSizes` array if 16px images are required
  - Configure `images.dangerouslyAllowLocalIP` only if needed for private networks
  - _Requirements: 3.7, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3.3 Handle Sass tilde imports
  - Scan all Sass files for tilde (~) imports
  - Option A: Remove tilde prefixes from all Sass imports (preferred)
  - Option B: Configure `turbopack.resolveAlias` to map `~*` to `*`
  - Test that all Sass imports resolve correctly
  - _Requirements: 7.1, 7.2_

- [x] 3.4 Configure Webpack fallback (optional)
  - Keep existing `webpack` configuration as fallback
  - Add comment indicating it's for fallback purposes
  - Test that `npm run build --webpack` works if needed
  - _Requirements: 2.5_

- [x] 3.5 Update package.json scripts
  - Ensure `dev` script uses `next dev` (Turbopack by default)
  - Ensure `build` script uses `next build` (Turbopack by default)
  - Add `build:webpack` script with `next build --webpack` for fallback
  - Add `clean` script with `rm -rf .next` for cleaning build artifacts
  - Verify `start` and `lint` scripts remain unchanged
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3.6 Update tsconfig.json for Next.js 16
  - Verify `moduleResolution` is set to `bundler`
  - Verify `jsx` is set to `preserve`
  - Verify `incremental` is set to `true`
  - Verify `plugins` includes `{ "name": "next" }`
  - Verify `paths` includes `@/*` alias
  - Check for any deprecated TypeScript options
  - _Requirements: 9.1, 9.3_

## Phase 4: Code Modernization

- [x] 4. Migrate middleware to proxy
  - Check if `middleware.ts` or `middleware.js` exists
  - If exists, rename file to `proxy.ts` or `proxy.js`
  - Update exported function name from `middleware` to `proxy`
  - Verify all middleware logic remains unchanged
  - Update any imports or references to the middleware file
  - Test that proxy functionality works correctly
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Migrate runtime configuration to environment variables
  - Identify all usages of `getConfig()` from `next/config`
  - Replace `serverRuntimeConfig` access with direct `process.env` access
  - Replace `publicRuntimeConfig` access with `process.env.NEXT_PUBLIC_*` variables
  - Update `.env.local` with all required environment variables
  - Ensure server-only variables do not have `NEXT_PUBLIC_` prefix
  - Ensure client-accessible variables have `NEXT_PUBLIC_` prefix
  - Remove all imports of `next/config`
  - Test that all environment variables are accessible
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 4.2 Update API routes for Next.js 16
  - Verify all API routes in `src/pages/api/` are compatible
  - Ensure API routes access environment variables via `process.env`
  - Verify Appwrite SDK usage is compatible with Next.js 16
  - Test all API route error handling
  - Test all API route authentication and authorization
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.3 Fix TypeScript compilation errors
  - Run `npm run build` to identify TypeScript errors
  - Resolve any type conflicts with React 19
  - Resolve any type conflicts with Next.js 16
  - Update any deprecated type imports
  - Verify all custom type definitions are valid
  - Ensure strict mode TypeScript compilation succeeds
  - _Requirements: 9.2, 9.3, 9.4, 9.5_

- [x] 4.4 Update Sass and CSS imports
  - Verify all global CSS imports work correctly
  - Verify Tailwind CSS compilation works correctly
  - Verify all component-level CSS modules work correctly
  - Test that all styles render correctly in development
  - Test that all styles render correctly in production build
  - _Requirements: 7.3, 7.4, 7.5_

- [x] 4.5 Verify component compatibility
  - Test all components in `src/components/` render correctly
  - Test all shadcn/ui components work with React 19
  - Test all custom hooks work with React 19
  - Test all context providers work with React 19
  - Fix any React 19 compatibility issues
  - _Requirements: 15.1, 15.6_

## Phase 5: Testing and Validation

- [-] 5. Run production build with Turbopack
  - Clean build artifacts with `npm run clean`
  - Run `npm run build` to create production build
  - Verify build completes without errors
  - Verify build uses Turbopack (check build output)
  - Measure and record build time
  - Measure and record bundle size
  - Compare with baseline metrics
  - _Requirements: 12.1, 13.3, 13.4_

- [x] 5.1 Run development server with Turbopack
  - Start development server with `npm run dev`
  - Verify server starts without errors
  - Measure and record startup time
  - Test Hot Module Replacement (HMR)
  - Measure and record HMR speed
  - Compare with baseline metrics
  - _Requirements: 12.2, 13.1, 13.2_

- [x] 5.2 Run all existing tests
  - Execute `npx vitest --run` to run all tests
  - Verify all tests pass
  - Compare test results with baseline
  - Investigate and fix any failing tests
  - Document any test changes required
  - _Requirements: 12.8_

- [x] 5.3 Test authentication flows
  - Test login with email/password
  - Test login with Google OAuth
  - Test password reset flow
  - Test session management
  - Test logout functionality
  - Verify all authentication flows work correctly
  - _Requirements: 12.5_

- [ ] 5.4 Test attendee management features
  - Test creating a new attendee
  - Test editing an existing attendee
  - Test deleting an attendee
  - Test bulk operations (import, export, bulk edit, bulk delete)
  - Test photo upload functionality
  - Test credential generation
  - Test search and filter functionality
  - Test pagination
  - Verify all attendee features work correctly
  - _Requirements: 12.3, 12.6_

- [ ] 5.5 Test event configuration features
  - Test updating event settings
  - Test custom field management (create, edit, delete, reorder)
  - Test barcode configuration
  - Test integration settings (Cloudinary, Switchboard)
  - Verify all event configuration features work correctly
  - _Requirements: 12.3_

- [ ] 5.6 Test role and permission management
  - Test creating a new role
  - Test editing an existing role
  - Test deleting a role
  - Test assigning permissions to roles
  - Test assigning users to roles
  - Verify role-based access control works correctly
  - _Requirements: 12.3_

- [ ] 5.7 Test image optimization and uploads
  - Test uploading images via Cloudinary
  - Test image optimization
  - Test image display in various sizes
  - Test credential printing with images
  - Verify all image functionality works correctly
  - _Requirements: 12.7_

- [ ] 5.8 Test database operations
  - Test all CRUD operations for attendees
  - Test all CRUD operations for custom fields
  - Test all CRUD operations for roles
  - Test all CRUD operations for users
  - Test Appwrite Realtime functionality
  - Verify all database operations work correctly
  - _Requirements: 12.6_

- [ ] 5.9 Verify performance improvements
  - Compare dev server startup time with baseline
  - Compare HMR speed with baseline
  - Compare production build time with baseline
  - Compare bundle size with baseline
  - Calculate percentage improvements
  - Verify improvements meet success criteria (≥20% dev startup, ≥30% HMR, ≥15% build time)
  - Document all performance metrics
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [ ] 5.10 Test Webpack fallback (optional)
  - Run `npm run build:webpack` to build with Webpack
  - Verify build completes successfully
  - Test that application works with Webpack build
  - Document any differences between Turbopack and Webpack builds
  - _Requirements: 2.5_

## Phase 6: Cleanup and Documentation

- [x] 6. Remove legacy files and code
  - Remove old `middleware.ts` or `middleware.js` file if renamed
  - Remove any Webpack-specific configuration files no longer needed
  - Remove any deprecated Next.js 15 polyfills or workarounds
  - Remove any backup files (`.backup`, `.old` extensions)
  - Remove any commented-out code related to Next.js 15 workarounds
  - Remove any temporary migration files
  - Remove any AMP-related code if present (AMP is deprecated in Next.js 16)
  - Clean `.next` directory and regenerate with Turbopack
  - _Requirements: 16.1, 16.2, 16.4, 16.5, 16.6, 16.8_

- [x] 6.1 Remove unused dependencies
  - Run `npm outdated` to check for outdated packages
  - Remove any unused npm dependencies
  - Remove any deprecated dependencies
  - Update any remaining outdated dependencies
  - Run `npm prune` to remove extraneous packages
  - _Requirements: 16.3_

- [x] 6.2 Update documentation
  - Update README.md with Next.js 16 information
  - Update any outdated documentation references to Next.js 15
  - Document all configuration changes made
  - Document all code changes made
  - Document all breaking changes and their resolutions
  - Document all new environment variables
  - _Requirements: 14.1, 14.2, 14.3, 14.5, 16.7_

- [x] 6.3 Create migration guide
  - Document step-by-step migration process
  - Document all issues encountered and solutions
  - Document performance improvements achieved
  - Document any known issues or limitations
  - Document recommendations for future migrations
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 6.4 Document rollback procedure
  - Create detailed rollback instructions
  - Document rollback triggers and decision criteria
  - Document rollback verification steps
  - Test rollback procedure
  - Document rollback test results
  - _Requirements: 14.4_

- [x] 6.5 Create team knowledge transfer materials
  - Document key changes for the development team
  - Document new Turbopack features and benefits
  - Document any new development workflows
  - Document troubleshooting tips
  - Schedule team training session if needed
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 6.6 Final verification and sign-off
  - Run final production build
  - Run final test suite
  - Verify all success criteria are met
  - Get stakeholder approval
  - Merge migration branch to main
  - Tag release as `nextjs-16-migration-complete`
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7, 12.8, 13.5_

## Notes

- Each task should be completed in order, as later tasks depend on earlier ones
- Test thoroughly after each phase before proceeding to the next
- If any critical issues are encountered, refer to the rollback procedure
- Document all issues and solutions for future reference
- Keep the team informed of progress and any blockers
- Use the Context7 MCP server to look up Next.js 16 documentation as needed during implementation

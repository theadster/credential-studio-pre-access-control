# Dependency Update Plan for Credential Studio

## Overview
This document outlines a safe, phased approach to updating dependencies while minimizing risk of breaking changes.

## Current Major Dependencies Analysis

### Critical Dependencies with Breaking Changes:
- **Tailwind CSS**: v3.4.13 → v4.x (MAJOR BREAKING CHANGES)
- **Next.js**: v14.2.15 → v15.x (requires React 19, async Dynamic APIs)
- **React**: v18.3.1 → v19.x (new JSX transform, removed APIs)
- **Prisma**: v5.22.0 → v6.x (Node.js version requirements, schema changes)

### Medium Risk Updates:
- **TypeScript**: v5.6.3 → v5.7.x (minor version)
- **Framer Motion**: v11.11.17 → v11.12.x (patch)
- **Lucide React**: v0.454.0 → v0.468.x (patch)

### Low Risk Updates (Patch/Minor):
- **date-fns**: v4.1.0 → v4.2.x
- **@hookform/resolvers**: v3.9.1 → v3.10.x
- **@dnd-kit/sortable**: v8.0.0 → v8.1.x

## Backup Strategy

### 1. Version Control Backup
```bash
# Create a backup branch before starting
git checkout -b backup/pre-dependency-update
git push origin backup/pre-dependency-update

# Create a working branch for updates
git checkout -b feature/dependency-updates
```

### 2. Package Lock Backup
```bash
# Backup current lock files
cp package-lock.json package-lock.json.backup
cp package.json package.json.backup
```

### 3. Database Backup (if applicable)
```bash
# If using local database, backup before Prisma updates
npx prisma db push --preview-feature
# Or export current schema
npx prisma db pull --print > schema.backup.prisma
```

## Phased Update Plan

### Phase 1: Low-Risk Updates (Patch/Minor versions)
**Target**: Update dependencies with minimal breaking change risk

**Dependencies to update**:
- date-fns: 4.1.0 → 4.2.x
- @hookform/resolvers: 3.9.1 → 3.10.x
- @dnd-kit/sortable: 8.0.0 → 8.1.x
- lucide-react: 0.454.0 → 0.468.x
- framer-motion: 11.11.17 → 11.12.x

**Commands**:
```bash
npm update date-fns @hookform/resolvers @dnd-kit/sortable lucide-react framer-motion
```

**Testing checklist**:
- [ ] Application starts without errors
- [ ] All pages load correctly
- [ ] Forms and interactions work
- [ ] No console errors
- [ ] Build process completes successfully

### Phase 2: Medium-Risk Updates
**Target**: TypeScript and other development dependencies

**Dependencies to update**:
- TypeScript: 5.6.3 → 5.7.x
- ESLint related packages
- Development tools

**Testing checklist**:
- [ ] TypeScript compilation succeeds
- [ ] No new type errors
- [ ] ESLint rules still work
- [ ] Build and dev processes work

### Phase 3: Major Updates (High Risk - Separate branches)
**Target**: React 19, Next.js 15, Prisma 6, Tailwind CSS 4

#### 3a. React 19 Update
**Prerequisites**:
- Ensure new JSX transform is enabled
- Update @types/react and @types/react-dom
- Review usage of deprecated APIs

**Breaking changes to address**:
- Remove propTypes usage (migrate to TypeScript)
- Update error handling patterns
- Check for Legacy Context usage

#### 3b. Next.js 15 Update
**Prerequisites**:
- React 19 must be updated first
- Review async Dynamic APIs usage

**Breaking changes to address**:
- Update useFormState to useActionState
- Handle async cookies(), headers(), params, searchParams
- Review caching behavior changes

#### 3c. Prisma 6 Update
**Prerequisites**:
- Node.js 18.18.0+ (check current version)
- TypeScript 5.1.0+

**Breaking changes to address**:
- Replace Buffer with Uint8Array for Bytes fields
- Update NotFoundError handling to PrismaClientKnownRequestError
- Handle PostgreSQL m-n relation schema changes
- Update fullTextSearch preview feature for PostgreSQL

#### 3d. Tailwind CSS 4 Update (POSTPONE)
**Recommendation**: **DO NOT UPDATE** to Tailwind CSS v4 yet

**Reasons**:
- Major color name changes will break existing styles
- New CSS-first configuration system
- Requires manual migration of JavaScript-based config
- Browser version requirements may not be met

**Alternative**: Stay on Tailwind CSS 3.x and update to latest 3.x version

## Testing Strategy

### Automated Testing
```bash
# Run existing tests after each phase
npm test
npm run build
npm run lint
```

### Manual Testing Checklist
- [ ] Homepage loads correctly
- [ ] User authentication works
- [ ] Forms submit properly
- [ ] Database operations function
- [ ] Styling appears correct
- [ ] Mobile responsiveness maintained
- [ ] No console errors in browser

### Rollback Plan
```bash
# If issues occur, rollback to backup
git checkout backup/pre-dependency-update
# Or restore package files
cp package.json.backup package.json
cp package-lock.json.backup package-lock.json
npm install
```

## Risk Assessment

### High Risk (Postpone or careful planning)
- ❌ **Tailwind CSS v4**: Major breaking changes, postpone
- ⚠️ **React 19**: Requires careful migration, test thoroughly
- ⚠️ **Next.js 15**: Depends on React 19, async API changes
- ⚠️ **Prisma 6**: Node.js version requirements, schema changes

### Medium Risk (Manageable)
- ✅ **TypeScript 5.7**: Minor version, should be safe
- ✅ **Development dependencies**: Usually safe to update

### Low Risk (Safe to update)
- ✅ **Patch versions**: date-fns, @hookform/resolvers, etc.
- ✅ **Minor versions**: Most utility libraries

## Recommended Immediate Actions

1. **Start with Phase 1**: Update low-risk dependencies first
2. **Test thoroughly** after Phase 1
3. **Plan Phase 3 carefully**: Major updates need dedicated time
4. **Skip Tailwind CSS v4**: Too risky for now, stay on v3.x
5. **Consider Node.js version**: May need to upgrade for Prisma 6

## Timeline Estimate

- **Phase 1 (Low-risk)**: 1-2 hours
- **Phase 2 (Medium-risk)**: 2-4 hours
- **Phase 3 (High-risk)**: 1-2 days per major dependency

**Total estimated time**: 1-2 weeks for complete update (excluding Tailwind v4)

---

*Created: $(date)*
*Last updated: $(date)*
---
title: Package Updates Quick Reference
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 90
related_code: ["package.json"]
---

# Package Updates Quick Reference

## TL;DR - Safe Updates to Apply Now

### Immediate (Patch Updates - Zero Risk)

```bash
npm update @testing-library/react @types/react happy-dom lucide-react next react react-dom recharts eslint-config-next
npm install
npm run test
```

**What's included:**
- Bug fixes for React, Next.js, and testing libraries
- Icon library updates
- Chart library improvements
- ESLint configuration updates

**Time to apply:** 5 minutes
**Risk level:** None
**Testing required:** Run `npm run test`

---

### This Week (Type Definitions - Low Risk)

```bash
npm install @types/node@^25.0.10
npm run build
npm run lint
```

**What's included:**
- Updated Node.js type definitions
- Better TypeScript support

**Time to apply:** 5 minutes
**Risk level:** Low (type-only changes)
**Testing required:** Run `npm run build` and `npm run lint`

---

## Updates to Plan For Later

| Package | Current | Latest | Priority | Reason |
|---------|---------|--------|----------|--------|
| `node-appwrite` | 20.3.0 | 21.1.0 | High | Backend SDK - test integration |
| `framer-motion` | 11.18.2 | 12.29.2 | Medium | Animation library - test UI |
| `@hookform/resolvers` | 3.10.0 | 5.2.2 | Low | Major jump - defer |
| `@dnd-kit/sortable` | 8.0.0 | 10.0.0 | Low | Major jump - defer |
| `react-resizable-panels` | 3.0.6 | 4.5.3 | Low | Major jump - defer |
| `tailwindcss` | 3.4.19 | 4.1.18 | Low | Major jump - defer |
| `zod` | 3.25.76 | 4.3.6 | Low | Major jump - defer |
| `date-fns` | 3.6.0 | 4.1.0 | Low | Major jump - defer |

---

## Full Verification After Updates

```bash
# Run all tests
npm run test

# Check for type errors
npm run build

# Lint code
npm run lint

# Check coverage
npm run test:coverage

# Manual testing
npm run dev
```

---

## If Something Breaks

```bash
# Revert the update
npm install package-name@previous-version

# Reinstall
npm install

# Verify
npm run test
```

---

## See Also

- [Package Updates Analysis](./PACKAGE_UPDATES_ANALYSIS.md) - Detailed breakdown of all updates
- [Vitest 4.0.18 Upgrade Summary](../migration/VITEST_4_UPGRADE_SUMMARY.md) - Recent Vitest upgrade

---
title: Resizable Component Ref Override Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-01-30
review_interval_days: 90
related_code: ["src/components/ui/resizable.tsx"]
---

# Resizable Component Ref Override Fix

## Issues

Three ref handling vulnerabilities were identified in the resizable component wrapper:

### 1. ResizablePanelGroup - groupRef Override

The `ResizablePanelGroup` component's forwarded ref could be overridden by a user-supplied `groupRef` prop due to prop spreading order.

### 2. ResizableHandle - elementRef Override

The `ResizableHandle` component's forwarded ref could be overridden by a user-supplied `elementRef` prop due to prop spreading order.

### 3. ResizableHandle - elementRef Prop Swallowing

The `ResizableHandle` component was discarding caller-provided `elementRef` props instead of forwarding them, preventing explicit ref passing via props.

## Root Cause

**Issues 1 & 2:** Both components were spreading `...props` after setting their respective ref props, allowing caller-provided refs to override the forwarded refs.

**Issue 3:** The fix for issue 2 discarded `elementRef` entirely (`elementRef: _`), preventing callers from passing refs via props.

## Solution

**ResizablePanelGroup:** Extract `groupRef` from destructuring to prevent override:
```tsx
const ResizablePanelGroup = forwardRef<...>(({ className, groupRef: _, ...props }, ref) => (
  <Group groupRef={ref} {...props} />
))
```

**ResizableHandle:** Forward caller-provided `elementRef` with fallback to forwarded ref:
```tsx
const ResizableHandle = forwardRef<...>(({ withHandle, className, children, elementRef, ...props }, ref) => (
  <Separator elementRef={elementRef ?? ref} {...props}>
    {/* content */}
  </Separator>
))
```

This allows:
- Callers to pass `elementRef` as a prop: `<ResizableHandle elementRef={myRef} />`
- Callers to use ref forwarding: `<ResizableHandle ref={myRef} />`
- Forwarded ref takes precedence when both are provided

## Impact

- **Severity**: Medium - Affects ref forwarding reliability and flexibility
- **Files Modified**: `src/components/ui/resizable.tsx`
- **Components Fixed**: ResizablePanelGroup, ResizableHandle
- **Breaking Changes**: None - Bug fixes that improve ref handling
- **Testing**: Build verification passed

## Related Issues

- Code review comments: Multiple ref forwarding vulnerabilities
- Part of react-resizable-panels v4 migration fixes

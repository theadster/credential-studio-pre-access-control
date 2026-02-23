---
title: Duplicate Action Reentrancy Disable Logic Fix
type: canonical
status: active
owner: "@team"
last_verified: 2025-02-23
review_interval_days: 90
related_code:
  - src/pages/dashboard.tsx
---

# Duplicate Action Reentrancy Disable Logic Fix

## Issue

The Duplicate action had inconsistent reentrancy/disable logic that caused silent no-ops when clicking duplicate for a different attendee while a duplication was already in progress.

**The Inconsistency:**
- Dropdown button disabled: `duplicatingAttendee === attendee.id` (exact match)
- Reentrancy guard: `if (duplicatingAttendee)` (any truthy value)

**The Problem:**
- If duplicating attendee A, the button for attendee A is disabled ✓
- But if duplicating attendee A, clicking the button for attendee B silently no-ops because the reentrancy guard blocks it ✗
- User receives no feedback that the action was blocked

## Root Cause

The disable condition only checked if the current attendee was being duplicated, not if ANY duplication was in progress. This allowed users to click the button for other attendees, but the reentrancy guard would silently reject the action.

## Solution

Changed the disable condition to match the reentrancy guard logic:

```typescript
// BEFORE (buggy)
disabled={duplicatingAttendee === attendee.id}

// AFTER (fixed)
disabled={!!duplicatingAttendee}
```

Now the button is disabled whenever ANY duplication is in progress, providing consistent UX and preventing silent no-ops.

## Impact

- **Scope**: Duplicate action dropdown menu item
- **Severity**: Medium - Silent failures degrade UX
- **User-facing**: Yes - Users now see disabled button instead of silent no-op
- **Performance**: None - No performance impact

## Testing

Verify the fix by:
1. Start duplicating attendee A
2. Attempt to click Duplicate on attendee B
3. Confirm the button is disabled (not clickable)
4. Confirm no silent no-op occurs

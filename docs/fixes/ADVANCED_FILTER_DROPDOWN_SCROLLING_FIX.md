---
title: "Advanced Filter Dropdown Scrolling Fix"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/AdvancedFilter.tsx"]
---

# Advanced Filter Dropdown Scrolling Fix

## Issue
When using the Advanced Filters dialog on the Attendee page, dropdown fields with many options (select type custom fields) were not scrollable. Users could only see a handful of options and couldn't scroll to view all available options.

## Root Cause
The issue occurred because the multi-select dropdown (Popover) was nested inside a scrollable Dialog. Wheel scroll events were bubbling up from the dropdown to the parent dialog's scroll container, preventing users from scrolling within the dropdown itself.

The problem had two components:
1. The Popover wasn't configured to trap interactions as a modal
2. The CommandList was using a plain div with `overflow-y-auto` which doesn't properly isolate scroll events

## Solution
Applied two key changes based on Radix UI best practices:

### 1. Added `modal={true}` to Popover
```tsx
<Popover modal={true}>
```
This tells Radix UI to treat the popover as a modal interaction, which properly traps and isolates events from reaching the underlying dialog.

### 2. Replaced CommandList with Radix ScrollArea
```tsx
<ScrollArea className="h-[300px]">
  <CommandList>
    {/* options */}
  </CommandList>
</ScrollArea>
```
Instead of using a plain div with `overflow-y-auto`, we now use Radix's ScrollArea component which provides proper scroll event isolation through its Viewport primitive, preventing wheel events from propagating to parent scroll containers.

## Changes Made

### File: `src/pages/dashboard.tsx`

1. **Added ScrollArea import:**
```tsx
import { ScrollArea } from "@/components/ui/scroll-area";
```

2. **Updated Popover configuration:**
```tsx
// Before
<Popover>

// After
<Popover modal={true}>
```

3. **Wrapped CommandList with ScrollArea:**
```tsx
// Before
<PopoverContent className="w-[300px] p-0 max-h-[var(--radix-popover-content-available-height)]" align="start">
  <Command>
    <CommandInput placeholder={`Search ${field.fieldName.toLowerCase()}...`} />
    <CommandList className="max-h-[min(300px,calc(var(--radix-popover-content-available-height)-3rem))]">
      {/* options */}
    </CommandList>
  </Command>
</PopoverContent>

// After
<PopoverContent className="w-[300px] p-0" align="start">
  <Command>
    <CommandInput placeholder={`Search ${field.fieldName.toLowerCase()}...`} />
    <ScrollArea className="h-[300px]">
      <CommandList>
        {/* options */}
      </CommandList>
    </ScrollArea>
  </Command>
</PopoverContent>
```

## Technical Details

### Why `modal={true}` Works
From Radix UI documentation, the `modal` prop on Popover.Root:
- Traps focus within the popover when open
- Prevents interaction with elements outside the popover
- Properly isolates pointer events from the underlying content
- Prevents scroll events from bubbling to parent containers

### Why ScrollArea Works
Radix's ScrollArea component:
- Uses a Viewport primitive that properly handles scroll containment
- Isolates scroll events within its boundaries
- Prevents wheel events from bubbling to parent scroll containers
- Provides consistent scrolling behavior across browsers

### The Problem with Plain Divs
Using a plain `div` with `overflow-y-auto`:
- Doesn't properly isolate scroll events
- Allows wheel events to bubble up to parent containers
- Can cause conflicts when nested in other scrollable containers
- Doesn't provide the same level of event isolation as Radix primitives

## Testing
To verify the fix:
1. Navigate to the Attendee page
2. Click "Advanced Filters"
3. Find a custom field with type "select" that has many options (10+)
4. Click the dropdown to open it
5. Use mouse wheel to scroll within the dropdown
6. Verify that:
   - The dropdown list scrolls properly
   - The parent dialog doesn't scroll
   - All options are accessible via scrolling

## Related Components
- `src/components/ui/popover.tsx` - Popover component (Radix UI wrapper)
- `src/components/ui/scroll-area.tsx` - ScrollArea component (Radix UI wrapper)
- `src/components/ui/command.tsx` - Command component (cmdk wrapper)

## Lessons Learned
1. When nesting interactive components (like Popovers) inside scrollable containers (like Dialogs), always use `modal={true}` to properly isolate interactions
2. Radix UI primitives (like ScrollArea) are specifically designed to handle complex nested scenarios and should be preferred over plain HTML elements with CSS overflow
3. Understanding the underlying component libraries (Radix UI) and their design patterns is crucial for handling nested interaction scenarios correctly
4. Scroll event propagation can be tricky in nested scrollable containers - always test thoroughly

## References
- [Radix UI Popover Documentation](https://www.radix-ui.com/primitives/docs/components/popover)
- [Radix UI ScrollArea Documentation](https://www.radix-ui.com/primitives/docs/components/scroll-area)
- Previous fix attempt logs in Kiro history

## Date
December 31, 2025

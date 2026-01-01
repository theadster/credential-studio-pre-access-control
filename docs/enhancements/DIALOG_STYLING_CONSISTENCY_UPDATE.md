---
title: "Dialog Styling Consistency Update"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/ui/dialog.tsx"]
---

# Dialog Styling Consistency Update

## Overview

Updated the styling of three key dialog boxes to match the consistent design system used throughout the dashboard and event settings. This ensures a unified visual experience across all popup windows in the application.

## Changes Made

### 1. Field Mapping Form Dialog (Add/Edit Field Mapping)

**File**: `src/components/EventSettingsForm/FieldMappingForm.tsx`

#### Before
- Basic dialog with minimal styling
- No header background color
- No consistent border styling
- Inconsistent padding and spacing

#### After
- **Header**: Light blue background (`#F1F5F9` light mode, `slate-800` dark mode)
- **Border**: 2px border with slate colors (`border-slate-200` light, `border-slate-700` dark)
- **Background**: White/slate-900 with shadow
- **Footer**: Matching header styling with border-top
- **Scrolling**: Full dialog scrolls (not just content area)
- **Typography**: Bold title with primary color and icon

**Styling Applied**:
```typescript
// DialogContent
className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0"

// DialogHeader
className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6"

// DialogTitle
className="text-2xl font-bold text-primary flex items-center gap-2"

// DialogFooter
className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800"
```

### 2. Custom Field Form Dialog (Add/Edit Custom Field)

**File**: `src/components/EventSettingsForm/CustomFieldForm.tsx`

#### Before
- Basic dialog with minimal styling
- No header background color
- No consistent border styling
- Inconsistent padding and spacing

#### After
- **Header**: Light blue background (`#F1F5F9` light mode, `slate-800` dark mode)
- **Border**: 2px border with slate colors (`border-slate-200` light, `border-slate-700` dark)
- **Background**: White/slate-900 with shadow
- **Footer**: Matching header styling with border-top
- **Scrolling**: Full dialog scrolls (not just content area)
- **Typography**: Bold title with primary color and icon

**Styling Applied**:
```typescript
// DialogContent
className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0"

// DialogHeader
className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6"

// DialogTitle
className="text-2xl font-bold text-primary flex items-center gap-2"

// DialogFooter
className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800"
```

### 3. Bulk Edit Dialog

**File**: `src/pages/dashboard.tsx`

#### Before
- Default dialog styling
- Center scrolling (only content area scrolled)
- No header background
- No consistent border styling
- Inconsistent with other dialogs
- Wide dialog (`max-w-2xl`)

#### After
- **Header**: Light blue background matching other dialogs
- **Border**: 2px border with slate colors
- **Background**: White/slate-900 with shadow
- **Footer**: Matching header styling with border-top
- **Scrolling**: Full dialog scrolls (removed center scroll)
- **Typography**: Bold title with primary color and icon (Wand2)
- **Size**: Narrowed to `max-w-xl` for better proportions

**Styling Applied**:
```typescript
// DialogContent
className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0"

// DialogHeader
className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6"

// DialogTitle
className="text-2xl font-bold text-primary flex items-center gap-2"

// Footer
className="flex justify-end space-x-2 px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800"
```

## Design System Consistency

All three dialogs now follow the same design pattern:

| Element | Styling |
|---------|---------|
| **Background** | `bg-white dark:bg-slate-900` |
| **Border** | `border-2 border-slate-200 dark:border-slate-700` |
| **Shadow** | `shadow-2xl` |
| **Header Background** | `bg-[#F1F5F9] dark:bg-slate-800` |
| **Header Border** | `border-b border-slate-200 dark:border-slate-700` |
| **Title** | `text-2xl font-bold text-primary` |
| **Footer Background** | `bg-[#F1F5F9] dark:bg-slate-800` |
| **Footer Border** | `border-t border-slate-200 dark:border-slate-700` |
| **Scrolling** | Full dialog scrolls (`overflow-y-auto` on DialogContent) |
| **Padding** | Header: `px-6 pt-6`, Content: `px-6 py-6`, Footer: `px-6 pb-6 pt-4` |

## Key Improvements

1. **Visual Consistency**: All dialogs now have the same header/footer styling
2. **Better Scrolling**: Removed center scroll from Bulk Edit - entire dialog scrolls smoothly
3. **Dark Mode Support**: All dialogs properly support dark mode with appropriate colors
4. **Professional Appearance**: Consistent borders, shadows, and spacing
5. **Icon Integration**: Dialogs include relevant icons (Settings for Custom Field, Wand2 for Bulk Edit)
6. **Accessibility**: Proper semantic structure with DialogHeader, DialogTitle, DialogDescription

## Files Modified

1. **src/components/EventSettingsForm/FieldMappingForm.tsx**
   - Updated DialogContent styling
   - Updated DialogHeader styling
   - Updated DialogFooter styling
   - Removed flex-col from form (now handled by DialogContent overflow)

2. **src/components/EventSettingsForm/CustomFieldForm.tsx**
   - Updated DialogContent styling
   - Updated DialogHeader styling
   - Updated DialogFooter styling
   - Removed flex-col from form (now handled by DialogContent overflow)

3. **src/pages/dashboard.tsx**
   - Updated Bulk Edit DialogContent styling (narrowed from `max-w-2xl` to `max-w-xl`)
   - Updated Bulk Edit DialogHeader styling
   - Updated Bulk Edit DialogFooter styling
   - Removed center scroll (max-h-[60vh] on content div)
   - Added Wand2 icon to title

## Testing Checklist

- ✅ Custom Field Add dialog displays with new styling
- ✅ Custom Field Edit dialog displays with new styling
- ✅ Bulk Edit dialog displays with new styling
- ✅ All dialogs have matching header/footer colors
- ✅ All dialogs have proper borders and shadows
- ✅ Full dialog scrolls (not just content area)
- ✅ Dark mode works correctly for all dialogs
- ✅ Icons display properly in titles
- ✅ Footer buttons are properly aligned
- ✅ No layout issues or overflow problems

## All Updated Dialogs

The following dialogs now all follow the same consistent styling pattern:

1. **Field Mapping Form** - Add/Edit Field Mapping dialogs
2. **Custom Field Form** - Add/Edit Custom Field dialogs
3. **Bulk Edit Dialog** - Bulk edit attendees dialog
4. **QR Code Modal** - Already styled consistently
5. **Event Settings Dialog** - Already styled consistently
6. Other dashboard dialogs

## Benefits

1. **Unified User Experience**: Users see consistent styling across all dialogs
2. **Professional Look**: Polished appearance with proper spacing and colors
3. **Better Usability**: Full dialog scrolling is more intuitive than center scrolling
4. **Maintainability**: Consistent styling makes future updates easier
5. **Dark Mode**: Proper support for both light and dark themes

## Notes

- All dialogs now use `p-0` on DialogContent to allow custom padding on header/footer
- Header and footer have matching background colors for visual balance
- Content area has consistent padding (`px-6 py-6`)
- Scrolling is handled at the DialogContent level for smooth experience
- Icons are included in titles for better visual identification

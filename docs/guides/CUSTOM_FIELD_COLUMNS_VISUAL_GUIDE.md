---
title: "Custom Field Columns - Visual Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/AttendeeList.tsx"]
---

# Custom Field Columns - Visual Guide

## Overview

This visual guide helps you understand how the Custom Field Columns setting affects the layout of custom fields on the Attendees page.

## Setting Location

```
Dashboard
  └── Settings Tab
      └── Edit Settings Button
          └── General Tab
              └── Attendee List Settings Section
                  └── Custom Field Columns (Desktop) Dropdown
```

## Visual Examples

### Example 1: 3 Columns (Compact Screens)

**Best for**: Small monitors (1366x768), maximum readability

```
┌─────────────────────────────────────────────────────────────┐
│ Attendee: John Doe                                          │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Company      │ │ Department   │ │ Job Title    │        │
│ │ Acme Corp    │ │ Engineering  │ │ Developer    │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │
│ │ Badge Type   │ │ Meal Pref    │ │ T-Shirt Size │        │
│ │ VIP          │ │ Vegetarian   │ │ Large        │        │
│ └──────────────┘ └──────────────┘ └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Large, readable fields
- More vertical space used
- Less horizontal density
- Ideal for smaller screens

---

### Example 2: 5 Columns (Balanced)

**Best for**: Standard laptops (1440x900 - 1600x900)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Attendee: John Doe                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ Company  │ │ Dept     │ │ Job      │ │ Badge    │ │ Meal     │     │
│ │ Acme     │ │ Eng      │ │ Dev      │ │ VIP      │ │ Veg      │     │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐     │
│ │ T-Shirt  │ │ Phone    │ │ Email    │ │ Country  │ │ City     │     │
│ │ Large    │ │ 555-0100 │ │ j@a.com  │ │ USA      │ │ NYC      │     │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘     │
└─────────────────────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Good balance of readability and density
- Moderate vertical space
- Good horizontal utilization
- Recommended for most users

---

### Example 3: 7 Columns (Default)

**Best for**: Standard monitors (1920x1080)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ Attendee: John Doe                                                                       │
├──────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│ │Company │ │Dept    │ │Job     │ │Badge   │ │Meal    │ │Shirt   │ │Phone   │          │
│ │Acme    │ │Eng     │ │Dev     │ │VIP     │ │Veg     │ │Large   │ │555-0100│          │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐          │
│ │Email   │ │Country │ │City    │ │State   │ │Zip     │ │Notes   │ │Status  │          │
│ │j@a.com │ │USA     │ │NYC     │ │NY      │ │10001   │ │VIP     │ │Active  │          │
│ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘ └────────┘          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Default setting (original behavior)
- Good for most standard monitors
- Balanced density and readability
- Proven layout

---

### Example 4: 10 Columns (Maximum Density)

**Best for**: Ultra-wide monitors (3440x1440 or larger)

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Attendee: John Doe                                                                                             │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                  │
│ │Co    │ │Dept  │ │Job   │ │Badge │ │Meal  │ │Shirt │ │Phone │ │Email │ │Ctry  │ │City  │                  │
│ │Acme  │ │Eng   │ │Dev   │ │VIP   │ │Veg   │ │L     │ │555   │ │j@a   │ │USA   │ │NYC   │                  │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                  │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                                                 │
│ │State │ │Zip   │ │Notes │ │Status│ │Type  │                                                                 │
│ │NY    │ │10001 │ │VIP   │ │Act   │ │Std   │                                                                 │
│ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘                                                                 │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Characteristics**:
- Maximum information density
- Compact fields
- Minimal vertical space
- Best for large displays with many fields

---

## Responsive Behavior Visualization

### Desktop (> 1024px) - Uses Your Setting

```
┌─────────────────────────────────────────────────────────────┐
│                    DESKTOP VIEW                              │
│              (Uses Configured Setting)                       │
│                                                              │
│  [Field] [Field] [Field] [Field] [Field] [Field] [Field]   │
│  [Field] [Field] [Field] [Field] [Field] [Field] [Field]   │
│                                                              │
│  ← Configured number of columns (3-10) →                    │
└─────────────────────────────────────────────────────────────┘
```

### Tablet (768px - 1024px) - Fixed Responsive

```
┌──────────────────────────────────────┐
│         TABLET VIEW                  │
│    (Fixed Responsive Layout)         │
│                                      │
│  [Field] [Field] [Field] [Field]    │
│  [Field] [Field] [Field] [Field]    │
│                                      │
│  ← Max 4 columns (responsive) →     │
└──────────────────────────────────────┘
```

### Mobile (< 768px) - Single Column

```
┌──────────────────┐
│   MOBILE VIEW    │
│  (Single Column) │
│                  │
│    [Field]       │
│    [Field]       │
│    [Field]       │
│    [Field]       │
│    [Field]       │
│                  │
│  ← 1 column →    │
└──────────────────┘
```

## Configuration UI

### Event Settings Form

```
┌─────────────────────────────────────────────────────────────┐
│ Event Settings                                         [×]   │
├─────────────────────────────────────────────────────────────┤
│ [General] [Custom Fields] [Barcode] [Integrations]         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌─────────────────────────────────────────────────────┐    │
│ │ Attendee List Settings                              │    │
│ ├─────────────────────────────────────────────────────┤    │
│ │                                                      │    │
│ │ Sort By:              [Last Name ▼]                 │    │
│ │ Sort Direction:       [Ascending ▼]                 │    │
│ │                                                      │    │
│ │ Custom Field Columns (Desktop):                     │    │
│ │ [7 Columns (Default) ▼]                             │    │
│ │                                                      │    │
│ │ Number of custom field columns to display before    │    │
│ │ wrapping to the next line on large screens. Adjust  │    │
│ │ based on your screen resolution.                    │    │
│ └─────────────────────────────────────────────────────┘    │
│                                                              │
│                                    [Cancel] [Save Settings] │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown Options

```
┌──────────────────────────────┐
│ 3 Columns                    │
│ 4 Columns                    │
│ 5 Columns                    │
│ 6 Columns                    │
│ 7 Columns (Default)      ✓   │
│ 8 Columns                    │
│ 9 Columns                    │
│ 10 Columns                   │
└──────────────────────────────┘
```

## Decision Tree

```
                    How many columns should I use?
                                 │
                                 ▼
                    What's my screen resolution?
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
              Small (≤1440)  Standard    Large (≥2560)
              1366x768       1920x1080   3440x1440
                    │            │            │
                    ▼            ▼            ▼
              Use 3-5 cols   Use 6-7 cols  Use 8-10 cols
                    │            │            │
                    ▼            ▼            ▼
              ┌─────────┐  ┌─────────┐  ┌─────────┐
              │ Better  │  │Balanced │  │ Maximum │
              │Readable │  │ Layout  │  │ Density │
              └─────────┘  └─────────┘  └─────────┘
```

## Before and After Comparison

### Before (Hardcoded 7 Columns)

```
Small Monitor (1366x768):
┌────────────────────────────────────────────────────┐
│ [F] [F] [F] [F] [F] [F] [F]  ← Cramped!           │
│ [F] [F] [F] [F] [F] [F] [F]                       │
└────────────────────────────────────────────────────┘

Large Monitor (3440x1440):
┌────────────────────────────────────────────────────────────────────────┐
│ [Field] [Field] [Field] [Field] [Field] [Field] [Field]               │
│                                                                         │
│                    ← Wasted space! →                                   │
└────────────────────────────────────────────────────────────────────────┘
```

### After (Configurable)

```
Small Monitor (1366x768) - Set to 5 columns:
┌────────────────────────────────────────────────────┐
│ [Field] [Field] [Field] [Field] [Field]           │
│ [Field] [Field] [Field] [Field] [Field]           │
│                    ← Perfect! →                    │
└────────────────────────────────────────────────────┘

Large Monitor (3440x1440) - Set to 9 columns:
┌────────────────────────────────────────────────────────────────────────┐
│ [F] [F] [F] [F] [F] [F] [F] [F] [F]  ← Optimized! │
│ [F] [F] [F] [F] [F] [F] [F] [F] [F]               │
└────────────────────────────────────────────────────────────────────────┘
```

## Field Count Impact

### With 5 Visible Custom Fields

```
3 Columns:          5 Columns:          7 Columns:
┌──┬──┬──┐         ┌─┬─┬─┬─┬─┐         ┌─┬─┬─┬─┬─┬─┬─┐
│1 │2 │3 │         │1│2│3│4│5│         │1│2│3│4│5│ │ │
│4 │5 │  │         └─┴─┴─┴─┴─┘         └─┴─┴─┴─┴─┴─┴─┘
└──┴──┴──┘         
2 rows              1 row               1 row
```

### With 15 Visible Custom Fields

```
3 Columns:          5 Columns:          7 Columns:
┌──┬──┬──┐         ┌─┬─┬─┬─┬─┐         ┌─┬─┬─┬─┬─┬─┬─┐
│1 │2 │3 │         │1│2│3│4│5│         │1│2│3│4│5│6│7│
│4 │5 │6 │         │6│7│8│9│A│         │8│9│A│B│C│D│E│
│7 │8 │9 │         │B│C│D│E│F│         │F│ │ │ │ │ │ │
│A │B │C │         └─┴─┴─┴─┴─┘         └─┴─┴─┴─┴─┴─┴─┘
│D │E │F │         
└──┴──┴──┘         3 rows              3 rows
5 rows
```

## Tips for Choosing

### Consider Your Use Case

**Many Short Fields** (e.g., checkboxes, status):
→ Use higher column count (8-10)

**Few Long Fields** (e.g., text, URLs):
→ Use lower column count (3-5)

**Mixed Field Types**:
→ Use balanced setting (6-7)

### Test Different Settings

1. Start with default (7)
2. If cramped → reduce to 5-6
3. If too spread out → increase to 8-9
4. Find your sweet spot

### Team Considerations

If multiple people use the system:
- Choose based on smallest common screen
- Balance between readability and density
- Consider most common use case

## Summary

The Custom Field Columns setting gives you control over how your custom fields are displayed, allowing you to optimize the layout for your specific screen size and preferences. Experiment with different values to find what works best for your setup!

**Quick Recommendations**:
- **Small screens**: 3-5 columns
- **Standard screens**: 6-7 columns (default)
- **Large screens**: 8-10 columns

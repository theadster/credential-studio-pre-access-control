---
title: "Attendees UI Improvements"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/AttendeeList.tsx", "src/components/AttendeeForm.tsx"]
---

# Attendees UI Improvements

## Overview
Enhanced the Attendees page with two key UI improvements to make bulk operations and navigation more efficient.

## Changes Implemented

### 1. Advanced Search Record Count
**Location:** Advanced Search Active alert banner

**What it does:**
- Displays the number of records matching the current advanced search filters
- Shows as "X records found" next to the filter count badge
- Updates dynamically as filters change
- Uses natural language (e.g., "1 record found" vs "5 records found")

**Benefits:**
- Immediate feedback on how many records match your search criteria
- Helps users understand the scope before performing bulk operations
- Natural integration with existing filter count display

### 2. Page Jump Feature
**Location:** Attendees pagination controls

**What it does:**
- Adds a "Jump to Page" button (# icon) next to the pagination controls
- Opens a dialog where users can enter a specific page number
- Validates input to ensure it's within valid range (1 to total pages)
- Supports Enter key to quickly jump to the entered page

**Benefits:**
- Quick navigation to specific pages without clicking through pagination
- Especially useful for large datasets with many pages
- Keyboard-friendly with Enter key support

### 3. Select All Dialog
**Location:** Attendees table header checkbox

**What it does:**
- When clicking the "select all" checkbox and there are more than 25 records:
  - Shows a dialog with two options:
    1. **Current Page Only** - Selects just the 25 records on the current page
    2. **All Matching Records** - Selects all records matching current filters/search
- If there are 25 or fewer records, behaves as before (selects all immediately)
- Deselecting still works the same way (clears selection on current page)

**Benefits:**
- Makes bulk operations much easier for large datasets
- Clear distinction between page-level and dataset-level selection
- Works with search filters - can select all matching search results
- Prevents accidental bulk operations on entire dataset

## Technical Details

### New State Variables
```typescript
const [showSelectAllDialog, setShowSelectAllDialog] = useState(false);
const [showPageJumpDialog, setShowPageJumpDialog] = useState(false);
const [pageJumpInput, setPageJumpInput] = useState("");
```

### Modified Components
- **Checkbox handler**: Updated to show dialog when selecting and more than one page exists
- **Pagination controls**: Added page jump button with Hash icon
- **New dialogs**: Two new Dialog components for select all and page jump functionality

### User Experience
- Both features use shadcn/ui Dialog components for consistency
- Clear descriptions and visual feedback
- Validation prevents invalid page numbers
- Keyboard shortcuts (Enter key) for efficiency

## Usage Examples

### Advanced Search Record Count
1. Navigate to Attendees page
2. Click "Advanced Search" button
3. Apply filters (e.g., filter by first name, photo status, custom fields)
4. See "Advanced Search Active" banner showing:
   - Number of active filters
   - Number of records found (e.g., "42 records found")

### Page Jump
1. Navigate to Attendees page with multiple pages
2. Click the # button next to pagination controls
3. Enter desired page number (e.g., "15")
4. Press Enter or click "Go to Page"

### Select All
1. Navigate to Attendees page with more than 25 records
2. Click the checkbox in the table header
3. Choose between:
   - "Select Page" - for current 25 records
   - "Select All" - for all matching records
4. Perform bulk operations (edit, delete, export, etc.)

## Testing Recommendations

1. **Advanced Search Record Count**:
   - Test with various filter combinations
   - Verify count updates when filters change
   - Test with 0 results, 1 result, and many results
   - Verify singular/plural grammar ("1 record" vs "2 records")

2. **Page Jump**:
   - Test with valid page numbers
   - Test with invalid numbers (0, negative, beyond total pages)
   - Test Enter key functionality
   - Test cancel button

3. **Select All**:
   - Test with < 25 records (should select immediately)
   - Test with > 25 records (should show dialog)
   - Test with search filters active
   - Test deselection behavior
   - Test bulk operations after selecting all

## Files Modified
- `src/pages/dashboard.tsx` - Main implementation

## Design Consistency
- Uses existing shadcn/ui components (Dialog, Button, Input, Label)
- Follows application's visual design system
- Maintains accessibility standards
- Consistent with other dialogs in the application

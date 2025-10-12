# SweetAlert2 Progress Modals Enhancement

## Overview
Replaced the standard Dialog-based progress modals with custom SweetAlert2 progress modals for credential generation and PDF export operations. The new modals provide a consistent, themed appearance that matches the site's aesthetic and color scheme.

## Changes Made

### 1. New Progress Modal Utility (`src/lib/sweetalert-progress.ts`)

Created a reusable utility for showing progress modals with SweetAlert2:

**Features:**
- Real-time progress bar with percentage display
- Current/total count display
- Current item name display
- Themed to match site colors (light/dark mode support)
- Smooth animations and transitions
- Non-dismissible (prevents accidental closure)

**API:**
```typescript
// Show progress modal and get update function
const updateProgress = showProgressModal(isDark);

// Update progress
updateProgress({
  title: 'Processing...',
  text: 'Description text',
  current: 5,
  total: 10,
  currentItemName: 'Item Name' // optional
});

// Close modal
closeProgressModal();
```

### 2. Dashboard Updates (`src/pages/dashboard.tsx`)

#### Added Dark Mode Detection
```typescript
const [isDark, setIsDark] = useState(false);

useEffect(() => {
  const checkDarkMode = () => {
    setIsDark(document.documentElement.classList.contains('dark'));
  };
  
  checkDarkMode();
  
  const observer = new MutationObserver(checkDarkMode);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
  
  return () => observer.disconnect();
}, []);
```

#### Updated Functions

**1. Single Credential Generation (`handleGenerateCredential`)**
- Replaced Dialog modal with SweetAlert2 progress modal
- Shows attendee name being processed
- Displays progress (0/1 to 1/1)
- Automatically closes on completion or error

**2. Bulk Credential Generation (`handleBulkGenerateCredentials`)**
- Replaced Dialog modal with SweetAlert2 progress modal
- Shows real-time progress with percentage
- Displays current attendee being processed
- Updates progress bar as each credential is generated
- Shows final success/error summary after completion

**3. Bulk PDF Export (`handleBulkExportPdf`)**
- Replaced Dialog modal with SweetAlert2 progress modal
- Shows number of attendees being processed
- Displays progress during PDF generation
- Automatically closes when PDF is ready

#### Removed Components
- Removed `showPdfGenerationModal` state
- Removed `showCredentialGenerationModal` state
- Removed `showBulkCredentialModal` state
- Removed `credentialGenerationAttendeeName` state
- Removed `bulkCredentialProgress` state
- Removed all three Dialog-based progress modals from JSX

### 3. Styling & Theme Integration

The progress modals automatically adapt to the site's theme:

**Light Mode:**
- Uses `--primary` color for progress bar
- Uses `--secondary` color for progress bar background
- Uses `--muted-foreground` for text
- Uses `--card` and `--card-foreground` for modal background

**Dark Mode:**
- Automatically switches to dark theme colors
- Maintains consistent appearance with rest of the application

**Progress Bar Styling:**
```html
<div class="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
  <div class="bg-primary h-2.5 rounded-full transition-all duration-300" 
       style="width: X%">
  </div>
</div>
```

## Benefits

1. **Consistent UI/UX**: All progress modals now use the same SweetAlert2 system as other notifications
2. **Better Theming**: Automatically adapts to light/dark mode
3. **Improved Aesthetics**: Matches the site's color scheme and design language
4. **Cleaner Code**: Removed duplicate modal components
5. **Better User Feedback**: Real-time progress updates with percentage and current item
6. **Reusable**: The progress modal utility can be used for other operations

## Visual Features

- **Smooth Animations**: Fade-in/zoom-in on open, fade-out/zoom-out on close
- **Progress Bar**: Animated width transitions (300ms duration)
- **Percentage Display**: Shows completion percentage (0-100%)
- **Count Display**: Shows "X of Y" format
- **Current Item**: Displays name of item being processed
- **Warning Text**: "Please do not navigate away from this page"

## Usage Example

```typescript
// Start progress
const updateProgress = showProgressModal(isDark);
updateProgress({
  title: 'Processing Items',
  text: 'Please wait...',
  current: 0,
  total: items.length,
});

// Update during processing
for (let i = 0; i < items.length; i++) {
  updateProgress({
    title: 'Processing Items',
    text: 'Please wait...',
    current: i + 1,
    total: items.length,
    currentItemName: items[i].name
  });
  
  await processItem(items[i]);
}

// Close when done
closeProgressModal();
```

## Testing Recommendations

1. **Single Credential Generation**
   - Generate credential for one attendee
   - Verify progress modal appears with attendee name
   - Verify modal closes automatically on success
   - Verify modal closes on error with error message

2. **Bulk Credential Generation**
   - Select multiple attendees
   - Generate credentials in bulk
   - Verify progress bar updates correctly
   - Verify current attendee name updates
   - Verify percentage calculation is accurate
   - Test with different quantities (2, 5, 10+ attendees)

3. **Bulk PDF Export**
   - Select multiple attendees with credentials
   - Export PDFs
   - Verify progress modal shows correct count
   - Verify modal closes when PDF is ready
   - Verify PDF opens in new tab

4. **Theme Switching**
   - Test in light mode
   - Switch to dark mode during operation
   - Verify colors adapt correctly
   - Test in dark mode
   - Switch to light mode during operation

5. **Error Handling**
   - Test with invalid data
   - Test with network errors
   - Verify modal closes on error
   - Verify error messages display correctly

## Files Modified

- `src/lib/sweetalert-progress.ts` (NEW)
- `src/pages/dashboard.tsx` (MODIFIED)

## Dependencies

- `sweetalert2` (already installed)
- Uses existing SweetAlert2 theme configuration from `src/lib/sweetalert-config.ts`

## Status

✅ **COMPLETE** - All progress modals have been successfully migrated to SweetAlert2 with full theme support and improved user experience.

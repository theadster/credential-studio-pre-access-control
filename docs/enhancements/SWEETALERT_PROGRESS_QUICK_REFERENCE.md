---
title: "SweetAlert2 Progress Modal - Quick Reference"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/sweetAlertUtils.ts"]
---

# SweetAlert2 Progress Modal - Quick Reference

## Import

```typescript
import { showProgressModal, closeProgressModal } from '@/lib/sweetalert-progress';
```

## Basic Usage

```typescript
// 1. Detect dark mode
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

// 2. Show progress modal
const updateProgress = showProgressModal(isDark);

// 3. Update progress
updateProgress({
  title: 'Processing...',
  text: 'Please wait...',
  current: 5,
  total: 10,
  currentItemName: 'Item 5' // optional
});

// 4. Close when done
closeProgressModal();
```

## API Reference

### `showProgressModal(isDark: boolean)`

Shows a progress modal and returns an update function.

**Parameters:**
- `isDark` (boolean) - Whether dark mode is active

**Returns:**
- Update function that accepts `ProgressOptions`

### `updateProgress(options: ProgressOptions)`

Updates the progress modal.

**ProgressOptions:**
```typescript
{
  title: string;           // Modal title
  text?: string;           // Description text (optional)
  current: number;         // Current progress (e.g., 5)
  total: number;           // Total items (e.g., 10)
  currentItemName?: string; // Name of current item (optional)
}
```

### `closeProgressModal()`

Closes the progress modal.

**Parameters:** None  
**Returns:** void

## Examples

### Single Item Processing

```typescript
const updateProgress = showProgressModal(isDark);
updateProgress({
  title: 'Generating Credential',
  text: 'Processing credential...',
  current: 1,
  total: 1,
  currentItemName: 'John Doe'
});

try {
  await generateCredential(attendeeId);
  closeProgressModal();
  success('Success', 'Credential generated!');
} catch (error) {
  closeProgressModal();
  error('Error', error.message);
}
```

### Bulk Processing with Loop

```typescript
const updateProgress = showProgressModal(isDark);

for (let i = 0; i < items.length; i++) {
  updateProgress({
    title: 'Processing Items',
    text: 'Please wait...',
    current: i + 1,
    total: items.length,
    currentItemName: items[i].name
  });
  
  try {
    await processItem(items[i]);
  } catch (error) {
    console.error(`Failed to process ${items[i].name}:`, error);
  }
}

closeProgressModal();
success('Complete', `Processed ${items.length} items`);
```

### With Error Handling

```typescript
const updateProgress = showProgressModal(isDark);
let successCount = 0;
let errorCount = 0;

try {
  for (let i = 0; i < items.length; i++) {
    updateProgress({
      title: 'Processing Items',
      current: i + 1,
      total: items.length,
      currentItemName: items[i].name
    });
    
    try {
      await processItem(items[i]);
      successCount++;
    } catch (err) {
      errorCount++;
    }
  }
  
  closeProgressModal();
  
  if (errorCount === 0) {
    success('Success', `Processed ${successCount} items`);
  } else {
    warning('Partial Success', `${successCount} succeeded, ${errorCount} failed`);
  }
} catch (error) {
  closeProgressModal();
  error('Error', 'Processing failed');
}
```

### Async/Await Pattern

```typescript
const processWithProgress = async (items: Item[]) => {
  const updateProgress = showProgressModal(isDark);
  
  try {
    for (let i = 0; i < items.length; i++) {
      updateProgress({
        title: 'Processing',
        current: i + 1,
        total: items.length,
        currentItemName: items[i].name
      });
      
      await processItem(items[i]);
      
      // Optional delay between items
      if (i < items.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    closeProgressModal();
    return { success: true };
  } catch (error) {
    closeProgressModal();
    throw error;
  }
};
```

## Common Patterns

### Pattern 1: Simple Progress (No Item Names)

```typescript
updateProgress({
  title: 'Exporting PDF',
  text: 'Generating PDF for 25 attendees...',
  current: 1,
  total: 1
});
```

### Pattern 2: Detailed Progress (With Item Names)

```typescript
updateProgress({
  title: 'Generating Credentials',
  text: 'Processing credentials for selected attendees...',
  current: 7,
  total: 15,
  currentItemName: 'Jane Smith'
});
```

### Pattern 3: Dynamic Text Updates

```typescript
for (let i = 0; i < items.length; i++) {
  const remaining = items.length - i;
  updateProgress({
    title: 'Processing Items',
    text: `${remaining} items remaining...`,
    current: i + 1,
    total: items.length,
    currentItemName: items[i].name
  });
  await processItem(items[i]);
}
```

## Styling

The modal automatically uses your theme colors:

- **Progress bar:** `--primary` color
- **Background:** `--secondary` color
- **Text:** `--muted-foreground` color
- **Modal:** `--card` background with `--border`

## Tips & Best Practices

1. **Always close the modal** - Use try/finally to ensure cleanup
2. **Show item names** - Helps users track progress
3. **Add delays** - Small delays between items prevent API overload
4. **Handle errors gracefully** - Don't stop on first error
5. **Update frequently** - Keep users informed of progress
6. **Use descriptive titles** - "Generating Credentials" not "Processing"
7. **Provide context** - Include total count in description

## Troubleshooting

### Modal doesn't appear
- Check that `isDark` is properly initialized
- Verify SweetAlert2 is imported correctly

### Progress bar doesn't update
- Ensure you're calling `updateProgress()` with new values
- Check that `current` and `total` are numbers

### Theme colors wrong
- Verify dark mode detection is working
- Check CSS custom properties are defined

### Modal won't close
- Always call `closeProgressModal()` in finally block
- Check for JavaScript errors in console

## Related Files

- Implementation: `src/lib/sweetalert-progress.ts`
- Usage: `src/pages/dashboard.tsx`
- Theme: `src/lib/sweetalert-config.ts`
- Styles: `src/styles/sweetalert-custom.css`
- Colors: `src/styles/globals.css`

---

**Last Updated:** January 10, 2025  
**Version:** 1.0.0

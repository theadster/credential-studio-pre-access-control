# SweetAlert2 Migration Guide

## Overview

This guide helps you migrate from the old shadcn/ui Toast system (based on Radix UI) to the new SweetAlert2 notification system. It covers the differences between the two systems, provides migration examples, and lists common patterns with their equivalents.

## Table of Contents

- [Why Migrate?](#why-migrate)
- [Key Differences](#key-differences)
- [Breaking Changes](#breaking-changes)
- [Migration Steps](#migration-steps)
- [Common Patterns](#common-patterns)
- [API Comparison](#api-comparison)
- [Troubleshooting](#troubleshooting)

## Why Migrate?

The migration from shadcn/ui Toast to SweetAlert2 provides several benefits:

### Advantages of SweetAlert2

✅ **Better Visual Design**
- More polished, modern appearance
- Smooth animations and transitions
- Better icon system

✅ **Enhanced Features**
- Built-in confirmation dialogs
- Loading states with transitions
- Action buttons in notifications
- More positioning options

✅ **Improved UX**
- Auto-dismiss with progress bar
- Better dark mode support
- More customization options
- Consistent behavior across browsers

✅ **Simpler API**
- Promise-based confirmation dialogs
- Easier to chain notifications
- More intuitive method names

### What We're Leaving Behind

The old toast system had some limitations:

- Limited styling options
- No built-in confirmation dialogs
- Manual state management for loading
- Less polished animations
- More boilerplate code

## Key Differences

### Import Changes

**Old (shadcn/ui Toast):**
```typescript
import { useToast } from '@/components/ui/use-toast';
```

**New (SweetAlert2):**
```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';
```

### Hook Usage

**Old:**
```typescript
const { toast } = useToast();

toast({
  title: 'Success',
  description: 'Operation completed',
  variant: 'default',
});
```

**New:**
```typescript
const { success } = useSweetAlert();

success('Success', 'Operation completed');
```

### Method Names

| Old Toast | New SweetAlert | Notes |
|-----------|----------------|-------|
| `toast({ variant: 'default' })` | `toast()` or `info()` | Default notifications |
| `toast({ variant: 'success' })` | `success()` | Success messages |
| `toast({ variant: 'destructive' })` | `error()` | Error messages |
| `toast({ variant: 'warning' })` | `warning()` | Warning messages |
| N/A | `confirm()` | New: Confirmation dialogs |
| N/A | `loading()` | New: Loading states |
| N/A | `close()` | New: Close current notification |

### Notification Structure

**Old:**
```typescript
toast({
  title: 'Title',
  description: 'Description',
  variant: 'success',
  action: <ToastAction altText="Undo">Undo</ToastAction>,
});
```

**New:**
```typescript
toast({
  title: 'Title',
  description: 'Description',
  variant: 'success',
  action: {
    label: 'Undo',
    onClick: () => handleUndo(),
  },
});
```

## Breaking Changes

### 1. Action Buttons

**Breaking Change:** Action buttons are now defined as objects instead of React components.

**Old:**
```typescript
import { ToastAction } from '@/components/ui/toast';

toast({
  title: 'File uploaded',
  action: <ToastAction altText="View">View</ToastAction>,
});
```

**New:**
```typescript
toast({
  title: 'File uploaded',
  action: {
    label: 'View',
    onClick: () => router.push('/files'),
  },
});
```

**Migration:** Replace JSX action components with object configuration.

### 2. Variant Names

**Breaking Change:** The `destructive` variant is now called `error`.

**Old:**
```typescript
toast({
  title: 'Error',
  variant: 'destructive',
});
```

**New:**
```typescript
error('Error');
// or
toast({
  title: 'Error',
  variant: 'error', // or 'destructive' (both work)
});
```

**Migration:** Use `error()` method or update variant name.

### 3. Duration Property

**Breaking Change:** Duration is now in milliseconds (was seconds in some implementations).

**Old:**
```typescript
toast({
  title: 'Message',
  duration: 5, // 5 seconds
});
```

**New:**
```typescript
toast({
  title: 'Message',
  duration: 5000, // 5000 milliseconds = 5 seconds
});
```

**Migration:** Convert duration values to milliseconds.

### 4. No Toaster Component

**Breaking Change:** No need to render a `<Toaster />` component.

**Old (`_app.tsx`):**
```typescript
import { Toaster } from '@/components/ui/toaster';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster />
    </>
  );
}
```

**New (`_app.tsx`):**
```typescript
// No Toaster component needed!
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
```

**Migration:** Remove `<Toaster />` from your app component.

## Migration Steps

### Step 1: Update Imports

Find and replace all toast imports:

```bash
# Find all files using the old toast
grep -r "from '@/components/ui/use-toast'" src/
```

**Replace:**
```typescript
// Old
import { useToast } from '@/components/ui/use-toast';

// New
import { useSweetAlert } from '@/hooks/useSweetAlert';
```

### Step 2: Update Hook Destructuring

**Old:**
```typescript
const { toast } = useToast();
```

**New:**
```typescript
const { toast, success, error, warning, info, confirm, loading, close } = useSweetAlert();
```

### Step 3: Update Toast Calls

Replace toast calls with appropriate methods:

**Old:**
```typescript
toast({
  title: 'Success',
  description: 'Data saved',
  variant: 'success',
});
```

**New (Option 1 - Convenience method):**
```typescript
success('Success', 'Data saved');
```

**New (Option 2 - Full options):**
```typescript
toast({
  title: 'Success',
  description: 'Data saved',
  variant: 'success',
});
```

### Step 4: Update Action Buttons

**Old:**
```typescript
import { ToastAction } from '@/components/ui/toast';

toast({
  title: 'Deleted',
  action: <ToastAction altText="Undo" onClick={handleUndo}>Undo</ToastAction>,
});
```

**New:**
```typescript
toast({
  title: 'Deleted',
  action: {
    label: 'Undo',
    onClick: handleUndo,
  },
});
```

### Step 5: Remove Old Components

After migrating all files:

1. Remove `<Toaster />` from `_app.tsx`
2. Delete old toast files:
   - `src/components/ui/toast.tsx`
   - `src/components/ui/toaster.tsx`
   - `src/components/ui/use-toast.ts`
3. Uninstall old dependency:
   ```bash
   npm uninstall @radix-ui/react-toast
   ```

## Common Patterns

### Pattern 1: Simple Success Message

**Old:**
```typescript
const { toast } = useToast();

toast({
  title: 'Saved',
  variant: 'success',
});
```

**New:**
```typescript
const { success } = useSweetAlert();

success('Saved');
```

### Pattern 2: Error with Description

**Old:**
```typescript
toast({
  title: 'Error',
  description: 'Failed to save data',
  variant: 'destructive',
});
```

**New:**
```typescript
const { error } = useSweetAlert();

error('Error', 'Failed to save data');
```

### Pattern 3: Warning Message

**Old:**
```typescript
toast({
  title: 'Warning',
  description: 'Unsaved changes',
  variant: 'warning',
});
```

**New:**
```typescript
const { warning } = useSweetAlert();

warning('Warning', 'Unsaved changes');
```

### Pattern 4: Info Message

**Old:**
```typescript
toast({
  title: 'Info',
  description: 'Processing your request',
  variant: 'default',
});
```

**New:**
```typescript
const { info } = useSweetAlert();

info('Info', 'Processing your request');
```

### Pattern 5: Notification with Action

**Old:**
```typescript
import { ToastAction } from '@/components/ui/toast';

toast({
  title: 'File uploaded',
  description: 'Your file has been uploaded successfully',
  action: <ToastAction altText="View" onClick={() => router.push('/files')}>
    View
  </ToastAction>,
});
```

**New:**
```typescript
toast({
  title: 'File uploaded',
  description: 'Your file has been uploaded successfully',
  variant: 'success',
  action: {
    label: 'View',
    onClick: () => router.push('/files'),
  },
});
```

### Pattern 6: Custom Duration

**Old:**
```typescript
toast({
  title: 'Message',
  duration: 5, // 5 seconds
});
```

**New:**
```typescript
toast({
  title: 'Message',
  duration: 5000, // 5000 milliseconds
});
```

### Pattern 7: Confirmation Dialog (NEW)

**Old (manual implementation):**
```typescript
const [showDialog, setShowDialog] = useState(false);

// Show dialog
setShowDialog(true);

// In JSX
{showDialog && (
  <AlertDialog>
    <AlertDialogContent>
      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={() => setShowDialog(false)}>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
)}
```

**New (built-in):**
```typescript
const { confirm } = useSweetAlert();

const confirmed = await confirm({
  title: 'Are you sure?',
  text: 'This action cannot be undone.',
  confirmButtonText: 'Delete',
  cancelButtonText: 'Cancel',
  icon: 'warning',
});

if (confirmed) {
  handleDelete();
}
```

### Pattern 8: Loading State (NEW)

**Old (manual implementation):**
```typescript
const [isLoading, setIsLoading] = useState(false);

setIsLoading(true);
try {
  await saveData();
  toast({ title: 'Saved', variant: 'success' });
} catch (error) {
  toast({ title: 'Error', variant: 'destructive' });
} finally {
  setIsLoading(false);
}
```

**New (built-in):**
```typescript
const { loading, close, success, error } = useSweetAlert();

loading({ title: 'Saving...' });
try {
  await saveData();
  close();
  success('Saved');
} catch (err) {
  close();
  error('Error');
}
```

## API Comparison

### Complete API Reference

#### Old Toast API

```typescript
interface ToastProps {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  action?: React.ReactElement<typeof ToastAction>;
  duration?: number;
}

const { toast, dismiss } = useToast();
toast(props: ToastProps): void;
dismiss(toastId?: string): void;
```

#### New SweetAlert API

```typescript
interface ToastOptions {
  title?: string;
  description?: string;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number; // milliseconds
}

interface ConfirmOptions {
  title: string;
  text?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  icon?: 'warning' | 'error' | 'success' | 'info' | 'question';
  showCancelButton?: boolean;
}

interface LoadingOptions {
  title: string;
  text?: string;
}

const {
  toast,
  success,
  error,
  warning,
  info,
  confirm,
  loading,
  close
} = useSweetAlert();

toast(options: ToastOptions): Promise<SweetAlertResult>;
success(title: string, description?: string): Promise<SweetAlertResult>;
error(title: string, description?: string): Promise<SweetAlertResult>;
warning(title: string, description?: string): Promise<SweetAlertResult>;
info(title: string, description?: string): Promise<SweetAlertResult>;
confirm(options: ConfirmOptions): Promise<boolean>;
loading(options: LoadingOptions): Promise<SweetAlertResult>;
close(): void;
```

## Migration Examples

### Example 1: Simple Component

**Before:**
```typescript
import { useToast } from '@/components/ui/use-toast';

export function MyComponent() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast({
        title: 'Success',
        description: 'Data saved successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save data',
        variant: 'destructive',
      });
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

**After:**
```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';

export function MyComponent() {
  const { success, error } = useSweetAlert();

  const handleSave = async () => {
    try {
      await saveData();
      success('Success', 'Data saved successfully');
    } catch (err) {
      error('Error', 'Failed to save data');
    }
  };

  return <button onClick={handleSave}>Save</button>;
}
```

### Example 2: Component with Actions

**Before:**
```typescript
import { useToast } from '@/components/ui/use-toast';
import { ToastAction } from '@/components/ui/toast';

export function FileUpload() {
  const { toast } = useToast();
  const router = useRouter();

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile(file);
      toast({
        title: 'File uploaded',
        description: `${file.name} has been uploaded`,
        variant: 'success',
        action: (
          <ToastAction
            altText="View file"
            onClick={() => router.push(`/files/${result.id}`)}
          >
            View
          </ToastAction>
        ),
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

**After:**
```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';

export function FileUpload() {
  const { toast, error } = useSweetAlert();
  const router = useRouter();

  const handleUpload = async (file: File) => {
    try {
      const result = await uploadFile(file);
      toast({
        title: 'File uploaded',
        description: `${file.name} has been uploaded`,
        variant: 'success',
        action: {
          label: 'View',
          onClick: () => router.push(`/files/${result.id}`),
        },
      });
    } catch (err) {
      error('Upload failed', err.message);
    }
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

### Example 3: Delete with Confirmation

**Before:**
```typescript
import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function DeleteButton({ itemId }: { itemId: string }) {
  const { toast } = useToast();
  const [showDialog, setShowDialog] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteItem(itemId);
      setShowDialog(false);
      toast({
        title: 'Deleted',
        description: 'Item has been deleted',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete item',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <button onClick={() => setShowDialog(true)}>Delete</button>
      
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
```

**After:**
```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';

export function DeleteButton({ itemId }: { itemId: string }) {
  const { confirm, success, error } = useSweetAlert();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Are you sure?',
      text: 'This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning',
    });

    if (!confirmed) return;

    try {
      await deleteItem(itemId);
      success('Deleted', 'Item has been deleted');
    } catch (err) {
      error('Error', 'Failed to delete item');
    }
  };

  return <button onClick={handleDelete}>Delete</button>;
}
```

## Troubleshooting

### Issue: Notifications not appearing

**Cause:** SweetAlert2 might not be properly installed or imported.

**Solution:**
```bash
npm install sweetalert2
```

Verify import in your component:
```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';
```

### Issue: Styling looks wrong

**Cause:** Custom CSS might not be loaded.

**Solution:** Ensure `sweetalert-custom.css` is imported in `globals.css`:
```css
@import './sweetalert-custom.css';
```

### Issue: Dark mode not working

**Cause:** Theme detection might not be working.

**Solution:** The hook automatically detects theme changes. Ensure your app uses the `dark` class on the `<html>` element:
```html
<html class="dark">
```

### Issue: Action buttons not working

**Cause:** Action button syntax changed.

**Solution:** Use object syntax instead of JSX:
```typescript
// Wrong
action: <ToastAction>Click</ToastAction>

// Correct
action: {
  label: 'Click',
  onClick: () => handleClick(),
}
```

### Issue: Duration too short/long

**Cause:** Duration is now in milliseconds.

**Solution:** Convert to milliseconds:
```typescript
// 5 seconds
duration: 5000 // not 5
```

### Issue: Confirmation dialog not blocking

**Cause:** Not awaiting the confirm promise.

**Solution:** Always await confirm:
```typescript
// Wrong
const confirmed = confirm({ title: 'Delete?' });

// Correct
const confirmed = await confirm({ title: 'Delete?' });
```

## Checklist

Use this checklist to ensure complete migration:

- [ ] Updated all `useToast` imports to `useSweetAlert`
- [ ] Replaced `toast()` calls with appropriate methods (`success`, `error`, etc.)
- [ ] Updated action buttons from JSX to object syntax
- [ ] Converted duration values to milliseconds
- [ ] Replaced manual confirmation dialogs with `confirm()`
- [ ] Replaced manual loading states with `loading()` and `close()`
- [ ] Removed `<Toaster />` from `_app.tsx`
- [ ] Deleted old toast component files
- [ ] Uninstalled `@radix-ui/react-toast`
- [ ] Tested all notification scenarios
- [ ] Verified dark mode support
- [ ] Checked mobile responsiveness
- [ ] Tested keyboard navigation
- [ ] Verified accessibility with screen reader

## Next Steps

- See [Usage Guide](./SWEETALERT_USAGE_GUIDE.md) for detailed usage examples
- See [Customization Guide](./SWEETALERT_CUSTOMIZATION_GUIDE.md) for styling options
- See [Best Practices Guide](./SWEETALERT_BEST_PRACTICES_GUIDE.md) for recommendations

## Getting Help

If you encounter issues during migration:

1. Check this guide for common patterns
2. Review the [Usage Guide](./SWEETALERT_USAGE_GUIDE.md)
3. Check the [SweetAlert2 documentation](https://sweetalert2.github.io/)
4. Search for similar issues in the codebase
5. Ask the development team for assistance

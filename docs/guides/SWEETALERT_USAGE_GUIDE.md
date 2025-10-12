# SweetAlert2 Usage Guide

## Overview

CredentialStudio uses SweetAlert2 for all notification and dialog interactions. This guide covers how to use the `useSweetAlert` hook to display notifications, confirmation dialogs, and loading states throughout the application.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Toast Notifications](#toast-notifications)
- [Confirmation Dialogs](#confirmation-dialogs)
- [Loading States](#loading-states)
- [Action Buttons](#action-buttons)
- [Code Examples](#code-examples)

## Basic Setup

### Importing the Hook

```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';

function MyComponent() {
  const { success, error, warning, info, toast, confirm, loading, close } = useSweetAlert();
  
  // Use the methods...
}
```

### Available Methods

The `useSweetAlert` hook provides the following methods:

- `success(title, description?)` - Show success notification
- `error(title, description?)` - Show error notification
- `warning(title, description?)` - Show warning notification
- `info(title, description?)` - Show info notification
- `toast(options)` - Show custom notification with full options
- `confirm(options)` - Show confirmation dialog
- `loading(options)` - Show loading state
- `close()` - Close current notification/dialog

## Toast Notifications

### Success Notifications

Use success notifications to confirm that an action completed successfully.

```typescript
const { success } = useSweetAlert();

// Simple success message
success('Saved!');

// Success with description
success('Attendee Created', 'The attendee has been added to the event.');
```

**When to use:**
- Data saved successfully
- Record created/updated
- Operation completed
- Import/export finished

### Error Notifications

Use error notifications to inform users about failures or problems.

```typescript
const { error } = useSweetAlert();

// Simple error message
error('Failed to save');

// Error with description
error('Save Failed', 'Unable to save attendee. Please try again.');
```

**When to use:**
- API errors
- Validation failures
- Network issues
- Permission denied

### Warning Notifications

Use warning notifications to alert users about potential issues or important information.

```typescript
const { warning } = useSweetAlert();

// Simple warning
warning('Unsaved Changes');

// Warning with description
warning('Unsaved Changes', 'You have unsaved changes that will be lost.');
```

**When to use:**
- Unsaved changes
- Potential data loss
- Deprecated features
- Quota warnings

### Info Notifications

Use info notifications for general information or tips.

```typescript
const { info } = useSweetAlert();

// Simple info message
info('Processing...');

// Info with description
info('Import Started', 'Your file is being processed. This may take a few minutes.');
```

**When to use:**
- Status updates
- Helpful tips
- Feature announcements
- General information

### Custom Toast Options

For more control, use the `toast()` method with custom options:

```typescript
const { toast } = useSweetAlert();

toast({
  title: 'Custom Notification',
  description: 'This is a custom notification with options.',
  variant: 'success', // 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive'
  duration: 5000, // Duration in milliseconds (default: 3000)
  action: {
    label: 'View Details',
    onClick: () => {
      // Handle action button click
      console.log('Action clicked');
    }
  }
});
```

## Confirmation Dialogs

Use confirmation dialogs for destructive or important actions that require user confirmation.

### Basic Confirmation

```typescript
const { confirm } = useSweetAlert();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Attendee?',
    text: 'This action cannot be undone.',
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    icon: 'warning'
  });

  if (confirmed) {
    // User clicked "Delete"
    await deleteAttendee();
  } else {
    // User clicked "Cancel" or closed dialog
    console.log('Deletion cancelled');
  }
};
```

### Confirmation Options

```typescript
interface ConfirmOptions {
  title: string;                    // Dialog title (required)
  text?: string;                    // Dialog description
  confirmButtonText?: string;       // Confirm button label (default: 'Confirm')
  cancelButtonText?: string;        // Cancel button label (default: 'Cancel')
  icon?: SweetAlertIcon;           // Icon type: 'warning' | 'error' | 'success' | 'info' | 'question'
  showCancelButton?: boolean;      // Show cancel button (default: true)
}
```

### Examples

**Delete Confirmation:**
```typescript
const confirmed = await confirm({
  title: 'Delete 5 Attendees?',
  text: 'This will permanently delete 5 attendees. This action cannot be undone.',
  confirmButtonText: 'Delete',
  cancelButtonText: 'Cancel',
  icon: 'warning'
});
```

**Discard Changes:**
```typescript
const confirmed = await confirm({
  title: 'Discard Changes?',
  text: 'You have unsaved changes. Are you sure you want to leave?',
  confirmButtonText: 'Discard',
  cancelButtonText: 'Keep Editing',
  icon: 'question'
});
```

**Critical Action:**
```typescript
const confirmed = await confirm({
  title: 'Clear All Logs?',
  text: 'This will permanently delete all activity logs. This action cannot be undone.',
  confirmButtonText: 'Yes, Clear All',
  cancelButtonText: 'Cancel',
  icon: 'error'
});
```

## Loading States

Use loading states to indicate that an asynchronous operation is in progress.

### Basic Loading

```typescript
const { loading, close, success, error } = useSweetAlert();

const handleSave = async () => {
  // Show loading state
  loading({
    title: 'Saving...',
    text: 'Please wait while we save your changes.'
  });

  try {
    await saveData();
    
    // Close loading and show success
    close();
    success('Saved!', 'Your changes have been saved.');
  } catch (err) {
    // Close loading and show error
    close();
    error('Save Failed', 'Unable to save your changes.');
  }
};
```

### Loading with Transition

```typescript
const { loading, success, error } = useSweetAlert();

const handleImport = async () => {
  loading({
    title: 'Importing Attendees...',
    text: 'Processing your file. This may take a few minutes.'
  });

  try {
    const result = await importAttendees(file);
    
    // Transition to success (automatically closes loading)
    success('Import Complete', `Successfully imported ${result.count} attendees.`);
  } catch (err) {
    // Transition to error (automatically closes loading)
    error('Import Failed', err.message);
  }
};
```

### Loading Options

```typescript
interface LoadingOptions {
  title: string;    // Loading message (required)
  text?: string;    // Additional context
}
```

**Note:** Loading states automatically disable outside clicks and escape key to prevent accidental dismissal.

## Action Buttons

Add action buttons to notifications for interactive feedback.

### Basic Action Button

```typescript
const { toast } = useSweetAlert();

toast({
  title: 'Export Complete',
  description: 'Your attendee list has been exported.',
  variant: 'success',
  action: {
    label: 'Download',
    onClick: () => {
      // Trigger download
      window.open(downloadUrl, '_blank');
    }
  }
});
```

### Examples

**Undo Action:**
```typescript
toast({
  title: 'Attendee Deleted',
  description: 'The attendee has been removed.',
  variant: 'success',
  duration: 5000,
  action: {
    label: 'Undo',
    onClick: async () => {
      await restoreAttendee(attendeeId);
      success('Restored', 'The attendee has been restored.');
    }
  }
});
```

**View Details:**
```typescript
toast({
  title: 'Bulk Edit Complete',
  description: '25 attendees updated successfully.',
  variant: 'success',
  action: {
    label: 'View Changes',
    onClick: () => {
      router.push('/dashboard?tab=logs');
    }
  }
});
```

## Code Examples

### Complete Component Example

```typescript
import { useState } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

export function AttendeeForm() {
  const { success, error, loading, close, confirm } = useSweetAlert();
  const [formData, setFormData] = useState({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Show loading state
    loading({
      title: 'Saving Attendee...',
      text: 'Please wait while we save the attendee information.'
    });

    try {
      const response = await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Failed to save');

      // Close loading and show success
      close();
      success('Attendee Created', 'The attendee has been added to the event.');
      
      // Reset form
      setFormData({});
    } catch (err) {
      // Close loading and show error
      close();
      error('Save Failed', 'Unable to save attendee. Please try again.');
    }
  };

  const handleDelete = async () => {
    // Show confirmation dialog
    const confirmed = await confirm({
      title: 'Delete Attendee?',
      text: 'This action cannot be undone.',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      icon: 'warning'
    });

    if (!confirmed) return;

    // Show loading
    loading({ title: 'Deleting...' });

    try {
      await fetch(`/api/attendees/${attendeeId}`, { method: 'DELETE' });
      close();
      success('Deleted', 'The attendee has been removed.');
    } catch (err) {
      close();
      error('Delete Failed', 'Unable to delete attendee.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit">Save</button>
      <button type="button" onClick={handleDelete}>Delete</button>
    </form>
  );
}
```

### Bulk Operations Example

```typescript
import { useSweetAlert } from '@/hooks/useSweetAlert';

export function BulkOperations() {
  const { confirm, loading, close, success, error, toast } = useSweetAlert();

  const handleBulkDelete = async (selectedIds: string[]) => {
    // Confirm with count
    const confirmed = await confirm({
      title: `Delete ${selectedIds.length} Attendees?`,
      text: 'This will permanently delete the selected attendees. This action cannot be undone.',
      confirmButtonText: 'Delete All',
      cancelButtonText: 'Cancel',
      icon: 'warning'
    });

    if (!confirmed) return;

    // Show loading with progress context
    loading({
      title: 'Deleting Attendees...',
      text: `Deleting ${selectedIds.length} attendees. Please wait.`
    });

    try {
      const response = await fetch('/api/attendees/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds })
      });

      const result = await response.json();
      
      close();
      
      // Show success with action button
      toast({
        title: 'Bulk Delete Complete',
        description: `Successfully deleted ${result.deleted} attendees.`,
        variant: 'success',
        duration: 5000,
        action: {
          label: 'View Logs',
          onClick: () => {
            // Navigate to logs
            window.location.href = '/dashboard?tab=logs';
          }
        }
      });
    } catch (err) {
      close();
      error('Bulk Delete Failed', 'Some attendees could not be deleted.');
    }
  };

  return (
    <button onClick={() => handleBulkDelete(selectedIds)}>
      Delete Selected
    </button>
  );
}
```

### API Route Example

```typescript
// pages/api/attendees/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    try {
      // Validate data
      if (!req.body.name) {
        return res.status(400).json({
          error: 'Validation Failed',
          message: 'Name is required'
        });
      }

      // Save attendee
      const attendee = await createAttendee(req.body);

      return res.status(201).json({
        success: true,
        attendee
      });
    } catch (error) {
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to create attendee'
      });
    }
  }
}
```

## Best Practices

### Do's ✅

- Use appropriate notification types (success, error, warning, info)
- Provide clear, concise messages
- Include descriptions for complex operations
- Use confirmation dialogs for destructive actions
- Show loading states for async operations
- Use action buttons for follow-up actions
- Keep notification duration reasonable (3-5 seconds)

### Don'ts ❌

- Don't show notifications for every minor action
- Don't use long, technical error messages
- Don't stack too many notifications at once
- Don't use notifications for critical errors (use error pages instead)
- Don't forget to close loading states
- Don't use notifications as the only error handling mechanism

## Accessibility

All notifications are accessible by default:

- **Keyboard Navigation:** Tab, Enter, Escape keys work
- **Screen Readers:** Notifications are announced automatically
- **Focus Management:** Focus is properly managed in dialogs
- **ARIA Attributes:** Proper ARIA roles and labels are applied

## Theme Support

Notifications automatically adapt to light and dark themes. No additional configuration is needed.

## Next Steps

- See [Customization Guide](./SWEETALERT_CUSTOMIZATION_GUIDE.md) for styling options
- See [Migration Guide](./SWEETALERT_MIGRATION_GUIDE.md) for migrating from old toast system
- See [Best Practices Guide](./SWEETALERT_BEST_PRACTICES_GUIDE.md) for detailed recommendations

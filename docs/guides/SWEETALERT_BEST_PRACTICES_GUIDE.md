---
title: "SweetAlert2 Best Practices Guide"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/lib/sweetAlertUtils.ts"]
---

# SweetAlert2 Best Practices Guide

## Overview

This guide provides recommendations and best practices for using SweetAlert2 notifications effectively in CredentialStudio. Follow these guidelines to create a consistent, accessible, and user-friendly notification experience.

## Table of Contents

- [When to Use Each Notification Type](#when-to-use-each-notification-type)
- [When to Use Confirmation Dialogs](#when-to-use-confirmation-dialogs)
- [When to Use Loading States](#when-to-use-loading-states)
- [Notification Timing Recommendations](#notification-timing-recommendations)
- [Accessibility Best Practices](#accessibility-best-practices)
- [Content Guidelines](#content-guidelines)
- [Performance Considerations](#performance-considerations)
- [Common Mistakes to Avoid](#common-mistakes-to-avoid)

## When to Use Each Notification Type

### Success Notifications ✅

**Use for:**
- Successful data saves (create, update)
- Completed operations (import, export, bulk actions)
- Successful file uploads
- Account/settings updates
- Successful deletions (with undo option)

**Example:**
```typescript
const { success } = useSweetAlert();

// Good: Clear, specific success message
success('Attendee Created', 'John Doe has been added to the event.');

// Good: Bulk operation with count
success('Import Complete', `Successfully imported ${count} attendees.`);
```

**Don't use for:**
- Navigation actions (clicking links, opening tabs)
- Read-only operations (viewing data, searching)
- Expected behavior (form field validation passing)
- Every minor interaction

### Error Notifications ❌

**Use for:**
- Failed API requests
- Validation errors (after submission)
- Permission denied errors
- Network failures
- Unexpected errors

**Example:**
```typescript
const { error } = useSweetAlert();

// Good: Clear error with actionable message
error('Save Failed', 'Unable to save attendee. Please check your connection and try again.');

// Good: Specific validation error
error('Invalid Email', 'Please enter a valid email address.');
```

**Don't use for:**
- Expected validation (use inline validation instead)
- Non-critical issues (use warnings)
- User education (use info notifications)

### Warning Notifications ⚠️

**Use for:**
- Unsaved changes
- Potential data loss
- Deprecated features
- Quota warnings
- Non-critical issues that need attention

**Example:**
```typescript
const { warning } = useSweetAlert();

// Good: Warning about potential data loss
warning('Unsaved Changes', 'You have unsaved changes that will be lost if you leave.');

// Good: Quota warning
warning('Storage Almost Full', 'You have used 90% of your storage quota.');
```

**Don't use for:**
- Critical errors (use error notifications)
- Successful operations (use success notifications)
- General information (use info notifications)

### Info Notifications ℹ️

**Use for:**
- Status updates
- Processing notifications
- Feature announcements
- Helpful tips
- General information

**Example:**
```typescript
const { info } = useSweetAlert();

// Good: Status update
info('Processing', 'Your import is being processed. This may take a few minutes.');

// Good: Feature announcement
info('New Feature', 'You can now export attendees to PDF format.');
```

**Don't use for:**
- Errors or failures
- Critical warnings
- Success confirmations

## When to Use Confirmation Dialogs

### Always Use Confirmation For:

1. **Destructive Actions**
   - Deleting records
   - Clearing data
   - Removing users
   - Bulk deletions

```typescript
const { confirm, success, error } = useSweetAlert();

const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Attendee?',
    text: 'This action cannot be undone.',
    confirmButtonText: 'Delete',
    cancelButtonText: 'Cancel',
    icon: 'warning',
  });

  if (!confirmed) return;

  try {
    await deleteAttendee(id);
    success('Deleted', 'Attendee has been removed.');
  } catch (err) {
    error('Delete Failed', 'Unable to delete attendee.');
  }
};
```

2. **Irreversible Actions**
   - Publishing content
   - Finalizing orders
   - Sending emails/notifications
   - Archiving data

3. **High-Impact Actions**
   - Bulk operations affecting many records
   - System-wide settings changes
   - Role/permission changes
   - Account deletions

### Don't Use Confirmation For:

- Saving data (use loading state instead)
- Canceling actions (just close the form)
- Navigation (use browser back button)
- Low-impact actions (sorting, filtering)

### Confirmation Dialog Guidelines:

**Do's:**
- ✅ Use clear, specific titles ("Delete 5 Attendees?" not "Are you sure?")
- ✅ Explain consequences in the text
- ✅ Use action-specific button text ("Delete" not "OK")
- ✅ Show count for bulk operations
- ✅ Use appropriate icons (warning for destructive actions)

**Don'ts:**
- ❌ Don't use generic messages
- ❌ Don't overuse confirmations (causes fatigue)
- ❌ Don't use for every action
- ❌ Don't use technical jargon

## When to Use Loading States

### Always Use Loading For:

1. **Async Operations**
   - API requests
   - File uploads
   - Data imports/exports
   - Bulk operations

```typescript
const { loading, close, success, error } = useSweetAlert();

const handleImport = async (file: File) => {
  loading({
    title: 'Importing Attendees...',
    text: 'Processing your file. This may take a few minutes.',
  });

  try {
    const result = await importAttendees(file);
    close();
    success('Import Complete', `Successfully imported ${result.count} attendees.`);
  } catch (err) {
    close();
    error('Import Failed', err.message);
  }
};
```

2. **Long-Running Operations**
   - Report generation
   - Batch processing
   - Large file operations
   - Complex calculations

### Don't Use Loading For:

- Instant operations (< 200ms)
- Navigation
- Client-side operations
- Operations with progress bars elsewhere

### Loading State Guidelines:

**Do's:**
- ✅ Always close loading states (use try/finally)
- ✅ Provide context about what's happening
- ✅ Transition to success/error after completion
- ✅ Use descriptive messages

**Don'ts:**
- ❌ Don't forget to close loading states
- ❌ Don't use for very quick operations
- ❌ Don't use generic "Loading..." messages
- ❌ Don't allow user to dismiss (loading prevents this)

## Notification Timing Recommendations

### Duration Guidelines

| Notification Type | Recommended Duration | Reasoning |
|-------------------|---------------------|-----------|
| Success (simple) | 3 seconds | Quick confirmation, not critical |
| Success (with action) | 5-7 seconds | User needs time to click action |
| Error | 5 seconds | User needs time to read and understand |
| Warning | 5 seconds | Important information |
| Info | 3-4 seconds | General information |
| Loading | Until complete | Don't auto-dismiss |

### Examples:

```typescript
const { toast } = useSweetAlert();

// Quick success (3 seconds - default)
success('Saved');

// Error with details (5 seconds)
toast({
  title: 'Save Failed',
  description: 'Unable to save attendee. Please check your connection.',
  variant: 'error',
  duration: 5000,
});

// Success with action (7 seconds)
toast({
  title: 'Export Complete',
  description: 'Your attendee list is ready.',
  variant: 'success',
  duration: 7000,
  action: {
    label: 'Download',
    onClick: () => downloadFile(),
  },
});
```

### Timing Best Practices:

**Do's:**
- ✅ Give users enough time to read
- ✅ Longer duration for errors and warnings
- ✅ Longer duration when action buttons are present
- ✅ Consider message length when setting duration

**Don'ts:**
- ❌ Don't use very short durations (< 2 seconds)
- ❌ Don't use very long durations (> 10 seconds)
- ❌ Don't auto-dismiss critical errors
- ❌ Don't use same duration for all notifications

## Accessibility Best Practices

### Keyboard Navigation

All notifications support keyboard navigation by default:

- **Tab:** Navigate between buttons
- **Enter/Space:** Activate focused button
- **Escape:** Close notification/dialog

**Ensure:**
- Focus is properly managed
- All interactive elements are keyboard accessible
- Focus returns to appropriate element after closing

### Screen Reader Support

**Do's:**
- ✅ Use clear, descriptive titles
- ✅ Provide context in descriptions
- ✅ Use semantic button text
- ✅ Test with screen readers

**Don'ts:**
- ❌ Don't rely only on icons
- ❌ Don't use vague messages
- ❌ Don't use technical jargon
- ❌ Don't omit important context

### Color and Contrast

**Do's:**
- ✅ Use sufficient color contrast
- ✅ Don't rely on color alone
- ✅ Use icons in addition to colors
- ✅ Test in both light and dark modes

**Example:**
```typescript
// Good: Icon + color + clear text
error('Save Failed', 'Unable to save attendee.');

// Bad: Color only, vague message
toast({ title: 'Error', variant: 'error' });
```

### Focus Management

```typescript
// Good: Focus returns to trigger button after dialog
const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete?',
    text: 'This cannot be undone.',
  });
  
  if (confirmed) {
    await deleteItem();
    // Focus automatically returns to button
  }
};
```

## Content Guidelines

### Writing Effective Messages

**Titles:**
- Keep short (2-5 words)
- Use action verbs
- Be specific
- Use sentence case

```typescript
// Good titles
'Attendee Created'
'Import Complete'
'Save Failed'
'Delete Attendee?'

// Bad titles
'Success' (too vague)
'AN ERROR HAS OCCURRED' (too dramatic, all caps)
'The attendee has been successfully created' (too long)
```

**Descriptions:**
- Provide context
- Explain what happened
- Suggest next steps for errors
- Keep under 2 sentences

```typescript
// Good descriptions
'John Doe has been added to the event.'
'Unable to save attendee. Please check your connection and try again.'
'This will permanently delete 5 attendees. This action cannot be undone.'

// Bad descriptions
'Success' (not descriptive)
'An error occurred while attempting to save the attendee record to the database due to a network connectivity issue.' (too long)
'Error code: 500' (too technical)
```

### Tone and Voice

**Do's:**
- ✅ Be clear and direct
- ✅ Use active voice
- ✅ Be helpful and supportive
- ✅ Use plain language

**Don'ts:**
- ❌ Don't blame the user
- ❌ Don't use technical jargon
- ❌ Don't be overly casual
- ❌ Don't use humor for errors

### Examples:

```typescript
// Good: Clear, helpful, actionable
error('Save Failed', 'Unable to save attendee. Please check your connection and try again.');

// Bad: Blames user, technical
error('User Error', 'Invalid input caused database constraint violation.');

// Good: Supportive, clear
warning('Unsaved Changes', 'You have unsaved changes that will be lost if you leave.');

// Bad: Dramatic, unclear
warning('Warning!', 'Are you sure you want to do this?');
```

## Performance Considerations

### Avoid Notification Spam

**Don't:**
```typescript
// Bad: Notification for every keystroke
const handleChange = (value: string) => {
  if (value.length > 100) {
    warning('Too Long', 'Maximum 100 characters');
  }
};
```

**Do:**
```typescript
// Good: Inline validation, notification only on submit
const handleSubmit = () => {
  if (value.length > 100) {
    error('Validation Failed', 'Name must be 100 characters or less.');
    return;
  }
  // Continue with submission
};
```

### Debounce Rapid Notifications

```typescript
import { debounce } from 'lodash';

// Good: Debounce notifications
const showSaveError = debounce(() => {
  error('Auto-save Failed', 'Unable to save changes.');
}, 1000);
```

### Limit Concurrent Notifications

```typescript
// Good: Close previous notification before showing new one
const { close, success } = useSweetAlert();

const handleMultipleSaves = async () => {
  close(); // Close any existing notification
  success('Saved', 'All changes saved.');
};
```

### Optimize Loading States

```typescript
// Good: Only show loading for operations > 500ms
const handleSave = async () => {
  const startTime = Date.now();
  
  const result = await saveData();
  
  const elapsed = Date.now() - startTime;
  if (elapsed < 500) {
    // Operation was fast, just show success
    success('Saved');
  } else {
    // Operation was slow, would have shown loading
    success('Saved');
  }
};
```

## Common Mistakes to Avoid

### 1. Forgetting to Close Loading States

**Wrong:**
```typescript
const { loading, success } = useSweetAlert();

const handleSave = async () => {
  loading({ title: 'Saving...' });
  await saveData();
  success('Saved'); // Loading state still visible!
};
```

**Right:**
```typescript
const { loading, close, success } = useSweetAlert();

const handleSave = async () => {
  loading({ title: 'Saving...' });
  try {
    await saveData();
    close(); // Close loading first
    success('Saved');
  } catch (err) {
    close(); // Always close in finally
    error('Failed');
  }
};
```

### 2. Not Awaiting Confirmation

**Wrong:**
```typescript
const handleDelete = () => {
  const confirmed = confirm({ title: 'Delete?' }); // Not awaited!
  if (confirmed) { // This will always be truthy (it's a Promise)
    deleteItem();
  }
};
```

**Right:**
```typescript
const handleDelete = async () => {
  const confirmed = await confirm({ title: 'Delete?' });
  if (confirmed) {
    deleteItem();
  }
};
```

### 3. Using Notifications for Everything

**Wrong:**
```typescript
// Too many notifications
const handleClick = () => {
  info('Button Clicked');
};

const handleHover = () => {
  info('Hovering');
};

const handleScroll = () => {
  info('Scrolling');
};
```

**Right:**
```typescript
// Only notify for meaningful actions
const handleSave = async () => {
  await saveData();
  success('Saved');
};
```

### 4. Vague Error Messages

**Wrong:**
```typescript
error('Error');
error('Something went wrong');
error('Failed');
```

**Right:**
```typescript
error('Save Failed', 'Unable to save attendee. Please try again.');
error('Network Error', 'Unable to connect to server. Check your connection.');
error('Permission Denied', 'You do not have permission to delete attendees.');
```

### 5. Not Providing Context

**Wrong:**
```typescript
success('Done');
warning('Warning');
info('Info');
```

**Right:**
```typescript
success('Attendee Created', 'John Doe has been added to the event.');
warning('Unsaved Changes', 'You have unsaved changes that will be lost.');
info('Processing', 'Your import is being processed.');
```

### 6. Overusing Confirmation Dialogs

**Wrong:**
```typescript
// Confirmation for every action
const handleSave = async () => {
  const confirmed = await confirm({ title: 'Save?' });
  if (confirmed) await saveData();
};

const handleCancel = async () => {
  const confirmed = await confirm({ title: 'Cancel?' });
  if (confirmed) closeForm();
};
```

**Right:**
```typescript
// Only confirm destructive actions
const handleSave = async () => {
  await saveData(); // No confirmation needed
  success('Saved');
};

const handleDelete = async () => {
  const confirmed = await confirm({ title: 'Delete?' }); // Confirmation needed
  if (confirmed) await deleteData();
};
```

### 7. Blocking User with Loading States

**Wrong:**
```typescript
// Loading state for instant operation
const handleSort = () => {
  loading({ title: 'Sorting...' });
  sortData(); // Instant, client-side
  close();
};
```

**Right:**
```typescript
// No loading state for instant operations
const handleSort = () => {
  sortData();
  // No notification needed
};

// Loading state only for async operations
const handleImport = async () => {
  loading({ title: 'Importing...' });
  await importData();
  close();
  success('Import Complete');
};
```

## Quick Reference Checklist

### Before Showing a Notification:

- [ ] Is this notification necessary?
- [ ] Is this the right notification type?
- [ ] Is the message clear and specific?
- [ ] Is the duration appropriate?
- [ ] Does it provide actionable information?
- [ ] Is it accessible (keyboard, screen reader)?
- [ ] Does it follow content guidelines?

### Before Using a Confirmation Dialog:

- [ ] Is this action destructive or irreversible?
- [ ] Is the title specific and clear?
- [ ] Does the text explain consequences?
- [ ] Are button labels action-specific?
- [ ] Am I awaiting the promise?

### Before Using a Loading State:

- [ ] Is this operation async?
- [ ] Will it take > 500ms?
- [ ] Am I closing the loading state?
- [ ] Am I using try/finally for cleanup?
- [ ] Does the message explain what's happening?

## Summary

**Key Takeaways:**

1. **Use the right notification type** for each situation
2. **Confirm destructive actions** but don't overuse confirmations
3. **Show loading states** for async operations
4. **Write clear, specific messages** that help users
5. **Consider accessibility** in all notifications
6. **Avoid notification spam** and performance issues
7. **Always close loading states** and await confirmations
8. **Test thoroughly** including keyboard and screen reader

Following these best practices will create a consistent, user-friendly notification experience throughout CredentialStudio.

## Additional Resources

- [Usage Guide](./SWEETALERT_USAGE_GUIDE.md) - Detailed usage examples
- [Customization Guide](./SWEETALERT_CUSTOMIZATION_GUIDE.md) - Styling and customization
- [Migration Guide](./SWEETALERT_MIGRATION_GUIDE.md) - Migrating from old toast system
- [SweetAlert2 Documentation](https://sweetalert2.github.io/) - Official documentation

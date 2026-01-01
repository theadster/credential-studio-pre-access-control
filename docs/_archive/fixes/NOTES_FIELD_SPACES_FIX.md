# Notes Field Spaces Fix

## Issue
Users were unable to add spaces to the Notes field in both Edit Attendees and Add Attendees forms. When typing a space, it would be immediately removed, making it impossible to write proper notes.

## Root Cause
The input sanitization functions (`sanitizeInput` and `sanitizeNotes`) were calling `.trim()` on every keystroke. This removed leading and trailing whitespace immediately as the user typed, preventing them from adding spaces at the beginning or end of their input.

The sanitization was being applied in the `onChange` handlers:
```typescript
onChange={(e) => {
  const sanitized = sanitizeNotes(e.target.value);
  onChange(sanitized);
}}
```

Since `.trim()` was called on every keystroke, any space at the beginning or end would be removed immediately, creating a poor user experience.

## Solution

### 1. Removed Trimming from Real-time Sanitization
Modified `sanitizeInput` and `sanitizeNotes` to NOT trim during typing:

```typescript
// Before
export function sanitizeNotes(value: string): string {
  if (!value) return '';
  
  return value
    .trim()  // ❌ This was the problem
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// After
export function sanitizeNotes(value: string): string {
  if (!value) return '';
  
  return value
    // ✅ No trim during typing - allows spaces
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '');
}
```

### 2. Added Final Sanitization Functions
Created new functions for final sanitization (on blur/submit) that DO trim:

```typescript
/**
 * Sanitizes notes/textarea input with trimming
 * Use this on blur/submit to clean up leading/trailing whitespace
 */
export function sanitizeNotesFinal(value: string): string {
  if (!value) return '';
  
  return value
    .trim()  // ✅ Trim only on final sanitization
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitizes user input with trimming
 * Use this on blur/submit to clean up leading/trailing whitespace
 */
export function sanitizeInputFinal(value: string): string {
  if (!value) return '';
  
  return value
    .trim()  // ✅ Trim only on final sanitization
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/[<>]/g, '');
}
```

### 3. Updated Tests
Updated all tests to reflect the new behavior:

**Real-time Sanitization Tests:**
```typescript
it('should NOT trim whitespace during typing', () => {
  expect(sanitizeNotes('  Notes  ')).toBe('  Notes  ');
  expect(sanitizeNotes('Notes with spaces')).toBe('Notes with spaces');
});
```

**Final Sanitization Tests:**
```typescript
it('should trim whitespace on final sanitization', () => {
  expect(sanitizeNotesFinal('  Notes  ')).toBe('Notes');
  expect(sanitizeNotesFinal('\n\tNotes\n\t')).toBe('Notes');
});
```

## Implementation Strategy

### Current Behavior (No Changes Needed)
The AttendeeForm components already use the correct approach:
- `sanitizeNotes` is called on every keystroke (onChange)
- This now allows spaces during typing
- XSS protection is still active (removes script tags and event handlers)

### Future Enhancement (Optional)
If we want to trim on blur/submit, we can add:

```typescript
// In BasicInformationSection.tsx
<Textarea
  value={notes}
  onChange={(e) => {
    const sanitized = sanitizeNotes(e.target.value);
    onNotesChange(sanitized);
  }}
  onBlur={(e) => {
    // Optional: trim on blur
    const sanitized = sanitizeNotesFinal(e.target.value);
    onNotesChange(sanitized);
  }}
/>
```

However, this is optional and not required for the fix.

## Security Considerations

### Still Protected Against XSS
Even without trimming, the sanitization functions still:
- Remove `<script>` tags and their content
- Remove event handlers (onclick, onload, etc.)
- Remove dangerous protocols (javascript:)
- Remove angle brackets (for `sanitizeInput`)

### What Changed
- ✅ Users can now type spaces freely
- ✅ XSS protection remains intact
- ✅ Leading/trailing whitespace is preserved during typing
- ⚠️ Final data may have leading/trailing spaces (can be trimmed on submit if needed)

## Testing

### Manual Testing
1. Open Add Attendee form
2. Type in the Notes field: "  Test with spaces  "
3. Verify spaces are preserved
4. Type multiple spaces between words
5. Verify all spaces are preserved

### Automated Testing
All 33 tests pass:
```bash
npx vitest --run src/lib/__tests__/sanitization.test.ts
```

Key tests:
- `sanitizeInput > should NOT trim whitespace during typing` ✅
- `sanitizeNotes > should NOT trim whitespace during typing` ✅
- `sanitizeInputFinal > should trim whitespace on final sanitization` ✅
- `sanitizeNotesFinal > should trim whitespace on final sanitization` ✅

## Files Modified
- `src/lib/sanitization.ts` - Removed trim from real-time functions, added final functions
- `src/lib/__tests__/sanitization.test.ts` - Updated tests to reflect new behavior

## Impact
- ✅ Fixes the inability to add spaces in Notes field
- ✅ Maintains XSS protection
- ✅ No breaking changes to existing functionality
- ✅ All tests pass
- ✅ Backward compatible

## Related Issues
- Input sanitization was added in: `docs/fixes/INPUT_SANITIZATION_IMPLEMENTATION.md`
- This fix addresses the unintended side effect of aggressive trimming

## Recommendations

### For Future Development
1. Consider adding `onBlur` handlers that use `sanitizeNotesFinal` to clean up whitespace
2. Consider adding visual feedback when input is sanitized
3. Consider adding a character counter for notes fields
4. Document which fields should trim and which shouldn't

### Best Practices
- Use `sanitizeInput` / `sanitizeNotes` for real-time onChange handlers
- Use `sanitizeInputFinal` / `sanitizeNotesFinal` for onBlur or onSubmit handlers
- Never trim during typing unless there's a specific UX reason
- Always preserve user input during typing for better UX

# Name Handler Logic Deduplication

## Issue
Duplicate uppercase transformation logic existed in both firstName and lastName handlers, creating maintenance risk and code duplication.

**Severity:** LOW  
**Risk:** Inconsistency if one handler is updated but not the other

## Problem

The original code had identical logic duplicated in two places:

```typescript
// First Name Handler
onChange={(e) => {
  const sanitized = sanitizeInput(e.target.value);
  const processed = eventSettings?.forceFirstNameUppercase 
    ? sanitized.toUpperCase() 
    : sanitized;
  onFirstNameChange(processed);
}}

// Last Name Handler (DUPLICATE LOGIC)
onChange={(e) => {
  const sanitized = sanitizeInput(e.target.value);
  const processed = eventSettings?.forceLastNameUppercase 
    ? sanitized.toUpperCase() 
    : sanitized;
  onLastNameChange(processed);
}}
```

This duplication meant:
- Changes had to be made in two places
- Risk of inconsistency if one is updated but not the other
- More code to maintain and test

## Solution

Created a reusable `createNameChangeHandler` function that encapsulates the common logic:

```typescript
/**
 * Creates a name change handler with optional uppercase transformation
 * 
 * Handles sanitization and optional uppercase transformation for name fields.
 * This eliminates code duplication between firstName and lastName handlers.
 * 
 * @param onChange - Callback to update the field value
 * @param forceUppercase - Whether to force uppercase transformation
 * @returns Event handler function
 */
const createNameChangeHandler = (
  onChange: (value: string) => void,
  forceUppercase?: boolean
) => {
  return (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeInput(e.target.value);
    const processed = forceUppercase ? sanitized.toUpperCase() : sanitized;
    onChange(processed);
  };
};
```

## Usage

Now both fields use the same handler factory:

```typescript
// First Name
<Input
  id="firstName"
  value={firstName}
  onChange={createNameChangeHandler(
    onFirstNameChange,
    eventSettings?.forceFirstNameUppercase
  )}
  required
/>

// Last Name
<Input
  id="lastName"
  value={lastName}
  onChange={createNameChangeHandler(
    onLastNameChange,
    eventSettings?.forceLastNameUppercase
  )}
  required
/>
```

## Benefits

### 1. Single Source of Truth
- Logic exists in one place
- Changes automatically apply to both fields
- No risk of inconsistency

### 2. Improved Maintainability
- Easier to understand the pattern
- Easier to modify behavior
- Less code to maintain

### 3. Better Testability
- Can test the handler factory in isolation
- Reduces test duplication
- Clear separation of concerns

### 4. Cleaner Code
- More readable
- Less visual clutter
- Clear intent with descriptive function name

## Implementation Details

**File Modified:** `src/components/AttendeeForm/BasicInformationSection.tsx`

**Changes:**
1. Added `createNameChangeHandler` function inside the component
2. Replaced inline firstName handler with factory call
3. Replaced inline lastName handler with factory call
4. Added JSDoc documentation for the handler factory

**Function Signature:**
```typescript
const createNameChangeHandler = (
  onChange: (value: string) => void,
  forceUppercase?: boolean
) => (e: React.ChangeEvent<HTMLInputElement>) => void
```

**Parameters:**
- `onChange`: Callback function to update the field value
- `forceUppercase`: Optional boolean to enable uppercase transformation

**Returns:**
- Event handler function compatible with React's onChange event

## Testing

Verified that:
- ✅ Both fields work identically
- ✅ No code duplication
- ✅ Easy to modify behavior
- ✅ TypeScript compilation passes
- ✅ No runtime errors
- ✅ Uppercase transformation works correctly when enabled
- ✅ Normal behavior when uppercase is disabled

## Future Enhancements

This pattern could be extended to:
- Other text fields with similar transformation needs
- Custom field handlers with field-specific transformations
- Validation logic that's common across multiple fields

## Related

This follows the DRY (Don't Repeat Yourself) principle and is part of the broader AttendeeForm refactoring effort documented in:
- `docs/fixes/ATTENDEE_FORM_COMPLETE_FIX_GUIDE.md`
- `docs/fixes/ATTENDEE_FORM_REFACTORING.md`

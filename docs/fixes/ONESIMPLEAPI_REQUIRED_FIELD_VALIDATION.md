# OneSimpleAPI Required Field Validation Implementation

## Overview

This document describes the implementation of required field validation for the OneSimpleAPI integration in the Event Settings form. When OneSimpleAPI is enabled, the Webhook URL field is now required and validated for proper URL format.

## Implementation Details

### 1. Validation Logic (`src/lib/validation.ts`)

The `validateEventSettings` function includes comprehensive validation for OneSimpleAPI:

```typescript
// Validate OneSimpleAPI configuration
if (settings.oneSimpleApiEnabled) {
  // Webhook URL is required when OneSimpleAPI is enabled
  if (!settings.oneSimpleApiUrl || settings.oneSimpleApiUrl.trim() === '') {
    return {
      valid: false,
      error: 'Webhook URL is required when OneSimpleAPI integration is enabled'
    };
  }

  // Validate URL format
  if (!isValidURL(settings.oneSimpleApiUrl)) {
    return {
      valid: false,
      error: 'Webhook URL must be a valid URL (e.g., https://api.example.com/webhook)'
    };
  }
}
```

**Key Features:**
- Required field check when OneSimpleAPI is enabled
- Trims whitespace to prevent empty string bypass
- URL format validation using `isValidURL` helper
- Clear, actionable error messages
- Validation is skipped when OneSimpleAPI is disabled

### 2. Form Integration (`src/components/EventSettingsForm/useEventSettingsForm.ts`)

The validation is called during form submission:

```typescript
// Validate required fields
const settingsValidation = validateEventSettings(settingsData);
if (!settingsValidation.valid) {
  error("Validation Error", settingsValidation.error || "Please fill in all required fields");
  setLoading(false);
  return;
}
```

**Behavior:**
- Validation runs before sanitization
- Shows SweetAlert error modal with validation message
- Prevents form submission if validation fails
- Loading state is properly reset on validation failure

### 3. UI Indication (`src/components/EventSettingsForm/IntegrationsTab.tsx`)

The Webhook URL field is marked as required in the UI:

```typescript
<Label htmlFor="oneSimpleApiUrl" className="text-sm font-medium">
  Webhook URL *
</Label>
```

**User Experience:**
- Asterisk (*) indicates required field
- Clear placeholder text: `https://api.example.com/webhook`
- Helpful description: "The endpoint URL to send webhook notifications"
- Field is only required when OneSimpleAPI toggle is enabled

## Validation Rules

### When OneSimpleAPI is Enabled

1. **Webhook URL is required**
   - Cannot be empty
   - Cannot be whitespace only
   - Must be provided

2. **Webhook URL must be valid**
   - Must be a valid URL format
   - Must include protocol (http:// or https://)
   - Examples of valid URLs:
     - `https://api.example.com/webhook`
     - `http://localhost:3000/webhook`
     - `https://api.example.com/v1/webhooks/attendee`
     - `https://subdomain.example.com:8080/webhook`

3. **Error Messages**
   - Missing URL: "Webhook URL is required when OneSimpleAPI integration is enabled"
   - Invalid format: "Webhook URL must be a valid URL (e.g., https://api.example.com/webhook)"

### When OneSimpleAPI is Disabled

- Webhook URL is **not required**
- URL format is **not validated**
- Empty or invalid URLs are **allowed**

## Testing

### Unit Tests (`src/__tests__/lib/validation.test.ts`)

Existing tests cover:
- ✅ Required field validation when enabled
- ✅ URL format validation
- ✅ Empty string rejection
- ✅ Whitespace-only rejection
- ✅ Valid URL acceptance
- ✅ Validation skipped when disabled

### Integration Tests (`src/__tests__/components/EventSettingsForm/required-field-validation.test.tsx`)

New comprehensive test suite covering:
- ✅ Required field enforcement
- ✅ Empty and whitespace handling
- ✅ Invalid URL format rejection
- ✅ Valid URL acceptance
- ✅ Multiple valid URL formats
- ✅ Validation when disabled
- ✅ Integration with other validations
- ✅ Barcode length validation compatibility

### Test Results

All 45 tests pass:
- 33 tests in `validation.test.ts`
- 12 tests in `required-field-validation.test.tsx`

## User Flow

### Scenario 1: Enabling OneSimpleAPI without URL

1. User opens Event Settings dialog
2. User navigates to Integrations tab
3. User enables OneSimpleAPI toggle
4. User leaves Webhook URL empty
5. User clicks Save
6. **Result:** Validation error shown: "Webhook URL is required when OneSimpleAPI integration is enabled"
7. Form submission is prevented

### Scenario 2: Invalid URL Format

1. User enables OneSimpleAPI
2. User enters invalid URL: `not-a-valid-url`
3. User clicks Save
4. **Result:** Validation error shown: "Webhook URL must be a valid URL (e.g., https://api.example.com/webhook)"
5. Form submission is prevented

### Scenario 3: Valid Configuration

1. User enables OneSimpleAPI
2. User enters valid URL: `https://api.example.com/webhook`
3. User clicks Save
4. **Result:** Validation passes, form is submitted successfully

### Scenario 4: Disabled Integration

1. User disables OneSimpleAPI toggle
2. Webhook URL field can be empty or invalid
3. User clicks Save
4. **Result:** Validation passes (URL not checked when disabled)

## Requirements Satisfied

This implementation satisfies **Requirement 3.3** from the spec:

> **User Story:** As an event administrator, I want to see validation errors for invalid input, so that I can correct configuration mistakes before saving
>
> **Acceptance Criteria:**
> - WHEN the user submits the form with OneSimpleAPI enabled but missing required fields, THE Event Settings Form SHALL display appropriate validation errors

## Benefits

1. **Data Integrity**: Ensures OneSimpleAPI configuration is complete before saving
2. **User Guidance**: Clear error messages help users fix issues
3. **Security**: Prevents invalid webhook URLs from being saved
4. **Consistency**: Validation follows same pattern as other integrations
5. **Maintainability**: Well-tested validation logic is easy to maintain

## Related Files

- `src/lib/validation.ts` - Validation logic
- `src/components/EventSettingsForm/useEventSettingsForm.ts` - Form submission
- `src/components/EventSettingsForm/IntegrationsTab.tsx` - UI components
- `src/__tests__/lib/validation.test.ts` - Unit tests
- `src/__tests__/components/EventSettingsForm/required-field-validation.test.tsx` - Integration tests

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Validation**: Show validation errors as user types
2. **URL Testing**: Add "Test Connection" button to verify webhook endpoint
3. **Custom Error Messages**: Allow configuration of validation messages
4. **Conditional Requirements**: Make other fields required based on URL pattern
5. **Webhook History**: Track webhook delivery success/failure

## Conclusion

The required field validation for OneSimpleAPI is fully implemented and tested. The validation ensures that users cannot save incomplete configurations, improving data integrity and user experience. The implementation follows best practices and integrates seamlessly with the existing validation system.

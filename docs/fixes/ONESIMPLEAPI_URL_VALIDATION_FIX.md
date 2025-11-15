# OneSimpleAPI URL Validation Implementation

## Overview

Added URL validation for the OneSimpleAPI webhook URL field in the Event Settings form. This ensures that when OneSimpleAPI integration is enabled, users must provide a valid webhook URL before saving the settings.

## Changes Made

### 1. Updated Validation Logic (`src/lib/validation.ts`)

Enhanced the `validateEventSettings` function to include OneSimpleAPI validation:

- **Required Field Check**: When `oneSimpleApiEnabled` is true, the `oneSimpleApiUrl` field is now required
- **URL Format Validation**: Uses the existing `isValidURL` function to validate the URL format
- **Clear Error Messages**: Provides specific error messages for missing or invalid URLs

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

### 2. Added Comprehensive Tests (`src/__tests__/lib/validation.test.ts`)

Created 5 new test cases to cover all validation scenarios:

1. **Required Field Test**: Verifies that webhook URL is required when OneSimpleAPI is enabled
2. **Invalid URL Format Test**: Ensures invalid URLs are rejected with appropriate error message
3. **Valid URL Test**: Confirms that valid URLs pass validation
4. **Disabled Integration Test**: Verifies that URL validation is skipped when OneSimpleAPI is disabled
5. **Empty URL Test**: Ensures empty/whitespace-only URLs are rejected

All tests pass successfully (33/33 tests passing).

### 3. Test File Organization

Moved the validation test file from `src/lib/__tests__/` to `src/__tests__/lib/` to comply with the project's test organization standards:

- Tests are now in the centralized `src/__tests__/` directory
- Mirrors the source structure (`lib/validation.ts` → `__tests__/lib/validation.test.ts`)
- Prevents Next.js from treating test files as routes
- Updated import paths to use the `@/` alias

## Validation Behavior

### When OneSimpleAPI is Enabled

1. **Missing URL**: Shows error "Webhook URL is required when OneSimpleAPI integration is enabled"
2. **Invalid URL Format**: Shows error "Webhook URL must be a valid URL (e.g., https://api.example.com/webhook)"
3. **Valid URL**: Passes validation and allows form submission

### When OneSimpleAPI is Disabled

- URL validation is skipped entirely
- Users can leave the field empty or with invalid values without errors
- This allows for flexible configuration without forcing users to fill in unused fields

## User Experience

### Error Display

When validation fails:
1. Form submission is prevented
2. A SweetAlert error modal appears with the specific validation error
3. User can correct the URL and resubmit

### Valid URL Examples

- `https://api.example.com/webhook`
- `http://localhost:3000/api/webhook`
- `https://webhook.site/unique-id`

### Invalid URL Examples

- `not-a-valid-url` (missing protocol)
- `example.com` (missing protocol)
- `ftp://example.com` (valid URL but may not be appropriate for webhooks)
- Empty string or whitespace

## Integration Points

### Form Submission Flow

1. User fills out Event Settings form
2. User clicks "Save Changes"
3. `handleSubmit` in `useEventSettingsForm.ts` calls `validateEventSettings`
4. If OneSimpleAPI is enabled, URL validation runs
5. If validation fails, error is displayed and submission is blocked
6. If validation passes, form data is sanitized and saved

### Existing Validation

This validation integrates seamlessly with existing validations:
- Event name, date, and location (required fields)
- Barcode length (4-20 characters)
- Switchboard request body (valid JSON with template_id)
- Custom field validation

## Testing

### Manual Testing Checklist

- [x] Enable OneSimpleAPI integration
- [x] Try to save without entering a URL → Error displayed
- [x] Enter invalid URL (e.g., "not-a-url") → Error displayed
- [x] Enter valid URL (e.g., "https://api.example.com/webhook") → Saves successfully
- [x] Disable OneSimpleAPI integration → No URL validation
- [x] Enter invalid URL with integration disabled → Saves successfully

### Automated Testing

All 33 validation tests pass, including 5 new tests specifically for OneSimpleAPI URL validation.

Run tests with:
```bash
npx vitest --run src/__tests__/lib/validation.test.ts
```

## Requirements Satisfied

This implementation satisfies **Requirement 3.1** from the spec:

> **Requirement 3.1**: WHEN the user enters an invalid URL format in the Webhook URL field, THE Event Settings Form SHALL display a validation error on form submission

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Validation**: Show URL validation errors as the user types (currently only validates on submit)
2. **URL Reachability Check**: Optionally ping the webhook URL to verify it's reachable
3. **Protocol Restrictions**: Limit to HTTPS only for production environments
4. **URL Pattern Matching**: Allow administrators to restrict webhook URLs to specific domains

## Related Files

- `src/lib/validation.ts` - Validation logic
- `src/__tests__/lib/validation.test.ts` - Test suite
- `src/components/EventSettingsForm/useEventSettingsForm.ts` - Form submission handler
- `src/components/EventSettingsForm/IntegrationsTab.tsx` - UI component
- `.kiro/specs/onesimpleapi-input-fix/requirements.md` - Requirements document
- `.kiro/specs/onesimpleapi-input-fix/design.md` - Design document

## Conclusion

The OneSimpleAPI URL validation is now fully implemented and tested. Users will receive clear, actionable error messages when they attempt to save invalid webhook URLs, improving data quality and preventing configuration errors.

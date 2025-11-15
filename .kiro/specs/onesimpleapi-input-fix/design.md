# Design Document

## Overview

The OneSimpleAPI integration fields in the Event Settings form are experiencing input blocking issues. After thorough investigation, the root cause has been identified: the `IntegrationsTab` component uses a custom `memo` comparison function that only checks for changes in the `enabled` flags and integration status, but **does not check for changes in the actual field values** (oneSimpleApiUrl, oneSimpleApiFormDataKey, oneSimpleApiFormDataValue, oneSimpleApiRecordTemplate).

This means when a user types in these fields:
1. The `handleInputChange` function updates the `formData` state in the parent component
2. The parent re-renders and passes the new `formData` to `IntegrationsTab`
3. The `IntegrationsTab` memo comparison function runs
4. The comparison returns `true` (props are "equal") because it only checks `oneSimpleApiEnabled`, not the actual field values
5. React skips re-rendering the `IntegrationsTab` component
6. The input fields don't update to show the new value
7. The user sees no feedback and thinks the field is broken

## Architecture

### Current Architecture (Broken)

```
EventSettingsFormContainer
  └─> useEventSettingsForm hook
      └─> formData state
          └─> handleInputChange updates formData
              └─> IntegrationsTab (memoized with custom comparison)
                  └─> memo comparison only checks enabled flags
                      └─> Component doesn't re-render
                          └─> Input fields don't update
```

### Fixed Architecture

```
EventSettingsFormContainer
  └─> useEventSettingsForm hook
      └─> formData state
          └─> handleInputChange updates formData
              └─> IntegrationsTab (memoized with CORRECT comparison)
                  └─> memo comparison checks ALL relevant formData fields
                      └─> Component re-renders when fields change
                          └─> Input fields update correctly
```

## Components and Interfaces

### Affected Components

1. **IntegrationsTab.tsx**
   - Location: `src/components/EventSettingsForm/IntegrationsTab.tsx`
   - Issue: Custom memo comparison function (lines 516-522) is incomplete
   - Current comparison:
     ```typescript
     (prevProps, nextProps) => {
       return (
         prevProps.formData.cloudinaryEnabled === nextProps.formData.cloudinaryEnabled &&
         prevProps.formData.switchboardEnabled === nextProps.formData.switchboardEnabled &&
         prevProps.formData.oneSimpleApiEnabled === nextProps.formData.oneSimpleApiEnabled &&
         prevProps.integrationStatus?.cloudinary === nextProps.integrationStatus?.cloudinary &&
         prevProps.integrationStatus?.switchboard === nextProps.integrationStatus?.switchboard &&
         prevProps.fieldMappings.length === nextProps.fieldMappings.length
       );
     }
     ```
   - Problem: Does NOT check for changes in:
     - `oneSimpleApiUrl`
     - `oneSimpleApiFormDataKey`
     - `oneSimpleApiFormDataValue`
     - `oneSimpleApiRecordTemplate`
     - Cloudinary fields (cloudinaryCloudName, cloudinaryUploadPreset, etc.)
     - Switchboard fields (switchboardApiEndpoint, switchboardTemplateId, etc.)

2. **useEventSettingsForm.ts**
   - Location: `src/components/EventSettingsForm/useEventSettingsForm.ts`
   - Current behavior: Correctly updates formData state
   - Sanitization: Applied only on form submission (lines 113-119)
   - No changes needed here

### Solution Options

#### Option 1: Remove Custom Memo Comparison (RECOMMENDED)

Remove the custom comparison function entirely and let React's default shallow comparison handle it. This is the simplest and most maintainable solution.

**Pros:**
- Simple, one-line change
- No risk of missing fields in the future
- React's default comparison is well-tested
- Easier to maintain

**Cons:**
- Slightly more re-renders (but negligible performance impact)

**Implementation:**
```typescript
export const IntegrationsTab = memo(function IntegrationsTab({
  formData,
  onInputChange,
  integrationStatus,
  customFields,
  fieldMappings,
  onAddFieldMapping,
  onEditFieldMapping,
  onDeleteFieldMapping
}: IntegrationsTabProps) {
  // ... component code
}); // Remove the second argument (custom comparison function)
```

#### Option 2: Fix Custom Memo Comparison (NOT RECOMMENDED)

Add all missing field comparisons to the custom function.

**Pros:**
- Potentially fewer re-renders (marginal benefit)

**Cons:**
- Complex and error-prone
- Easy to miss fields when adding new integrations
- Maintenance burden
- More code to test

**Implementation:**
```typescript
}, (prevProps, nextProps) => {
  return (
    // Enabled flags
    prevProps.formData.cloudinaryEnabled === nextProps.formData.cloudinaryEnabled &&
    prevProps.formData.switchboardEnabled === nextProps.formData.switchboardEnabled &&
    prevProps.formData.oneSimpleApiEnabled === nextProps.formData.oneSimpleApiEnabled &&
    
    // OneSimpleAPI fields
    prevProps.formData.oneSimpleApiUrl === nextProps.formData.oneSimpleApiUrl &&
    prevProps.formData.oneSimpleApiFormDataKey === nextProps.formData.oneSimpleApiFormDataKey &&
    prevProps.formData.oneSimpleApiFormDataValue === nextProps.formData.oneSimpleApiFormDataValue &&
    prevProps.formData.oneSimpleApiRecordTemplate === nextProps.formData.oneSimpleApiRecordTemplate &&
    
    // Cloudinary fields
    prevProps.formData.cloudinaryCloudName === nextProps.formData.cloudinaryCloudName &&
    prevProps.formData.cloudinaryUploadPreset === nextProps.formData.cloudinaryUploadPreset &&
    prevProps.formData.cloudinaryAutoOptimize === nextProps.formData.cloudinaryAutoOptimize &&
    prevProps.formData.cloudinaryGenerateThumbnails === nextProps.formData.cloudinaryGenerateThumbnails &&
    prevProps.formData.cloudinaryDisableSkipCrop === nextProps.formData.cloudinaryDisableSkipCrop &&
    prevProps.formData.cloudinaryCropAspectRatio === nextProps.formData.cloudinaryCropAspectRatio &&
    
    // Switchboard fields
    prevProps.formData.switchboardApiEndpoint === nextProps.formData.switchboardApiEndpoint &&
    prevProps.formData.switchboardAuthHeaderType === nextProps.formData.switchboardAuthHeaderType &&
    prevProps.formData.switchboardRequestBody === nextProps.formData.switchboardRequestBody &&
    prevProps.formData.switchboardTemplateId === nextProps.formData.switchboardTemplateId &&
    
    // Integration status
    prevProps.integrationStatus?.cloudinary === nextProps.integrationStatus?.cloudinary &&
    prevProps.integrationStatus?.switchboard === nextProps.integrationStatus?.switchboard &&
    
    // Field mappings
    prevProps.fieldMappings.length === nextProps.fieldMappings.length &&
    
    // Custom fields
    prevProps.customFields.length === nextProps.customFields.length
  );
});
```

#### Option 3: Use Deep Comparison Library (OVERKILL)

Use a library like `lodash.isEqual` for deep comparison.

**Pros:**
- Handles all fields automatically

**Cons:**
- Adds dependency
- Performance overhead of deep comparison
- Overkill for this use case

## Data Models

No changes to data models required. The EventSettings interface already has all necessary fields defined.

## Error Handling

### Current Sanitization Behavior

The sanitization is correctly applied on form submission:

```typescript
// In useEventSettingsForm.ts, handleSubmit function
if (settingsData.oneSimpleApiEnabled) {
  if (settingsData.oneSimpleApiFormDataValue) {
    settingsData.oneSimpleApiFormDataValue = sanitizeHTMLTemplate(settingsData.oneSimpleApiFormDataValue);
  }
  if (settingsData.oneSimpleApiRecordTemplate) {
    settingsData.oneSimpleApiRecordTemplate = sanitizeHTMLTemplate(settingsData.oneSimpleApiRecordTemplate);
  }
}
```

This is the correct approach:
- ✅ No sanitization during typing (good UX)
- ✅ Sanitization on submit (security)
- ✅ Uses `sanitizeHTMLTemplate` which preserves placeholders like {{firstName}}

### Validation

Current validation in `validateEventSettings` should be checked to ensure OneSimpleAPI fields are validated when enabled.

## Testing Strategy

### Manual Testing Checklist

1. **Basic Input Test**
   - Open Event Settings dialog
   - Navigate to Integrations tab
   - Enable OneSimpleAPI integration
   - Type in "Webhook URL" field
   - ✅ Verify: Each character appears immediately
   - Type in "Form Data Key" field
   - ✅ Verify: Each character appears immediately

2. **HTML Template Test**
   - Type HTML in "Form Data Value Template": `<div>{{firstName}} {{lastName}}</div>`
   - ✅ Verify: HTML appears as typed
   - Type HTML in "Record Template": `<p>Barcode: {{barcodeNumber}}</p>`
   - ✅ Verify: HTML appears as typed

3. **Sanitization Test**
   - Type dangerous HTML: `<div>Test <script>alert('xss')</script></div>`
   - Click Save
   - ✅ Verify: Form saves successfully
   - Reopen Event Settings
   - ✅ Verify: Script tag is removed, safe HTML remains: `<div>Test </div>`

4. **Placeholder Preservation Test**
   - Type: `<div>Name: {{firstName}} {{lastName}}, Barcode: {{barcodeNumber}}</div>`
   - Click Save
   - Reopen Event Settings
   - ✅ Verify: Placeholders are preserved exactly

5. **Other Integration Fields Test**
   - Test Cloudinary fields (Cloud Name, Upload Preset)
   - Test Switchboard fields (API Endpoint, Template ID)
   - ✅ Verify: All fields accept input correctly

### Automated Testing

Create a test file: `src/__tests__/components/EventSettingsForm/IntegrationsTab.test.tsx`

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { IntegrationsTab } from '@/components/EventSettingsForm/IntegrationsTab';

describe('IntegrationsTab - OneSimpleAPI Fields', () => {
  const mockOnInputChange = jest.fn();
  const mockFormData = {
    oneSimpleApiEnabled: true,
    oneSimpleApiUrl: '',
    oneSimpleApiFormDataKey: '',
    oneSimpleApiFormDataValue: '',
    oneSimpleApiRecordTemplate: '',
    // ... other required fields
  };

  it('should update Webhook URL field when typing', () => {
    render(
      <IntegrationsTab
        formData={mockFormData}
        onInputChange={mockOnInputChange}
        integrationStatus={null}
        customFields={[]}
        fieldMappings={[]}
        onAddFieldMapping={() => {}}
        onEditFieldMapping={() => {}}
        onDeleteFieldMapping={() => {}}
      />
    );

    const input = screen.getByLabelText(/Webhook URL/i);
    fireEvent.change(input, { target: { value: 'https://api.example.com' } });
    
    expect(mockOnInputChange).toHaveBeenCalledWith('oneSimpleApiUrl', 'https://api.example.com');
  });

  it('should update Form Data Key field when typing', () => {
    // Similar test for Form Data Key
  });

  it('should update HTML template fields when typing', () => {
    // Test for Form Data Value Template
    // Test for Record Template
  });
});
```

## Implementation Plan

### Phase 1: Fix the Memo Comparison (IMMEDIATE)

1. Remove the custom memo comparison function from `IntegrationsTab.tsx`
2. Test all integration fields to ensure they accept input
3. Verify no performance regression

### Phase 2: Verify Sanitization (VALIDATION)

1. Test that HTML templates are sanitized on submit
2. Verify placeholders are preserved
3. Test with dangerous HTML to ensure XSS protection

### Phase 3: Add Validation (ENHANCEMENT)

1. Add URL validation for `oneSimpleApiUrl`
2. Add validation for required fields when OneSimpleAPI is enabled
3. Show helpful error messages

## Security Considerations

### Current Security Measures (GOOD)

1. **Sanitization on Submit**: HTML templates are sanitized using `sanitizeHTMLTemplate` before saving
2. **Placeholder Preservation**: The sanitization function preserves template placeholders
3. **No Real-time Sanitization**: Users can type freely without interference (good UX)

### Recommendations

1. **Keep current sanitization approach**: It's secure and user-friendly
2. **Add URL validation**: Ensure `oneSimpleApiUrl` is a valid URL format
3. **Consider CSP headers**: Add Content-Security-Policy headers to prevent XSS at the browser level

## Performance Considerations

### Impact of Removing Custom Memo

Removing the custom memo comparison will cause `IntegrationsTab` to re-render whenever any prop changes. However:

1. **Negligible Impact**: The component is not computationally expensive
2. **User Interaction**: Re-renders only happen during user interaction (typing)
3. **React Optimization**: React's reconciliation is highly optimized
4. **Trade-off**: Slightly more re-renders vs. maintainability and correctness

### Measurement

If performance becomes a concern:
1. Use React DevTools Profiler to measure render times
2. Add performance monitoring for the Event Settings dialog
3. Consider virtualization if the integrations list grows significantly

## Migration Notes

### Breaking Changes

None. This is a bug fix that restores expected behavior.

### Deployment

1. Deploy the fix to staging
2. Test all integration fields thoroughly
3. Verify existing saved settings still load correctly
4. Deploy to production

### Rollback Plan

If issues arise:
1. Revert the commit that removes the custom memo comparison
2. Investigate the specific issue
3. Consider Option 2 (fix the comparison) as a fallback

## Conclusion

The root cause of the OneSimpleAPI input issue is an incomplete custom memo comparison function in the `IntegrationsTab` component. The recommended solution is to remove the custom comparison entirely and rely on React's default shallow comparison. This is the simplest, most maintainable, and most reliable fix.

The current sanitization approach is correct and secure - it sanitizes on submit rather than during typing, providing good UX while maintaining security.

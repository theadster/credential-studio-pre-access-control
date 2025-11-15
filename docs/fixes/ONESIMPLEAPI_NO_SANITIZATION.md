# OneSimpleAPI Template Sanitization Removed

## Issue

User reported that HTML templates with `<style>` tags and `<!DOCTYPE>` declarations were being stripped when saving OneSimpleAPI webhook templates. Specifically, this template was being sanitized:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {size: 3.5in 5.5in;}
    * { margin: 0; padding: 0; }
    img {
      width: 100%;
      height: 100vh;
      object-fit: fill;
      page-break-after: always;
      display: block;
    }
  </style>
</head>
<body>{{credentialRecords}}</body>
</html>
```

## Root Cause

The application was sanitizing OneSimpleAPI HTML templates using `sanitizeHTMLTemplate()` function, which:
- Removed `<style>` tags (considered a security risk for CSS-based attacks)
- Removed `<!DOCTYPE>` declarations
- Stripped other potentially dangerous HTML elements

This sanitization was applied in two places:
1. `src/components/EventSettingsForm/useEventSettingsForm.ts` - Client-side form submission
2. `src/pages/api/event-settings/index.ts` - Server-side API endpoints (POST and PUT)

## Why Sanitization Was Originally Added

The sanitization was added as a security measure to prevent XSS (Cross-Site Scripting) attacks. The concern was that malicious HTML could be injected into templates and potentially executed in the application.

## Why Sanitization Should NOT Be Applied to OneSimpleAPI Templates

OneSimpleAPI templates are fundamentally different from other HTML content in the application:

### 1. **Not Rendered in Our Application**
- OneSimpleAPI templates are sent to external webhook endpoints
- They are NEVER rendered in our application's UI
- There is no XSS risk to our application or users

### 2. **External API Responsibility**
- The external webhook endpoint (OneSimpleAPI) is responsible for safely handling the HTML
- The receiving system should implement its own security measures
- We should not make assumptions about what the external system needs

### 3. **Legitimate Use Cases Require Full HTML**
- Users need to send complete HTML documents with DOCTYPE declarations
- CSS styling via `<style>` tags is a legitimate requirement
- Print-specific CSS (like `@page` rules) is commonly needed
- Restricting HTML breaks valid use cases

### 4. **User Control and Flexibility**
- Users should have full control over what they send to their own webhooks
- The templates are configuration data, not user-generated content
- Users are administrators configuring their own integrations

## Solution

**Removed all sanitization for OneSimpleAPI templates** in three locations:

### 1. Client-Side Form (useEventSettingsForm.ts)

**Before:**
```typescript
// Sanitize HTML templates for OneSimpleAPI
if (settingsData.oneSimpleApiEnabled) {
  if (settingsData.oneSimpleApiFormDataValue) {
    settingsData.oneSimpleApiFormDataValue = sanitizeHTMLTemplate(settingsData.oneSimpleApiFormDataValue);
  }
  if (settingsData.oneSimpleApiRecordTemplate) {
    settingsData.oneSimpleApiRecordTemplate = sanitizeHTMLTemplate(settingsData.oneSimpleApiRecordTemplate);
  }
}
```

**After:**
```typescript
// Note: OneSimpleAPI templates are NOT sanitized because:
// 1. They are sent to an external webhook, not rendered in our application
// 2. They need to support full HTML including <style> tags and <!DOCTYPE>
// 3. The external API is responsible for handling the HTML safely
// 4. Sanitization would break legitimate use cases (CSS styling, full HTML documents)
```

### 2. Server-Side API - POST Endpoint (index.ts)

**Before:**
```typescript
// PHASE 1 SECURITY: Sanitize HTML templates
if (req.body.oneSimpleApiEnabled) {
  if (req.body.oneSimpleApiFormDataValue) {
    req.body.oneSimpleApiFormDataValue = sanitizeHTMLTemplate(req.body.oneSimpleApiFormDataValue);
  }
  if (req.body.oneSimpleApiRecordTemplate) {
    req.body.oneSimpleApiRecordTemplate = sanitizeHTMLTemplate(req.body.oneSimpleApiRecordTemplate);
  }
}
```

**After:**
```typescript
// Note: OneSimpleAPI templates are NOT sanitized because:
// 1. They are sent to an external webhook, not rendered in our application
// 2. They need to support full HTML including <style> tags and <!DOCTYPE>
// 3. The external API is responsible for handling the HTML safely
// 4. Sanitization would break legitimate use cases (CSS styling, full HTML documents)
```

### 3. Server-Side API - PUT Endpoint (index.ts)

Same change as POST endpoint.

## Security Considerations

### Is This Safe?

**Yes**, because:

1. **No XSS Risk**: The HTML is never rendered in our application
2. **Stored Safely**: The HTML is stored as text in the database
3. **Transmitted Safely**: The HTML is sent via HTTPS to external webhooks
4. **Administrator Control**: Only administrators can configure these templates
5. **External Responsibility**: The receiving webhook is responsible for safe handling

### What About Malicious Administrators?

If an administrator is malicious:
- They already have full access to the system
- They can cause damage through many other means
- Restricting HTML templates doesn't meaningfully improve security
- The real security is in proper role-based access control (RBAC)

### Best Practices

1. **RBAC**: Ensure only trusted administrators can configure integrations
2. **Audit Logging**: Log all changes to integration settings
3. **Documentation**: Clearly document that templates are sent to external systems
4. **Validation**: Validate that URLs are properly formatted (already implemented)
5. **Required Fields**: Ensure required fields are filled (already implemented)

## Testing

### Manual Testing

User confirmed that the following template now saves correctly:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {size: 3.5in 5.5in;}
    * { margin: 0; padding: 0; }
    img {
      width: 100%;
      height: 100vh;
      object-fit: fill;
      page-break-after: always;
      display: block;
    }
  </style>
</head>
<body>{{credentialRecords}}</body>
</html>
```

### What Still Works

- Template placeholders like `{{firstName}}`, `{{lastName}}`, etc. are preserved
- Full HTML documents with DOCTYPE are supported
- CSS styling via `<style>` tags is supported
- Print-specific CSS (`@page` rules) is supported
- Complex HTML structures are preserved
- All other validation (URL format, required fields) still works

## Files Modified

1. `src/components/EventSettingsForm/useEventSettingsForm.ts`
   - Removed sanitization call in `handleSubmit`
   - Added explanatory comment

2. `src/pages/api/event-settings/index.ts`
   - Removed sanitization in POST endpoint (create)
   - Removed sanitization in PUT endpoint (update)
   - Added explanatory comments

## Related Documentation

- **Input Fix**: `docs/fixes/ONESIMPLEAPI_INPUT_FIX.md` - Original input handling fix
- **URL Validation**: `docs/fixes/ONESIMPLEAPI_URL_VALIDATION_FIX.md` - URL validation
- **Required Fields**: `docs/fixes/ONESIMPLEAPI_REQUIRED_FIELD_VALIDATION.md` - Required field validation

## Conclusion

Removing sanitization for OneSimpleAPI templates is the correct approach because:

1. ✅ No security risk (HTML not rendered in our app)
2. ✅ Enables legitimate use cases (full HTML documents with styling)
3. ✅ Follows principle of least surprise (users get what they configure)
4. ✅ Respects user control (administrators know what they're doing)
5. ✅ Proper separation of concerns (external API handles its own security)

The templates are now stored and transmitted exactly as configured, giving users full flexibility to integrate with external webhook systems.

## Status

✅ **IMPLEMENTED** - Sanitization removed from all locations
✅ **TESTED** - User confirmed full HTML documents save correctly
✅ **VERIFIED** - User confirmed: "That has fixed everything"
✅ **DOCUMENTED** - Security rationale documented
✅ **DEPLOYED** - Ready for production

## User Confirmation

User successfully saved the following template with full HTML, DOCTYPE, and CSS styling:

```html
<!DOCTYPE html>
<html>
<head>
  <style>
    @page {size: 3.5in 5.5in;}
    * { margin: 0; padding: 0; }
    img {
      width: 100%;
      height: 100vh;
      object-fit: fill;
      page-break-after: always;
      display: block;
    }
  </style>
</head>
<body>{{credentialRecords}}</body>
</html>
```

All OneSimpleAPI integration features are now working as expected.

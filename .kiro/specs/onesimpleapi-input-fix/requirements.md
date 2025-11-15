# Requirements Document

## Introduction

The OneSimpleAPI integration fields in the Event Settings form are currently broken. Users cannot type in the input fields (oneSimpleApiUrl, oneSimpleApiFormDataKey) and the HTML template fields (oneSimpleApiFormDataValue, oneSimpleApiRecordTemplate) are not processing HTML correctly. This appears to be related to how sanitization is being applied to these fields.

## Glossary

- **OneSimpleAPI**: A webhook integration system that sends attendee data to external endpoints
- **Event Settings Form**: The dialog form where administrators configure event-wide settings
- **Sanitization**: The process of cleaning user input to prevent XSS attacks
- **HTML Template Fields**: Text areas that accept HTML with placeholder variables like {{firstName}}
- **Form Data Fields**: Standard input fields for URL and key configuration

## Requirements

### Requirement 1

**User Story:** As an event administrator, I want to type freely in the OneSimpleAPI URL and Form Data Key fields, so that I can configure the webhook endpoint

#### Acceptance Criteria

1. WHEN the user types in the "Webhook URL" input field, THE Event Settings Form SHALL accept and display each character immediately without blocking or sanitization interference
2. WHEN the user types in the "Form Data Key" input field, THE Event Settings Form SHALL accept and display each character immediately without blocking or sanitization interference
3. WHEN the user submits the form, THE Event Settings Form SHALL sanitize the URL field to remove dangerous characters while preserving valid URL characters
4. WHEN the user submits the form, THE Event Settings Form SHALL sanitize the Form Data Key field to remove dangerous characters while preserving alphanumeric and underscore characters

### Requirement 2

**User Story:** As an event administrator, I want to enter HTML templates with placeholders in the OneSimpleAPI template fields, so that I can format the webhook payload with dynamic attendee data

#### Acceptance Criteria

1. WHEN the user types HTML in the "Form Data Value Template" textarea, THE Event Settings Form SHALL accept and display the HTML without stripping tags during typing
2. WHEN the user types HTML in the "Record Template" textarea, THE Event Settings Form SHALL accept and display the HTML without stripping tags during typing
3. WHEN the user includes placeholder variables like {{firstName}} in templates, THE Event Settings Form SHALL preserve these placeholders during typing
4. WHEN the user submits the form, THE Event Settings Form SHALL sanitize the HTML templates using sanitizeHTMLTemplate to remove dangerous content while preserving safe HTML tags and placeholders
5. WHEN the sanitized HTML is saved, THE Event Settings Form SHALL display the sanitized HTML correctly when the form is reopened

### Requirement 3

**User Story:** As an event administrator, I want to see validation errors for invalid input, so that I can correct configuration mistakes before saving

#### Acceptance Criteria

1. WHEN the user enters an invalid URL format in the Webhook URL field, THE Event Settings Form SHALL display a validation error on form submission
2. WHEN the user enters HTML with dangerous content (script tags, event handlers) in template fields, THE Event Settings Form SHALL sanitize the content on submission and optionally warn the user
3. WHEN the user submits the form with OneSimpleAPI enabled but missing required fields, THE Event Settings Form SHALL display appropriate validation errors

### Requirement 4

**User Story:** As a developer, I want to understand why the fields are not accepting input, so that I can implement the correct fix

#### Acceptance Criteria

1. WHEN investigating the issue, THE development team SHALL identify whether the problem is caused by real-time sanitization, React state updates, or input event handling
2. WHEN investigating the issue, THE development team SHALL verify that the Input and Textarea components are not being blocked by parent component re-renders
3. WHEN investigating the issue, THE development team SHALL check if the sanitization functions are being called during onChange events
4. WHEN the root cause is identified, THE development team SHALL document the issue and the fix in the design document

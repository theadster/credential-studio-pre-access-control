# Requirements Document

## Introduction

This document specifies the requirements for a mobile debug endpoint that provides attendee information for debugging and testing purposes in the mobile app builder. The endpoint allows developers and app builders to verify attendee data retrieval and access control evaluation without requiring a full scan workflow.

## Glossary

- **Debug Endpoint**: An API endpoint that returns attendee information for a given barcode, used for testing and troubleshooting
- **Barcode**: The unique identifier printed on attendee badges
- **Access Control**: The system that determines whether an attendee is allowed entry based on validity dates and access status
- **App Builder**: The developer or administrator using the mobile app builder to configure and test the mobile scanning application
- **Site API Endpoint**: The base URL configured in the mobile app builder pointing to the credential.studio server

## Requirements

### Requirement 1

**User Story:** As an app builder, I want to retrieve attendee information by barcode, so that I can verify data is correctly synced to the mobile app.

#### Acceptance Criteria

1. WHEN the app builder calls GET /api/mobile/debug/attendee/{barcode} THEN the System SHALL return a 200 response with attendee data
2. WHEN a valid barcode is provided THEN the System SHALL return the attendee record with all core fields (firstName, lastName, email, phone)
3. WHEN a valid barcode is provided THEN the System SHALL return custom field values for that attendee
4. WHEN a valid barcode is provided THEN the System SHALL return access control data (accessEnabled, validFrom, validUntil)
5. WHEN an invalid barcode is provided THEN the System SHALL return a 404 response with error message "Attendee not found"
6. WHEN the barcode parameter is missing THEN the System SHALL return a 400 response with error message "Barcode is required"

### Requirement 2

**User Story:** As an app builder, I want the debug endpoint to be properly authenticated, so that only authorized users can access attendee data.

#### Acceptance Criteria

1. WHEN an unauthenticated request is made to the debug endpoint THEN the System SHALL return a 401 response with error message "Unauthorized"
2. WHEN a user without mobile access permission makes the request THEN the System SHALL return a 403 response with error message "Forbidden"
3. WHEN an authenticated user with proper permissions makes the request THEN the System SHALL return attendee data
4. WHEN the session token is invalid or expired THEN the System SHALL return a 401 response

### Requirement 3

**User Story:** As an app builder, I want the debug endpoint to return properly formatted JSON, so that I can easily parse and test the response.

#### Acceptance Criteria

1. WHEN the endpoint returns attendee data THEN the System SHALL return valid JSON format
2. WHEN the endpoint returns attendee data THEN the System SHALL include all required fields in the response
3. WHEN custom fields exist for the attendee THEN the System SHALL include them in the response with field names and values
4. WHEN access control data exists THEN the System SHALL include accessEnabled, validFrom, and validUntil in ISO 8601 format
5. WHEN the endpoint returns an error THEN the System SHALL include an error message and appropriate HTTP status code

### Requirement 4

**User Story:** As an app builder, I want the debug endpoint to be discoverable and documented, so that I can easily find and use it.

#### Acceptance Criteria

1. WHEN the app builder navigates to the mobile API documentation THEN the System SHALL display the debug endpoint specification
2. WHEN viewing the endpoint documentation THEN the System SHALL show the endpoint path, HTTP method, required parameters, and response format
3. WHEN viewing the endpoint documentation THEN the System SHALL include example requests and responses
4. WHEN viewing the endpoint documentation THEN the System SHALL specify authentication requirements and permission levels

### Requirement 5

**User Story:** As an app builder, I want the debug endpoint to handle edge cases gracefully, so that I can test various scenarios.

#### Acceptance Criteria

1. WHEN a barcode with special characters is provided THEN the System SHALL properly URL-decode and process it
2. WHEN a barcode that exists but has no custom fields THEN the System SHALL return an empty custom fields object
3. WHEN an attendee has null values for optional fields THEN the System SHALL include them in the response as null
4. WHEN the database is temporarily unavailable THEN the System SHALL return a 503 response with error message "Service unavailable"

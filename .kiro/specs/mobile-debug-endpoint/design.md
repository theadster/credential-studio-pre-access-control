# Design Document

## Overview

The mobile debug endpoint is a REST API endpoint that provides attendee information for debugging and testing purposes in the mobile app builder. It retrieves attendee data by barcode and returns comprehensive information including core fields, custom fields, and access control settings. The endpoint is authenticated and requires appropriate permissions to access.

## Architecture

The endpoint follows a standard REST API pattern integrated into the existing Next.js API routes structure:

```
GET /api/mobile/debug/attendee/[barcode]
```

### Request Flow

1. Mobile app builder calls the endpoint with a barcode parameter
2. Next.js API route handler receives the request
3. Authentication middleware validates the user session
4. Permission check verifies the user has mobile access permissions
5. Database query retrieves attendee data by barcode
6. Custom fields are fetched and formatted
7. Access control data is included in response
8. Response is returned as JSON

### Response Flow

```
Success (200):
{
  id: string,
  barcodeNumber: string,
  firstName: string,
  lastName: string,
  email: string,
  phone: string,
  accessControl: {
    accessEnabled: boolean,
    validFrom: ISO8601 | null,
    validUntil: ISO8601 | null
  },
  customFields: {
    [fieldName]: value
  }
}

Error (4xx/5xx):
{
  error: string,
  message: string
}
```

## Components and Interfaces

### API Route Handler

**File:** `src/pages/api/mobile/debug/attendee/[barcode].ts`

**Responsibilities:**
- Parse and validate barcode parameter
- Authenticate the request
- Check permissions
- Query attendee data
- Format and return response
- Handle errors

**Dependencies:**
- Appwrite SDK for database queries
- Authentication context
- Permission checking utilities
- Error handling utilities

### Data Retrieval

**Attendee Query:**
- Query attendees collection by barcode
- Include core fields: id, barcodeNumber, firstName, lastName, email, phone
- Include access control fields: accessEnabled, validFrom, validUntil

**Custom Fields Query:**
- Query custom field values for the attendee
- Map field IDs to field names
- Include all custom field values

**Photo Data:**
- Optionally include photo URL if available
- Use Cloudinary URL for photo retrieval

### Error Handling

**HTTP Status Codes:**
- 200: Success
- 400: Bad request (missing barcode)
- 401: Unauthorized (not authenticated)
- 403: Forbidden (insufficient permissions)
- 404: Not found (barcode doesn't exist)
- 503: Service unavailable (database error)

**Error Response Format:**
```json
{
  "error": "ERROR_CODE",
  "message": "Human readable message"
}
```

## Data Models

### Attendee Response Model

```typescript
interface AttendeeDebugResponse {
  id: string;
  barcodeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  accessControl: {
    accessEnabled: boolean;
    validFrom: string | null;  // ISO 8601
    validUntil: string | null; // ISO 8601
  };
  customFields: Record<string, any>;
  photoUrl?: string;
}
```

### Error Response Model

```typescript
interface ErrorResponse {
  error: string;
  message: string;
}
```

## Error Handling

### Authentication Errors

- Missing or invalid session token → 401 Unauthorized
- Session expired → 401 Unauthorized
- Invalid credentials → 401 Unauthorized

### Permission Errors

- User lacks mobile access permission → 403 Forbidden
- User lacks attendee read permission → 403 Forbidden

### Validation Errors

- Missing barcode parameter → 400 Bad Request
- Invalid barcode format → 400 Bad Request
- Barcode contains invalid characters → 400 Bad Request

### Data Errors

- Attendee not found → 404 Not Found
- Database connection error → 503 Service Unavailable
- Custom fields query fails → 500 Internal Server Error

### Edge Cases

- Barcode with special characters → URL decode and process
- Attendee with no custom fields → Return empty customFields object
- Null optional fields → Include as null in response
- Missing photo → Omit photoUrl from response

## Testing Strategy

### Unit Tests

- Test barcode parameter validation
- Test authentication check
- Test permission verification
- Test database query construction
- Test response formatting
- Test error handling for each error case

### Integration Tests

- Test complete request/response flow with valid barcode
- Test complete request/response flow with invalid barcode
- Test authentication failure scenarios
- Test permission denial scenarios
- Test database unavailability handling

### Property-Based Tests

- Test that valid barcodes always return consistent data
- Test that invalid barcodes always return 404
- Test that response format is always valid JSON
- Test that custom fields are always properly formatted

### Manual Testing

- Test with app builder using actual mobile app
- Test with various barcode formats
- Test with attendees having different custom field configurations
- Test with attendees having different access control settings
- Test error scenarios (network failure, database down, etc.)

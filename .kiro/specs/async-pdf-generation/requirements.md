# Requirements Document

## Introduction

The current bulk PDF export feature in credential.studio generates PDFs synchronously within a single Next.js API route. For large exports (100+ credentials), the OneSimpleAPI rendering service can take 60–120+ seconds to produce the PDF. This exceeds the hosting platform's function timeout (e.g., Netlify's ~26-second limit), causing the request to fail even though OneSimpleAPI successfully generates the PDF on its end.

This feature moves the long-running PDF generation work into an Appwrite Function (up to 15-minute timeout) using an asynchronous job pattern. The Next.js API routes become thin, fast proxies that create jobs and check status — staying well within any hosting platform's timeout limits. The client polls for job completion instead of waiting on a single long-lived request.

## Glossary

- **Job_Service**: The system responsible for creating, tracking, and managing asynchronous PDF generation jobs via the `pdf_jobs` Appwrite TablesDB table.
- **PDF_Worker**: The Appwrite Function (Node.js runtime) that performs the actual PDF generation work — fetching attendees, building HTML from templates, calling OneSimpleAPI, and updating the job record with the result.
- **Start_Endpoint**: The Next.js API route (`/api/attendees/bulk-export-pdf-start`) that validates the request, creates a job record, triggers the PDF_Worker asynchronously, and returns the job ID.
- **Status_Endpoint**: The Next.js API route (`/api/attendees/pdf-job-status`) that reads a job record and returns its current status, PDF URL, or error information.
- **Poll_Client**: The client-side code in the dashboard that initiates a PDF export job and polls the Status_Endpoint at regular intervals until the job completes or fails.
- **OneSimpleAPI**: The third-party service that converts HTML to PDF.
- **pdf_jobs**: The Appwrite TablesDB table that stores job records with status, PDF URL, error details, and metadata.

## Requirements

### Requirement 1: PDF Job Record Management

**User Story:** As a system administrator, I want PDF export jobs tracked in a dedicated database table, so that job state is persisted and queryable regardless of which service is reading or writing it.

#### Acceptance Criteria

1. THE Job_Service SHALL store each job record in the `pdf_jobs` Appwrite TablesDB table with the following fields: `status` (string), `pdfUrl` (string, nullable), `error` (string, nullable), `attendeeIds` (string — JSON array), `attendeeCount` (integer), `requestedBy` (string — user ID), `eventSettingsId` (string), and `createdAt` / `updatedAt` timestamps.
2. WHEN a new job is created, THE Job_Service SHALL set the initial `status` to `pending`.
3. THE Job_Service SHALL restrict `status` values to one of: `pending`, `processing`, `completed`, `failed`.
4. WHEN a job transitions to `completed`, THE Job_Service SHALL store the PDF URL in the `pdfUrl` field.
5. WHEN a job transitions to `failed`, THE Job_Service SHALL store a human-readable error message in the `error` field.

### Requirement 2: Job Initiation via Start Endpoint

**User Story:** As an event administrator, I want to start a bulk PDF export that returns immediately with a job ID, so that the request completes well within the hosting platform's timeout limit.

#### Acceptance Criteria

1. WHEN the Start_Endpoint receives a POST request with an array of `attendeeIds`, THE Start_Endpoint SHALL validate the request using the same checks as the current `bulk-export-pdf.ts` route: authentication, `bulkGeneratePDFs` permission, non-empty attendee IDs, OneSimpleAPI integration enabled and configured, all attendees have current credentials, and the record template is configured.
2. WHEN validation passes, THE Start_Endpoint SHALL create a `pdf_jobs` record with status `pending` and return the job ID in the response with HTTP 202 (Accepted).
3. WHEN validation passes, THE Start_Endpoint SHALL trigger the PDF_Worker Appwrite Function asynchronously (using `createExecution` with `async: true`) passing the job ID and necessary context.
4. IF validation fails, THEN THE Start_Endpoint SHALL return the appropriate HTTP error status and error message without creating a job record.
5. THE Start_Endpoint SHALL complete its response within 10 seconds under normal conditions.

### Requirement 3: PDF Generation in Appwrite Function

**User Story:** As an event administrator, I want the actual PDF rendering to happen in a long-running Appwrite Function, so that large exports (100+ credentials) complete successfully without timeout.

#### Acceptance Criteria

1. WHEN the PDF_Worker is triggered, THE PDF_Worker SHALL update the job status to `processing`.
2. THE PDF_Worker SHALL fetch all attendee records for the given attendee IDs from the `attendees` table.
3. THE PDF_Worker SHALL fetch event settings and OneSimpleAPI integration configuration from their respective tables.
4. THE PDF_Worker SHALL build the HTML payload using the record template and main template, replacing all placeholders (attendee fields, custom fields, event fields, credential URLs, photo URLs) using the same logic as the current `bulk-export-pdf.ts` route.
5. THE PDF_Worker SHALL POST the generated HTML to the OneSimpleAPI endpoint and retrieve the PDF URL from the response.
6. WHEN OneSimpleAPI returns a valid PDF URL, THE PDF_Worker SHALL update the job record with status `completed` and the `pdfUrl`.
7. IF any step in the PDF generation process fails, THEN THE PDF_Worker SHALL update the job record with status `failed` and a descriptive `error` message.
8. IF the OneSimpleAPI response is not a valid URL or JSON with a `url` field, THEN THE PDF_Worker SHALL mark the job as `failed` with an error describing the invalid response.
9. THE PDF_Worker SHALL verify that each fetched attendee record belongs to the event identified by `eventSettingsId` (i.e., `attendee.eventSettingsId` matches the job's `eventSettingsId`); attendees that do not match SHALL be skipped and SHALL NOT be included in the generated PDF.

### Requirement 4: Job Status Polling via Status Endpoint

**User Story:** As an event administrator, I want to check the status of my PDF export job, so that I know when the PDF is ready to download or if something went wrong.

#### Acceptance Criteria

1. WHEN the Status_Endpoint receives a GET request with a `jobId` query parameter, THE Status_Endpoint SHALL return the job's current `status`, `pdfUrl` (if completed), `error` (if failed), and `attendeeCount`.
2. IF the `jobId` does not exist, THEN THE Status_Endpoint SHALL return HTTP 404 with an error message.
3. THE Status_Endpoint SHALL verify that the requesting user is authenticated and owns the job (`requestedBy` matches the session user ID); requests for jobs owned by other users SHALL return HTTP 403.
4. THE Status_Endpoint SHALL complete its response within 5 seconds under normal conditions.

### Requirement 5: Client-Side Polling and UX

**User Story:** As an event administrator, I want the dashboard to show real-time progress of my PDF export and automatically open the PDF when ready, so that I have a smooth experience even for large exports.

#### Acceptance Criteria

1. WHEN the user initiates a bulk PDF export, THE Poll_Client SHALL call the Start_Endpoint and receive a job ID.
2. WHEN a job ID is received, THE Poll_Client SHALL poll the Status_Endpoint every 3 seconds until the job status is `completed` or `failed`.
3. WHEN the job status is `completed` and a `pdfUrl` is present, THE Poll_Client SHALL open the PDF URL in a new browser tab and display a success notification.
4. WHEN the job status is `failed`, THE Poll_Client SHALL display the error message from the job record to the user.
5. WHILE the job is `pending` or `processing`, THE Poll_Client SHALL display a progress modal indicating that PDF generation is in progress, including the attendee count.
6. IF the user closes or navigates away from the progress modal, THE Poll_Client SHALL stop polling.
7. WHEN the Start_Endpoint returns a validation error (missing credentials, outdated credentials, permission denied), THE Poll_Client SHALL display the same detailed error dialogs as the current implementation (listing affected attendee names).

### Requirement 6: Host-Agnostic Architecture

**User Story:** As a developer, I want the solution to work on any hosting platform (Netlify, Vercel, etc.), so that the application is portable without code changes.

#### Acceptance Criteria

1. THE Start_Endpoint SHALL complete all its work (validation, job creation, function trigger) within a single HTTP request-response cycle that takes no more than 10 seconds.
2. THE Status_Endpoint SHALL perform only a single database read per request.
3. THE PDF_Worker SHALL run as an Appwrite Function independent of the hosting platform, using the Appwrite Node.js server SDK (`node-appwrite`).
4. THE Start_Endpoint and Status_Endpoint SHALL use the existing `withAuth` middleware pattern and `createSessionClient` for authentication, consistent with other API routes in the project.

### Requirement 7: Error Handling and Resilience

**User Story:** As an event administrator, I want clear feedback when something goes wrong during PDF generation, so that I can understand the issue and take corrective action.

#### Acceptance Criteria

1. IF the PDF_Worker fails to trigger (Appwrite Function execution error), THEN THE Start_Endpoint SHALL update the job record to `failed` with an error message and return an error response to the client.
2. IF the PDF_Worker encounters an unhandled exception, THEN THE PDF_Worker SHALL catch the exception and update the job record to `failed` with the error details.
3. IF the OneSimpleAPI service is unreachable or returns a non-200 response, THEN THE PDF_Worker SHALL mark the job as `failed` with a message indicating the external service error.
4. IF a job remains in `pending` or `processing` status for longer than 10 minutes, THE Poll_Client SHALL stop polling and display a timeout message to the user.

### Requirement 8: Existing Bug Fix — Positional Parameters

**User Story:** As a developer, I want the existing `bulk-export-pdf.ts` code to use correct TablesDB named object parameters, so that the codebase is consistent and the migration to the new async pattern starts from a correct baseline.

#### Acceptance Criteria

1. THE Start_Endpoint SHALL use TablesDB named object parameters for all TablesDB operations.
2. THE PDF_Worker SHALL use TablesDB named object parameters for all TablesDB operations.

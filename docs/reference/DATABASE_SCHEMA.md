---
title: Database Schema Reference
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-23
review_interval_days: 90
related_code:
  - scripts/setup-appwrite.ts
  - scripts/verify-appwrite-setup.ts
---

# Database Schema Reference

This document is the authoritative reference for the Appwrite TablesDB schema used by credential.studio. It is generated from and must stay in sync with `scripts/setup-appwrite.ts`.

**Database ID:** `credentialstudio`

> IMPORTANT: Whenever you add, remove, or modify a table or column in `setup-appwrite.ts`, you MUST update this document in the same PR/commit. This is the source of truth for the live schema.

---

## Table Index

| Table ID | Display Name | Purpose |
|----------|-------------|---------|
| `users` | Users | App user profiles linked to Appwrite Auth accounts |
| `roles` | Roles | Role definitions with permission sets |
| `attendees` | Attendees | Core attendee records for the event |
| `custom_fields` | Custom Fields | User-defined fields attached to an event |
| `event_settings` | Event Settings | Global event configuration |
| `logs` | Logs | Audit trail of all user and system actions |
| `log_settings` | Log Settings | Per-event toggles controlling which actions are logged |
| `reports` | Reports | Saved filter/report configurations per user |
| `scan_logs` | Scan Logs | Mobile device barcode scan events |
| `pdf_jobs` | PDF Jobs | Async credential PDF generation job queue |
| `access_control` | Access Control | Per-attendee access enable/disable and validity windows |
| `approval_profiles` | Approval Profiles | Mobile scanning approval rule sets |
| `cloudinary` | Cloudinary | Per-event Cloudinary integration configuration |
| `switchboard` | Switchboard | Per-event Switchboard Canvas API (credential printing) config |
| `onesimpleapi` | OneSimpleAPI | Per-event OneSimpleAPI integration configuration |

---

## Tables

### `users`

Stores application user profiles. Each row corresponds to an Appwrite Auth account. The `userId` field is the Appwrite Auth user ID.

**Permissions:** read(any), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `userId` | varchar | yes | — | 255 | Appwrite Auth user ID |
| `email` | varchar | yes | — | 255 | User email address |
| `name` | varchar | no | — | 255 | Display name |
| `roleId` | varchar | no | — | 255 | FK → `roles.$id` |
| `isInvited` | boolean | no | `false` | — | Whether the user was added via invitation flow |

**Indexes:**
- `email_idx` — Unique on `email`
- `userId_idx` — Key on `userId`
- `roleId_idx` — Key on `roleId`

---

### `roles`

Defines named roles with a serialized JSON permissions blob. The `permissions` field stores a JSON string of granular permission flags.

**Permissions:** read(any), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `name` | varchar | yes | — | 255 | Role name (unique) |
| `description` | varchar | no | — | 1000 | Human-readable description |
| `permissions` | varchar | yes | — | 10000 | JSON-serialized permission flags |

**Indexes:**
- `name_idx` — Unique on `name`

---

### `attendees`

Core table. One row per event attendee. Custom field values are stored as a JSON blob in `customFieldValues`.

**Permissions:** read(any), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `firstName` | varchar | yes | — | 255 | Attendee first name |
| `lastName` | varchar | yes | — | 255 | Attendee last name |
| `barcodeNumber` | varchar | yes | — | 255 | Unique barcode/badge number |
| `notes` | varchar | no | — | 3000 | Free-text notes |
| `photoUrl` | varchar | no | — | 1000 | Cloudinary photo URL |
| `credentialUrl` | varchar | no | — | 1000 | Generated credential image URL |
| `credentialGeneratedAt` | datetime | no | — | — | When the credential was last generated |
| `customFieldValues` | mediumtext | no | — | — | JSON blob of custom field key→value pairs |
| `lastSignificantUpdate` | datetime | no | — | — | Timestamp of last meaningful data change (used for delta sync) |
| `credentialCount` | integer | no | `0` | — | Total number of times a credential has been generated |
| `photoUploadCount` | integer | no | `0` | — | Total number of photo uploads |
| `viewCount` | integer | no | `0` | — | Total number of times the attendee record was viewed |
| `lastCredentialGenerated` | datetime | no | — | — | Timestamp of most recent credential generation |
| `lastPhotoUploaded` | datetime | no | — | — | Timestamp of most recent photo upload |

**Indexes:**
- `barcodeNumber_idx` — Unique on `barcodeNumber`
- `lastName_idx` — Key on `lastName`
- `firstName_idx` — Key on `firstName`

---

### `custom_fields`

Defines the custom fields configured for an event. Each row is one field definition. Soft-deleted via `deletedAt`.

**Permissions:** read(any), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `eventSettingsId` | varchar | yes | — | 255 | FK → `event_settings.$id` |
| `fieldName` | varchar | yes | — | 255 | Display label for the field |
| `internalFieldName` | varchar | no | — | 255 | Stable internal key used in `customFieldValues` JSON |
| `fieldType` | varchar | yes | — | 50 | Field type: `text`, `select`, `checkbox`, etc. |
| `fieldOptions` | varchar | no | — | 5000 | JSON array of options (for select/radio fields) |
| `required` | boolean | no | `false` | — | Whether the field is required on the attendee form |
| `order` | integer | yes | — | — | Display order position |
| `showOnMainPage` | boolean | no | `true` | — | Whether the field appears as a column in the attendee list |
| `printable` | boolean | no | `false` | — | Whether the field value is passed to credential printing |
| `defaultValue` | varchar | no | — | 1000 | Default value pre-populated on new attendee forms |
| `deletedAt` | datetime | no | — | — | Soft-delete timestamp; non-null means the field is deleted |

**Indexes:**
- `eventSettingsId_idx` — Key on `eventSettingsId`
- `showOnMainPage_idx` — Key on `showOnMainPage`
- `order_idx` — Key on `order`

---

### `event_settings`

Single-row table (one row per event deployment) holding all global event configuration.

**Permissions:** read(any) — Create/update/delete restricted to API layer (role-based checks enforced)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `eventName` | varchar | yes | — | 255 | Event display name |
| `eventDate` | datetime | yes | — | — | Event date |
| `eventTime` | varchar | no | — | 50 | Event time string (display only) |
| `eventLocation` | varchar | yes | — | 500 | Event venue/location |
| `timeZone` | varchar | yes | — | 100 | IANA timezone string (e.g. `America/New_York`) |
| `accessControlTimeMode` | enum | no | `date_only` | — | `date_only` or `date_time` — controls how access validity windows are evaluated |
| `mobileSettingsPasscode` | varchar | no | — | 4 | 4-digit passcode for mobile app settings screen |
| `barcodeType` | varchar | yes | — | 50 | Barcode generation type: `numerical` or `alphanumerical` |
| `barcodeLength` | integer | yes | — | — | Length of generated barcodes |
| `barcodeUnique` | boolean | no | `true` | — | Enforce uniqueness on barcode generation |
| `forceFirstNameUppercase` | boolean | no | `false` | — | Auto-uppercase first name on save |
| `forceLastNameUppercase` | boolean | no | `false` | — | Auto-uppercase last name on save |
| `attendeeSortField` | varchar | no | — | 50 | Default sort column for attendee list |
| `attendeeSortDirection` | varchar | no | — | 10 | Default sort direction: `asc` or `desc` |
| `bannerImageUrl` | varchar | no | — | 1000 | URL for the event banner image |
| `signInBannerUrl` | varchar | no | — | 1000 | URL for the sign-in page banner image |
| `accessControlEnabled` | boolean | no | `false` | — | Master toggle for the access control feature |
| `accessControlDefaults` | varchar | no | — | 5000 | JSON blob of default access control settings applied to new attendees |
| `customFieldColumns` | integer | no | `7` | — | Number of custom field columns shown in the attendee list table |

---

### `logs`

Append-only audit log. Every significant user or system action writes a row here.

**Permissions:** read(any), create(any), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `userId` | varchar | yes | — | 255 | Appwrite Auth user ID of the actor |
| `attendeeId` | varchar | no | — | 255 | FK → `attendees.$id` (if action is attendee-related) |
| `action` | varchar | yes | — | 255 | Action identifier string (e.g. `attendee_create`, `auth_login`) |
| `details` | varchar | no | — | 10000 | JSON blob with contextual details about the action |
| `timestamp` | datetime | no | — | — | When the action occurred |

**Indexes:**
- `userId_idx` — Key on `userId`
- `attendeeId_idx` — Key on `attendeeId`
- `timestamp_idx` — Key on `timestamp`
- `action_idx` — Key on `action`

---

### `log_settings`

One row per event. Boolean toggles that control which action types are written to the `logs` table. All default to `true` (log everything).

**Permissions:** read(any) — Create/update/delete restricted to API layer (role-based checks enforced)

#### Attendee Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `attendeeCreate` | boolean | `true` | Log attendee creation |
| `attendeeUpdate` | boolean | `true` | Log attendee updates |
| `attendeeDelete` | boolean | `true` | Log attendee deletion |
| `attendeeView` | boolean | `true` | Log attendee record views |
| `attendeeBulkDelete` | boolean | `true` | Log bulk delete operations |
| `attendeeImport` | boolean | `true` | Log CSV imports |
| `attendeeExport` | boolean | `true` | Log CSV/PDF exports |

#### Credential Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `credentialGenerate` | boolean | `true` | Log credential generation |
| `credentialClear` | boolean | `true` | Log credential clearing |

#### User Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `userCreate` | boolean | `true` | Log user creation |
| `userUpdate` | boolean | `true` | Log user profile updates |
| `userDelete` | boolean | `true` | Log user deletion |
| `userView` | boolean | `true` | Log user record views |
| `userInvite` | boolean | `true` | Log user invitations |

#### Role Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `roleCreate` | boolean | `true` | Log role creation |
| `roleUpdate` | boolean | `true` | Log role updates |
| `roleDelete` | boolean | `true` | Log role deletion |
| `roleView` | boolean | `true` | Log role views |

#### Event Settings Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `eventSettingsUpdate` | boolean | `true` | Log event settings changes |

#### Custom Field Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `customFieldCreate` | boolean | `true` | Log custom field creation |
| `customFieldUpdate` | boolean | `true` | Log custom field updates |
| `customFieldDelete` | boolean | `true` | Log custom field deletion |
| `customFieldReorder` | boolean | `true` | Log custom field reordering |

#### Auth Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `authLogin` | boolean | `true` | Log user logins |
| `authLogout` | boolean | `true` | Log user logouts |

#### Log Management Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `logsDelete` | boolean | `true` | Log log deletion actions |
| `logsExport` | boolean | `true` | Log log export actions |
| `logsView` | boolean | `true` | Log log view actions |

#### System View Events

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `systemViewEventSettings` | boolean | `true` | Log views of the event settings page |
| `systemViewAttendeeList` | boolean | `true` | Log views of the attendee list page |
| `systemViewRolesList` | boolean | `true` | Log views of the roles list page |
| `systemViewUsersList` | boolean | `true` | Log views of the users list page |

---

### `reports`

Stores user-saved report/filter configurations. Each row is a named saved filter set belonging to a specific user.

**Permissions:** read(users), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `name` | varchar | yes | — | 255 | Report display name |
| `description` | varchar | no | — | 1000 | Optional description |
| `userId` | varchar | yes | — | 255 | FK → Appwrite Auth user ID (owner) |
| `filterConfiguration` | varchar | yes | — | 12000 | JSON-serialized filter state |
| `isGlobal` | boolean | no | `false` | — | Whether the report is visible to all users (only creator can edit/delete) |
| `createdAt` | datetime | yes | — | — | Creation timestamp |
| `updatedAt` | datetime | yes | — | — | Last update timestamp |
| `lastAccessedAt` | datetime | no | — | — | Last time the report was loaded/run |

**Indexes:**
- `userId_idx` — Key on `userId`
- `name_idx` — Key on `name`
- `createdAt_idx` — Key on `createdAt`
- `isGlobal_idx` — Key on `isGlobal`

---

### `scan_logs`

Records every barcode scan event from mobile devices. Includes a snapshot of attendee data at the time of scan for offline resilience.

**Permissions:** read(users), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `localId` | varchar | yes | — | 255 | Device-local UUID for the scan event (used for dedup) |
| `deviceId` | varchar | yes | — | 255 | Unique identifier of the scanning device |
| `attendeeId` | varchar | no | — | 255 | FK → `attendees.$id` (null if barcode not found) |
| `barcodeScanned` | varchar | yes | — | 255 | Raw barcode value that was scanned |
| `result` | varchar | yes | — | 50 | Scan outcome: `approved`, `denied`, `not_found`, etc. |
| `denialReason` | varchar | no | — | 500 | Human-readable reason if result is `denied` |
| `profileId` | varchar | no | — | 255 | FK → `approval_profiles.$id` used at scan time |
| `profileVersion` | integer | no | — | — | Version of the approval profile used |
| `operatorId` | varchar | yes | — | 255 | Appwrite Auth user ID of the operator who scanned |
| `scannedAt` | datetime | yes | — | — | Timestamp of the scan on the device |
| `uploadedAt` | datetime | no | — | — | Timestamp when the scan was synced to the server |
| `attendeeFirstName` | varchar | no | — | 255 | Snapshot of attendee first name at scan time |
| `attendeeLastName` | varchar | no | — | 255 | Snapshot of attendee last name at scan time |
| `attendeePhotoUrl` | varchar | no | — | 2048 | Snapshot of attendee photo URL at scan time |

**Indexes:**
- `device_local_idx` — Unique on `(deviceId, localId)` — prevents duplicate uploads
- `deviceId_idx` — Key on `deviceId`
- `operatorId_idx` — Key on `operatorId`
- `attendeeId_idx` — Key on `attendeeId`
- `scannedAt_idx` — Key on `scannedAt`
- `result_idx` — Key on `result`
- `profileId_idx` — Key on `profileId`

---

### `pdf_jobs`

Job queue for async credential PDF generation. Rows are created by the client and processed by a server-side worker.

**Permissions:** read(users), create(users) — update/delete are server-side only via API key

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `status` | varchar | yes | `pending` | 20 | Job status: `pending`, `processing`, `complete`, `failed` |
| `pdfUrl` | varchar | no | — | 2048 | URL of the generated PDF (populated on completion) |
| `error` | varchar | no | — | 2048 | Error message if the job failed |
| `attendeeIds` | varchar | yes | — | 65535 | JSON array of attendee IDs to include in the PDF |
| `attendeeCount` | integer | yes | `0` | — | Number of attendees in the job |
| `requestedBy` | varchar | yes | — | 255 | Appwrite Auth user ID of the requester |
| `eventSettingsId` | varchar | yes | — | 255 | FK → `event_settings.$id` |
| `attendeeNames` | varchar | no | — | 4096 | JSON array of attendee name strings (for display in job list) |

---

### `access_control`

One row per attendee. Stores whether the attendee has access enabled and optional validity window dates. Created lazily when access control settings are first applied to an attendee.

**Permissions:** read(users) — Create/update/delete restricted to API layer (role-based checks enforced)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `attendeeId` | varchar | yes | — | 255 | FK → `attendees.$id` (unique — one row per attendee) |
| `accessEnabled` | boolean | no | `true` | — | Whether the attendee is allowed entry |
| `validFrom` | varchar | no | — | 255 | ISO date/datetime string for start of valid access window |
| `validUntil` | varchar | no | — | 255 | ISO date/datetime string for end of valid access window |

**Indexes:**
- `attendeeId_idx` — Unique on `attendeeId`

---

### `approval_profiles`

Named rule sets used by the mobile scanning app to determine whether a scan should be approved or denied. Soft-deleted via `isDeleted`.

**Permissions:** read(users) — Create/update/delete restricted to API layer (role-based checks enforced)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `name` | varchar | yes | — | 255 | Profile display name (unique) |
| `description` | varchar | no | — | 1000 | Optional description |
| `version` | integer | yes | — | — | Monotonically increasing version number |
| `rules` | varchar | yes | — | 10000 | JSON-serialized array of approval rule objects |
| `isDeleted` | boolean | no | `false` | — | Soft-delete flag |

**Indexes:**
- `name_idx` — Unique on `name`

---

### `cloudinary`

Per-event Cloudinary integration settings. One row per event (keyed by `eventSettingsId`).

**Permissions:** read(users), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `eventSettingsId` | varchar | yes | — | 255 | FK → `event_settings.$id` (unique) |
| `version` | integer | no | `1` | — | Config version for cache-busting |
| `enabled` | boolean | no | `false` | — | Whether Cloudinary integration is active |
| `cloudName` | varchar | no | — | 255 | Cloudinary cloud name |
| `uploadPreset` | varchar | no | — | 255 | Cloudinary unsigned upload preset |
| `autoOptimize` | boolean | no | `true` | — | Auto-apply Cloudinary image optimization transforms |
| `generateThumbnails` | boolean | no | `true` | — | Generate thumbnail variants on upload |
| `disableSkipCrop` | boolean | no | `false` | — | Force crop step in upload widget (disables skip) |
| `cropAspectRatio` | varchar | no | — | 50 | Aspect ratio string for crop widget (e.g. `1:1`) |

**Indexes:**
- `eventSettingsId_idx` — Unique on `eventSettingsId`

---

### `switchboard`

Per-event Switchboard Canvas API configuration for credential printing. One row per event.

**Permissions:** read(users), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `eventSettingsId` | varchar | yes | — | 255 | FK → `event_settings.$id` (unique) |
| `version` | integer | no | `1` | — | Config version |
| `enabled` | boolean | no | `false` | — | Whether Switchboard integration is active |
| `apiEndpoint` | varchar | no | — | 500 | Switchboard API endpoint URL |
| `authHeaderType` | varchar | no | — | 50 | Auth header type (e.g. `Bearer`) |
| `requestBody` | mediumtext | no | — | — | JSON template for the Switchboard API request body |
| `templateId` | varchar | no | — | 255 | Switchboard template/canvas ID |
| `fieldMappings` | mediumtext | no | — | — | JSON mapping of attendee fields to Switchboard template variables |

**Indexes:**
- `eventSettingsId_idx` — Unique on `eventSettingsId`

---

### `onesimpleapi`

Per-event OneSimpleAPI integration configuration. One row per event.

**Permissions:** read(users), create(users), update(users), delete(users)

| Column | Type | Required | Default | Size | Description |
|--------|------|----------|---------|------|-------------|
| `eventSettingsId` | varchar | yes | — | 255 | FK → `event_settings.$id` (unique) |
| `version` | integer | no | `1` | — | Config version |
| `enabled` | boolean | no | `false` | — | Whether OneSimpleAPI integration is active |
| `url` | varchar | no | — | 500 | OneSimpleAPI endpoint URL |
| `formDataKey` | varchar | no | — | 255 | Form data key name sent in the request |
| `formDataValue` | varchar | no | — | 5000 | Form data value template (may include field placeholders) |
| `recordTemplate` | varchar | no | — | 3000 | JSON template for the record payload |

**Indexes:**
- `eventSettingsId_idx` — Unique on `eventSettingsId`

---

## Maintenance Guidelines

### When you add a column

1. Add the `createColumnIfMissing` call in the appropriate function in `scripts/setup-appwrite.ts`
2. Add the column row to the relevant table section in this document
3. Update `last_verified` in this file's frontmatter

### When you remove a column

1. Remove the `createColumnIfMissing` call from `setup-appwrite.ts`
2. Add a migration note or script if existing data needs to be cleaned up
3. Remove the column row from this document and update `last_verified`

### When you add a table

1. Add a `createXxxTable` function in `setup-appwrite.ts`
2. Add the table to the `TABLES` constant and the `printEnvironmentVariables` output
3. Add a full section to this document following the existing format
4. Add the table to the Table Index at the top

### When you remove a table

1. Remove the function and `TABLES` entry from `setup-appwrite.ts`
2. Remove the section from this document
3. Remove the row from the Table Index

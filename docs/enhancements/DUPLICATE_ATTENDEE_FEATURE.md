---
title: Duplicate Attendee Feature
type: canonical
status: active
owner: "@team"
last_verified: 2026-02-23
review_interval_days: 90
related_code:
  - src/pages/api/attendees/duplicate.ts
  - src/components/AttendeeForm/index.tsx
  - src/pages/dashboard.tsx
  - src/lib/permissions.ts
  - src/components/RoleForm.tsx
---

# Duplicate Attendee Feature

Allows users to duplicate an existing attendee record. All fields are copied except the photo (cleared — new upload required) and barcode (a new unique barcode is auto-generated). Designed for quickly replacing an attendee with a new person without re-entering all data.

## Where It Appears

- Row action menu (MoreHorizontal dropdown) on each attendee row in the table — primary entry point
- "Duplicate" button in the top-right of the Edit Attendee dialog header — secondary convenience

Both entry points require the `attendees.duplicate` permission.

## Flow

1. User clicks Duplicate (row menu or dialog header)
2. A unique barcode is generated client-side using Web Crypto API with uniqueness check via `/api/attendees/check-barcode`
3. `POST /api/attendees/duplicate` is called with `{ attendeeId, newBarcodeNumber }`
4. Server copies all attendee fields, clears `photoUrl` and credential fields, copies the access control record if present
5. Attendee list refreshes
6. The new duplicate record opens immediately in the Edit Attendee dialog so the user can upload a photo

## API Endpoint

`POST /api/attendees/duplicate`

```json
{ "attendeeId": "<source-id>", "newBarcodeNumber": "<generated-barcode>" }
```

Returns the new attendee row on `201`. Requires `attendees.duplicate` permission; returns `403` otherwise.

**Security:** The endpoint enforces server-side barcode uniqueness through:
- Pre-creation query check: Verifies the barcode doesn't already exist before attempting creation
- Database constraint error handling: Catches and maps duplicate-key errors to `409 Conflict` response
- This dual protection prevents TOCTOU (Time-of-Check-Time-of-Use) race conditions and ensures data integrity even if the client-side check is bypassed

## Permission

`attendees.duplicate` — added to the `Permission` interface in `src/lib/permissions.ts` and to the Attendees section of the Role Form. Defaults to `false` for all roles; must be explicitly granted in role configuration.

## Security Considerations

**Access Control Reset:** When duplicating an attendee, access control fields (`accessEnabled`, `validFrom`, `validUntil`) are intentionally reset to defaults rather than copied from the source record. This prevents unintentionally granting the same access rights to the duplicate attendee. The user must explicitly configure access control for the new attendee if needed.

## Fields Copied vs. Reset

| Field | Behaviour |
|-------|-----------|
| firstName, lastName, notes | Copied |
| customFieldValues | Copied |
| Access control (validFrom, validUntil, accessEnabled) | Reset to defaults (accessEnabled: false, no time restrictions) |
| barcodeNumber | New unique barcode generated |
| photoUrl | Cleared (null) |
| credentialUrl | Cleared (null) |
| credentialGeneratedAt | Cleared (null) |
| lastSignificantUpdate | Set to duplication timestamp |

---
title: Advanced Filters - Credential Status and Match Mode
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-18
review_interval_days: 90
related_code:
  - src/lib/filterUtils.ts
  - src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx
  - src/components/AdvancedFiltersDialog/sections/BasicInfoSection.tsx
  - src/pages/dashboard.tsx
---

# Advanced Filters Enhancement: Credential Status & Match Mode

Two new features added to the Advanced Filters dialog for more flexible attendee searching.

## Credential Status Filter

Located in the Basic Information section alongside Photo Status.

**Options:**
- All Attendees (default)
- With Credential - shows only attendees who have a generated credential
- Without Credential - shows only attendees without a credential

**Implementation:** Filters based on the `credentialUrl` field presence on attendee records.

## Filter Match Mode

Located at the top of the Advanced Filters dialog as a dropdown selector.

**Options:**
- Match All (AND logic) - Results must match ALL active filter criteria (default)
- Match Any (OR logic) - Results must match ANY active filter criteria

**Behavior:**
- Only considers "active" filters (filters with values set, not default/empty states)
- If no filters are active, all results are shown
- Explanatory text below the dropdown updates to describe current mode

## Usage Examples

**Find attendees without credentials:**
1. Open Advanced Filters
2. In Basic Information, set Credential Status to "Without Credential"
3. Apply Search

**Find attendees matching any of multiple criteria (OR search):**
1. Open Advanced Filters
2. Change Match Mode to "Match Any"
3. Set multiple filters (e.g., First Name contains "John" OR Photo Status "Without Photo")
4. Results will show attendees matching either criterion

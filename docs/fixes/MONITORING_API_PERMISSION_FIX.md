---
title: Monitoring API Permission Fix
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-22
review_interval_days: 90
related_code:
  - src/pages/api/monitoring/transactions.ts
---

# Monitoring API Permission Fix

## Issue

The transaction monitoring API endpoint (`/api/monitoring/transactions`) was accessible to any authenticated user, despite being documented as "restricted to administrators only."

## Root Cause

The endpoint only verified authentication (`account.get()`) but did not check if the user had the required `monitoring.read` permission.

## Fix

Added proper role-based permission checking:

1. Fetch user profile after authentication
2. Retrieve user's assigned role
3. Check `hasPermission(role, 'monitoring', 'read')` before returning data
4. Return 403 Forbidden if permission check fails

## Impact

Users without `monitoring.read` permission can no longer access transaction metrics and alerts.

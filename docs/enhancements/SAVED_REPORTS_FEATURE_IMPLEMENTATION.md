---
title: Saved Reports Feature Implementation
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-28
review_interval_days: 90
related_code:
  - src/types/reports.ts
  - src/lib/reportValidation.ts
  - src/pages/api/reports/index.ts
  - src/pages/api/reports/[id].ts
  - src/hooks/useReports.ts
  - src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx
  - src/components/AdvancedFiltersDialog/components/SaveReportDialog.tsx
  - src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx
  - src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx
  - scripts/add-reports-permissions.ts
  - scripts/setup-appwrite.ts
---

# Saved Reports Feature Implementation

## Overview

The Saved Reports feature enables users to persist, recall, and manage complex search filter configurations within the Advanced Filters dialog. This enhancement addresses the need for users to quickly access frequently-used filter combinations without manually recreating them each time.

## Feature Highlights

### Core Functionality

- **Save Filter Configurations**: Users can save their current filter setup with a name and optional description
- **Load Saved Reports**: Quickly recall and apply previously saved filter configurations
- **Manage Reports**: Edit, delete, or view details of saved reports
- **Stale Parameter Detection**: Automatically detects when saved reports reference deleted custom fields or values
- **Error Correction**: Provides an intuitive interface to fix reports with stale parameters
- **Export Integration**: Seamlessly integrates with the existing Export dialog for filtered data exports

### User Experience

- **Intuitive UI**: Save/Load buttons integrated into the Advanced Filters dialog footer
- **Smart Validation**: Empty name validation prevents invalid reports
- **Graceful Error Handling**: Permission-based UI visibility (buttons hidden when user lacks permissions)
- **Success Notifications**: User-friendly feedback on save/load/update operations
- **Correction Workflow**: Automatic detection and correction of stale parameters

## Architecture

### Database Schema

Reports are stored in the Appwrite `reports` table with the following structure:

```typescript
interface SavedReport {
  $id: string;                    // Appwrite row ID
  name: string;                   // User-provided report name
  description?: string;           // Optional description
  userId: string;                 // Owner's user ID
  filterConfiguration: string;    // JSON-serialized AdvancedSearchFilters
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  lastAccessedAt?: string;        // ISO timestamp of last load
}
```

### API Endpoints

- `GET /api/reports` - List reports for current user
- `POST /api/reports` - Create new report
- `GET /api/reports/[id]` - Get report with validation
- `PUT /api/reports/[id]` - Update report
- `DELETE /api/reports/[id]` - Delete report

### React Components

1. **SaveReportDialog**: Captures report name and description
2. **LoadReportDialog**: Lists available reports with edit/delete options
3. **ReportCorrectionDialog**: Handles stale parameters with removal/replacement options
4. **AdvancedFiltersDialog**: Integrated Save/Load buttons with permission-based visibility

### React Hook

**useReports**: Provides CRUD operations for saved reports with loading states, error handling, and validation result handling.

## Implementation Details

### Stale Parameter Detection

When a saved report is loaded, the system validates all filter parameters against the current system configuration. Two types of stale parameters are detected:

1. **Deleted Custom Fields**: Report references a custom field that no longer exists
2. **Deleted Dropdown Values**: Report references a value that no longer exists in a select/multiselect field

### Permission Integration

Reports integrate with the existing role-based permissions system:

| Permission | Description |
|-----------|-------------|
| `reports.create` | Create new reports |
| `reports.read` | View reports |
| `reports.update` | Edit reports |
| `reports.delete` | Delete reports |

**Access Control:**
- Non-admin users: Can only view and manage their own reports
- Admin users: Can view and manage all reports across all users

### Error Handling

- **Permission Errors**: Buttons hidden when user lacks permissions (consistent with other permission-gated features)
- **Validation Errors**: Empty name validation prevents invalid reports
- **Stale Parameters**: Automatic detection with user-friendly correction interface
- **API Errors**: Graceful error messages for all failure scenarios

## Testing

### Test Coverage

All 50 property-based tests pass successfully:

- **Property 11: Save Button Disabled State** (13 tests)
  - Validates save button is disabled when no filters are active
  - Ensures consistency between hasActiveFilters and button state

- **Property 7: Stale Parameter Removal on Apply** (8 tests)
  - Validates stale parameters are correctly removed
  - Ensures valid filters are preserved

- **Property 13: Report List Display Completeness** (13 tests)
  - Validates all required fields are displayed for each report
  - Tests empty state and loading state handling

- **Property 12: Export Integration** (16 tests)
  - Validates export dialog recognizes filtered state
  - Tests active filters description displays report criteria

### End-to-End Workflow

The complete workflow has been tested and verified:

1. **Save Report** → User clicks "Save Report" button, enters name/description, report is persisted to database
2. **Load Report** → User clicks "Load Report" button, selects a report, filters are loaded into the dialog
3. **Apply Filters** → User applies the loaded filters to search attendees
4. **Export** → User exports the filtered results using the existing Export dialog

## Setup and Deployment

### Prerequisites

1. Appwrite project configured with environment variables
2. Reports table created in Appwrite database
3. Environment variable configured: `APPWRITE_REPORTS_TABLE_ID=reports` (server-side only, no NEXT_PUBLIC_ prefix)

**⚠️ SECURITY:** Do NOT use `NEXT_PUBLIC_` prefix for table IDs. These are internal infrastructure details that should only be accessible server-side.

### Creating the Reports Table

```bash
npm run setup:appwrite
```

This script creates the reports table with all required columns and indexes.

### Adding Permissions to Existing Roles

After deploying the feature, run the migration script to add permissions to existing roles:

```bash
npx ts-node --esm scripts/add-reports-permissions.ts
```

This adds the following permissions:
- **Super Administrator**: create, read, update, delete
- **Event Manager**: create, read, update, delete
- **Registration Staff**: create, read
- **Viewer**: read

## Files Created/Modified

### New Files

- `src/types/reports.ts` - Report type definitions
- `src/lib/reportValidation.ts` - Stale parameter detection logic
- `src/pages/api/reports/index.ts` - List and create endpoints
- `src/pages/api/reports/[id].ts` - Get, update, delete endpoints
- `src/hooks/useReports.ts` - React hook for CRUD operations
- `src/components/AdvancedFiltersDialog/components/SaveReportDialog.tsx` - Save dialog
- `src/components/AdvancedFiltersDialog/components/LoadReportDialog.tsx` - Load dialog
- `src/components/AdvancedFiltersDialog/components/ReportCorrectionDialog.tsx` - Correction dialog
- `scripts/add-reports-permissions.ts` - Migration script for existing deployments

### Modified Files

- `src/components/AdvancedFiltersDialog/AdvancedFiltersDialog.tsx` - Added Save/Load buttons and integration
- `src/lib/permissions.ts` - Added reports resource permissions
- `.env.example` - Added APPWRITE_REPORTS_TABLE_ID variable (server-side only)
- `scripts/setup-appwrite.ts` - Added reports table creation

## Documentation

- **User Guide**: [Saved Reports Feature Guide](../guides/SAVED_REPORTS_GUIDE.md)
- **Permission Fix**: [Saved Reports Permission Fix](../fixes/SAVED_REPORTS_PERMISSION_FIX.md)

## Best Practices

### For Users

- Use descriptive report names that indicate the filter purpose
- Add descriptions for complex filter combinations
- Periodically review and delete unused reports
- Test reports after system updates

### For Developers

- Reports are stored as JSON-serialized filter configurations
- Validation runs only when loading reports, not on every operation
- Indexes on `userId` and `createdAt` ensure fast queries
- Permission checks are enforced at the API level

## Future Enhancements

Potential improvements for future iterations:

1. **Report Sharing**: Allow users to share reports with team members
2. **Report Scheduling**: Automatically run reports on a schedule
3. **Report Templates**: Pre-built report templates for common use cases
4. **Report Analytics**: Track which reports are used most frequently
5. **Report Versioning**: Maintain history of report changes
6. **Bulk Operations**: Save/load multiple reports at once

## Related Documentation

- [Advanced Filters Guide](../guides/ADVANCED_FILTERS_GUIDE.md)
- [Export Dialog Guide](../guides/EXPORT_DIALOG_GUIDE.md)
- [Permissions System](../guides/PERMISSIONS_GUIDE.md)
- [Appwrite Configuration](../migration/APPWRITE_CONFIGURATION.md)


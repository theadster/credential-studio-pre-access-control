---
title: Saved Reports Feature Guide
type: canonical
status: active
owner: "@team"
last_verified: 2026-01-29
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
  - scripts/setup-appwrite.ts
---

# Saved Reports Feature Guide

## Overview

The Saved Reports feature enables users to persist, recall, and manage complex search filter configurations within the Advanced Filters dialog. Users can save frequently-used filter combinations as named reports and quickly apply them without manually recreating the filters each time.

## Key Features

- **Save Filter Configurations**: Users can save their current filter setup with a name and optional description
- **Load Saved Reports**: Quickly recall and apply previously saved filter configurations
- **Manage Reports**: Edit, delete, or view details of saved reports
- **Stale Parameter Detection**: Automatically detects when saved reports reference deleted custom fields or values
- **Error Correction**: Provides an intuitive interface to fix reports with stale parameters
- **Export Integration**: Seamlessly integrates with the existing Export dialog for filtered data exports

## User Interface

### Accessing Reports in Advanced Filters Dialog

The Save and Load Report buttons are located in the footer of the Advanced Filters dialog:

1. Open the **Advanced Filters** dialog from the attendees page
2. In the dialog footer, you'll see:
   - **Load Report** button - Opens the list of saved reports
   - **Save Report** button - Saves current filters as a new report

### Save Report Button Behavior

- The **Save Report** button is **disabled** when no filters are active
- Once at least one filter is set, the button becomes enabled
- Clicking opens the Save Report dialog where you enter a name and optional description

### Load Report Button Behavior

- Always enabled, allowing users to browse saved reports
- Opens the Load Report dialog showing all accessible reports
- Each report displays name, description, creation date, and last accessed date
- Hover over a report to see Edit and Delete action buttons

### Report Correction Flow

When loading a report with stale parameters:

1. The system detects invalid filter references
2. The Report Correction Dialog opens automatically
3. Users can:
   - Remove individual stale parameters
   - Replace stale custom fields with valid alternatives
   - Apply the report with only valid filters
   - Save corrections to update the report permanently

## Database Schema

### Reports Collection

The reports are stored in the `reports` collection in Appwrite with the following structure:

```typescript
interface SavedReport {
  $id: string;                          // Appwrite document ID
  name: string;                         // User-provided report name (required)
  description?: string;                 // Optional description
  userId: string;                       // Owner's user ID (required)
  filterConfiguration: string;          // JSON-serialized AdvancedSearchFilters
  createdAt: string;                    // ISO timestamp
  updatedAt: string;                    // ISO timestamp
  lastAccessedAt?: string;              // ISO timestamp of last load
}
```

### Collection Attributes

| Attribute | Type | Required | Purpose |
|-----------|------|----------|---------|
| `name` | string (255) | Yes | Report name for display |
| `description` | string (1000) | No | Optional description |
| `userId` | string (255) | Yes | Owner's user ID for access control |
| `filterConfiguration` | string (50000) | Yes | JSON-serialized filter state |
| `createdAt` | datetime | Yes | Creation timestamp |
| `updatedAt` | datetime | Yes | Last modification timestamp |
| `lastAccessedAt` | datetime | No | Last time report was loaded |

### Indexes

- `userId_idx` (Key): Enables efficient listing of user's reports
- `name_idx` (Key): Supports search functionality
- `createdAt_idx` (Key): Enables sorting by creation date

## Setup

### Prerequisites

1. Appwrite project configured with environment variables
2. Reports collection created in Appwrite database
3. Environment variable configured: `NEXT_PUBLIC_APPWRITE_REPORTS_COLLECTION_ID=reports`

### Creating the Reports Collection

The reports collection is created automatically when running the Appwrite setup script:

```bash
npm run setup:appwrite
```

This script:
- Creates the `reports` collection in the `credentialstudio` database
- Adds all required attributes with proper types and constraints
- Creates indexes for efficient querying
- Sets up permissions for authenticated users

### Adding Permissions to Existing Roles

After implementing the Saved Reports feature, existing roles need to be updated with reports permissions. Run the migration script:

```bash
npx ts-node --esm scripts/add-reports-permissions.ts
```

This script adds the following permissions to each role:
- **Super Administrator**: create, read, update, delete
- **Event Manager**: create, read, update, delete
- **Registration Staff**: create, read
- **Viewer**: read

**Note:** This is a one-time migration that must be run after the feature is deployed.

### Verifying Setup

To verify the reports collection is properly configured:

```bash
# Check collection attributes and indexes
npx tsx scripts/verify-appwrite-setup.ts
```

## API Endpoints

### List Reports

**Endpoint:** `GET /api/reports`

Lists all reports accessible to the current user.

**Response:**
```json
{
  "reports": [
    {
      "$id": "report_123",
      "name": "VIP Attendees",
      "description": "Filter for VIP access level",
      "userId": "user_456",
      "createdAt": "2025-01-28T10:00:00Z",
      "updatedAt": "2025-01-28T10:00:00Z",
      "lastAccessedAt": "2025-01-28T14:30:00Z"
    }
  ]
}
```

### Create Report

**Endpoint:** `POST /api/reports`

Creates a new report with the current filter configuration.

**Request Body:**
```json
{
  "name": "VIP Attendees",
  "description": "Filter for VIP access level",
  "filterConfiguration": {
    "firstName": { "value": "", "operator": "contains" },
    "customFields": {
      "field_abc123": { "value": "VIP", "operator": "equals" }
    },
    "matchMode": "all"
  }
}
```

**Response:**
```json
{
  "$id": "report_123",
  "name": "VIP Attendees",
  "description": "Filter for VIP access level",
  "userId": "user_456",
  "filterConfiguration": "{...}",
  "createdAt": "2025-01-28T10:00:00Z",
  "updatedAt": "2025-01-28T10:00:00Z"
}
```

### Get Report with Validation

**Endpoint:** `GET /api/reports/[id]`

Retrieves a single report and validates it against current system configuration.

**Response:**
```json
{
  "report": { /* SavedReport object */ },
  "validation": {
    "isValid": true,
    "staleParameters": [],
    "validConfiguration": { /* AdvancedSearchFilters */ }
  }
}
```

If stale parameters are detected:
```json
{
  "report": { /* SavedReport object */ },
  "validation": {
    "isValid": false,
    "staleParameters": [
      {
        "type": "customField",
        "fieldId": "field_deleted_123",
        "fieldName": "VIP Status",
        "reason": "field_deleted"
      }
    ],
    "validConfiguration": { /* Config with stale params removed */ }
  }
}
```

### Update Report

**Endpoint:** `PUT /api/reports/[id]`

Updates a report's name, description, or filter configuration.

**Request Body:**
```json
{
  "name": "Updated Report Name",
  "description": "Updated description",
  "filterConfiguration": { /* Updated filter config */ }
}
```

### Delete Report

**Endpoint:** `DELETE /api/reports/[id]`

Deletes a report permanently.

## React Hook: useReports

The `useReports` hook provides a convenient interface for managing reports in React components.

### Usage

```typescript
import { useReports } from '@/hooks/useReports';

function MyComponent() {
  const {
    reports,
    isLoading,
    error,
    createReport,
    updateReport,
    deleteReport,
    loadReport,
    refreshReports,
  } = useReports();

  // Create a new report
  const handleSave = async (name: string, description: string) => {
    const report = await createReport({
      name,
      description,
      filterConfiguration: currentFilters,
    });
    console.log('Report saved:', report);
  };

  // Load a report
  const handleLoad = async (reportId: string) => {
    const result = await loadReport(reportId);
    if (!result.validation.isValid) {
      // Show correction dialog for stale parameters
      showCorrectionDialog(result);
    } else {
      // Apply valid configuration
      applyFilters(result.filterConfiguration);
    }
  };

  // Delete a report
  const handleDelete = async (reportId: string) => {
    await deleteReport(reportId);
    await refreshReports();
  };

  return (
    // Component JSX
  );
}
```

### Hook Return Type

```typescript
interface UseReportsReturn {
  reports: SavedReport[];           // List of user's reports
  isLoading: boolean;               // Loading state
  error: Error | null;              // Error state
  
  // CRUD operations
  createReport: (payload: CreateReportPayload) => Promise<CreateReportResult>;
  updateReport: (id: string, payload: UpdateReportPayload) => Promise<SavedReport>;
  deleteReport: (id: string) => Promise<void>;
  loadReport: (id: string) => Promise<LoadReportResult>;
  
  // Refresh
  refreshReports: () => Promise<void>;
}
```

### CreateReportResult

The `createReport` method uses a result-based error handling pattern instead of throwing exceptions. This allows graceful handling of expected errors like duplicate report names:

```typescript
interface CreateReportResult {
  success: boolean;
  report?: SavedReport;      // Present on success
  errorCode?: string;        // Present on failure (e.g., 'DUPLICATE_NAME')
  errorMessage?: string;     // Present on failure
}
```

**Usage example:**

```typescript
const result = await createReport({
  name: 'My Report',
  description: 'Report description',
  filterConfiguration: filters,
});

if (result.success) {
  console.log('Report created:', result.report);
} else {
  console.error(`Failed to create report: ${result.errorCode} - ${result.errorMessage}`);
  // Handle specific error codes (e.g., show user-friendly message for DUPLICATE_NAME)
}
```

See [Duplicate Name Handling](../fixes/SAVED_REPORTS_DUPLICATE_NAME_HANDLING_FIX.md) for details on error handling patterns.

## Stale Parameter Detection

When a saved report is loaded, the system validates all filter parameters against the current system configuration. Stale parameters are detected in two scenarios:

### 1. Deleted Custom Fields

If a report references a custom field that no longer exists:

```typescript
{
  type: 'customField',
  fieldId: 'field_deleted_123',
  fieldName: 'VIP Status',        // Original field name for display
  originalValue: 'VIP',           // Original filter value
  reason: 'field_deleted'
}
```

### 2. Deleted Dropdown Values

If a report references a value that no longer exists in a select/multiselect field:

```typescript
{
  type: 'customFieldValue',
  fieldId: 'field_abc123',
  fieldName: 'Status',
  originalValue: ['Deleted Option'],
  reason: 'value_deleted'
}
```

## Error Correction Workflow

When stale parameters are detected, users see the Report Correction Dialog with options:

1. **Apply with Valid Filters Only**: Load the report with stale parameters removed
2. **Remove Individual Parameters**: Select which stale parameters to remove
3. **Replace with Valid Field**: For stale custom fields, select a replacement field
4. **Save Corrections**: Update the report with corrected configuration

## Permissions

Reports integrate with the existing role-based permissions system:

| Permission | Description |
|-----------|-------------|
| `reports.create` | Create new reports |
| `reports.read` | View reports |
| `reports.update` | Edit reports |
| `reports.delete` | Delete reports |

### Access Control

- **Non-admin users**: Can only view and manage their own reports
- **Admin users**: Can view and manage all reports across all users

## Integration with Export Dialog

Saved reports integrate seamlessly with the existing Export dialog:

1. User loads a saved report
2. Filters are applied to the Advanced Filters dialog
3. User opens the Export dialog
4. Export dialog recognizes the filtered state
5. "Current Search Results" option reflects the report's filter criteria
6. User can export attendees matching the report's filters

## Best Practices

### Naming Reports

- Use descriptive names that indicate the filter purpose
- Examples: "VIP Attendees", "Pending Credentials", "No Photos"
- Avoid generic names like "Report 1" or "Temp Filter"

### Descriptions

- Add descriptions for complex filter combinations
- Document the business purpose of the report
- Include any special considerations or notes

### Maintenance

- Periodically review saved reports
- Delete unused reports to keep the list manageable
- Update reports when custom fields change
- Test reports after system updates

### Performance

- Reports with complex filter configurations are stored efficiently
- Indexes on `userId` and `createdAt` ensure fast queries
- Validation runs only when loading reports, not on every operation

## Troubleshooting

### Report Not Appearing in List

**Cause**: Permission issue or report belongs to different user

**Solution**:
- Verify user has `reports.read` permission
- Check that report's `userId` matches current user (or user is admin)
- Refresh the report list

### Permission Denied Error When Loading Reports

**Cause**: Roles don't have reports permissions configured (typically after initial feature deployment)

**Solution**:
- Run the permission migration script: `npx ts-node --esm scripts/add-reports-permissions.ts`
- See [Saved Reports Permission Fix](../fixes/SAVED_REPORTS_PERMISSION_FIX.md) for detailed information
- Refresh the page after running the migration

### Stale Parameters After System Update

**Cause**: Custom fields were deleted or modified

**Solution**:
- Load the report to trigger validation
- Use the Report Correction Dialog to fix stale parameters
- Save the corrected configuration

### Cannot Save Report

**Cause**: Missing `reports.create` permission or invalid filter configuration

**Solution**:
- Verify user has `reports.create` permission
- Ensure at least one filter is active
- Check that report name is not empty

### Report Name Validation Error

**Cause**: Report name is empty or contains only whitespace

**Solution**:
- Enter a non-empty report name
- Remove leading/trailing whitespace
- Use descriptive names

## Related Documentation

- [Advanced Filters Guide](./ADVANCED_FILTERS_GUIDE.md)
- [Export Dialog Guide](./EXPORT_DIALOG_GUIDE.md)
- [Appwrite Configuration](../migration/APPWRITE_CONFIGURATION.md)
- [Role-Based Permissions](./PERMISSIONS_GUIDE.md)
- [Saved Reports Permission Fix](../fixes/SAVED_REPORTS_PERMISSION_FIX.md)

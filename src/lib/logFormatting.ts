/**
 * Log Formatting Utilities
 * 
 * Provides consistent formatting for log entries across the application.
 * Ensures proper capitalization, categorization, and descriptions.
 */

export interface LogDetails {
  type: string;
  target?: string;
  description: string;
  [key: string]: any;
}

/**
 * Format action name for display
 * Converts action codes to proper display names
 */
export function formatActionName(action: string): string {
  const actionMap: Record<string, string> = {
    'create': 'Create',
    'update': 'Update',
    'delete': 'Delete',
    'view': 'View',
    'print': 'Print',
    'login': 'Log In',
    'logout': 'Log Out',
    'export': 'Export',
    'import': 'Import',
    'delete_logs': 'Delete Logs',
    'bulk_update': 'Bulk Update',
    'bulk_delete': 'Bulk Delete',
    'bulk_generate': 'Bulk Generate'
  };

  return actionMap[action] || action.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Format target/category name for display
 */
export function formatTargetName(target: string): string {
  const targetMap: Record<string, string> = {
    'attendee': 'Attendee',
    'attendees': 'Attendees',
    'user': 'User',
    'users': 'Users',
    'role': 'Role',
    'roles': 'Roles',
    'settings': 'Settings',
    'event_settings': 'Event Settings',
    'custom_field': 'Custom Field',
    'custom_fields': 'Custom Fields',
    'credential': 'Badge',
    'badge': 'Badge',
    'system': 'System',
    'auth': 'Authentication',
    'logs': 'Activity Logs',
    'integration': 'Integration'
  };

  return targetMap[target] || target.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

/**
 * Create log details for attendee operations
 */
export function createAttendeeLogDetails(
  action: 'create' | 'update' | 'delete' | 'view' | 'print',
  attendee: { firstName: string; lastName: string; barcodeNumber?: string },
  additionalDetails?: Record<string, any>
): LogDetails {
  const fullName = `${attendee.firstName} ${attendee.lastName}`;
  
  let description = '';
  
  if (action === 'create') {
    description = `Created attendee ${fullName}`;
    if (attendee.barcodeNumber) {
      description += ` (${attendee.barcodeNumber})`;
    }
  } else if (action === 'update') {
    description = `Updated attendee ${fullName}`;
    // Add changed fields if provided
    const changes = additionalDetails?.changes as string[] | undefined;
    if (changes && changes.length > 0) {
      const fieldList = changes.slice(0, 3).join(', ');
      const remaining = changes.length - Math.min(3, changes.length);
      description += ` (${fieldList}${remaining > 0 ? ` and ${remaining} more` : ''})`;
    }
  } else if (action === 'delete') {
    description = `Deleted attendee ${fullName}`;
    if (attendee.barcodeNumber) {
      description += ` (${attendee.barcodeNumber})`;
    }
  } else if (action === 'view') {
    description = `Viewed attendee ${fullName}`;
  } else if (action === 'print') {
    description = `Printed badge for ${fullName}`;
    if (attendee.barcodeNumber) {
      description += ` (${attendee.barcodeNumber})`;
    }
  }

  return {
    type: 'attendee',
    target: 'Attendee',
    description,
    firstName: attendee.firstName,
    lastName: attendee.lastName,
    ...(attendee.barcodeNumber && { barcodeNumber: attendee.barcodeNumber }),
    ...additionalDetails
  };
}

/**
 * Create log details for bulk attendee operations
 */
export function createBulkAttendeeLogDetails(
  action: 'bulk_update' | 'bulk_delete' | 'bulk_generate',
  count: number,
  additionalDetails?: Record<string, any>
): LogDetails {
  // Build description with sample names if provided
  let description = '';
  const names = additionalDetails?.names as string[] | undefined;
  
  if (action === 'bulk_update') {
    description = `Updated ${count} attendee${count !== 1 ? 's' : ''}`;
    if (names && names.length > 0) {
      const sampleNames = names.slice(0, 3).join(', ');
      const remaining = count - Math.min(3, names.length);
      description += ` including ${sampleNames}${remaining > 0 ? ` and ${remaining} more` : ''}`;
    }
  } else if (action === 'bulk_delete') {
    description = `Deleted ${count} attendee${count !== 1 ? 's' : ''}`;
    if (names && names.length > 0) {
      const sampleNames = names.slice(0, 3).join(', ');
      const remaining = count - Math.min(3, names.length);
      description += ` including ${sampleNames}${remaining > 0 ? ` and ${remaining} more` : ''}`;
    }
  } else if (action === 'bulk_generate') {
    description = `Generated ${count} credential${count !== 1 ? 's' : ''}`;
    if (names && names.length > 0) {
      const sampleNames = names.slice(0, 3).join(', ');
      const remaining = count - Math.min(3, names.length);
      description += ` for ${sampleNames}${remaining > 0 ? ` and ${remaining} more` : ''}`;
    }
  }

  return {
    type: 'attendees',
    target: 'Attendees',
    description,
    count,
    ...additionalDetails
  };
}

/**
 * Create log details for user operations
 */
export function createUserLogDetails(
  action: 'create' | 'update' | 'delete' | 'view',
  user: { name?: string; email: string },
  additionalDetails?: Record<string, any>
): LogDetails {
  const userName = user.name || user.email.split('@')[0];
  
  let description = '';
  
  if (action === 'create') {
    description = `Created user ${userName} (${user.email})`;
    if (additionalDetails?.role) {
      description += ` with role "${additionalDetails.role}"`;
    }
  } else if (action === 'update') {
    description = `Updated user ${userName}`;
    const changes = additionalDetails?.changes as string[] | undefined;
    if (changes && changes.length > 0) {
      const fieldList = changes.slice(0, 3).join(', ');
      const remaining = changes.length - Math.min(3, changes.length);
      description += ` (${fieldList}${remaining > 0 ? ` and ${remaining} more` : ''})`;
    }
  } else if (action === 'delete') {
    description = `Deleted user ${userName} (${user.email})`;
  } else if (action === 'view') {
    description = `Viewed user ${userName}`;
  }

  return {
    type: 'system', // User operations are system operations
    target: userName,
    description,
    email: user.email,
    ...(user.name && { name: user.name }),
    ...additionalDetails
  };
}

/**
 * Create log details for role operations
 */
export function createRoleLogDetails(
  action: 'create' | 'update' | 'delete' | 'view',
  role: { name: string; id?: string },
  additionalDetails?: Record<string, any>
): LogDetails {
  let description = '';
  
  if (action === 'create') {
    description = `Created role "${role.name}"`;
    if (additionalDetails?.description) {
      description += ` - ${additionalDetails.description}`;
    }
  } else if (action === 'update') {
    description = `Updated role "${role.name}"`;
    const changes = additionalDetails?.changes as string[] | undefined;
    if (changes && changes.length > 0) {
      const fieldList = changes.slice(0, 3).join(', ');
      const remaining = changes.length - Math.min(3, changes.length);
      description += ` (${fieldList}${remaining > 0 ? ` and ${remaining} more` : ''})`;
    }
  } else if (action === 'delete') {
    description = `Deleted role "${role.name}"`;
  } else if (action === 'view') {
    description = `Viewed role "${role.name}"`;
  }

  return {
    type: 'system', // Role operations are system operations
    target: role.name,
    description,
    roleName: role.name,
    ...(role.id && { roleId: role.id }),
    ...additionalDetails
  };
}

/**
 * Create log details for settings operations
 */
export function createSettingsLogDetails(
  action: 'update' | 'view',
  settingsType: 'event' | 'log' | 'integration',
  additionalDetails?: Record<string, any>
): LogDetails {
  const typeNames: Record<string, string> = {
    event: 'event settings',
    log: 'log settings',
    integration: 'integration settings'
  };

  let description = '';
  
  if (action === 'update') {
    description = `Updated ${typeNames[settingsType]}`;
    const changes = additionalDetails?.changes as string[] | undefined;
    if (changes && changes.length > 0) {
      const fieldList = changes.slice(0, 3).join(', ');
      const remaining = changes.length - Math.min(3, changes.length);
      description += ` (${fieldList}${remaining > 0 ? ` and ${remaining} more` : ''})`;
    }
  } else if (action === 'view') {
    description = `Viewed ${typeNames[settingsType]}`;
  }

  return {
    type: 'settings',
    target: 'Settings',
    description,
    settingsType,
    ...additionalDetails
  };
}

/**
 * Create log details for authentication operations
 */
export function createAuthLogDetails(
  action: 'login' | 'logout',
  additionalDetails?: Record<string, any>
): LogDetails {
  const descriptions: Record<string, string> = {
    login: 'User logged in',
    logout: 'User logged out'
  };

  return {
    type: 'system', // Auth operations are system operations
    target: 'Authentication',
    description: descriptions[action],
    ...additionalDetails
  };
}

/**
 * Create log details for export operations
 */
export function createExportLogDetails(
  exportType: 'attendees' | 'logs',
  format: 'csv' | 'pdf',
  count?: number,
  additionalDetails?: Record<string, any>
): LogDetails {
  const typeNames: Record<string, string> = {
    attendees: 'attendees',
    logs: 'activity logs'
  };

  let description = count !== undefined
    ? `Exported ${count} ${typeNames[exportType]} as ${format.toUpperCase()}`
    : `Exported ${typeNames[exportType]} as ${format.toUpperCase()}`;

  // Add filename if provided
  if (additionalDetails?.filename) {
    description += ` (${additionalDetails.filename})`;
  }

  return {
    type: 'system', // Export operations are system operations
    target: 'Export',
    description,
    format,
    exportType,
    ...(count !== undefined && { count }),
    ...additionalDetails
  };
}

/**
 * Create log details for import operations
 */
export function createImportLogDetails(
  importType: 'attendees',
  count: number,
  additionalDetails?: Record<string, any>
): LogDetails {
  let description = `Imported ${count} ${importType}`;
  
  // Add source information if provided
  if (additionalDetails?.filename) {
    description += ` from ${additionalDetails.filename}`;
  } else if (additionalDetails?.source) {
    description += ` from ${additionalDetails.source}`;
  }

  // Add sample names if provided
  const names = additionalDetails?.names as string[] | undefined;
  if (names && names.length > 0) {
    const sampleNames = names.slice(0, 3).join(', ');
    const remaining = count - Math.min(3, names.length);
    description += ` including ${sampleNames}${remaining > 0 ? ` and ${remaining} more` : ''}`;
  }

  return {
    type: 'system', // Import operations are system operations
    target: 'Import',
    description,
    count,
    importType,
    ...additionalDetails
  };
}

/**
 * Create log details for system operations
 */
export function createSystemLogDetails(
  operation: string,
  description: string,
  additionalDetails?: Record<string, any>
): LogDetails {
  return {
    type: 'system',
    target: 'System',
    description,
    operation,
    ...additionalDetails
  };
}

/**
 * Create log details for delete logs operation
 */
export function createDeleteLogsDetails(
  deletedCount: number,
  filters?: { beforeDate?: string; action?: string; userId?: string },
  additionalDetails?: Record<string, any>
): LogDetails {
  const filterParts = [];
  if (filters?.beforeDate) filterParts.push(`before ${new Date(filters.beforeDate).toLocaleDateString()}`);
  if (filters?.action) filterParts.push(`action: ${filters.action}`);
  if (filters?.userId) filterParts.push(`user filter applied`);
  const filterDesc = filterParts.length > 0 ? ` (${filterParts.join(', ')})` : '';

  return {
    type: 'system',
    target: 'Activity Logs',
    description: `Deleted ${deletedCount} log${deletedCount !== 1 ? 's' : ''}${filterDesc}`,
    deletedCount,
    ...(filters && { filters }),
    ...additionalDetails
  };
}

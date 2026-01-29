/**
 * Saved Reports Type Definitions
 *
 * This module provides TypeScript types for the Saved Reports feature,
 * which enables users to persist, recall, and manage complex search
 * filter configurations within the Advanced Filters dialog.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 */

import type { AdvancedSearchFilters } from '@/lib/filterUtils';

/**
 * Saved report entity stored in the Appwrite database
 *
 * Represents a user's saved filter configuration that can be
 * loaded back into the Advanced Filters dialog.
 *
 * Requirements: 6.2
 */
export interface SavedReport {
  /** Appwrite document ID */
  $id: string;
  /** User-provided report name (required) */
  name: string;
  /** Optional description of the report */
  description?: string;
  /** Owner's user ID - associates report with creator */
  userId: string;
  /** JSON-serialized AdvancedSearchFilters configuration */
  filterConfiguration: string;
  /** ISO timestamp of report creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** ISO timestamp of last time report was loaded (optional) */
  lastAccessedAt?: string;
}

/**
 * Payload for creating a new report
 *
 * Used when saving a new filter configuration as a report.
 * The filterConfiguration is passed as the actual object and
 * will be serialized to JSON before storage.
 *
 * Requirements: 1.2, 1.4
 */
export interface CreateReportPayload {
  /** Report name (required, cannot be empty) */
  name: string;
  /** Optional description */
  description?: string;
  /** Filter configuration to save (will be JSON-serialized) */
  filterConfiguration: AdvancedSearchFilters;
}

/**
 * Payload for updating an existing report
 *
 * All fields are optional - only provided fields will be updated.
 *
 * Requirements: 3.2, 3.5
 */
export interface UpdateReportPayload {
  /** Updated report name */
  name?: string;
  /** Updated description */
  description?: string;
  /** Updated filter configuration (will be JSON-serialized) */
  filterConfiguration?: AdvancedSearchFilters;
}

/**
 * Stale parameter information for error correction
 *
 * When a saved report references a custom field or value that
 * no longer exists, this interface describes the stale reference
 * so users can correct or remove it.
 *
 * Requirements: 4.2, 4.4, 4.9
 */
export interface StaleParameter {
  /** Type of stale reference */
  type: 'customField' | 'customFieldValue';
  /** ID of the custom field that is stale or contains stale values */
  fieldId: string;
  /** Original field name for display purposes */
  fieldName: string;
  /** Original filter value(s) that are stale */
  originalValue?: string | string[];
  /** Reason why the parameter is stale */
  reason: 'field_deleted' | 'value_deleted';
}

/**
 * Result of validating a report's filter configuration
 *
 * When loading a report, the system validates that all referenced
 * custom fields and values still exist. This interface contains
 * the validation result and a cleaned configuration with stale
 * parameters removed.
 *
 * Requirements: 4.1, 4.2, 4.3
 */
export interface ReportValidationResult {
  /** Whether the report configuration is fully valid (no stale parameters) */
  isValid: boolean;
  /** List of stale parameters found in the configuration */
  staleParameters: StaleParameter[];
  /** Configuration with stale parameters removed - safe to apply */
  validConfiguration: AdvancedSearchFilters;
}

/**
 * API response when loading a report
 *
 * Combines the saved report data with validation results.
 */
export interface LoadReportResponse {
  /** The saved report data */
  report: SavedReport;
  /** Validation result including stale parameter detection */
  validation: ReportValidationResult;
}

/**
 * API error response for report operations
 */
export interface ReportErrorResponse {
  /** Error code for programmatic handling */
  code: 'INVALID_REQUEST' | 'REPORT_NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_NAME' | 'DUPLICATE_NAME' | 'INVALID_CONFIGURATION' | 'DATABASE_ERROR' | 'STALE_PARAMETERS_DETECTED' | 'METHOD_NOT_ALLOWED';
  /** Human-readable error message */
  message: string;
  /** Additional error details (optional) */
  details?: unknown;
}

/**
 * Stale parameter error with correction options
 *
 * Returned when a report contains stale parameters, providing
 * the user with options for how to proceed.
 *
 * Requirements: 4.3, 4.8
 */
export interface StaleParameterError extends ReportErrorResponse {
  code: 'STALE_PARAMETERS_DETECTED';
  /** List of stale parameters found */
  staleParameters: StaleParameter[];
  /** Configuration with stale parameters removed */
  validConfiguration: AdvancedSearchFilters;
  /** Available correction options */
  options: {
    /** Can apply with only valid parameters */
    applyValid: boolean;
    /** Can fix and save corrections */
    canFix: boolean;
  };
}

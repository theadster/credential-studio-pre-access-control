/**
 * useReports Hook
 *
 * React hook for managing saved reports CRUD operations.
 * Provides methods for creating, reading, updating, and deleting reports,
 * with loading states, error handling, and validation result handling.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * Requirements: 1.2, 2.2, 3.4, 3.5
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  SavedReport,
  CreateReportPayload,
  UpdateReportPayload,
  ReportValidationResult,
  LoadReportResponse,
  ReportErrorResponse,
} from '@/types/reports';
import type { AdvancedSearchFilters } from '@/lib/filterUtils';

/**
 * Return type for the useReports hook
 */
export interface UseReportsReturn {
  /** List of saved reports */
  reports: SavedReport[];
  /** Loading state for list operations */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether user has permission to access reports */
  hasPermission: boolean;

  // CRUD operations
  /** Create a new report - returns result object instead of throwing */
  createReport: (payload: CreateReportPayload) => Promise<CreateReportResult>;
  /** Update an existing report - returns result object instead of throwing */
  updateReport: (id: string, payload: UpdateReportPayload) => Promise<UpdateReportResult>;
  /** Delete a report */
  deleteReport: (id: string) => Promise<void>;
  /** Load a report with validation */
  loadReport: (id: string) => Promise<LoadReportResult>;

  /** Refresh the reports list */
  refreshReports: () => Promise<void>;
}

/**
 * Result of creating a report - uses result pattern instead of throwing
 */
export interface CreateReportResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** The created report (only present on success) */
  report?: SavedReport;
  /** Error code (only present on failure) */
  errorCode?: string;
  /** Error message (only present on failure) */
  errorMessage?: string;
}

/**
 * Result of updating a report - uses result pattern instead of throwing
 */
export interface UpdateReportResult {
  /** Whether the operation succeeded */
  success: boolean;
  /** The updated report (only present on success) */
  report?: SavedReport;
  /** Error code (only present on failure) */
  errorCode?: string;
  /** Error message (only present on failure) */
  errorMessage?: string;
}

/**
 * Result of loading a report, includes validation information
 */
export interface LoadReportResult {
  /** The loaded report */
  report: SavedReport;
  /** Validation result with stale parameter detection */
  validation: ReportValidationResult;
  /** Parsed filter configuration */
  filterConfiguration: AdvancedSearchFilters;
}

/**
 * API response for listing reports
 */
interface ListReportsResponse {
  reports: SavedReport[];
  total: number;
}

/**
 * Check if response is an error response
 */
function isErrorResponse(data: unknown): data is ReportErrorResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'code' in data &&
    'message' in data
  );
}

/**
 * Custom error class for report operations
 */
export class ReportError extends Error {
  code: string;
  details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ReportError';
    this.code = code;
    this.details = details;
  }
}

/**
 * useReports Hook
 *
 * Provides CRUD operations for saved reports with loading states,
 * error handling, and validation result handling.
 *
 * Requirements: 1.2, 2.2, 3.4, 3.5
 */
export function useReports(): UseReportsReturn {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasPermission, setHasPermission] = useState(true);

  /**
   * Fetch reports list from API
   * Requirements: 2.1 - List reports for current user
   */
  const fetchReports = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal,
      });

      const data = await response.json();

      if (!response.ok) {
        if (isErrorResponse(data)) {
          // If it's a permission error, silently handle it - don't show error
          if (data.code === 'PERMISSION_DENIED') {
            setReports([]);
            setError(null);
            setHasPermission(false);
            return;
          }
          throw new ReportError(data.code, data.message, data.details);
        }
        throw new Error('Failed to fetch reports');
      }

      setHasPermission(true);
      const listResponse = data as ListReportsResponse;
      setReports(listResponse.reports);
    } catch (err) {
      // Ignore abort errors - request was cancelled intentionally
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error('[useReports] Error fetching reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh reports list
   */
  const refreshReports = useCallback(async (): Promise<void> => {
    await fetchReports();
  }, [fetchReports]);

  /**
   * Create a new report
   * Requirements: 1.2 - Persist filter configuration to database
   * 
   * Uses result pattern instead of throwing to avoid Next.js error overlay
   * for expected errors like duplicate names.
   */
  const createReport = useCallback(
    async (payload: CreateReportPayload): Promise<CreateReportResult> => {
      try {
        const response = await fetch('/api/reports', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          if (isErrorResponse(data)) {
            // Return error result instead of throwing
            return {
              success: false,
              errorCode: data.code,
              errorMessage: data.message,
            };
          }
          return {
            success: false,
            errorCode: 'UNKNOWN_ERROR',
            errorMessage: 'Failed to create report',
          };
        }

        const newReport = data as SavedReport;

        // Update local state with new report
        setReports((prev) => [newReport, ...prev]);

        return {
          success: true,
          report: newReport,
        };
      } catch (err) {
        // Only catch unexpected errors (network errors, etc.)
        const message = err instanceof Error ? err.message : 'Failed to create report';
        console.error('[useReports] Unexpected error creating report:', err);
        return {
          success: false,
          errorCode: 'UNEXPECTED_ERROR',
          errorMessage: message,
        };
      }
    },
    []
  );

  /**
   * Update an existing report
   * Requirements: 3.5 - Update stored filter configuration and modification timestamp
   * 
   * Uses result pattern instead of throwing to avoid Next.js error overlay
   * for expected errors like duplicate names.
   */
  const updateReport = useCallback(
    async (id: string, payload: UpdateReportPayload): Promise<UpdateReportResult> => {
      try {
        const response = await fetch(`/api/reports/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          if (isErrorResponse(data)) {
            // Return error result instead of throwing
            return {
              success: false,
              errorCode: data.code,
              errorMessage: data.message,
            };
          }
          return {
            success: false,
            errorCode: 'UNKNOWN_ERROR',
            errorMessage: 'Failed to update report',
          };
        }

        const updatedReport = data as SavedReport;

        // Update local state
        setReports((prev) =>
          prev.map((report) => (report.$id === id ? updatedReport : report))
        );

        return {
          success: true,
          report: updatedReport,
        };
      } catch (err) {
        // Only catch unexpected errors (network errors, etc.)
        const message = err instanceof Error ? err.message : 'Failed to update report';
        console.error('[useReports] Unexpected error updating report:', err);
        return {
          success: false,
          errorCode: 'UNEXPECTED_ERROR',
          errorMessage: message,
        };
      }
    },
    [],
  );

  /**
   * Delete a report
   * Requirements: 3.4 - Remove report from database
   */
  const deleteReport = useCallback(async (id: string): Promise<void> => {
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        if (isErrorResponse(data)) {
          throw new ReportError(data.code, data.message, data.details);
        }
        throw new Error('Failed to delete report');
      }

      // Update local state by removing the deleted report
      setReports((prev) => prev.filter((report) => report.$id !== id));
    } catch (err) {
      const error = err instanceof ReportError ? err : new Error('Failed to delete report');
      console.error('[useReports] Error deleting report:', error);
      throw error;
    }
  }, []);

  /**
   * Load a report with validation
   * Requirements: 2.2 - Load saved filter configuration into dialog
   */
  const loadReport = useCallback(async (id: string): Promise<LoadReportResult> => {
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (isErrorResponse(data)) {
          throw new ReportError(data.code, data.message, data.details);
        }
        throw new Error('Failed to load report');
      }

      const loadResponse = data as LoadReportResponse;

      // Parse the filter configuration from JSON string
      let filterConfiguration: AdvancedSearchFilters;
      try {
        filterConfiguration = JSON.parse(loadResponse.report.filterConfiguration);
      } catch {
        throw new ReportError(
          'INVALID_CONFIGURATION',
          'Failed to parse report filter configuration'
        );
      }

      // Update local state with the loaded report (updates lastAccessedAt)
      setReports((prev) =>
        prev.map((report) =>
          report.$id === id
            ? { ...report, lastAccessedAt: loadResponse.report.lastAccessedAt }
            : report
        )
      );

      return {
        report: loadResponse.report,
        validation: loadResponse.validation,
        filterConfiguration,
      };
    } catch (err) {
      const error = err instanceof ReportError ? err : new Error('Failed to load report');
      console.error('[useReports] Error loading report:', error);
      throw error;
    }
  }, []);

  // Fetch reports on mount with proper cleanup
  useEffect(() => {
    const controller = new AbortController();
    fetchReports(controller.signal);

    return () => {
      controller.abort();
    };
  }, [fetchReports]);

  return {
    reports,
    isLoading,
    error,
    hasPermission,
    createReport,
    updateReport,
    deleteReport,
    loadReport,
    refreshReports,
  };
}

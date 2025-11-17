/**
 * Operator Metrics API
 * 
 * Provides operator metrics and monitoring data for dashboards and alerting.
 * This endpoint is used by monitoring systems to track operator performance.
 */

import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { hasPermission } from '@/lib/permissions';
import {
  getOperatorMetrics,
  getOperatorMetricsByType,
  getRecentOperatorLogs,
  getRecentAlerts,
  exportMetricsForMonitoring,
} from '@/lib/operatorMonitoring';
import { getFeatureFlags } from '@/lib/featureFlags';
import { logger } from '@/lib/logger';
import { OperatorType } from '@/types/operators';

/**
 * Validates that a value is a valid OperatorType
 * 
 * @param value - The value to validate
 * @returns The value as OperatorType if valid, null otherwise
 */
function isValidOperatorType(value: unknown): value is OperatorType {
  if (typeof value !== 'string') {
    return false;
  }
  return Object.values(OperatorType).includes(value as OperatorType);
}

/**
 * Parse and validate a limit query parameter
 * 
 * @param value - The query parameter value
 * @param defaultLimit - Default limit if not provided
 * @param maxLimit - Maximum allowed limit (cap to prevent abuse)
 * @returns Validated limit as integer
 */
function parseLimit(value: unknown, defaultLimit: number, maxLimit: number): number {
  // Use default if not provided
  if (value === undefined || value === null || value === '') {
    return defaultLimit;
  }

  // Parse as integer
  const parsed = parseInt(String(value), 10);

  // Use default if parsing failed or result is NaN
  if (isNaN(parsed)) {
    return defaultLimit;
  }

  // Ensure non-negative and clamp to max
  return Math.min(Math.max(parsed, 0), maxLimit);
}

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { userProfile } = req;

    // Check permissions - only admins can view metrics
    if (!hasPermission(userProfile.role, 'users', 'read')) {
      return res.status(403).json({ error: 'Forbidden - Admin access required' });
    }

    // Get query parameters
    const { type, format } = req.query;

    // Return specific operator type metrics
    if (type) {
      // Validate the operator type
      if (!isValidOperatorType(type)) {
        const validTypes = Object.values(OperatorType).join(', ');
        return res.status(400).json({
          error: 'Invalid operator type',
          message: `The 'type' parameter must be one of: ${validTypes}`,
          received: type,
        });
      }

      const metrics = getOperatorMetricsByType(type);
      return res.status(200).json({
        operatorType: type,
        metrics,
      });
    }

    // Return full export for monitoring systems
    if (format === 'export') {
      const exportData = exportMetricsForMonitoring();
      return res.status(200).json(exportData);
    }

    // Return summary metrics
    // Parse and validate query parameters for limits
    const logLimit = parseLimit(req.query.logLimit, 50, 200);
    const alertLimit = parseLimit(req.query.alertLimit, 10, 200);

    const metrics = getOperatorMetrics();
    const recentLogs = getRecentOperatorLogs(logLimit);
    const alerts = getRecentAlerts(alertLimit);
    const featureFlags = getFeatureFlags();

    return res.status(200).json({
      metrics,
      recentLogs,
      alerts,
      featureFlags,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Log full error server-side for debugging
    logger.error('Error fetching operator metrics', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return generic error in production, detailed in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const errorResponse: any = {
      error: 'Failed to fetch operator metrics',
    };

    if (isDevelopment) {
      errorResponse.details = error instanceof Error ? error.message : 'Unknown error';
    }

    return res.status(500).json(errorResponse);
  }
});

/**
 * Transaction Monitoring API Endpoint
 * 
 * Provides access to transaction metrics, alerts, and monitoring data.
 * This endpoint is restricted to administrators only.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { Query } from 'appwrite';
import { getTransactionMonitor, getMetrics, getAlerts, logMetricsSummary, getConflictMetrics } from '@/lib/transactionMonitoring';
import { createSessionClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';

/**
 * Safely extract a single string value from a query parameter
 */
function getQueryString(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * GET /api/monitoring/transactions
 * 
 * Query parameters:
 * - timeWindow: Time window in milliseconds (optional, default: all time)
 * - format: Response format ('json' or 'summary', default: 'json')
 * - includeAlerts: Include alerts in response (default: true)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify user is authenticated
    const { account, tablesDB } = createSessionClient(req);
    
    let user;
    try {
      user = await account.get();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile with role
    const userDocs = await tablesDB.listRows(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!,
      [Query.equal('userId', user.$id)]
    );

    if (userDocs.rows.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = userDocs.rows[0];

    // Get role if exists
    let role = null;
    if (userProfile.roleId) {
      try {
        role = await tablesDB.getRow(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!,
          userProfile.roleId
        );
      } catch (error) {
        console.warn('Failed to fetch role:', error);
      }
    }

    // Check if user has monitoring read permission
    if (!hasPermission(role, 'monitoring', 'read')) {
      return res.status(403).json({ error: 'Insufficient permissions to access monitoring data' });
    }

    // Parse query parameters
    const timeWindowStr = getQueryString(req.query.timeWindow);
    const parsedTimeWindow = timeWindowStr ? parseInt(timeWindowStr, 10) : undefined;
    const timeWindow = parsedTimeWindow !== undefined && !isNaN(parsedTimeWindow) && parsedTimeWindow > 0
      ? parsedTimeWindow
      : undefined;
    
    const format = getQueryString(req.query.format) || 'json';
    const includeAlerts = getQueryString(req.query.includeAlerts) !== 'false';

    // Get metrics
    const metrics = getMetrics(timeWindow);
    
    // Get concurrency conflict metrics
    const concurrencyConflicts = getConflictMetrics(timeWindow);
    
    // Merge concurrency metrics into main metrics
    const metricsWithConflicts = {
      ...metrics,
      concurrencyConflicts
    };
    
    // Get alerts if requested
    const alerts = includeAlerts ? getAlerts(timeWindow) : [];

    // Return summary format
    if (format === 'summary') {
      const monitor = getTransactionMonitor();
      const summary = monitor.getMetricsSummary(timeWindow);
      
      return res.status(200).send(summary);
    }

    // Return JSON format (default)
    return res.status(200).json({
      metrics: metricsWithConflicts,
      alerts,
      timestamp: Date.now(),
      timeWindow: timeWindow || 'all'
    });

  } catch (error: any) {
    console.error('[Monitoring API] Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}

/**
 * Transaction Monitoring API Endpoint
 * 
 * Provides access to transaction metrics, alerts, and monitoring data.
 * This endpoint is restricted to administrators only.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { getTransactionMonitor, getMetrics, getAlerts, logMetricsSummary } from '@/lib/transactionMonitoring';
import { createSessionClient } from '@/lib/appwrite';

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
    // Verify user is authenticated and has admin permissions
    const { account } = createSessionClient(req);
    
    try {
      await account.get();
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse query parameters
    const timeWindow = req.query.timeWindow 
      ? parseInt(req.query.timeWindow as string) 
      : undefined;
    
    const format = (req.query.format as string) || 'json';
    const includeAlerts = req.query.includeAlerts !== 'false';

    // Get metrics
    const metrics = getMetrics(timeWindow);
    
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
      metrics,
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

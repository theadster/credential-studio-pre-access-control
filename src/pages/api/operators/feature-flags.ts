/**
 * Feature Flags API
 * 
 * Allows administrators to view and update operator feature flags at runtime.
 * This enables gradual rollout and quick rollback if issues are detected.
 */

import type { NextApiResponse } from 'next';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import {
  getFeatureFlags,
  updateFeatureFlags,
  resetFeatureFlags,
  OperatorFeatureFlags,
} from '@/lib/featureFlags';
import { ROLE_NAMES } from '@/constants/roles';
import { logger } from '@/lib/logger';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // userProfile is already attached by middleware
    const { userProfile } = req;

    // Check permissions - only super admins can manage feature flags
    if (userProfile.role?.name !== ROLE_NAMES.SUPER_ADMIN) {
      return res.status(403).json({ error: `Forbidden - ${ROLE_NAMES.SUPER_ADMIN} access required` });
    }

    // Handle GET - retrieve current feature flags
    if (req.method === 'GET') {
      const flags = getFeatureFlags();
      return res.status(200).json({
        flags,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle PUT - update feature flags
    if (req.method === 'PUT') {
      const updates: Partial<OperatorFeatureFlags> = req.body;

      // Validate updates
      const validKeys: (keyof OperatorFeatureFlags)[] = [
        'enableOperators',
        'enableCredentialOperators',
        'enablePhotoOperators',
        'enableBulkOperators',
        'enableLoggingOperators',
        'enableArrayOperators',
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (!validKeys.includes(key as keyof OperatorFeatureFlags)) {
          return res.status(400).json({
            error: `Invalid feature flag: ${key}`,
            validKeys,
          });
        }

        if (typeof value !== 'boolean') {
          return res.status(400).json({
            error: `Feature flag ${key} must be a boolean`,
          });
        }
      }

      // Update flags
      updateFeatureFlags(updates);

      const updatedFlags = getFeatureFlags();

      // Log the change (privacy-safe: no raw userId)
      logger.info('Feature flags updated', {
        updates,
        timestamp: new Date().toISOString(),
      });

      return res.status(200).json({
        message: 'Feature flags updated successfully',
        flags: updatedFlags,
        timestamp: new Date().toISOString(),
      });
    }

    // Handle POST - reset to defaults
    if (req.method === 'POST') {
      // Validate POST body
      if (!req.body || typeof req.body.action !== 'string') {
        return res.status(400).json({
          error: 'Invalid or missing action. Expected { action: "reset" }',
        });
      }

      if (req.body.action === 'reset') {
        resetFeatureFlags();

        const flags = getFeatureFlags();

        // Log the reset (privacy-safe: no raw userId)
        logger.info('Feature flags reset to defaults', {
          timestamp: new Date().toISOString(),
        });

        return res.status(200).json({
          message: 'Feature flags reset to defaults',
          flags,
          timestamp: new Date().toISOString(),
        });
      }

      // Unsupported action
      return res.status(400).json({
        error: 'Invalid or missing action. Expected { action: "reset" }',
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    // Log full error server-side for debugging
    logger.error('Error managing feature flags', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });

    // Return generic error in production, detailed in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    const errorResponse: any = {
      error: 'Failed to manage feature flags',
    };

    if (isDevelopment) {
      errorResponse.details = error instanceof Error ? error.message : 'Unknown error';
    }

    return res.status(500).json(errorResponse);
  }
});

import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { executeTransactionWithRetry, handleTransactionError, type TransactionOperation } from '@/lib/transactions';

/**
 * REORDER CUSTOM FIELDS ENDPOINT (TRANSACTION-BASED)
 * 
 * Reorders multiple custom fields atomically using transactions.
 * All order updates and the audit log are created in a single transaction
 * to ensure data consistency and complete audit trail.
 * 
 * Request Body:
 * - fieldOrders: Array<{ id: string, order: number }> (required)
 *   Array of field IDs with their new order values
 * 
 * Transaction Behavior:
 * - All order updates and audit log are atomic (all succeed or all fail)
 * - Automatic retry on conflicts (up to 3 times with exponential backoff)
 * - Automatic rollback on any failure
 * - No partial reordering - either all fields are reordered or none are
 * - No orphaned audit logs
 * 
 * Error Handling:
 * - 400: Invalid request data
 * - 403: Insufficient permissions
 * - 404: One or more fields not found
 * - 409: Conflict (concurrent modification) - retryable
 * - 500: Server error
 * 
 * Requirements: 7.4, 7.5, 7.6
 */
export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases, tablesDB } = createSessionClient(req);

    if (req.method !== 'PUT') {
      res.setHeader('Allow', ['PUT']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasUpdatePermission = permissions?.all === true || permissions?.customFields?.update === true;

    if (!hasUpdatePermission) {
      return res.status(403).json({ error: 'Insufficient permissions to reorder custom fields' });
    }

    const { fieldOrders } = req.body;

    // Validate request data
    if (!fieldOrders || !Array.isArray(fieldOrders)) {
      return res.status(400).json({ error: 'Invalid field orders data' });
    }

    if (fieldOrders.length === 0) {
      return res.status(400).json({ error: 'Field orders array cannot be empty' });
    }

    // Validate each field order entry
    for (const entry of fieldOrders) {
      if (!entry.id || typeof entry.id !== 'string') {
        return res.status(400).json({ 
          error: 'Invalid field order entry',
          details: 'Each entry must have a valid id string'
        });
      }
      if (typeof entry.order !== 'number') {
        return res.status(400).json({ 
          error: 'Invalid field order entry',
          details: 'Each entry must have a valid order number'
        });
      }
    }

    // Verify all fields exist before starting transaction
    // This prevents transaction failures due to non-existent fields
    for (const { id } of fieldOrders) {
      try {
        await databases.getDocument({
          databaseId: dbId,
          collectionId: customFieldsCollectionId,
          documentId: id
        });
      } catch (error: any) {
        return res.status(404).json({ 
          error: 'Custom field not found',
          fieldId: id
        });
      }
    }

    // Check if logging is enabled
    const loggingEnabled = await shouldLog('customFieldReorder');

    // Build transaction operations for all order updates
    const operations: TransactionOperation[] = fieldOrders.map(({ id, order }) => ({
      action: 'update',
      databaseId: dbId,
      tableId: customFieldsCollectionId,
      rowId: id,
      data: { order }
    }));

    // Add audit log if logging is enabled
    if (loggingEnabled) {
      operations.push({
        action: 'create',
        databaseId: dbId,
        tableId: logsCollectionId,
        rowId: ID.unique(),
        data: {
          userId: user.$id,
          action: 'update',
          details: JSON.stringify({
            type: 'custom_fields_reorder',
            fieldCount: fieldOrders.length,
            fieldOrders: fieldOrders.map(({ id, order }) => ({ id, order }))
          })
        }
      });
    }

    // Execute transaction with automatic retry on conflicts
    try {
      await executeTransactionWithRetry(tablesDB, operations, {
        maxRetries: 3,
        retryDelay: 100
      });

      return res.status(200).json({ 
        success: true,
        message: 'Custom fields reordered successfully',
        fieldCount: fieldOrders.length
      });
    } catch (error: any) {
      console.error('[Reorder] Transaction failed:', error);
      return handleTransactionError(error, res);
    }
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
});
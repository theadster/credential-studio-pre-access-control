import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { ID } from 'node-appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { handleTransactionError } from '@/lib/transactions';

/**
 * REORDER CUSTOM FIELDS ENDPOINT (ATOMIC BULK OPERATION)
 * 
 * Reorders multiple custom fields atomically using TablesDB bulk operations.
 * All order updates are performed in a single atomic operation.
 * 
 * Request Body:
 * - fieldOrders: Array<{ id: string, order: number }> (required)
 *   Array of field IDs with their new order values
 * 
 * Atomic Behavior:
 * - All order updates are atomic (all succeed or all fail)
 * - Uses TablesDB.upsertRows() for atomic bulk updates
 * - No partial reordering - either all fields are reordered or none are
 * - Audit log is created separately (not atomic with reorder)
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
    const { databases } = createSessionClient(req);
    
    // TablesDB bulk operations require API key authentication (admin client)
    const { createAdminClient } = await import('@/lib/appwrite');
    const { tablesDB: adminTablesDB } = createAdminClient();

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

    // Fetch existing documents to merge with updates (TablesDB requires all required fields)
    console.log(`[Reorder] Fetching ${fieldOrders.length} custom fields for atomic update`);
    const existingDocs = await Promise.all(
      fieldOrders.map(({ id }) =>
        databases.getDocument(dbId, customFieldsCollectionId, id)
      )
    );

    // Prepare rows for atomic upsert
    const rows = fieldOrders.map(({ id, order }, index) => {
      const existingDoc = existingDocs[index];
      // Remove Appwrite metadata fields
      const { $permissions, $createdAt, $updatedAt, $collectionId, $databaseId, ...docData } = existingDoc as any;
      
      return {
        ...docData,
        order,  // Update the order (database uses 'order' field)
        $id: id
      };
    });

    // Execute atomic bulk update using TablesDB
    console.log(`[Reorder] Executing atomic reorder of ${rows.length} fields`);
    try {
      await adminTablesDB.upsertRows(
        dbId,
        customFieldsCollectionId,
        rows
      );

      console.log(`[Reorder] Atomic reorder completed successfully`);

      // Create audit log separately (not atomic with the reorder)
      const loggingEnabled = await shouldLog('customFieldReorder');
      if (loggingEnabled) {
        try {
          await databases.createDocument(
            dbId,
            logsCollectionId,
            ID.unique(),
            {
              userId: user.$id,
              action: 'update',
              details: JSON.stringify({
                type: 'custom_fields_reorder',
                fieldCount: fieldOrders.length,
                fieldOrders: fieldOrders.map(({ id, order }) => ({ id, order }))
              })
            }
          );
        } catch (logError: any) {
          console.error('[Reorder] Failed to create audit log:', logError.message);
          // Don't fail the operation if audit log fails
        }
      }

      return res.status(200).json({ 
        success: true,
        message: 'Custom fields reordered successfully',
        fieldCount: fieldOrders.length,
        usedAtomicOperation: true
      });
    } catch (error: any) {
      console.error('[Reorder] Atomic reorder failed:', error);
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
/**
 * Bulk Operation Wrappers Using TablesDB Atomic Operations
 * 
 * This module provides wrappers for TablesDB's built-in atomic bulk operations.
 * According to Appwrite documentation: "Bulk operations in Appwrite are atomic,
 * meaning they follow an all-or-nothing approach."
 * 
 * @module bulkOperations
 */

import { TablesDB, ID, Query } from 'node-appwrite';

/**
 * Configuration for bulk edit operation using TablesDB
 */
interface BulkEditConfig {
  /** Database ID */
  databaseId: string;
  /** Table/collection ID to update */
  tableId: string;
  /** Array of updates with rowId and data */
  updates: Array<{ rowId: string; data: any }>;
  /** Audit log configuration */
  auditLog: {
    /** Audit log table/collection ID */
    tableId: string;
    /** User ID performing the action */
    userId: string;
    /** Action name for audit log */
    action: string;
    /** Additional details to log */
    details: any;
  };
}

/**
 * Bulk edit using TablesDB's atomic updateRows operation
 * 
 * Uses TablesDB.updateRows() which is atomic by default. According to Appwrite docs:
 * "Bulk operations in Appwrite are atomic, meaning they follow an all-or-nothing approach."
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Databases client for audit log
 * @param config - Edit configuration
 * @returns Result with updated count and transaction usage flag
 * 
 * @example
 * ```typescript
 * const result = await bulkEditWithFallback(tablesDB, databases, {
 *   databaseId: 'db123',
 *   tableId: 'attendees',
 *   updates: [
 *     { rowId: 'id1', data: { status: 'updated' } },
 *     { rowId: 'id2', data: { status: 'updated' } }
 *   ],
 *   auditLog: {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_EDIT',
 *     details: { count: 2 }
 *   }
 * });
 * ```
 */
export async function bulkEditWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: BulkEditConfig
): Promise<{
  updatedCount: number;
  usedTransactions: boolean;
  batchCount?: number;
}> {
  console.log(`[bulkEditWithFallback] Starting atomic bulk edit of ${config.updates.length} items using TablesDB`);
  console.log(`[bulkEditWithFallback] Database ID: ${config.databaseId}`);
  console.log(`[bulkEditWithFallback] Table ID: ${config.tableId}`);

  try {
    // TablesDB.upsertRows() requires ALL required fields to be present
    // We need to fetch existing documents first and merge changes
    console.log(`[bulkEditWithFallback] Fetching existing documents for merge...`);

    const existingDocs = await Promise.all(
      config.updates.map(update =>
        databases.getDocument(config.databaseId, config.tableId, update.rowId)
      )
    );

    // Prepare rows for TablesDB.upsertRows()
    // Merge existing document data with updates
    const rows = config.updates.map((update, index) => {
      const existingDoc = existingDocs[index];
      // Remove Appwrite metadata fields that shouldn't be in the upsert
      const { $permissions, $createdAt, $updatedAt, $collectionId, $databaseId, $sequence, ...docData } = existingDoc as any;

      return {
        ...docData,  // Existing data with all required fields
        ...update.data,  // Override with updates
        $id: update.rowId  // Ensure ID is set
      };
    });

    console.log(`[bulkEditWithFallback] Prepared ${rows.length} rows for upsert`);

    // Use TablesDB's atomic upsertRows operation
    // This is atomic by default - all updates succeed or all fail
    // Note: Uses positional parameters, not named object parameters
    const result = await tablesDB.upsertRows(
      config.databaseId,
      config.tableId,
      rows
    );

    console.log(`[bulkEditWithFallback] Atomic bulk update completed successfully`);

    // Create audit log separately (not part of the atomic operation)
    try {
      const documentId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify(config.auditLog.details)
      };
      await databases.createDocument(
        config.databaseId,
        config.auditLog.tableId,
        documentId,
        data
      );
    } catch (logError: any) {
      console.error('[bulkEditWithFallback] Failed to create audit log:', logError.message);
      // Don't fail the operation if audit log fails
    }

    return {
      updatedCount: config.updates.length,
      usedTransactions: true, // TablesDB bulk operations are atomic
      batchCount: 1
    };

  } catch (error: any) {
    console.error('[bulkEditWithFallback] Atomic bulk update failed:', error);

    // If atomic operation fails, fall back to sequential updates
    console.log('[bulkEditWithFallback] Falling back to sequential updates');

    let updatedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const update of config.updates) {
      try {
        await databases.updateDocument(
          config.databaseId,
          config.tableId,
          update.rowId,
          update.data
        );
        updatedCount++;

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (updateError: any) {
        console.error(`[bulkEditWithFallback] Failed to update ${update.rowId}:`, updateError.message);
        errors.push({ id: update.rowId, error: updateError.message });
      }
    }

    // Create audit log for fallback
    try {
      const documentId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify({
          ...config.auditLog.details,
          usedFallback: true,
          errors: errors.length
        })
      };
      await databases.createDocument(
        config.databaseId,
        config.auditLog.tableId,
        documentId,
        data
      );
    } catch (logError: any) {
      console.error('[bulkEditWithFallback] Failed to create audit log:', logError.message);
    }

    console.log(`[bulkEditWithFallback] Sequential fallback complete: ${updatedCount}/${config.updates.length} updated`);

    return {
      updatedCount,
      usedTransactions: false, // Used fallback
      batchCount: undefined
    };
  }
}

/**
 * Bulk delete using TablesDB's atomic deleteRows operation
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Databases client for audit log
 * @param config - Delete configuration
 * @returns Result with deleted count and transaction usage flag
 */
export async function bulkDeleteWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: {
    databaseId: string;
    tableId: string;
    rowIds: string[];
    auditLog: {
      tableId: string;
      userId: string;
      action: string;
      details: any;
    };
  }
): Promise<{
  deletedCount: number;
  usedTransactions: boolean;
}> {
  console.log(`[bulkDeleteWithFallback] Starting atomic bulk delete of ${config.rowIds.length} items using TablesDB`);

  try {
    // Use TablesDB's atomic deleteRows operation
    // Delete by query matching the IDs
    // Note: Uses positional parameters, not named object parameters
    await tablesDB.deleteRows(
      config.databaseId,
      config.tableId,
      [Query.equal('$id', config.rowIds)]
    );

    console.log(`[bulkDeleteWithFallback] Atomic bulk delete completed successfully`);

    // Create audit log
    try {
      const documentId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify(config.auditLog.details)
      };
      await databases.createDocument(
        config.databaseId,
        config.auditLog.tableId,
        documentId,
        data
      );
    } catch (logError: any) {
      console.error('[bulkDeleteWithFallback] Failed to create audit log:', logError.message);
    }

    return {
      deletedCount: config.rowIds.length,
      usedTransactions: true
    };

  } catch (error: any) {
    console.error('[bulkDeleteWithFallback] Atomic bulk delete failed:', error);
    console.log('[bulkDeleteWithFallback] Falling back to sequential deletes');

    let deletedCount = 0;

    for (const rowId of config.rowIds) {
      try {
        await databases.deleteDocument(
          config.databaseId,
          config.tableId,
          rowId
        );
        deletedCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (deleteError: any) {
        console.error(`[bulkDeleteWithFallback] Failed to delete ${rowId}:`, deleteError.message);
      }
    }

    // Create audit log
    try {
      const documentId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify({
          ...config.auditLog.details,
          usedFallback: true
        })
      };
      await databases.createDocument(
        config.databaseId,
        config.auditLog.tableId,
        documentId,
        data
      );
    } catch (logError: any) {
      console.error('[bulkDeleteWithFallback] Failed to create audit log:', logError.message);
    }

    return {
      deletedCount,
      usedTransactions: false
    };
  }
}

/**
 * Bulk import using TablesDB's atomic createRows operation
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Databases client for audit log
 * @param config - Import configuration
 * @returns Result with created count and transaction usage flag
 */
export async function bulkImportWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: {
    databaseId: string;
    tableId: string;
    items: Array<{ data: any }>;
    auditLog: {
      tableId: string;
      userId: string;
      action: string;
      details: any;
    };
  }
): Promise<{
  createdCount: number;
  usedTransactions: boolean;
}> {
  console.log(`[bulkImportWithFallback] Starting atomic bulk import of ${config.items.length} items using TablesDB`);

  try {
    // Prepare rows for TablesDB.createRows()
    const rows = config.items.map(item => ({
      $id: ID.unique(),
      ...item.data
    }));

    // Use TablesDB's atomic createRows operation
    // Note: Uses positional parameters, not named object parameters
    await tablesDB.createRows(
      config.databaseId,
      config.tableId,
      rows
    );

    console.log(`[bulkImportWithFallback] Atomic bulk import completed successfully`);

    // Create audit log
    try {
      const documentId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify(config.auditLog.details)
      };
      await databases.createDocument(
        config.databaseId,
        config.auditLog.tableId,
        documentId,
        data
      );
    } catch (logError: any) {
      console.error('[bulkImportWithFallback] Failed to create audit log:', logError.message);
    }

    return {
      createdCount: config.items.length,
      usedTransactions: true
    };

  } catch (error: any) {
    console.error('[bulkImportWithFallback] Atomic bulk import failed:', error);
    console.log('[bulkImportWithFallback] Falling back to sequential creates');

    let createdCount = 0;

    for (const item of config.items) {
      try {
        const documentId = ID.unique();
        await databases.createDocument(
          config.databaseId,
          config.tableId,
          documentId,
          item.data
        );
        createdCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (createError: any) {
        console.error(`[bulkImportWithFallback] Failed to create item:`, createError.message);
      }
    }

    // Create audit log
    try {
      const documentId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify({
          ...config.auditLog.details,
          usedFallback: true
        })
      };
      await databases.createDocument(
        config.databaseId,
        config.auditLog.tableId,
        documentId,
        data
      );
    } catch (logError: any) {
      console.error('[bulkImportWithFallback] Failed to create audit log:', logError.message);
    }

    return {
      createdCount,
      usedTransactions: false
    };
  }
}

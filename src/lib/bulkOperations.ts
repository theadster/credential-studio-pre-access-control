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
import { updateFields, FIELD_GROUPS, FieldGroupName } from './fieldUpdate';

/**
 * Detect if an error is transient/retryable
 * Transient errors include network timeouts, connection resets, rate limits, etc.
 */
function isTransientError(error: any): boolean {
  // Check for explicit transient flag
  if (error.isTransient === true) {
    return true;
  }

  // Check error code
  const code = error.code || error.message || '';
  const transientCodes = [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'ENETUNREACH',
    'ENOTFOUND',
    'ECONNABORTED',
  ];

  if (transientCodes.some(transientCode => code.includes(transientCode))) {
    return true;
  }

  // Check HTTP status codes for rate limiting and server errors
  const status = error.status || error.statusCode || error.code;
  if (status) {
    // 429 = Too Many Requests (rate limit)
    // 5xx = Server errors (transient)
    if (status === 429 || (status >= 500 && status < 600)) {
      return true;
    }
  }

  // Check for Appwrite-specific transient errors
  if (error.type === 'service_unavailable' || error.type === 'rate_limit_exceeded') {
    return true;
  }

  return false;
}

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
  /** Optional: Use field-specific updates in fallback mode to prevent overwriting concurrent changes */
  useFieldSpecificUpdates?: boolean;
  /** Optional: Field groups to update (used with useFieldSpecificUpdates) */
  fieldGroups?: FieldGroupName[];
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
 * const result = await bulkEditWithFallback(tablesDB, {
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
  config: BulkEditConfig
): Promise<{
  updatedCount: number;
  usedTransactions: boolean;
  batchCount?: number;
  errors?: Array<{ id: string; error: string; retryable?: boolean }>;
  conflictCount?: number;
}> {
  // Starting atomic bulk edit operation

  try {
    // TablesDB.upsertRows() requires ALL required fields to be present
    // We need to fetch existing documents first and merge changes


    const existingDocs = await Promise.all(
      config.updates.map(update =>
        tablesDB.getRow({
          databaseId: config.databaseId,
          tableId: config.tableId,
          rowId: update.rowId,
        }).catch(() => null) // Handle missing rows gracefully
      )
    );

    // Prepare rows for TablesDB.upsertRows()
    // Merge existing document data with updates
    const rows = config.updates.map((update, index) => {
      const existingDoc = existingDocs[index];
      if (!existingDoc) {
        // Document doesn't exist, just use the update data
        return {
          ...update.data,
          $id: update.rowId
        };
      }

      // Remove Appwrite metadata fields that shouldn't be in the upsert
      const { $permissions, $createdAt, $updatedAt, $tableId, $databaseId, $sequence, ...docData } = existingDoc as any;

      return {
        ...docData,  // Existing data with all required fields
        ...update.data,  // Override with updates
        $id: update.rowId  // Ensure ID is set
      };
    });



    // Use TablesDB's atomic upsertRows operation
    // This is atomic by default - all updates succeed or all fail
    await tablesDB.upsertRows({
      databaseId: config.databaseId,
      tableId: config.tableId,
      rows,
    });



    // Create audit log separately (not part of the atomic operation)
    try {
      const rowId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify(config.auditLog.details)
      };
      await tablesDB.createRow({
        databaseId: config.databaseId,
        tableId: config.auditLog.tableId,
        rowId,
        data,
      });
    } catch (logError: any) {
      // Audit log creation failed, but operation succeeded - don't fail
    }

    return {
      updatedCount: config.updates.length,
      usedTransactions: true, // TablesDB bulk operations are atomic
      batchCount: 1
    };

  } catch (error: any) {
    // Atomic operation failed, falling back to sequential updates

    let updatedCount = 0;
    const errors: Array<{ id: string; error: string; retryable?: boolean }> = [];
    let conflictCount = 0;

    for (const update of config.updates) {
      try {
        // Use field-specific updates with optimistic locking if enabled
        // This prevents overwriting concurrent changes (e.g., photo uploads during bulk edit)
        if (config.useFieldSpecificUpdates) {
          // Determine which fields to update based on fieldGroups config or data keys
          let fieldsToUpdate: string[];
          
          if (config.fieldGroups && config.fieldGroups.length > 0) {
            // Derive fields from the specified field groups
            const fieldSet = new Set<string>();
            for (const groupName of config.fieldGroups) {
              const groupFields = FIELD_GROUPS[groupName];
              if (groupFields) {
                for (const field of groupFields) {
                  fieldSet.add(field);
                }
              }
            }
            // Only include fields that are actually in the update data
            fieldsToUpdate = Object.keys(update.data).filter(key => fieldSet.has(key));
            // If no overlap, fall back to all data keys
            if (fieldsToUpdate.length === 0) {
              fieldsToUpdate = Object.keys(update.data);
            }
          } else {
            // Fall back to using all keys from update data
            fieldsToUpdate = Object.keys(update.data);
          }
          
          const result = await updateFields(
            tablesDB,
            config.databaseId,
            config.tableId,
            update.rowId,
            update.data,
            {
              fields: fieldsToUpdate,
              preserveOthers: true,
              incrementVersion: true,
            }
          );

          if (result.success) {
            updatedCount++;
          } else {
            // Optimistic lock conflict - record as retryable error
            conflictCount++;
            errors.push({
              id: update.rowId,
              error: result.error?.message || 'Version conflict - record was modified by another operation',
              retryable: true,
            });
          }
        } else {
          // Standard update without optimistic locking
          await tablesDB.updateRow({
            databaseId: config.databaseId,
            tableId: config.tableId,
            rowId: update.rowId,
            data: update.data,
          });
          updatedCount++;
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (updateError: any) {
        errors.push({
          id: update.rowId,
          error: updateError.message,
          retryable: isTransientError(updateError),
        });
      }
    }

    // Create audit log for fallback
    try {
      const rowId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify({
          ...config.auditLog.details,
          usedFallback: true,
          errors: errors.length,
          conflictCount,
          usedFieldSpecificUpdates: config.useFieldSpecificUpdates || false,
        })
      };
      await tablesDB.createRow({
        databaseId: config.databaseId,
        tableId: config.auditLog.tableId,
        rowId,
        data,
      });
    } catch (logError: any) {
      // Audit log creation failed
    }



    return {
      updatedCount,
      usedTransactions: false, // Used fallback
      batchCount: undefined,
      errors,
      conflictCount,
    };
  }
}

/**
 * Bulk delete using TablesDB's atomic deleteRows operation
 * 
 * @param tablesDB - TablesDB client instance
 * @param config - Delete configuration
 * @returns Result with deleted count and transaction usage flag
 */
export async function bulkDeleteWithFallback(
  tablesDB: TablesDB,
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
  batchCount?: number;
}> {
  // Starting atomic bulk delete operation

  try {
    // Use TablesDB's atomic deleteRows operation
    // Delete by query matching the IDs
    await tablesDB.deleteRows({
      databaseId: config.databaseId,
      tableId: config.tableId,
      queries: [Query.equal('$id', config.rowIds)],
    });



    // Create audit log
    try {
      const rowId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify(config.auditLog.details)
      };
      await tablesDB.createRow({
        databaseId: config.databaseId,
        tableId: config.auditLog.tableId,
        rowId,
        data,
      });
    } catch (logError: any) {
      // Audit log creation failed, but operation succeeded - don't fail
    }

    return {
      deletedCount: config.rowIds.length,
      usedTransactions: true,
      batchCount: 1
    };

  } catch (error: any) {
    // Atomic delete failed, falling back to sequential deletes

    let deletedCount = 0;

    for (const rowId of config.rowIds) {
      try {
        await tablesDB.deleteRow({
          databaseId: config.databaseId,
          tableId: config.tableId,
          rowId,
        });
        deletedCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (deleteError: any) {
  
      }
    }

    // Create audit log
    try {
      const auditRowId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify({
          ...config.auditLog.details,
          usedFallback: true
        })
      };
      await tablesDB.createRow({
        databaseId: config.databaseId,
        tableId: config.auditLog.tableId,
        rowId: auditRowId,
        data,
      });
    } catch (logError: any) {
      // Audit log creation failed
    }

    return {
      deletedCount,
      usedTransactions: false,
      batchCount: undefined
    };
  }
}

/**
 * Bulk import using TablesDB's atomic createRows operation
 * 
 * @param tablesDB - TablesDB client instance
 * @param config - Import configuration
 * @returns Result with created count and transaction usage flag
 */
export async function bulkImportWithFallback(
  tablesDB: TablesDB,
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
  batchCount?: number;
}> {
  // Starting atomic bulk import operation

  try {
    // Prepare rows for TablesDB.createRows()
    const rows = config.items.map(item => ({
      $id: ID.unique(),
      ...item.data
    }));

    // Use TablesDB's atomic createRows operation
    await tablesDB.createRows({
      databaseId: config.databaseId,
      tableId: config.tableId,
      rows,
    });



    // Create audit log
    try {
      const rowId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify(config.auditLog.details)
      };
      await tablesDB.createRow({
        databaseId: config.databaseId,
        tableId: config.auditLog.tableId,
        rowId,
        data,
      });
    } catch (logError: any) {
      // Audit log creation failed, but operation succeeded - don't fail
    }

    return {
      createdCount: config.items.length,
      usedTransactions: true,
      batchCount: 1
    };

  } catch (error: any) {
    // Atomic import failed, falling back to sequential creates

    let createdCount = 0;

    for (const item of config.items) {
      try {
        const rowId = ID.unique();
        await tablesDB.createRow({
          databaseId: config.databaseId,
          tableId: config.tableId,
          rowId,
          data: item.data,
        });
        createdCount++;
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (createError: any) {

      }
    }

    // Create audit log
    try {
      const auditRowId = ID.unique();
      const data = {
        userId: config.auditLog.userId,
        action: config.auditLog.action,
        details: JSON.stringify({
          ...config.auditLog.details,
          usedFallback: true
        })
      };
      await tablesDB.createRow({
        databaseId: config.databaseId,
        tableId: config.auditLog.tableId,
        rowId: auditRowId,
        data,
      });
    } catch (logError: any) {
      // Audit log creation failed
    }

    return {
      createdCount,
      usedTransactions: false,
      batchCount: undefined
    };
  }
}

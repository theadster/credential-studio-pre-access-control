/**
 * Bulk Operation Wrappers with Fallback Support
 * 
 * This module provides high-level wrappers for bulk operations that automatically
 * handle transactions with fallback to legacy API when needed.
 * 
 * @module bulkOperations
 */

import { TablesDB } from 'node-appwrite';
import { ID } from 'appwrite';
import {
  executeBulkOperationWithFallback,
  createBulkDeleteOperations,
  createBulkUpdateOperations,
  createBulkCreateOperations
} from './transactions';

/**
 * Configuration for bulk delete operation
 */
interface BulkDeleteConfig {
  /** Database ID */
  databaseId: string;
  /** Table/collection ID to delete from */
  tableId: string;
  /** Array of row/document IDs to delete */
  rowIds: string[];
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
 * Configuration for bulk import operation
 */
interface BulkImportConfig {
  /** Database ID */
  databaseId: string;
  /** Table/collection ID to import into */
  tableId: string;
  /** Array of items to import */
  items: Array<{ data: any }>;
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
 * Configuration for bulk edit operation
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
 * Bulk delete with automatic fallback to legacy API
 * 
 * This function attempts to delete multiple records using transactions.
 * If transactions fail, it automatically falls back to sequential deletion
 * using the legacy Databases API.
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Legacy Databases API client (for fallback)
 * @param config - Delete configuration
 * @returns Result with deleted count, transaction usage flag, and batch count
 * 
 * @example
 * ```typescript
 * const result = await bulkDeleteWithFallback(tablesDB, databases, {
 *   databaseId: 'db123',
 *   tableId: 'attendees',
 *   rowIds: ['id1', 'id2', 'id3'],
 *   auditLog: {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_DELETE_ATTENDEES',
 *     details: { count: 3 }
 *   }
 * });
 * 
 * console.log(`Deleted ${result.deletedCount} records`);
 * console.log(`Used transactions: ${result.usedTransactions}`);
 * ```
 */
export async function bulkDeleteWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: BulkDeleteConfig
): Promise<{
  deletedCount: number;
  usedTransactions: boolean;
  batchCount?: number;
}> {
  console.log(`[bulkDeleteWithFallback] Starting delete of ${config.rowIds.length} items`);
  
  // Create transaction operations
  const operations = createBulkDeleteOperations(
    config.databaseId,
    config.tableId,
    config.rowIds,
    config.auditLog
  );
  
  // Legacy fallback function
  const legacyDelete = async () => {
    console.log('[bulkDeleteWithFallback] Using legacy API approach');
    let deletedCount = 0;
    const errors: Array<{ id: string; error: string }> = [];
    
    for (const rowId of config.rowIds) {
      try {
        await databases.deleteDocument(config.databaseId, config.tableId, rowId);
        deletedCount++;
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        console.error(`[bulkDeleteWithFallback] Failed to delete ${rowId}:`, error.message);
        errors.push({ id: rowId, error: error.message });
      }
    }
    
    // Create audit log separately (legacy approach)
    if (config.auditLog) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLog.tableId,
          ID.unique(),
          {
            userId: config.auditLog.userId,
            action: config.auditLog.action,
            details: JSON.stringify(config.auditLog.details)
          }
        );
      } catch (logError: any) {
        console.error('[bulkDeleteWithFallback] Failed to create audit log:', logError.message);
      }
    }
    
    console.log(`[bulkDeleteWithFallback] Legacy delete complete: ${deletedCount}/${config.rowIds.length} deleted`);
    if (errors.length > 0) {
      console.warn(`[bulkDeleteWithFallback] ${errors.length} errors occurred during legacy delete`);
    }
    
    return { deletedCount, errors };
  };
  
  // Execute with fallback
  const result = await executeBulkOperationWithFallback(
    tablesDB,
    databases,
    operations,
    legacyDelete,
    {
      operationType: 'delete',
      itemCount: config.rowIds.length
    }
  );
  
  const deletedCount = result.usedTransactions 
    ? config.rowIds.length 
    : result.result?.deletedCount || 0;
  
  console.log(
    `[bulkDeleteWithFallback] Complete: ${deletedCount} deleted, ` +
    `used transactions: ${result.usedTransactions}`
  );
  
  return {
    deletedCount,
    usedTransactions: result.usedTransactions,
    batchCount: result.batchCount
  };
}

/**
 * Bulk import with automatic fallback to legacy API
 * 
 * This function attempts to import multiple records using transactions.
 * If transactions fail, it automatically falls back to sequential creation
 * using the legacy Databases API.
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Legacy Databases API client (for fallback)
 * @param config - Import configuration
 * @returns Result with created count, transaction usage flag, and batch count
 * 
 * @example
 * ```typescript
 * const result = await bulkImportWithFallback(tablesDB, databases, {
 *   databaseId: 'db123',
 *   tableId: 'attendees',
 *   items: [
 *     { data: { name: 'John Doe', email: 'john@example.com' } },
 *     { data: { name: 'Jane Smith', email: 'jane@example.com' } }
 *   ],
 *   auditLog: {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_IMPORT_ATTENDEES',
 *     details: { count: 2 }
 *   }
 * });
 * 
 * console.log(`Imported ${result.createdCount} records`);
 * console.log(`Used transactions: ${result.usedTransactions}`);
 * ```
 */
export async function bulkImportWithFallback(
  tablesDB: TablesDB,
  databases: any,
  config: BulkImportConfig
): Promise<{
  createdCount: number;
  usedTransactions: boolean;
  batchCount?: number;
}> {
  console.log(`[bulkImportWithFallback] Starting import of ${config.items.length} items`);
  
  // Create transaction operations
  const operations = createBulkCreateOperations(
    config.databaseId,
    config.tableId,
    config.items.map(item => ({ rowId: ID.unique(), data: item.data })),
    config.auditLog
  );
  
  // Legacy fallback function
  const legacyImport = async () => {
    console.log('[bulkImportWithFallback] Using legacy API approach');
    let createdCount = 0;
    const errors: Array<{ row: number; error: string }> = [];
    
    for (let i = 0; i < config.items.length; i++) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.tableId,
          ID.unique(),
          config.items[i].data
        );
        createdCount++;
        
        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error: any) {
        console.error(`[bulkImportWithFallback] Failed to import row ${i + 1}:`, error.message);
        errors.push({ row: i + 1, error: error.message });
      }
    }
    
    // Create audit log separately (legacy approach)
    if (config.auditLog) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLog.tableId,
          ID.unique(),
          {
            userId: config.auditLog.userId,
            action: config.auditLog.action,
            details: JSON.stringify(config.auditLog.details)
          }
        );
      } catch (logError: any) {
        console.error('[bulkImportWithFallback] Failed to create audit log:', logError.message);
      }
    }
    
    console.log(`[bulkImportWithFallback] Legacy import complete: ${createdCount}/${config.items.length} created`);
    if (errors.length > 0) {
      console.warn(`[bulkImportWithFallback] ${errors.length} errors occurred during legacy import`);
    }
    
    return { createdCount, errors };
  };
  
  // Execute with fallback
  const result = await executeBulkOperationWithFallback(
    tablesDB,
    databases,
    operations,
    legacyImport,
    {
      operationType: 'import',
      itemCount: config.items.length
    }
  );
  
  const createdCount = result.usedTransactions 
    ? config.items.length 
    : result.result?.createdCount || 0;
  
  console.log(
    `[bulkImportWithFallback] Complete: ${createdCount} created, ` +
    `used transactions: ${result.usedTransactions}`
  );
  
  return {
    createdCount,
    usedTransactions: result.usedTransactions,
    batchCount: result.batchCount
  };
}

/**
 * Bulk edit with automatic fallback to legacy API
 * 
 * This function attempts to update multiple records using transactions.
 * If transactions fail, it automatically falls back to sequential updates
 * using the legacy Databases API.
 * 
 * @param tablesDB - TablesDB client instance
 * @param databases - Legacy Databases API client (for fallback)
 * @param config - Edit configuration
 * @returns Result with updated count, transaction usage flag, and batch count
 * 
 * @example
 * ```typescript
 * const result = await bulkEditWithFallback(tablesDB, databases, {
 *   databaseId: 'db123',
 *   tableId: 'attendees',
 *   updates: [
 *     { rowId: 'id1', data: { status: 'checked-in' } },
 *     { rowId: 'id2', data: { status: 'checked-in' } }
 *   ],
 *   auditLog: {
 *     tableId: 'logs',
 *     userId: 'user123',
 *     action: 'BULK_EDIT_ATTENDEES',
 *     details: { count: 2, changes: { status: 'checked-in' } }
 *   }
 * });
 * 
 * console.log(`Updated ${result.updatedCount} records`);
 * console.log(`Used transactions: ${result.usedTransactions}`);
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
  console.log(`[bulkEditWithFallback] Starting edit of ${config.updates.length} items`);
  
  // Create transaction operations
  const operations = createBulkUpdateOperations(
    config.databaseId,
    config.tableId,
    config.updates,
    config.auditLog
  );
  
  // Legacy fallback function
  const legacyEdit = async () => {
    console.log('[bulkEditWithFallback] Using legacy API approach');
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
      } catch (error: any) {
        console.error(`[bulkEditWithFallback] Failed to update ${update.rowId}:`, error.message);
        errors.push({ id: update.rowId, error: error.message });
      }
    }
    
    // Create audit log separately (legacy approach)
    if (config.auditLog) {
      try {
        await databases.createDocument(
          config.databaseId,
          config.auditLog.tableId,
          ID.unique(),
          {
            userId: config.auditLog.userId,
            action: config.auditLog.action,
            details: JSON.stringify(config.auditLog.details)
          }
        );
      } catch (logError: any) {
        console.error('[bulkEditWithFallback] Failed to create audit log:', logError.message);
      }
    }
    
    console.log(`[bulkEditWithFallback] Legacy edit complete: ${updatedCount}/${config.updates.length} updated`);
    if (errors.length > 0) {
      console.warn(`[bulkEditWithFallback] ${errors.length} errors occurred during legacy edit`);
    }
    
    return { updatedCount, errors };
  };
  
  // Execute with fallback
  const result = await executeBulkOperationWithFallback(
    tablesDB,
    databases,
    operations,
    legacyEdit,
    {
      operationType: 'edit',
      itemCount: config.updates.length
    }
  );
  
  const updatedCount = result.usedTransactions 
    ? config.updates.length 
    : result.result?.updatedCount || 0;
  
  console.log(
    `[bulkEditWithFallback] Complete: ${updatedCount} updated, ` +
    `used transactions: ${result.usedTransactions}`
  );
  
  return {
    updatedCount,
    usedTransactions: result.usedTransactions,
    batchCount: result.batchCount
  };
}

/**
 * Unit Tests for Bulk Operations Library
 * 
 * Tests the bulkOperations.ts library with mocked TablesDB
 * 
 * Run with: npx vitest --run src/lib/__tests__/bulkOperations.unit.test.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bulkEditWithFallback, bulkDeleteWithFallback, bulkImportWithFallback } from '../bulkOperations';

// Mock TablesDB
const mockTablesDB = {
  upsertRows: vi.fn(),
  createRows: vi.fn(),
  deleteRows: vi.fn(),
};

// Mock Databases
const mockDatabases = {
  getDocument: vi.fn(),
  createDocument: vi.fn(),
  updateDocument: vi.fn(),
  deleteDocument: vi.fn(),
};

describe('bulkOperations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('bulkEditWithFallback', () => {
    it('should perform atomic bulk edit using upsertRows', async () => {
      // Mock existing documents
      const existingDocs = [
        {
          $id: 'id1',
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: '12345',
          customFieldValues: '{}',
          notes: '',
          $permissions: [],
          $createdAt: '2024-01-01',
          $updatedAt: '2024-01-01',
          $collectionId: 'attendees',
          $databaseId: 'db'
        },
        {
          $id: 'id2',
          firstName: 'Jane',
          lastName: 'Smith',
          barcodeNumber: '67890',
          customFieldValues: '{}',
          notes: '',
          $permissions: [],
          $createdAt: '2024-01-01',
          $updatedAt: '2024-01-01',
          $collectionId: 'attendees',
          $databaseId: 'db'
        }
      ];

      mockDatabases.getDocument
        .mockResolvedValueOnce(existingDocs[0])
        .mockResolvedValueOnce(existingDocs[1]);

      mockTablesDB.upsertRows.mockResolvedValue(undefined);
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log1' });

      const result = await bulkEditWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          updates: [
            { rowId: 'id1', data: { notes: 'Updated 1' } },
            { rowId: 'id2', data: { notes: 'Updated 2' } }
          ],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'bulk_edit',
            details: { count: 2 }
          }
        }
      );

      // Verify fetched existing documents
      expect(mockDatabases.getDocument).toHaveBeenCalledTimes(2);
      expect(mockDatabases.getDocument).toHaveBeenCalledWith('db', 'attendees', 'id1');
      expect(mockDatabases.getDocument).toHaveBeenCalledWith('db', 'attendees', 'id2');

      // Verify upsertRows called with merged data
      expect(mockTablesDB.upsertRows).toHaveBeenCalledTimes(1);
      const [dbId, tableId, rows] = mockTablesDB.upsertRows.mock.calls[0];
      expect(dbId).toBe('db');
      expect(tableId).toBe('attendees');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        $id: 'id1',
        firstName: 'John',
        lastName: 'Doe',
        notes: 'Updated 1'
      });
      expect(rows[1]).toMatchObject({
        $id: 'id2',
        firstName: 'Jane',
        lastName: 'Smith',
        notes: 'Updated 2'
      });

      // Verify audit log created
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.updatedCount).toBe(2);
      expect(result.usedTransactions).toBe(true);
    });

    it('should fall back to sequential updates on atomic operation failure', async () => {
      mockDatabases.getDocument.mockRejectedValue(new Error('Fetch failed'));
      mockTablesDB.upsertRows.mockRejectedValue(new Error('Atomic operation failed'));
      mockDatabases.updateDocument.mockResolvedValue({ $id: 'id1' });
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log1' });

      const result = await bulkEditWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          updates: [
            { rowId: 'id1', data: { notes: 'Updated' } }
          ],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'bulk_edit',
            details: { count: 1 }
          }
        }
      );

      // Verify fallback to updateDocument
      expect(mockDatabases.updateDocument).toHaveBeenCalled();
      expect(result.usedTransactions).toBe(false);
    });
  });

  describe('bulkDeleteWithFallback', () => {
    it('should perform atomic bulk delete using deleteRows', async () => {
      mockTablesDB.deleteRows.mockResolvedValue(undefined);
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log1' });

      const result = await bulkDeleteWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          rowIds: ['id1', 'id2', 'id3'],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'bulk_delete',
            details: { count: 3 }
          }
        }
      );

      // Verify deleteRows called
      expect(mockTablesDB.deleteRows).toHaveBeenCalledTimes(1);
      const [dbId, tableId, queries] = mockTablesDB.deleteRows.mock.calls[0];
      expect(dbId).toBe('db');
      expect(tableId).toBe('attendees');
      expect(queries).toBeDefined();

      // Verify audit log created
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.deletedCount).toBe(3);
      expect(result.usedTransactions).toBe(true);
    });

    it('should fall back to sequential deletes on atomic operation failure', async () => {
      mockTablesDB.deleteRows.mockRejectedValue(new Error('Delete failed'));
      mockDatabases.deleteDocument.mockResolvedValue(undefined);
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log1' });

      const result = await bulkDeleteWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          rowIds: ['id1', 'id2'],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'bulk_delete',
            details: { count: 2 }
          }
        }
      );

      // Verify fallback to deleteDocument
      expect(mockDatabases.deleteDocument).toHaveBeenCalledTimes(2);
      expect(result.usedTransactions).toBe(false);
    });
  });

  describe('bulkImportWithFallback', () => {
    it('should perform atomic bulk import using createRows', async () => {
      mockTablesDB.createRows.mockResolvedValue(undefined);
      mockDatabases.createDocument.mockResolvedValue({ $id: 'log1' });

      const result = await bulkImportWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          items: [
            { data: { firstName: 'John', lastName: 'Doe', barcodeNumber: '123' } },
            { data: { firstName: 'Jane', lastName: 'Smith', barcodeNumber: '456' } }
          ],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'import',
            details: { count: 2 }
          }
        }
      );

      // Verify createRows called
      expect(mockTablesDB.createRows).toHaveBeenCalledTimes(1);
      const [dbId, tableId, rows] = mockTablesDB.createRows.mock.calls[0];
      expect(dbId).toBe('db');
      expect(tableId).toBe('attendees');
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123'
      });

      // Verify audit log created
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.createdCount).toBe(2);
      expect(result.usedTransactions).toBe(true);
    });

    it('should fall back to sequential creates on atomic operation failure', async () => {
      mockTablesDB.createRows.mockRejectedValue(new Error('Create failed'));
      mockDatabases.createDocument.mockResolvedValue({ $id: 'doc1' });

      const result = await bulkImportWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          items: [
            { data: { firstName: 'John', lastName: 'Doe', barcodeNumber: '123' } }
          ],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'import',
            details: { count: 1 }
          }
        }
      );

      // Verify fallback to createDocument
      expect(mockDatabases.createDocument).toHaveBeenCalled();
      expect(result.usedTransactions).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle audit log creation failure gracefully', async () => {
      mockDatabases.getDocument.mockResolvedValue({
        $id: 'id1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123',
        customFieldValues: '{}',
        notes: ''
      });
      mockTablesDB.upsertRows.mockResolvedValue(undefined);
      mockDatabases.createDocument.mockRejectedValue(new Error('Log failed'));

      // Should not throw - audit log failure shouldn't fail the operation
      const result = await bulkEditWithFallback(
        mockTablesDB as any,
        mockDatabases as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          updates: [{ rowId: 'id1', data: { notes: 'Updated' } }],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'bulk_edit',
            details: { count: 1 }
          }
        }
      );

      expect(result.updatedCount).toBe(1);
      expect(result.usedTransactions).toBe(true);
    });
  });
});

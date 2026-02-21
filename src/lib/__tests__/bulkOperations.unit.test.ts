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
  getRow: vi.fn(),
  createRow: vi.fn(),
  updateRow: vi.fn(),
  deleteRow: vi.fn(),
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
          $tableId: 'attendees',
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
          $tableId: 'attendees',
          $databaseId: 'db'
        }
      ];

      mockTablesDB.getRow
        .mockResolvedValueOnce(existingDocs[0])
        .mockResolvedValueOnce(existingDocs[1]);

      mockTablesDB.upsertRows.mockResolvedValue(undefined);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log1' });

      const result = await bulkEditWithFallback(
        mockTablesDB as any,
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
      expect(mockTablesDB.getRow).toHaveBeenCalledTimes(2);
      expect(mockTablesDB.getRow).toHaveBeenCalledWith('db', 'attendees', 'id1');
      expect(mockTablesDB.getRow).toHaveBeenCalledWith('db', 'attendees', 'id2');

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
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.updatedCount).toBe(2);
      expect(result.usedTransactions).toBe(true);
    });

    it('should fall back to sequential updates on atomic operation failure', async () => {
      mockTablesDB.getRow.mockRejectedValue(new Error('Fetch failed'));
      mockTablesDB.upsertRows.mockRejectedValue(new Error('Atomic operation failed'));
      mockTablesDB.updateRow.mockResolvedValue({ $id: 'id1' });
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log1' });

      const result = await bulkEditWithFallback(
        mockTablesDB as any,
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

      // Verify fallback to updateRow
      expect(mockTablesDB.updateRow).toHaveBeenCalled();
      expect(result.usedTransactions).toBe(false);
    });
  });

  describe('bulkDeleteWithFallback', () => {
    it('should perform atomic bulk delete using deleteRows', async () => {
      mockTablesDB.deleteRows.mockResolvedValue(undefined);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log1' });

      const result = await bulkDeleteWithFallback(
        mockTablesDB as any,
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
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.deletedCount).toBe(3);
      expect(result.usedTransactions).toBe(true);
    });

    it('should fall back to sequential deletes on atomic operation failure', async () => {
      mockTablesDB.deleteRows.mockRejectedValue(new Error('Delete failed'));
      mockTablesDB.deleteRow.mockResolvedValue(undefined);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log1' });

      const result = await bulkDeleteWithFallback(
        mockTablesDB as any,
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

      // Verify fallback to deleteRow
      expect(mockTablesDB.deleteRow).toHaveBeenCalledTimes(2);
      expect(result.usedTransactions).toBe(false);
    });
  });

  describe('bulkImportWithFallback', () => {
    it('should perform atomic bulk import using createRows', async () => {
      mockTablesDB.createRows.mockResolvedValue(undefined);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log1' });

      const result = await bulkImportWithFallback(
        mockTablesDB as any,
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
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1);

      // Verify result
      expect(result.createdCount).toBe(2);
      expect(result.usedTransactions).toBe(true);
    });

    it('should fall back to sequential creates on atomic operation failure', async () => {
      mockTablesDB.createRows.mockRejectedValue(new Error('Create failed'));
      mockTablesDB.createRow.mockResolvedValue({ $id: 'doc1' });

      const result = await bulkImportWithFallback(
        mockTablesDB as any,
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

      // Verify fallback to createRow
      expect(mockTablesDB.createRow).toHaveBeenCalled();
      expect(result.usedTransactions).toBe(false);
    });

    it('should override user-supplied $id with generated ID', async () => {
      mockTablesDB.createRows.mockResolvedValue(undefined);
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log1' });

      const result = await bulkImportWithFallback(
        mockTablesDB as any,
        {
          databaseId: 'db',
          tableId: 'attendees',
          items: [
            { data: { $id: 'user-supplied-id', firstName: 'John', lastName: 'Doe', barcodeNumber: '123' } }
          ],
          auditLog: {
            tableId: 'logs',
            userId: 'user1',
            action: 'import',
            details: { count: 1 }
          }
        }
      );

      // Verify createRows called with generated $id, not user-supplied
      expect(mockTablesDB.createRows).toHaveBeenCalledTimes(1);
      const [, , rows] = mockTablesDB.createRows.mock.calls[0];
      expect(rows[0].$id).not.toBe('user-supplied-id');
      expect(rows[0].$id).toBeDefined();
      expect(rows[0].firstName).toBe('John');
      expect(result.createdCount).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle audit log creation failure gracefully', async () => {
      mockTablesDB.getRow.mockResolvedValue({
        $id: 'id1',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '123',
        customFieldValues: '{}',
        notes: ''
      });
      mockTablesDB.upsertRows.mockResolvedValue(undefined);
      mockTablesDB.createRow.mockRejectedValue(new Error('Log failed'));

      // Should not throw - audit log failure shouldn't fail the operation
      const result = await bulkEditWithFallback(
        mockTablesDB as any,
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

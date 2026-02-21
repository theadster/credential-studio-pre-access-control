import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { bulkEditWithFallback } from '@/lib/bulkOperations';

// Mock the fieldUpdate module
vi.mock('@/lib/fieldUpdate', () => ({
  updateFields: vi.fn(),
  FIELD_GROUPS: {
    credential: ['credentialUrl', 'credentialGeneratedAt', 'credentialCount', 'lastCredentialGenerated'],
    photo: ['photoUrl', 'photoUploadCount', 'lastPhotoUploaded'],
    profile: ['firstName', 'lastName', 'barcodeNumber', 'notes'],
    customFields: ['customFieldValues'],
    accessControl: ['accessEnabled', 'validFrom', 'validUntil'],
    tracking: ['lastSignificantUpdate', 'version'],
  },
}));

// Import the mocked function
import { updateFields } from '@/lib/fieldUpdate';

describe('bulkEditWithFallback - Concurrency Handling', () => {
  let mockTablesDB: any;
  const mockUpdateFields = updateFields as ReturnType<typeof vi.fn>;

  const baseConfig = {
    databaseId: 'test-db',
    tableId: 'attendees',
    auditLog: {
      tableId: 'logs',
      userId: 'user-123',
      action: 'bulk_update',
      details: { type: 'test' },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTablesDB = {
      upsertRows: vi.fn(),
    };

    mockTablesDB = {
      getRow: vi.fn(),
      updateRow: vi.fn(),
      createRow: vi.fn(),
    };
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Atomic Operation Success', () => {
    it('should use TablesDB upsertRows for atomic bulk updates', async () => {
      const updates = [
        { rowId: 'att-1', data: { customFieldValues: '{"field1":"value1"}' } },
        { rowId: 'att-2', data: { customFieldValues: '{"field1":"value2"}' } },
      ];

      // Mock successful document fetches
      mockTablesDB.getRow
        .mockResolvedValueOnce({ $id: 'att-1', firstName: 'John', customFieldValues: '{}' })
        .mockResolvedValueOnce({ $id: 'att-2', firstName: 'Jane', customFieldValues: '{}' });

      // Mock successful upsert
      mockTablesDB.upsertRows.mockResolvedValue({ success: true });

      // Mock audit log creation
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-1' });

      const result = await bulkEditWithFallback(mockTablesDB, mockTablesDB, {
        ...baseConfig,
        updates,
      });

      expect(result.usedTransactions).toBe(true);
      expect(result.updatedCount).toBe(2);
      expect(mockTablesDB.upsertRows).toHaveBeenCalledTimes(1);
    });
  });

  describe('Fallback with Field-Specific Updates', () => {
    it('should use field-specific updates when useFieldSpecificUpdates is enabled', async () => {
      const updates = [
        { rowId: 'att-1', data: { customFieldValues: '{"field1":"value1"}' } },
        { rowId: 'att-2', data: { customFieldValues: '{"field1":"value2"}' } },
      ];

      // Mock TablesDB failure to trigger fallback
      mockTablesDB.upsertRows.mockRejectedValue(new Error('TablesDB unavailable'));

      // Mock successful field updates
      mockUpdateFields
        .mockResolvedValueOnce({ success: true, data: { $id: 'att-1' } })
        .mockResolvedValueOnce({ success: true, data: { $id: 'att-2' } });

      // Mock audit log creation
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-1' });

      const result = await bulkEditWithFallback(mockTablesDB, mockTablesDB, {
        ...baseConfig,
        updates,
        useFieldSpecificUpdates: true,
      });

      expect(result.usedTransactions).toBe(false);
      expect(result.updatedCount).toBe(2);
      expect(mockUpdateFields).toHaveBeenCalledTimes(2);
      
      // Verify field-specific update was called with correct parameters
      expect(mockUpdateFields).toHaveBeenCalledWith(
        mockTablesDB,
        'test-db',
        'attendees',
        'att-1',
        { customFieldValues: '{"field1":"value1"}' },
        expect.objectContaining({
          preserveOthers: true,
          incrementVersion: true,
        })
      );
    });

    it('should handle version conflicts gracefully in fallback mode', async () => {
      const updates = [
        { rowId: 'att-1', data: { customFieldValues: '{"field1":"value1"}' } },
        { rowId: 'att-2', data: { customFieldValues: '{"field1":"value2"}' } },
        { rowId: 'att-3', data: { customFieldValues: '{"field1":"value3"}' } },
      ];

      // Mock TablesDB failure to trigger fallback
      mockTablesDB.upsertRows.mockRejectedValue(new Error('TablesDB unavailable'));

      // Mock mixed results: 2 success, 1 conflict
      mockUpdateFields
        .mockResolvedValueOnce({ success: true, data: { $id: 'att-1' } })
        .mockResolvedValueOnce({ 
          success: false, 
          error: new Error('Version mismatch - record was modified'),
        })
        .mockResolvedValueOnce({ success: true, data: { $id: 'att-3' } });

      // Mock audit log creation
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-1' });

      const result = await bulkEditWithFallback(mockTablesDB, mockTablesDB, {
        ...baseConfig,
        updates,
        useFieldSpecificUpdates: true,
      });

      expect(result.usedTransactions).toBe(false);
      expect(result.updatedCount).toBe(2);
      expect(result.conflictCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors![0]).toEqual(expect.objectContaining({
        id: 'att-2',
        retryable: true,
      }));
    });

    it('should not fail entire batch when individual updates have conflicts', async () => {
      const updates = [
        { rowId: 'att-1', data: { customFieldValues: '{"field1":"value1"}' } },
        { rowId: 'att-2', data: { customFieldValues: '{"field1":"value2"}' } },
      ];

      // Mock TablesDB failure to trigger fallback
      mockTablesDB.upsertRows.mockRejectedValue(new Error('TablesDB unavailable'));

      // First update succeeds, second has conflict
      mockUpdateFields
        .mockResolvedValueOnce({ success: true, data: { $id: 'att-1' } })
        .mockResolvedValueOnce({ 
          success: false, 
          error: new Error('Concurrent modification detected'),
        });

      // Mock audit log creation
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-1' });

      const result = await bulkEditWithFallback(mockTablesDB, mockTablesDB, {
        ...baseConfig,
        updates,
        useFieldSpecificUpdates: true,
      });

      // Batch should partially succeed
      expect(result.updatedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.conflictCount).toBe(1);
    });
  });

  describe('Fallback without Field-Specific Updates', () => {
    it('should use standard updateRow when useFieldSpecificUpdates is false', async () => {
      const updates = [
        { rowId: 'att-1', data: { customFieldValues: '{"field1":"value1"}' } },
      ];

      // Mock TablesDB failure to trigger fallback
      mockTablesDB.upsertRows.mockRejectedValue(new Error('TablesDB unavailable'));

      // Mock successful standard update
      mockTablesDB.updateRow.mockResolvedValue({ $id: 'att-1' });

      // Mock audit log creation
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-1' });

      const result = await bulkEditWithFallback(mockTablesDB, mockTablesDB, {
        ...baseConfig,
        updates,
        useFieldSpecificUpdates: false,
      });

      expect(result.usedTransactions).toBe(false);
      expect(result.updatedCount).toBe(1);
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(1);
      expect(mockUpdateFields).not.toHaveBeenCalled();
    });
  });

  describe('Audit Logging', () => {
    it('should include conflict count in audit log when using field-specific updates', async () => {
      const updates = [
        { rowId: 'att-1', data: { customFieldValues: '{"field1":"value1"}' } },
      ];

      // Mock TablesDB failure to trigger fallback
      mockTablesDB.upsertRows.mockRejectedValue(new Error('TablesDB unavailable'));

      // Mock conflict
      mockUpdateFields.mockResolvedValueOnce({ 
        success: false, 
        error: new Error('Version conflict'),
      });

      // Mock audit log creation
      mockTablesDB.createRow.mockResolvedValue({ $id: 'log-1' });

      await bulkEditWithFallback(mockTablesDB, mockTablesDB, {
        ...baseConfig,
        updates,
        useFieldSpecificUpdates: true,
      });

      // Verify audit log includes conflict information
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        'test-db',
        'logs',
        expect.any(String),
        expect.objectContaining({
          details: expect.stringContaining('conflictCount'),
        })
      );
    });
  });
});

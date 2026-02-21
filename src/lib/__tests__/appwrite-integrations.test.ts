import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TablesDB } from 'node-appwrite';
import {
  IntegrationConflictError,
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration,
  getCloudinaryIntegration,
  getSwitchboardIntegration,
  getOneSimpleApiIntegration,
} from '../appwrite-integrations';
import { mockTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

describe('Integration Optimistic Locking', () => {
  const mockEventSettingsId = 'test-event-123';
  const mockDatabaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const mockCloudinaryTableId = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_TABLE_ID!;
  const mockSwitchboardTableId = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_TABLE_ID!;
  const mockOneSimpleApiTableId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_TABLE_ID!;

  beforeEach(() => {
    resetAllMocks();
  });

  describe('IntegrationConflictError', () => {
    it('should create error with correct properties', () => {
      const error = new IntegrationConflictError(
        'Cloudinary',
        'event-123',
        1,
        2
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('IntegrationConflictError');
      expect(error.integrationType).toBe('Cloudinary');
      expect(error.eventSettingsId).toBe('event-123');
      expect(error.expectedVersion).toBe(1);
      expect(error.actualVersion).toBe(2);
    });

    it('should have descriptive error message', () => {
      const error = new IntegrationConflictError(
        'Switchboard',
        'event-456',
        3,
        5
      );

      expect(error.message).toContain('Integration conflict');
      expect(error.message).toContain('Switchboard');
      expect(error.message).toContain('event-456');
      expect(error.message).toContain('Expected version 3');
      expect(error.message).toContain('found version 5');
      expect(error.message).toContain('modified by another request');
    });

    it('should be catchable as specific error type', () => {
      const error = new IntegrationConflictError('OneSimpleAPI', 'event-789', 1, 2);

      try {
        throw error;
      } catch (e) {
        expect(e instanceof IntegrationConflictError).toBe(true);
        expect(e instanceof Error).toBe(true);
      }
    });
  });

  describe('Cloudinary Integration - Version Increment', () => {
    it('should create integration with version 1', async () => {
      // Mock no existing integration
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      // Mock successful create
      const mockCreated = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        uploadPreset: 'test-preset',
        autoOptimize: true,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.createRow.mockResolvedValue(mockCreated);

      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        {
          enabled: true,
          cloudName: 'test-cloud',
          apiKey: 'test-key',
          apiSecret: 'test-secret',
          uploadPreset: 'test-preset',
          autoOptimize: true,
          generateThumbnails: false,
          disableSkipCrop: false,
          cropAspectRatio: '1',
        }
      );

      expect(result.version).toBe(1);
      expect(mockTablesDB.createRow).toHaveBeenCalledWith(
        mockDatabaseId,
        mockCloudinaryTableId,
        'unique()',
        expect.objectContaining({
          eventSettingsId: mockEventSettingsId,
          version: 1,
        })
      );
    });

    it('should increment version on update', async () => {
      // Mock existing integration with version 1
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        cloudName: 'old-cloud',
        apiKey: 'old-key',
        apiSecret: 'old-secret',
        uploadPreset: 'old-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      // Mock successful update
      const mockUpdated = {
        ...mockExisting,
        version: 2,
        cloudName: 'new-cloud',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'new-cloud' }
      );

      expect(result.version).toBe(2);
      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        mockDatabaseId,
        mockCloudinaryTableId,
        'cloudinary-123',
        expect.objectContaining({
          version: 2,
        })
      );
    });

    it('should increment version multiple times', async () => {
      // First update: version 1 -> 2
      const mockExisting1 = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        cloudName: 'cloud-v1',
        apiKey: 'key',
        apiSecret: 'secret',
        uploadPreset: 'preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockExisting1],
        total: 1,
      });
      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockExisting1,
        version: 2,
        cloudName: 'cloud-v2',
      });

      const result1 = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'cloud-v2' }
      );
      expect(result1.version).toBe(2);

      // Second update: version 2 -> 3
      const mockExisting2 = { ...result1, version: 2 };
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockExisting2],
        total: 1,
      });
      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockExisting2,
        version: 3,
        cloudName: 'cloud-v3',
      });

      const result2 = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'cloud-v3' }
      );
      expect(result2.version).toBe(3);
    });
  });

  describe('Conflict Detection', () => {
    it('should throw ConflictError when expectedVersion does not match', async () => {
      // Mock existing integration with version 2
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 2,
        enabled: true,
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        uploadPreset: 'test-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      // Attempt update with expectedVersion 1 (should fail)
      await expect(
        updateCloudinaryIntegration(
          mockTablesDB as unknown as TablesDB,
          mockEventSettingsId,
          { cloudName: 'new-cloud' },
          1 // expectedVersion
        )
      ).rejects.toThrow(IntegrationConflictError);

      // Verify update was not called
      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
    });

    it('should include correct version information in conflict error', async () => {
      const mockExisting = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 5,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      try {
        await updateSwitchboardIntegration(
          mockTablesDB as unknown as TablesDB,
          mockEventSettingsId,
          { apiEndpoint: 'https://new-api.test.com' },
          3 // expectedVersion
        );
        expect.fail('Should have thrown IntegrationConflictError');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrationConflictError);
        if (error instanceof IntegrationConflictError) {
          expect(error.expectedVersion).toBe(3);
          expect(error.actualVersion).toBe(5);
          expect(error.integrationType).toBe('Switchboard');
          expect(error.eventSettingsId).toBe(mockEventSettingsId);
        }
      }
    });

    it('should succeed when expectedVersion matches', async () => {
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 3,
        enabled: true,
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        uploadPreset: 'test-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 4,
        cloudName: 'new-cloud',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'new-cloud' },
        3 // expectedVersion matches
      );

      expect(result.version).toBe(4);
      expect(mockTablesDB.updateRow).toHaveBeenCalled();
    });
  });

  describe('Backward Compatibility', () => {
    it('should update without version check when expectedVersion is not provided', async () => {
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 10,
        enabled: true,
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        uploadPreset: 'test-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 11,
        cloudName: 'new-cloud',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      // No expectedVersion provided - should succeed regardless of current version
      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'new-cloud' }
      );

      expect(result.version).toBe(11);
      expect(mockTablesDB.updateRow).toHaveBeenCalled();
    });

    it('should handle missing version field in existing document', async () => {
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        // version field missing (legacy document)
        enabled: true,
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        uploadPreset: 'test-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 1, // Should be set to 1 (0 + 1)
        cloudName: 'new-cloud',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'new-cloud' }
      );

      expect(result.version).toBe(1);
      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        mockDatabaseId,
        mockCloudinaryTableId,
        'cloudinary-123',
        expect.objectContaining({
          version: 1, // 0 + 1
        })
      );
    });

    it('should handle expectedVersion with missing version field', async () => {
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        // version field missing
        enabled: true,
        cloudName: 'test-cloud',
        apiKey: 'test-key',
        apiSecret: 'test-secret',
        uploadPreset: 'test-preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      // Expect version 0 (missing version treated as 0)
      const mockUpdated = {
        ...mockExisting,
        version: 1,
        cloudName: 'new-cloud',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { cloudName: 'new-cloud' },
        0 // expectedVersion 0 for missing version
      );

      expect(result.version).toBe(1);
    });
  });

  describe('Switchboard Integration', () => {
    it('should create with version 1', async () => {
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      const mockCreated = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'test-key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };
      mockTablesDB.createRow.mockResolvedValue(mockCreated);

      const result = await updateSwitchboardIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        {
          enabled: true,
          apiEndpoint: 'https://api.test.com',
          authHeaderType: 'Bearer',
          apiKey: 'test-key',
          requestBody: '{}',
          templateId: 'template-1',
          fieldMappings: '[]',
        }
      );

      expect(result.version).toBe(1);
    });

    it('should increment version on update', async () => {
      const mockExisting = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 2,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'old-key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 3,
        apiKey: 'new-key',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateSwitchboardIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { apiKey: 'new-key' }
      );

      expect(result.version).toBe(3);
    });

    it('should detect conflicts', async () => {
      const mockExisting = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 4,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'test-key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      await expect(
        updateSwitchboardIntegration(
          mockTablesDB as unknown as TablesDB,
          mockEventSettingsId,
          { apiKey: 'new-key' },
          2 // expectedVersion doesn't match
        )
      ).rejects.toThrow(IntegrationConflictError);
    });
  });

  describe('OneSimpleAPI Integration', () => {
    it('should create with version 1', async () => {
      mockTablesDB.listRows.mockResolvedValue({
        rows: [],
        total: 0,
      });

      const mockCreated = {
        $id: 'onesimpleapi-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        url: 'https://api.example.com',
        formDataKey: 'data',
        formDataValue: 'value',
        recordTemplate: '{}',
      };
      mockTablesDB.createRow.mockResolvedValue(mockCreated);

      const result = await updateOneSimpleApiIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        {
          enabled: true,
          url: 'https://api.example.com',
          formDataKey: 'data',
          formDataValue: 'value',
          recordTemplate: '{}',
        }
      );

      expect(result.version).toBe(1);
    });

    it('should increment version on update', async () => {
      const mockExisting = {
        $id: 'onesimpleapi-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        url: 'https://api.example.com',
        formDataKey: 'data',
        formDataValue: 'old-value',
        recordTemplate: '{}',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 2,
        formDataValue: 'new-value',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateOneSimpleApiIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        { formDataValue: 'new-value' }
      );

      expect(result.version).toBe(2);
    });

    it('should detect conflicts', async () => {
      const mockExisting = {
        $id: 'onesimpleapi-123',
        eventSettingsId: mockEventSettingsId,
        version: 3,
        enabled: true,
        url: 'https://api.example.com',
        formDataKey: 'data',
        formDataValue: 'value',
        recordTemplate: '{}',
      };
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockExisting],
        total: 1,
      });

      await expect(
        updateOneSimpleApiIntegration(
          mockTablesDB as unknown as TablesDB,
          mockEventSettingsId,
          { formDataValue: 'new-value' },
          1 // expectedVersion doesn't match
        )
      ).rejects.toThrow(IntegrationConflictError);
    });
  });

  describe('Concurrent Create Handling', () => {
    it('should retry as update when concurrent create causes duplicate', async () => {
      // First call: no existing document
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      // Create fails with duplicate error
      const duplicateError = new Error('Document already exists');
      (duplicateError as any).code = 409;
      mockTablesDB.createRow.mockRejectedValueOnce(duplicateError);

      // Second listRows call finds the document created by concurrent request
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        cloudName: 'concurrent-cloud',
        apiKey: 'key',
        apiSecret: 'secret',
        uploadPreset: 'preset',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockExisting],
        total: 1,
      });

      // Update succeeds
      const mockUpdated = {
        ...mockExisting,
        version: 2,
        cloudName: 'new-cloud',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateCloudinaryIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        {
          enabled: true,
          cloudName: 'new-cloud',
          apiKey: 'key',
          apiSecret: 'secret',
          uploadPreset: 'preset',
          autoOptimize: false,
          generateThumbnails: false,
          disableSkipCrop: false,
          cropAspectRatio: '1',
        }
      );

      expect(result.version).toBe(2);
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(1);
    });

    it('should handle duplicate error message format', async () => {
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      // Create fails with duplicate in message
      const duplicateError = new Error('A document with this ID already exists (duplicate key)');
      mockTablesDB.createRow.mockRejectedValueOnce(duplicateError);

      const mockExisting = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 2,
        apiKey: 'new-key',
      };
      mockTablesDB.updateRow.mockResolvedValue(mockUpdated);

      const result = await updateSwitchboardIntegration(
        mockTablesDB as unknown as TablesDB,
        mockEventSettingsId,
        {
          enabled: true,
          apiEndpoint: 'https://api.test.com',
          authHeaderType: 'Bearer',
          apiKey: 'new-key',
          requestBody: '{}',
          templateId: 'template-1',
          fieldMappings: '[]',
        }
      );

      expect(result.version).toBe(2);
    });
  });
});

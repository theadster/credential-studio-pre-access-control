import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Databases } from 'appwrite';
import {
  IntegrationConflictError,
  updateCloudinaryIntegration,
  updateSwitchboardIntegration,
  updateOneSimpleApiIntegration,
} from '../appwrite-integrations';
import { mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

describe('Integration Optimistic Locking - Concurrent Updates', () => {
  const mockEventSettingsId = 'test-event-123';
  const mockDatabaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
  const mockCloudinaryCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CLOUDINARY_COLLECTION_ID!;
  const mockSwitchboardCollectionId = process.env.NEXT_PUBLIC_APPWRITE_SWITCHBOARD_COLLECTION_ID!;
  const mockOneSimpleApiCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ONESIMPLEAPI_COLLECTION_ID!;

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Concurrent Updates with Same Expected Version', () => {
    it('should allow one update to succeed and one to fail with ConflictError - Cloudinary', async () => {
      // Initial state: integration exists with version 1
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
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

      // First request checks and finds version 1
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockExisting],
        total: 1,
      });

      // First request updates successfully to version 2
      const mockUpdated = {
        ...mockExisting,
        version: 2,
        cloudName: 'updated-cloud-1',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      // Execute first update
      const result1 = await updateCloudinaryIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { cloudName: 'updated-cloud-1' },
        1 // expectedVersion
      );

      expect(result1.version).toBe(2);
      expect(result1.cloudName).toBe('updated-cloud-1');

      // Second request checks and finds version 2 (updated by first request)
      const mockExistingV2 = {
        ...mockExisting,
        version: 2,
        cloudName: 'updated-cloud-1',
      };
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockExistingV2],
        total: 1,
      });

      // Second request should fail because expectedVersion (1) doesn't match actual (2)
      await expect(
        updateCloudinaryIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { cloudName: 'updated-cloud-2' },
          1 // expectedVersion - stale
        )
      ).rejects.toThrow(IntegrationConflictError);

      // Verify the second update was not executed
      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1);
    });

    it('should allow one update to succeed and one to fail with ConflictError - Switchboard', async () => {
      const mockExisting = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 3,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'test-key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };

      // First request
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 4,
        apiKey: 'new-key-1',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      const result1 = await updateSwitchboardIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { apiKey: 'new-key-1' },
        3
      );

      expect(result1.version).toBe(4);

      // Second request with stale version
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUpdated],
        total: 1,
      });

      await expect(
        updateSwitchboardIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { apiKey: 'new-key-2' },
          3 // stale
        )
      ).rejects.toThrow(IntegrationConflictError);
    });

    it('should allow one update to succeed and one to fail with ConflictError - OneSimpleAPI', async () => {
      const mockExisting = {
        $id: 'onesimpleapi-123',
        eventSettingsId: mockEventSettingsId,
        version: 2,
        enabled: true,
        url: 'https://api.example.com',
        formDataKey: 'data',
        formDataValue: 'value',
        recordTemplate: '{}',
      };

      // First request
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 3,
        formDataValue: 'new-value-1',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      const result1 = await updateOneSimpleApiIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { formDataValue: 'new-value-1' },
        2
      );

      expect(result1.version).toBe(3);

      // Second request with stale version
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUpdated],
        total: 1,
      });

      await expect(
        updateOneSimpleApiIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { formDataValue: 'new-value-2' },
          2 // stale
        )
      ).rejects.toThrow(IntegrationConflictError);
    });

    it('should include correct conflict details in error', async () => {
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 5,
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

      // First update succeeds
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockExisting],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 6,
        cloudName: 'updated-cloud',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      await updateCloudinaryIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { cloudName: 'updated-cloud' },
        5
      );

      // Second update fails with detailed error
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUpdated],
        total: 1,
      });

      try {
        await updateCloudinaryIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { cloudName: 'another-update' },
          5 // stale
        );
        expect.fail('Should have thrown IntegrationConflictError');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrationConflictError);
        if (error instanceof IntegrationConflictError) {
          expect(error.integrationType).toBe('Cloudinary');
          expect(error.eventSettingsId).toBe(mockEventSettingsId);
          expect(error.expectedVersion).toBe(5);
          expect(error.actualVersion).toBe(6);
          expect(error.message).toContain('Integration conflict');
          expect(error.message).toContain('Expected version 5');
          expect(error.message).toContain('found version 6');
        }
      }
    });
  });

  describe('Concurrent Creates', () => {
    it('should handle concurrent creates gracefully - Cloudinary', async () => {
      // Both requests check and find no existing document
      mockDatabases.listDocuments
        .mockResolvedValueOnce({ documents: [], total: 0 })
        .mockResolvedValueOnce({ documents: [], total: 0 });

      // First create succeeds
      const mockCreated = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        cloudName: 'cloud-1',
        apiKey: 'key-1',
        apiSecret: 'secret-1',
        uploadPreset: 'preset-1',
        autoOptimize: false,
        generateThumbnails: false,
        disableSkipCrop: false,
        cropAspectRatio: '1',
      };
      mockDatabases.createDocument.mockResolvedValueOnce(mockCreated);

      const result1 = await updateCloudinaryIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        {
          enabled: true,
          cloudName: 'cloud-1',
          apiKey: 'key-1',
          apiSecret: 'secret-1',
          uploadPreset: 'preset-1',
          autoOptimize: false,
          generateThumbnails: false,
          disableSkipCrop: false,
          cropAspectRatio: '1',
        }
      );

      expect(result1.version).toBe(1);
      expect(result1.cloudName).toBe('cloud-1');

      // Second create fails with duplicate error
      const duplicateError = new Error('Document already exists');
      (duplicateError as any).code = 409;
      mockDatabases.createDocument.mockRejectedValueOnce(duplicateError);

      // Retry finds the document and updates it
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockCreated],
        total: 1,
      });

      const mockUpdated = {
        ...mockCreated,
        version: 2,
        cloudName: 'cloud-2',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      const result2 = await updateCloudinaryIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        {
          enabled: true,
          cloudName: 'cloud-2',
          apiKey: 'key-2',
          apiSecret: 'secret-2',
          uploadPreset: 'preset-2',
          autoOptimize: true,
          generateThumbnails: true,
          disableSkipCrop: true,
          cropAspectRatio: '16:9',
        }
      );

      expect(result2.version).toBe(2);
      expect(result2.cloudName).toBe('cloud-2');
    });

    it('should handle concurrent creates gracefully - Switchboard', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

      const mockCreated = {
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        apiEndpoint: 'https://api1.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'key-1',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      };
      mockDatabases.createDocument.mockResolvedValueOnce(mockCreated);

      const result1 = await updateSwitchboardIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        {
          enabled: true,
          apiEndpoint: 'https://api1.test.com',
          authHeaderType: 'Bearer',
          apiKey: 'key-1',
          requestBody: '{}',
          templateId: 'template-1',
          fieldMappings: '[]',
        }
      );

      expect(result1.version).toBe(1);

      // Second create with duplicate error
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
      
      const duplicateError = new Error('duplicate key');
      mockDatabases.createDocument.mockRejectedValueOnce(duplicateError);

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockCreated],
        total: 1,
      });

      const mockUpdated = {
        ...mockCreated,
        version: 2,
        apiKey: 'key-2',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      const result2 = await updateSwitchboardIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        {
          enabled: true,
          apiEndpoint: 'https://api2.test.com',
          authHeaderType: 'Bearer',
          apiKey: 'key-2',
          requestBody: '{}',
          templateId: 'template-2',
          fieldMappings: '[]',
        }
      );

      expect(result2.version).toBe(2);
    });

    it('should handle concurrent creates gracefully - OneSimpleAPI', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [], total: 0 });

      const mockCreated = {
        $id: 'onesimpleapi-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
        enabled: true,
        url: 'https://api1.example.com',
        formDataKey: 'data',
        formDataValue: 'value-1',
        recordTemplate: '{}',
      };
      mockDatabases.createDocument.mockResolvedValueOnce(mockCreated);

      const result1 = await updateOneSimpleApiIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        {
          enabled: true,
          url: 'https://api1.example.com',
          formDataKey: 'data',
          formDataValue: 'value-1',
          recordTemplate: '{}',
        }
      );

      expect(result1.version).toBe(1);

      // Second create with duplicate error
      mockDatabases.listDocuments.mockResolvedValueOnce({ documents: [], total: 0 });
      
      const duplicateError = new Error('Document with ID already exists');
      (duplicateError as any).code = 409;
      mockDatabases.createDocument.mockRejectedValueOnce(duplicateError);

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockCreated],
        total: 1,
      });

      const mockUpdated = {
        ...mockCreated,
        version: 2,
        formDataValue: 'value-2',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      const result2 = await updateOneSimpleApiIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        {
          enabled: true,
          url: 'https://api2.example.com',
          formDataKey: 'data',
          formDataValue: 'value-2',
          recordTemplate: '{}',
        }
      );

      expect(result2.version).toBe(2);
    });
  });

  describe('Retry After Conflict', () => {
    it('should succeed on retry with updated version - Cloudinary', async () => {
      const mockExisting = {
        $id: 'cloudinary-123',
        eventSettingsId: mockEventSettingsId,
        version: 1,
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

      // First attempt with stale version fails
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{ ...mockExisting, version: 2 }],
        total: 1,
      });

      await expect(
        updateCloudinaryIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { cloudName: 'new-cloud' },
          1 // stale
        )
      ).rejects.toThrow(IntegrationConflictError);

      // Retry with correct version succeeds
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{ ...mockExisting, version: 2 }],
        total: 1,
      });

      const mockUpdated = {
        ...mockExisting,
        version: 3,
        cloudName: 'new-cloud',
      };
      mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

      const result = await updateCloudinaryIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { cloudName: 'new-cloud' },
        2 // correct version
      );

      expect(result.version).toBe(3);
      expect(result.cloudName).toBe('new-cloud');
    });

    it('should succeed on retry with updated version - Switchboard', async () => {
      // First attempt fails
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{
          $id: 'switchboard-123',
          eventSettingsId: mockEventSettingsId,
          version: 5,
          enabled: true,
          apiEndpoint: 'https://api.test.com',
          authHeaderType: 'Bearer',
          apiKey: 'test-key',
          requestBody: '{}',
          templateId: 'template-1',
          fieldMappings: '[]',
        }],
        total: 1,
      });

      await expect(
        updateSwitchboardIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { apiKey: 'new-key' },
          3 // stale
        )
      ).rejects.toThrow(IntegrationConflictError);

      // Retry succeeds
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{
          $id: 'switchboard-123',
          eventSettingsId: mockEventSettingsId,
          version: 5,
          enabled: true,
          apiEndpoint: 'https://api.test.com',
          authHeaderType: 'Bearer',
          apiKey: 'test-key',
          requestBody: '{}',
          templateId: 'template-1',
          fieldMappings: '[]',
        }],
        total: 1,
      });

      mockDatabases.updateDocument.mockResolvedValueOnce({
        $id: 'switchboard-123',
        eventSettingsId: mockEventSettingsId,
        version: 6,
        enabled: true,
        apiEndpoint: 'https://api.test.com',
        authHeaderType: 'Bearer',
        apiKey: 'new-key',
        requestBody: '{}',
        templateId: 'template-1',
        fieldMappings: '[]',
      });

      const result = await updateSwitchboardIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { apiKey: 'new-key' },
        5 // correct version
      );

      expect(result.version).toBe(6);
    });

    it('should succeed on retry with updated version - OneSimpleAPI', async () => {
      // First attempt fails
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{
          $id: 'onesimpleapi-123',
          eventSettingsId: mockEventSettingsId,
          version: 4,
          enabled: true,
          url: 'https://api.example.com',
          formDataKey: 'data',
          formDataValue: 'value',
          recordTemplate: '{}',
        }],
        total: 1,
      });

      await expect(
        updateOneSimpleApiIntegration(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          { formDataValue: 'new-value' },
          2 // stale
        )
      ).rejects.toThrow(IntegrationConflictError);

      // Retry succeeds
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{
          $id: 'onesimpleapi-123',
          eventSettingsId: mockEventSettingsId,
          version: 4,
          enabled: true,
          url: 'https://api.example.com',
          formDataKey: 'data',
          formDataValue: 'value',
          recordTemplate: '{}',
        }],
        total: 1,
      });

      mockDatabases.updateDocument.mockResolvedValueOnce({
        $id: 'onesimpleapi-123',
        eventSettingsId: mockEventSettingsId,
        version: 5,
        enabled: true,
        url: 'https://api.example.com',
        formDataKey: 'data',
        formDataValue: 'new-value',
        recordTemplate: '{}',
      });

      const result = await updateOneSimpleApiIntegration(
        mockDatabases as unknown as Databases,
        mockEventSettingsId,
        { formDataValue: 'new-value' },
        4 // correct version
      );

      expect(result.version).toBe(5);
    });
  });

  describe('Consistent Behavior Across Integration Types', () => {
    it('should handle version conflicts consistently', async () => {
      const testCases = [
        {
          name: 'Cloudinary',
          updateFn: updateCloudinaryIntegration,
          mockDoc: {
            $id: 'cloudinary-123',
            eventSettingsId: mockEventSettingsId,
            version: 10,
            enabled: true,
            cloudName: 'test',
            apiKey: 'key',
            apiSecret: 'secret',
            uploadPreset: 'preset',
            autoOptimize: false,
            generateThumbnails: false,
            disableSkipCrop: false,
            cropAspectRatio: '1',
          },
          updateData: { cloudName: 'new-cloud' },
        },
        {
          name: 'Switchboard',
          updateFn: updateSwitchboardIntegration,
          mockDoc: {
            $id: 'switchboard-123',
            eventSettingsId: mockEventSettingsId,
            version: 10,
            enabled: true,
            apiEndpoint: 'https://api.test.com',
            authHeaderType: 'Bearer',
            apiKey: 'key',
            requestBody: '{}',
            templateId: 'template-1',
            fieldMappings: '[]',
          },
          updateData: { apiKey: 'new-key' },
        },
        {
          name: 'OneSimpleAPI',
          updateFn: updateOneSimpleApiIntegration,
          mockDoc: {
            $id: 'onesimpleapi-123',
            eventSettingsId: mockEventSettingsId,
            version: 10,
            enabled: true,
            url: 'https://api.example.com',
            formDataKey: 'data',
            formDataValue: 'value',
            recordTemplate: '{}',
          },
          updateData: { formDataValue: 'new-value' },
        },
      ];

      for (const testCase of testCases) {
        resetAllMocks();

        mockDatabases.listDocuments.mockResolvedValueOnce({
          documents: [testCase.mockDoc],
          total: 1,
        });

        try {
          await testCase.updateFn(
            mockDatabases as unknown as Databases,
            mockEventSettingsId,
            testCase.updateData,
            5 // stale version
          );
          expect.fail(`${testCase.name} should have thrown IntegrationConflictError`);
        } catch (error) {
          expect(error).toBeInstanceOf(IntegrationConflictError);
          if (error instanceof IntegrationConflictError) {
            expect(error.integrationType).toBe(testCase.name);
            expect(error.expectedVersion).toBe(5);
            expect(error.actualVersion).toBe(10);
          }
        }
      }
    });

    it('should increment versions consistently', async () => {
      const testCases = [
        {
          name: 'Cloudinary',
          updateFn: updateCloudinaryIntegration,
          mockDoc: {
            $id: 'cloudinary-123',
            eventSettingsId: mockEventSettingsId,
            version: 7,
            enabled: true,
            cloudName: 'test',
            apiKey: 'key',
            apiSecret: 'secret',
            uploadPreset: 'preset',
            autoOptimize: false,
            generateThumbnails: false,
            disableSkipCrop: false,
            cropAspectRatio: '1',
          },
          updateData: { cloudName: 'new-cloud' },
        },
        {
          name: 'Switchboard',
          updateFn: updateSwitchboardIntegration,
          mockDoc: {
            $id: 'switchboard-123',
            eventSettingsId: mockEventSettingsId,
            version: 7,
            enabled: true,
            apiEndpoint: 'https://api.test.com',
            authHeaderType: 'Bearer',
            apiKey: 'key',
            requestBody: '{}',
            templateId: 'template-1',
            fieldMappings: '[]',
          },
          updateData: { apiKey: 'new-key' },
        },
        {
          name: 'OneSimpleAPI',
          updateFn: updateOneSimpleApiIntegration,
          mockDoc: {
            $id: 'onesimpleapi-123',
            eventSettingsId: mockEventSettingsId,
            version: 7,
            enabled: true,
            url: 'https://api.example.com',
            formDataKey: 'data',
            formDataValue: 'value',
            recordTemplate: '{}',
          },
          updateData: { formDataValue: 'new-value' },
        },
      ];

      for (const testCase of testCases) {
        resetAllMocks();

        mockDatabases.listDocuments.mockResolvedValueOnce({
          documents: [testCase.mockDoc],
          total: 1,
        });

        const mockUpdated = {
          ...testCase.mockDoc,
          version: 8,
          ...testCase.updateData,
        };
        mockDatabases.updateDocument.mockResolvedValueOnce(mockUpdated);

        const result = await testCase.updateFn(
          mockDatabases as unknown as Databases,
          mockEventSettingsId,
          testCase.updateData,
          7
        );

        expect(result.version).toBe(8);
      }
    });
  });
});

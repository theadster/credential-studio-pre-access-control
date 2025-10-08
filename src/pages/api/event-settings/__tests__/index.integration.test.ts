import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IntegrationConflictError } from '@/lib/appwrite-integrations';

/**
 * API Route Conflict Response Tests
 * 
 * These tests verify that IntegrationConflictError is properly structured
 * to be serialized as a 409 response by API routes. The actual API route
 * handler catches IntegrationConflictError and returns a 409 status with
 * the error details.
 */
describe('API Route - Integration Conflict Response Format', () => {
  const mockEventSettingsId = 'event-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('IntegrationConflictError Structure for API Responses', () => {
    it('should have all required properties for 409 response - Cloudinary', () => {
      const error = new IntegrationConflictError(
        'Cloudinary',
        mockEventSettingsId,
        1,
        2
      );

      // Verify error has all properties needed for API response
      expect(error.integrationType).toBe('Cloudinary');
      expect(error.eventSettingsId).toBe(mockEventSettingsId);
      expect(error.expectedVersion).toBe(1);
      expect(error.actualVersion).toBe(2);
      expect(error.message).toBeTruthy();
      expect(error.name).toBe('IntegrationConflictError');

      // Simulate what API route would return
      const apiResponse = {
        error: 'Conflict',
        message: error.message,
        integrationType: error.integrationType,
        eventSettingsId: error.eventSettingsId,
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
      };

      expect(apiResponse.error).toBe('Conflict');
      expect(apiResponse.integrationType).toBe('Cloudinary');
      expect(apiResponse.expectedVersion).toBe(1);
      expect(apiResponse.actualVersion).toBe(2);
    });

    it('should have all required properties for 409 response - Switchboard', () => {
      const error = new IntegrationConflictError(
        'Switchboard',
        mockEventSettingsId,
        3,
        5
      );

      const apiResponse = {
        error: 'Conflict',
        message: error.message,
        integrationType: error.integrationType,
        eventSettingsId: error.eventSettingsId,
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
      };

      expect(apiResponse.error).toBe('Conflict');
      expect(apiResponse.integrationType).toBe('Switchboard');
      expect(apiResponse.expectedVersion).toBe(3);
      expect(apiResponse.actualVersion).toBe(5);
    });

    it('should have all required properties for 409 response - OneSimpleAPI', () => {
      const error = new IntegrationConflictError(
        'OneSimpleAPI',
        mockEventSettingsId,
        2,
        4
      );

      const apiResponse = {
        error: 'Conflict',
        message: error.message,
        integrationType: error.integrationType,
        eventSettingsId: error.eventSettingsId,
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
      };

      expect(apiResponse.error).toBe('Conflict');
      expect(apiResponse.integrationType).toBe('OneSimpleAPI');
      expect(apiResponse.expectedVersion).toBe(2);
      expect(apiResponse.actualVersion).toBe(4);
    });

    it('should be serializable to JSON for API response', () => {
      const error = new IntegrationConflictError(
        'Cloudinary',
        'event-456',
        10,
        15
      );

      const apiResponse = {
        error: 'Conflict',
        message: error.message,
        integrationType: error.integrationType,
        eventSettingsId: error.eventSettingsId,
        expectedVersion: error.expectedVersion,
        actualVersion: error.actualVersion,
      };

      // Verify it can be serialized to JSON (what res.json() does)
      const jsonString = JSON.stringify(apiResponse);
      const parsed = JSON.parse(jsonString);

      expect(parsed.error).toBe('Conflict');
      expect(parsed.integrationType).toBe('Cloudinary');
      expect(parsed.eventSettingsId).toBe('event-456');
      expect(parsed.expectedVersion).toBe(10);
      expect(parsed.actualVersion).toBe(15);
      expect(parsed.message).toContain('Integration conflict');
    });

    it('should have descriptive message for client debugging', () => {
      const error = new IntegrationConflictError(
        'Switchboard',
        'event-789',
        7,
        12
      );

      expect(error.message).toContain('Integration conflict');
      expect(error.message).toContain('Switchboard');
      expect(error.message).toContain('event-789');
      expect(error.message).toContain('Expected version 7');
      expect(error.message).toContain('found version 12');
      expect(error.message).toContain('modified by another request');
    });
  });

  describe('Consistent Error Response Format Across Integration Types', () => {
    const integrationTypes = ['Cloudinary', 'Switchboard', 'OneSimpleAPI'];

    it.each(integrationTypes)(
      'should have consistent response format for %s',
      (integrationType) => {
        const error = new IntegrationConflictError(
          integrationType,
          mockEventSettingsId,
          5,
          8
        );

        const apiResponse = {
          error: 'Conflict',
          message: error.message,
          integrationType: error.integrationType,
          eventSettingsId: error.eventSettingsId,
          expectedVersion: error.expectedVersion,
          actualVersion: error.actualVersion,
        };

        // All integration types should have the same response structure
        expect(apiResponse).toHaveProperty('error');
        expect(apiResponse).toHaveProperty('message');
        expect(apiResponse).toHaveProperty('integrationType');
        expect(apiResponse).toHaveProperty('eventSettingsId');
        expect(apiResponse).toHaveProperty('expectedVersion');
        expect(apiResponse).toHaveProperty('actualVersion');

        expect(apiResponse.error).toBe('Conflict');
        expect(apiResponse.integrationType).toBe(integrationType);
        expect(apiResponse.expectedVersion).toBe(5);
        expect(apiResponse.actualVersion).toBe(8);
      }
    );
  });

  describe('Error Distinguishability', () => {
    it('should be distinguishable from generic errors by instanceof check', () => {
      const conflictError = new IntegrationConflictError(
        'Cloudinary',
        mockEventSettingsId,
        1,
        2
      );
      const genericError = new Error('Generic error');

      expect(conflictError instanceof IntegrationConflictError).toBe(true);
      expect(conflictError instanceof Error).toBe(true);
      expect(genericError instanceof IntegrationConflictError).toBe(false);
    });

    it('should be distinguishable by error name property', () => {
      const conflictError = new IntegrationConflictError(
        'Switchboard',
        mockEventSettingsId,
        1,
        2
      );
      const genericError = new Error('Generic error');

      expect(conflictError.name).toBe('IntegrationConflictError');
      expect(genericError.name).toBe('Error');
    });
  });
});

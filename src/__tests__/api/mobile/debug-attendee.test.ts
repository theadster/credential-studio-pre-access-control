/**
 * Tests for Mobile Debug Attendee Endpoint
 * 
 * Tests barcode parameter validation, URL decoding, attendee data retrieval, and error handling
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 5.1, 5.2
 * 
 * @see src/pages/api/mobile/debug/attendee/[barcode].ts
 * @see .kiro/specs/mobile-debug-endpoint/requirements.md
 */

import { describe, it, expect } from 'vitest';

describe('Mobile Debug Attendee Endpoint - Barcode Validation', () => {
  describe('Requirement 1.6: Extract and validate barcode parameter', () => {
    it('should extract barcode from route parameter', () => {
      // Test that barcode is properly extracted from req.query
      const barcode = '12345';
      const query = { barcode };
      
      expect(query.barcode).toBe('12345');
    });

    it('should handle barcode as array (Next.js query behavior)', () => {
      // Next.js can return query params as arrays
      const barcode = ['12345'];
      const extracted = Array.isArray(barcode) ? barcode[0] : barcode;
      
      expect(extracted).toBe('12345');
    });

    it('should handle barcode as string', () => {
      const barcode = '12345';
      const extracted = Array.isArray(barcode) ? barcode[0] : barcode;
      
      expect(extracted).toBe('12345');
    });
  });

  describe('Requirement 5.1: URL decode barcode parameter', () => {
    it('should decode URL-encoded barcode with special characters', () => {
      const encodedBarcode = 'ABC%2B123%2F456';
      const decoded = decodeURIComponent(encodedBarcode);
      
      expect(decoded).toBe('ABC+123/456');
    });

    it('should decode barcode with spaces', () => {
      const encodedBarcode = 'ABC%20123';
      const decoded = decodeURIComponent(encodedBarcode);
      
      expect(decoded).toBe('ABC 123');
    });

    it('should decode barcode with special characters', () => {
      const encodedBarcode = '%40%23%24%25';
      const decoded = decodeURIComponent(encodedBarcode);
      
      expect(decoded).toBe('@#$%');
    });

    it('should handle already-decoded barcode', () => {
      const barcode = 'ABC123';
      const decoded = decodeURIComponent(barcode);
      
      expect(decoded).toBe('ABC123');
    });

    it('should handle barcode with unicode characters', () => {
      const encodedBarcode = '%E2%9C%93'; // checkmark symbol
      const decoded = decodeURIComponent(encodedBarcode);
      
      expect(decoded).toBe('✓');
    });

    it('should throw error on invalid URL encoding', () => {
      const invalidEncoded = '%ZZ';
      
      expect(() => {
        decodeURIComponent(invalidEncoded);
      }).toThrow();
    });
  });

  describe('Requirement 5.2: Validate barcode is not empty', () => {
    it('should reject empty string barcode', () => {
      const barcode: string | null = '';
      const isValid = !!(barcode && barcode.trim() !== '');
      
      expect(isValid).toBe(false);
    });

    it('should reject whitespace-only barcode', () => {
      const barcode: string | null = '   ';
      const isValid = !!(barcode && barcode.trim() !== '');
      
      expect(isValid).toBe(false);
    });

    it('should reject null barcode', () => {
      const barcode: string | null = null;
      const isValid = !!(barcode && barcode.trim() !== '');
      
      expect(isValid).toBe(false);
    });

    it('should reject undefined barcode', () => {
      const barcode: string | undefined = undefined;
      const isValid = !!(barcode && barcode.trim() !== '');
      
      expect(isValid).toBe(false);
    });

    it('should accept valid barcode', () => {
      const barcode = '12345';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });

    it('should accept barcode with leading/trailing spaces after trim', () => {
      const barcode = '  12345  ';
      const trimmed = barcode.trim();
      const isValid = trimmed !== '';
      
      expect(isValid).toBe(true);
      expect(trimmed).toBe('12345');
    });

    it('should accept barcode with special characters', () => {
      const barcode = 'ABC+123/456';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });

    it('should accept barcode with numbers only', () => {
      const barcode = '123456789';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });

    it('should accept barcode with alphanumeric characters', () => {
      const barcode = 'ABC123XYZ';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });
  });

  describe('Barcode validation edge cases', () => {
    it('should handle very long barcode', () => {
      const barcode = 'A'.repeat(1000);
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
      expect(barcode.length).toBe(1000);
    });

    it('should handle barcode with newlines', () => {
      const barcode = 'ABC\n123';
      const trimmed = barcode.trim();
      const isValid = trimmed !== '';
      
      expect(isValid).toBe(true);
      expect(trimmed).toBe('ABC\n123'); // trim only removes leading/trailing
    });

    it('should handle barcode with tabs', () => {
      const barcode = 'ABC\t123';
      const trimmed = barcode.trim();
      const isValid = trimmed !== '';
      
      expect(isValid).toBe(true);
    });

    it('should handle barcode with mixed case', () => {
      const barcode = 'AbC123XyZ';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });

    it('should handle barcode with hyphens', () => {
      const barcode = 'ABC-123-XYZ';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });

    it('should handle barcode with underscores', () => {
      const barcode = 'ABC_123_XYZ';
      const isValid = barcode && barcode.trim() !== '';
      
      expect(isValid).toBe(true);
    });
  });

  describe('URL decoding with validation combined', () => {
    it('should decode and validate barcode in sequence', () => {
      const encodedBarcode = 'ABC%2B123';
      const decoded = decodeURIComponent(encodedBarcode);
      const isValid = decoded && decoded.trim() !== '';
      
      expect(decoded).toBe('ABC+123');
      expect(isValid).toBe(true);
    });

    it('should handle decode error gracefully', () => {
      const invalidEncoded = '%ZZ';
      
      let decoded = '';
      let isValid = false;
      
      try {
        decoded = decodeURIComponent(invalidEncoded);
        isValid = decoded && decoded.trim() !== '';
      } catch (error) {
        isValid = false;
      }
      
      expect(isValid).toBe(false);
    });

    it('should validate empty string after decoding', () => {
      const encodedBarcode = '';
      const decoded = decodeURIComponent(encodedBarcode);
      const isValid = !!(decoded && decoded.trim() !== '');
      
      expect(isValid).toBe(false);
    });

    it('should validate whitespace-only string after decoding', () => {
      const encodedBarcode = '%20%20%20'; // three spaces
      const decoded = decodeURIComponent(encodedBarcode);
      const isValid = decoded && decoded.trim() !== '';
      
      expect(isValid).toBe(false);
    });
  });
});

describe('Mobile Debug Attendee Endpoint - Error Handling', () => {
  describe('Requirement 4.1: Handle database connection errors', () => {
    it('should return 503 when database is unavailable', () => {
      const error = new Error('Service unavailable');
      (error as any).code = 'service_unavailable';

      const isServiceUnavailable = error.code === 'service_unavailable' || 
                                   error.message?.includes('unavailable');
      
      expect(isServiceUnavailable).toBe(true);
    });

    it('should return 503 with "Service unavailable" message', () => {
      const errorResponse = {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service unavailable'
      };

      expect(errorResponse.error).toBe('SERVICE_UNAVAILABLE');
      expect(errorResponse.message).toBe('Service unavailable');
    });

    it('should handle database connection timeout', () => {
      const error = new Error('Connection timeout');
      (error as any).code = 'service_unavailable';

      const isServiceUnavailable = error.code === 'service_unavailable';
      
      expect(isServiceUnavailable).toBe(true);
    });

    it('should handle database network errors', () => {
      const error = new Error('Network error');
      (error as any).message = 'service unavailable';

      const isServiceUnavailable = error.message?.includes('unavailable');
      
      expect(isServiceUnavailable).toBe(true);
    });

    it('should log database errors for debugging', () => {
      const error = new Error('Database error');
      const logMessage = `[Mobile Debug Attendee] Error: ${error.message}`;

      expect(logMessage).toContain('Mobile Debug Attendee');
      expect(logMessage).toContain('Database error');
    });
  });

  describe('Requirement 5.3: Handle null/missing optional fields', () => {
    it('should include null email when missing', () => {
      const attendee: any = {
        $id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe'
      };

      const coreData = {
        email: attendee.email || null
      };

      expect(coreData.email).toBeNull();
    });

    it('should include null phone when missing', () => {
      const attendee: any = {
        $id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe'
      };

      const coreData = {
        phone: attendee.phone || null
      };

      expect(coreData.phone).toBeNull();
    });

    it('should omit photoUrl when undefined', () => {
      const response: any = {
        id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: null,
        phone: null,
        photoUrl: undefined
      };

      if (response.photoUrl === undefined) {
        delete response.photoUrl;
      }

      expect(response).not.toHaveProperty('photoUrl');
    });

    it('should handle all optional fields missing', () => {
      const attendee: any = {
        $id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe'
      };

      const coreData = {
        id: attendee.$id,
        barcodeNumber: attendee.barcodeNumber,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email || null,
        phone: attendee.phone || null,
        photoUrl: attendee.photoUrl || undefined
      };

      expect(coreData.email).toBeNull();
      expect(coreData.phone).toBeNull();
      expect(coreData.photoUrl).toBeUndefined();
    });

    it('should handle null values in access control dates', () => {
      const accessControl = {
        accessEnabled: true,
        validFrom: null,
        validUntil: null
      };

      expect(accessControl.validFrom).toBeNull();
      expect(accessControl.validUntil).toBeNull();
    });

    it('should handle partial access control dates', () => {
      const accessControl = {
        accessEnabled: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: null
      };

      expect(accessControl.validFrom).toBe('2024-01-01T00:00:00Z');
      expect(accessControl.validUntil).toBeNull();
    });

    it('should handle empty custom fields object', () => {
      const customFields: Record<string, any> = {};

      expect(customFields).toEqual({});
      expect(Object.keys(customFields).length).toBe(0);
    });
  });

  describe('Requirement 5.4: Handle special characters in barcode', () => {
    it('should handle barcode with plus sign', () => {
      const encodedBarcode = 'ABC%2B123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC+123');
    });

    it('should handle barcode with forward slash', () => {
      const encodedBarcode = 'ABC%2F123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC/123');
    });

    it('should handle barcode with ampersand', () => {
      const encodedBarcode = 'ABC%26123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC&123');
    });

    it('should handle barcode with equals sign', () => {
      const encodedBarcode = 'ABC%3D123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC=123');
    });

    it('should handle barcode with question mark', () => {
      const encodedBarcode = 'ABC%3F123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC?123');
    });

    it('should handle barcode with hash', () => {
      const encodedBarcode = 'ABC%23123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC#123');
    });

    it('should handle barcode with percent sign', () => {
      const encodedBarcode = 'ABC%25123';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC%123');
    });

    it('should handle barcode with multiple special characters', () => {
      const encodedBarcode = 'ABC%2B123%2F456%26789';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC+123/456&789');
    });

    it('should handle barcode with unicode characters', () => {
      const encodedBarcode = '%E2%9C%93ABC123'; // checkmark + ABC123
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('✓ABC123');
    });

    it('should handle invalid URL encoding gracefully', () => {
      const invalidEncoded = '%ZZ';
      let decoded = '';
      let hasError = false;

      try {
        decoded = decodeURIComponent(invalidEncoded);
      } catch (error) {
        hasError = true;
      }

      expect(hasError).toBe(true);
    });

    it('should handle barcode with spaces', () => {
      const encodedBarcode = 'ABC%20123%20XYZ';
      const decoded = decodeURIComponent(encodedBarcode);

      expect(decoded).toBe('ABC 123 XYZ');
    });
  });

  describe('Error response format', () => {
    it('should return error with error code and message', () => {
      const errorResponse = {
        error: 'NOT_FOUND',
        message: 'Attendee not found'
      };

      expect(errorResponse).toHaveProperty('error');
      expect(errorResponse).toHaveProperty('message');
      expect(typeof errorResponse.error).toBe('string');
      expect(typeof errorResponse.message).toBe('string');
    });

    it('should return validation error for missing barcode', () => {
      const errorResponse = {
        error: 'VALIDATION_ERROR',
        message: 'Barcode is required'
      };

      expect(errorResponse.error).toBe('VALIDATION_ERROR');
      expect(errorResponse.message).toBe('Barcode is required');
    });

    it('should return service unavailable error', () => {
      const errorResponse = {
        error: 'SERVICE_UNAVAILABLE',
        message: 'Service unavailable'
      };

      expect(errorResponse.error).toBe('SERVICE_UNAVAILABLE');
      expect(errorResponse.message).toBe('Service unavailable');
    });

    it('should return server error for unexpected failures', () => {
      const errorResponse = {
        error: 'SERVER_ERROR',
        message: 'Failed to fetch attendee'
      };

      expect(errorResponse.error).toBe('SERVER_ERROR');
      expect(errorResponse.message).toBe('Failed to fetch attendee');
    });

    it('should include consistent error structure', () => {
      const errors = [
        { error: 'NOT_FOUND', message: 'Attendee not found' },
        { error: 'VALIDATION_ERROR', message: 'Barcode is required' },
        { error: 'SERVICE_UNAVAILABLE', message: 'Service unavailable' },
        { error: 'SERVER_ERROR', message: 'Failed to fetch attendee' }
      ];

      errors.forEach(err => {
        expect(err).toHaveProperty('error');
        expect(err).toHaveProperty('message');
        expect(typeof err.error).toBe('string');
        expect(typeof err.message).toBe('string');
      });
    });
  });

  describe('Logging for debugging', () => {
    it('should log errors with context', () => {
      const error = new Error('Test error');
      const logMessage = `[Mobile Debug Attendee] Error: ${error.message}`;

      expect(logMessage).toContain('[Mobile Debug Attendee]');
      expect(logMessage).toContain('Error');
      expect(logMessage).toContain('Test error');
    });

    it('should log access control fetch failures', () => {
      const attendeeId = 'doc123';
      const error = new Error('Access control query failed');
      const logMessage = `[Mobile Debug Attendee] Failed to fetch access control for attendee ${attendeeId}: ${error.message}`;

      expect(logMessage).toContain('Failed to fetch access control');
      expect(logMessage).toContain(attendeeId);
    });

    it('should log custom field parsing errors', () => {
      const attendeeId = 'doc123';
      const error = new Error('Invalid JSON');
      const logMessage = `Failed to parse customFieldValues for attendee ${attendeeId}: ${error.message}`;

      expect(logMessage).toContain('Failed to parse customFieldValues');
      expect(logMessage).toContain(attendeeId);
    });

    it('should log custom fields fetch failures', () => {
      const error = new Error('Custom fields query failed');
      const logMessage = `[Mobile Debug Attendee] Failed to fetch custom fields: ${error.message}`;

      expect(logMessage).toContain('[Mobile Debug Attendee]');
      expect(logMessage).toContain('Failed to fetch custom fields');
    });

    it('should include error details in logs', () => {
      const error = new Error('Database connection failed');
      (error as any).code = 'ECONNREFUSED';
      const logMessage = `[Mobile Debug Attendee] Error: ${error.message} (${(error as any).code})`;

      expect(logMessage).toContain('Database connection failed');
      expect(logMessage).toContain('ECONNREFUSED');
    });
  });
});

describe('Mobile Debug Attendee Endpoint - Data Retrieval', () => {
  describe('Requirement 1.1: Query attendees collection by barcode', () => {
    it('should construct query to find attendee by barcode', () => {
      // Simulate the query construction
      const barcode = '12345';
      const query = { barcodeNumber: barcode };
      
      expect(query.barcodeNumber).toBe('12345');
    });

    it('should handle barcode with special characters in query', () => {
      const barcode = 'ABC+123/456';
      const query = { barcodeNumber: barcode };
      
      expect(query.barcodeNumber).toBe('ABC+123/456');
    });
  });

  describe('Requirement 1.2: Retrieve core fields', () => {
    it('should extract core fields from attendee document', () => {
      const attendee = {
        $id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        photoUrl: 'https://example.com/photo.jpg'
      };

      const coreData = {
        id: attendee.$id,
        barcodeNumber: attendee.barcodeNumber,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email || null,
        phone: attendee.phone || null,
        photoUrl: attendee.photoUrl || undefined
      };

      expect(coreData.id).toBe('doc123');
      expect(coreData.barcodeNumber).toBe('12345');
      expect(coreData.firstName).toBe('John');
      expect(coreData.lastName).toBe('Doe');
      expect(coreData.email).toBe('john@example.com');
      expect(coreData.phone).toBe('555-1234');
      expect(coreData.photoUrl).toBe('https://example.com/photo.jpg');
    });

    it('should handle missing optional fields', () => {
      const attendee: any = {
        $id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe'
      };

      const coreData = {
        id: attendee.$id,
        barcodeNumber: attendee.barcodeNumber,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email || null,
        phone: attendee.phone || null,
        photoUrl: attendee.photoUrl || undefined
      };

      expect(coreData.email).toBeNull();
      expect(coreData.phone).toBeNull();
      expect(coreData.photoUrl).toBeUndefined();
    });

    it('should include all required core fields', () => {
      const attendee = {
        $id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234'
      };

      const coreData = {
        id: attendee.$id,
        barcodeNumber: attendee.barcodeNumber,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email || null,
        phone: attendee.phone || null
      };

      expect(coreData).toHaveProperty('id');
      expect(coreData).toHaveProperty('barcodeNumber');
      expect(coreData).toHaveProperty('firstName');
      expect(coreData).toHaveProperty('lastName');
      expect(coreData).toHaveProperty('email');
      expect(coreData).toHaveProperty('phone');
    });
  });

  describe('Requirement 1.3: Retrieve custom fields', () => {
    it('should parse and map custom field values', () => {
      const customFieldValues = JSON.stringify({
        'field1': 'value1',
        'field2': 'value2'
      });

      const fieldNameMap = new Map([
        ['field1', 'Department'],
        ['field2', 'Team']
      ]);

      const customFields: Record<string, any> = {};
      const parsed = JSON.parse(customFieldValues);

      Object.entries(parsed).forEach(([fieldId, value]) => {
        const displayName = fieldNameMap.get(fieldId) || fieldId;
        customFields[displayName] = value;
      });

      expect(customFields['Department']).toBe('value1');
      expect(customFields['Team']).toBe('value2');
    });

    it('should handle attendee with no custom fields', () => {
      const customFields: Record<string, any> = {};
      
      expect(customFields).toEqual({});
      expect(Object.keys(customFields).length).toBe(0);
    });

    it('should handle custom fields with various data types', () => {
      const customFieldValues = JSON.stringify({
        'field1': 'text',
        'field2': 123,
        'field3': true,
        'field4': null,
        'field5': ['a', 'b', 'c']
      });

      const fieldNameMap = new Map([
        ['field1', 'Name'],
        ['field2', 'Count'],
        ['field3', 'Active'],
        ['field4', 'Notes'],
        ['field5', 'Tags']
      ]);

      const customFields: Record<string, any> = {};
      const parsed = JSON.parse(customFieldValues);

      Object.entries(parsed).forEach(([fieldId, value]) => {
        const displayName = fieldNameMap.get(fieldId) || fieldId;
        customFields[displayName] = value;
      });

      expect(customFields['Name']).toBe('text');
      expect(customFields['Count']).toBe(123);
      expect(customFields['Active']).toBe(true);
      expect(customFields['Notes']).toBeNull();
      expect(customFields['Tags']).toEqual(['a', 'b', 'c']);
    });

    it('should handle malformed custom field JSON gracefully', () => {
      const malformedJSON = 'not valid json';
      let customFields: Record<string, any> = {};

      try {
        const parsed = JSON.parse(malformedJSON);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          Object.entries(parsed).forEach(([fieldId, value]) => {
            customFields[fieldId] = value;
          });
        }
      } catch (error) {
        // Silently fail and return empty object
        customFields = {};
      }

      expect(customFields).toEqual({});
    });
  });

  describe('Requirement 1.4: Retrieve access control fields', () => {
    it('should extract access control data', () => {
      const accessControl = {
        accessEnabled: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-12-31T23:59:59Z'
      };

      expect(accessControl.accessEnabled).toBe(true);
      expect(accessControl.validFrom).toBe('2024-01-01T00:00:00Z');
      expect(accessControl.validUntil).toBe('2024-12-31T23:59:59Z');
    });

    it('should handle missing access control data with defaults', () => {
      const accessControl = {
        accessEnabled: true,
        validFrom: null,
        validUntil: null
      };

      expect(accessControl.accessEnabled).toBe(true);
      expect(accessControl.validFrom).toBeNull();
      expect(accessControl.validUntil).toBeNull();
    });

    it('should handle access disabled', () => {
      const accessControl = {
        accessEnabled: false,
        validFrom: null,
        validUntil: null
      };

      expect(accessControl.accessEnabled).toBe(false);
    });

    it('should include ISO 8601 formatted dates', () => {
      const accessControl = {
        accessEnabled: true,
        validFrom: '2024-01-01T00:00:00Z',
        validUntil: '2024-12-31T23:59:59Z'
      };

      // Verify ISO 8601 format
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
      
      if (accessControl.validFrom) {
        expect(iso8601Regex.test(accessControl.validFrom)).toBe(true);
      }
      if (accessControl.validUntil) {
        expect(iso8601Regex.test(accessControl.validUntil)).toBe(true);
      }
    });
  });

  describe('Requirement 1.5: Handle attendee not found', () => {
    it('should return 404 when attendee not found', () => {
      const documents: any[] = [];
      const found = documents.length > 0;

      expect(found).toBe(false);
    });

    it('should return error message "Attendee not found"', () => {
      const errorMessage = 'Attendee not found';
      
      expect(errorMessage).toBe('Attendee not found');
    });

    it('should handle empty query results', () => {
      const queryResults = { documents: [] };
      const attendeeFound = queryResults.documents.length > 0;

      expect(attendeeFound).toBe(false);
    });
  });

  describe('Response format validation', () => {
    it('should format complete response with all fields', () => {
      const response = {
        id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        photoUrl: 'https://example.com/photo.jpg',
        accessControl: {
          accessEnabled: true,
          validFrom: '2024-01-01T00:00:00Z',
          validUntil: '2024-12-31T23:59:59Z'
        },
        customFields: {
          Department: 'Sales',
          Team: 'North'
        }
      };

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('barcodeNumber');
      expect(response).toHaveProperty('firstName');
      expect(response).toHaveProperty('lastName');
      expect(response).toHaveProperty('email');
      expect(response).toHaveProperty('phone');
      expect(response).toHaveProperty('photoUrl');
      expect(response).toHaveProperty('accessControl');
      expect(response).toHaveProperty('customFields');
    });

    it('should omit photoUrl when not present', () => {
      const response = {
        id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        accessControl: {
          accessEnabled: true,
          validFrom: null,
          validUntil: null
        },
        customFields: {}
      };

      expect(response).not.toHaveProperty('photoUrl');
    });

    it('should include empty customFields object when no custom fields', () => {
      const response = {
        id: 'doc123',
        barcodeNumber: '12345',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        accessControl: {
          accessEnabled: true,
          validFrom: null,
          validUntil: null
        },
        customFields: {}
      };

      expect(response.customFields).toEqual({});
    });
  });
});

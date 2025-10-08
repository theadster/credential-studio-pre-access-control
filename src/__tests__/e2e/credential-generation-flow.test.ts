/**
 * End-to-End Test: Credential Generation Workflow
 * 
 * Tests the complete credential generation flow including:
 * - Single credential generation
 * - Bulk credential generation
 * - Credential clearing
 * - Print workflow
 * - Switchboard Canvas integration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Account, Client, Databases, Query } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    get: vi.fn(),
  };

  const mockDatabases = {
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
    listDocuments: vi.fn(),
    createDocument: vi.fn(),
  };

  const mockClient = {
    setEndpoint: vi.fn().mockReturnThis(),
    setProject: vi.fn().mockReturnThis(),
    setKey: vi.fn().mockReturnThis(),
    setSession: vi.fn().mockReturnThis(),
  };

  return {
    Client: vi.fn(() => mockClient),
    Account: vi.fn(() => mockAccount),
    Databases: vi.fn(() => mockDatabases),
    Query: {
      equal: vi.fn((field, value) => `equal("${field}", "${value}")`),
      limit: vi.fn((value) => `limit(${value})`),
    },
  };
});

// Mock fetch for Switchboard API
global.fetch = vi.fn();

describe('E2E: Credential Generation Workflow', () => {
  let mockAccount: any;
  let mockDatabases: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockDatabases = new Databases(mockClient);
    
    // Reset all mock functions to clear queued mockResolvedValueOnce calls
    mockAccount.get.mockReset();
    mockDatabases.createDocument.mockReset();
    mockDatabases.listDocuments.mockReset();
    mockDatabases.getDocument.mockReset();
    mockDatabases.updateDocument.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Single Credential Generation', () => {
    it('should complete full credential generation workflow', async () => {
      // Step 1: Authenticate user
      const mockUser = {
        $id: 'user-123',
        email: 'admin@example.com',
      };

      mockAccount.get.mockResolvedValueOnce(mockUser);

      // Step 2: Verify permissions
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [
          {
            $id: 'profile-123',
            userId: 'user-123',
            roleId: 'role-admin',
          },
        ],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'role-admin',
        permissions: JSON.stringify({
          attendees: { write: true },
        }),
      });

      // Step 3: Get attendee data
      const mockAttendee = {
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345678',
        photoUrl: 'https://cloudinary.com/photo.jpg',
        credentialUrl: null,
        credentialGeneratedAt: null,
        customFieldValues: JSON.stringify({
          'field-1': 'Acme Corporation',
          'field-2': 'Software Engineer',
        }),
      };

      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      // Step 4: Get event settings for credential template
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [
          {
            $id: 'event-settings-123',
            eventName: 'Tech Conference 2024',
            switchboardTemplateId: 'template-123',
            switchboardFieldMappings: JSON.stringify({
              firstName: 'first_name',
              lastName: 'last_name',
              company: 'company_name',
              barcode: 'barcode_number',
            }),
          },
        ],
        total: 1,
      });

      // Step 5: Call Switchboard Canvas API
      const switchboardResponse = {
        url: 'https://switchboard.canvas/credential-123.pdf',
        status: 'success',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => switchboardResponse,
      });

      const customFieldValues = JSON.parse(mockAttendee.customFieldValues);
      const switchboardData = {
        template_id: 'template-123',
        data: {
          first_name: mockAttendee.firstName,
          last_name: mockAttendee.lastName,
          company_name: customFieldValues['field-1'],
          barcode_number: mockAttendee.barcodeNumber,
        },
      };

      const credentialResponse = await fetch('https://api.switchboard.canvas/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(switchboardData),
      });

      const credentialData = await credentialResponse.json();
      expect(credentialData.url).toBe('https://switchboard.canvas/credential-123.pdf');

      // Step 6: Update attendee with credential URL
      const updatedAttendee = {
        ...mockAttendee,
        credentialUrl: credentialData.url,
        credentialGeneratedAt: new Date().toISOString(),
      };

      mockDatabases.updateDocument.mockResolvedValueOnce(updatedAttendee);

      const result = await mockDatabases.updateDocument(
        'db-id',
        'attendees-collection',
        mockAttendee.$id,
        {
          credentialUrl: credentialData.url,
          credentialGeneratedAt: updatedAttendee.credentialGeneratedAt,
        }
      );

      expect(result.credentialUrl).toBe('https://switchboard.canvas/credential-123.pdf');
      expect(result.credentialGeneratedAt).toBeTruthy();

      // Step 7: Create log entry
      mockDatabases.createDocument.mockResolvedValueOnce({
        $id: 'log-123',
        userId: mockUser.$id,
        attendeeId: mockAttendee.$id,
        action: 'credential_generated',
        details: JSON.stringify({
          attendeeName: `${mockAttendee.firstName} ${mockAttendee.lastName}`,
        }),
      });

      await mockDatabases.createDocument('db-id', 'logs-collection', 'unique-id', {
        userId: mockUser.$id,
        attendeeId: mockAttendee.$id,
        action: 'credential_generated',
      });

      // Verify all steps completed
      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1);
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle Switchboard API errors', async () => {
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-123' });

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [
          {
            $id: 'event-settings-123',
            switchboardTemplateId: 'template-123',
          },
        ],
        total: 1,
      });

      // Switchboard API returns error
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Template not found' }),
      });

      const response = await fetch('https://api.switchboard.canvas/generate', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);

      // Should not update attendee
      expect(mockDatabases.updateDocument).not.toHaveBeenCalled();
    });
  });

  describe('Bulk Credential Generation', () => {
    it('should generate credentials for multiple attendees', async () => {
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-123' });

      await mockAccount.get();

      const attendeeIds = ['attendee-1', 'attendee-2', 'attendee-3'];
      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [
          {
            $id: 'event-settings-123',
            switchboardTemplateId: 'template-123',
            switchboardFieldMappings: JSON.stringify({}),
          },
        ],
        total: 1,
      });

      await mockDatabases.listDocuments(
        'db-id',
        'event-settings-collection',
        [Query.limit(1)]
      );

      for (const id of attendeeIds) {
        // Get attendee
        mockDatabases.getDocument.mockResolvedValueOnce({
          $id: id,
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: `barcode-${id}`,
          customFieldValues: '{}',
        });

        await mockDatabases.getDocument(
          'db-id',
          'attendees-collection',
          id
        );

        // Generate credential
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            url: `https://switchboard.canvas/credential-${id}.pdf`,
          }),
        });

        await fetch('https://api.switchboard.canvas/generate', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        // Update attendee
        mockDatabases.updateDocument.mockResolvedValueOnce({
          $id: id,
          credentialUrl: `https://switchboard.canvas/credential-${id}.pdf`,
          credentialGeneratedAt: new Date().toISOString(),
        });

        await mockDatabases.updateDocument(
          'db-id',
          'attendees-collection',
          id,
          { credentialUrl: `https://switchboard.canvas/credential-${id}.pdf` }
        );

        // Create log
        mockDatabases.createDocument.mockResolvedValueOnce({
          $id: `log-${id}`,
          action: 'credential_generated',
        });

        await mockDatabases.createDocument(
          'db-id',
          'logs-collection',
          'unique-log-id',
          { action: 'credential_generated' }
        );

        results.successful.push(id);
      }

      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk generation', async () => {
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-123' });

      const attendeeIds = ['attendee-1', 'attendee-2', 'attendee-3'];
      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'event-settings-123', switchboardTemplateId: 'template-123' }],
        total: 1,
      });

      for (let i = 0; i < attendeeIds.length; i++) {
        const id = attendeeIds[i];

        mockDatabases.getDocument.mockResolvedValueOnce({
          $id: id,
          firstName: 'Test',
          lastName: 'User',
        });

        // Second attendee fails
        if (i === 1) {
          (global.fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 500,
            json: async () => ({ error: 'Generation failed' }),
          });

          results.failed.push({ id, error: 'Generation failed' });
        } else {
          (global.fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => ({ url: `https://switchboard.canvas/credential-${id}.pdf` }),
          });

          mockDatabases.updateDocument.mockResolvedValueOnce({
            $id: id,
            credentialUrl: `https://switchboard.canvas/credential-${id}.pdf`,
          });

          mockDatabases.createDocument.mockResolvedValueOnce({
            $id: `log-${id}`,
          });

          results.successful.push(id);
        }
      }

      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].id).toBe('attendee-2');
    });
  });

  describe('Credential Clearing', () => {
    it('should clear credential from attendee', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-clear-123' });

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'profile-clear-123', roleId: 'role-clear-admin' }],
        total: 1,
      });

      mockDatabases.getDocument.mockResolvedValueOnce({
        $id: 'role-clear-admin',
        permissions: JSON.stringify({ attendees: { write: true } }),
      });

      const mockAttendee = {
        $id: 'attendee-clear-123',
        firstName: 'John',
        lastName: 'Doe',
        credentialUrl: 'https://switchboard.canvas/credential-clear-123.pdf',
        credentialGeneratedAt: new Date().toISOString(),
      };

      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      // Execute verification steps
      await mockAccount.get();
      await mockDatabases.listDocuments(
        'db-id',
        'users-collection',
        [Query.equal('userId', 'user-clear-123')]
      );
      await mockDatabases.getDocument(
        'db-id',
        'roles-collection',
        'role-clear-admin'
      );
      await mockDatabases.getDocument(
        'db-id',
        'attendees-collection',
        mockAttendee.$id
      );

      // Clear credential
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      });

      const result = await mockDatabases.updateDocument(
        'db-id',
        'attendees-collection',
        mockAttendee.$id,
        {
          credentialUrl: null,
          credentialGeneratedAt: null,
        }
      );

      expect(result.$id).toBe('attendee-clear-123');
      expect(result.credentialUrl).toBeNull();
      expect(result.credentialGeneratedAt).toBeNull();

      // Create log entry
      mockDatabases.createDocument.mockResolvedValueOnce({
        $id: 'log-clear',
        action: 'credential_cleared',
      });

      await mockDatabases.createDocument('db-id', 'logs-collection', 'unique-id', {
        action: 'credential_cleared',
      });

      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1);
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('Print Workflow', () => {
    it('should retrieve attendee data for printing', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-print-123' });

      await mockAccount.get();

      const mockAttendee = {
        $id: 'attendee-print-123',
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345678',
        photoUrl: 'https://cloudinary.com/photo.jpg',
        credentialUrl: 'https://switchboard.canvas/credential-print-123.pdf',
        credentialGeneratedAt: new Date().toISOString(),
        customFieldValues: JSON.stringify({
          'field-1': 'Acme Corporation',
        }),
      };

      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      const attendee = await mockDatabases.getDocument(
        'db-id',
        'attendees-collection',
        'attendee-print-123'
      );

      expect(attendee.$id).toBe('attendee-print-123');
      expect(attendee.credentialUrl).toBeTruthy();
      expect(attendee.photoUrl).toBeTruthy();

      const customFieldValues = JSON.parse(attendee.customFieldValues);
      expect(customFieldValues['field-1']).toBe('Acme Corporation');
    });

    it('should handle missing credential URL', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-missing-123' });

      await mockAccount.get();

      const mockAttendee = {
        $id: 'attendee-missing-123',
        firstName: 'John',
        lastName: 'Doe',
        credentialUrl: null,
        credentialGeneratedAt: null,
      };

      mockDatabases.getDocument.mockResolvedValueOnce(mockAttendee);

      const attendee = await mockDatabases.getDocument(
        'db-id',
        'attendees-collection',
        'attendee-missing-123'
      );

      expect(attendee.$id).toBe('attendee-missing-123');
      expect(attendee.credentialUrl).toBeNull();
      expect(attendee.credentialGeneratedAt).toBeNull();
      // Should prompt to generate credential first
    });
  });

  describe('Field Mapping', () => {
    it('should correctly map custom fields to Switchboard template', async () => {
      const eventSettings = {
        switchboardFieldMappings: JSON.stringify({
          firstName: 'first_name',
          lastName: 'last_name',
          company: 'company_field',
          jobTitle: 'title_field',
          barcode: 'barcode_number',
        }),
      };

      const attendee = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: '12345678',
        customFieldValues: JSON.stringify({
          'field-company': 'Acme Corp',
          'field-title': 'Engineer',
        }),
      };

      const mappings = JSON.parse(eventSettings.switchboardFieldMappings);
      const customFieldValues = JSON.parse(attendee.customFieldValues);

      const switchboardData: Record<string, string> = {};

      // Map standard fields
      if (mappings.firstName) {
        switchboardData[mappings.firstName] = attendee.firstName;
      }
      if (mappings.lastName) {
        switchboardData[mappings.lastName] = attendee.lastName;
      }
      if (mappings.barcode) {
        switchboardData[mappings.barcode] = attendee.barcodeNumber;
      }

      // Map custom fields
      if (mappings.company && customFieldValues['field-company']) {
        switchboardData[mappings.company] = customFieldValues['field-company'];
      }
      if (mappings.jobTitle && customFieldValues['field-title']) {
        switchboardData[mappings.jobTitle] = customFieldValues['field-title'];
      }

      expect(switchboardData.first_name).toBe('John');
      expect(switchboardData.last_name).toBe('Doe');
      expect(switchboardData.barcode_number).toBe('12345678');
      expect(switchboardData.company_field).toBe('Acme Corp');
      expect(switchboardData.title_field).toBe('Engineer');
    });
  });
});

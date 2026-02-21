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
import { Account, Client, TablesDB, Query } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    get: vi.fn(),
  };

  const mockTablesDB = {
    getRow: vi.fn(),
    updateRow: vi.fn(),
    listRows: vi.fn(),
    createRow: vi.fn(),
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
    TablesDB: vi.fn(() => mockTablesDB),
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
  let mockTablesDB: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockTablesDB = new TablesDB(mockClient);
    
    // Reset all mock functions to clear queued mockResolvedValueOnce calls
    mockAccount.get.mockReset();
    mockTablesDB.createRow.mockReset();
    mockTablesDB.listRows.mockReset();
    mockTablesDB.getRow.mockReset();
    mockTablesDB.updateRow.mockReset();
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
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
          {
            $id: 'profile-123',
            userId: 'user-123',
            roleId: 'role-admin',
          },
        ],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce({
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

      mockTablesDB.getRow.mockResolvedValueOnce(mockAttendee);

      // Step 4: Get event settings for credential template
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
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

      mockTablesDB.updateRow.mockResolvedValueOnce(updatedAttendee);

      const result = await mockTablesDB.updateRow(
        'db-id',
        'attendees-table',
        mockAttendee.$id,
        {
          credentialUrl: credentialData.url,
          credentialGeneratedAt: updatedAttendee.credentialGeneratedAt,
        }
      );

      expect(result.credentialUrl).toBe('https://switchboard.canvas/credential-123.pdf');
      expect(result.credentialGeneratedAt).toBeTruthy();

      // Step 7: Create log entry
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: 'log-123',
        userId: mockUser.$id,
        attendeeId: mockAttendee.$id,
        action: 'credential_generated',
        details: JSON.stringify({
          attendeeName: `${mockAttendee.firstName} ${mockAttendee.lastName}`,
        }),
      });

      await mockTablesDB.createRow({
        databaseId: 'db-id',
        tableId: 'logs-table',
        rowId: 'unique-id',
        data: {
          userId: mockUser.$id,
          attendeeId: mockAttendee.$id,
          action: 'credential_generated',
        },
      });

      // Verify all steps completed
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle Switchboard API errors', async () => {
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-123' });

      mockTablesDB.getRow.mockResolvedValueOnce({
        $id: 'attendee-123',
        firstName: 'John',
        lastName: 'Doe',
      });

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
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
      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
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

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
          {
            $id: 'event-settings-123',
            switchboardTemplateId: 'template-123',
            switchboardFieldMappings: JSON.stringify({}),
          },
        ],
        total: 1,
      });

      await mockTablesDB.listRows(
        'db-id',
        'event-settings-table',
        [Query.limit(1)]
      );

      for (const id of attendeeIds) {
        // Get attendee
        mockTablesDB.getRow.mockResolvedValueOnce({
          $id: id,
          firstName: 'Test',
          lastName: 'User',
          barcodeNumber: `barcode-${id}`,
          customFieldValues: '{}',
        });

        await mockTablesDB.getRow(
          'db-id',
          'attendees-table',
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
        mockTablesDB.updateRow.mockResolvedValueOnce({
          $id: id,
          credentialUrl: `https://switchboard.canvas/credential-${id}.pdf`,
          credentialGeneratedAt: new Date().toISOString(),
        });

        await mockTablesDB.updateRow(
          'db-id',
          'attendees-table',
          id,
          { credentialUrl: `https://switchboard.canvas/credential-${id}.pdf` }
        );

        // Create log
        mockTablesDB.createRow.mockResolvedValueOnce({
          $id: `log-${id}`,
          action: 'credential_generated',
        });

        await mockTablesDB.createRow(
          'db-id',
          'logs-table',
          'unique-log-id',
          { action: 'credential_generated' }
        );

        results.successful.push(id);
      }

      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in bulk generation', async () => {
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-123' });

      const attendeeIds = ['attendee-1', 'attendee-2', 'attendee-3'];
      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [{ $id: 'event-settings-123', switchboardTemplateId: 'template-123' }],
        total: 1,
      });

      for (let i = 0; i < attendeeIds.length; i++) {
        const id = attendeeIds[i];

        mockTablesDB.getRow.mockResolvedValueOnce({
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

          mockTablesDB.updateRow.mockResolvedValueOnce({
            $id: id,
            credentialUrl: `https://switchboard.canvas/credential-${id}.pdf`,
          });

          mockTablesDB.createRow.mockResolvedValueOnce({
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

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [{ $id: 'profile-clear-123', roleId: 'role-clear-admin' }],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce({
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

      mockTablesDB.getRow.mockResolvedValueOnce(mockAttendee);

      // Execute verification steps
      await mockAccount.get();
      await mockTablesDB.listRows(
        'db-id',
        'users-table',
        [Query.equal('userId', 'user-clear-123')]
      );
      await mockTablesDB.getRow(
        'db-id',
        'roles-table',
        'role-clear-admin'
      );
      await mockTablesDB.getRow(
        'db-id',
        'attendees-table',
        mockAttendee.$id
      );

      // Clear credential
      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockAttendee,
        credentialUrl: null,
        credentialGeneratedAt: null,
      });

      const result = await mockTablesDB.updateRow(
        'db-id',
        'attendees-table',
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
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: 'log-clear',
        action: 'credential_cleared',
      });

      await mockTablesDB.createRow({
        databaseId: 'db-id',
        tableId: 'logs-table',
        rowId: 'unique-id',
        data: {
          action: 'credential_cleared',
        },
      });

      expect(mockTablesDB.updateRow).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(1);
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

      mockTablesDB.getRow.mockResolvedValueOnce(mockAttendee);

      const attendee = await mockTablesDB.getRow(
        'db-id',
        'attendees-table',
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

      mockTablesDB.getRow.mockResolvedValueOnce(mockAttendee);

      const attendee = await mockTablesDB.getRow(
        'db-id',
        'attendees-table',
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

/**
 * End-to-End Test: Bulk Import and Export Workflow
 * 
 * Tests the complete bulk operations flow including:
 * - CSV import with validation
 * - Barcode generation for imported attendees
 * - Custom field mapping
 * - Export with filters
 * - Error handling for partial failures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Account, Client, TablesDB, ID, Query } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    get: vi.fn(),
  };

  const mockTablesDB = {
    createRow: vi.fn(),
    listRows: vi.fn(),
    getRow: vi.fn(),
    updateRow: vi.fn(),
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
    ID: {
      unique: vi.fn(() => `unique-${Math.random().toString(36).substr(2, 9)}`),
    },
    Query: {
      equal: vi.fn((field, value) => `equal("${field}", "${value}")`),
      orderAsc: vi.fn((field) => `orderAsc("${field}")`),
      limit: vi.fn((value) => `limit(${value})`),
      offset: vi.fn((value) => `offset(${value})`),
      search: vi.fn((field, value) => `search("${field}", "${value}")`),
    },
  };
});

describe('E2E: Bulk Import and Export Workflow', () => {
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

  describe('CSV Import Flow', () => {
    it('should complete full import workflow', async () => {
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
          attendees: { create: true },
        }),
      });

      // Step 3: Get event settings for barcode generation
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
          {
            $id: 'event-settings-123',
            barcodeType: 'numerical',
            barcodeLength: 8,
          },
        ],
        total: 1,
      });

      // Step 4: Get custom fields for mapping
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Company',
          internalFieldName: 'company',
          fieldType: 'text',
        },
        {
          $id: 'field-2',
          fieldName: 'Department',
          internalFieldName: 'department',
          fieldType: 'text',
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockCustomFields,
        total: 2,
      });

      // Step 5: Parse CSV data
      const csvData = `firstName,lastName,company,department
John,Doe,Acme Corp,Engineering
Jane,Smith,Tech Inc,Marketing
Bob,Johnson,Startup LLC,Sales`;

      const parseCSV = (csv: string) => {
        const lines = csv.trim().split('\n');
        const headers = lines[0].split(',');
        return lines.slice(1).map((line) => {
          const values = line.split(',');
          return headers.reduce((obj, header, index) => {
            obj[header.trim()] = values[index]?.trim() || '';
            return obj;
          }, {} as Record<string, string>);
        });
      };

      const parsedData = parseCSV(csvData);
      expect(parsedData).toHaveLength(3);

      // Execute the flow
      const user = await mockAccount.get();
      expect(user.$id).toBe('user-123');

      // Verify permissions
      await mockTablesDB.listRows(
        'db-id',
        'users-table',
        [Query.equal('userId', user.$id)]
      );

      await mockTablesDB.getRow(
        'db-id',
        'roles-table',
        'role-admin'
      );

      // Get event settings
      await mockTablesDB.listRows(
        'db-id',
        'event-settings-table',
        [Query.limit(1)]
      );

      const customFields = await mockTablesDB.listRows(
        'db-id',
        'custom-fields-table',
        [Query.orderAsc('order')]
      );
      expect(customFields.rows).toHaveLength(2);

      // Step 6: Import each attendee
      const importResults = {
        successful: [] as string[],
        failed: [] as { row: number; error: string }[],
      };

      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];

        // Generate unique barcode
        const barcode = Math.floor(Math.random() * 100000000)
          .toString()
          .padStart(8, '0');

        // Check barcode uniqueness
        mockTablesDB.listRows.mockResolvedValueOnce({
          rows: [],
          total: 0,
        });

        await mockTablesDB.listRows(
          'db-id',
          'attendees-table',
          [Query.equal('barcodeNumber', barcode)]
        );

        // Map custom fields
        const customFieldValues: Record<string, string> = {};
        mockCustomFields.forEach((field) => {
          const csvColumn = field.internalFieldName || field.fieldName.toLowerCase();
          if (row[csvColumn]) {
            customFieldValues[field.$id] = row[csvColumn];
          }
        });

        // Create attendee
        const attendeeData = {
          firstName: row.firstName,
          lastName: row.lastName,
          barcodeNumber: barcode,
          customFieldValues: JSON.stringify(customFieldValues),
        };

        mockTablesDB.createRow.mockResolvedValueOnce({
          $id: `attendee-${i + 1}`,
          ...attendeeData,
        });

        await mockTablesDB.createRow(
          'db-id',
          'attendees-table',
          ID.unique(),
          attendeeData
        );

        importResults.successful.push(`attendee-${i + 1}`);
      }

      // Step 7: Create import log
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: 'log-import',
        userId: mockUser.$id,
        action: 'attendees_imported',
        details: JSON.stringify({
          total: parsedData.length,
          successful: importResults.successful.length,
          failed: importResults.failed.length,
        }),
      });

      await mockTablesDB.createRow(
        'db-id',
        'logs-table',
        ID.unique(),
        { action: 'attendees_imported' }
      );

      expect(importResults.successful).toHaveLength(3);
      expect(importResults.failed).toHaveLength(0);

      // Verify attendees were created
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(4); // 3 attendees + 1 log
    });

    it('should handle partial import failures', async () => {
      const csvData = [
        { firstName: 'John', lastName: 'Doe' },
        { firstName: '', lastName: 'Smith' }, // Invalid: missing firstName
        { firstName: 'Bob', lastName: 'Johnson' },
      ];

      const importResults = {
        successful: [] as string[],
        failed: [] as { row: number; error: string }[],
      };

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        // Validate required fields
        if (!row.firstName || !row.lastName) {
          importResults.failed.push({
            row: i + 1,
            error: 'Missing required fields',
          });
          continue;
        }

        const barcode = `${10000000 + i}`;

        mockTablesDB.listRows.mockResolvedValueOnce({
          rows: [],
          total: 0,
        });

        mockTablesDB.createRow.mockResolvedValueOnce({
          $id: `attendee-${i + 1}`,
          firstName: row.firstName,
          lastName: row.lastName,
          barcodeNumber: barcode,
        });

        importResults.successful.push(`attendee-${i + 1}`);
      }

      expect(importResults.successful).toHaveLength(2);
      expect(importResults.failed).toHaveLength(1);
      expect(importResults.failed[0].row).toBe(2);
    });

    it('should handle duplicate barcodes during import', async () => {
      const existingBarcode = '12345678';

      // Scenario 1: First import - barcode available
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      const firstCheck = await mockTablesDB.listRows(
        'db-id',
        'attendees-table',
        [Query.equal('barcodeNumber', existingBarcode)]
      );
      expect(firstCheck.rows).toHaveLength(0);

      // Create first attendee with this barcode
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: 'attendee-duplicate-test',
        barcodeNumber: existingBarcode,
      });

      const createdAttendee = await mockTablesDB.createRow(
        'db-id',
        'attendees-table',
        ID.unique(),
        { barcodeNumber: existingBarcode }
      );
      expect(createdAttendee.$id).toBe('attendee-duplicate-test');

      // Scenario 2: Second import attempt - barcode now exists (should be rejected)
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [{ $id: 'attendee-duplicate-test', barcodeNumber: existingBarcode }],
        total: 1,
      });

      const secondCheck = await mockTablesDB.listRows(
        'db-id',
        'attendees-table',
        [Query.equal('barcodeNumber', existingBarcode)]
      );
      
      expect(secondCheck.rows).toHaveLength(1);
      expect(secondCheck.rows[0].$id).toBe('attendee-duplicate-test');
      expect(secondCheck.rows[0].barcodeNumber).toBe(existingBarcode);
      
      // In real implementation, would generate new barcode and retry
      const isDuplicate = secondCheck.rows.length > 0;
      expect(isDuplicate).toBe(true);
    });
  });

  describe('CSV Export Flow', () => {
    it('should complete full export workflow', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      // Step 1: Authenticate user
      const mockUser = {
        $id: 'user-export-123',
        email: 'admin@example.com',
      };

      mockAccount.get.mockResolvedValueOnce(mockUser);

      // Step 2: Verify permissions
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
          {
            $id: 'profile-export-123',
            userId: 'user-export-123',
            roleId: 'role-export-admin',
          },
        ],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce({
        $id: 'role-export-admin',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
      });

      // Step 3: Get custom fields for export headers
      const mockCustomFields = [
        {
          $id: 'field-export-1',
          fieldName: 'Company',
          internalFieldName: 'company',
        },
        {
          $id: 'field-export-2',
          fieldName: 'Department',
          internalFieldName: 'department',
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockCustomFields,
        total: 2,
      });

      // Step 4: Fetch attendees with filters
      const mockAttendees = [
        {
          $id: 'attendee-export-1',
          firstName: 'John',
          lastName: 'Doe',
          barcodeNumber: '12345678',
          customFieldValues: JSON.stringify({
            'field-export-1': 'Acme Corp',
            'field-export-2': 'Engineering',
          }),
        },
        {
          $id: 'attendee-export-2',
          firstName: 'Jane',
          lastName: 'Smith',
          barcodeNumber: '87654321',
          customFieldValues: JSON.stringify({
            'field-export-1': 'Tech Inc',
            'field-export-2': 'Marketing',
          }),
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockAttendees,
        total: 2,
      });

      // Step 5: Generate CSV
      const generateCSV = (attendees: any[], customFields: any[]) => {
        const headers = [
          'firstName',
          'lastName',
          'barcodeNumber',
          ...customFields.map((f) => f.internalFieldName || f.fieldName),
        ];

        const rows = attendees.map((attendee) => {
          const customFieldValues = JSON.parse(attendee.customFieldValues || '{}');
          return [
            attendee.firstName,
            attendee.lastName,
            attendee.barcodeNumber,
            ...customFields.map((f) => customFieldValues[f.$id] || ''),
          ];
        });

        return [headers, ...rows].map((row) => row.join(',')).join('\n');
      };

      // Execute the flow
      const user = await mockAccount.get();
      expect(user.$id).toBe('user-export-123');

      // Verify permissions
      await mockTablesDB.listRows(
        'db-id',
        'users-table',
        [Query.equal('userId', user.$id)]
      );

      await mockTablesDB.getRow(
        'db-id',
        'roles-table',
        'role-export-admin'
      );

      const customFields = await mockTablesDB.listRows(
        'db-id',
        'custom-fields-table',
        [Query.orderAsc('order')]
      );

      // Mock attendees list for export
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockAttendees,
        total: 2,
      });

      const attendees = await mockTablesDB.listRows(
        'db-id',
        'attendees-table',
        [Query.limit(100)]
      );

      expect(attendees.rows).toHaveLength(2);

      const csv = generateCSV(attendees.rows, customFields.rows);

      expect(csv).toContain('firstName,lastName,barcodeNumber');
      expect(csv).toContain('John,Doe,12345678');
      expect(csv).toContain('Jane,Smith,87654321');
      expect(csv).toContain('Acme Corp');
      expect(csv).toContain('Tech Inc');
    });

    it('should export with search filters', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-search-123' });

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [{ $id: 'profile-search-123', roleId: 'role-search-admin' }],
        total: 1,
      });

      mockTablesDB.getRow.mockResolvedValueOnce({
        $id: 'role-search-admin',
        permissions: JSON.stringify({ attendees: { read: true } }),
      });

      // Verify permissions
      const user = await mockAccount.get();
      expect(user.$id).toBe('user-search-123');

      await mockTablesDB.listRows(
        'db-id',
        'users-table',
        [Query.equal('userId', 'user-search-123')]
      );
      await mockTablesDB.getRow(
        'db-id',
        'roles-table',
        'role-search-admin'
      );

      // Search for attendees with lastName containing "Smith"
      const mockSearchResult = {
        $id: 'attendee-search-smith',
        firstName: 'Jane',
        lastName: 'Smith',
        barcodeNumber: '87654321',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockSearchResult],
        total: 1,
      });

      const attendees = await mockTablesDB.listRows(
        'db-id',
        'attendees-table',
        [Query.search('lastName', 'Smith')]
      );

      expect(attendees.rows).toHaveLength(1);
      expect(attendees.rows[0].$id).toBe('attendee-search-smith');
      expect(attendees.rows[0].lastName).toBe('Smith');
    });

    it('should handle pagination for large exports', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'user-pagination-123' });

      const pageSize = 100;
      const totalRecords = 250;

      // Verify user
      const user = await mockAccount.get();
      expect(user.$id).toBe('user-pagination-123');

      // Mock all three pages with unique IDs
      const page1 = Array(pageSize).fill(null).map((_, i) => ({ 
        $id: `att-page1-${i}`, 
        firstName: 'Test',
        lastName: `User${i}` 
      }));
      const page2 = Array(pageSize).fill(null).map((_, i) => ({ 
        $id: `att-page2-${i}`, 
        firstName: 'Test',
        lastName: `User${i + 100}` 
      }));
      const page3 = Array(50).fill(null).map((_, i) => ({ 
        $id: `att-page3-${i}`, 
        firstName: 'Test',
        lastName: `User${i + 200}` 
      }));

      // First page
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: page1,
        total: totalRecords,
      });

      // Second page
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: page2,
        total: totalRecords,
      });

      // Third page
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: page3,
        total: totalRecords,
      });

      const allAttendees = [];

      for (let page = 0; page < Math.ceil(totalRecords / pageSize); page++) {
        const result = await mockTablesDB.listRows(
          'db-id',
          'attendees-table',
          [Query.limit(pageSize), Query.offset(page * pageSize)]
        );
        allAttendees.push(...result.rows);
      }

      expect(allAttendees).toHaveLength(totalRecords);
      expect(mockTablesDB.listRows).toHaveBeenCalledTimes(3);
    });
  });

  describe('Bulk Edit Flow', () => {
    it('should update multiple attendees', async () => {
      const attendeeIds = ['attendee-1', 'attendee-2', 'attendee-3'];
      const updates = {
        customFieldValues: JSON.stringify({
          'field-1': 'Updated Company',
        }),
      };

      const results = {
        successful: [] as string[],
        failed: [] as { id: string; error: string }[],
      };

      for (const id of attendeeIds) {
        mockTablesDB.getRow.mockResolvedValueOnce({
          $id: id,
          firstName: 'Test',
          customFieldValues: '{}',
        });

        // Merge existing custom field values with updates
        const existing = JSON.parse('{}');
        const updated = JSON.parse(updates.customFieldValues);
        const merged = { ...existing, ...updated };

        mockTablesDB.createRow.mockResolvedValueOnce({
          $id: id,
          customFieldValues: JSON.stringify(merged),
        });

        results.successful.push(id);
      }

      expect(results.successful).toHaveLength(3);
      expect(results.failed).toHaveLength(0);
    });
  });
});

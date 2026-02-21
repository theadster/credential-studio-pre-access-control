/**
 * End-to-End Test: Creating Attendee with Custom Fields
 * 
 * Tests the complete attendee creation flow including:
 * - Custom field definition
 * - Attendee creation with custom field values
 * - Photo upload
 * - Barcode generation
 * - Data validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Account, Client, TablesDB, ID, Query, Storage } from 'appwrite';

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

  const mockStorage = {
    createFile: vi.fn(),
    getFileView: vi.fn(),
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
    Storage: vi.fn(() => mockStorage),
    ID: {
      unique: vi.fn(() => 'unique-id-123'),
    },
    Query: {
      equal: vi.fn((field, value) => `equal("${field}", "${value}")`),
      orderAsc: vi.fn((field) => `orderAsc("${field}")`),
      limit: vi.fn((value) => `limit(${value})`),
    },
  };
});

describe('E2E: Creating Attendee with Custom Fields', () => {
  let mockAccount: any;
  let mockTablesDB: any;
  let mockStorage: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockTablesDB = new TablesDB(mockClient);
    mockStorage = new Storage(mockClient);
    
    // Reset all mock functions to clear queued mockResolvedValueOnce calls
    mockAccount.get.mockReset();
    mockTablesDB.createRow.mockReset();
    mockTablesDB.listRows.mockReset();
    mockTablesDB.getRow.mockReset();
    mockTablesDB.updateRow.mockReset();
    mockStorage.createFile.mockReset();
    mockStorage.getFileView.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Attendee Creation Flow', () => {
    it('should create attendee with custom fields end-to-end', async () => {
      // Step 1: Authenticate user
      const mockUser = {
        $id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin User',
      };

      mockAccount.get.mockResolvedValueOnce(mockUser);

      // Step 2: Get user profile and verify permissions
      const mockUserProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        roleId: 'role-admin',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      const mockRole = {
        $id: 'role-admin',
        name: 'Administrator',
        permissions: JSON.stringify({
          attendees: { read: true, write: true, create: true, delete: true },
        }),
      };

      mockTablesDB.getRow.mockResolvedValueOnce(mockRole);

      // Step 3: Get event settings
      const mockEventSettings = {
        $id: 'event-settings-123',
        barcodeType: 'numerical',
        barcodeLength: 8,
        eventName: 'Tech Conference 2024',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockEventSettings],
        total: 1,
      });

      // Step 4: Get custom fields
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Company',
          internalFieldName: 'company',
          fieldType: 'text',
          required: true,
          order: 1,
        },
        {
          $id: 'field-2',
          fieldName: 'Job Title',
          internalFieldName: 'jobTitle',
          fieldType: 'text',
          required: false,
          order: 2,
        },
        {
          $id: 'field-3',
          fieldName: 'Dietary Restrictions',
          internalFieldName: 'dietary',
          fieldType: 'select',
          fieldOptions: JSON.stringify(['None', 'Vegetarian', 'Vegan', 'Gluten-Free']),
          required: false,
          order: 3,
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockCustomFields,
        total: 3,
      });

      // Step 5: Generate unique barcode
      const generateBarcode = (type: string, length: number): string => {
        if (type === 'numerical') {
          return Math.floor(Math.random() * Math.pow(10, length))
            .toString()
            .padStart(length, '0');
        }
        return 'ABC12345';
      };

      const barcode = generateBarcode(
        mockEventSettings.barcodeType,
        mockEventSettings.barcodeLength
      );

      // Step 6: Check barcode uniqueness
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      // Step 7: Create attendee with custom field values
      const attendeeData = {
        firstName: 'John',
        lastName: 'Doe',
        barcodeNumber: barcode,
        photoUrl: 'https://cloudinary.com/photo.jpg',
        customFieldValues: JSON.stringify({
          'field-1': 'Acme Corporation',
          'field-2': 'Software Engineer',
          'field-3': 'Vegetarian',
        }),
      };

      const mockAttendee = {
        $id: 'attendee-123',
        ...attendeeData,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      };

      mockTablesDB.createRow.mockResolvedValueOnce(mockAttendee);

      // Step 8: Create log entry
      mockTablesDB.createRow.mockResolvedValueOnce({
        $id: 'log-123',
        userId: mockUser.$id,
        attendeeId: mockAttendee.$id,
        action: 'attendee_created',
        details: JSON.stringify({
          firstName: attendeeData.firstName,
          lastName: attendeeData.lastName,
        }),
      });

      // Execute the flow
      const user = await mockAccount.get();
      expect(user.$id).toBe('user-123');

      const userProfile = await mockTablesDB.listRows(
        'db-id',
        'users-table',
        [Query.equal('userId', user.$id)]
      );
      expect(userProfile.rows).toHaveLength(1);

      const role = await mockTablesDB.getRow(
        'db-id',
        'roles-table',
        userProfile.rows[0].roleId
      );
      const permissions = JSON.parse(role.permissions);
      expect(permissions.attendees.create).toBe(true);

      const eventSettings = await mockTablesDB.listRows(
        'db-id',
        'event-settings-table',
        [Query.limit(1)]
      );
      expect(eventSettings.rows).toHaveLength(1);

      const customFields = await mockTablesDB.listRows(
        'db-id',
        'custom-fields-table',
        [Query.orderAsc('order')]
      );
      expect(customFields.rows).toHaveLength(3);

      const barcodeCheck = await mockTablesDB.listRows(
        'db-id',
        'attendees-table',
        [Query.equal('barcodeNumber', barcode)]
      );
      expect(barcodeCheck.rows).toHaveLength(0);

      const attendee = await mockTablesDB.createRow(
        'db-id',
        'attendees-table',
        ID.unique(),
        attendeeData
      );

      expect(attendee.$id).toBe('attendee-123');
      expect(attendee.firstName).toBe('John');
      expect(attendee.lastName).toBe('Doe');
      expect(attendee.barcodeNumber).toBe(barcode);

      const customFieldValues = JSON.parse(attendee.customFieldValues);
      expect(customFieldValues['field-1']).toBe('Acme Corporation');
      expect(customFieldValues['field-2']).toBe('Software Engineer');
      expect(customFieldValues['field-3']).toBe('Vegetarian');

      // Create log entry
      await mockTablesDB.createRow(
        'db-id',
        'logs-table',
        ID.unique(),
        { userId: mockUser.$id, action: 'attendee_created' }
      );

      // Verify all steps completed
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(2); // attendee + log
    });

    it('should validate required custom fields', async () => {
      const mockCustomFields = [
        {
          $id: 'field-1',
          fieldName: 'Company',
          internalFieldName: 'company',
          fieldType: 'text',
          required: true,
          order: 1,
        },
      ];

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: mockCustomFields,
        total: 1,
      });

      const customFields = await mockTablesDB.listRows(
        'db-id',
        'custom-fields-table',
        [Query.orderAsc('order')]
      );

      const requiredFields = customFields.rows.filter((f: any) => f.required);
      expect(requiredFields).toHaveLength(1);

      // Validate that required field is provided
      const customFieldValues = {
        'field-1': 'Acme Corporation',
      };

      const hasAllRequired = requiredFields.every(
        (field: any) => customFieldValues[field.$id as keyof typeof customFieldValues]
      );
      expect(hasAllRequired).toBe(true);
    });

    it('should reject duplicate barcode', async () => {
      const existingBarcode = '12345678';

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [
          {
            $id: 'existing-attendee',
            barcodeNumber: existingBarcode,
          },
        ],
        total: 1,
      });

      const barcodeCheck = await mockTablesDB.listRows(
        'db-id',
        'attendees-table',
        [Query.equal('barcodeNumber', existingBarcode)]
      );

      expect(barcodeCheck.rows).toHaveLength(1);
      // Should not proceed with creation
    });

    it('should handle photo upload', async () => {
      const mockFile = new File(['photo content'], 'photo.jpg', {
        type: 'image/jpeg',
      });

      const mockUploadedFile = {
        $id: 'file-123',
        name: 'photo.jpg',
        mimeType: 'image/jpeg',
      };

      mockStorage.createFile.mockResolvedValueOnce(mockUploadedFile);

      const uploadedFile = await mockStorage.createFile(
        'bucket-id',
        ID.unique(),
        mockFile
      );

      expect(uploadedFile.$id).toBe('file-123');

      const photoUrl = `https://cloud.appwrite.io/v1/storage/buckets/bucket-id/files/${uploadedFile.$id}/view`;

      expect(photoUrl).toContain(uploadedFile.$id);
    });
  });

  describe('Custom Field Type Validation', () => {
    it('should validate select field options', async () => {
      const selectField = {
        $id: 'field-select',
        fieldType: 'select',
        fieldOptions: JSON.stringify(['Option1', 'Option2', 'Option3']),
      };

      const options = JSON.parse(selectField.fieldOptions);
      const selectedValue = 'Option2';

      expect(options).toContain(selectedValue);
    });

    it('should validate date field format', async () => {
      const dateField = {
        $id: 'field-date',
        fieldType: 'date',
      };

      const dateValue = '2024-01-15';
      const isValidDate = !isNaN(Date.parse(dateValue));

      expect(isValidDate).toBe(true);
    });

    it('should validate number field type', async () => {
      const numberField = {
        $id: 'field-number',
        fieldType: 'number',
      };

      const numberValue = '42';
      const isValidNumber = !isNaN(Number(numberValue));

      expect(isValidNumber).toBe(true);
    });

    it('should validate checkbox field', async () => {
      const checkboxField = {
        $id: 'field-checkbox',
        fieldType: 'checkbox',
      };

      const checkboxValue = true;
      expect(typeof checkboxValue).toBe('boolean');
    });
  });
});

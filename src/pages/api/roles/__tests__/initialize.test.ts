import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../initialize';
import { mockAccount, mockDatabases, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    databases: mockDatabases,
  })),
}));

describe('/api/roles/initialize - Role Initialization API', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'POST',
      cookies: { 'appwrite-session': 'test-session' },
      body: {},
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValue(authError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unauthorized',
          code: 401,
          tokenExpired: true,
        })
      );
    });
  });

  describe('POST /api/roles/initialize', () => {
    it('should create default roles successfully', async () => {
      // Mock empty roles collection
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      // Mock role creation
      const mockCreatedRoles = [
        {
          $id: 'role-super-admin',
          name: 'Super Administrator',
          description: 'Full system access with all permissions including user management and system configuration',
          permissions: JSON.stringify({
            attendees: { create: true, read: true, update: true, delete: true, print: true, export: true, import: true, bulkEdit: true, bulkDelete: true, bulkGenerateCredentials: true, bulkGeneratePDFs: true },
            users: { create: true, read: true, update: true, delete: true },
            roles: { create: true, read: true, update: true, delete: true },
            eventSettings: { create: true, read: true, update: true, delete: true },
            customFields: { create: true, read: true, update: true, delete: true },
            logs: { read: true, delete: true, export: true, configure: true },
            system: { configure: true, backup: true, restore: true }
          }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'role-event-manager',
          name: 'Event Manager',
          description: 'Full event management access including attendees, settings, and printing',
          permissions: JSON.stringify({
            attendees: { create: true, read: true, update: true, delete: true, print: true, export: true, import: true, bulkEdit: true, bulkDelete: true, bulkGenerateCredentials: true, bulkGeneratePDFs: true },
            users: { read: true },
            roles: { read: true },
            eventSettings: { create: true, read: true, update: true, delete: false },
            customFields: { create: true, read: true, update: true, delete: true },
            logs: { read: true, export: true, configure: false },
            system: { configure: false, backup: false, restore: false }
          }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'role-registration-staff',
          name: 'Registration Staff',
          description: 'Attendee management and credential printing access',
          permissions: JSON.stringify({
            attendees: { create: true, read: true, update: true, delete: false, print: true, export: false, import: false, bulkEdit: false, bulkDelete: false, bulkGenerateCredentials: true, bulkGeneratePDFs: true },
            users: { read: false },
            roles: { read: false },
            eventSettings: { create: false, read: true, update: false, delete: false },
            customFields: { create: false, read: true, update: false, delete: false },
            logs: { read: false, export: false, configure: false },
            system: { configure: false, backup: false, restore: false }
          }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          $id: 'role-viewer',
          name: 'Viewer',
          description: 'Read-only access to attendee information',
          permissions: JSON.stringify({
            attendees: { create: false, read: true, update: false, delete: false, print: false, export: false, import: false, bulkEdit: false, bulkDelete: false, bulkGenerateCredentials: false, bulkGeneratePDFs: false },
            users: { read: false },
            roles: { read: false },
            eventSettings: { create: false, read: true, update: false, delete: false },
            customFields: { create: false, read: true, update: false, delete: false },
            logs: { read: false, export: false, configure: false },
            system: { configure: false, backup: false, restore: false }
          }),
          $createdAt: '2024-01-01T00:00:00.000Z',
          $updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ];

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockCreatedRoles[0])
        .mockResolvedValueOnce(mockCreatedRoles[1])
        .mockResolvedValueOnce(mockCreatedRoles[2])
        .mockResolvedValueOnce(mockCreatedRoles[3])
        .mockResolvedValueOnce({ $id: 'log-123' }); // Log creation

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify all 4 roles were created
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(5); // 4 roles + 1 log

      // Verify Super Administrator role
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          name: 'Super Administrator',
          description: expect.stringContaining('Full system access'),
        })
      );

      // Verify Event Manager role
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          name: 'Event Manager',
          description: expect.stringContaining('event management'),
        })
      );

      // Verify Registration Staff role
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          name: 'Registration Staff',
          description: expect.stringContaining('Attendee management'),
        })
      );

      // Verify Viewer role
      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          name: 'Viewer',
          description: expect.stringContaining('Read-only'),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Roles initialized successfully',
        roles: mockCreatedRoles,
      });
    });

    it('should return 400 if roles already exist', async () => {
      // Mock existing roles
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [{ $id: 'existing-role', name: 'Existing Role' }],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Roles already initialized' });
      expect(mockDatabases.createDocument).not.toHaveBeenCalled();
    });

    it('should create log entry for initialization', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      const mockCreatedRoles = [
        { $id: 'role-1', name: 'Super Administrator' },
        { $id: 'role-2', name: 'Event Manager' },
        { $id: 'role-3', name: 'Registration Staff' },
        { $id: 'role-4', name: 'Viewer' },
      ];

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockCreatedRoles[0])
        .mockResolvedValueOnce(mockCreatedRoles[1])
        .mockResolvedValueOnce(mockCreatedRoles[2])
        .mockResolvedValueOnce(mockCreatedRoles[3])
        .mockResolvedValueOnce({ $id: 'log-123' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockDatabases.createDocument).toHaveBeenCalledWith(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID,
        expect.any(String),
        expect.objectContaining({
          userId: mockAuthUser.$id,
          action: 'create',
          details: expect.stringContaining('roles_initialization'),
        })
      );
    });

    it('should continue even if logging fails', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      const mockCreatedRoles = [
        { $id: 'role-1', name: 'Super Administrator' },
        { $id: 'role-2', name: 'Event Manager' },
        { $id: 'role-3', name: 'Registration Staff' },
        { $id: 'role-4', name: 'Viewer' },
      ];

      mockDatabases.createDocument
        .mockResolvedValueOnce(mockCreatedRoles[0])
        .mockResolvedValueOnce(mockCreatedRoles[1])
        .mockResolvedValueOnce(mockCreatedRoles[2])
        .mockResolvedValueOnce(mockCreatedRoles[3])
        .mockRejectedValueOnce(new Error('Logging failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Roles initialized successfully',
        })
      );
    });

    it('should serialize permissions as JSON strings', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      mockDatabases.createDocument
        .mockResolvedValue({ $id: 'role-123', name: 'Test Role' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Check that permissions are stringified
      const createCalls = mockDatabases.createDocument.mock.calls.filter(
        call => call[1] === process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID
      );

      createCalls.forEach(call => {
        const roleData = call[3];
        expect(typeof roleData.permissions).toBe('string');
        // Verify it's valid JSON
        expect(() => JSON.parse(roleData.permissions)).not.toThrow();
      });
    });

    it('should create roles with correct permission structures', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      mockDatabases.createDocument
        .mockResolvedValue({ $id: 'role-123', name: 'Test Role' });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Verify Super Administrator has all permissions
      const superAdminCall = mockDatabases.createDocument.mock.calls.find(
        call => call[3]?.name === 'Super Administrator'
      );
      expect(superAdminCall).toBeDefined();
      const superAdminPerms = JSON.parse(superAdminCall![3].permissions);
      expect(superAdminPerms.users.create).toBe(true);
      expect(superAdminPerms.users.read).toBe(true);
      expect(superAdminPerms.users.update).toBe(true);
      expect(superAdminPerms.users.delete).toBe(true);
      expect(superAdminPerms.roles.create).toBe(true);
      expect(superAdminPerms.system.configure).toBe(true);

      // Verify Viewer has limited permissions
      const viewerCall = mockDatabases.createDocument.mock.calls.find(
        call => call[3]?.name === 'Viewer'
      );
      expect(viewerCall).toBeDefined();
      const viewerPerms = JSON.parse(viewerCall![3].permissions);
      expect(viewerPerms.attendees.read).toBe(true);
      expect(viewerPerms.attendees.create).toBe(false);
      expect(viewerPerms.attendees.update).toBe(false);
      expect(viewerPerms.attendees.delete).toBe(false);
      expect(viewerPerms.users.read).toBe(false);
    });
  });

  describe('Method Not Allowed', () => {
    it('should return 405 for GET method', async () => {
      mockReq.method = 'GET';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method GET not allowed' });
    });

    it('should return 405 for PUT method', async () => {
      mockReq.method = 'PUT';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method PUT not allowed' });
    });

    it('should return 405 for DELETE method', async () => {
      mockReq.method = 'DELETE';

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Allow', ['POST']);
      expect(statusMock).toHaveBeenCalledWith(405);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Method DELETE not allowed' });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDatabases.listDocuments.mockRejectedValueOnce(new Error('Database error'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });

    it('should handle role creation errors', async () => {
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      mockDatabases.createDocument.mockRejectedValueOnce(new Error('Creation failed'));

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('error'),
          code: 500,
          type: 'internal_error',
        })
      );
    });
  });
});

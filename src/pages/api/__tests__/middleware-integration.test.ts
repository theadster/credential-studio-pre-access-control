/**
 * Integration tests for API routes using withAuth middleware
 * Verifies that critical routes properly use authentication middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import { Models } from 'node-appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

// Mock the permissions module
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}));

// Mock the logSettings module
vi.mock('@/lib/logSettings', () => ({
  shouldLog: vi.fn(() => Promise.resolve(false)),
}));

import { createSessionClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';

describe('API Routes with withAuth Middleware', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let mockAccount: any;
  let mockDatabases: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockReq = {
      method: 'GET',
      headers: {},
      cookies: {
        'appwrite-session': 'mock-jwt-token',
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    mockAccount = {
      get: vi.fn(),
    };

    mockDatabases = {
      listDocuments: vi.fn(),
      getDocument: vi.fn(),
      createDocument: vi.fn(),
      updateDocument: vi.fn(),
      deleteDocument: vi.fn(),
    };

    (createSessionClient as any).mockReturnValue({
      account: mockAccount,
      databases: mockDatabases,
    });
  });

  describe('Profile Route', () => {
    it('should return user profile when authenticated', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role123',
        name: 'Admin',
        description: 'Administrator role',
        permissions: JSON.stringify({ all: true }),
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      mockDatabases.getDocument.mockResolvedValue(mockRole);

      const profileHandler = await import('@/pages/api/profile/index');
      await profileHandler.default(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          email: 'test@example.com',
          name: 'Test User',
          role: expect.objectContaining({
            name: 'Admin',
          }),
        })
      );
    });

    it('should return 401 when not authenticated', async () => {
      mockAccount.get.mockRejectedValue({
        code: 401,
        type: 'user_jwt_invalid',
        message: 'Invalid JWT token',
      });

      const profileHandler = await import('@/pages/api/profile/index');
      await profileHandler.default(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenExpired: true,
        })
      );
    });
  });

  describe('Users Route', () => {
    it('should check permissions before listing users', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role123',
        name: 'Viewer',
        description: 'Viewer role',
        permissions: JSON.stringify({ users: { read: false } }),
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      mockDatabases.getDocument.mockResolvedValue(mockRole);
      (hasPermission as any).mockReturnValue(false);

      const usersHandler = await import('@/pages/api/users/index');
      await usersHandler.default(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Insufficient permissions'),
        })
      );
    });
  });

  describe('Roles Route', () => {
    it('should return roles list when authenticated', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role123',
        name: 'Admin',
        description: 'Administrator role',
        permissions: JSON.stringify({ all: true }),
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockDatabases.listDocuments
        .mockResolvedValueOnce({
          documents: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          documents: [mockRole],
          total: 1,
        })
        .mockResolvedValueOnce({
          documents: [],
          total: 0,
        });
      mockDatabases.getDocument.mockResolvedValue(mockRole);
      mockDatabases.createDocument.mockResolvedValue({
        $id: 'log123',
        userId: 'user123',
        action: 'view',
        details: JSON.stringify({ type: 'roles_list', count: 1 }),
      });

      const rolesHandler = await import('@/pages/api/roles/index');
      await rolesHandler.default(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Admin',
            permissions: { all: true },
          }),
        ])
      );
    });
  });

  describe('Attendees Route', () => {
    it('should check read permissions before listing attendees', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        roleId: 'role123',
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockRole = {
        $id: 'role123',
        name: 'Viewer',
        description: 'Viewer role',
        permissions: JSON.stringify({ attendees: { read: false } }),
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockDatabases.listDocuments.mockResolvedValue({
        documents: [mockUserProfile],
        total: 1,
      });
      mockDatabases.getDocument.mockResolvedValue(mockRole);

      const attendeesHandler = await import('@/pages/api/attendees/index');
      await attendeesHandler.default(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Insufficient permissions'),
        })
      );
    });
  });

  describe('Logs Route', () => {
    it('should return logs when authenticated', async () => {
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const mockUserProfile = {
        $id: 'profile123',
        userId: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        roleId: null,
        isInvited: false,
        $createdAt: '2024-01-01T00:00:00.000Z',
        $updatedAt: '2024-01-01T00:00:00.000Z',
      };

      const mockLog = {
        $id: 'log123',
        userId: 'user123',
        attendeeId: null,
        action: 'view',
        details: JSON.stringify({ type: 'test' }),
        $createdAt: '2024-01-01T00:00:00.000Z',
      };

      mockAccount.get.mockResolvedValue(mockUser);
      mockDatabases.listDocuments
        .mockResolvedValueOnce({
          documents: [mockUserProfile],
          total: 1,
        })
        .mockResolvedValueOnce({
          documents: [mockLog],
          total: 1,
        })
        .mockResolvedValueOnce({
          documents: [mockUserProfile],
          total: 1,
        });

      // Add query parameters that the logs route expects
      mockReq.query = {
        page: '1',
        limit: '50',
      };

      const logsHandler = await import('@/pages/api/logs/index');
      await logsHandler.default(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          logs: expect.arrayContaining([
            expect.objectContaining({
              action: 'view',
            }),
          ]),
        })
      );
    });
  });
});

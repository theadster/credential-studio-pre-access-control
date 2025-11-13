import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../index';
import { mockAccount, mockDatabases, mockUsers, resetAllMocks } from '@/test/mocks/appwrite';

vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({ account: mockAccount, databases: mockDatabases })),
  createAdminClient: vi.fn(() => ({ users: mockUsers, databases: mockDatabases })),
}));

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn((role: any, resource: string, action: string) => {
    if (!role) return false;
    const permissions = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
    return permissions?.[resource]?.[action] === true;
  }),
}));

vi.mock('@/lib/logSettings', () => ({ shouldLog: vi.fn(() => Promise.resolve(true)) }));
vi.mock('@/lib/rateLimiter', () => ({ checkRateLimit: vi.fn(() => Promise.resolve({ allowed: true, remaining: 10 })) }));

describe('User Management Permissions', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    resetAllMocks();
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    mockRes = { status: statusMock as any, json: jsonMock, setHeader: vi.fn() };
  });

  it('should return 403 when user lacks users.read permission', async () => {
    mockReq = { method: 'GET', headers: {} };
    mockAccount.get.mockResolvedValue({ $id: 'user123', email: 'viewer@test.com' });
    mockDatabases.listDocuments.mockResolvedValueOnce({
      documents: [{ $id: 'profile123', userId: 'user123', email: 'viewer@test.com', roleId: 'role123' }],
    });
    mockDatabases.getDocument.mockResolvedValueOnce({
      $id: 'role123', name: 'Viewer', permissions: { users: { read: false } },
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(403);
  });

  it('should return 403 when user lacks users.create permission', async () => {
    mockReq = { method: 'POST', headers: {}, body: { authUserId: 'auth123' } };
    mockAccount.get.mockResolvedValue({ $id: 'user123', email: 'staff@test.com' });
    mockDatabases.listDocuments.mockResolvedValueOnce({
      documents: [{ $id: 'profile123', userId: 'user123', roleId: 'staffRole' }],
    });
    mockDatabases.getDocument.mockResolvedValueOnce({
      $id: 'staffRole', name: 'Staff', permissions: { users: { create: false } },
    });

    await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

    expect(statusMock).toHaveBeenCalledWith(403);
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextApiRequest, NextApiResponse } from 'next';
import searchHandler from '../search';

// Mock dependencies
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn(),
}));

vi.mock('@/lib/apiMiddleware', () => ({
  withAuth: (handler: any) => handler,
}));

import { createAdminClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';

describe('POST /api/users/search', () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-1',
    email: 'test@example.com',
    name: 'Test User',
    $createdAt: '2024-01-01T00:00:00.000Z',
    emailVerification: true,
    phoneVerification: false,
  };

  const mockLinkedUser = {
    userId: 'auth-user-2',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    req = {
      method: 'POST',
      body: {},
      cookies: { 'appwrite-session': 'mock-jwt' },
    };

    res = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default: user has permission
    vi.mocked(hasPermission).mockReturnValue(true);
  });

  it('should return 405 for non-POST requests', async () => {
    req.method = 'GET';

    await searchHandler(req as any, res as any);

    expect(statusMock).toHaveBeenCalledWith(405);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Method GET not allowed',
    });
  });

  it('should return 403 if user lacks users.read permission', async () => {
    vi.mocked(hasPermission).mockReturnValue(false);

    req.userProfile = {
      role: { permissions: {} },
    } as any;

    await searchHandler(req as any, res as any);

    expect(statusMock).toHaveBeenCalledWith(403);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Insufficient permissions to search users',
      code: 'PERMISSION_DENIED',
    });
  });

  it('should search auth users and return with link status', async () => {
    const mockUsers = vi.fn().mockResolvedValue({
      users: [mockAuthUser],
      total: 1,
    });

    const mockDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [mockLinkedUser],
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: { list: mockUsers },
      databases: mockDatabases,
    } as any);

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    req.body = {
      q: 'test',
      page: 1,
      limit: 25,
    };

    await searchHandler(req as any, res as any);

    expect(mockUsers).toHaveBeenCalled();
    expect(mockDatabases.listDocuments).toHaveBeenCalled();
    expect(statusMock).toHaveBeenCalledWith(200);
    expect(jsonMock).toHaveBeenCalledWith({
      users: [
        {
          $id: 'auth-user-1',
          email: 'test@example.com',
          name: 'Test User',
          $createdAt: '2024-01-01T00:00:00.000Z',
          emailVerification: true,
          phoneVerification: false,
          isLinked: false, // auth-user-1 is not in linked users
        },
      ],
      pagination: {
        page: 1,
        limit: 25,
        total: 1,
        totalPages: 1,
      },
    });
  });

  it('should mark linked users correctly', async () => {
    const mockUsers = vi.fn().mockResolvedValue({
      users: [
        { ...mockAuthUser, $id: 'auth-user-2' }, // This one is linked
      ],
      total: 1,
    });

    const mockDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [{ userId: 'auth-user-2' }],
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: { list: mockUsers },
      databases: mockDatabases,
    } as any);

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    await searchHandler(req as any, res as any);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        users: expect.arrayContaining([
          expect.objectContaining({
            $id: 'auth-user-2',
            isLinked: true,
          }),
        ]),
      })
    );
  });

  it('should handle pagination correctly', async () => {
    const mockUsers = vi.fn().mockResolvedValue({
      users: [mockAuthUser],
      total: 50,
    });

    const mockDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [],
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: { list: mockUsers },
      databases: mockDatabases,
    } as any);

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    req.body = {
      page: 2,
      limit: 25,
    };

    await searchHandler(req as any, res as any);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: {
          page: 2,
          limit: 25,
          total: 50,
          totalPages: 2,
        },
      })
    );
  });

  it('should use default pagination values', async () => {
    const mockUsers = vi.fn().mockResolvedValue({
      users: [],
      total: 0,
    });

    const mockDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [],
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: { list: mockUsers },
      databases: mockDatabases,
    } as any);

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    req.body = {}; // No pagination params

    await searchHandler(req as any, res as any);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({
          page: 1,
          limit: 25,
        }),
      })
    );
  });

  it('should handle search query parameter', async () => {
    const mockUsers = vi.fn().mockResolvedValue({
      users: [],
      total: 0,
    });

    const mockDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [],
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: { list: mockUsers },
      databases: mockDatabases,
    } as any);

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    req.body = {
      q: 'john@example.com',
    };

    await searchHandler(req as any, res as any);

    // Verify search query was passed to users.list
    expect(mockUsers).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining('john@example.com'),
      ])
    );
  });

  it('should handle errors gracefully', async () => {
    vi.mocked(createAdminClient).mockImplementation(() => {
      throw new Error('API connection failed');
    });

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    await searchHandler(req as any, res as any);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'An unexpected error occurred. Please try again.',
        code: 'INTERNAL_ERROR',
      })
    );
  });

  it('should cap limit at 100', async () => {
    const mockUsers = vi.fn().mockResolvedValue({
      users: [],
      total: 0,
    });

    const mockDatabases = {
      listDocuments: vi.fn().mockResolvedValue({
        documents: [],
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      users: { list: mockUsers },
      databases: mockDatabases,
    } as any);

    req.userProfile = {
      role: { permissions: { users: { read: true } } },
    } as any;

    req.body = {
      limit: 500, // Try to request 500
    };

    await searchHandler(req as any, res as any);

    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({
          limit: 100, // Should be capped at 100
        }),
      })
    );
  });
});

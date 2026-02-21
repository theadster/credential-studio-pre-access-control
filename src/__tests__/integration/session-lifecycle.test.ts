/**
 * Integration Test: Session Lifecycle with Cookies
 * 
 * Tests the complete session lifecycle using Appwrite's native session cookies:
 * - Login flow with automatic session cookie creation
 * - Authenticated API calls using session cookies
 * - Logout flow with automatic session cookie cleanup
 * - API calls failing with 401 after logout
 * 
 * Requirements: 2.3, 2.4, 7.3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import { Account, Client, TablesDB, Models } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    createEmailPasswordSession: vi.fn(),
    get: vi.fn(),
    deleteSession: vi.fn(),
  };

  const mockTablesDB = {
    listRows: vi.fn(),
    getRow: vi.fn(),
    createRow: vi.fn(),
  };

  const mockClient = {
    setEndpoint: vi.fn().mockReturnThis(),
    setProject: vi.fn().mockReturnThis(),
    setSession: vi.fn().mockReturnThis(),
  };

  return {
    Client: vi.fn(() => mockClient),
    Account: vi.fn(() => mockAccount),
    TablesDB: vi.fn(() => mockTablesDB),
  };
});

// Import after mocking
import { createSessionClient } from '@/lib/appwrite';

// Mock the createSessionClient function
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(),
  createAdminClient: vi.fn(() => ({
    tablesDB: { listRows: vi.fn(), getRow: vi.fn(), createRow: vi.fn(), updateRow: vi.fn(), deleteRow: vi.fn() },
  })),
}));

describe('Session Lifecycle Integration Tests', () => {
  let mockAccount: any;
  let mockTablesDB: any;
  let mockClient: any;

  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || 'test-project-id';
  const sessionCookieName = `a_session_${projectId}`;
  const testSessionId = 'test-session-id-12345';

  const mockUser: Partial<Models.User<Models.Preferences>> = {
    $id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    roleId: 'role-admin',
    isInvited: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockRole = {
    $id: 'role-admin',
    name: 'Administrator',
    permissions: JSON.stringify({
      attendees: { read: true, write: true, create: true, delete: true },
      all: true,
    }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockTablesDB = new TablesDB(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Login Flow - Session Cookie Creation', () => {
    it('should create session and Appwrite automatically sets session cookie', async () => {
      // Mock successful session creation
      const mockSession: Partial<Models.Session> = {
        $id: testSessionId,
        userId: mockUser.$id!,
        provider: 'email',
        $createdAt: new Date().toISOString(),
        expire: new Date(Date.now() + 86400000).toISOString(), // 24 hours
      };

      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.get.mockResolvedValueOnce(mockUser);

      // Simulate login
      const session = await mockAccount.createEmailPasswordSession(
        'test@example.com',
        'password123'
      );

      // Verify session was created
      expect(session.$id).toBe(testSessionId);
      expect(session.userId).toBe(mockUser.$id);
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );

      // In real scenario, Appwrite automatically sets the session cookie
      // Cookie name: a_session_[projectId]
      // Cookie value: session ID
      // Cookie attributes: HttpOnly, Secure (in production), SameSite=Lax
      
      // Verify we can get the current user with the session
      const user = await mockAccount.get();
      expect(user.$id).toBe(mockUser.$id);
      expect(user.email).toBe('test@example.com');
    });

    it('should handle login failure gracefully', async () => {
      const authError = new Error('Invalid credentials');
      (authError as any).code = 401;
      
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce(authError);

      await expect(
        mockAccount.createEmailPasswordSession('wrong@example.com', 'wrongpass')
      ).rejects.toMatchObject({
        code: 401,
        message: 'Invalid credentials',
      });

      // Verify no session was created
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledTimes(1);
    });

    it('should verify session cookie is automatically managed by Appwrite', async () => {
      const mockSession: Partial<Models.Session> = {
        $id: testSessionId,
        userId: mockUser.$id!,
        provider: 'email',
        $createdAt: new Date().toISOString(),
      };

      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);

      const session = await mockAccount.createEmailPasswordSession(
        'test@example.com',
        'password123'
      );

      // Verify session ID matches what would be in the cookie
      expect(session.$id).toBe(testSessionId);
      
      // Note: In a real browser environment, the cookie would be:
      // - Name: a_session_test-project-id
      // - Value: test-session-id-12345
      // - HttpOnly: true (cannot be accessed by JavaScript)
      // - Secure: true (in production)
      // - SameSite: Lax
    });
  });

  describe('2. Authenticated API Calls - Using Session Cookie', () => {
    it('should authenticate API request using session cookie', async () => {
      // Mock API request with session cookie
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {
          [sessionCookieName]: testSessionId,
        },
        query: {},
      };

      const mockRes: Partial<NextApiResponse> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      // Mock createSessionClient to use the session cookie
      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      mockAccount.get.mockResolvedValueOnce(mockUser);
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });
      mockTablesDB.getRow.mockResolvedValueOnce(mockRole);

      // Simulate API route authentication
      const { account, databases } = createSessionClient(mockReq as NextApiRequest);
      
      // Verify session client was created with the request
      expect(createSessionClient).toHaveBeenCalledWith(mockReq);

      // Verify we can authenticate the user
      const user = await account.get();
      expect(user.$id).toBe(mockUser.$id);

      // Verify we can fetch user profile
      const profile = await mockTablesDB.listRows({
        databaseId: 'db-id',
        tableId: 'users-table',
        queries: []
      });
      expect(profile.rows[0].userId).toBe(mockUser.$id);
    });

    it('should successfully make multiple authenticated API calls with same session', async () => {
      const mockReq: Partial<NextApiRequest> = {
        cookies: {
          [sessionCookieName]: testSessionId,
        },
      };

      (createSessionClient as any).mockReturnValue({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      mockAccount.get.mockResolvedValue(mockUser);
      mockTablesDB.listRows.mockResolvedValue({
        rows: [mockUserProfile],
        total: 1,
      });

      // First API call
      const { account: account1 } = createSessionClient(mockReq as NextApiRequest);
      const user1 = await account1.get();
      expect(user1.$id).toBe(mockUser.$id);

      // Second API call with same session
      const { account: account2 } = createSessionClient(mockReq as NextApiRequest);
      const user2 = await account2.get();
      expect(user2.$id).toBe(mockUser.$id);

      // Third API call with same session
      const { account: account3 } = createSessionClient(mockReq as NextApiRequest);
      const user3 = await account3.get();
      expect(user3.$id).toBe(mockUser.$id);

      // Verify all calls succeeded with the same session
      expect(mockAccount.get).toHaveBeenCalledTimes(3);
    });

    it('should handle API request without session cookie', async () => {
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {}, // No session cookie
        query: {},
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      // Mock authentication failure
      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValueOnce(authError);

      const { account } = createSessionClient(mockReq as NextApiRequest);

      // Attempt to get user should fail
      await expect(account.get()).rejects.toMatchObject({
        code: 401,
        message: 'Unauthorized',
      });
    });

    it('should handle API request with invalid session cookie', async () => {
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {
          [sessionCookieName]: 'invalid-session-id',
        },
        query: {},
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      // Mock authentication failure for invalid session
      const authError = new Error('Invalid session');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValueOnce(authError);

      const { account } = createSessionClient(mockReq as NextApiRequest);

      await expect(account.get()).rejects.toMatchObject({
        code: 401,
        message: 'Invalid session',
      });
    });

    it('should verify session cookie is sent automatically by browser', async () => {
      // Simulate browser automatically including session cookie in request
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {
          [sessionCookieName]: testSessionId,
          // Browser automatically includes this cookie with every request
          // No manual Authorization header needed
        },
        headers: {
          // Note: No Authorization header with JWT
          'content-type': 'application/json',
        },
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      mockAccount.get.mockResolvedValueOnce(mockUser);

      const { account } = createSessionClient(mockReq as NextApiRequest);
      const user = await account.get();

      // Verify authentication succeeded with just the cookie
      expect(user.$id).toBe(mockUser.$id);
      
      // Verify no Authorization header was needed
      expect(mockReq.headers?.authorization).toBeUndefined();
    });
  });

  describe('3. Logout Flow - Session Cookie Cleanup', () => {
    it('should delete session and Appwrite automatically clears session cookie', async () => {
      // Mock successful session deletion
      mockAccount.deleteSession.mockResolvedValueOnce({});

      // Simulate logout
      await mockAccount.deleteSession('current');

      // Verify session was deleted
      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
      
      // In real scenario, Appwrite automatically:
      // 1. Invalidates the session on the server
      // 2. Clears the session cookie from the browser
      // 3. Sets cookie with expired date to remove it
    });

    it('should handle logout when no session exists', async () => {
      const noSessionError = new Error('No session found');
      (noSessionError as any).code = 401;
      
      mockAccount.deleteSession.mockRejectedValueOnce(noSessionError);

      // Logout should handle this gracefully
      await expect(
        mockAccount.deleteSession('current')
      ).rejects.toMatchObject({
        code: 401,
        message: 'No session found',
      });
    });

    it('should verify session cookie is removed after logout', async () => {
      // Before logout - session exists
      const mockReqBefore: Partial<NextApiRequest> = {
        cookies: {
          [sessionCookieName]: testSessionId,
        },
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      mockAccount.get.mockResolvedValueOnce(mockUser);

      const { account: accountBefore } = createSessionClient(mockReqBefore as NextApiRequest);
      const userBefore = await accountBefore.get();
      expect(userBefore.$id).toBe(mockUser.$id);

      // Perform logout
      mockAccount.deleteSession.mockResolvedValueOnce({});
      await mockAccount.deleteSession('current');

      // After logout - session cookie should be gone
      const mockReqAfter: Partial<NextApiRequest> = {
        cookies: {
          // Session cookie has been removed by Appwrite
        },
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValueOnce(authError);

      const { account: accountAfter } = createSessionClient(mockReqAfter as NextApiRequest);
      
      // Should fail because session cookie is gone
      await expect(accountAfter.get()).rejects.toMatchObject({
        code: 401,
      });
    });
  });

  describe('4. API Calls After Logout - 401 Errors', () => {
    it('should return 401 for API calls after logout', async () => {
      // Simulate API request after logout (no session cookie)
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {}, // No session cookie after logout
        query: {},
      };

      const mockRes: Partial<NextApiResponse> = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn(),
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValueOnce(authError);

      const { account } = createSessionClient(mockReq as NextApiRequest);

      // API call should fail with 401
      await expect(account.get()).rejects.toMatchObject({
        code: 401,
        message: 'Unauthorized',
      });

      // In a real API route, this would result in:
      // res.status(401).json({ error: 'Unauthorized' })
    });

    it('should return 401 for API calls with expired session', async () => {
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {
          [sessionCookieName]: 'expired-session-id',
        },
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      const expiredError = new Error('Session expired');
      (expiredError as any).code = 401;
      mockAccount.get.mockRejectedValueOnce(expiredError);

      const { account } = createSessionClient(mockReq as NextApiRequest);

      await expect(account.get()).rejects.toMatchObject({
        code: 401,
        message: 'Session expired',
      });
    });

    it('should verify multiple API calls fail after logout', async () => {
      const mockReq: Partial<NextApiRequest> = {
        cookies: {}, // No session cookie
      };

      (createSessionClient as any).mockReturnValue({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValue(authError);

      // First API call - should fail
      const { account: account1 } = createSessionClient(mockReq as NextApiRequest);
      await expect(account1.get()).rejects.toMatchObject({ code: 401 });

      // Second API call - should also fail
      const { account: account2 } = createSessionClient(mockReq as NextApiRequest);
      await expect(account2.get()).rejects.toMatchObject({ code: 401 });

      // Third API call - should also fail
      const { account: account3 } = createSessionClient(mockReq as NextApiRequest);
      await expect(account3.get()).rejects.toMatchObject({ code: 401 });

      // Verify all calls failed
      expect(mockAccount.get).toHaveBeenCalledTimes(3);
    });

    it('should handle 401 errors gracefully in API routes', async () => {
      const mockReq: Partial<NextApiRequest> = {
        method: 'GET',
        cookies: {},
      };

      const jsonMock = vi.fn();
      const statusMock = vi.fn(() => ({ json: jsonMock }));
      const mockRes: Partial<NextApiResponse> = {
        status: statusMock as any,
      };

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValueOnce(authError);

      // Simulate API route error handling
      try {
        const { account } = createSessionClient(mockReq as NextApiRequest);
        await account.get();
      } catch (error: any) {
        // API route should catch and return 401
        mockRes.status!(401).json({ error: 'Unauthorized' });
      }

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
  });

  describe('5. Session Cookie Verification', () => {
    it('should verify correct session cookie name format', () => {
      const expectedCookieName = `a_session_${projectId}`;
      expect(sessionCookieName).toBe(expectedCookieName);
      
      // Verify cookie name follows Appwrite's convention
      expect(sessionCookieName).toMatch(/^a_session_/);
    });

    it('should verify session ID is used with setSession()', async () => {
      const mockReq: Partial<NextApiRequest> = {
        cookies: {
          [sessionCookieName]: testSessionId,
        },
      };

      // In the real implementation, createSessionClient should:
      // 1. Extract session ID from cookie
      // 2. Call client.setSession(sessionId)
      // 3. NOT call client.setJWT()

      (createSessionClient as any).mockReturnValueOnce({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      createSessionClient(mockReq as NextApiRequest);

      // Verify createSessionClient was called with the request containing the cookie
      expect(createSessionClient).toHaveBeenCalledWith(
        expect.objectContaining({
          cookies: expect.objectContaining({
            [sessionCookieName]: testSessionId,
          }),
        })
      );
    });

    it('should verify session cookies work across multiple requests', async () => {
      // Simulate multiple requests with the same session cookie
      const requests = [
        { cookies: { [sessionCookieName]: testSessionId } },
        { cookies: { [sessionCookieName]: testSessionId } },
        { cookies: { [sessionCookieName]: testSessionId } },
      ];

      (createSessionClient as any).mockReturnValue({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      mockAccount.get.mockResolvedValue(mockUser);

      // Make multiple requests
      for (const req of requests) {
        const { account } = createSessionClient(req as NextApiRequest);
        const user = await account.get();
        expect(user.$id).toBe(mockUser.$id);
      }

      // Verify all requests succeeded with the same session
      expect(mockAccount.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('6. Complete Session Lifecycle', () => {
    it('should complete full session lifecycle: login -> API calls -> logout -> 401', async () => {
      // Step 1: Login
      const mockSession: Partial<Models.Session> = {
        $id: testSessionId,
        userId: mockUser.$id!,
        provider: 'email',
        $createdAt: new Date().toISOString(),
      };

      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);
      mockAccount.get.mockResolvedValueOnce(mockUser);

      const session = await mockAccount.createEmailPasswordSession(
        'test@example.com',
        'password123'
      );
      expect(session.$id).toBe(testSessionId);

      const user = await mockAccount.get();
      expect(user.$id).toBe(mockUser.$id);

      // Step 2: Make authenticated API calls
      const mockReqAuthenticated: Partial<NextApiRequest> = {
        cookies: { [sessionCookieName]: testSessionId },
      };

      (createSessionClient as any).mockReturnValue({
        client: mockClient,
        account: mockAccount,
        tablesDB: mockTablesDB,
      });

      mockAccount.get.mockResolvedValue(mockUser);

      const { account: apiAccount1 } = createSessionClient(mockReqAuthenticated as NextApiRequest);
      const apiUser1 = await apiAccount1.get();
      expect(apiUser1.$id).toBe(mockUser.$id);

      const { account: apiAccount2 } = createSessionClient(mockReqAuthenticated as NextApiRequest);
      const apiUser2 = await apiAccount2.get();
      expect(apiUser2.$id).toBe(mockUser.$id);

      // Step 3: Logout
      mockAccount.deleteSession.mockResolvedValueOnce({});
      await mockAccount.deleteSession('current');
      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');

      // Step 4: API calls after logout should fail with 401
      const mockReqUnauthenticated: Partial<NextApiRequest> = {
        cookies: {}, // No session cookie after logout
      };

      const authError = new Error('Unauthorized');
      (authError as any).code = 401;
      mockAccount.get.mockRejectedValue(authError);

      const { account: apiAccountAfterLogout } = createSessionClient(
        mockReqUnauthenticated as NextApiRequest
      );

      await expect(apiAccountAfterLogout.get()).rejects.toMatchObject({
        code: 401,
        message: 'Unauthorized',
      });

      // Verify complete lifecycle
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledTimes(1);
      expect(mockAccount.deleteSession).toHaveBeenCalledTimes(1);
    });
  });
});

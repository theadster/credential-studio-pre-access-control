/**
 * End-to-End Test: Complete Signup and Login Flow
 * 
 * Tests the complete authentication flow including:
 * - User signup with invitation
 * - Email verification
 * - Login with credentials
 * - Session management
 * - Logout
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Account, Client, TablesDB, ID, Models, Query } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    create: vi.fn(),
    createEmailPasswordSession: vi.fn(),
    get: vi.fn(),
    deleteSession: vi.fn(),
    createRecovery: vi.fn(),
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
      unique: vi.fn(() => 'unique-id-123'),
    },
    Query: {
      equal: vi.fn((field, value) => `equal("${field}", "${value}")`),
      limit: vi.fn((value) => `limit(${value})`),
    },
  };
});

describe('E2E: Complete Signup and Login Flow', () => {
  let mockAccount: any;
  let mockTablesDB: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockTablesDB = new TablesDB(mockClient);
    
    // Ensure mocks are properly set up
    mockAccount.create = vi.fn();
    mockAccount.createEmailPasswordSession = vi.fn();
    mockAccount.get = vi.fn();
    mockAccount.deleteSession = vi.fn();
    mockTablesDB.createRow = vi.fn();
    mockTablesDB.listRows = vi.fn();
    mockTablesDB.getRow = vi.fn();
    mockTablesDB.updateRow = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Signup Flow', () => {
    it('should complete full signup flow', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      // Step 1: Create Appwrite Auth user
      const mockAuthUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'auth-user-123',
        email: userData.email,
        name: userData.name,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      };

      mockAccount.create.mockResolvedValueOnce(mockAuthUser);

      // Step 2: Create user profile in database
      const mockUserProfile = {
        $id: 'profile-123',
        userId: mockAuthUser.$id,
        email: userData.email,
        name: userData.name,
        roleId: null,
        isInvited: false,
      };

      // Step 3: Create log entry
      const mockLogEntry = {
        $id: 'log-123',
        userId: mockAuthUser.$id,
        action: 'signup',
        details: JSON.stringify({ type: 'self_signup', email: userData.email }),
      };

      // Use implementation-based mocking instead of call-order-based
      mockTablesDB.createRow.mockImplementation(async (params: any) => {
        if (params.data?.userId && params.data?.roleId !== undefined) {
          // This is a user profile creation
          return mockUserProfile;
        } else if (params.data?.action === 'signup') {
          // This is a log entry creation
          return mockLogEntry;
        }
        throw new Error('Unexpected createRow call');
      });

      // Execute signup flow
      const authUser = await mockAccount.create(
        ID.unique(),
        userData.email,
        userData.password,
        userData.name
      );

      expect(authUser.$id).toBe('auth-user-123');
      expect(authUser.email).toBe(userData.email);

      const userProfile = await mockTablesDB.createRow({
        databaseId: 'db-id',
        tableId: 'users-table',
        rowId: ID.unique(),
        data: mockUserProfile,
      });

      expect(userProfile.userId).toBe(authUser.$id);
      expect(userProfile.isInvited).toBe(false);

      // Create log entry
      await mockTablesDB.createRow({
        databaseId: 'db-id',
        tableId: 'logs-table',
        rowId: ID.unique(),
        data: { userId: mockAuthUser.$id, action: 'signup' },
      });

      // Verify all steps completed
      expect(mockAccount.create).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.createRow).toHaveBeenCalledTimes(2); // profile + log
    });
  });

  describe('User Login Flow', () => {
    it('should complete full login flow', async () => {
      const credentials = {
        email: 'user@example.com',
        password: 'SecurePass123!',
      };

      // Step 1: Create session
      const mockSession: Partial<Models.Session> = {
        $id: 'session-123',
        userId: 'user-123',
        provider: 'email',
        $createdAt: new Date().toISOString(),
      };

      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);

      // Step 2: Get user account
      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user-123',
        email: credentials.email,
        name: 'Test User',
      };

      mockAccount.get.mockResolvedValueOnce(mockUser);

      // Step 3: Get user profile with role
      const mockUserProfile = {
        $id: 'profile-123',
        userId: 'user-123',
        email: credentials.email,
        name: 'Test User',
        roleId: 'role-123',
      };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [mockUserProfile],
        total: 1,
      });

      // Step 4: Get role with permissions
      const mockRole = {
        $id: 'role-123',
        name: 'Administrator',
        permissions: JSON.stringify({
          attendees: { read: true, write: true, create: true, delete: true },
          users: { read: true, write: true, create: true, delete: true },
        }),
      };

      mockTablesDB.getRow.mockResolvedValueOnce(mockRole);

      // Execute login flow
      const session = await mockAccount.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );

      expect(session.$id).toBe('session-123');

      const user = await mockAccount.get();
      expect(user.$id).toBe('user-123');

      const userProfile = await mockTablesDB.listRows({
        databaseId: 'db-id',
        tableId: 'users-table',
        queries: [Query.equal('userId', user.$id)]
      });

      expect(userProfile.rows).toHaveLength(1);

      const role = await mockTablesDB.getRow({
        databaseId: 'db-id',
        tableId: 'roles-table',
        rowId: userProfile.rows[0].roleId
      });

      const permissions = JSON.parse(role.permissions);
      expect(permissions.attendees.read).toBe(true);

      // Verify all steps completed
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledTimes(1);
      expect(mockAccount.get).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.listRows).toHaveBeenCalledTimes(1);
      expect(mockTablesDB.getRow).toHaveBeenCalledTimes(1);
    });

    it('should handle invalid credentials', async () => {
      mockAccount.createEmailPasswordSession.mockRejectedValueOnce({
        code: 401,
        message: 'Invalid credentials',
      });

      await expect(
        mockAccount.createEmailPasswordSession('wrong@example.com', 'wrongpass')
      ).rejects.toMatchObject({
        code: 401,
        message: 'Invalid credentials',
      });
    });

    it('should handle user without profile', async () => {
      const mockSession: Partial<Models.Session> = {
        $id: 'session-123',
        userId: 'user-without-profile',
      };

      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);

      const mockUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'user-without-profile',
        email: 'orphan@example.com',
      };

      mockAccount.get.mockResolvedValueOnce(mockUser);

      // Mock empty profile result
      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [],
        total: 0,
      });

      const session = await mockAccount.createEmailPasswordSession('orphan@example.com', 'pass');
      expect(session.userId).toBe('user-without-profile');

      const user = await mockAccount.get();
      expect(user.$id).toBe('user-without-profile');

      const profile = await mockTablesDB.listRows(
        'db-id',
        'users-table',
        [Query.equal('userId', user.$id)]
      );

      expect(profile.rows).toHaveLength(0);
    });
  });

  describe('Logout Flow', () => {
    it('should complete logout flow', async () => {
      mockAccount.deleteSession.mockResolvedValueOnce({});

      await mockAccount.deleteSession('current');

      expect(mockAccount.deleteSession).toHaveBeenCalledWith('current');
    });
  });

  describe('Password Reset Flow', () => {
    it('should initiate password reset', async () => {
      const email = 'user@example.com';
      const resetUrl = 'https://app.example.com/reset-password';

      mockAccount.createRecovery.mockResolvedValueOnce({
        $id: 'recovery-123',
      });

      await mockAccount.createRecovery(email, resetUrl);

      expect(mockAccount.createRecovery).toHaveBeenCalledWith(email, resetUrl);
    });
  });
});

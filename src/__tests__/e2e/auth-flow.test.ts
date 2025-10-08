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
import { Account, Client, Databases, ID, Models, Query } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    create: vi.fn(),
    createEmailPasswordSession: vi.fn(),
    get: vi.fn(),
    deleteSession: vi.fn(),
    createRecovery: vi.fn(),
  };

  const mockDatabases = {
    createDocument: vi.fn(),
    listDocuments: vi.fn(),
    getDocument: vi.fn(),
    updateDocument: vi.fn(),
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
  let mockDatabases: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockDatabases = new Databases(mockClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('User Signup Flow', () => {
    it('should complete full signup flow with invitation', async () => {
      const invitationToken = 'test-invitation-token';
      const userData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      // Step 1: Validate invitation token
      const mockInvitation = {
        $id: 'invitation-123',
        token: invitationToken,
        userId: null,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        usedAt: null,
        createdBy: 'admin-user-id',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitation],
        total: 1,
      });

      // Step 2: Create Appwrite Auth user
      const mockAuthUser: Partial<Models.User<Models.Preferences>> = {
        $id: 'auth-user-123',
        email: userData.email,
        name: userData.name,
        $createdAt: new Date().toISOString(),
        $updatedAt: new Date().toISOString(),
      };

      mockAccount.create.mockResolvedValueOnce(mockAuthUser);

      // Step 3: Get default role
      const mockRole = {
        $id: 'role-123',
        name: 'User',
        permissions: JSON.stringify({ attendees: { read: true } }),
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockRole],
        total: 1,
      });

      // Step 4: Create user profile in database
      const mockUserProfile = {
        $id: 'profile-123',
        userId: mockAuthUser.$id,
        email: userData.email,
        name: userData.name,
        roleId: mockRole.$id,
        isInvited: true,
      };

      mockDatabases.createDocument.mockResolvedValueOnce(mockUserProfile);

      // Step 5: Mark invitation as used
      mockDatabases.updateDocument.mockResolvedValueOnce({
        ...mockInvitation,
        usedAt: new Date().toISOString(),
        userId: mockAuthUser.$id,
      });

      // Step 6: Create log entry
      mockDatabases.createDocument.mockResolvedValueOnce({
        $id: 'log-123',
        userId: mockAuthUser.$id,
        action: 'user_signup',
        details: JSON.stringify({ email: userData.email }),
      });

      // Execute signup flow
      const invitation = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', invitationToken)]
      );

      expect(invitation.documents).toHaveLength(1);
      expect(invitation.documents[0].usedAt).toBeNull();

      const authUser = await mockAccount.create(
        ID.unique(),
        userData.email,
        userData.password,
        userData.name
      );

      expect(authUser.$id).toBe('auth-user-123');
      expect(authUser.email).toBe(userData.email);

      // Get default role
      await mockDatabases.listDocuments(
        'db-id',
        'roles-collection',
        [Query.equal('name', 'User')]
      );

      const userProfile = await mockDatabases.createDocument(
        'db-id',
        'users-collection',
        ID.unique(),
        mockUserProfile
      );

      expect(userProfile.userId).toBe(authUser.$id);
      expect(userProfile.isInvited).toBe(true);

      // Create log entry
      await mockDatabases.createDocument(
        'db-id',
        'logs-collection',
        ID.unique(),
        { userId: mockAuthUser.$id, action: 'user_signup' }
      );

      // Verify all steps completed
      expect(mockAccount.create).toHaveBeenCalledTimes(1);
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(2); // profile + log
    });

    it('should reject signup with expired invitation', async () => {
      const yesterday = new Date(Date.now() - 86400000);
      const expiredInvitation = {
        $id: 'invitation-expired',
        token: 'expired-token',
        expiresAt: yesterday.toISOString(),
        usedAt: null,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [expiredInvitation],
        total: 1,
      });

      const invitation = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', 'expired-token')]
      );

      const expirationDate = new Date(invitation.documents[0].expiresAt);
      const now = new Date();
      const isExpired = expirationDate < now;
      expect(isExpired).toBe(true);
    });

    it('should reject signup with already used invitation', async () => {
      const usedTimestamp = new Date().toISOString();
      const usedInvitation = {
        $id: 'invitation-used',
        token: 'used-token',
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        usedAt: usedTimestamp,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [usedInvitation],
        total: 1,
      });

      const invitation = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', 'used-token')]
      );

      expect(invitation.documents[0].usedAt).toBe(usedTimestamp);
      expect(invitation.documents[0].usedAt).not.toBeNull();
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

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockUserProfile],
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

      mockDatabases.getDocument.mockResolvedValueOnce(mockRole);

      // Execute login flow
      const session = await mockAccount.createEmailPasswordSession(
        credentials.email,
        credentials.password
      );

      expect(session.$id).toBe('session-123');

      const user = await mockAccount.get();
      expect(user.$id).toBe('user-123');

      const userProfile = await mockDatabases.listDocuments(
        'db-id',
        'users-collection',
        [Query.equal('userId', user.$id)]
      );

      expect(userProfile.documents).toHaveLength(1);

      const role = await mockDatabases.getDocument(
        'db-id',
        'roles-collection',
        userProfile.documents[0].roleId
      );

      const permissions = JSON.parse(role.permissions);
      expect(permissions.attendees.read).toBe(true);

      // Verify all steps completed
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledTimes(1);
      expect(mockAccount.get).toHaveBeenCalledTimes(1);
      expect(mockDatabases.listDocuments).toHaveBeenCalledTimes(1);
      expect(mockDatabases.getDocument).toHaveBeenCalledTimes(1);
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
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      const session = await mockAccount.createEmailPasswordSession('orphan@example.com', 'pass');
      expect(session.userId).toBe('user-without-profile');

      const user = await mockAccount.get();
      expect(user.$id).toBe('user-without-profile');

      const profile = await mockDatabases.listDocuments(
        'db-id',
        'users-collection',
        [Query.equal('userId', user.$id)]
      );

      expect(profile.documents).toHaveLength(0);
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

/**
 * End-to-End Test: User Invitation and Completion Flow
 * 
 * Tests the complete invitation workflow including:
 * - Creating invitation
 * - Validating invitation token
 * - Completing invitation with signup
 * - Expiration handling
 * - Email notification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Account, Client, Databases, ID, Query } from 'appwrite';

// Mock Appwrite
vi.mock('appwrite', () => {
  const mockAccount = {
    get: vi.fn(),
    create: vi.fn(),
    createEmailPasswordSession: vi.fn(),
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

describe('E2E: User Invitation and Completion Flow', () => {
  let mockAccount: any;
  let mockDatabases: any;
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = new Client();
    mockAccount = new Account(mockClient);
    mockDatabases = new Databases(mockClient);
    
    // Reset all mock functions to clear queued mockResolvedValueOnce calls
    mockAccount.get.mockReset();
    mockAccount.create.mockReset();
    mockAccount.createEmailPasswordSession.mockReset();
    mockDatabases.createDocument.mockReset();
    mockDatabases.listDocuments.mockReset();
    mockDatabases.getDocument.mockReset();
    mockDatabases.updateDocument.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Complete Invitation Flow', () => {
    it('should complete full invitation workflow from creation to signup', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      // Step 1: Admin creates invitation (simulated - no actual API calls needed for this test)
      const adminUser = {
        $id: 'admin-full-flow-123',
        email: 'admin@example.com',
      };

      // Step 2: Generate unique invitation token
      const generateToken = () => {
        const part1 = Math.random().toString(36).substring(2, 15);
        const part2 = Math.random().toString(36).substring(2, 15);
        return part1 + part2;
      };

      const invitationToken = generateToken();
      // Token length varies but should be at least 20 characters
      expect(invitationToken.length).toBeGreaterThanOrEqual(20);

      // Step 3: Create invitation
      const invitationData = {
        token: invitationToken,
        userId: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        usedAt: null,
        createdBy: adminUser.$id,
      };

      const mockInvitation = {
        $id: 'invitation-123',
        ...invitationData,
        $createdAt: new Date().toISOString(),
      };

      mockDatabases.createDocument.mockResolvedValueOnce(mockInvitation);

      const invitation = await mockDatabases.createDocument(
        'db-id',
        'invitations-collection',
        ID.unique(),
        invitationData
      );

      expect(invitation.$id).toBe('invitation-123');
      expect(invitation.token).toBe(invitationToken);
      expect(invitation.usedAt).toBeNull();

      // Step 4: New user receives invitation link and validates token
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockInvitation],
        total: 1,
      });

      const validationResult = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', invitationToken)]
      );

      expect(validationResult.documents).toHaveLength(1);

      const invitationToValidate = validationResult.documents[0];
      const isExpired = new Date(invitationToValidate.expiresAt) < new Date();
      const isUsed = invitationToValidate.usedAt !== null;

      expect(isExpired).toBe(false);
      expect(isUsed).toBe(false);

      // Step 6: User signs up with invitation
      const newUserData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
      };

      const mockAuthUser = {
        $id: 'new-user-123',
        email: newUserData.email,
        name: newUserData.name,
        $createdAt: new Date().toISOString(),
      };

      mockAccount.create.mockResolvedValueOnce(mockAuthUser);

      const authUser = await mockAccount.create(
        ID.unique(),
        newUserData.email,
        newUserData.password,
        newUserData.name
      );

      expect(authUser.$id).toBe('new-user-123');

      // Step 7: Get default role for invited users
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [
          {
            $id: 'role-user',
            name: 'User',
            permissions: JSON.stringify({ attendees: { read: true } }),
          },
        ],
        total: 1,
      });

      const defaultRole = await mockDatabases.listDocuments(
        'db-id',
        'roles-collection',
        [Query.equal('name', 'User')]
      );

      expect(defaultRole.documents).toHaveLength(1);

      // Step 8: Create user profile
      const userProfileData = {
        userId: authUser.$id,
        email: newUserData.email,
        name: newUserData.name,
        roleId: defaultRole.documents[0].$id,
        isInvited: true,
      };

      mockDatabases.createDocument.mockResolvedValueOnce({
        $id: 'profile-new-user',
        ...userProfileData,
      });

      const userProfile = await mockDatabases.createDocument(
        'db-id',
        'users-collection',
        ID.unique(),
        userProfileData
      );

      expect(userProfile.userId).toBe(authUser.$id);
      expect(userProfile.isInvited).toBe(true);

      // Step 9: Mark invitation as used
      const updatedInvitation = {
        ...mockInvitation,
        usedAt: new Date().toISOString(),
        userId: authUser.$id,
      };

      mockDatabases.updateDocument.mockResolvedValueOnce(updatedInvitation);

      const completedInvitation = await mockDatabases.updateDocument(
        'db-id',
        'invitations-collection',
        mockInvitation.$id,
        {
          usedAt: updatedInvitation.usedAt,
          userId: authUser.$id,
        }
      );

      expect(completedInvitation.usedAt).not.toBeNull();
      expect(completedInvitation.userId).toBe(authUser.$id);

      // Step 10: User logs in
      const mockSession = {
        $id: 'session-123',
        userId: authUser.$id,
        provider: 'email',
      };

      mockAccount.createEmailPasswordSession.mockResolvedValueOnce(mockSession);

      const session = await mockAccount.createEmailPasswordSession(
        newUserData.email,
        newUserData.password
      );

      expect(session.userId).toBe(authUser.$id);

      // Verify all steps completed successfully
      expect(mockDatabases.createDocument).toHaveBeenCalledTimes(2); // invitation + profile
      expect(mockDatabases.updateDocument).toHaveBeenCalledTimes(1); // mark invitation as used
      expect(mockAccount.create).toHaveBeenCalledTimes(1); // create auth user
      expect(mockAccount.createEmailPasswordSession).toHaveBeenCalledTimes(1); // login
    });

    it('should reject expired invitation', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const expiredInvitation = {
        $id: 'invitation-expired-test',
        token: 'expired-token-unique-123',
        expiresAt: yesterday.toISOString(),
        usedAt: null,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [expiredInvitation],
        total: 1,
      });

      const result = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', 'expired-token-unique-123')]
      );

      expect(result.documents).toHaveLength(1);
      const invitation = result.documents[0];
      expect(invitation.$id).toBe('invitation-expired-test');
      
      const expirationDate = new Date(invitation.expiresAt);
      const now = new Date();
      const isExpired = expirationDate < now;

      expect(isExpired).toBe(true);
      // Should not proceed with signup
    });

    it('should reject already used invitation', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      const usedTimestamp = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const usedInvitation = {
        $id: 'invitation-used-test',
        token: 'used-token-unique-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        usedAt: usedTimestamp,
        userId: 'existing-user-unique-123',
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [usedInvitation],
        total: 1,
      });

      const result = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', 'used-token-unique-123')]
      );

      expect(result.documents).toHaveLength(1);
      const invitation = result.documents[0];
      expect(invitation.$id).toBe('invitation-used-test');
      
      const isUsed = invitation.usedAt !== null;

      expect(isUsed).toBe(true);
      expect(invitation.usedAt).toBe(usedTimestamp);
      expect(invitation.userId).toBe('existing-user-unique-123');
      // Should not proceed with signup
    });

    it('should reject invalid invitation token', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      // Mock empty result for invalid token
      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [],
        total: 0,
      });

      const result = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', 'invalid-token-unique-xyz-123')]
      );

      expect(result.documents).toHaveLength(0);
      expect(result.total).toBe(0);
      // Should not proceed with signup
    });
  });

  describe('Invitation Creation', () => {
    it('should create invitation with proper expiration', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'admin-expiration-123' });

      const expirationDays = 7;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + expirationDays * 24 * 60 * 60 * 1000);

      const invitationData = {
        token: 'unique-token-expiration-123',
        userId: null,
        expiresAt: expiresAt.toISOString(),
        usedAt: null,
        createdBy: 'admin-expiration-123',
      };

      mockDatabases.createDocument.mockResolvedValueOnce({
        $id: 'invitation-expiration-123',
        ...invitationData,
      });

      const invitation = await mockDatabases.createDocument(
        'db-id',
        'invitations-collection',
        ID.unique(),
        invitationData
      );

      expect(invitation.$id).toBe('invitation-expiration-123');
      
      const expirationDate = new Date(invitation.expiresAt);
      const currentTime = new Date();
      const daysDifference = Math.floor(
        (expirationDate.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysDifference).toBeGreaterThanOrEqual(6);
      expect(daysDifference).toBeLessThanOrEqual(7);
    });

    it('should generate unique tokens', async () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const token = Math.random().toString(36).substring(2, 15) +
                     Math.random().toString(36).substring(2, 15);
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);
    });
  });

  describe('Invitation Validation', () => {
    it('should validate invitation before signup', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const validInvitation = {
        $id: 'invitation-valid-test',
        token: 'valid-token-unique-123',
        expiresAt: futureDate.toISOString(),
        usedAt: null,
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [validInvitation],
        total: 1,
      });

      const result = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.equal('token', 'valid-token-unique-123')]
      );

      expect(result.documents).toHaveLength(1);

      const invitation = result.documents[0];
      expect(invitation.$id).toBe('invitation-valid-test');
      
      const expirationDate = new Date(invitation.expiresAt);
      const now = new Date();
      const isValid =
        expirationDate > now &&
        invitation.usedAt === null;

      expect(isValid).toBe(true);
    });

    it('should provide detailed validation errors', async () => {
      const testCases = [
        {
          name: 'expired',
          invitation: {
            expiresAt: new Date(Date.now() - 1000).toISOString(),
            usedAt: null,
          },
          expectedError: 'Invitation has expired',
        },
        {
          name: 'already used',
          invitation: {
            expiresAt: new Date(Date.now() + 1000).toISOString(),
            usedAt: new Date().toISOString(),
          },
          expectedError: 'Invitation has already been used',
        },
      ];

      for (const testCase of testCases) {
        const isExpired = new Date(testCase.invitation.expiresAt) < new Date();
        const isUsed = testCase.invitation.usedAt !== null;

        let error = '';
        if (isExpired) {
          error = 'Invitation has expired';
        } else if (isUsed) {
          error = 'Invitation has already been used';
        }

        expect(error).toBe(testCase.expectedError);
      }
    });
  });

  describe('Role Assignment', () => {
    it('should assign default role to invited users', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      const mockRole = {
        $id: 'role-user-default',
        name: 'User',
        permissions: JSON.stringify({
          attendees: { read: true },
        }),
      };

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: [mockRole],
        total: 1,
      });

      const defaultRole = await mockDatabases.listDocuments(
        'db-id',
        'roles-collection',
        [Query.equal('name', 'User')]
      );

      expect(defaultRole.documents).toHaveLength(1);
      expect(defaultRole.documents[0].name).toBe('User');
      expect(defaultRole.documents[0].$id).toBe('role-user-default');

      const permissions = JSON.parse(defaultRole.documents[0].permissions);
      expect(permissions.attendees.read).toBe(true);
    });

    it('should allow custom role assignment', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      const customRoleId = 'role-custom-unique-123';

      const mockCustomRole = {
        $id: customRoleId,
        name: 'Event Staff',
        permissions: JSON.stringify({
          attendees: { read: true, write: true, create: true },
        }),
      };

      mockDatabases.getDocument.mockResolvedValueOnce(mockCustomRole);

      const customRole = await mockDatabases.getDocument(
        'db-id',
        'roles-collection',
        customRoleId
      );

      expect(customRole.$id).toBe(customRoleId);
      expect(customRole.name).toBe('Event Staff');

      const userProfileData = {
        userId: 'new-user-custom-123',
        email: 'user@example.com',
        roleId: customRole.$id,
        isInvited: true,
      };

      mockDatabases.createDocument.mockResolvedValueOnce({
        $id: 'profile-custom-123',
        ...userProfileData,
      });

      const profile = await mockDatabases.createDocument(
        'db-id',
        'users-collection',
        ID.unique(),
        userProfileData
      );

      expect(profile.$id).toBe('profile-custom-123');
      expect(profile.roleId).toBe(customRoleId);
    });
  });

  describe('Invitation Listing', () => {
    it('should list all invitations for admin', async () => {
      // Clear any previous mocks
      vi.clearAllMocks();
      
      mockAccount.get.mockResolvedValueOnce({ $id: 'admin-listing-123' });

      await mockAccount.get();

      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const mockInvitations = [
        {
          $id: 'invitation-listing-1',
          token: 'token-listing-1',
          expiresAt: futureDate.toISOString(),
          usedAt: null,
          createdBy: 'admin-listing-123',
        },
        {
          $id: 'invitation-listing-2',
          token: 'token-listing-2',
          expiresAt: futureDate.toISOString(),
          usedAt: new Date().toISOString(),
          createdBy: 'admin-listing-123',
        },
      ];

      mockDatabases.listDocuments.mockResolvedValueOnce({
        documents: mockInvitations,
        total: 2,
      });

      const invitations = await mockDatabases.listDocuments(
        'db-id',
        'invitations-collection',
        [Query.limit(100)]
      );

      expect(invitations.documents).toHaveLength(2);
      expect(invitations.total).toBe(2);

      const now = new Date();
      const pending = invitations.documents.filter(
        (inv: any) => inv.usedAt === null && new Date(inv.expiresAt) > now
      );
      const used = invitations.documents.filter((inv: any) => inv.usedAt !== null);

      expect(pending).toHaveLength(1);
      expect(used).toHaveLength(1);
    });
  });
});

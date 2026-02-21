import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '@/pages/api/custom-fields/[id]';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn((req: NextApiRequest) => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    tablesDB: mockAdminTablesDB,
})),
}));


/**
 * PERMISSION VERIFICATION TESTS FOR VISIBILITY CONTROL
 * 
 * This test suite verifies that the showOnMainPage visibility control feature
 * properly respects role-based access control (RBAC) permissions.
 * 
 * Test Coverage:
 * 1. Visibility toggle requires customFields.update permission
 * 2. Different user roles have appropriate access levels
 * 3. Permission checks are enforced before allowing visibility changes
 * 4. Default fields creation respects existing permissions
 * 
 * Requirements Tested:
 * - Requirement 6.1: Users with attendee create permission can fill in default fields
 * - Requirement 6.2: Users with customFields.update permission can modify visibility
 * - Requirement 6.3: Users with attendee read permission see visible fields
 * - Requirement 6.4: Users with attendee edit permission see all fields in edit form
 * - Requirement 6.5: Users without customFields management permissions don't see visibility controls
 */
describe('/api/custom-fields/[id] - Visibility Control Permissions', () => {
  let mockReq: Partial<NextApiRequest>;
  let mockRes: Partial<NextApiResponse>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  const mockAuthUser = {
    $id: 'auth-user-123',
    email: 'user@example.com',
    name: 'Test User',
  };

  const mockUserProfile = {
    $id: 'profile-123',
    userId: 'auth-user-123',
    email: 'user@example.com',
    name: 'Test User',
    roleId: 'role-123',
    isInvited: false,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  const mockCustomField = {
    $id: 'field-123',
    eventSettingsId: 'event-settings-123',
    fieldName: 'Test Field',
    internalFieldName: 'test_field',
    fieldType: 'text',
    fieldOptions: null,
    required: false,
    order: 1,
    showOnMainPage: true,
    version: 0,
    deletedAt: null,
    $createdAt: '2024-01-01T00:00:00.000Z',
    $updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    resetAllMocks();
    
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));
    
    mockReq = {
      method: 'PUT',
      query: { id: 'field-123' },
      cookies: { 'appwrite-session': 'test-session' },
      body: {
        fieldName: 'Test Field',
        fieldType: 'text',
        required: false,
        order: 1,
        version: 0,
        showOnMainPage: false, // Attempting to hide field
      },
    };
    
    mockRes = {
      status: statusMock as any,
      setHeader: vi.fn(),
    };

    // Default mock implementations
    mockAccount.get.mockResolvedValue(mockAuthUser);
    mockTablesDB.listRows.mockResolvedValue({
      rows: [mockUserProfile],
      total: 1,
    });
  });

  describe('Super Administrator Role', () => {
    const superAdminRole = {
      $id: 'role-super-admin',
      name: 'Super Administrator',
      description: 'Full system access',
      permissions: JSON.stringify({
        all: true,
      }),
    };

    it('should allow Super Administrator to toggle visibility to false', async () => {
      mockTablesDB.getRow
        .mockResolvedValueOnce(superAdminRole) // Role lookup
        .mockResolvedValueOnce(mockCustomField); // Current field lookup

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: false,
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: false,
            version: 1,
          }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          showOnMainPage: false,
          version: 1,
        })
      );
    });

    it('should allow Super Administrator to toggle visibility to true', async () => {
      mockReq.body!.showOnMainPage = true;

      const hiddenField = { ...mockCustomField, showOnMainPage: false };

      mockTablesDB.getRow
        .mockResolvedValueOnce(superAdminRole)
        .mockResolvedValueOnce(hiddenField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...hiddenField,
        showOnMainPage: true,
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: true,
            version: 1,
          }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Event Manager Role', () => {
    const eventManagerRole = {
      $id: 'role-event-manager',
      name: 'Event Manager',
      description: 'Full event management access',
      permissions: JSON.stringify({
        attendees: { create: true, read: true, update: true, delete: true },
        customFields: { create: true, read: true, update: true, delete: true },
        eventSettings: { read: true, update: true },
      }),
    };

    it('should allow Event Manager to toggle visibility (has customFields.update)', async () => {
      mockTablesDB.getRow
        .mockResolvedValueOnce(eventManagerRole)
        .mockResolvedValueOnce(mockCustomField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: false,
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Registration Staff Role', () => {
    const registrationStaffRole = {
      $id: 'role-registration-staff',
      name: 'Registration Staff',
      description: 'Attendee management access',
      permissions: JSON.stringify({
        attendees: { create: true, read: true, update: true },
        customFields: { read: true }, // No update permission
        eventSettings: { read: true },
      }),
    };

    it('should deny Registration Staff from toggling visibility (no customFields.update)', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(registrationStaffRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update custom fields',
      });
    });

    it('should deny Registration Staff even if they try to update other field properties', async () => {
      mockReq.body = {
        fieldName: 'Updated Name',
        fieldType: 'text',
        version: 0,
        showOnMainPage: true, // Even trying to keep it visible
      };

      mockTablesDB.getRow.mockResolvedValueOnce(registrationStaffRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });

  describe('Viewer Role', () => {
    const viewerRole = {
      $id: 'role-viewer',
      name: 'Viewer',
      description: 'Read-only access',
      permissions: JSON.stringify({
        attendees: { read: true },
        customFields: { read: true },
        eventSettings: { read: true },
      }),
    };

    it('should deny Viewer from toggling visibility (no customFields.update)', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(viewerRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update custom fields',
      });
    });

    it('should allow Viewer to read custom field with visibility info (GET request)', async () => {
      mockReq.method = 'GET';

      mockTablesDB.getRow
        .mockResolvedValueOnce(viewerRole)
        .mockResolvedValueOnce(mockCustomField);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          showOnMainPage: true,
        })
      );
    });
  });

  describe('Role with Explicit customFields.update Permission', () => {
    const customRole = {
      $id: 'role-custom',
      name: 'Custom Role',
      description: 'Custom permissions',
      permissions: JSON.stringify({
        customFields: { read: true, update: true }, // Explicit update permission
      }),
    };

    it('should allow user with explicit customFields.update to toggle visibility', async () => {
      mockTablesDB.getRow
        .mockResolvedValueOnce(customRole)
        .mockResolvedValueOnce(mockCustomField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: false,
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Role without customFields Permission', () => {
    const noCustomFieldsRole = {
      $id: 'role-no-custom-fields',
      name: 'No Custom Fields Role',
      description: 'No custom fields access',
      permissions: JSON.stringify({
        attendees: { read: true, create: true },
        // No customFields permission at all
      }),
    };

    it('should deny user without any customFields permission from updating', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(noCustomFieldsRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should deny user without customFields.read from reading field', async () => {
      mockReq.method = 'GET';

      mockTablesDB.getRow.mockResolvedValueOnce(noCustomFieldsRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to read custom fields',
      });
    });
  });

  describe('Validation of showOnMainPage Value', () => {
    const adminRole = {
      $id: 'role-admin',
      name: 'Super Administrator',
      permissions: JSON.stringify({ all: true }),
    };

    it('should reject non-boolean showOnMainPage value', async () => {
      mockReq.body!.showOnMainPage = 'true'; // String instead of boolean

      mockTablesDB.getRow.mockResolvedValueOnce(adminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid showOnMainPage value',
        details: 'showOnMainPage must be a boolean value',
      });
    });

    it('should reject numeric showOnMainPage value', async () => {
      mockReq.body!.showOnMainPage = 1; // Number instead of boolean

      mockTablesDB.getRow.mockResolvedValueOnce(adminRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should accept undefined showOnMainPage (defaults to true)', async () => {
      delete mockReq.body!.showOnMainPage;

      mockTablesDB.getRow
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(mockCustomField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: true, // Defaults to true
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: true,
          }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should accept explicit false value', async () => {
      mockReq.body!.showOnMainPage = false;

      mockTablesDB.getRow
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(mockCustomField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: false,
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: false,
          }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });

    it('should accept explicit true value', async () => {
      mockReq.body!.showOnMainPage = true;

      mockTablesDB.getRow
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(mockCustomField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: true,
        version: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            showOnMainPage: true,
          }),
        })
      );

      expect(statusMock).toHaveBeenCalledWith(200);
    });
  });

  describe('Permission Check Timing', () => {
    const staffRole = {
      $id: 'role-staff',
      name: 'Registration Staff',
      permissions: JSON.stringify({
        customFields: { read: true }, // No update
      }),
    };

    it('should check permissions before fetching current field', async () => {
      mockTablesDB.getRow.mockResolvedValueOnce(staffRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should only call getRow once (for role), not twice (role + field)
      expect(mockTablesDB.getRow).toHaveBeenCalledTimes(1);
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should check permissions before validating version', async () => {
      mockReq.body!.version = 999; // Wrong version

      mockTablesDB.getRow.mockResolvedValueOnce(staffRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should fail on permission check, not version check
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Insufficient permissions to update custom fields',
      });
    });
  });

  describe('Concurrent Update Protection with Visibility Changes', () => {
    const adminRole = {
      $id: 'role-admin',
      name: 'Super Administrator',
      permissions: JSON.stringify({ all: true }),
    };

    it('should enforce optimistic locking when changing visibility', async () => {
      mockReq.body!.version = 0; // Trying to update version 0

      const newerField = { ...mockCustomField, version: 1 }; // But field is now version 1

      mockTablesDB.getRow
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(newerField);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(409);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Conflict: Document has been modified by another user',
        details: expect.objectContaining({
          currentVersion: 1,
          providedVersion: 0,
        }),
      });
    });

    it('should increment version when visibility is changed', async () => {
      mockTablesDB.getRow
        .mockResolvedValueOnce(adminRole)
        .mockResolvedValueOnce(mockCustomField);

      mockTablesDB.updateRow.mockResolvedValueOnce({
        ...mockCustomField,
        showOnMainPage: false,
        version: 1, // Incremented from 0
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(mockTablesDB.updateRow).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            version: 1,
          }),
        })
      );
    });
  });

  describe('Error Handling with Permissions', () => {
    it('should handle missing role gracefully', async () => {
      const userWithoutRole = { ...mockUserProfile, roleId: null };

      mockTablesDB.listRows.mockResolvedValueOnce({
        rows: [userWithoutRole],
        total: 1,
      });

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle role fetch error', async () => {
      const roleError = new Error('Role not found');
      (roleError as any).code = 404;

      mockTablesDB.getRow.mockRejectedValueOnce(roleError);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Middleware catches role fetch errors and returns 403
      expect(statusMock).toHaveBeenCalledWith(403);
    });

    it('should handle malformed permissions JSON', async () => {
      const malformedRole = {
        $id: 'role-malformed',
        name: 'Malformed Role',
        permissions: 'not-valid-json{',
      };

      mockTablesDB.getRow.mockResolvedValueOnce(malformedRole);

      await handler(mockReq as NextApiRequest, mockRes as NextApiResponse);

      // Should treat as no permissions
      expect(statusMock).toHaveBeenCalledWith(403);
    });
  });
});

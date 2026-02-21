/**
 * Property-Based Tests for Reports API
 *
 * These tests verify the correctness properties defined in the design document
 * for the Saved Reports feature:
 * - Property 9: Permission Enforcement
 * - Property 10: User-Scoped Report Listing
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import type { NextApiRequest, NextApiResponse } from 'next';
import { mockAccount, mockTablesDB, mockAdminTablesDB, resetAllMocks } from '@/test/mocks/appwrite';

// Mock the appwrite module
vi.mock('@/lib/appwrite', () => ({
  createSessionClient: vi.fn(() => ({
    account: mockAccount,
    tablesDB: mockTablesDB,
  })),
  createAdminClient: vi.fn(() => ({
    account: mockAccount,
    tablesDB: mockAdminTablesDB,
  })),
}));

// Mock the permissions module
vi.mock('@/lib/permissions', () => ({
  hasPermission: vi.fn((role: any, resource: string, action: string) => {
    if (!role) return false;
    const permissions =
      typeof role.permissions === 'string' ? JSON.parse(role.permissions) : role.permissions;
    return permissions?.[resource]?.[action] === true;
  }),
}));


// Import the user profile cache to clear it between tests
import { userProfileCache } from '@/lib/userProfileCache';

// Import handlers after mocks are set up
import listHandler from '@/pages/api/reports/index';
import singleHandler from '@/pages/api/reports/[id]';

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Reset all mocks and clear caches
 */
function resetMocksAndCache() {
  resetAllMocks();
  userProfileCache.clear();
}

/**
 * Create a mock request object
 */
function createMockRequest(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    method: 'GET',
    cookies: { 'appwrite-session': 'test-session' },
    body: {},
    query: {},
    ...overrides,
  } as NextApiRequest;
}

/**
 * Create a mock response object
 */
function createMockResponse(): {
  res: NextApiResponse;
  statusMock: ReturnType<typeof vi.fn>;
  jsonMock: ReturnType<typeof vi.fn>;
} {
  const jsonMock = vi.fn();
  const statusMock = vi.fn(() => ({ json: jsonMock }));
  const res = {
    status: statusMock,
    setHeader: vi.fn(),
  } as unknown as NextApiResponse;
  return { res, statusMock, jsonMock };
}

// ============================================================================
// Arbitraries (Test Data Generators)
// ============================================================================

/**
 * Generate a valid user ID
 */
const userIdArbitrary = fc.uuid();

/**
 * Generate a valid report name
 */
const reportNameArbitrary = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0);

/**
 * Generate a permission action
 */
const permissionActionArbitrary = fc.constantFrom('create', 'read', 'update', 'delete');

/**
 * Generate a role with specific reports permissions
 */
const roleWithPermissionsArbitrary = (reportsPermissions: Record<string, boolean>) =>
  fc.record({
    $id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    permissions: fc.constant(JSON.stringify({ reports: reportsPermissions })),
  });

/**
 * Generate a role without reports permissions
 */
const roleWithoutReportsPermissionsArbitrary = fc.record({
  $id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  permissions: fc.constant(JSON.stringify({ attendees: { read: true } })),
});

/**
 * Generate a Super Administrator role
 */
const adminRoleArbitrary = fc.constant({
  $id: 'admin-role-id',
  name: 'Super Administrator',
  permissions: JSON.stringify({
    reports: { create: true, read: true, update: true, delete: true },
  }),
});

/**
 * Generate a non-admin role with reports read permission
 */
const nonAdminRoleWithReadArbitrary = fc.record({
  $id: fc.uuid(),
  name: fc.constantFrom('Event Manager', 'Registration Staff', 'Viewer'),
  permissions: fc.constant(JSON.stringify({ reports: { read: true } })),
});

/**
 * Generate a saved report document
 */
const reportDocumentArbitrary = (userId: string) =>
  fc.record({
    $id: fc.uuid(),
    name: reportNameArbitrary,
    description: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    userId: fc.constant(userId),
    filterConfiguration: fc.constant(
      JSON.stringify({
        firstName: { value: '', operator: 'contains' },
        lastName: { value: '', operator: 'contains' },
        barcode: { value: '', operator: 'contains' },
        notes: { value: '', operator: 'contains', hasNotes: false },
        photoFilter: 'all',
        credentialFilter: 'all',
        customFields: {},
        accessControl: {
          accessStatus: 'all',
          validFromStart: '',
          validFromEnd: '',
          validUntilStart: '',
          validUntilEnd: '',
        },
        matchMode: 'all',
      })
    ),
    createdAt: fc.constant(new Date().toISOString()),
    updatedAt: fc.constant(new Date().toISOString()),
    lastAccessedAt: fc.option(fc.constant(new Date().toISOString()), { nil: undefined }),
  });

/**
 * Generate a user profile document
 */
const userProfileArbitrary = (userId: string, roleId: string) =>
  fc.constant({
    $id: `profile-${userId}`,
    userId,
    email: `user-${userId.slice(0, 8)}@example.com`,
    name: `User ${userId.slice(0, 8)}`,
    roleId,
    isInvited: false,
    $createdAt: new Date().toISOString(),
    $updatedAt: new Date().toISOString(),
  });

// ============================================================================
// Property 9: Permission Enforcement
// ============================================================================

/**
 * **Feature: saved-reports, Property 9: Permission Enforcement**
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5**
 *
 * *For any* user without the required permission for a reports operation
 * (create, read, update, delete), attempting that operation should fail
 * with a permission error and the operation should not be performed.
 */
describe('Property 9: Permission Enforcement', () => {
  beforeEach(() => {
    resetMocksAndCache();
  });

  describe('Users without reports.read permission receive 403 on GET', () => {
    it('returns 403 when user lacks reports.read permission for list endpoint', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArbitrary, roleWithoutReportsPermissionsArbitrary, async (userId, role) => {
          const mockReq = createMockRequest({ method: 'GET' });
          const { res, statusMock, jsonMock } = createMockResponse();

          // Setup mocks
          mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
          mockTablesDB.listRows.mockResolvedValueOnce({
            rows: [{ $id: 'profile-1', userId, roleId: role.$id }],
            total: 1,
          });
          mockTablesDB.getRow.mockResolvedValueOnce(role);

          await listHandler(mockReq, res);

          expect(statusMock).toHaveBeenCalledWith(403);
          expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
              code: 'PERMISSION_DENIED',
            })
          );
        }),
        { numRuns: 50 }
      );
    });

    it('returns 403 when user lacks reports.read permission for single report endpoint', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          roleWithoutReportsPermissionsArbitrary,
          fc.uuid(),
          async (userId, role, reportId) => {
            const mockReq = createMockRequest({
              method: 'GET',
              query: { id: reportId },
            });
            const { res, statusMock, jsonMock } = createMockResponse();

            // Setup mocks
            mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
            mockTablesDB.listRows.mockResolvedValueOnce({
              rows: [{ $id: 'profile-1', userId, roleId: role.$id }],
              total: 1,
            });
            mockTablesDB.getRow.mockResolvedValueOnce(role);

            await singleHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 'PERMISSION_DENIED',
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Users without reports.create permission receive 403 on POST', () => {
    it('returns 403 and does not create report when user lacks reports.create permission', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          roleWithPermissionsArbitrary({ read: true, create: false }),
          reportNameArbitrary,
          async (userId, role, reportName) => {
            const mockReq = createMockRequest({
              method: 'POST',
              body: {
                name: reportName,
                filterConfiguration: {
                  firstName: { value: '', operator: 'contains' },
                  lastName: { value: '', operator: 'contains' },
                  barcode: { value: '', operator: 'contains' },
                  notes: { value: '', operator: 'contains', hasNotes: false },
                  photoFilter: 'all',
                  credentialFilter: 'all',
                  customFields: {},
                  accessControl: {
                    accessStatus: 'all',
                    validFromStart: '',
                    validFromEnd: '',
                    validUntilStart: '',
                    validUntilEnd: '',
                  },
                  matchMode: 'all',
                },
              },
            });
            const { res, statusMock, jsonMock } = createMockResponse();

            // Setup mocks
            mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
            mockTablesDB.listRows.mockResolvedValueOnce({
              rows: [{ $id: 'profile-1', userId, roleId: role.$id }],
              total: 1,
            });
            mockTablesDB.getRow.mockResolvedValueOnce(role);

            await listHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 'PERMISSION_DENIED',
              })
            );

            // Verify createRow was NOT called
            expect(mockTablesDB.createRow).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Users without reports.update permission receive 403 on PUT', () => {
    it('returns 403 and does not update report when user lacks reports.update permission', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          roleWithPermissionsArbitrary({ read: true, update: false }),
          fc.uuid(),
          reportNameArbitrary,
          async (userId, role, reportId, newName) => {
            const mockReq = createMockRequest({
              method: 'PUT',
              query: { id: reportId },
              body: { name: newName },
            });
            const { res, statusMock, jsonMock } = createMockResponse();

            // Setup mocks
            mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
            mockTablesDB.listRows.mockResolvedValueOnce({
              rows: [{ $id: 'profile-1', userId, roleId: role.$id }],
              total: 1,
            });
            mockTablesDB.getRow.mockResolvedValueOnce(role);

            await singleHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 'PERMISSION_DENIED',
              })
            );

            // Verify updateRow was NOT called
            expect(mockTablesDB.updateRow).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Users without reports.delete permission receive 403 on DELETE', () => {
    it('returns 403 and does not delete report when user lacks reports.delete permission', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          roleWithPermissionsArbitrary({ read: true, delete: false }),
          fc.uuid(),
          async (userId, role, reportId) => {
            const mockReq = createMockRequest({
              method: 'DELETE',
              query: { id: reportId },
            });
            const { res, statusMock, jsonMock } = createMockResponse();

            // Setup mocks
            mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
            mockTablesDB.listRows.mockResolvedValueOnce({
              rows: [{ $id: 'profile-1', userId, roleId: role.$id }],
              total: 1,
            });
            mockTablesDB.getRow.mockResolvedValueOnce(role);

            await singleHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 'PERMISSION_DENIED',
              })
            );

            // Verify deleteRow was NOT called
            expect(mockTablesDB.deleteRow).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Users with null role receive 403', () => {
    it('returns 403 when user has no role assigned', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArbitrary, async (userId) => {
          const mockReq = createMockRequest({ method: 'GET' });
          const { res, statusMock, jsonMock } = createMockResponse();

          // Setup mocks - user profile with no roleId
          mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
          mockTablesDB.listRows.mockResolvedValueOnce({
            rows: [{ $id: 'profile-1', userId, roleId: null }],
            total: 1,
          });
          // getRow for role will not be called since roleId is null

          await listHandler(mockReq, res);

          expect(statusMock).toHaveBeenCalledWith(403);
          expect(jsonMock).toHaveBeenCalledWith(
            expect.objectContaining({
              code: 'PERMISSION_DENIED',
            })
          );
        }),
        { numRuns: 50 }
      );
    });
  });
});

// ============================================================================
// Property 10: User-Scoped Report Listing
// ============================================================================

/**
 * **Feature: saved-reports, Property 10: User-Scoped Report Listing**
 * **Validates: Requirements 5.7, 5.8**
 *
 * *For any* non-administrative user, listing reports should return only
 * reports where `userId` matches the requesting user's ID.
 * *For any* administrative user, listing reports should return all reports
 * regardless of `userId`.
 */
describe('Property 10: User-Scoped Report Listing', () => {
  beforeEach(() => {
    resetMocksAndCache();
  });

  describe('Non-admin users only see their own reports', () => {
    it('filters reports by userId for non-admin users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          nonAdminRoleWithReadArbitrary,
          fc.array(reportNameArbitrary, { minLength: 1, maxLength: 5 }),
          async (userId, role, reportNames) => {
            resetMocksAndCache();
            
            const mockReq = createMockRequest({ method: 'GET' });
            const { res, statusMock, jsonMock } = createMockResponse();

            // Create reports owned by this user
            const userReports = reportNames.map((name, idx) => ({
              $id: `report-${idx}`,
              name,
              userId,
              filterConfiguration: '{}',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            // Setup mocks - the middleware calls listRows for user profile
            mockAccount.get.mockResolvedValue({ $id: userId, email: 'test@example.com' });
            mockTablesDB.listRows
              .mockResolvedValueOnce({
                // User profile lookup (middleware)
                rows: [{ $id: 'profile-1', userId, roleId: role.$id }],
                total: 1,
              })
              .mockResolvedValueOnce({
                // Reports list
                rows: userReports,
                total: userReports.length,
              });
            mockTablesDB.getRow.mockResolvedValueOnce(role);

            await listHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(200);

            // Verify the query included userId filter
            const listRowsCalls = mockTablesDB.listRows.mock.calls;
            expect(listRowsCalls.length).toBeGreaterThanOrEqual(2);
            
            // Find the reports collection query (verify it's actually the reports collection)
            const reportsTableId = process.env.NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID;
            expect(reportsTableId).toBeDefined();
            
            const reportsQuery = listRowsCalls.find((call: any[]) => 
              call[1] === reportsTableId
            );
            expect(reportsQuery).toBeDefined();
            
            // Check that the query contains a userId filter
            expect(reportsQuery).toBeDefined();
            expect(reportsQuery[2]).toBeDefined();
            
            const queryStrings = reportsQuery[2].map((q: string) => 
              typeof q === 'string' ? q : JSON.stringify(q)
            );
            const hasUserIdFilter = queryStrings.some((q: string) => 
              q.includes('userId') && q.includes(userId)
            );
            expect(hasUserIdFilter).toBe(true);

            // Verify all returned reports belong to the user
            const response = jsonMock.mock.calls[0][0];
            response.reports.forEach((report: any) => {
              expect(report.userId).toBe(userId);
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('non-admin user cannot see reports from other users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          userIdArbitrary,
          nonAdminRoleWithReadArbitrary,
          async (currentUserId, otherUserId, role) => {
            // Ensure different users
            if (currentUserId === otherUserId) return;

            resetMocksAndCache();
            
            const mockReq = createMockRequest({ method: 'GET' });
            const { res, statusMock, jsonMock } = createMockResponse();

            // Setup mocks - return empty list (user has no reports)
            mockAccount.get.mockResolvedValue({ $id: currentUserId, email: 'test@example.com' });
            mockTablesDB.listRows
              .mockResolvedValueOnce({
                rows: [{ $id: 'profile-1', userId: currentUserId, roleId: role.$id }],
                total: 1,
              })
              .mockResolvedValueOnce({
                rows: [], // No reports for this user
                total: 0,
              });
            mockTablesDB.getRow.mockResolvedValueOnce(role);

            await listHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(200);

            // Verify the query filtered by current user's ID, not other user's ID
            const listRowsCalls = mockTablesDB.listRows.mock.calls;
            expect(listRowsCalls.length).toBeGreaterThanOrEqual(2);
            const reportsQuery = listRowsCalls[1];
            // Check that the query contains current user's ID filter
            const queryStrings = reportsQuery[2].map((q: string) => 
              typeof q === 'string' ? q : JSON.stringify(q)
            );
            const hasCurrentUserFilter = queryStrings.some((q: string) => 
              q.includes('userId') && q.includes(currentUserId)
            );
            const hasOtherUserFilter = queryStrings.some((q: string) => 
              q.includes('userId') && q.includes(otherUserId)
            );
            expect(hasCurrentUserFilter).toBe(true);
            expect(hasOtherUserFilter).toBe(false);
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Admin users see all reports', () => {
    it('does not filter by userId for Super Administrator', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          fc.array(userIdArbitrary, { minLength: 2, maxLength: 5 }),
          async (adminUserId, reportOwnerIds) => {
            resetMocksAndCache();
            
            const mockReq = createMockRequest({ method: 'GET' });
            const { res, statusMock, jsonMock } = createMockResponse();

            const adminRole = {
              $id: 'admin-role',
              name: 'Super Administrator',
              permissions: JSON.stringify({
                reports: { create: true, read: true, update: true, delete: true },
              }),
            };

            // Create reports from different users
            const allReports = reportOwnerIds.map((ownerId, idx) => ({
              $id: `report-${idx}`,
              name: `Report ${idx}`,
              userId: ownerId,
              filterConfiguration: '{}',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }));

            // Setup mocks
            mockAccount.get.mockResolvedValue({ $id: adminUserId, email: 'admin@example.com' });
            mockTablesDB.listRows
              .mockResolvedValueOnce({
                rows: [{ $id: 'profile-1', userId: adminUserId, roleId: adminRole.$id }],
                total: 1,
              })
              .mockResolvedValueOnce({
                rows: allReports,
                total: allReports.length,
              });
            mockTablesDB.getRow.mockResolvedValueOnce(adminRole);

            await listHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(200);

            // Verify the query did NOT include userId filter
            const listRowsCalls = mockTablesDB.listRows.mock.calls;
            expect(listRowsCalls.length).toBeGreaterThanOrEqual(2);
            // Find the reports collection call by matching the collection ID
            const reportsTableId = process.env.NEXT_PUBLIC_APPWRITE_REPORTS_TABLE_ID;
            expect(reportsTableId).toBeDefined();
            const reportsQuery = listRowsCalls.find(
              (call) => call[1] === reportsTableId
            );
            expect(reportsQuery).toBeDefined();
            // Admin query should only have orderDesc, not userId filter
            const hasUserIdFilter = reportsQuery![2].some((q: string) => q.includes('equal("userId"'));
            expect(hasUserIdFilter).toBe(false);

            // Verify response includes reports from multiple users
            expect(jsonMock.mock.calls.length).toBeGreaterThan(0);
            const response = jsonMock.mock.calls[0][0];
            expect(response.reports.length).toBe(allReports.length);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('admin can access reports from any user via single report endpoint', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArbitrary, userIdArbitrary, async (adminUserId, reportOwnerId) => {
          // Discard cases where users are the same (not vacuous)
          fc.pre(adminUserId !== reportOwnerId);

          resetMocksAndCache();
          
          const mockReq = createMockRequest({
            method: 'GET',
            query: { id: 'report-123' },
          });
          const { res, statusMock, jsonMock } = createMockResponse();

          const adminRole = {
            $id: 'admin-role',
            name: 'Super Administrator',
            permissions: JSON.stringify({
              reports: { create: true, read: true, update: true, delete: true },
            }),
          };

          const otherUserReport = {
            $id: 'report-123',
            name: 'Other User Report',
            userId: reportOwnerId, // Different from admin
            filterConfiguration: JSON.stringify({
              firstName: { value: '', operator: 'contains' },
              lastName: { value: '', operator: 'contains' },
              barcode: { value: '', operator: 'contains' },
              notes: { value: '', operator: 'contains', hasNotes: false },
              photoFilter: 'all',
              credentialFilter: 'all',
              customFields: {},
              accessControl: {
                accessStatus: 'all',
                validFromStart: '',
                validFromEnd: '',
                validUntilStart: '',
                validUntilEnd: '',
              },
              matchMode: 'all',
            }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          // Setup mocks
          mockAccount.get.mockResolvedValue({ $id: adminUserId, email: 'admin@example.com' });
          mockTablesDB.listRows
            .mockResolvedValueOnce({
              rows: [{ $id: 'profile-1', userId: adminUserId, roleId: adminRole.$id }],
              total: 1,
            })
            .mockResolvedValueOnce({
              // Event settings for validation
              rows: [],
              total: 0,
            });
          mockTablesDB.getRow
            .mockResolvedValueOnce(adminRole)
            .mockResolvedValueOnce(otherUserReport);
          mockTablesDB.updateRow.mockResolvedValueOnce(otherUserReport);

          await singleHandler(mockReq, res);

          expect(statusMock).toHaveBeenCalledWith(200);

          // Verify admin can access report owned by another user
          expect(jsonMock.mock.calls.length).toBeGreaterThan(0);
          const response = jsonMock.mock.calls[0][0];
          expect(response.report.userId).toBe(reportOwnerId);
          expect(response.report.userId).not.toBe(adminUserId);
        }),
        { numRuns: 50 }
      );
    });
  });

  describe('Non-admin cannot access other users reports via single endpoint', () => {
    it('returns 403 when non-admin tries to access another user report', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArbitrary,
          userIdArbitrary,
          nonAdminRoleWithReadArbitrary,
          async (currentUserId, reportOwnerId, role) => {
            // Ensure different users
            if (currentUserId === reportOwnerId) return;

            resetMocksAndCache();
            
            const mockReq = createMockRequest({
              method: 'GET',
              query: { id: 'report-123' },
            });
            const { res, statusMock, jsonMock } = createMockResponse();

            const otherUserReport = {
              $id: 'report-123',
              name: 'Other User Report',
              userId: reportOwnerId, // Different from current user
              filterConfiguration: '{}',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            // Setup mocks
            mockAccount.get.mockResolvedValue({ $id: currentUserId, email: 'test@example.com' });
            mockTablesDB.listRows.mockResolvedValueOnce({
              rows: [{ $id: 'profile-1', userId: currentUserId, roleId: role.$id }],
              total: 1,
            });
            mockTablesDB.getRow
              .mockResolvedValueOnce(role)
              .mockResolvedValueOnce(otherUserReport);

            await singleHandler(mockReq, res);

            expect(statusMock).toHaveBeenCalledWith(403);
            expect(jsonMock).toHaveBeenCalledWith(
              expect.objectContaining({
                code: 'PERMISSION_DENIED',
              })
            );
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});

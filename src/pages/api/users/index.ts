import { NextApiResponse } from 'next';
import { ID, Query } from 'appwrite';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import { shouldLog } from '@/lib/logSettings';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { ApiError, ErrorCode, handleApiError, validateInput, withRetry } from '@/lib/errorHandling';
import { invalidateRoleUserCount } from '@/lib/roleUserCountCache';

/**
 * Safely parse role permissions from string or return as-is if already an object
 * @param permissions - The permissions value (string or object)
 * @returns Parsed permissions object or empty object on failure
 */
function parseRolePermissions(permissions: unknown): Record<string, any> {
  if (typeof permissions === 'string') {
    try {
      return JSON.parse(permissions);
    } catch (error) {
      console.warn('Failed to parse role permissions:', error);
      return {};
    }
  }
  if (typeof permissions === 'object' && permissions !== null) {
    return permissions as Record<string, any>;
  }
  return {};
}

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and userProfile are already attached by middleware
  const { user, userProfile } = req;
  const { databases } = createSessionClient(req);

  // Extract role from userProfile for permission checks
  const role = userProfile.role ? {
    ...userProfile.role,
    permissions: userProfile.role.permissions
  } : null;

  console.log('Role from middleware:', role);

  try {
    switch (req.method) {
      case 'GET':
        // Check read permission for users
        console.log('Checking permission - role:', role, 'resource: users, action: read');
        const hasReadPermission = hasPermission(role, 'users', 'read');
        console.log('Has read permission:', hasReadPermission);
        if (!hasReadPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view users' });
        }

        // Parse pagination parameters from query
        const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
        const offset = parseInt(req.query.offset as string) || 0;

        // Fetch users with pagination
        const usersResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          [Query.orderDesc('$createdAt'), Query.limit(limit), Query.offset(offset)]
        );

        // Fetch roles for each user
        const usersWithRoles = await Promise.all(
          usersResponse.documents.map(async (userDoc) => {
            let userRole = null;
            if (userDoc.roleId) {
              try {
                userRole = await databases.getDocument(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
                  userDoc.roleId
                );
              } catch (error) {
                console.warn(`Failed to fetch role for user ${userDoc.$id}:`, error);
              }
            }
            return {
              id: userDoc.$id,
              userId: userDoc.userId,
              email: userDoc.email,
              name: userDoc.name,
              roleId: userDoc.roleId,
              isInvited: userDoc.isInvited,
              createdAt: userDoc.$createdAt,
              updatedAt: userDoc.$updatedAt,
              role: userRole ? {
                id: userRole.$id,
                name: userRole.name,
                description: userRole.description,
                permissions: parseRolePermissions(userRole.permissions)
              } : null
            };
          })
        );

        // Log the view action if enabled
        if (await shouldLog('systemViewUsersList')) {
          try {
            // Check for recent duplicate logs (within last 5 seconds)
            const recentLogs = await databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
              [
                Query.equal('userId', user.$id),
                Query.equal('action', 'view'),
                Query.greaterThan('$createdAt', new Date(Date.now() - 5000).toISOString()),
                Query.limit(5)
              ]
            );

            // Check if there's already a recent users view log
            const hasDuplicate = recentLogs.documents.some(log => {
              try {
                const details = JSON.parse(log.details);
                return details.target === 'Users List';
              } catch {
                return false;
              }
            });

            if (!hasDuplicate) {
              await databases.createDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
                ID.unique(),
                {
                  userId: user.$id,
                  action: 'view',
                  details: JSON.stringify({ 
                    type: 'system',
                    target: 'Users List',
                    description: `Viewed ${usersWithRoles.length} user${usersWithRoles.length !== 1 ? 's' : ''}`
                  })
                }
              );
            }
          } catch (logError) {
            console.error('Error creating log:', logError);
            // Continue even if logging fails
          }
        }

        // Return users with pagination metadata
        return res.status(200).json({
          users: usersWithRoles,
          pagination: {
            total: usersResponse.total,
            limit,
            offset,
            hasMore: offset + usersWithRoles.length < usersResponse.total
          }
        });

      case 'POST':
        // Check create permission for users
        if (!hasPermission(role, 'users', 'create')) {
          throw new ApiError(
            'Insufficient permissions to create users',
            ErrorCode.PERMISSION_DENIED,
            403
          );
        }

        const { authUserId, roleId, addToTeam, teamRole } = req.body;

        // Validate input (Requirement 7.3)
        validateInput([
          {
            field: 'authUserId',
            value: authUserId,
            rules: {
              required: true,
              message: 'Auth user ID is required'
            }
          },
          {
            field: 'roleId',
            value: roleId,
            rules: {
              required: true,
              message: 'Role ID is required'
            }
          }
        ]);

        // Validate that authUserId exists in Appwrite Auth
        const adminClient = createAdminClient();
        let authUser;
        try {
          authUser = await withRetry(
            () => adminClient.users.get(authUserId),
            { maxRetries: 2 }
          );
        } catch (error: any) {
          console.error('Error fetching auth user:', error);
          throw new ApiError(
            'Invalid auth user ID',
            ErrorCode.INVALID_AUTH_USER,
            400
          );
        }

        // Check if user is already linked to the application
        const existingUserDocs = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          [Query.equal('userId', authUserId)]
        );

        if (existingUserDocs.documents.length > 0) {
          throw new ApiError(
            'This user is already linked to the application',
            ErrorCode.USER_ALREADY_LINKED,
            409
          );
        }

        // Validate role if provided
        let userRole = null;
        if (roleId) {
          try {
            userRole = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
              roleId
            );
          } catch (error) {
            throw new ApiError(
              'Invalid role ID',
              ErrorCode.INVALID_ROLE,
              400
            );
          }
        }

        try {
          // Create user profile in database linking to existing auth user
          const newUserDoc = await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: authUser.$id,
              email: authUser.email,
              name: authUser.name,
              roleId: roleId,
              isInvited: false // Not invited since they already exist in auth
            }
          );

          // Invalidate cache for the assigned role
          if (roleId) {
            invalidateRoleUserCount(roleId);
          }

          // Handle team membership if requested
          let teamMembershipStatus = null;
          if (addToTeam && process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED === 'true') {
            const teamId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;

            if (!teamId) {
              console.warn('Team membership requested but NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID is not configured');
              teamMembershipStatus = {
                status: 'failed',
                error: 'Team ID not configured'
              };
            } else {
              try {
                // Map application role to team roles
                const roleMapping: Record<string, string[]> = {
                  'Super Administrator': ['owner'],
                  'Event Manager': ['admin'],
                  'Registration Staff': ['member'],
                  'Viewer': ['member']
                };

                const teamRoles = teamRole
                  ? [teamRole]
                  : (userRole?.name ? roleMapping[userRole.name] || ['member'] : ['member']);

                // Create team membership using admin client
                const membership = await adminClient.teams.createMembership({
                  teamId,
                  roles: teamRoles,
                  userId: authUser.$id,
                  email: authUser.email,
                  name: authUser.name
                });

                teamMembershipStatus = {
                  status: 'success',
                  teamId,
                  membershipId: membership.$id,
                  roles: teamRoles
                };

                console.log('Team membership created successfully:', membership.$id);

                // Log team membership creation (Requirement 1.6)
                await databases.createDocument(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
                  ID.unique(),
                  {
                    userId: user.$id,
                    action: 'team_membership_created',
                    details: JSON.stringify({
                      type: 'team_membership',
                      operation: 'create',
                      teamId,
                      membershipId: membership.$id,
                      targetUserId: authUser.$id,
                      targetUserEmail: authUser.email,
                      targetUserName: authUser.name,
                      teamRoles,
                      administratorId: user.$id,
                      administratorEmail: user.email,
                      administratorName: user.name
                    })
                  }
                );
              } catch (teamError: any) {
                console.error('Failed to create team membership:', teamError);
                teamMembershipStatus = {
                  status: 'failed',
                  error: teamError.message || 'Unknown error'
                };

                // Log team membership failure (Requirement 1.6)
                await databases.createDocument(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
                  ID.unique(),
                  {
                    userId: user.$id,
                    action: 'team_membership_failed',
                    details: JSON.stringify({
                      type: 'team_membership',
                      operation: 'create',
                      teamId,
                      targetUserId: authUser.$id,
                      targetUserEmail: authUser.email,
                      targetUserName: authUser.name,
                      error: teamError.message || 'Unknown error',
                      administratorId: user.$id,
                      administratorEmail: user.email,
                      administratorName: user.name
                    })
                  }
                );
              }
            }
          }

          // Log the linking action (Requirement 1.6, 9.7)
          if (await shouldLog('userCreate')) {
            await databases.createDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
              ID.unique(),
              {
                userId: user.$id,
                action: 'user_linked',
                details: JSON.stringify({
                  type: 'user_linking',
                  operation: 'link',
                  userProfileId: newUserDoc.$id,
                  authUserId: authUser.$id,
                  email: authUser.email,
                  name: authUser.name,
                  roleId: newUserDoc.roleId,
                  roleName: userRole?.name || null,
                  teamMembershipRequested: addToTeam || false,
                  teamMembershipStatus: teamMembershipStatus?.status || null,
                  administratorId: user.$id,
                  administratorEmail: user.email,
                  administratorName: user.name,
                  timestamp: new Date().toISOString()
                })
              }
            );
          }

          // Return user data
          const responseData: any = {
            id: newUserDoc.$id,
            userId: newUserDoc.userId,
            email: newUserDoc.email,
            name: newUserDoc.name,
            roleId: newUserDoc.roleId,
            isInvited: newUserDoc.isInvited,
            createdAt: newUserDoc.$createdAt,
            updatedAt: newUserDoc.$updatedAt,
            role: userRole ? {
              id: userRole.$id,
              name: userRole.name,
              description: userRole.description,
              permissions: parseRolePermissions(userRole.permissions)
            } : null
          };

          // Add team membership status if it was attempted
          if (teamMembershipStatus) {
            responseData.teamMembership = teamMembershipStatus;
          }

          return res.status(201).json(responseData);
        } catch (dbError: any) {
          console.error('Error linking user:', dbError);
          throw new ApiError(
            'Failed to link user account. Please try again.',
            ErrorCode.DATABASE_ERROR,
            500,
            process.env.NODE_ENV === 'development' ? dbError.message : undefined
          );
        }

      case 'PUT':
        // Check update permission for users
        if (!hasPermission(role, 'users', 'update')) {
          return res.status(403).json({ error: 'Insufficient permissions to update users' });
        }

        const { id, name: updateName, roleId: updateRoleId } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Validate role if provided
        let updatedRole = null;
        if (updateRoleId) {
          try {
            updatedRole = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
              updateRoleId
            );
          } catch (error) {
            return res.status(400).json({ error: 'Invalid role ID' });
          }
        }

        // Get current user to check for role changes
        const currentUserDoc = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          id
        );

        // Update user in database
        const updateData: any = {};
        if (updateName !== undefined) updateData.name = updateName;
        if (updateRoleId !== undefined) updateData.roleId = updateRoleId;

        const updatedUserDoc = await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          id,
          updateData
        );

        // Invalidate cache for both old and new roles if role changed
        if (updateRoleId !== undefined && currentUserDoc.roleId !== updateRoleId) {
          const rolesToInvalidate = [currentUserDoc.roleId, updateRoleId].filter(Boolean);
          if (rolesToInvalidate.length > 0) {
            invalidateRoleUserCount(rolesToInvalidate);
          }
        }

        // Log the update action if enabled
        if (await shouldLog('userUpdate')) {
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: user.$id,
              action: 'user_updated',
            details: JSON.stringify({
              type: 'user',
              operation: 'update',
              userProfileId: id,
              authUserId: updatedUserDoc.userId,
              email: updatedUserDoc.email,
              name: updatedUserDoc.name,
              roleId: updatedUserDoc.roleId,
              roleName: updatedRole?.name || null,
              updatedFields: {
                name: updateName !== undefined,
                roleId: updateRoleId !== undefined
              },
              administratorId: user.$id,
              administratorEmail: user.email,
              administratorName: user.name,
              timestamp: new Date().toISOString()
            })
            }
          );
        }

        return res.status(200).json({
          id: updatedUserDoc.$id,
          userId: updatedUserDoc.userId,
          email: updatedUserDoc.email,
          name: updatedUserDoc.name,
          roleId: updatedUserDoc.roleId,
          isInvited: updatedUserDoc.isInvited,
          createdAt: updatedUserDoc.$createdAt,
          updatedAt: updatedUserDoc.$updatedAt,
          role: updatedRole ? {
            id: updatedRole.$id,
            name: updatedRole.name,
            description: updatedRole.description,
            permissions: parseRolePermissions(updatedRole.permissions)
          } : null
        });

      case 'DELETE':
        // Check delete permission for users
        if (!hasPermission(role, 'users', 'delete')) {
          return res.status(403).json({ error: 'Insufficient permissions to delete users' });
        }

        const { id: deleteId, deleteFromAuth = true, removeFromTeam = false } = req.body;

        if (!deleteId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Get user info before deletion for logging
        let userToDelete;
        try {
          userToDelete = await databases.getDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
            deleteId
          );
        } catch (error) {
          return res.status(404).json({ error: 'User not found' });
        }

        // Don't allow deleting yourself
        if (userToDelete.userId === user.$id) {
          return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        let deletedFromAuth = false;
        let authDeletionError = null;
        let removedFromTeam = false;
        let teamRemovalError = null;

        // Remove from team if requested
        if (removeFromTeam && process.env.APPWRITE_TEAM_MEMBERSHIP_ENABLED === 'true') {
          const teamId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;

          if (teamId) {
            try {
              const deleteAdminClient = createAdminClient();

              // Find the user's membership in the team
              const memberships = await deleteAdminClient.teams.listMemberships({
                teamId,
                queries: [Query.equal('userId', userToDelete.userId)]
              });

              if (memberships.memberships.length > 0) {
                const membershipId = memberships.memberships[0].$id;

                // Delete the membership
                await deleteAdminClient.teams.deleteMembership({
                  teamId,
                  membershipId
                });
                removedFromTeam = true;
                console.log('Team membership removed successfully');

                // Log team membership removal (Requirement 1.6)
                await databases.createDocument(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
                  ID.unique(),
                  {
                    userId: user.$id,
                    action: 'team_membership_removed',
                    details: JSON.stringify({
                      type: 'team_membership',
                      operation: 'remove',
                      teamId,
                      membershipId,
                      targetUserId: userToDelete.userId,
                      targetUserEmail: userToDelete.email,
                      targetUserName: userToDelete.name,
                      administratorId: user.$id,
                      administratorEmail: user.email,
                      administratorName: user.name,
                      timestamp: new Date().toISOString()
                    })
                  }
                );
              }
            } catch (teamError: any) {
              console.warn('Failed to remove team membership:', teamError);
              teamRemovalError = teamError.message;

              // Log team membership removal failure (Requirement 1.6)
              await databases.createDocument(
                process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
                ID.unique(),
                {
                  userId: user.$id,
                  action: 'team_membership_removal_failed',
                  details: JSON.stringify({
                    type: 'team_membership',
                    operation: 'remove',
                    teamId,
                    targetUserId: userToDelete.userId,
                    targetUserEmail: userToDelete.email,
                    targetUserName: userToDelete.name,
                    error: teamError.message,
                    administratorId: user.$id,
                    administratorEmail: user.email,
                    administratorName: user.name,
                    timestamp: new Date().toISOString()
                  })
                }
              );
              // Continue with deletion even if team removal fails
            }
          }
        }

        // Only delete from Auth if deleteFromAuth flag is true
        if (deleteFromAuth) {
          try {
            // Delete user from Appwrite Auth using admin client
            const deleteAdminClient = createAdminClient();
            await deleteAdminClient.users.delete(userToDelete.userId);
            deletedFromAuth = true;
          } catch (authError: any) {
            console.warn('Failed to delete Appwrite auth user:', authError);
            authDeletionError = authError.message;
            // Continue with database deletion even if auth deletion fails
            // This handles cases where the auth user might not exist or already be deleted
          }
        }

        // Delete user from database
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          deleteId
        );

        // Log the delete action if enabled
        if (await shouldLog('userDelete')) {
          const { createUserLogDetails } = await import('@/lib/logFormatting');
          await databases.createDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            ID.unique(),
            {
              userId: user.$id,
              action: 'delete',
              details: JSON.stringify(createUserLogDetails('delete', {
                email: userToDelete.email,
                name: userToDelete.name
              }, {
                deletedFromAuth,
                deleteFromAuthRequested: deleteFromAuth,
                ...(authDeletionError && { authDeletionError }),
                removedFromTeam,
                removeFromTeamRequested: removeFromTeam,
                ...(teamRemovalError && { teamRemovalError })
              }))
            }
          );
        }

        const message = deleteFromAuth
          ? (deletedFromAuth
            ? 'User deleted successfully from both database and authentication'
            : 'User deleted from database only (authentication deletion failed)')
          : 'User unlinked from database (authentication account preserved)';

        return res.status(200).json({
          message,
          deletedFromAuth,
          deletedFromDatabase: true,
          removedFromTeam
        });

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    // Use centralized error handling (Requirement 7.1, 7.6)
    handleApiError(error, res);
  }
});
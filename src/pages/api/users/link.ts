import { NextApiRequest, NextApiResponse } from 'next';
import { ID, Query, Roles } from 'appwrite';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import { invalidateRoleUserCount } from '@/lib/roleUserCountCache';
import { executeTransactionWithRetry, handleTransactionError, TransactionOperation } from '@/lib/transactions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Create session client to verify authentication
    const { account, databases } = createSessionClient(req);
    
    // Get the authenticated user
    let user;
    try {
      user = await account.get();
    } catch (authError) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile with role
    const userDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.equal('userId', user.$id)]
    );

    if (userDocs.documents.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userProfile = userDocs.documents[0];

    // Get role if exists
    let role = null;
    if (userProfile.roleId) {
      try {
        role = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          userProfile.roleId
        );
      } catch (error) {
        console.warn('Failed to fetch role:', error);
      }
    }

    // Check if user has permission to create users (admin only)
    if (!hasPermission(role, 'users', 'create')) {
      return res.status(403).json({ error: 'Insufficient permissions to link users' });
    }

    const { userId, roleId, addToTeam = true } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Create admin client to verify auth user exists
    const adminClient = createAdminClient();

    // Verify the auth user exists
    let authUser;
    try {
      authUser = await adminClient.users.get(userId);
    } catch (error: any) {
      if (error.code === 404) {
        return res.status(404).json({ error: 'Auth user not found' });
      }
      throw error;
    }

    // Check if user is already linked to database
    const existingUserDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.equal('userId', userId)]
    );

    if (existingUserDocs.documents.length > 0) {
      return res.status(400).json({ error: 'User is already linked to database' });
    }

    // Validate role if provided
    let assignedRole = null;
    if (roleId) {
      try {
        assignedRole = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          roleId
        );
      } catch (error) {
        return res.status(400).json({ error: 'Invalid role ID' });
      }
    }

    // Generate unique ID for the user profile
    const newUserDocId = ID.unique();
    
    // Handle team membership if requested (must be done outside transaction)
    let teamMembershipStatus = null;
    let teamMembershipId: string | null = null;
    
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
          const roleMapping: Record<string, Roles[]> = {
            'Super Administrator': [Roles.Owner],
            'Event Manager': [Roles.Admin],
            'Registration Staff': [Roles.Developer],
            'Viewer': [Roles.Developer]
          };

          const teamRoles = assignedRole?.name 
            ? roleMapping[assignedRole.name] || [Roles.Developer] 
            : [Roles.Developer];

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
          teamMembershipId = membership.$id;

          console.log('[User Linking] Team membership created successfully:', membership.$id);
        } catch (teamError: any) {
          console.error('[User Linking] Failed to create team membership:', teamError);
          teamMembershipStatus = {
            status: 'failed',
            error: teamError.message || 'Unknown error'
          };
          
          // If team membership fails, we should not proceed with user linking
          // This ensures atomicity - either both succeed or both fail
          return res.status(500).json({
            error: 'Failed to create team membership',
            message: 'User linking requires team membership creation, which failed. Please try again.',
            details: teamError.message
          });
        }
      }
    }

    // Use transactions for atomic user linking
    console.log('[User Linking] Using transactions for atomic user profile + audit log creation');
      
      try {
        const { tablesDB } = createSessionClient(req);
        
        // Build transaction operations
        const operations: TransactionOperation[] = [
          // 1. Create user profile
          {
            action: 'create',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
            rowId: newUserDocId,
            data: {
              userId: authUser.$id,
              email: authUser.email,
              name: authUser.name,
              roleId: roleId || null,
              isInvited: false
            }
          },
          // 2. Create audit log for user linking
          {
            action: 'create',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            rowId: ID.unique(),
            data: {
              userId: user.$id,
              action: 'link_user',
              details: JSON.stringify({
                type: 'user_linked',
                linkedUserId: authUser.$id,
                email: authUser.email,
                name: authUser.name,
                roleId: roleId,
                teamMembershipRequested: addToTeam,
                teamMembershipStatus: teamMembershipStatus?.status || null,
                teamMembershipId: teamMembershipId,
                usedTransactions: true,
                timestamp: new Date().toISOString()
              })
            }
          }
        ];

        // Add team membership log if it was attempted
        if (teamMembershipStatus) {
          operations.push({
            action: 'create',
            databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            tableId: process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            rowId: ID.unique(),
            data: {
              userId: user.$id,
              action: teamMembershipStatus.status === 'success' 
                ? 'team_membership_created' 
                : 'team_membership_failed',
              details: JSON.stringify({
                type: 'team_membership',
                operation: 'create',
                teamId: teamMembershipStatus.status === 'success' 
                  ? (teamMembershipStatus as any).teamId 
                  : process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID,
                membershipId: teamMembershipId,
                targetUserId: authUser.$id,
                targetUserEmail: authUser.email,
                targetUserName: authUser.name,
                teamRoles: teamMembershipStatus.status === 'success' 
                  ? (teamMembershipStatus as any).roles 
                  : undefined,
                error: teamMembershipStatus.status === 'failed' 
                  ? (teamMembershipStatus as any).error 
                  : undefined,
                administratorId: user.$id,
                administratorEmail: user.email,
                administratorName: user.name,
                usedTransactions: true,
                timestamp: new Date().toISOString()
              })
            }
          });
        }

        // Execute transaction with retry logic
        await executeTransactionWithRetry(tablesDB, operations);

        console.log('[User Linking] Transaction completed successfully');

        // Invalidate cache for the assigned role
        if (roleId) {
          invalidateRoleUserCount(roleId);
        }

        // Return success response
        const responseData: any = {
          success: true,
          usedTransactions: true,
          user: {
            id: newUserDocId,
            userId: authUser.$id,
            email: authUser.email,
            name: authUser.name,
            roleId: roleId || null,
            isInvited: false,
            role: assignedRole ? {
              id: assignedRole.$id,
              name: assignedRole.name,
              description: assignedRole.description,
              permissions: assignedRole.permissions
            } : null
          }
        };

        // Add team membership status if it was attempted
        if (teamMembershipStatus) {
          responseData.teamMembership = teamMembershipStatus;
        }

        return res.status(201).json(responseData);

      } catch (error: any) {
        console.error('[User Linking] Transaction failed:', error);
        
        // If transaction fails and we created team membership, we should clean it up
        if (teamMembershipId) {
          try {
            const teamId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_TEAM_ID;
            if (teamId) {
              await adminClient.teams.deleteMembership({
                teamId,
                membershipId: teamMembershipId
              });
              console.log('[User Linking] Cleaned up team membership after transaction failure');
            }
          } catch (cleanupError) {
            console.error('[User Linking] Failed to cleanup team membership:', cleanupError);
          }
        }
        
        return handleTransactionError(error, res);
      }

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

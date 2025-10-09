import { NextApiRequest, NextApiResponse } from 'next';
import { ID, Query } from 'appwrite';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { hasPermission } from '@/lib/permissions';
import { invalidateRoleUserCount } from '@/lib/roleUserCountCache';

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

    // Create user profile in database
    const newUserDoc = await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      ID.unique(),
      {
        userId: authUser.$id,
        email: authUser.email,
        name: authUser.name,
        roleId: roleId || null,
        isInvited: false
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

          const teamRoles = assignedRole?.name 
            ? roleMapping[assignedRole.name] || ['member'] 
            : ['member'];

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

          // Log team membership creation
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

          // Log team membership failure
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

    // Send notification email to user about access granted
    try {
      // Note: Appwrite doesn't have a built-in email notification system
      // You would need to integrate with an email service here
      // For now, we'll just log that an email should be sent
      console.log(`TODO: Send notification email to ${authUser.email} about access granted`);
    } catch (emailError) {
      console.warn('Failed to send notification email:', emailError);
      // Don't fail the linking if email fails
    }

    // Create log entry for linking action
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
      ID.unique(),
      {
        userId: user.$id,
        action: 'link_user',
        details: JSON.stringify({
          type: 'user_linked',
          linkedUserId: authUser.$id,
          email: authUser.email,
          name: authUser.name,
          roleId: roleId,
          teamMembershipRequested: addToTeam,
          teamMembershipStatus: teamMembershipStatus?.status || null
        })
      }
    );

    // Return the created user profile
    const responseData: any = {
      success: true,
      user: {
        id: newUserDoc.$id,
        userId: newUserDoc.userId,
        email: newUserDoc.email,
        name: newUserDoc.name,
        roleId: newUserDoc.roleId,
        isInvited: newUserDoc.isInvited,
        createdAt: newUserDoc.$createdAt,
        updatedAt: newUserDoc.$updatedAt,
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
    console.error('API Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

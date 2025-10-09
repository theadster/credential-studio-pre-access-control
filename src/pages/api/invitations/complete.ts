import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { token, appwriteUserId } = req.body;

    if (!token || !appwriteUserId) {
      return res.status(400).json({ error: 'Token and Appwrite user ID are required' });
    }

    // Create admin client
    const { databases } = createAdminClient();

    // Find the invitation by token
    const invitationDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
      [Query.equal('token', token)]
    );

    if (invitationDocs.documents.length === 0) {
      return res.status(404).json({ error: 'Invalid invitation token' });
    }

    const invitation = invitationDocs.documents[0];

    // Check if invitation has expired
    if (new Date(invitation.expiresAt) < new Date()) {
      return res.status(400).json({ error: 'Invitation has expired' });
    }

    // Check if invitation has already been used
    if (invitation.usedAt) {
      return res.status(400).json({ error: 'Invitation has already been used' });
    }

    // Get the user associated with the invitation
    const userDocs = await databases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      [Query.equal('userId', invitation.userId)]
    );

    if (userDocs.documents.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userDocs.documents[0];

    // Check if user is still in invited status
    if (!user.isInvited) {
      return res.status(400).json({ error: 'User is no longer in invited status' });
    }

    // Update the user record with the Appwrite user ID and mark as no longer invited
    // Mark the invitation as used
    await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
      invitation.$id,
      {
        usedAt: new Date().toISOString()
      }
    );

    // Update the user record with the Appwrite user ID and mark as no longer invited
    const updatedUser = await databases.updateDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      user.$id,
      {
        userId: appwriteUserId,
        isInvited: false
      }
    );

    // Get role if exists
    let role = null;
    if (updatedUser.roleId) {
      try {
        role = await databases.getDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
          updatedUser.roleId
        );
      } catch (error) {
        console.warn('Role not found:', updatedUser.roleId);
        // Continue without role data
      }
    }

    // Log the completion
    await databases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
      ID.unique(),
      {
        userId: appwriteUserId,
        action: 'complete_invitation',
        details: JSON.stringify({
          type: 'invitation_completed',
          originalUserId: invitation.userId,
          email: updatedUser.email
        })
      }
    );

    return res.status(200).json({
      success: true,
      user: {
        ...updatedUser,
        role
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
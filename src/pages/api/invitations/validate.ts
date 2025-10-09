import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/appwrite';
import { Query } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Validate required environment variables
    const databaseId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID;
    const invitationsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID;
    const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID;
    const rolesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID;

    if (!databaseId || !invitationsCollectionId || !usersCollectionId || !rolesCollectionId) {
      console.error('Missing required environment variables for invitations API');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invitation token is required' });
    }

    // Create admin client (no auth required for validation)
    const { databases } = createAdminClient();

    // Find the invitation by token
    const invitationDocs = await databases.listDocuments(
      databaseId,
      invitationsCollectionId,
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
      databaseId,
      usersCollectionId,
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

    // Get role if exists
    let role = null;
    if (user.roleId) {
      role = await databases.getDocument(
        databaseId,
        rolesCollectionId,
        user.roleId
      );
    }

    return res.status(200).json({
      valid: true,
      user: {
        id: user.userId,
        email: user.email,
        name: user.name,
        role: role
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
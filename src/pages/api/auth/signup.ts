import { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { email, password, name, invitationToken } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Create admin client for database operations
    const { databases, users } = createAdminClient();

    // If invitation token is provided, validate it
    let invitation = null;
    let userProfile = null;
    
    if (invitationToken) {
      // Find the invitation by token
      const invitationDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
        [Query.equal('token', invitationToken)]
      );

      if (invitationDocs.documents.length === 0) {
        return res.status(404).json({ error: 'Invalid invitation token' });
      }

      invitation = invitationDocs.documents[0];

      // Check if invitation has expired
      if (new Date(invitation.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Invitation has expired' });
      }

      // Check if invitation has already been used
      if (invitation.usedAt) {
        return res.status(400).json({ error: 'Invitation has already been used' });
      }

      // Get the user profile associated with the invitation
      const userDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('userId', invitation.userId)]
      );

      if (userDocs.documents.length === 0) {
        return res.status(404).json({ error: 'User profile not found for invitation' });
      }

      userProfile = userDocs.documents[0];

      // Verify the email matches
      if (userProfile.email.toLowerCase() !== email.toLowerCase()) {
        return res.status(400).json({ error: 'Email does not match invitation' });
      }

      // Check if user is still in invited status
      if (!userProfile.isInvited) {
        return res.status(400).json({ error: 'User is no longer in invited status' });
      }
    } else {
      // For non-invited signups, check if user already exists in database
      const existingUserDocs = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        [Query.equal('email', email)]
      );

      if (existingUserDocs.documents.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }
    }

    try {
      // Create user in Appwrite Auth
      const authUser = await users.create(
        ID.unique(),
        email,
        undefined, // phone
        password,
        name
      );

      // If this is an invitation signup, update the existing user profile
      if (invitation && userProfile) {
        // Update the user profile with the real Appwrite user ID
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          userProfile.$id,
          {
            userId: authUser.$id,
            name: name, // Update name in case it changed
            isInvited: false
          }
        );

        // Mark the invitation as used
        await databases.updateDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
          invitation.$id,
          {
            usedAt: new Date().toISOString()
          }
        );

        // Log the invitation completion
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: authUser.$id,
            action: 'complete_invitation',
            details: JSON.stringify({
              type: 'invitation_signup',
              email: email,
              invitationToken: invitationToken
            })
          }
        );
      } else {
        // Create new user profile in database for non-invited signups
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: authUser.$id,
            email: email,
            name: name,
            roleId: null, // No role assigned for self-signup
            isInvited: false
          }
        );

        // Log the signup
        await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: authUser.$id,
            action: 'signup',
            details: JSON.stringify({
              type: 'self_signup',
              email: email
            })
          }
        );
      }

      return res.status(200).json({
        success: true,
        user: {
          id: authUser.$id,
          email: authUser.email,
          name: authUser.name
        }
      });

    } catch (authError: any) {
      console.error('Error creating user:', authError);
      
      // Check for duplicate email in auth system
      if (authError.code === 409 || authError.message?.includes('already exists')) {
        return res.status(400).json({ 
          error: 'A user with this email already exists' 
        });
      }
      
      // Check for invalid password
      if (authError.code === 400 && authError.message?.includes('password')) {
        return res.status(400).json({ 
          error: 'Password must be at least 8 characters long' 
        });
      }
      
      return res.status(500).json({ 
        error: 'Failed to create user account',
        details: authError.message
      });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
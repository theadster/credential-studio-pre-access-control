import { NextApiResponse } from 'next';
import { randomUUID } from 'crypto';
import { createSessionClient } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    // User and userProfile are already attached by middleware
    const { user } = req;
    const { databases } = createSessionClient(req);

    switch (req.method) {
      case 'GET':
        // List invitations
        const invitations = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
          [Query.orderDesc('$createdAt')]
        );

        return res.status(200).json(invitations.documents);

      case 'POST':
        const { userId } = req.body;

        if (!userId) {
          return res.status(400).json({ error: 'User ID is required' });
        }

        // Check if user exists and is invited
        const invitedUserDocs = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
          [Query.equal('userId', userId)]
        );

        if (invitedUserDocs.documents.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        const invitedUser = invitedUserDocs.documents[0];

        if (!invitedUser.isInvited) {
          return res.status(400).json({ error: 'User is not in invited status' });
        }

        // Generate invitation token
        const invitationToken = randomUUID();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // Token expires in 7 days

        // Create invitation record
        const invitation = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_INVITATIONS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: userId,
            token: invitationToken,
            expiresAt: expiresAt.toISOString(),
            createdBy: user.$id
          }
        );

        // Generate invitation URL
        const invitationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?invitation=${invitationToken}`;

        // Log the invitation creation
        if (await shouldLog('userInvite')) {
          try {
            await databases.createDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
              ID.unique(),
              {
                userId: user.$id,
                action: 'create',
                details: JSON.stringify({
                  type: 'invitation',
                  invitedUserEmail: invitedUser.email,
                  invitedUserName: invitedUser.name,
                  expiresAt: expiresAt.toISOString()
                })
              }
            );
          } catch (logError) {
            console.error('[invitations] Failed to create log entry, but continuing with request', {
              error: logError instanceof Error ? logError.message : 'Unknown error',
              errorType: (logError as any)?.type,
              userId: user.$id,
              invitedUserEmail: invitedUser.email
            });
            // Do not re-throw - allow the request to succeed even if logging fails
          }
        }

        return res.status(201).json({
          invitation,
          invitationUrl
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('API Error:', error);

    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    return res.status(500).json({ error: 'Internal server error' });
  }
});
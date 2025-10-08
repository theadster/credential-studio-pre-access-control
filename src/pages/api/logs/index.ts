import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { shouldLog } from '@/lib/logSettings';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and userProfile are already attached by middleware
  const { user } = req;
  const { databases } = createSessionClient(req);

    switch (req.method) {
      case 'GET':
        const { page = '1', limit = '50', action: actionFilter, userId: filterUserId } = req.query;
        
        const pageNum = parseInt(page as string);
        const limitNum = parseInt(limit as string);
        const skip = (pageNum - 1) * limitNum;

        // Build queries array
        const queries: string[] = [];
        
        // Add filters
        if (actionFilter && actionFilter !== 'all') {
          queries.push(Query.equal('action', actionFilter as string));
        }
        if (filterUserId && filterUserId !== 'all') {
          queries.push(Query.equal('userId', filterUserId as string));
        }
        
        // Add sorting
        queries.push(Query.orderDesc('$createdAt'));
        
        // Add pagination
        queries.push(Query.limit(limitNum));
        queries.push(Query.offset(skip));

        // Fetch logs from Appwrite
        const logsResponse = await databases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          queries
        );

        // Fetch related user and attendee data for each log
        const logsWithRelations = await Promise.all(
          logsResponse.documents.map(async (log) => {
            let userDoc = null;
            let attendeeDoc = null;

            // Fetch user if userId exists
            if (log.userId) {
              try {
                const userDocs = await databases.listDocuments(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
                  [Query.equal('userId', log.userId)]
                );
                if (userDocs.documents.length > 0) {
                  const user = userDocs.documents[0];
                  userDoc = {
                    id: user.userId,
                    email: user.email,
                    name: user.name
                  };
                }
              } catch (error) {
                console.error('Error fetching user for log:', error);
              }
            }

            // Fetch attendee if attendeeId exists
            if (log.attendeeId) {
              try {
                attendeeDoc = await databases.getDocument(
                  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
                  process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
                  log.attendeeId
                );
                attendeeDoc = {
                  id: attendeeDoc.$id,
                  firstName: attendeeDoc.firstName,
                  lastName: attendeeDoc.lastName
                };
              } catch (error) {
                console.error('Error fetching attendee for log:', error);
              }
            }

            // Parse details JSON
            let details = {};
            try {
              details = log.details ? JSON.parse(log.details) : {};
            } catch (error) {
              console.error('Error parsing log details:', error);
              details = {};
            }

            return {
              id: log.$id,
              userId: log.userId,
              attendeeId: log.attendeeId,
              action: log.action,
              details,
              createdAt: log.$createdAt,
              user: userDoc,
              attendee: attendeeDoc
            };
          })
        );

        // Get total count for pagination (without limit/offset)
        const countQueries: string[] = [];
        if (actionFilter && actionFilter !== 'all') {
          countQueries.push(Query.equal('action', actionFilter as string));
        }
        if (filterUserId && filterUserId !== 'all') {
          countQueries.push(Query.equal('userId', filterUserId as string));
        }
        
        const totalCount = logsResponse.total;
        const totalPages = Math.ceil(totalCount / limitNum);

        return res.status(200).json({
          logs: logsWithRelations,
          pagination: {
            page: pageNum,
            limit: limitNum,
            totalCount,
            totalPages,
            hasNext: pageNum < totalPages,
            hasPrev: pageNum > 1
          }
        });

      case 'POST':
        // Create a new log entry (usually called internally by other API routes)
        const { action, attendeeId, details, userId: requestUserId } = req.body;

        if (!action) {
          return res.status(400).json({ error: 'Action is required' });
        }

        // Check if this action should be logged based on settings
        const settingKey = action.replace('_', '');
        if (!(await shouldLog(settingKey))) {
          // Return success but don't actually log
          return res.status(201).json({ message: 'Logging disabled for this action' });
        }

        // For authentication events, use the userId from the request body if provided
        // Otherwise, use the authenticated user's ID
        const logUserId = requestUserId || user.$id;

        // Create log document in Appwrite
        const newLog = await databases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            userId: logUserId,
            attendeeId: attendeeId || null,
            action,
            details: JSON.stringify(details || {})
          }
        );

        // Fetch related user and attendee data
        let userDoc = null;
        let attendeeDoc = null;

        if (newLog.userId) {
          try {
            const userDocs = await databases.listDocuments(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
              [Query.equal('userId', newLog.userId)]
            );
            if (userDocs.documents.length > 0) {
              const user = userDocs.documents[0];
              userDoc = {
                id: user.userId,
                email: user.email,
                name: user.name
              };
            }
          } catch (error) {
            console.error('Error fetching user for new log:', error);
          }
        }

        if (newLog.attendeeId) {
          try {
            attendeeDoc = await databases.getDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!,
              newLog.attendeeId
            );
            attendeeDoc = {
              id: attendeeDoc.$id,
              firstName: attendeeDoc.firstName,
              lastName: attendeeDoc.lastName
            };
          } catch (error) {
            console.error('Error fetching attendee for new log:', error);
          }
        }

        // Parse details JSON
        let parsedDetails = {};
        try {
          parsedDetails = newLog.details ? JSON.parse(newLog.details) : {};
        } catch (error) {
          console.error('Error parsing log details:', error);
        }

        return res.status(201).json({
          id: newLog.$id,
          userId: newLog.userId,
          attendeeId: newLog.attendeeId,
          action: newLog.action,
          details: parsedDetails,
          createdAt: newLog.$createdAt,
          user: userDoc,
          attendee: attendeeDoc
        });

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
});
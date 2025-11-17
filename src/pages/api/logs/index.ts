import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { shouldLog } from '@/lib/logSettings';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { logger } from '@/lib/logger';

/**
 * Enriches a log document with related user and attendee data
 */
async function enrichLogWithRelations(
  log: any,
  databases: any,
  dbId: string,
  usersCollectionId: string,
  attendeesCollectionId: string
) {
  let userDoc = null;
  let attendeeDoc = null;

  // Fetch user if userId exists
  if (log.userId) {
    try {
      const userDocs = await databases.listDocuments(
        dbId,
        usersCollectionId,
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
        dbId,
        attendeesCollectionId,
        log.attendeeId
      );
      attendeeDoc = {
        id: attendeeDoc.$id,
        firstName: attendeeDoc.firstName,
        lastName: attendeeDoc.lastName
      };
    } catch (error: any) {
      // Attendee may have been deleted - this is expected and not an error
      if (error.code === 404) {
        // Silently handle deleted attendees - logs should persist even after attendee deletion
        attendeeDoc = null;
      } else {
        // Log unexpected errors
        console.error('Error fetching attendee for log:', error);
      }
    }
  }

  // Parse details JSON safely
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
    timestamp: log.timestamp || log.$createdAt, // Use operator-managed timestamp if available, fallback to $createdAt
    user: userDoc,
    attendee: attendeeDoc
  };
}

/**
 * GET handler - Fetch logs with pagination and filtering
 * Requires authentication via withAuth middleware
 */
async function handleGet(req: AuthenticatedRequest, res: NextApiResponse) {
  const { databases: getDatabases } = createSessionClient(req);
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

  // Add sorting - use $createdAt for reliable ordering across all logs
  // This ensures both old logs (pre-operator) and new logs (post-operator) are sorted correctly
  queries.push(Query.orderDesc('$createdAt'));

  // Add pagination
  queries.push(Query.limit(limitNum));
  queries.push(Query.offset(skip));

  // Fetch logs from Appwrite
  const logsResponse = await getDatabases.listDocuments(
    process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
    process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
    queries
  );

  // Fetch related user and attendee data for each log
  const logsWithRelations = await Promise.all(
    logsResponse.documents.map(log =>
      enrichLogWithRelations(
        log,
        getDatabases,
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!
      )
    )
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
}

/**
 * POST handler - Create a new log entry
 * Allows unauthenticated requests for auth events (login/logout)
 * Requires authentication for other log types
 */
async function handlePost(req: AuthenticatedRequest, res: NextApiResponse) {
  try {
    // Create a new log entry (usually called internally by other API routes)
    const { action, attendeeId, details, userId: requestUserId } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    logger.info('[Logs API] POST request received', { action, userId: requestUserId });

    // Check if this action should be logged based on settings
    // Convert action name to camelCase setting key (e.g., 'AUTH_LOGIN' -> 'authLogin')
    // Normalize to lowercase first to handle uppercase actions like 'AUTH_LOGIN'
    const normalizedAction = action.toLowerCase().trim();
    const settingKey = normalizedAction.replace(/_([a-z])/g, (_match: string, letter: string) => letter.toUpperCase());
    
    logger.debug('[Logs API] Checking if should log', { action, settingKey });

    if (!(await shouldLog(settingKey))) {
      // Return success but don't actually log
      logger.info('[Logs API] Logging disabled for action', { action });
      return res.status(201).json({ message: 'Logging disabled for this action' });
    }

    // For authentication events (login/logout), use admin client since user may not be authenticated yet
    // For other events, use session client with authenticated user
    const isAuthEvent = action === 'auth_login' || action === 'auth_logout';
    let postDatabases;
    let logUserId;

    logger.debug('[Logs API] Determining client type', { action, isAuthEvent });

    if (isAuthEvent) {
      // Use admin client for auth events (user may not be authenticated yet during login)
      const { createAdminClient } = await import('@/lib/appwrite');
      const adminClient = createAdminClient();
      postDatabases = adminClient.databases;
      
      // For auth events, userId MUST be provided in request body
      if (!requestUserId) {
        logger.error('[Logs API] Missing userId for auth event', { action });
        return res.status(400).json({ error: 'userId is required for authentication events' });
      }
      logUserId = requestUserId;
    } else {
      // Use session client for non-auth events (requires authentication)
      if (!req.user) {
        logger.error('[Logs API] Unauthorized - no user for non-auth event', { action });
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const { databases: sessionDatabases } = createSessionClient(req);
      postDatabases = sessionDatabases;
      logUserId = requestUserId || req.user.$id;
    }

    logger.debug('[Logs API] Creating log document', { action, hasAttendeeId: !!attendeeId });

    // Create log document in Appwrite with timestamp
    // Note: For auth events using admin client, we can't use operators (no TablesDB proxy)
    // So we use a regular ISO timestamp instead
    const newLog = await postDatabases.createDocument(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
      ID.unique(),
      {
        userId: logUserId,
        attendeeId: attendeeId || null,
        action,
        details: JSON.stringify(details || {}),
        timestamp: new Date().toISOString() // Use ISO timestamp (works with both admin and session clients)
      }
    );

    logger.debug('[Logs API] Log document created', { action, logId: newLog.$id });

    // Enrich the new log with related user and attendee data
    const enrichedLog = await enrichLogWithRelations(
      newLog,
      postDatabases,
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!
    );

    logger.info('[Logs API] Log created successfully', { action, logId: enrichedLog.id });

    return res.status(201).json(enrichedLog);
  } catch (error) {
    logger.error('[Logs API] Error in POST handler', {
      error: error instanceof Error ? error.message : 'Unknown error',
      action: req.body?.action
    });
    return res.status(500).json({ 
      error: 'Failed to create log',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Main API route handler
 * Routes requests to appropriate handler based on method
 * GET requests require authentication via withAuth middleware
 * POST requests handle authentication internally (for auth events)
 */
export default async (req: AuthenticatedRequest, res: NextApiResponse) => {
  try {
    if (req.method === 'GET') {
      return withAuth(handleGet)(req, res);
    }
    
    if (req.method === 'POST') {
      return handlePost(req, res);
    }
    
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error) {
    logger.error('[Logs API] Unhandled error', {
      method: req.method,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
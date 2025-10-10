import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';
import { shouldLog } from '@/lib/logSettings';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create session client for authentication
    const { account, databases: sessionDatabases } = createSessionClient(req);

    // Verify authentication
    const user = await account.get();

    // Get user profile with role using session client
    const userDocs = await sessionDatabases.listDocuments(
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
      role = await sessionDatabases.getDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!,
        userProfile.roleId
      );

      // Parse permissions JSON
      try {
        role.permissions = JSON.parse(role.permissions);
      } catch (error) {
        console.error('Error parsing role permissions:', error);
        role.permissions = {};
      }
    }

    // Create admin client for bulk deletions (no rate limits)
    const { databases: adminDatabases } = createAdminClient();

    // Check permissions for log deletion
    if (!hasPermission(role, 'logs', 'delete')) {
      return res.status(403).json({ error: 'Insufficient permissions to delete logs' });
    }

    const { beforeDate, action, userId } = req.body;

    // Build queries array based on provided filters
    const queries: string[] = [];

    if (beforeDate) {
      queries.push(Query.lessThan('$createdAt', new Date(beforeDate).toISOString()));
    }

    if (action) {
      queries.push(Query.equal('action', action));
    }

    if (userId) {
      queries.push(Query.equal('userId', userId));
    }

    // First, get a count of logs to be deleted
    const countResponse = await adminDatabases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
      [...queries, Query.limit(1)]
    );
    const totalToDelete = countResponse.total;
    
    console.log(`[Delete Logs] Found ${totalToDelete} logs matching criteria`);

    // Process and delete logs in batches to avoid memory issues
    // Slow down to avoid rate limiting (similar to client SDK approach)
    let deletedCount = 0;
    let totalProcessed = 0;
    const errors: any[] = [];
    let offset = 0;
    const batchSize = 25; // Smaller batch size to reduce rate limit pressure
    const delayBetweenDeletions = 100; // 100ms delay between each deletion (10 per second)

    while (true) {
      const batchQueries = [...queries, Query.limit(batchSize), Query.offset(offset)];
      const logsResponse = await adminDatabases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        batchQueries
      );

      const currentBatch = logsResponse.documents;

      if (currentBatch.length === 0) {
        break; // No more documents to process
      }

      totalProcessed += currentBatch.length;

      // Delete documents one at a time with delay to avoid rate limiting
      for (const log of currentBatch) {
        try {
          await adminDatabases.deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            log.$id
          );
          deletedCount++;
          
          // Delay between deletions to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, delayBetweenDeletions));
        } catch (error: any) {
          console.error(`Error deleting log ${log.$id}:`, error);
          
          // If rate limited, wait longer before continuing
          if (error.code === 429) {
            console.log('Rate limit detected, waiting 3 seconds before continuing...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            errors.push({ id: log.$id, error: error.message, rateLimited: true });
          } else {
            errors.push({ id: log.$id, error: error.message });
          }
        }
      }

      // Check if we've processed all documents
      if (currentBatch.length < batchSize) {
        break; // Last batch processed
      }

      // Delay between batches
      console.log(`Processed batch of ${currentBatch.length} logs. Total: ${totalProcessed}. Continuing...`);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Continue with next batch (offset stays at 0 since we're deleting documents)
      // Note: After deletion, the next batch will be at offset 0
      offset = 0;
    }

    // Log this deletion activity using admin client
    try {
      // Log the delete action if enabled
      if (await shouldLog('logsDelete')) {
        const { createDeleteLogsDetails } = await import('@/lib/logFormatting');
        const logDetails = createDeleteLogsDetails(
          deletedCount,
          { beforeDate, action, userId },
          {
            totalProcessed,
            errorCount: errors.length,
            ...(errors.length > 0 && { errors })
          }
        );

        await adminDatabases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            action: 'delete_logs',
            userId: user.$id,
            attendeeId: null,
            details: JSON.stringify(logDetails)
          }
        );
      }
    } catch (logError: any) {
      console.error('Failed to log deletion activity:', logError);
      // Continue with response even if logging fails
    }

    res.status(200).json({
      success: true,
      deletedCount,
      totalProcessed,
      totalToDelete,
      message: `Successfully deleted ${deletedCount} of ${totalToDelete} log entries`,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Error deleting logs:', error);
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Failed to delete logs' });
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';
import { shouldLog } from '@/lib/logSettings';

// Background deletion function (runs after response is sent)
async function performBackgroundDeletion(
  adminDatabases: any,
  queries: string[],
  userId: string,
  filters: { beforeDate?: string; action?: string; userId?: string }
) {
  let deletedCount = 0;
  let totalProcessed = 0;
  const errors: any[] = [];
  const batchSize = 50; // Larger batches for faster processing
  const delayBetweenDeletions = 50; // Faster deletions (20 per second)

  try {
    while (true) {
      const batchQueries = [...queries, Query.limit(batchSize), Query.offset(0)];
      const logsResponse = await adminDatabases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        batchQueries
      );

      const currentBatch = logsResponse.documents;

      if (currentBatch.length === 0) {
        break;
      }

      totalProcessed += currentBatch.length;

      for (const log of currentBatch) {
        try {
          await adminDatabases.deleteDocument(
            process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
            process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
            log.$id
          );
          deletedCount++;
          await new Promise(resolve => setTimeout(resolve, delayBetweenDeletions));
        } catch (error: any) {
          console.error(`Error deleting log ${log.$id}:`, error);
          if (error.code === 429) {
            console.log('Rate limit detected, waiting 3 seconds...');
            await new Promise(resolve => setTimeout(resolve, 3000));
            errors.push({ id: log.$id, error: error.message, rateLimited: true });
          } else {
            errors.push({ id: log.$id, error: error.message });
          }
        }
      }

      if (currentBatch.length < batchSize) {
        break;
      }

      console.log(`Processed batch of ${currentBatch.length} logs. Total: ${totalProcessed}. Continuing...`);
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Log completion
    console.log(`[Background Deletion] Completed: ${deletedCount} deleted, ${errors.length} errors`);

    // Log the deletion activity
    try {
      if (await shouldLog('logsDelete')) {
        const { createDeleteLogsDetails } = await import('@/lib/logFormatting');
        const logDetails = createDeleteLogsDetails(
          deletedCount,
          filters,
          {
            totalProcessed,
            errorCount: errors.length,
            backgroundJob: true,
            ...(errors.length > 0 && { errors: errors.slice(0, 10) }) // Limit error details
          }
        );

        await adminDatabases.createDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          ID.unique(),
          {
            action: 'delete_logs',
            userId: userId,
            attendeeId: null,
            details: JSON.stringify(logDetails)
          }
        );
      }
    } catch (logError: any) {
      console.error('Failed to log deletion activity:', logError);
    }
  } catch (error: any) {
    console.error('[Background Deletion] Fatal error:', error);
  }
}

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

    // Get count of logs to be deleted
    const countResponse = await adminDatabases.listDocuments(
      process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
      process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
      [...queries, Query.limit(1)]
    );
    const totalToDelete = countResponse.total;
    
    console.log(`[Delete Logs] Found ${totalToDelete} logs matching criteria`);

    // For small deletions (< 100), process synchronously
    if (totalToDelete < 100) {
      let deletedCount = 0;
      const errors: any[] = [];
      const batchSize = 50;

      while (true) {
        const batchQueries = [...queries, Query.limit(batchSize), Query.offset(0)];
        const logsResponse = await adminDatabases.listDocuments(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          batchQueries
        );

        const currentBatch = logsResponse.documents;
        if (currentBatch.length === 0) break;

        for (const log of currentBatch) {
          try {
            await adminDatabases.deleteDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
              log.$id
            );
            deletedCount++;
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error: any) {
            console.error(`Error deleting log ${log.$id}:`, error);
            errors.push({ id: log.$id, error: error.message });
          }
        }

        if (currentBatch.length < batchSize) break;
      }

      // Log the deletion
      if (await shouldLog('logsDelete')) {
        const { createDeleteLogsDetails } = await import('@/lib/logFormatting');
        const logDetails = createDeleteLogsDetails(
          deletedCount,
          { beforeDate, action, userId },
          { errorCount: errors.length }
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

      return res.status(200).json({
        success: true,
        deletedCount,
        totalToDelete,
        message: `Successfully deleted ${deletedCount} of ${totalToDelete} log entries`,
        errors: errors.length > 0 ? errors : undefined
      });
    }

    // For large deletions (>= 100), start background job and return immediately
    console.log(`[Delete Logs] Starting background deletion for ${totalToDelete} logs`);
    
    // Start background deletion (don't await)
    performBackgroundDeletion(adminDatabases, queries, user.$id, { beforeDate, action, userId })
      .catch(error => console.error('[Background Deletion] Error:', error));

    // Return immediately
    res.status(202).json({
      success: true,
      totalToDelete,
      message: `Deletion of ${totalToDelete} log entries has been started in the background. This may take several minutes to complete.`,
      backgroundJob: true
    });

  } catch (error: any) {
    console.error('Error deleting logs:', error);
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.status(500).json({ error: 'Failed to delete logs' });
  }
}
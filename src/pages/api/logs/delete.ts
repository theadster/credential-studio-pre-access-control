import { NextApiRequest, NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { hasPermission } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create session client
    const { account, databases } = createSessionClient(req);

    // Verify authentication
    const user = await account.get();

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
      role = await databases.getDocument(
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

    // Process and delete logs in batches to avoid memory issues
    // Fetch each batch and immediately delete it instead of accumulating
    let deletedCount = 0;
    let totalProcessed = 0;
    const errors: any[] = [];
    let offset = 0;
    const batchSize = 100;
    const deletionConcurrency = 10; // Process deletions in parallel batches

    while (true) {
      const batchQueries = [...queries, Query.limit(batchSize), Query.offset(offset)];
      const logsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        batchQueries
      );

      const currentBatch = logsResponse.documents;

      if (currentBatch.length === 0) {
        break; // No more documents to process
      }

      totalProcessed += currentBatch.length;

      // Delete current batch with controlled concurrency
      for (let i = 0; i < currentBatch.length; i += deletionConcurrency) {
        const chunk = currentBatch.slice(i, i + deletionConcurrency);
        const deletePromises = chunk.map(async (log) => {
          try {
            await databases.deleteDocument(
              process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
              process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
              log.$id
            );
            return { success: true };
          } catch (error: any) {
            console.error(`Error deleting log ${log.$id}:`, error);
            return { success: false, id: log.$id, error: error.message };
          }
        });

        const results = await Promise.all(deletePromises);

        // Count successes and collect errors
        results.forEach((result) => {
          if (result.success) {
            deletedCount++;
          } else {
            errors.push({ id: result.id, error: result.error });
          }
        });
      }

      // Check if we've processed all documents
      if (currentBatch.length < batchSize) {
        break; // Last batch processed
      }

      // Continue with next batch (offset stays at 0 since we're deleting documents)
      // Note: After deletion, the next batch will be at offset 0
      offset = 0;
    }

    // Log this deletion activity
    try {
      await databases.createDocument(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        ID.unique(),
        {
          action: 'delete_logs',
          userId: user.$id,
          attendeeId: null,
          details: JSON.stringify({
            type: 'logs',
            filters: { beforeDate, action, userId },
            deletedCount,
            totalProcessed,
            errors: errors.length > 0 ? errors : undefined
          })
        }
      );
    } catch (logError: any) {
      console.error('Failed to log deletion activity:', logError);
      // Continue with response even if logging fails
    }

    res.status(200).json({
      success: true,
      deletedCount,
      totalProcessed,
      message: `Successfully deleted ${deletedCount} of ${totalProcessed} log entries`,
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
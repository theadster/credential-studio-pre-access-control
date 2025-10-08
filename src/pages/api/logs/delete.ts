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

    // Fetch all logs that match the criteria
    // Note: We need to fetch in batches since Appwrite has a limit
    let allLogsToDelete: any[] = [];
    let hasMore = true;
    let offset = 0;
    const batchSize = 100;

    while (hasMore) {
      const batchQueries = [...queries, Query.limit(batchSize), Query.offset(offset)];
      const logsResponse = await databases.listDocuments(
        process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
        process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
        batchQueries
      );

      allLogsToDelete = allLogsToDelete.concat(logsResponse.documents);
      
      if (logsResponse.documents.length < batchSize) {
        hasMore = false;
      } else {
        offset += batchSize;
      }
    }

    const logsToDeleteCount = allLogsToDelete.length;

    // Delete the logs one by one
    let deletedCount = 0;
    const errors: any[] = [];

    for (const log of allLogsToDelete) {
      try {
        await databases.deleteDocument(
          process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!,
          process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!,
          log.$id
        );
        deletedCount++;
      } catch (error: any) {
        console.error(`Error deleting log ${log.$id}:`, error);
        errors.push({ id: log.$id, error: error.message });
      }
    }

    // Log this deletion activity
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
          expectedCount: logsToDeleteCount,
          errors: errors.length > 0 ? errors : undefined
        })
      }
    );

    res.status(200).json({ 
      success: true, 
      deletedCount,
      message: `Successfully deleted ${deletedCount} log entries`,
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
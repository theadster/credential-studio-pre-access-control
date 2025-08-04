import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user profile with role
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check permissions for log deletion
    if (!hasPermission(userProfile.role, 'logs', 'delete')) {
      return res.status(403).json({ error: 'Insufficient permissions to delete logs' });
    }

    const { beforeDate, action, userId } = req.body;

    // Build the where clause based on provided filters
    const whereClause: any = {};

    if (beforeDate) {
      whereClause.createdAt = {
        lt: new Date(beforeDate)
      };
    }

    if (action) {
      whereClause.action = action;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    // Count logs that will be deleted for logging purposes
    const logsToDelete = await prisma.log.count({
      where: whereClause
    });

    // Delete the logs
    const deletedLogs = await prisma.log.deleteMany({
      where: whereClause
    });

    // Log this deletion activity
    await prisma.log.create({
      data: {
        action: 'delete_logs',
        userId: userProfile.id,
        details: {
          type: 'logs',
          filters: { beforeDate, action, userId },
          deletedCount: deletedLogs.count,
          expectedCount: logsToDelete
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      deletedCount: deletedLogs.count,
      message: `Successfully deleted ${deletedLogs.count} log entries`
    });

  } catch (error) {
    console.error('Error deleting logs:', error);
    res.status(500).json({ error: 'Failed to delete logs' });
  }
}
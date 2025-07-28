import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { attendeeIds } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendee IDs provided' });
    }

    // Get current user with role information
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!currentUser?.role) {
      return res.status(403).json({ error: 'Access denied: No role assigned' });
    }

    // Check permissions
    const permissions = currentUser.role.permissions as any;
    const hasDeletePermission = permissions?.attendees?.delete === true || permissions?.all === true;

    if (!hasDeletePermission) {
      return res.status(403).json({ error: 'Access denied: Insufficient permissions' });
    }

    // Get attendee details for logging before deletion
    const attendeesToDelete = await prisma.attendee.findMany({
      where: {
        id: { in: attendeeIds }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        barcodeNumber: true
      }
    });

    // Delete attendees and their related data
    // Prisma will handle cascading deletes for related records (customFieldValues)
    const deleteResult = await prisma.attendee.deleteMany({
      where: {
        id: { in: attendeeIds }
      }
    });

    // Log the bulk delete action
    await prisma.activityLog.create({
      data: {
        action: 'delete',
        userId: user.id,
        details: {
          type: 'bulk_delete',
          count: deleteResult.count,
          attendees: attendeesToDelete.map(a => ({
            id: a.id,
            firstName: a.firstName,
            lastName: a.lastName,
            barcodeNumber: a.barcodeNumber
          }))
        }
      }
    });

    res.status(200).json({ 
      success: true, 
      deletedCount: deleteResult.count,
      message: `Successfully deleted ${deleteResult.count} attendees`
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Failed to delete attendees' });
  }
}
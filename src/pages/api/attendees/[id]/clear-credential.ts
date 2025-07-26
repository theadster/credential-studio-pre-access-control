import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import prisma from '@/lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const supabase = createClient(req, res);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user's role and check permissions
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!dbUser || !dbUser.role) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if user has permission to manage attendees
    const permissions = dbUser.role.permissions as any;
    const hasPermission = permissions?.attendees?.update || permissions?.attendees?.print || permissions?.all;

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid attendee ID' });
    }

    // Check if attendee exists
    const existingAttendee = await prisma.attendee.findUnique({
      where: { id }
    });

    if (!existingAttendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    // Clear the credential URL and timestamp
    const updatedAttendee = await prisma.attendee.update({
      where: { id },
      data: {
        credentialUrl: null,
        credentialGeneratedAt: null
      },
      include: {
        customFieldValues: {
          include: {
            customField: true
          }
        }
      }
    });

    // Log the activity
    await prisma.log.create({
      data: {
        userId: user.id,
        attendeeId: id,
        action: 'clear_credential',
        details: {
          type: 'attendee',
          attendeeName: `${existingAttendee.firstName} ${existingAttendee.lastName}`,
          previousCredentialUrl: existingAttendee.credentialUrl
        }
      }
    });

    res.status(200).json({
      message: 'Credential cleared successfully',
      attendee: updatedAttendee
    });

  } catch (error) {
    console.error('Error clearing credential:', error);
    res.status(500).json({ error: 'Failed to clear credential' });
  }
}
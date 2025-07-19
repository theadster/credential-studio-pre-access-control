import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  const { id } = req.query;
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid attendee ID' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    // Check print permission for attendees
    const printPermission = await checkApiPermission(user.id, 'attendees', 'print', prisma);
    if (!printPermission.hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to print credentials' });
    }

    // Get attendee details
    const attendee = await prisma.attendee.findUnique({
      where: { id },
      include: {
        customFieldValues: {
          include: {
            customField: true
          }
        }
      }
    });

    if (!attendee) {
      return res.status(404).json({ error: 'Attendee not found' });
    }

    // Get event settings for Switchboard configuration
    const eventSettings = await prisma.eventSettings.findFirst();
    
    if (!eventSettings || !eventSettings.switchboardApiKey || !eventSettings.switchboardTemplateId) {
      return res.status(400).json({ error: 'Switchboard Canvas not configured' });
    }

    // Prepare data for Switchboard Canvas
    const switchboardData = {
      template_id: eventSettings.switchboardTemplateId,
      data: {
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        fullName: `${attendee.firstName} ${attendee.lastName}`,
        barcodeNumber: attendee.barcodeNumber,
        eventName: eventSettings.eventName,
        eventDate: eventSettings.eventDate.toLocaleDateString(),
        eventLocation: eventSettings.eventLocation,
        photoUrl: attendee.photoUrl || '',
        // Add custom fields
        ...attendee.customFieldValues.reduce((acc, cfv) => {
          acc[cfv.customField.fieldName.toLowerCase().replace(/\s+/g, '_')] = cfv.value;
          return acc;
        }, {} as Record<string, string>)
      }
    };

    // Call Switchboard Canvas API
    const switchboardResponse = await fetch('https://api.switchboard.ai/v1/render', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${eventSettings.switchboardApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(switchboardData)
    });

    if (!switchboardResponse.ok) {
      const errorData = await switchboardResponse.text();
      console.error('Switchboard API Error:', errorData);
      return res.status(500).json({ error: 'Failed to generate credential image' });
    }

    const switchboardResult = await switchboardResponse.json();

    // Log the print action (defensive check)
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id }
    });
    
    if (existingUser) {
      await prisma.log.create({
        data: {
          userId: user.id,
          attendeeId: attendee.id,
          action: 'print',
          details: { 
            type: 'credential',
            firstName: attendee.firstName,
            lastName: attendee.lastName,
            barcodeNumber: attendee.barcodeNumber,
            switchboardJobId: switchboardResult.job_id || switchboardResult.id,
            imageUrl: switchboardResult.url || switchboardResult.image_url
          }
        }
      });
    }

    return res.status(200).json({
      success: true,
      attendee: {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        barcodeNumber: attendee.barcodeNumber
      },
      credential: {
        imageUrl: switchboardResult.url || switchboardResult.image_url,
        jobId: switchboardResult.job_id || switchboardResult.id,
        status: switchboardResult.status || 'completed'
      }
    });

  } catch (error) {
    console.error('Print API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
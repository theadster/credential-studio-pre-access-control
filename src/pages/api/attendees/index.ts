import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(req, res);
  
  // Get the authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const attendees = await prisma.attendee.findMany({
          include: {
            customFieldValues: {
              include: {
                customField: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        // Log the view action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'view',
            details: { type: 'attendees_list', count: attendees.length }
          }
        });

        return res.status(200).json(attendees);

      case 'POST':
        const { firstName, lastName, barcodeNumber, photoUrl, customFieldValues } = req.body;

        if (!firstName || !lastName || !barcodeNumber) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if barcode is unique
        const existingAttendee = await prisma.attendee.findUnique({
          where: { barcodeNumber }
        });

        if (existingAttendee) {
          return res.status(400).json({ error: 'Barcode number already exists' });
        }

        const newAttendee = await prisma.attendee.create({
          data: {
            firstName,
            lastName,
            barcodeNumber,
            photoUrl,
            customFieldValues: {
              create: customFieldValues?.map((cfv: any) => ({
                customFieldId: cfv.customFieldId,
                value: cfv.value
              })) || []
            }
          },
          include: {
            customFieldValues: {
              include: {
                customField: true
              }
            }
          }
        });

        // Log the create action
        await prisma.log.create({
          data: {
            userId: user.id,
            attendeeId: newAttendee.id,
            action: 'create',
            details: { 
              type: 'attendee',
              firstName: newAttendee.firstName,
              lastName: newAttendee.lastName,
              barcodeNumber: newAttendee.barcodeNumber
            }
          }
        });

        return res.status(201).json(newAttendee);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
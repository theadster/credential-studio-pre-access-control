import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

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

  try {
    switch (req.method) {
      case 'GET':
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

        // Log the view action (defensive check)
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingUser) {
          await prisma.log.create({
            data: {
              userId: user.id,
              attendeeId: attendee.id,
              action: 'view',
              details: { 
                type: 'attendee_detail',
                firstName: attendee.firstName,
                lastName: attendee.lastName
              }
            }
          });
        }

        return res.status(200).json(attendee);

      case 'PUT':
        const { firstName, lastName, barcodeNumber, photoUrl, customFieldValues } = req.body;

        // Check if attendee exists
        const existingAttendee = await prisma.attendee.findUnique({
          where: { id }
        });

        if (!existingAttendee) {
          return res.status(404).json({ error: 'Attendee not found' });
        }

        // Check if barcode is unique (excluding current attendee)
        if (barcodeNumber && barcodeNumber !== existingAttendee.barcodeNumber) {
          const duplicateBarcode = await prisma.attendee.findUnique({
            where: { barcodeNumber }
          });

          if (duplicateBarcode) {
            return res.status(400).json({ error: 'Barcode number already exists' });
          }
        }

        // Update attendee
        const updatedAttendee = await prisma.attendee.update({
          where: { id },
          data: {
            firstName: firstName || existingAttendee.firstName,
            lastName: lastName || existingAttendee.lastName,
            barcodeNumber: barcodeNumber || existingAttendee.barcodeNumber,
            photoUrl: photoUrl !== undefined ? photoUrl : existingAttendee.photoUrl,
          },
          include: {
            customFieldValues: {
              include: {
                customField: true
              }
            }
          }
        });

        // Update custom field values if provided
        if (customFieldValues) {
          // Delete existing custom field values
          await prisma.attendeeCustomFieldValue.deleteMany({
            where: { attendeeId: id }
          });

          // Create new custom field values
          if (customFieldValues.length > 0) {
            await prisma.attendeeCustomFieldValue.createMany({
              data: customFieldValues.map((cfv: any) => ({
                attendeeId: id,
                customFieldId: cfv.customFieldId,
                value: cfv.value
              }))
            });
          }
        }

        // Log the update action (defensive check)
        const existingUserForUpdate = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingUserForUpdate) {
          await prisma.log.create({
            data: {
              userId: user.id,
              attendeeId: updatedAttendee.id,
              action: 'update',
              details: { 
                type: 'attendee',
                firstName: updatedAttendee.firstName,
                lastName: updatedAttendee.lastName,
                changes: {
                  firstName: firstName !== existingAttendee.firstName,
                  lastName: lastName !== existingAttendee.lastName,
                  barcodeNumber: barcodeNumber !== existingAttendee.barcodeNumber,
                  photoUrl: photoUrl !== existingAttendee.photoUrl
                }
              }
            }
          });
        }

        return res.status(200).json(updatedAttendee);

      case 'DELETE':
        // Check if attendee exists
        const attendeeToDelete = await prisma.attendee.findUnique({
          where: { id }
        });

        if (!attendeeToDelete) {
          return res.status(404).json({ error: 'Attendee not found' });
        }

        // Delete attendee (cascade will handle custom field values)
        await prisma.attendee.delete({
          where: { id }
        });

        // Log the delete action (defensive check)
        const existingUserForDelete = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingUserForDelete) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'delete',
              details: { 
                type: 'attendee',
                firstName: attendeeToDelete.firstName,
                lastName: attendeeToDelete.lastName,
                barcodeNumber: attendeeToDelete.barcodeNumber
              }
            }
          });
        }

        return res.status(200).json({ message: 'Attendee deleted successfully' });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
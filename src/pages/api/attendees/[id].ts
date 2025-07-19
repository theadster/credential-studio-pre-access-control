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

  try {
    switch (req.method) {
      case 'GET':
        // Check read permission for attendees
        const readPermission = await checkApiPermission(user.id, 'attendees', 'read', prisma);
        if (!readPermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view attendee details' });
        }

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

        // Log the view action
        if (readPermission.user) {
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
        // Check update permission for attendees
        const updatePermission = await checkApiPermission(user.id, 'attendees', 'update', prisma);
        if (!updatePermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to update attendees' });
        }

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
        if (customFieldValues && Array.isArray(customFieldValues)) {
          // Validate that all custom field IDs exist
          const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId);
          const existingCustomFields = await prisma.customField.findMany({
            where: {
              id: {
                in: customFieldIds
              }
            },
            select: { id: true }
          });

          const existingCustomFieldIds = existingCustomFields.map(cf => cf.id);
          const invalidCustomFieldIds = customFieldIds.filter(id => !existingCustomFieldIds.includes(id));

          if (invalidCustomFieldIds.length > 0) {
            console.error('Invalid custom field IDs:', invalidCustomFieldIds);
            return res.status(400).json({ 
              error: 'Some custom fields no longer exist. Please refresh the page and try again.',
              invalidIds: invalidCustomFieldIds
            });
          }

          // Delete existing custom field values
          await prisma.attendeeCustomFieldValue.deleteMany({
            where: { attendeeId: id }
          });

          // Create new custom field values (only for non-empty values)
          const validCustomFieldValues = customFieldValues.filter((cfv: any) => 
            cfv.customFieldId && cfv.value !== null && cfv.value !== undefined && cfv.value !== ''
          );

          if (validCustomFieldValues.length > 0) {
            await prisma.attendeeCustomFieldValue.createMany({
              data: validCustomFieldValues.map((cfv: any) => ({
                attendeeId: id,
                customFieldId: cfv.customFieldId,
                value: String(cfv.value)
              }))
            });
          }
        }

        // Fetch the final updated attendee with all custom field values
        const finalAttendee = await prisma.attendee.findUnique({
          where: { id },
          include: {
            customFieldValues: {
              include: {
                customField: true
              }
            }
          }
        });

        // Log the update action
        if (updatePermission.user) {
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
                  photoUrl: photoUrl !== existingAttendee.photoUrl,
                  customFieldValues: customFieldValues && customFieldValues.length > 0
                }
              }
            }
          });
        }

        return res.status(200).json(finalAttendee);

      case 'DELETE':
        // Check delete permission for attendees
        const deletePermission = await checkApiPermission(user.id, 'attendees', 'delete', prisma);
        if (!deletePermission.hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to delete attendees' });
        }

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

        // Log the delete action
        if (deletePermission.user) {
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
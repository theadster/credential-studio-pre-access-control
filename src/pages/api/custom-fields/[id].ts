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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid custom field ID' });
  }

  try {
    switch (req.method) {
      case 'GET':
        const customField = await prisma.customField.findUnique({
          where: { id },
          include: {
            attendeeCustomFieldValues: {
              select: { id: true }
            }
          }
        });

        if (!customField) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        return res.status(200).json(customField);

      case 'PUT':
        const { fieldName, fieldType, fieldOptions, required, order } = req.body;

        if (!fieldName || !fieldType) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const updatedField = await prisma.customField.update({
          where: { id },
          data: {
            fieldName,
            fieldType,
            fieldOptions: fieldOptions || null,
            required: required || false,
            order: order || 1
          }
        });

        // Log the update action
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingUser) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'update',
              details: { 
                type: 'custom_field',
                fieldId: id,
                fieldName: updatedField.fieldName,
                fieldType: updatedField.fieldType
              }
            }
          });
        }

        return res.status(200).json(updatedField);

      case 'DELETE':
        // Check if field exists
        const fieldToDelete = await prisma.customField.findUnique({
          where: { id },
          include: {
            attendeeCustomFieldValues: {
              select: { id: true }
            }
          }
        });

        if (!fieldToDelete) {
          return res.status(404).json({ error: 'Custom field not found' });
        }

        // Delete the custom field (this will cascade delete all associated values)
        await prisma.customField.delete({
          where: { id }
        });

        // Log the delete action
        const existingUserForDelete = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingUserForDelete) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'delete',
              details: { 
                type: 'custom_field',
                fieldId: id,
                fieldName: fieldToDelete.fieldName,
                fieldType: fieldToDelete.fieldType,
                deletedValuesCount: fieldToDelete.attendeeCustomFieldValues.length
              }
            }
          });
        }

        return res.status(200).json({ 
          success: true, 
          message: 'Custom field deleted successfully',
          deletedValuesCount: fieldToDelete.attendeeCustomFieldValues.length
        });

      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
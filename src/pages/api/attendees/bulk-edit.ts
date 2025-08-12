import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Authentication
    const supabase = createClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate request body
    const { attendeeIds, changes } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendeeIds' });
    }

    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ error: 'Invalid changes object' });
    }

    // Check permissions
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true }
    });

    if (!dbUser || !dbUser.role) {
      return res.status(403).json({ error: 'User role not found' });
    }

    const permissions = dbUser.role.permissions as any;
    if (!permissions?.attendees?.bulkEdit) {
      return res.status(403).json({ error: 'Insufficient permissions to bulk edit attendees' });
    }

    // Get custom fields
    const customFields = await prisma.customField.findMany();

    // Use a transaction to perform bulk updates efficiently
    const updatedCount = await prisma.$transaction(async (tx) => {
      // Get all attendees and their existing custom field values in one query
      const attendees = await tx.attendee.findMany({
        where: { id: { in: attendeeIds } },
        include: { customFieldValues: true }
      });

      if (attendees.length === 0) {
        return 0;
      }

      // Prepare batch operations
      const valuesToUpdate: { id: string; value: string }[] = [];
      const valuesToCreate: { attendeeId: string; customFieldId: string; value: string }[] = [];
      const attendeesToUpdate: string[] = [];

      // Process changes for each attendee
      for (const attendee of attendees) {
        let hasChanges = false;

        for (const [fieldId, value] of Object.entries(changes)) {
          if (!value || value === 'no-change') {
            continue;
          }

          const customField = customFields.find(cf => cf.id === fieldId);
          if (!customField) {
            continue;
          }

          let processedValue = value;
          if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
            processedValue = processedValue.toUpperCase();
          }

          const existingValue = attendee.customFieldValues.find(cfv => cfv.customFieldId === fieldId);

          if (existingValue) {
            // Update existing value if different
            if (existingValue.value !== String(processedValue)) {
              valuesToUpdate.push({
                id: existingValue.id,
                value: String(processedValue)
              });
              hasChanges = true;
            }
          } else {
            // Create new value
            valuesToCreate.push({
              attendeeId: attendee.id,
              customFieldId: fieldId,
              value: String(processedValue)
            });
            hasChanges = true;
          }
        }

        if (hasChanges) {
          attendeesToUpdate.push(attendee.id);
        }
      }

      // Execute batch operations
      const operations = [];

      // Batch update existing values
      if (valuesToUpdate.length > 0) {
        for (const update of valuesToUpdate) {
          operations.push(
            tx.attendeeCustomFieldValue.update({
              where: { id: update.id },
              data: { value: update.value }
            })
          );
        }
      }

      // Batch create new values
      if (valuesToCreate.length > 0) {
        operations.push(
          tx.attendeeCustomFieldValue.createMany({
            data: valuesToCreate,
            skipDuplicates: true
          })
        );
      }

      // Update attendee timestamps
      if (attendeesToUpdate.length > 0) {
        operations.push(
          tx.attendee.updateMany({
            where: { id: { in: attendeesToUpdate } },
            data: { updatedAt: new Date() }
          })
        );
      }

      // Execute all operations
      await Promise.all(operations);

      return attendeesToUpdate.length;
    });

    // Log the action
    await prisma.log.create({
      data: {
        userId: user.id,
        action: 'bulk_update',
        details: {
          type: 'attendees',
          count: attendeeIds.length,
          updatedCount,
          changes: Object.keys(changes),
        },
      },
    });

    return res.status(200).json({ 
      message: 'Attendees updated successfully', 
      updatedCount 
    });

  } catch (error) {
    console.error('Bulk edit API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
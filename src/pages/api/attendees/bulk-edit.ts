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

    // Process bulk updates
    let updatedCount = 0;

    for (const attendeeId of attendeeIds) {
      // Verify attendee exists
      const attendee = await prisma.attendee.findUnique({ 
        where: { id: attendeeId },
        include: { customFieldValues: true }
      });
      
      if (!attendee) {
        continue;
      }

      let hasChanges = false;

      // Process each field change
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

        // Check if custom field value exists
        const existingValue = await prisma.attendeeCustomFieldValue.findFirst({
          where: {
            attendeeId: attendeeId,
            customFieldId: fieldId,
          },
        });

        if (existingValue) {
          // Update existing value
          if (existingValue.value !== String(processedValue)) {
            await prisma.attendeeCustomFieldValue.update({
              where: { id: existingValue.id },
              data: { value: String(processedValue) },
            });
            hasChanges = true;
          }
        } else {
          // Create new value
          await prisma.attendeeCustomFieldValue.create({
            data: {
              attendeeId: attendeeId,
              customFieldId: fieldId,
              value: String(processedValue),
            },
          });
          hasChanges = true;
        }
      }

      // Update attendee timestamp if changes were made
      if (hasChanges) {
        await prisma.attendee.update({
          where: { id: attendeeId },
          data: { updatedAt: new Date() },
        });
        updatedCount++;
      }
    }

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
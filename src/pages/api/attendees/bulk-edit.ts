import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Step 1: Authentication
    const supabase = createClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication failed:', userError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Step 2: Validate request body
    const { attendeeIds, changes } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      return res.status(400).json({ error: 'Invalid attendeeIds' });
    }

    if (!changes || typeof changes !== 'object') {
      return res.status(400).json({ error: 'Invalid changes object' });
    }

    // Step 3: Check permissions
    try {
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
    } catch (permError) {
      console.error('Permission check error:', permError);
      return res.status(500).json({ error: 'Permission check failed' });
    }

    // Step 4: Get custom fields
    let customFields;
    try {
      customFields = await prisma.customField.findMany();
    } catch (cfError) {
      console.error('Custom fields fetch error:', cfError);
      return res.status(500).json({ error: 'Failed to fetch custom fields' });
    }

    // Step 5: Process bulk updates
    let updatedCount = 0;

    try {
      console.log(`Processing ${attendeeIds.length} attendees for bulk edit`);
      console.log('Changes to apply:', changes);

      for (let i = 0; i < attendeeIds.length; i++) {
        const attendeeId = attendeeIds[i];
        console.log(`Processing attendee ${i + 1}/${attendeeIds.length}: ${attendeeId}`);

        // Verify attendee exists
        let attendee;
        try {
          attendee = await prisma.attendee.findUnique({ 
            where: { id: attendeeId } 
          });
        } catch (findError) {
          console.error(`Error finding attendee ${attendeeId}:`, findError);
          continue;
        }
        
        if (!attendee) {
          console.warn(`Attendee ${attendeeId} not found, skipping`);
          continue;
        }

        let hasChanges = false;

        // Process each field change
        for (const [fieldId, value] of Object.entries(changes)) {
          console.log(`Processing field ${fieldId} with value:`, value);
          
          if (!value || value === 'no-change') {
            console.log(`Skipping field ${fieldId} - no change`);
            continue;
          }

          const customField = customFields.find(cf => cf.id === fieldId);
          if (!customField) {
            console.warn(`Custom field ${fieldId} not found, skipping`);
            continue;
          }

          let processedValue = value;
          if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
            processedValue = processedValue.toUpperCase();
          }

          console.log(`Processed value for ${fieldId}:`, processedValue);

          // Check if custom field value exists
          let existingValue;
          try {
            existingValue = await prisma.customFieldValue.findFirst({
              where: {
                attendeeId: attendeeId,
                customFieldId: fieldId,
              },
            });
          } catch (findValueError) {
            console.error(`Error finding custom field value:`, findValueError);
            continue;
          }

          try {
            if (existingValue) {
              // Update existing value
              if (existingValue.value !== processedValue) {
                console.log(`Updating existing value for field ${fieldId}`);
                await prisma.customFieldValue.update({
                  where: { id: existingValue.id },
                  data: { value: String(processedValue) },
                });
                hasChanges = true;
              }
            } else {
              // Create new value
              console.log(`Creating new value for field ${fieldId}`);
              await prisma.customFieldValue.create({
                data: {
                  attendeeId: attendeeId,
                  customFieldId: fieldId,
                  value: String(processedValue),
                },
              });
              hasChanges = true;
            }
          } catch (valueUpdateError) {
            console.error(`Error updating/creating custom field value:`, valueUpdateError);
            throw valueUpdateError;
          }
        }

        // Update attendee timestamp if changes were made
        if (hasChanges) {
          try {
            console.log(`Updating attendee ${attendeeId} timestamp`);
            await prisma.attendee.update({
              where: { id: attendeeId },
              data: { updatedAt: new Date() },
            });
            updatedCount++;
          } catch (attendeeUpdateError) {
            console.error(`Error updating attendee timestamp:`, attendeeUpdateError);
            throw attendeeUpdateError;
          }
        }
      }

      console.log(`Bulk edit completed. Updated ${updatedCount} attendees.`);

      // Step 6: Log the action
      try {
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
      } catch (logError) {
        console.error('Logging error:', logError);
        // Don't fail the request if logging fails
      }

      return res.status(200).json({ 
        message: 'Attendees updated successfully', 
        updatedCount 
      });

    } catch (updateError) {
      console.error('Bulk update error:', updateError);
      return res.status(500).json({ error: 'Failed to update attendees' });
    }

  } catch (error) {
    console.error('Bulk edit API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
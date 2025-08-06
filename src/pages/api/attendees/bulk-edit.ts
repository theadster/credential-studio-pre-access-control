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
      console.log('Changes to apply:', JSON.stringify(changes, null, 2));
      console.log('Available custom fields:', customFields.map(cf => ({ id: cf.id, name: cf.fieldName, type: cf.fieldType })));

      for (let i = 0; i < attendeeIds.length; i++) {
        const attendeeId = attendeeIds[i];
        console.log(`\n--- Processing attendee ${i + 1}/${attendeeIds.length}: ${attendeeId} ---`);

        // Verify attendee exists
        let attendee;
        try {
          attendee = await prisma.attendee.findUnique({ 
            where: { id: attendeeId },
            include: {
              customFieldValues: true
            }
          });
        } catch (findError) {
          console.error(`Error finding attendee ${attendeeId}:`, findError);
          continue;
        }
        
        if (!attendee) {
          console.warn(`Attendee ${attendeeId} not found, skipping`);
          continue;
        }

        console.log(`Found attendee: ${attendee.firstName} ${attendee.lastName}`);
        console.log(`Existing custom field values:`, attendee.customFieldValues.map(cfv => ({ fieldId: cfv.customFieldId, value: cfv.value })));

        let hasChanges = false;

        // Process each field change
        for (const [fieldId, value] of Object.entries(changes)) {
          console.log(`\nProcessing field ${fieldId} with value:`, value);
          
          if (!value || value === 'no-change') {
            console.log(`Skipping field ${fieldId} - no change requested`);
            continue;
          }

          const customField = customFields.find(cf => cf.id === fieldId);
          if (!customField) {
            console.warn(`Custom field ${fieldId} not found in available fields, skipping`);
            console.log('Available field IDs:', customFields.map(cf => cf.id));
            continue;
          }

          console.log(`Found custom field: ${customField.fieldName} (${customField.fieldType})`);

          let processedValue = value;
          if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
            processedValue = processedValue.toUpperCase();
            console.log(`Applied uppercase transformation: ${value} -> ${processedValue}`);
          }

          // Check if custom field value exists
          let existingValue;
          try {
            existingValue = await prisma.customFieldValue.findFirst({
              where: {
                attendeeId: attendeeId,
                customFieldId: fieldId,
              },
            });
            console.log(`Existing value query result:`, existingValue ? { id: existingValue.id, value: existingValue.value } : 'null');
          } catch (findValueError) {
            console.error(`Error finding custom field value:`, findValueError);
            continue;
          }

          try {
            if (existingValue) {
              // Update existing value
              if (existingValue.value !== String(processedValue)) {
                console.log(`Updating existing value: "${existingValue.value}" -> "${processedValue}"`);
                await prisma.customFieldValue.update({
                  where: { id: existingValue.id },
                  data: { value: String(processedValue) },
                });
                hasChanges = true;
                console.log(`Successfully updated existing value`);
              } else {
                console.log(`Value unchanged, skipping update`);
              }
            } else {
              // Create new value
              console.log(`Creating new value: "${processedValue}"`);
              await prisma.customFieldValue.create({
                data: {
                  attendeeId: attendeeId,
                  customFieldId: fieldId,
                  value: String(processedValue),
                },
              });
              hasChanges = true;
              console.log(`Successfully created new value`);
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
            console.log(`Successfully updated attendee timestamp. Total updated: ${updatedCount}`);
          } catch (attendeeUpdateError) {
            console.error(`Error updating attendee timestamp:`, attendeeUpdateError);
            throw attendeeUpdateError;
          }
        } else {
          console.log(`No changes made for attendee ${attendeeId}`);
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
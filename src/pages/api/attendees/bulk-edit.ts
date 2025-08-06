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
    const supabase = createClient(req, res);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure prisma is available
    if (!prisma) {
      console.error('Prisma client is not available');
      return res.status(500).json({ error: 'Database connection error' });
    }

    // Check bulk edit permission
    const permission = await checkApiPermission(user.id, 'attendees', 'bulkEdit', prisma);
    if (!permission.hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions to bulk edit attendees' });
    }

    const { attendeeIds, changes } = req.body;

    if (!Array.isArray(attendeeIds) || attendeeIds.length === 0 || !changes || typeof changes !== 'object') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const eventSettings = await prisma.eventSettings.findFirst();
    if (!eventSettings) {
      return res.status(404).json({ error: 'Event settings not found' });
    }

    const customFields = await prisma.customField.findMany();
    const forceUpperCaseFirstName = eventSettings.forceUpperCaseFirstName;
    const forceUpperCaseLastName = eventSettings.forceUpperCaseLastName;

    let updatedCount = 0;

    for (const attendeeId of attendeeIds) {
      const attendee = await prisma.attendee.findUnique({ where: { id: attendeeId } });
      if (!attendee) continue;

      const updatedCustomFieldValues: { [key: string]: any } = {};
      let hasChanges = false;

      for (const [fieldId, value] of Object.entries(changes)) {
        const customField = customFields.find(cf => cf.id === fieldId);
        if (!customField) continue;

        let processedValue = value;
        if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
          processedValue = processedValue.toUpperCase();
        }

        const existingValue = await prisma.customFieldValue.findFirst({
          where: {
            attendeeId: attendeeId,
            customFieldId: fieldId,
          },
        });

        if (existingValue) {
          if (existingValue.value !== processedValue) {
            await prisma.customFieldValue.update({
              where: { id: existingValue.id },
              data: { value: processedValue as string },
            });
            hasChanges = true;
          }
        } else {
          await prisma.customFieldValue.create({
            data: {
              attendeeId: attendeeId,
              customFieldId: fieldId,
              value: processedValue as string,
            },
          });
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await prisma.attendee.update({
          where: { id: attendeeId },
          data: { updatedAt: new Date() },
        });
        updatedCount++;
      }
    }

    // Log the bulk edit action
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

    res.status(200).json({ message: 'Attendees updated successfully', updatedCount });
  } catch (error) {
    console.error('Bulk edit error:', error);
    res.status(500).json({ error: 'Failed to bulk edit attendees' });
  }
}
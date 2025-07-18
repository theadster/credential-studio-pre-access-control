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
        const customFields = await prisma.customField.findMany({
          orderBy: {
            order: 'asc'
          }
        });

        return res.status(200).json(customFields);

      case 'POST':
        const { eventSettingsId, fieldName, fieldType, fieldOptions, required, order } = req.body;

        if (!eventSettingsId || !fieldName || !fieldType) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if event settings exist
        const eventSettings = await prisma.eventSettings.findUnique({
          where: { id: eventSettingsId }
        });

        if (!eventSettings) {
          return res.status(404).json({ error: 'Event settings not found' });
        }

        // Get the next order number if not provided
        let fieldOrder = order;
        if (!fieldOrder) {
          const lastField = await prisma.customField.findFirst({
            where: { eventSettingsId },
            orderBy: { order: 'desc' }
          });
          fieldOrder = lastField ? lastField.order + 1 : 1;
        }

        const newCustomField = await prisma.customField.create({
          data: {
            eventSettingsId,
            fieldName,
            fieldType,
            fieldOptions: fieldOptions || null,
            required: required || false,
            order: fieldOrder
          }
        });

        // Log the create action
        await prisma.log.create({
          data: {
            userId: user.id,
            action: 'create',
            details: { 
              type: 'custom_field',
              fieldName: newCustomField.fieldName,
              fieldType: newCustomField.fieldType
            }
          }
        });

        return res.status(201).json(newCustomField);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
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
        // Get the first (and should be only) event settings record
        const eventSettings = await prisma.eventSettings.findFirst({
          include: {
            customFields: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        });

        // Log the view action - only if user exists in our database
        const existingPrismaUser = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUser) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'view',
              details: { type: 'event_settings' }
            }
          });
        }

        return res.status(200).json(eventSettings);

      case 'POST':
        // Create initial event settings (should only happen once)
        const {
          eventName,
          eventDate,
          eventLocation,
          timeZone,
          barcodeType,
          barcodeLength,
          barcodeUnique,
          cloudinaryCloudName,
          cloudinaryApiKey,
          cloudinaryApiSecret,
          cloudinaryUploadPreset,
          switchboardApiKey,
          switchboardTemplateId,
          bannerImageUrl
        } = req.body;

        if (!eventName || !eventDate || !eventLocation || !timeZone) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if event settings already exist
        const existingSettings = await prisma.eventSettings.findFirst();
        if (existingSettings) {
          return res.status(400).json({ error: 'Event settings already exist. Use PUT to update.' });
        }

        const newEventSettings = await prisma.eventSettings.create({
          data: {
            eventName,
            eventDate: new Date(eventDate),
            eventLocation,
            timeZone,
            barcodeType: barcodeType || 'alphanumerical',
            barcodeLength: barcodeLength || 8,
            barcodeUnique: barcodeUnique !== undefined ? barcodeUnique : true,
            cloudinaryCloudName,
            cloudinaryApiKey,
            cloudinaryApiSecret,
            cloudinaryUploadPreset,
            switchboardApiKey,
            switchboardTemplateId,
            bannerImageUrl
          },
          include: {
            customFields: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        });

        // Log the create action - only if user exists in our database
        const existingPrismaUserForCreate = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUserForCreate) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'create',
              details: { 
                type: 'event_settings',
                eventName: newEventSettings.eventName,
                eventDate: newEventSettings.eventDate
              }
            }
          });
        }

        return res.status(201).json(newEventSettings);

      case 'PUT':
        // Update event settings
        const updateData = req.body;
        
        // Get existing settings
        const currentSettings = await prisma.eventSettings.findFirst();
        if (!currentSettings) {
          return res.status(404).json({ error: 'Event settings not found. Create them first.' });
        }

        const updatedEventSettings = await prisma.eventSettings.update({
          where: { id: currentSettings.id },
          data: {
            ...updateData,
            eventDate: updateData.eventDate ? new Date(updateData.eventDate) : undefined
          },
          include: {
            customFields: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        });

        // Log the update action - only if user exists in our database
        const existingPrismaUserForUpdate = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUserForUpdate) {
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'update',
              details: { 
                type: 'event_settings',
                eventName: updatedEventSettings.eventName,
                changes: Object.keys(updateData)
              }
            }
          });
        }

        return res.status(200).json(updatedEventSettings);

      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { generateInternalFieldName } from '@/util/string';

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
        let eventSettings = await prisma.eventSettings.findFirst({
          include: {
            customFields: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        });

        // Generate internal field names for existing custom fields that don't have them
        if (eventSettings?.customFields) {
          const fieldsToUpdate = eventSettings.customFields.filter(field => !field.internalFieldName);
          
          if (fieldsToUpdate.length > 0) {
            await prisma.$transaction(
              fieldsToUpdate.map(field =>
                prisma.customField.update({
                  where: { id: field.id },
                  data: { internalFieldName: generateInternalFieldName(field.fieldName) }
                })
              )
            );

            // Refetch the updated event settings
            eventSettings = await prisma.eventSettings.findFirst({
              include: {
                customFields: {
                  orderBy: {
                    order: 'asc'
                  }
                }
              }
            });
          }
        }

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
          eventTime,
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

        // Handle date properly to avoid timezone issues
        let createParsedEventDate;
        if (eventDate) {
          if (typeof eventDate === 'string' && eventDate.includes('-') && !eventDate.includes('T')) {
            // If it's a date string (YYYY-MM-DD), parse it as local date to avoid UTC conversion
            const [year, month, day] = eventDate.split('-').map(Number);
            createParsedEventDate = new Date(year, month - 1, day);
          } else {
            createParsedEventDate = new Date(eventDate);
          }
        }

        const newEventSettings = await prisma.eventSettings.create({
          data: {
            eventName,
            eventDate: createParsedEventDate,
            eventTime,
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
        const { customFields, ...eventSettingsData } = updateData;
        
        // Get existing settings
        const currentSettings = await prisma.eventSettings.findFirst({
          include: {
            customFields: {
              orderBy: {
                order: 'asc'
              }
            }
          }
        });
        if (!currentSettings) {
          return res.status(404).json({ error: 'Event settings not found. Create them first.' });
        }

        // Handle custom fields separately if they exist
        let customFieldsUpdate = {};
        if (customFields && Array.isArray(customFields)) {
          const existingFieldIds = currentSettings.customFields.map(f => f.id);
          const incomingFieldIds = customFields.filter(f => f.id && !f.id.startsWith('temp_')).map(f => f.id);
          
          // Separate existing fields from new fields
          const existingFields = customFields.filter(f => f.id && !f.id.startsWith('temp_'));
          const newFields = customFields.filter(f => !f.id || f.id.startsWith('temp_'));
          
          // Check if any existing fields were deleted
          const deletedFieldIds = existingFieldIds.filter(id => !incomingFieldIds.includes(id));
          
          // Check if any existing fields were modified (excluding order changes)
          const modifiedFields = existingFields.filter(incomingField => {
            const existingField = currentSettings.customFields.find(f => f.id === incomingField.id);
            if (!existingField) return false;
            
            return existingField.fieldName !== incomingField.fieldName ||
                   existingField.fieldType !== incomingField.fieldType ||
                   existingField.required !== incomingField.required ||
                   JSON.stringify(existingField.fieldOptions) !== JSON.stringify(incomingField.fieldOptions);
          });
          
          // If there are deletions or modifications, we need to use the delete/recreate approach
          if (deletedFieldIds.length > 0 || modifiedFields.length > 0) {
            customFieldsUpdate = {
              customFields: {
                deleteMany: {},
                create: customFields.map((field: any, index: number) => ({
                  fieldName: field.fieldName,
                  internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
                  fieldType: field.fieldType,
                  fieldOptions: field.fieldOptions || null,
                  required: field.required || false,
                  order: field.order || index + 1
                }))
              }
            };
          } else {
            // Only additions and/or reordering - handle incrementally
            const operations = [];
            
            // Update order for existing fields
            for (const field of existingFields) {
              operations.push(
                prisma.customField.update({
                  where: { id: field.id },
                  data: { order: field.order }
                })
              );
            }
            
            // Create new fields
            for (const field of newFields) {
              operations.push(
                prisma.customField.create({
                  data: {
                    eventSettingsId: currentSettings.id,
                    fieldName: field.fieldName,
                    internalFieldName: field.internalFieldName || generateInternalFieldName(field.fieldName),
                    fieldType: field.fieldType,
                    fieldOptions: field.fieldOptions || null,
                    required: field.required || false,
                    order: field.order || customFields.length
                  }
                })
              );
            }
            
            // Execute all operations in a transaction
            if (operations.length > 0) {
              await prisma.$transaction(operations);
            }
          }
        }

        // Handle date properly to avoid timezone issues
        let updateParsedEventDate;
        if (eventSettingsData.eventDate) {
          if (typeof eventSettingsData.eventDate === 'string' && eventSettingsData.eventDate.includes('-') && !eventSettingsData.eventDate.includes('T')) {
            // If it's a date string (YYYY-MM-DD), parse it as local date to avoid UTC conversion
            const [year, month, day] = eventSettingsData.eventDate.split('-').map(Number);
            updateParsedEventDate = new Date(year, month - 1, day);
          } else {
            updateParsedEventDate = new Date(eventSettingsData.eventDate);
          }
        }

        const updatedEventSettings = await prisma.eventSettings.update({
          where: { id: currentSettings.id },
          data: {
            ...eventSettingsData,
            eventDate: updateParsedEventDate,
            ...customFieldsUpdate
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
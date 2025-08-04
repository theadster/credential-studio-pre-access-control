import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/lib/prisma';
import { createClient } from '@/util/supabase/api';
import { generateInternalFieldName } from '@/util/string';
import { shouldLog } from '@/lib/logSettings';

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

        // Log the view action - only if user exists in our database and logging is enabled
        const existingPrismaUser = await prisma.user.findUnique({
          where: { id: user.id }
        });
        
        if (existingPrismaUser && await shouldLog('systemViewEventSettings')) {
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
          forceFirstNameUppercase,
          forceLastNameUppercase,
          cloudinaryCloudName,
          cloudinaryApiKey,
          cloudinaryApiSecret,
          cloudinaryUploadPreset,
          switchboardApiKey,
          switchboardTemplateId,
          bannerImageUrl,
          signInBannerUrl
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
            forceFirstNameUppercase: forceFirstNameUppercase || false,
            forceLastNameUppercase: forceLastNameUppercase || false,
            cloudinaryCloudName,
            cloudinaryApiKey,
            cloudinaryApiSecret,
            cloudinaryUploadPreset,
            switchboardApiKey,
            switchboardTemplateId,
            bannerImageUrl,
            signInBannerUrl
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

        // Handle custom fields separately if they exist
        let customFieldsUpdate = {};
        let useIncrementalUpdate = false;
        
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
          
          // If there are deletions or modifications, we need to handle them carefully to preserve data
          if (deletedFieldIds.length > 0 || modifiedFields.length > 0) {
            // We'll handle this with individual operations to preserve attendee data
            const operations: any[] = [];
            
            // First, handle deletions (these will cascade delete attendee values)
            if (deletedFieldIds.length > 0) {
              operations.push(
                prisma.customField.deleteMany({
                  where: {
                    id: { in: deletedFieldIds }
                  }
                })
              );
            }
            
            // Handle modifications - update existing fields without deleting them
            for (const modifiedField of modifiedFields) {
              operations.push(
                prisma.customField.update({
                  where: { id: modifiedField.id },
                  data: {
                    fieldName: modifiedField.fieldName,
                    internalFieldName: modifiedField.internalFieldName || generateInternalFieldName(modifiedField.fieldName),
                    fieldType: modifiedField.fieldType,
                    fieldOptions: modifiedField.fieldOptions || null,
                    required: modifiedField.required || false,
                    order: modifiedField.order
                  }
                })
              );
            }
            
            // Handle new fields
            const newFields = customFields.filter(f => !f.id || f.id.startsWith('temp_'));
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
            
            // Handle order updates for unchanged existing fields
            const unchangedFields = existingFields.filter(incomingField => {
              const existingField = currentSettings.customFields.find(f => f.id === incomingField.id);
              if (!existingField) return false;
              
              return existingField.fieldName === incomingField.fieldName &&
                     existingField.fieldType === incomingField.fieldType &&
                     existingField.required === incomingField.required &&
                     JSON.stringify(existingField.fieldOptions) === JSON.stringify(incomingField.fieldOptions);
            });
            
            for (const field of unchangedFields) {
              operations.push(
                prisma.customField.update({
                  where: { id: field.id },
                  data: { order: field.order }
                })
              );
            }
            
            // Execute all operations in a transaction
            if (operations.length > 0) {
              await prisma.$transaction(operations);
            }
            
            useIncrementalUpdate = true; // We handled everything manually
          } else {
            // Only additions and/or reordering - handle incrementally
            useIncrementalUpdate = true;
            const operations: any[] = [];
            
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

        // Always update the EventSettings record to trigger the @updatedAt directive
        const updatedEventSettings = await prisma.eventSettings.update({
          where: { id: currentSettings.id },
          data: {
            ...eventSettingsData,
            eventDate: updateParsedEventDate,
            // Force an update to trigger @updatedAt even if no main fields changed
            updatedAt: new Date(),
            // Only include custom fields update if we're not using incremental approach
            ...(useIncrementalUpdate ? {} : customFieldsUpdate)
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
          // Create a more descriptive list of changes
          const changedFields: string[] = [];
          
          // Check for main event settings changes
          if (updateData.eventName && updateData.eventName !== currentSettings.eventName) {
            changedFields.push('Event Name');
          }
          if (updateData.eventDate && new Date(updateData.eventDate).getTime() !== currentSettings.eventDate?.getTime()) {
            changedFields.push('Event Date');
          }
          if (updateData.eventTime && updateData.eventTime !== currentSettings.eventTime) {
            changedFields.push('Event Time');
          }
          if (updateData.eventLocation && updateData.eventLocation !== currentSettings.eventLocation) {
            changedFields.push('Event Location');
          }
          if (updateData.timeZone && updateData.timeZone !== currentSettings.timeZone) {
            changedFields.push('Time Zone');
          }
          if (updateData.barcodeType && updateData.barcodeType !== currentSettings.barcodeType) {
            changedFields.push('Barcode Type');
          }
          if (updateData.barcodeLength && updateData.barcodeLength !== currentSettings.barcodeLength) {
            changedFields.push('Barcode Length');
          }
          if (updateData.barcodeUnique !== undefined && updateData.barcodeUnique !== currentSettings.barcodeUnique) {
            changedFields.push('Barcode Unique Setting');
          }
          if (updateData.forceFirstNameUppercase !== undefined && updateData.forceFirstNameUppercase !== currentSettings.forceFirstNameUppercase) {
            changedFields.push('Force First Name Uppercase');
          }
          if (updateData.forceLastNameUppercase !== undefined && updateData.forceLastNameUppercase !== currentSettings.forceLastNameUppercase) {
            changedFields.push('Force Last Name Uppercase');
          }
          if (updateData.bannerImageUrl !== undefined && updateData.bannerImageUrl !== currentSettings.bannerImageUrl) {
            changedFields.push('Banner Image');
          }
          if (updateData.signInBannerUrl !== undefined && updateData.signInBannerUrl !== currentSettings.signInBannerUrl) {
            changedFields.push('Sign In Banner Image');
          }
          
          // Check for Cloudinary settings changes
          if (updateData.cloudinaryEnabled !== undefined && updateData.cloudinaryEnabled !== currentSettings.cloudinaryEnabled) {
            changedFields.push('Cloudinary Integration');
          }
          if (updateData.cloudinaryCloudName && updateData.cloudinaryCloudName !== currentSettings.cloudinaryCloudName) {
            changedFields.push('Cloudinary Cloud Name');
          }
          if (updateData.cloudinaryApiKey && updateData.cloudinaryApiKey !== currentSettings.cloudinaryApiKey) {
            changedFields.push('Cloudinary API Key');
          }
          if (updateData.cloudinaryApiSecret && updateData.cloudinaryApiSecret !== currentSettings.cloudinaryApiSecret) {
            changedFields.push('Cloudinary API Secret');
          }
          if (updateData.cloudinaryUploadPreset && updateData.cloudinaryUploadPreset !== currentSettings.cloudinaryUploadPreset) {
            changedFields.push('Cloudinary Upload Preset');
          }
          if (updateData.cloudinaryAutoOptimize !== undefined && updateData.cloudinaryAutoOptimize !== currentSettings.cloudinaryAutoOptimize) {
            changedFields.push('Cloudinary Auto-optimize');
          }
          if (updateData.cloudinaryGenerateThumbnails !== undefined && updateData.cloudinaryGenerateThumbnails !== currentSettings.cloudinaryGenerateThumbnails) {
            changedFields.push('Cloudinary Generate Thumbnails');
          }
          if (updateData.cloudinaryDisableSkipCrop !== undefined && updateData.cloudinaryDisableSkipCrop !== currentSettings.cloudinaryDisableSkipCrop) {
            changedFields.push('Cloudinary Disable Skip Crop');
          }
          if (updateData.cloudinaryCropAspectRatio && updateData.cloudinaryCropAspectRatio !== currentSettings.cloudinaryCropAspectRatio) {
            changedFields.push('Cloudinary Crop Aspect Ratio');
          }
          
          // Check for Switchboard settings changes
          if (updateData.switchboardEnabled !== undefined && updateData.switchboardEnabled !== currentSettings.switchboardEnabled) {
            changedFields.push('Switchboard Canvas Integration');
          }
          if (updateData.switchboardApiEndpoint && updateData.switchboardApiEndpoint !== currentSettings.switchboardApiEndpoint) {
            changedFields.push('Switchboard API Endpoint');
          }
          if (updateData.switchboardAuthHeaderType && updateData.switchboardAuthHeaderType !== currentSettings.switchboardAuthHeaderType) {
            changedFields.push('Switchboard Auth Header Type');
          }
          if (updateData.switchboardApiKey && updateData.switchboardApiKey !== currentSettings.switchboardApiKey) {
            changedFields.push('Switchboard API Key');
          }
          if (updateData.switchboardRequestBody && updateData.switchboardRequestBody !== currentSettings.switchboardRequestBody) {
            changedFields.push('Switchboard Request Body');
          }
          if (updateData.switchboardTemplateId && updateData.switchboardTemplateId !== currentSettings.switchboardTemplateId) {
            changedFields.push('Switchboard Template ID');
          }
          if (updateData.switchboardFieldMappings && JSON.stringify(updateData.switchboardFieldMappings) !== JSON.stringify(currentSettings.switchboardFieldMappings)) {
            changedFields.push('Switchboard Field Mappings');
          }
          
          // Check for custom fields changes
          if (updateData.customFields) {
            changedFields.push('Custom Fields');
          }
          
          // If no specific changes detected, fall back to generic message
          if (changedFields.length === 0) {
            changedFields.push('Event Settings');
          }

          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'update',
              details: { 
                type: 'event_settings',
                eventName: updatedEventSettings.eventName,
                changes: changedFields
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
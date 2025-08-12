import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@/util/supabase/api';
import { checkApiPermission } from '@/lib/permissions';
import prisma from '@/lib/prisma';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { generateBarcode } from '@/util/string';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabase = createClient(req, res);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session || !session.user || !session.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { hasPermission: canImport, user } = await checkApiPermission(
    session.user.id,
    'attendees',
    'import',
    prisma
  );

  if (!canImport) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  try {
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const results: any[] = [];
    fs.createReadStream(file.filepath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Fetch event settings for barcode configuration
          const eventSettings = await prisma.eventSettings.findFirst();
          if (!eventSettings) {
            throw new Error('Event settings not found. Please configure event settings first.');
          }

          // Fetch custom fields to map internal names to IDs and get field options
          const customFields = await prisma.customField.findMany({
            select: { id: true, internalFieldName: true, fieldType: true, fieldOptions: true },
          });
          const customFieldMap = new Map(customFields.map(cf => [cf.internalFieldName, cf.id]));
          const customFieldOptionsMap = new Map(customFields.map(cf => [cf.internalFieldName, { fieldType: cf.fieldType, fieldOptions: cf.fieldOptions }]));

          // Get existing barcode numbers to ensure uniqueness
          const existingBarcodes = new Set(
            (await prisma.attendee.findMany({ select: { barcodeNumber: true } }))
              .map(a => a.barcodeNumber)
          );

          const attendeesToCreate = results.map(row => {
            const { firstName, lastName, barcodeNumber, ...customFieldValues } = row;

            if (!firstName || !lastName) {
              // Skip rows that are missing required fields
              return null;
            }

            // Apply uppercase transformations to first and last names if enabled
            let processedFirstName = firstName;
            let processedLastName = lastName;
            
            if (eventSettings.forceFirstNameUppercase) {
              processedFirstName = firstName.toUpperCase();
            }
            
            if (eventSettings.forceLastNameUppercase) {
              processedLastName = lastName.toUpperCase();
            }

            const customFieldsData = Object.entries(customFieldValues)
              .map(([internalName, value]) => {
                const customFieldId = customFieldMap.get(internalName);
                const fieldInfo = customFieldOptionsMap.get(internalName);
                
                if (customFieldId && value) {
                  let processedValue = String(value);
                  
                  // Apply uppercase transformation for text fields if enabled
                  if (fieldInfo?.fieldType === 'text' && fieldInfo?.fieldOptions?.uppercase === true) {
                    processedValue = processedValue.toUpperCase();
                  }
                  
                  return {
                    customFieldId,
                    value: processedValue,
                  };
                }
                return null;
              })
              .filter(Boolean) as { customFieldId: string; value: string }[];

            // Generate unique barcode
            let generatedBarcode: string;
            do {
              generatedBarcode = generateBarcode(eventSettings.barcodeType, eventSettings.barcodeLength);
            } while (existingBarcodes.has(generatedBarcode));
            
            // Add the generated barcode to the set to avoid duplicates within this import
            existingBarcodes.add(generatedBarcode);

            return {
              firstName: processedFirstName,
              lastName: processedLastName,
              barcodeNumber: generatedBarcode,
              customFieldValues: {
                create: customFieldsData,
              },
            };
          }).filter(Boolean) as any[];

          // Use a transaction to create all attendees and their custom field values efficiently
          const result = await prisma.$transaction(async (tx) => {
            // Prepare attendee data without nested creates
            const attendeesData = attendeesToCreate.map(({ customFieldValues, ...attendeeData }) => attendeeData);
            
            // Create all attendees in a single batch operation
            const createResult = await tx.attendee.createMany({
              data: attendeesData,
              skipDuplicates: true, // Skip duplicates instead of throwing errors
            });

            // Get the created attendees to link custom field values
            const createdAttendees = await tx.attendee.findMany({
              where: {
                barcodeNumber: { in: attendeesData.map(a => a.barcodeNumber) }
              },
              select: { id: true, barcodeNumber: true }
            });

            // Create a map for quick lookup
            const barcodeToIdMap = new Map(createdAttendees.map(a => [a.barcodeNumber, a.id]));

            // Prepare custom field values data
            const customFieldValuesData: { attendeeId: string; customFieldId: string; value: string }[] = [];
            
            attendeesToCreate.forEach(({ customFieldValues, barcodeNumber }) => {
              const attendeeId = barcodeToIdMap.get(barcodeNumber);
              if (attendeeId && customFieldValues?.create) {
                customFieldValues.create.forEach((cfv: any) => {
                  customFieldValuesData.push({
                    attendeeId,
                    customFieldId: cfv.customFieldId,
                    value: cfv.value
                  });
                });
              }
            });

            // Create all custom field values in a single batch operation
            if (customFieldValuesData.length > 0) {
              await tx.attendeeCustomFieldValue.createMany({
                data: customFieldValuesData,
                skipDuplicates: true
              });
            }

            return createResult.count;
          });

          const createdCount = result;

          // Log the import action
          await prisma.log.create({
            data: {
              userId: user.id,
              action: 'import',
              details: {
                type: 'attendee',
                count: createdCount,
                fileName: file.originalFilename,
              },
            },
          });

          res.status(200).json({
            message: 'Attendees imported successfully',
            count: createdCount,
          });
        } catch (error) {
          console.error('Error importing attendees:', error);
          res.status(500).json({ error: 'Failed to import attendees' });
        } finally {
          // Clean up the uploaded file
          fs.unlinkSync(file.filepath);
        }
      });
  } catch (error) {
    console.error('Error parsing form data:', error);
    res.status(500).json({ error: 'Failed to process upload' });
  }
}
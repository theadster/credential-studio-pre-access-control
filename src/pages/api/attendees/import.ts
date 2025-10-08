import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { generateBarcode } from '@/util/string';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Check import permission
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    const hasImportPermission = permissions?.attendees?.import === true || permissions?.all === true;

    if (!hasImportPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

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
          const eventSettingsDocs = await databases.listDocuments(dbId, eventSettingsCollectionId);
          const eventSettings = eventSettingsDocs.documents[0];
          
          if (!eventSettings) {
            throw new Error('Event settings not found. Please configure event settings first.');
          }

          // Fetch custom fields to map internal names to IDs and get field options
          const customFieldsDocs = await databases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [Query.limit(100)]
          );
          const customFields = customFieldsDocs.documents;
          
          const customFieldMap = new Map(customFields.map(cf => [cf.internalFieldName, cf.$id]));
          const customFieldOptionsMap = new Map(
            customFields.map(cf => [cf.internalFieldName, { fieldType: cf.fieldType, fieldOptions: cf.fieldOptions }])
          );

          // Get existing barcode numbers to ensure uniqueness
          const existingAttendeesDocs = await databases.listDocuments(
            dbId,
            attendeesCollectionId,
            [Query.limit(5000)] // Adjust limit as needed
          );
          const existingBarcodes = new Set(existingAttendeesDocs.documents.map(a => a.barcodeNumber));

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

            const customFieldsData: { [key: string]: string } = {};
            
            Object.entries(customFieldValues).forEach(([internalName, value]) => {
              const customFieldId = customFieldMap.get(internalName);
              const fieldInfo = customFieldOptionsMap.get(internalName);
              
              if (customFieldId && value) {
                let processedValue = String(value);
                
                // Apply uppercase transformation for text fields if enabled
                if (fieldInfo?.fieldType === 'text' && (fieldInfo?.fieldOptions as any)?.uppercase === true) {
                  processedValue = processedValue.toUpperCase();
                }
                
                customFieldsData[customFieldId] = processedValue;
              }
            });

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
              customFieldValues: JSON.stringify(customFieldsData),
            };
          }).filter(Boolean) as any[];

          // Create all attendees
          let createdCount = 0;
          const errors: Array<{ row: number; error: string }> = [];

          for (let i = 0; i < attendeesToCreate.length; i++) {
            try {
              await databases.createDocument(
                dbId,
                attendeesCollectionId,
                ID.unique(),
                attendeesToCreate[i]
              );
              createdCount++;
            } catch (error: any) {
              errors.push({ row: i + 1, error: error.message || 'Failed to create' });
            }
          }

          // Log the import action
          await databases.createDocument(
            dbId,
            logsCollectionId,
            ID.unique(),
            {
              userId: user.$id,
              action: 'import',
              details: JSON.stringify({
                type: 'attendee',
                count: createdCount,
                fileName: file.originalFilename,
              })
            }
          );

          res.status(200).json({
            message: 'Attendees imported successfully',
            count: createdCount,
            errors
          });
        } catch (error: any) {
          console.error('Error importing attendees:', error);
          res.status(500).json({ error: 'Failed to import attendees', details: error.message });
        } finally {
          // Clean up the uploaded file
          fs.unlinkSync(file.filepath);
        }
      });
  } catch (error: any) {
    console.error('Error parsing form data:', error);
    
    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ error: 'Unauthorized' });
    } else if (error.code === 404) {
      return res.status(404).json({ error: 'Resource not found' });
    }
    
    res.status(500).json({ error: 'Failed to process upload' });
  }
};

export default withAuth(handler);

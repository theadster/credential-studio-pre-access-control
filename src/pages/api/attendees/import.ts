import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { generateBarcode } from '@/util/string';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';

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
    
    // Use session client for validation and reading settings
    const { databases: sessionDatabases } = createSessionClient(req);
    
    // Use admin client for bulk operations to avoid rate limiting
    const { databases: adminDatabases } = createAdminClient();

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
    const eventSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_COLLECTION_ID!;

    // Check import permission
    // Check import permission
    const permissions = userProfile?.role?.permissions || {};
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

    // Wrap CSV parsing in a Promise to properly handle async response
    await new Promise<void>((resolve, reject) => {
      const results: any[] = [];
      fs.createReadStream(file.filepath)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
        try {
          // Fetch event settings for barcode configuration using session client
          const eventSettingsDocs = await sessionDatabases.listDocuments(dbId, eventSettingsCollectionId);
          const eventSettings = eventSettingsDocs.documents[0];

          if (!eventSettings || !eventSettings.barcodeType || !eventSettings.barcodeLength) {
            return res.status(400).json({
              error: 'Event settings not found or incomplete. Please configure event settings first.'
            });
          }

          // Fetch custom fields to map internal names to IDs and get field options using session client
          const customFieldsDocs = await sessionDatabases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [Query.limit(100)]
          );
          const customFields = customFieldsDocs.documents;

          const customFieldMap = new Map(customFields.map(cf => [cf.internalFieldName, cf.$id]));
          const customFieldOptionsMap = new Map(
            customFields.map(cf => {
              // Parse fieldOptions if it's a JSON string
              let fieldOptions = cf.fieldOptions;
              if (typeof fieldOptions === 'string') {
                try {
                  fieldOptions = JSON.parse(fieldOptions);
                } catch (e) {
                  fieldOptions = {};
                }
              }
              return [cf.internalFieldName, { fieldType: cf.fieldType, fieldOptions: fieldOptions }];
            })
          );

          // Get existing barcode numbers to ensure uniqueness
          // Fetch all attendees using pagination to avoid missing barcodes
          // Use admin client for better performance with large datasets
          console.log('[Import] Fetching existing barcodes...');
          const existingBarcodes = new Set<string>();
          const pageSize = 1000;
          let offset = 0;
          let hasMore = true;
          let pageNumber = 1;

          while (hasMore) {
            try {
              const page = await adminDatabases.listDocuments(
                dbId,
                attendeesCollectionId,
                [Query.limit(pageSize), Query.offset(offset), Query.select(['barcodeNumber'])]
              );

              page.documents.forEach(doc => {
                if (doc.barcodeNumber) {
                  existingBarcodes.add(doc.barcodeNumber);
                }
              });

              hasMore = page.documents.length === pageSize;
              offset += pageSize;
              pageNumber++;
            } catch (error) {
              console.error('Failed to fetch existing barcodes during pagination:', {
                dbId,
                attendeesCollectionId,
                offset,
                pageSize,
                pageNumber,
                error: error instanceof Error ? error.message : String(error)
              });

              return res.status(500).json({
                error: 'Failed to fetch existing barcodes',
                details: `Error occurred at page ${pageNumber} (offset ${offset})`,
                message: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
          
          console.log(`[Import] Found ${existingBarcodes.size} existing barcodes`);

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

              if (customFieldId && value !== null && value !== undefined && value !== '') {
                let processedValue: string | boolean = String(value);

                // Handle boolean fields - convert YES/NO, TRUE/FALSE, 1/0 to yes/no
                // The UI uses 'yes'/'no' strings for boolean Switch components
                if (fieldInfo?.fieldType === 'boolean') {
                  const truthyValues = ['yes', 'true', '1'];
                  const falsyValues = ['no', 'false', '0'];
                  const lowerValue = String(value).toLowerCase().trim();
                  
                  if (truthyValues.includes(lowerValue)) {
                    processedValue = 'yes';
                  } else if (falsyValues.includes(lowerValue)) {
                    processedValue = 'no';
                  } else {
                    // Default to no for unrecognized values
                    processedValue = 'no';
                  }
                }
                // Apply uppercase transformation for text fields if enabled
                else if (fieldInfo?.fieldType === 'text') {
                  const uppercase = fieldInfo?.fieldOptions?.uppercase;
                  if (uppercase === true) {
                    processedValue = processedValue.toUpperCase();
                  }
                }

                customFieldsData[customFieldId] = processedValue;
              }
            });

            // Generate unique barcode with safeguard against infinite loops
            const MAX_BARCODE_ATTEMPTS = 10000;
            let generatedBarcode: string;
            let attempts = 0;

            do {
              generatedBarcode = generateBarcode(eventSettings.barcodeType, eventSettings.barcodeLength);
              attempts++;

              if (attempts >= MAX_BARCODE_ATTEMPTS) {
                const errorMsg = `Failed to generate unique barcode after ${MAX_BARCODE_ATTEMPTS} attempts. Barcode space may be exhausted.`;
                console.error('Barcode generation failure:', {
                  barcodeType: eventSettings.barcodeType,
                  barcodeLength: eventSettings.barcodeLength,
                  existingBarcodesCount: existingBarcodes.size,
                  attempts,
                  firstName,
                  lastName
                });

                return res.status(500).json({
                  error: 'Barcode generation failed',
                  details: errorMsg,
                  suggestion: 'Consider increasing barcode length or changing barcode type to expand the available barcode space.'
                });
              }
            } while (existingBarcodes.has(generatedBarcode));

            // Add the generated barcode to the set to avoid duplicates within this import
            existingBarcodes.add(generatedBarcode);

            return {
              firstName: processedFirstName,
              lastName: processedLastName,
              barcodeNumber: generatedBarcode,
              customFieldValues: JSON.stringify(customFieldsData),
              notes: '', // Set to empty string instead of null to avoid false change detection
            };
          }).filter(Boolean) as any[];

          // Create all attendees using admin client to avoid rate limiting
          console.log(`[Import] Creating ${attendeesToCreate.length} attendees using admin client`);
          let createdCount = 0;
          const errors: Array<{ row: number; error: string }> = [];
          const createdAttendees: Array<{ firstName: string; lastName: string }> = [];
          const delayBetweenCreations = 50; // 50ms delay between creations (20 per second)

          for (let i = 0; i < attendeesToCreate.length; i++) {
            try {
              await adminDatabases.createDocument(
                dbId,
                attendeesCollectionId,
                ID.unique(),
                attendeesToCreate[i]
              );
              createdCount++;
              createdAttendees.push({
                firstName: attendeesToCreate[i].firstName,
                lastName: attendeesToCreate[i].lastName,
              });
              
              // Small delay to avoid overwhelming the API
              if (i < attendeesToCreate.length - 1) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenCreations));
              }
            } catch (error: any) {
              const errorMessage = error.message || 'Failed to create';
              errors.push({ row: i + 1, error: errorMessage });
              console.error(`[Import] Failed to create attendee at row ${i + 1}: ${errorMessage}`);
              
              // If rate limited, wait longer before continuing
              if (error.code === 429) {
                console.log('[Import] Rate limit detected, waiting 2 seconds before continuing...');
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }
          }
          
          console.log(`[Import] Import complete: ${createdCount} created, ${errors.length} errors`);
          // Log the import action with detailed information if enabled
          // Use admin client for logging to avoid rate limiting
          if (await shouldLog('attendeeImport')) {
            try {
              const { createImportLogDetails } = await import('@/lib/logFormatting');
              const importedNames = createdAttendees.map((a) => `${a.firstName} ${a.lastName}`);
              
              // Create log details
              const logDetails = createImportLogDetails('attendees', createdCount, {
                filename: file.originalFilename,
                names: importedNames,
                totalRows: results.length,
                successCount: createdCount,
                errorCount: errors.length,
                ...(errors.length > 0 && { errors: errors.slice(0, 10) }) // Include first 10 errors
              });

              // Convert to JSON string
              let detailsString = JSON.stringify(logDetails);

              // Appwrite has a 10,000 character limit for string attributes
              const MAX_DETAILS_LENGTH = 9500; // Leave some buffer
              
              if (detailsString.length > MAX_DETAILS_LENGTH) {
                console.warn(`[Import] Log details too large (${detailsString.length} chars), truncating...`);
                
                // Create a truncated version with summary only
                const truncatedDetails = createImportLogDetails('attendees', createdCount, {
                  filename: file.originalFilename,
                  names: importedNames.slice(0, 10), // Keep first 10 names
                  namesTruncated: importedNames.length > 10,
                  totalNames: importedNames.length,
                  totalRows: results.length,
                  successCount: createdCount,
                  errorCount: errors.length,
                  ...(errors.length > 0 && { 
                    errors: errors.slice(0, 10),
                    errorsTruncated: errors.length > 10
                  }),
                  note: `Full details truncated due to size. Imported ${createdCount} attendees.`
                });
                
                detailsString = JSON.stringify(truncatedDetails);
                
                // If still too large, create minimal log
                if (detailsString.length > MAX_DETAILS_LENGTH) {
                  console.warn(`[Import] Log details still too large, using minimal log`);
                  detailsString = JSON.stringify({
                    type: 'attendees',
                    action: 'import',
                    filename: file.originalFilename,
                    totalRows: results.length,
                    successCount: createdCount,
                    errorCount: errors.length,
                    note: `Imported ${createdCount} attendees. Details truncated due to size.`
                  });
                }
              }
              
              await adminDatabases.createDocument(
                dbId,
                logsCollectionId,
                ID.unique(),
                {
                  userId: user.$id,
                  action: 'import',
                  details: detailsString
                }
              );
            } catch (logError) {
              console.error('[Import] Failed to write audit log:', logError);
            }
          }

          res.status(200).json({
            message: 'Attendees imported successfully',
            count: createdCount,
            errors
          });
          resolve();
        } catch (error: any) {
          console.error('Error importing attendees:', error);
          res.status(500).json({ error: 'Failed to import attendees', details: error.message });
          reject(error);
        } finally {
          // Clean up the uploaded file
          fs.unlinkSync(file.filepath);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        fs.unlinkSync(file.filepath);
        res.status(500).json({ error: 'Failed to read CSV file', details: error.message });
        reject(error);
      });
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

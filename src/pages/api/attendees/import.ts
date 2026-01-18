import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import formidable from 'formidable';
import fs from 'fs';
import csv from 'csv-parser';
import { generateBarcode } from '@/util/string';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { bulkImportWithFallback } from '@/lib/bulkOperations';
import { handleTransactionError, detectTransactionErrorType, TransactionErrorType } from '@/lib/transactions';
import { normalizeCustomFieldValues, stringifyCustomFieldValues } from '@/lib/customFieldNormalization';

export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests.',
      retryable: false,
      type: 'VALIDATION',
      details: {
        suggestion: 'Use POST method to import attendees.'
      }
    });
  }

  try {
    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    
    // Use session client for validation and reading settings
    const { databases: sessionDatabases } = createSessionClient(req);
    
    // Use admin client for bulk operations to avoid rate limiting
    const { databases: adminDatabases, tablesDB } = createAdminClient();

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
      return res.status(403).json({ 
        error: 'Permission denied',
        message: 'You do not have permission to import attendees.',
        retryable: false,
        type: 'PERMISSION',
        details: {
          suggestion: 'Contact your administrator to request import permissions.'
        }
      });
    }

    const form = formidable({});
    const [fields, files] = await form.parse(req);

    const file = files.file?.[0];

    if (!file) {
      return res.status(400).json({ 
        error: 'Validation error',
        message: 'No file uploaded. Please select a CSV file to import.',
        retryable: false,
        type: 'VALIDATION',
        details: {
          suggestion: 'Select a valid CSV file and try again.'
        }
      });
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
              error: 'Validation error',
              message: 'Event settings not found or incomplete. Please configure event settings first.',
              retryable: false,
              type: 'VALIDATION',
              details: {
                suggestion: 'Go to Event Settings and configure barcode type and length before importing attendees.'
              }
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
              return [cf.internalFieldName, { 
                fieldType: cf.fieldType, 
                fieldOptions: fieldOptions,
                defaultValue: cf.defaultValue,
                fieldId: cf.$id
              }];
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
                error: 'Internal server error',
                message: `Failed to fetch existing barcodes. Error occurred at page ${pageNumber} (offset ${offset}).`,
                retryable: true,
                type: 'NETWORK',
                details: {
                  suggestion: 'Wait a moment and try again. If the problem persists, contact support.',
                  technicalDetails: error instanceof Error ? error.message : 'Unknown error'
                }
              });
            }
          }
          
          console.log(`[Import] Found ${existingBarcodes.size} existing barcodes`);

          const attendeesToCreate = results.map(row => {
            const { firstName, lastName, barcodeNumber, validFrom, validUntil, accessEnabled, ...customFieldValues } = row;

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

            // First, apply default values for all custom fields
            customFieldOptionsMap.forEach((fieldInfo, internalName) => {
              if (fieldInfo.defaultValue !== undefined && fieldInfo.defaultValue !== '') {
                customFieldsData[fieldInfo.fieldId] = fieldInfo.defaultValue;
              } else if (fieldInfo.fieldType === 'boolean') {
                // Boolean fields default to 'no' if no default value is set
                customFieldsData[fieldInfo.fieldId] = 'no';
              }
            });

            // Then, override with values from the CSV
            Object.entries(customFieldValues).forEach(([internalName, value]) => {
              const customFieldId = customFieldMap.get(internalName);
              const fieldInfo = customFieldOptionsMap.get(internalName);

              if (customFieldId && value !== null && value !== undefined && value !== '') {
                let processedValue: string | boolean = String(value);

                // CRITICAL: Boolean fields MUST be stored as 'yes'/'no' (NOT 'true'/'false')
                // Convert various input formats (YES/NO, TRUE/FALSE, 1/0) to standardized 'yes'/'no'
                // This ensures consistency with:
                // - Form Switch component
                // - Switchboard integration field mappings
                // - Bulk edit operations
                // - Database queries and display logic
                if (fieldInfo?.fieldType === 'boolean') {
                  const truthyValues = ['yes', 'true', '1'];
                  const falsyValues = ['no', 'false', '0'];
                  const lowerValue = String(value).toLowerCase().trim();
                  
                  if (truthyValues.includes(lowerValue)) {
                    processedValue = 'yes';  // Always store as 'yes', never 'true'
                  } else if (falsyValues.includes(lowerValue)) {
                    processedValue = 'no';   // Always store as 'no', never 'false'
                  } else {
                    // Default to 'no' for unrecognized values
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
                  error: 'Internal server error',
                  message: errorMsg,
                  retryable: false,
                  type: 'VALIDATION',
                  details: {
                    suggestion: 'Consider increasing barcode length or changing barcode type to expand the available barcode space.',
                    technicalDetails: `Barcode type: ${eventSettings.barcodeType}, Length: ${eventSettings.barcodeLength}, Existing count: ${existingBarcodes.size}`
                  }
                });
              }
            } while (existingBarcodes.has(generatedBarcode));

            // Add the generated barcode to the set to avoid duplicates within this import
            existingBarcodes.add(generatedBarcode);

            // For new records, set lastSignificantUpdate to creation time
            // This establishes a baseline for future credential status tracking
            const now = new Date().toISOString();

            // Process access control fields if access control is enabled
            let processedValidFrom: string | null = null;
            let processedValidUntil: string | null = null;
            let processedAccessEnabled = true; // Default to active

            if (eventSettings.accessControlEnabled) {
              // Process validFrom
              if (validFrom && String(validFrom).trim()) {
                const validFromStr = String(validFrom).trim();
                // Check if it already has time component
                if (validFromStr.includes('T')) {
                  processedValidFrom = validFromStr;
                } else {
                  // Date-only mode: append T00:00 for start of day
                  processedValidFrom = `${validFromStr}T00:00`;
                }
              } else if (eventSettings.accessControlDefaults?.validFromUseToday) {
                // Use today's date as default
                const today = new Date().toISOString().split('T')[0];
                processedValidFrom = `${today}T00:00`;
              } else if (eventSettings.accessControlDefaults?.validFrom) {
                processedValidFrom = eventSettings.accessControlDefaults.validFrom;
              }

              // Process validUntil
              if (validUntil && String(validUntil).trim()) {
                const validUntilStr = String(validUntil).trim();
                // Check if it already has time component
                if (validUntilStr.includes('T')) {
                  processedValidUntil = validUntilStr;
                } else {
                  // Date-only mode: append T23:59 for end of day
                  processedValidUntil = `${validUntilStr}T23:59`;
                }
              } else if (eventSettings.accessControlDefaults?.validUntil) {
                processedValidUntil = eventSettings.accessControlDefaults.validUntil;
              }

              // Process accessEnabled
              if (accessEnabled !== null && accessEnabled !== undefined && String(accessEnabled).trim()) {
                const truthyValues = ['yes', 'true', '1', 'active'];
                const falsyValues = ['no', 'false', '0', 'inactive'];
                const lowerValue = String(accessEnabled).toLowerCase().trim();
                
                if (truthyValues.includes(lowerValue)) {
                  processedAccessEnabled = true;
                } else if (falsyValues.includes(lowerValue)) {
                  processedAccessEnabled = false;
                }
                // Default remains true for unrecognized values
              } else if (eventSettings.accessControlDefaults?.accessEnabled !== undefined) {
                processedAccessEnabled = eventSettings.accessControlDefaults.accessEnabled;
              }
            }

            // Normalize custom field values to ensure proper format (prevents legacy array format)
            const normalizedCustomFieldValues = normalizeCustomFieldValues(customFieldsData);
            
            return {
              firstName: processedFirstName,
              lastName: processedLastName,
              barcodeNumber: generatedBarcode,
              customFieldValues: stringifyCustomFieldValues(normalizedCustomFieldValues),
              notes: '', // Set to empty string instead of null to avoid false change detection
              lastSignificantUpdate: now, // Initialize for new records
              // Access control fields (only included if access control is enabled)
              ...(eventSettings.accessControlEnabled && {
                validFrom: processedValidFrom,
                validUntil: processedValidUntil,
                accessEnabled: processedAccessEnabled
              })
            };
          }).filter(Boolean) as any[];

          // Prepare attendees for bulk import
          console.log(`[Import] Creating ${attendeesToCreate.length} attendees using transactions`);
          const createdAttendees: Array<{ firstName: string; lastName: string }> = attendeesToCreate.map(a => ({
            firstName: a.firstName,
            lastName: a.lastName
          }));

          // Prepare audit log details
          const importedNames = createdAttendees.map((a) => `${a.firstName} ${a.lastName}`);
          let auditLogDetails: any = {
            type: 'attendees',
            action: 'import',
            filename: file.originalFilename,
            totalRows: results.length,
            successCount: attendeesToCreate.length
          };

          // If logging is enabled, include more details
          if (await shouldLog('attendeeImport')) {
            const { createImportLogDetails } = await import('@/lib/logFormatting');
            auditLogDetails = createImportLogDetails('attendees', attendeesToCreate.length, {
              filename: file.originalFilename,
              names: importedNames.slice(0, 10), // Keep first 10 names
              namesTruncated: importedNames.length > 10,
              totalNames: importedNames.length,
              totalRows: results.length,
              successCount: attendeesToCreate.length,
              errorCount: 0
            });
          }

          // Use bulk import with transaction support and fallback
          try {
            const importResult = await bulkImportWithFallback(
              tablesDB,
              adminDatabases,
              {
                databaseId: dbId,
                tableId: attendeesCollectionId,
                items: attendeesToCreate.map(data => ({ data })),
                auditLog: {
                  tableId: logsCollectionId,
                  userId: user.$id,
                  action: 'import',
                  details: auditLogDetails
                }
              }
            );

            const createdCount = importResult.createdCount;
            const usedTransactions = importResult.usedTransactions;
            
            console.log(
              `[Import] Import complete: ${createdCount} created, ` +
              `used transactions: ${usedTransactions}` +
              (importResult.batchCount ? `, batches: ${importResult.batchCount}` : '')
            );
            // Audit log is now created within the transaction
            // No separate logging needed here

            res.status(200).json({
              message: 'Attendees imported successfully',
              count: createdCount,
              usedTransactions,
              ...(importResult.batchCount && { batchCount: importResult.batchCount })
            });
            resolve();
          } catch (importError: any) {
            // Detect error type for logging and monitoring
            const errorType = detectTransactionErrorType(importError);
            
            // Log conflict occurrences for monitoring
            if (errorType === TransactionErrorType.CONFLICT) {
              console.warn('[Import] Transaction conflict detected after retries', {
                userId: user.$id,
                attemptedCount: attendeesToCreate.length,
                errorMessage: importError.message,
                timestamp: new Date().toISOString()
              });
            } else {
              console.error('[Import] Transaction error', {
                userId: user.$id,
                errorType,
                attemptedCount: attendeesToCreate.length,
                errorMessage: importError.message,
                timestamp: new Date().toISOString()
              });
            }
            
            // Use centralized error handler for consistent responses
            handleTransactionError(importError, res);
            resolve();
          }
        } catch (error: any) {
          console.error('Error importing attendees:', error);
          res.status(500).json({ 
            error: 'Internal server error',
            message: 'Failed to import attendees. An unexpected error occurred.',
            retryable: false,
            type: 'UNKNOWN',
            details: {
              suggestion: 'If this error continues, please contact support with the error details.',
              technicalDetails: error.message
            }
          });
          reject(error);
        } finally {
          // Clean up the uploaded file
          fs.unlinkSync(file.filepath);
        }
      })
      .on('error', (error) => {
        console.error('Error reading CSV file:', error);
        fs.unlinkSync(file.filepath);
        res.status(400).json({ 
          error: 'Validation error',
          message: 'Failed to read CSV file. The file may be corrupted or in an invalid format.',
          retryable: false,
          type: 'VALIDATION',
          details: {
            suggestion: 'Ensure the file is a valid CSV format and try again.',
            technicalDetails: error.message
          }
        });
        reject(error);
      });
    });
  } catch (error: any) {
    console.error('Error parsing form data:', error);

    // Handle Appwrite-specific errors
    if (error.code === 401) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Your session has expired. Please log in again.',
        retryable: false,
        type: 'PERMISSION',
        details: {
          suggestion: 'Log out and log back in to refresh your session.'
        }
      });
    } else if (error.code === 404) {
      return res.status(404).json({ 
        error: 'Resource not found',
        message: 'The requested resource could not be found.',
        retryable: false,
        type: 'NOT_FOUND',
        details: {
          suggestion: 'Refresh the page and try again.'
        }
      });
    }

    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to process upload. An unexpected error occurred.',
      retryable: false,
      type: 'UNKNOWN',
      details: {
        suggestion: 'If this error continues, please contact support.',
        technicalDetails: error.message
      }
    });
  }
};

export default withAuth(handler);

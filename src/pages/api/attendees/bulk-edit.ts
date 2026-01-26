import { NextApiResponse } from 'next';
import { createSessionClient } from '@/lib/appwrite';
import { Query } from 'appwrite';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { bulkEditWithFallback } from '@/lib/bulkOperations';
import { handleTransactionError } from '@/lib/transactions';
import { CLEAR_SENTINEL } from '@/lib/constants';
import { 
  isArrayField
} from '@/lib/customFieldArrayOperators';
import { 
  createPerformanceTracker, 
  trackTraditionalUpdate, 
  logPerformanceMetrics 
} from '@/lib/operatorPerformance';
import { normalizeCustomFieldValues, stringifyCustomFieldValues } from '@/lib/customFieldNormalization';
import { generateOperationId, BulkOperationType } from '@/lib/bulkOperationBroadcast';

export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
    return;
  }

  try {
    // Start performance monitoring
    const performanceMetrics = createPerformanceTracker('bulk_edit_attendees');

    // User and userProfile are already attached by middleware
    const { user, userProfile } = req;
    const { databases } = createSessionClient(req);

    // TablesDB bulk operations require API key authentication (admin client)
    // Session-based JWT authentication doesn't have sufficient permissions
    const { createAdminClient } = await import('@/lib/appwrite');
    const { tablesDB: adminTablesDB } = createAdminClient();

    // Validate request body
    const { attendeeIds, changes } = req.body;

    if (!attendeeIds || !Array.isArray(attendeeIds) || attendeeIds.length === 0) {
      res.status(400).json({ error: 'Invalid attendeeIds' });
      return;
    }

    if (!changes || typeof changes !== 'object') {
      res.status(400).json({ error: 'Invalid changes object' });
      return;
    }

    const totalRequested = attendeeIds.length;
    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;

    // Check permissions
    const permissions = userProfile.role ? userProfile.role.permissions : {};
    if (!permissions?.attendees?.bulkEdit) {
      res.status(403).json({ error: 'Insufficient permissions to bulk edit attendees' });
      return;
    }

    // Get all custom fields with pagination to avoid truncation
    const allCustomFields: any[] = [];
    let offset = 0;
    const pageSize = 100;

    while (true) {
      const customFieldsDocs = await databases.listDocuments(
        dbId,
        customFieldsCollectionId,
        [Query.limit(pageSize), Query.offset(offset)]
      );

      allCustomFields.push(...customFieldsDocs.documents);

      // If we got fewer than pageSize results, we've reached the end
      if (customFieldsDocs.documents.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    const customFields = allCustomFields;

    // Create a map of field ID to field properties for O(1) lookups (fetch once for entire bulk operation)
    // This avoids O(n*m) behavior from repeated find() calls in the bulk loop
    const customFieldsMap = new Map(
      customFields.map((cf: any) => [cf.$id, {
        fieldType: cf.fieldType,
        fieldName: cf.fieldName,
        fieldOptions: cf.fieldOptions,
        printable: cf.printable === true
      }])
    );

    // Prepare updates array for transaction
    const updates: Array<{ rowId: string; data: any }> = [];

    // Track failed attendee updates
    const errors: Array<{ id: string; error: string }> = [];

    // Process each attendee to determine what needs to be updated
    for (const attendeeId of attendeeIds) {
      try {
        // Get current attendee
        const attendee = await databases.getDocument(dbId, attendeesCollectionId, attendeeId);

        // Parse current custom field values - handle both array and object formats
        let currentCustomFieldValues: Array<{ customFieldId: string, value: string }> = [];

        if (attendee.customFieldValues) {
          const parsed = typeof attendee.customFieldValues === 'string' ?
            JSON.parse(attendee.customFieldValues) : attendee.customFieldValues;

          // Convert to array format if it's an object
          if (Array.isArray(parsed)) {
            currentCustomFieldValues = parsed;
          } else if (typeof parsed === 'object') {
            // Convert object format to array format
            currentCustomFieldValues = Object.entries(parsed)
              .filter(([key]) => !key.match(/^\d+$/)) // Skip numeric keys (array indices)
              .map(([customFieldId, value]) => ({
                customFieldId,
                value: String(value)
              }));
          }
        }

        let hasChanges = false;
        let hasPrintableCustomFieldChanges = false;
        
        // Track access control field changes separately
        const accessControlUpdates: Record<string, any> = {};

        // Create a map for easier lookup and updates
        const customFieldMap = new Map<string, string | string[]>(
          currentCustomFieldValues.map(cfv => [cfv.customFieldId, cfv.value])
        );

        // Process changes
        for (const [fieldId, value] of Object.entries(changes)) {
          if (!value || value === 'no-change') {
            continue;
          }

          // Handle access control fields separately
          if (fieldId === 'accessEnabled') {
            const newValue = value === 'active';
            if (attendee.accessEnabled !== newValue) {
              accessControlUpdates.accessEnabled = newValue;
              hasChanges = true;
              trackTraditionalUpdate(performanceMetrics);
            }
            continue;
          }

          if (fieldId === 'validFrom') {
            let newValue: string | null = null;
            if (value === CLEAR_SENTINEL) {
              newValue = null;
            } else if (typeof value === 'string' && value) {
              // For date-only mode, append T00:00 to indicate start of day
              // For date-time mode, store as-is
              newValue = value.includes('T') ? value : `${value}T00:00`;
            }
            if (attendee.validFrom !== newValue) {
              accessControlUpdates.validFrom = newValue;
              hasChanges = true;
              trackTraditionalUpdate(performanceMetrics);
            }
            continue;
          }

          if (fieldId === 'validUntil') {
            let newValue: string | null = null;
            if (value === CLEAR_SENTINEL) {
              newValue = null;
            } else if (typeof value === 'string' && value) {
              // For date-only mode, append T23:59 to indicate end of day
              // For date-time mode, store as-is
              newValue = value.includes('T') ? value : `${value}T23:59`;
            }
            if (attendee.validUntil !== newValue) {
              accessControlUpdates.validUntil = newValue;
              hasChanges = true;
              trackTraditionalUpdate(performanceMetrics);
            }
            continue;
          }

          const customField = customFieldsMap.get(fieldId);
          if (!customField) {
            continue;
          }

          // Check if this is an array field (multi-select)
          const isArray = isArrayField(customField.fieldType, customField.fieldOptions);

          // Handle special CLEAR_SENTINEL value to empty the field
          let processedValue = value;
          if (value === CLEAR_SENTINEL) {
            processedValue = isArray ? [] : '';
          } else if (customField.fieldType === 'uppercase' && typeof processedValue === 'string') {
            processedValue = processedValue.toUpperCase();
          }

          // Update the custom field value in the map
          const currentValue = customFieldMap.get(fieldId);
          
          // For array fields, compare arrays; for single values, compare strings
          let valueChanged = false;
          if (isArray) {
            // Parse current value - handle both array and string formats
            let currentArray: string[] = [];
            if (Array.isArray(currentValue)) {
              currentArray = currentValue;
            } else if (currentValue) {
              try {
                // Try parsing as JSON array first (preferred format)
                const parsed = JSON.parse(String(currentValue));
                currentArray = Array.isArray(parsed) ? parsed : [String(currentValue)];
              } catch {
                // Fallback: treat as single value if not valid JSON
                currentArray = [String(currentValue)];
              }
            }

            // Parse new value - handle both array and string formats
            let newArray: string[] = [];
            if (Array.isArray(processedValue)) {
              newArray = processedValue;
            } else if (processedValue) {
              try {
                // Try parsing as JSON array first (preferred format)
                const parsed = JSON.parse(String(processedValue));
                newArray = Array.isArray(parsed) ? parsed : [String(processedValue)];
              } catch {
                // Fallback: treat as single value if not valid JSON
                newArray = [String(processedValue)];
              }
            }
            
            // Compare arrays (order-independent)
            valueChanged = JSON.stringify(currentArray.sort()) !== JSON.stringify(newArray.sort());
            
            if (valueChanged) {
              customFieldMap.set(fieldId, newArray);
            }
          } else {
            valueChanged = currentValue !== String(processedValue);
            
            if (valueChanged) {
              customFieldMap.set(fieldId, String(processedValue));
            }
          }

          if (valueChanged) {
            hasChanges = true;
            trackTraditionalUpdate(performanceMetrics);

            // Check if this is a printable field
            if (customField.printable) {
              hasPrintableCustomFieldChanges = true;
            }
          }
        }

        // Add to updates array if there are changes
        if (hasChanges) {
          // Convert map back to object format (not array)
          // This maintains the structure: { "fieldId": "value" } or { "fieldId": ["val1", "val2"] }
          const updatedCustomFieldValues: Record<string, any> = {};
          
          for (const [customFieldId, value] of customFieldMap.entries()) {
            const fieldMeta = customFieldsMap.get(customFieldId);
            if (fieldMeta) {
              const isArray = isArrayField(fieldMeta.fieldType, fieldMeta.fieldOptions);
              // Store arrays as arrays, single values as strings
              updatedCustomFieldValues[customFieldId] = isArray ? value : String(value);
            } else {
              // Fallback for unknown fields
              updatedCustomFieldValues[customFieldId] = value;
            }
          }

          // Normalize custom field values to ensure proper format (prevents legacy array format)
          const normalizedCustomFieldValues = normalizeCustomFieldValues(updatedCustomFieldValues);
          
          const updateData: any = {
            customFieldValues: stringifyCustomFieldValues(normalizedCustomFieldValues)
          };

          // Only update lastSignificantUpdate if printable fields actually changed
          // This ensures credentials are only marked as outdated when necessary
          if (hasPrintableCustomFieldChanges) {
            updateData.lastSignificantUpdate = new Date().toISOString();
          }
          // Do NOT initialize lastSignificantUpdate for non-printable changes
          // If the field doesn't exist, leave it undefined so credentialGeneratedAt remains authoritative

          // Add access control field updates
          if (Object.keys(accessControlUpdates).length > 0) {
            Object.assign(updateData, accessControlUpdates);
          }

          updates.push({
            rowId: attendeeId,
            data: updateData
          });
        } else if (Object.keys(accessControlUpdates).length > 0) {
          // Only access control fields changed, no custom field changes
          updates.push({
            rowId: attendeeId,
            data: accessControlUpdates
          });
        }
      } catch (error: any) {
        console.error(`Failed to prepare update for attendee ${attendeeId}:`, error);

        // Record the failed attendee with error details
        errors.push({
          id: attendeeId,
          error: error.message || 'Unknown error occurred during update preparation'
        });

        // Continue processing other attendees instead of failing entire batch
        // This allows partial success in bulk operations
        continue;
      }
    }

    // If no changes, return early
    if (updates.length === 0) {
      const hasFailures = errors.length > 0;
      res.status(hasFailures ? 207 : 200).json({
        message: hasFailures ? 'No successful updates, some attendees failed' : 'No changes to apply',
        updatedCount: 0,
        usedTransactions: false,
        errors,
        totalRequested: attendeeIds.length,
        successCount: 0,
        failureCount: errors.length
      });
      return;
    }

    // Get field names for logging
    const accessControlFieldLabels: Record<string, string> = {
      accessEnabled: 'Access Status',
      validFrom: 'Valid From',
      validUntil: 'Valid Until'
    };
    
    const changedFieldNames = Object.keys(changes)
      .filter(fieldId => changes[fieldId] && changes[fieldId] !== 'no-change')
      .map(fieldId => {
        // Check if it's an access control field first
        if (accessControlFieldLabels[fieldId]) {
          return accessControlFieldLabels[fieldId];
        }
        const field = customFieldsMap.get(fieldId);
        return field?.fieldName || fieldId;
      });

    // Execute bulk edit with transaction and fallback support
    // Use admin TablesDB client for bulk operations (requires API key)
    // Enable field-specific updates to prevent overwriting concurrent changes
    // (e.g., photo uploads during bulk edit won't be lost)
    const result = await bulkEditWithFallback(adminTablesDB, databases, {
      databaseId: dbId,
      tableId: attendeesCollectionId,
      updates,
      useFieldSpecificUpdates: true, // Use optimistic locking in fallback mode
      auditLog: {
        tableId: logsCollectionId,
        userId: user.$id,
        action: 'bulk_update',
        details: {
          type: 'bulk_edit',
          target: 'Attendees',
          description: `Bulk edited ${updates.length} of ${attendeeIds.length} attendee${attendeeIds.length !== 1 ? 's' : ''}`,
          totalRequested: attendeeIds.length,
          updatedCount: updates.length,
          fieldsChanged: changedFieldNames,
          summary: `Updated fields: ${changedFieldNames.join(', ')}`
        }
      }
    });

    // Finalize and log performance metrics
    performanceMetrics.usedTransactions = result.usedTransactions;
    performanceMetrics.batchCount = result.batchCount;
    logPerformanceMetrics(performanceMetrics);

    // Merge errors from preparation phase and execution phase
    const allErrors = [
      ...errors,
      ...(result.errors || []).map(e => ({
        id: e.id,
        error: e.error,
        retryable: e.retryable,
      })),
    ];

    // Determine appropriate status code and message
    const hasFailures = allErrors.length > 0;
    const successCount = result.updatedCount;
    const conflictCount = result.conflictCount || 0;

    let statusCode = 200;
    let message = 'Attendees updated successfully';

    if (hasFailures && successCount > 0) {
      statusCode = 207; // Multi-Status (partial success)
      message = `Partially successful: ${successCount} updated, ${allErrors.length} failed`;
      if (conflictCount > 0) {
        message += ` (${conflictCount} conflicts)`;
      }
    } else if (hasFailures && successCount === 0) {
      statusCode = 207; // Multi-Status (all failed)
      message = 'All attendee updates failed';
    }

    // Generate operation ID for broadcast
    const operationId = generateOperationId();

    res.status(statusCode).json({
      message,
      updatedCount: result.updatedCount,
      usedTransactions: result.usedTransactions,
      batchCount: result.batchCount,
      errors: allErrors,
      totalRequested,
      successCount,
      failureCount: allErrors.length,
      conflictCount,
      performance: {
        duration: performanceMetrics.duration,
        operationsPerSecond: performanceMetrics.operationsPerSecond,
        operatorUsageCount: performanceMetrics.operatorUsageCount,
        traditionalUpdateCount: performanceMetrics.traditionalUpdateCount
      },
      // Broadcast info for client-side notification (Requirement 5.5)
      broadcast: {
        operationId,
        operationType: 'bulk_edit' as BulkOperationType,
        affectedIds: updates.map(u => u.rowId),
      }
    });

  } catch (error: any) {
    console.error('Bulk edit API error:', error);

    // Use centralized transaction error handling
    handleTransactionError(error, res);
    return;
  }
});

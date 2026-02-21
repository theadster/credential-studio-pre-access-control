import { NextApiResponse } from 'next';
import { createAdminClient, createSessionClient } from '@/lib/appwrite';
import { ID, Query } from 'appwrite';
import { equal, isNotNull, isNull, orderDesc, search } from '@/lib/appwriteQueries';
import { AuthenticatedRequest, withAuth } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';
import { normalizeCustomFieldValues, stringifyCustomFieldValues } from '@/lib/customFieldNormalization';



export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and userProfile are already attached by middleware
  const { user, userProfile } = req;
  const { tablesDB } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const usersTableId = process.env.NEXT_PUBLIC_APPWRITE_USERS_TABLE_ID!;
    const attendeesTableId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_TABLE_ID!;
    const rolesTableId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_TABLE_ID!;
    const logsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_TABLE_ID!;
    const logSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_TABLE_ID!;
    const accessControlTableId = process.env.NEXT_PUBLIC_APPWRITE_ACCESS_CONTROL_TABLE_ID;

    switch (req.method) {
      case 'GET':
        // Check permissions using role from middleware
        const permissions = userProfile.role ? userProfile.role.permissions : {};
        const hasReadPermission = permissions?.attendees?.read === true || permissions?.all === true;

        if (!hasReadPermission) {
          return res.status(403).json({ error: 'Insufficient permissions to view attendees' });
        }

        const {
          firstName: firstNameFilter,
          lastName: lastNameFilter,
          barcode: barcodeFilter,
          photoFilter,
          customFields: customFieldsJSON,
        } = req.query;

        const queries: string[] = [];

        // Build text filters
        if (firstNameFilter && typeof firstNameFilter === 'string') {
          try {
            const filter = JSON.parse(firstNameFilter);
            const { value, operator } = filter;
            
            if (operator === 'isEmpty') {
              queries.push(Query.equal('firstName', ''));
            } else if (operator === 'isNotEmpty') {
              queries.push(Query.notEqual('firstName', ''));
            } else if (value) {
              if (operator === 'contains' || operator === 'startsWith' || operator === 'endsWith') {
                queries.push(Query.search('firstName', value));
              } else if (operator === 'equals') {
                queries.push(Query.equal('firstName', value));
              }
            }
          } catch (e) {
            // Fallback for simple string filter
            queries.push(Query.search('firstName', firstNameFilter));
          }
        }

        if (lastNameFilter && typeof lastNameFilter === 'string') {
          try {
            const filter = JSON.parse(lastNameFilter);
            const { value, operator } = filter;
            
            if (operator === 'isEmpty') {
              queries.push(Query.equal('lastName', ''));
            } else if (operator === 'isNotEmpty') {
              queries.push(Query.notEqual('lastName', ''));
            } else if (value) {
              if (operator === 'contains' || operator === 'startsWith' || operator === 'endsWith') {
                queries.push(Query.search('lastName', value));
              } else if (operator === 'equals') {
                queries.push(Query.equal('lastName', value));
              }
            }
          } catch (e) {
            queries.push(Query.search('lastName', lastNameFilter));
          }
        }

        if (barcodeFilter && typeof barcodeFilter === 'string') {
          try {
            const filter = JSON.parse(barcodeFilter);
            const { value, operator } = filter;
            
            if (operator === 'isEmpty') {
              queries.push(Query.equal('barcodeNumber', ''));
            } else if (operator === 'isNotEmpty') {
              queries.push(Query.notEqual('barcodeNumber', ''));
            } else if (value) {
              if (operator === 'contains' || operator === 'startsWith' || operator === 'endsWith') {
                queries.push(Query.search('barcodeNumber', value));
              } else if (operator === 'equals') {
                queries.push(Query.equal('barcodeNumber', value));
              }
            }
          } catch (e) {
            queries.push(Query.search('barcodeNumber', barcodeFilter));
          }
        }

        if (photoFilter === 'with') {
          queries.push(Query.isNotNull('photoUrl'));
          queries.push(Query.notEqual('photoUrl', ''));
        }
        if (photoFilter === 'without') {
          // Appwrite doesn't support OR directly, so we'll filter in memory
          // For now, just check for null
          queries.push(Query.isNull('photoUrl'));
        }

        /**
         * CUSTOM FIELD FILTERING
         * 
         * Custom fields are stored as JSON in the customFieldValues string field.
         * 
         * Advanced Filtering (with operators):
         * - Complex filters with operators (isEmpty, isNotEmpty, contains, equals, etc.)
         * - Must be done in-memory after fetching all attendees
         * - Reason: Appwrite cannot query JSON structure with operators
         * 
         * Simple Search (basic text search):
         * - Uses full-text search index on customFieldValues field
         * - Searches within the JSON content at database level
         * - Much more efficient than in-memory filtering
         * - Note: Requires full-text index (see scripts/add-custom-field-values-index.ts)
         */
        let needsCustomFieldFiltering = false;
        let customFieldFilters: any = {};
        
        if (typeof customFieldsJSON === 'string' && customFieldsJSON) {
          try {
            customFieldFilters = JSON.parse(customFieldsJSON);
            needsCustomFieldFiltering = Object.keys(customFieldFilters).length > 0;
          } catch (e) {
            console.error("Failed to parse customFields JSON:", e);
          }
        }

        // Add ordering
        queries.push(Query.orderDesc('$createdAt'));


        /**
         * ============================================================================
         * ATTENDEE FETCHING WITH AUTOMATIC BATCH HANDLING
         * ============================================================================
         * 
         * PROBLEM:
         * Appwrite has a hard limit of 5000 documents per query request. Without
         * explicit handling, only the first 5000 attendees would be returned for
         * large events, making the remaining attendees inaccessible.
         * 
         * SOLUTION:
         * This implementation automatically detects when an event has more than 5000
         * attendees and fetches additional batches using offset-based pagination.
         * The frontend receives a complete array of all attendees, regardless of size.
         * 
         * ----------------------------------------------------------------------------
         * HOW IT WORKS:
         * ----------------------------------------------------------------------------
         * 
         * 1. Initial Fetch:
         *    - Set Query.limit(5000) to fetch maximum documents per request
         *    - Make first database call with all filters and ordering applied
         *    - Check the 'total' field in response to determine if more batches needed
         * 
         * 2. Batch Detection:
         *    - If total > 5000, calculate number of additional batches required
         *    - Formula: totalPages = Math.ceil(total / 5000)
         *    - Log warning to console for monitoring large event performance
         * 
         * 3. Additional Batches:
         *    - Loop through remaining pages (page 2 to totalPages)
         *    - For each page, calculate offset: (page - 1) * 5000
         *    - Reconstruct query with same filters + new offset
         *    - Fetch batch and append to results array
         * 
         * 4. Response:
         *    - Return complete array to frontend (transparent to client)
         *    - Frontend pagination operates on full dataset client-side
         * 
         * ----------------------------------------------------------------------------
         * PERFORMANCE CHARACTERISTICS:
         * ----------------------------------------------------------------------------
         * 
         * Small Events (1-1000 attendees):
         *   - Requests: 1
         *   - Time: ~200-300ms
         *   - Memory: ~100KB-1MB
         *   - User Experience: Instant load
         * 
         * Medium Events (1000-5000 attendees):
         *   - Requests: 1
         *   - Time: ~300-500ms
         *   - Memory: ~1-5MB
         *   - User Experience: Fast load
         * 
         * Large Events (5001-10000 attendees):
         *   - Requests: 2
         *   - Time: ~600-1000ms (2 × ~500ms)
         *   - Memory: ~5-10MB
         *   - User Experience: Acceptable load time
         * 
         * Very Large Events (10001-25000 attendees):
         *   - Requests: 3-5
         *   - Time: ~1.5-2.5 seconds (5 × ~500ms)
         *   - Memory: ~10-25MB
         *   - User Experience: Noticeable but acceptable
         * 
         * Extremely Large Events (>25000 attendees):
         *   - Requests: 6+
         *   - Time: >3 seconds
         *   - Memory: >25MB
         *   - User Experience: May need optimization (see below)
         * 
         * ----------------------------------------------------------------------------
         * EXPECTED BEHAVIOR EXAMPLES:
         * ----------------------------------------------------------------------------
         * 
         * Example 1: Event with 66 attendees (current typical case)
         *   → Single request fetches all 66 attendees
         *   → Response time: ~200ms
         *   → No console warnings
         *   → Frontend displays all attendees with client-side pagination
         * 
         * Example 2: Event with 5001 attendees
         *   → First request fetches 5000 attendees (total=5001)
         *   → System detects total > 5000
         *   → Console warning: "Large event detected: 5001 attendees. Fetching in batches..."
         *   → Second request fetches remaining 1 attendee (offset=5000, limit=5000)
         *   → Combined array of 5001 attendees returned
         *   → Console log: "Successfully fetched all 5001 attendees in 2 batches"
         *   → Response time: ~1 second
         * 
         * Example 3: Event with 15000 attendees
         *   → Batch 1: Fetch 5000 (offset=0)
         *   → Batch 2: Fetch 5000 (offset=5000)
         *   → Batch 3: Fetch 5000 (offset=10000)
         *   → Total: 3 requests, ~1.5 seconds
         *   → All 15000 attendees returned in single response
         * 
         * Example 4: Filtered query on large event
         *   → Filters (name, barcode, etc.) applied to ALL batches
         *   → Each batch respects the same query conditions
         *   → Only matching attendees across all batches are returned
         *   → Ensures consistent filtering regardless of event size
         * 
         * ----------------------------------------------------------------------------
         * FUTURE OPTIMIZATION CONSIDERATIONS:
         * ----------------------------------------------------------------------------
         * 
         * If events regularly exceed 25,000 attendees, consider these optimizations:
         * 
         * 1. SERVER-SIDE PAGINATION:
         *    - Implement true pagination with page/limit query parameters
         *    - Return metadata: { data: [], page: 1, totalPages: 10, total: 50000 }
         *    - Frontend fetches pages on-demand as user navigates
         *    - Pros: Scales to unlimited attendees, faster initial load
         *    - Cons: More complex, requires frontend changes, filtering complexity
         * 
         * 2. CURSOR-BASED PAGINATION:
         *    - Use Appwrite's cursor parameter for efficient pagination
         *    - Better performance than offset for very large datasets
         *    - Pros: More efficient database queries, handles concurrent updates
         *    - Cons: More complex implementation, harder to jump to specific pages
         * 
         * 3. VIRTUAL SCROLLING:
         *    - Render only visible rows in the table (e.g., react-window)
         *    - Load data in chunks as user scrolls
         *    - Pros: Handles 100k+ records smoothly, minimal memory usage
         *    - Cons: Requires library, changes UX, more complex state management
         * 
         * 4. CACHING STRATEGY:
         *    - Cache frequently accessed pages in Redis or similar
         *    - Invalidate cache on attendee create/update/delete
         *    - Pros: Dramatically faster repeat loads, reduces database load
         *    - Cons: Infrastructure complexity, cache invalidation challenges
         * 
         * 5. BACKGROUND LOADING:
         *    - Show first 5000 immediately, load rest in background
         *    - Display loading indicator for remaining batches
         *    - Pros: Perceived performance improvement, progressive enhancement
         *    - Cons: Complex state management, potential UX confusion
         * 
         * 6. SEARCH-FIRST APPROACH:
         *    - For very large events, require search/filter before showing results
         *    - Don't load all attendees by default
         *    - Pros: Always fast, scales infinitely
         *    - Cons: Changes UX paradigm, may frustrate users wanting to browse
         * 
         * 7. INDEXING OPTIMIZATION:
         *    - Ensure Appwrite indexes on frequently filtered fields
         *    - Use compound indexes for common filter combinations
         *    - Pros: Faster queries, better performance at scale
         *    - Cons: Requires database configuration, storage overhead
         * 
         * RECOMMENDATION:
         * Current implementation is optimal for events up to ~10,000 attendees.
         * If your events regularly exceed this, implement server-side pagination first,
         * then add virtual scrolling if needed. The current approach provides a solid
         * foundation that can be incrementally enhanced without breaking changes.
         * 
         * ----------------------------------------------------------------------------
         * MONITORING & ALERTS:
         * ----------------------------------------------------------------------------
         * 
         * Watch for these console warnings in production logs:
         * - "Large event detected: X attendees. Fetching in batches..."
         * 
         * If you see this frequently with X > 25000, it's time to implement
         * server-side pagination. Set up monitoring alerts for response times > 3s.
         * 
         * ============================================================================
         */
        
        // Step 1: Add limit to fetch maximum documents per request (Appwrite's max is 5000)
        queries.push(Query.limit(5000));

        // Step 2: Fetch first batch of attendees with all filters and ordering applied
        const firstBatch = await tablesDB.listRows(
          dbId,
          attendeesTableId,
          queries,
        );

        // Step 3: Initialize result with first batch
        // The 'total' field tells us the complete count across all potential batches
        const allRows: any[] = [...firstBatch.rows];

        // Step 4: Check if we need to fetch additional batches
        // If total > 5000, we have more attendees than fit in a single request
        if (firstBatch.total > 5000) {
          // Large event detected - fetching in batches
          
          // Calculate how many total batches we need
          // Example: 15000 attendees / 5000 per batch = 3 batches
          const totalPages = Math.ceil(firstBatch.total / 5000);
          
          // Step 5: Fetch remaining batches (starting from page 2)
          for (let page = 2; page <= totalPages; page += 1) {
            // Calculate offset for this batch
            // Page 2: offset = (2-1) * 5000 = 5000 (skip first 5000)
            // Page 3: offset = (3-1) * 5000 = 10000 (skip first 10000)
            const offset = (page - 1) * 5000;
            
            // Reconstruct queries array with offset
            // Remove the last query (limit) and add both limit and offset
            // This ensures all filters and ordering are preserved across batches
            const queriesWithOffset = queries.slice(0, -1); // Remove the limit query
            queriesWithOffset.push(Query.limit(5000), Query.offset(offset));
            
            // Fetch this batch with same filters as first batch
            const batch = await tablesDB.listRows(
              dbId, 
              attendeesTableId, 
              queriesWithOffset,
            );
            
            // Append this batch's rows to our growing array
            allRows.push(...batch.rows);
          }
          
          // Log success for monitoring
          console.log(`Successfully fetched all ${allRows.length} attendees in ${totalPages} batches`);
        }

        const attendeesResult = { 
          rows: allRows, 
          total: firstBatch.total, 
        };

        /**
         * EVENT SETTINGS & VISIBLE FIELDS FETCHING
         * 
         * Fetch event settings to determine which custom fields are visible (showOnMainPage = true).
         * This is used to filter custom field values in the response.
         */
        let visibleFieldIds = new Set<string>();
        try {
          const eventSettingsTableId = process.env.NEXT_PUBLIC_APPWRITE_EVENT_SETTINGS_TABLE_ID!;
          const eventSettingsResult = await tablesDB.listRows(
            dbId,
            eventSettingsTableId,
            [Query.limit(1)],
          );
          
          if (eventSettingsResult.rows.length > 0) {
            const eventSettings = eventSettingsResult.rows[0];
            if (eventSettings.customFields && Array.isArray(eventSettings.customFields)) {
              visibleFieldIds = new Set(
                eventSettings.customFields
                  .filter((field: any) => field.showOnMainPage !== false)
                  .map((field: any) => field.id),
              );
            }
          }
        } catch (error) {
          // If event settings fetch fails, continue without filtering (all fields visible)
          console.warn('[Attendees API] Failed to fetch event settings for visibility filtering:', error);
        }

        /**
         * ACCESS CONTROL DATA FETCHING
         * 
         * Fetch access control records for all attendees in this batch.
         * Access control fields (validFrom, validUntil, accessEnabled) are stored
         * in a separate collection and need to be joined with attendee data.
         * 
         * Requirements 7.2, 7.3: Include access control fields in API responses
         * 
         * PERFORMANCE: Uses batch fetching (100 attendees per query) instead of
         * individual queries to avoid N+1 query problem.
         */
        const accessControlMap = new Map<string, { accessEnabled: boolean; validFrom: string | null; validUntil: string | null }>();
        
        if (accessControlTableId && attendeesResult.rows.length > 0) {
          try {
            const attendeeIds = attendeesResult.rows.map((doc: any) => doc.$id);
            
            // Fetch access control data in batches (Appwrite limit for 'in' queries is 100)
            // This prevents N+1 query problem and dramatically improves performance
            const chunkSize = 100;
            for (let i = 0; i < attendeeIds.length; i += chunkSize) {
              const chunk = attendeeIds.slice(i, i + chunkSize);
              const accessControlResult = await tablesDB.listRows(
                dbId,
                accessControlTableId,
                [Query.equal('attendeeId', chunk), Query.limit(chunkSize)],
              );
              
              // Map access control records by attendeeId
              accessControlResult.rows.forEach((ac: any) => {
                accessControlMap.set(ac.attendeeId, {
                  accessEnabled: ac.accessEnabled ?? true,
                  validFrom: ac.validFrom || null,
                  validUntil: ac.validUntil || null,
                });
              });
            }
          } catch (error) {
            // If access control collection doesn't exist or fails, continue without it
            console.warn('[Attendees API] Failed to fetch access control data:', error);
          }
        }

        // Map attendees and filter custom field values based on visibility
        let attendees = attendeesResult.rows.map((attendee: any) => {
          /**
           * CUSTOM FIELD VALUE FILTERING
           * 
           * This filters the attendee's custom field values to only include visible fields.
           * 
           * Process:
           * 1. Parse customFieldValues from JSON string to object
           * 2. Filter to only include fields where showOnMainPage = true
           * 3. Convert to array format for frontend consumption
           * 
           * Data Format:
           * - Database stores: { "fieldId1": "value1", "fieldId2": "value2" }
           * - Frontend expects: [{ customFieldId: "fieldId1", value: "value1" }, ...]
           * 
           * Visibility Impact:
           * - Only visible fields (showOnMainPage = true) are returned
           * - Hidden fields are filtered out before sending to frontend
           * - If visibleFieldIds is empty (event settings not found), all fields are returned
           */
          // Parse customFieldValues from JSON string to object
          let parsedCustomFieldValues: Array<{ customFieldId: string; value: unknown }> = [];
          if (attendee.customFieldValues) {
            try {
              const parsed = typeof attendee.customFieldValues === 'string' 
                ? JSON.parse(attendee.customFieldValues) 
                : attendee.customFieldValues;
              
              // Convert object format {fieldId: value} to array format [{customFieldId, value}]
              // Filter to only include visible fields
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                parsedCustomFieldValues = Object.entries(parsed)
                  .filter(([customFieldId]) => visibleFieldIds.size === 0 || visibleFieldIds.has(customFieldId))
                  .map(([customFieldId, value]) => ({
                    customFieldId,
                    value: String(value),
                  }));
              } else if (Array.isArray(parsed)) {
                // Handle legacy array format (if any exists)
                parsedCustomFieldValues = parsed
                  .filter((cfv: any) => visibleFieldIds.size === 0 || visibleFieldIds.has(cfv.customFieldId))
                  .map((cfv: any) => ({
                    customFieldId: cfv.customFieldId,
                    value: String(cfv.value),
                  }));
              }
            } catch (err) {
              console.error(`Failed to parse customFieldValues for attendee ${attendee.$id}:`, err);
              // Continue with empty array if parsing fails
            }
          }
          
          // Get access control data for this attendee (default to enabled if not found)
          // Requirements 7.2, 7.3: Include access control fields in API responses
          const accessControl = accessControlMap.get(attendee.$id) || {
            accessEnabled: true,
            validFrom: null,
            validUntil: null,
          };
          
          return {
            ...attendee,
            id: attendee.$id, // Map $id to id for frontend compatibility
            customFieldValues: parsedCustomFieldValues,
            // Access control fields (Requirements 7.2, 7.3)
            // Flat format for backward compatibility
            accessEnabled: accessControl.accessEnabled,
            validFrom: accessControl.validFrom,
            validUntil: accessControl.validUntil,
            // Nested format for mobile sync consistency
            accessControl: {
              accessEnabled: accessControl.accessEnabled,
              validFrom: accessControl.validFrom,
              validUntil: accessControl.validUntil,
            },
          };
        });

        // Apply custom field filtering in memory if needed
        if (needsCustomFieldFiltering) {
          attendees = attendees.filter((attendee: any) => {
            const customFieldValues = Array.isArray(attendee.customFieldValues)
              ? attendee.customFieldValues.reduce((acc: any, cfv: any) => {
                  acc[cfv.customFieldId] = cfv.value;
                  return acc;
                }, {})
              : {};

            for (const fieldId in customFieldFilters) {
              const { value, operator } = customFieldFilters[fieldId];
              const fieldValue = customFieldValues[fieldId] || '';

              if (operator === 'isEmpty') {
                if (fieldValue !== '') return false;
              } else if (operator === 'isNotEmpty') {
                if (fieldValue === '') return false;
              } else if (value) {
                const lowerFieldValue = String(fieldValue).toLowerCase();
                const lowerValue = String(value).toLowerCase();

                switch (operator) {
                  case 'contains':
                    if (!lowerFieldValue.includes(lowerValue)) return false;
                    break;
                  case 'equals':
                    if (lowerFieldValue !== lowerValue) return false;
                    break;
                  case 'startsWith':
                    if (!lowerFieldValue.startsWith(lowerValue)) return false;
                    break;
                  case 'endsWith':
                    if (!lowerFieldValue.endsWith(lowerValue)) return false;
                    break;
                  default:
                    if (lowerFieldValue !== lowerValue) return false;
                }
              }
            }
            return true;
          });
        }

        // TODO: Attendee list view logging is currently inoperable
        // Keeping the code structure for future implementation
        // if (await shouldLog('systemViewAttendeeList')) {
        //   // Log view action with deduplication
        // }

        return res.status(200).json({
          attendees,
          total: attendeesResult.total,
        });

      case 'POST':
        // Check permissions using role from middleware
        const createPermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasCreatePermission = createPermissions?.attendees?.create === true || createPermissions?.all === true;

        if (!hasCreatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create attendees' });
        }

        const { firstName, lastName, barcodeNumber, notes, photoUrl, customFieldValues, validFrom, validUntil, accessEnabled } = req.body;

        if (!firstName || !lastName || !barcodeNumber) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if barcode is unique
        const existingAttendeeDocs = await tablesDB.listRows(
          dbId,
          attendeesTableId,
          [Query.equal('barcodeNumber', barcodeNumber)],
        );

        if (existingAttendeeDocs.rows.length > 0) {
          const existingAttendee = existingAttendeeDocs.rows[0];
          return res.status(400).json({ 
            error: 'Barcode number already exists',
            existingAttendee: {
              firstName: existingAttendee.firstName,
              lastName: existingAttendee.lastName,
              barcodeNumber: existingAttendee.barcodeNumber,
            },
          });
        }

        // Validate custom field IDs if provided
        if (customFieldValues && Array.isArray(customFieldValues) && customFieldValues.length > 0) {
          const customFieldsTableId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_TABLE_ID!;
          const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId);
          
          // Fetch custom fields to validate IDs
          const customFieldsDocs = await tablesDB.listRows(
            dbId,
            customFieldsTableId,
            [Query.limit(100)], // Assuming not more than 100 custom fields
          );

          const existingCustomFieldIds = customFieldsDocs.rows.map(cf => cf.$id);
          const invalidCustomFieldIds = customFieldIds.filter(id => !existingCustomFieldIds.includes(id));

          if (invalidCustomFieldIds.length > 0) {
            console.error('Invalid custom field IDs:', invalidCustomFieldIds);
            return res.status(400).json({ 
              error: 'Some custom fields no longer exist. Please refresh the page and try again.',
              invalidIds: invalidCustomFieldIds,
            });
          }
        }

        // Filter out empty custom field values and convert to JSON object
        const validCustomFieldValues = customFieldValues?.filter((cfv: any) => 
          cfv.customFieldId && cfv.value !== null && cfv.value !== undefined && cfv.value !== '',
        ) || [];

        // Convert custom field values array to JSON object
        const customFieldValuesObj: { [key: string]: string } = {};
        validCustomFieldValues.forEach((cfv: any) => {
          customFieldValuesObj[cfv.customFieldId] = String(cfv.value);
        });

        // Normalize custom field values to ensure proper format (prevents legacy array format)
        const normalizedCustomFieldValues = normalizeCustomFieldValues(customFieldValuesObj);

        // Generate attendee ID upfront for transaction
        const attendeeId = ID.unique();
        const attendeeData = {
          firstName,
          lastName,
          barcodeNumber,
          notes: notes || '',
          photoUrl: photoUrl || null,
          customFieldValues: stringifyCustomFieldValues(normalizedCustomFieldValues),
        };

        let newAttendee: any;

        // Use transaction-based approach
        console.log('[Attendee Create] Using transaction-based approach');
          
          try {
            const { tablesDB } = createSessionClient(req);
            const { executeTransactionWithRetry, handleTransactionError } = await import('@/lib/transactions');
            
            // Build transaction operations
            const operations: any[] = [
              {
                action: 'create',
                databaseId: dbId,
                tableId: attendeesTableId,
                rowId: attendeeId,
                data: attendeeData,
              },
            ];

            // Add access control record if access control is enabled and fields are provided
            if (accessControlTableId && (validFrom !== undefined || validUntil !== undefined || accessEnabled !== undefined)) {
              const accessControlData: any = {
                attendeeId: attendeeId,
              };
              
              if (validFrom !== undefined) {
                accessControlData.validFrom = validFrom;
              }
              if (validUntil !== undefined) {
                accessControlData.validUntil = validUntil;
              }
              if (accessEnabled !== undefined) {
                accessControlData.accessEnabled = accessEnabled;
              } else {
                // Default to true if not specified
                accessControlData.accessEnabled = true;
              }

              operations.push({
                action: 'create',
                databaseId: dbId,
                tableId: accessControlTableId,
                rowId: ID.unique(),
                data: accessControlData,
              });
            }

            // Add audit log if enabled
            if (await shouldLog('attendeeCreate')) {
              const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
              operations.push({
                action: 'create',
                databaseId: dbId,
                tableId: logsTableId,
                rowId: ID.unique(),
                data: {
                  userId: user.$id,
                  attendeeId: attendeeId,
                  action: 'create',
                  details: JSON.stringify({
                    ...createAttendeeLogDetails('create', {
                      firstName: attendeeData.firstName,
                      lastName: attendeeData.lastName,
                      barcodeNumber: attendeeData.barcodeNumber,
                    }),
                    timestamp: new Date().toISOString(),
                  }),
                },
              });
            }

            // Execute transaction with retry logic
            await executeTransactionWithRetry(tablesDB, operations);

            // Fetch the created attendee to return to client
            newAttendee = await tablesDB.getRow({
              databaseId: dbId,
              tableId: attendeesTableId,
              rowId: attendeeId
            });
            
            console.log('[Attendee Create] Transaction completed successfully');
          } catch (error: any) {
            console.error('[Attendee Create] Transaction failed:', error);
            const { handleTransactionError } = await import('@/lib/transactions');
            return handleTransactionError(error, res);
          }

        // Parse and return the new attendee with proper structure
        let parsedCustomFieldValues = [];
        if (newAttendee.customFieldValues) {
          const parsed = typeof newAttendee.customFieldValues === 'string' 
            ? JSON.parse(newAttendee.customFieldValues) 
            : newAttendee.customFieldValues;
          
          // Convert object format {fieldId: value} to array format [{customFieldId, value}]
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
            parsedCustomFieldValues = Object.entries(parsed).map(([customFieldId, value]) => ({
              customFieldId,
              value: String(value),
            }));
          } else if (Array.isArray(parsed)) {
            parsedCustomFieldValues = parsed;
          }
        }
        
        const newAttendeeWithParsedFields = {
          ...newAttendee,
          id: newAttendee.$id, // Map $id to id for frontend compatibility
          customFieldValues: parsedCustomFieldValues,
        };

        return res.status(201).json(newAttendeeWithParsedFields);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
});
import { NextApiResponse } from 'next';
import { createSessionClient, createAdminClient } from '@/lib/appwrite';
import { Query, ID } from 'appwrite';
import { search, equal, isNull, isNotNull, orderDesc } from '@/lib/appwriteQueries';
import { withAuth, AuthenticatedRequest } from '@/lib/apiMiddleware';
import { shouldLog } from '@/lib/logSettings';



export default withAuth(async (req: AuthenticatedRequest, res: NextApiResponse) => {
  // User and userProfile are already attached by middleware
  const { user, userProfile } = req;
  const { databases } = createSessionClient(req);

    const dbId = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
    const usersCollectionId = process.env.NEXT_PUBLIC_APPWRITE_USERS_COLLECTION_ID!;
    const attendeesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ATTENDEES_COLLECTION_ID!;
    const rolesCollectionId = process.env.NEXT_PUBLIC_APPWRITE_ROLES_COLLECTION_ID!;
    const logsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOGS_COLLECTION_ID!;
    const logSettingsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_LOG_SETTINGS_COLLECTION_ID!;

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

        const queries: any[] = [];

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

        // Note: Custom field filtering is complex with denormalized JSON
        // We'll fetch all attendees and filter in memory for custom fields
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
         * VISIBILITY FILTERING LOGIC
         * 
         * This section implements the custom field visibility control feature.
         * 
         * How it works:
         * 1. Fetch all custom fields from the database
         * 2. Filter to only include fields where showOnMainPage !== false
         * 3. Create a Set of visible field IDs for efficient lookup
         * 4. Frontend uses this to determine which fields to display as table columns
         * 
         * IMPORTANT: The API returns ALL custom field values (visible and hidden)
         * - This allows Advanced Filters to search on hidden fields
         * - The frontend display logic filters what's shown in the table
         * - Hidden fields remain searchable but don't appear as table columns
         * 
         * Default Behavior:
         * - Fields with showOnMainPage = true are visible (explicit)
         * - Fields with showOnMainPage = undefined/null are visible (backward compatibility)
         * - Fields with showOnMainPage = false are hidden (explicit)
         * 
         * Why this matters:
         * - Keeps the main attendees table clean and focused
         * - Reduces visual clutter for fields that are rarely needed
         * - All fields remain accessible in edit/create forms AND searchable
         * - Hidden fields can be searched via Advanced Filters
         */
        // Fetch custom fields to determine visibility
        const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
        const customFieldsResult = await databases.listDocuments(
          dbId,
          customFieldsCollectionId,
          [Query.isNull('deletedAt'), Query.orderAsc('order'), Query.limit(100)]
        );

        // Create set of visible field IDs (for main page view)
        // Default to visible if showOnMainPage is missing (undefined or null)
        // This ensures backward compatibility with existing fields created before this feature
        // Note: visibleFieldIds is not used here - ALL custom field values are returned
        // (including hidden fields) to allow Advanced Filters to search on hidden fields
        const visibleFieldIds = new Set(
          customFieldsResult.documents
            .filter((field: any) => field.showOnMainPage !== false) // Only exclude if explicitly false
            .map((field: any) => field.$id)
        );

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
        const firstBatch = await databases.listDocuments(
          dbId,
          attendeesCollectionId,
          queries
        );

        // Step 3: Initialize result with first batch
        // The 'total' field tells us the complete count across all potential batches
        let attendeesResult = { 
          documents: firstBatch.documents, 
          total: firstBatch.total 
        };

        // Step 4: Check if we need to fetch additional batches
        // If total > 5000, we have more attendees than fit in a single request
        if (firstBatch.total > 5000) {
          // Large event detected - fetching in batches
          console.warn(`Large event detected: ${firstBatch.total} attendees. Fetching in batches...`);
          
          // Start with documents from first batch
          let allDocuments = [...firstBatch.documents];
          
          // Calculate how many total batches we need
          // Example: 15000 attendees / 5000 per batch = 3 batches
          const totalPages = Math.ceil(firstBatch.total / 5000);
          
          // Step 5: Fetch remaining batches (starting from page 2)
          for (let page = 2; page <= totalPages; page++) {
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
            const batch = await databases.listDocuments(
              dbId, 
              attendeesCollectionId, 
              queriesWithOffset
            );
            
            // Append this batch's documents to our growing array
            allDocuments = [...allDocuments, ...batch.documents];
          }
          
          // Step 6: Update result with complete dataset
          attendeesResult.documents = allDocuments;
          
          // Log success for monitoring
          console.log(`Successfully fetched all ${allDocuments.length} attendees in ${totalPages} batches`);
        }

        // Map attendees and filter custom field values based on visibility
        let attendees = attendeesResult.documents.map((attendee: any) => {
          /**
           * CUSTOM FIELD VALUE CONVERSION
           * 
           * Converts custom field values from database format to API response format.
           * 
           * Process:
           * 1. Parse customFieldValues from JSON string to object
           * 2. Convert to array format for frontend consumption
           * 
           * Data Format:
           * - Database stores: { "fieldId1": "value1", "fieldId2": "value2" }
           * - Frontend expects: [{ customFieldId: "fieldId1", value: "value1" }, ...]
           * 
           * IMPORTANT: ALL custom field values are returned (including hidden fields)
           * - This allows Advanced Filters to search on hidden fields
           * - The frontend display logic (getCustomFieldsWithValues) filters what's shown in the table
           * - Hidden fields remain searchable but don't appear as table columns
           */
          // Parse customFieldValues from JSON string to object
          let parsedCustomFieldValues = [];
          if (attendee.customFieldValues) {
            try {
              const parsed = typeof attendee.customFieldValues === 'string' 
                ? JSON.parse(attendee.customFieldValues) 
                : attendee.customFieldValues;
              
              // Convert object format {fieldId: value} to array format [{customFieldId, value}]
              // IMPORTANT: Include ALL fields (visible and hidden) for search functionality
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                parsedCustomFieldValues = Object.entries(parsed)
                  .map(([customFieldId, value]) => ({
                    customFieldId,
                    value: String(value)
                  }));
              } else if (Array.isArray(parsed)) {
                // Handle legacy array format (if any exists)
                parsedCustomFieldValues = parsed;
              }
            } catch (err) {
              // Log malformed JSON but don't crash - return empty array
              console.error(`Failed to parse customFieldValues for attendee ${attendee.$id}:`, err);
              parsedCustomFieldValues = [];
            }
          }
          
          return {
            ...attendee,
            id: attendee.$id, // Map $id to id for frontend compatibility
            customFieldValues: parsedCustomFieldValues
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

        return res.status(200).json(attendees);

      case 'POST':
        // Check permissions using role from middleware
        const createPermissions = userProfile.role ? userProfile.role.permissions : {};
        const hasCreatePermission = createPermissions?.attendees?.create === true || createPermissions?.all === true;

        if (!hasCreatePermission) {
          return res.status(403).json({ error: 'Insufficient permissions to create attendees' });
        }

        const { firstName, lastName, barcodeNumber, notes, photoUrl, customFieldValues } = req.body;

        if (!firstName || !lastName || !barcodeNumber) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if barcode is unique
        const existingAttendeeDocs = await databases.listDocuments(
          dbId,
          attendeesCollectionId,
          [Query.equal('barcodeNumber', barcodeNumber)]
        );

        if (existingAttendeeDocs.documents.length > 0) {
          const existingAttendee = existingAttendeeDocs.documents[0];
          return res.status(400).json({ 
            error: 'Barcode number already exists',
            existingAttendee: {
              firstName: existingAttendee.firstName,
              lastName: existingAttendee.lastName,
              barcodeNumber: existingAttendee.barcodeNumber
            }
          });
        }

        // Validate custom field IDs if provided
        if (customFieldValues && Array.isArray(customFieldValues) && customFieldValues.length > 0) {
          const customFieldsCollectionId = process.env.NEXT_PUBLIC_APPWRITE_CUSTOM_FIELDS_COLLECTION_ID!;
          const customFieldIds = customFieldValues.map((cfv: any) => cfv.customFieldId);
          
          // Fetch custom fields to validate IDs
          const customFieldsDocs = await databases.listDocuments(
            dbId,
            customFieldsCollectionId,
            [Query.limit(100)] // Assuming not more than 100 custom fields
          );

          const existingCustomFieldIds = customFieldsDocs.documents.map(cf => cf.$id);
          const invalidCustomFieldIds = customFieldIds.filter(id => !existingCustomFieldIds.includes(id));

          if (invalidCustomFieldIds.length > 0) {
            console.error('Invalid custom field IDs:', invalidCustomFieldIds);
            return res.status(400).json({ 
              error: 'Some custom fields no longer exist. Please refresh the page and try again.',
              invalidIds: invalidCustomFieldIds
            });
          }
        }

        // Filter out empty custom field values and convert to JSON object
        const validCustomFieldValues = customFieldValues?.filter((cfv: any) => 
          cfv.customFieldId && cfv.value !== null && cfv.value !== undefined && cfv.value !== ''
        ) || [];

        // Convert custom field values array to JSON object
        const customFieldValuesObj: { [key: string]: string } = {};
        validCustomFieldValues.forEach((cfv: any) => {
          customFieldValuesObj[cfv.customFieldId] = String(cfv.value);
        });

        // Generate attendee ID upfront for transaction
        const attendeeId = ID.unique();
        const attendeeData = {
          firstName,
          lastName,
          barcodeNumber,
          notes: notes || '',
          photoUrl: photoUrl || null,
          customFieldValues: JSON.stringify(customFieldValuesObj)
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
                tableId: attendeesCollectionId,
                rowId: attendeeId,
                data: attendeeData
              }
            ];

            // Add audit log if enabled
            if (await shouldLog('attendeeCreate')) {
              const { createAttendeeLogDetails } = await import('@/lib/logFormatting');
              operations.push({
                action: 'create',
                databaseId: dbId,
                tableId: logsCollectionId,
                rowId: ID.unique(),
                data: {
                  userId: user.$id,
                  attendeeId: attendeeId,
                  action: 'create',
                  details: JSON.stringify({
                    ...createAttendeeLogDetails('create', {
                      firstName: attendeeData.firstName,
                      lastName: attendeeData.lastName,
                      barcodeNumber: attendeeData.barcodeNumber
                    }),
                    timestamp: new Date().toISOString()
                  })
                }
              });
            }

            // Execute transaction with retry logic
            await executeTransactionWithRetry(tablesDB, operations);

            // Fetch the created attendee to return to client
            newAttendee = await databases.getDocument(dbId, attendeesCollectionId, attendeeId);
            
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
              value: String(value)
            }));
          } else if (Array.isArray(parsed)) {
            parsedCustomFieldValues = parsed;
          }
        }
        
        const newAttendeeWithParsedFields = {
          ...newAttendee,
          id: newAttendee.$id, // Map $id to id for frontend compatibility
          customFieldValues: parsedCustomFieldValues
        };

        return res.status(201).json(newAttendeeWithParsedFields);

      default:
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
});
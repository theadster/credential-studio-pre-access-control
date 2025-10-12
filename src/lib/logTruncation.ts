/**
 * Truncates log details to fit within Appwrite's string attribute limit
 * Uses a three-step strategy to progressively reduce size while preserving key information
 */

export interface TruncationResult {
  truncatedDetails: string;
  wasTruncated: boolean;
  truncationLevel: 'none' | 'partial' | 'minimal';
}

/**
 * Truncates log details object to fit within the specified maximum length
 * 
 * Strategy:
 * 1. First attempt: Serialize as-is
 * 2. If over limit: Truncate arrays (names to 10, IDs to 50, errors to 10), remove full attendees array
 * 3. If still over limit: Return minimal summary object
 * 
 * @param details - The original log details object
 * @param maxLength - Maximum allowed length for the JSON string (default: 9500)
 * @returns Object containing truncated details string, truncation status, and level
 */
export function truncateLogDetails(details: any, maxLength: number = 9500): TruncationResult {
  // Step 1: Try serializing as-is
  let detailsString = JSON.stringify(details);
  
  if (detailsString.length <= maxLength) {
    return {
      truncatedDetails: detailsString,
      wasTruncated: false,
      truncationLevel: 'none'
    };
  }

  // Step 2: Partial truncation - keep summaries but truncate arrays
  console.warn(`[Log Truncation] Details too large (${detailsString.length} chars), applying partial truncation...`);
  
  const partiallyTruncated: any = { ...details };
  
  // Truncate names array if present
  if (Array.isArray(partiallyTruncated.names) && partiallyTruncated.names.length > 10) {
    partiallyTruncated.names = partiallyTruncated.names.slice(0, 10);
    partiallyTruncated.namesTruncated = true;
    partiallyTruncated.totalNames = details.names.length;
  }
  
  // Truncate deletedIds array if present
  if (Array.isArray(partiallyTruncated.deletedIds) && partiallyTruncated.deletedIds.length > 50) {
    partiallyTruncated.deletedIds = partiallyTruncated.deletedIds.slice(0, 50);
    partiallyTruncated.idsTruncated = true;
  }
  
  // Truncate errors array if present
  if (Array.isArray(partiallyTruncated.errors) && partiallyTruncated.errors.length > 10) {
    partiallyTruncated.errors = partiallyTruncated.errors.slice(0, 10);
    partiallyTruncated.errorsTruncated = true;
  }
  
  // Remove full attendees array to save space
  if (partiallyTruncated.attendees) {
    delete partiallyTruncated.attendees;
    const successCount = partiallyTruncated.successCount || partiallyTruncated.deletedIds?.length || 0;
    partiallyTruncated.note = `Full details truncated due to size. Processed ${successCount} attendees.`;
  }
  
  detailsString = JSON.stringify(partiallyTruncated);
  
  if (detailsString.length <= maxLength) {
    return {
      truncatedDetails: detailsString,
      wasTruncated: true,
      truncationLevel: 'partial'
    };
  }

  // Step 3: Minimal truncation - only keep essential summary
  console.warn(`[Log Truncation] Details still too large (${detailsString.length} chars), using minimal summary...`);
  
  const minimalSummary = {
    action: details.action || 'unknown',
    totalRequested: details.totalRequested || 0,
    successCount: details.successCount || 0,
    errorCount: details.errorCount || 0,
    note: `Bulk operation completed. Details truncated due to size.`
  };
  
  return {
    truncatedDetails: JSON.stringify(minimalSummary),
    wasTruncated: true,
    truncationLevel: 'minimal'
  };
}

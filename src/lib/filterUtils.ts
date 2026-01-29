/**
 * Filter Utility Functions for Advanced Filters Dialog
 *
 * Provides utility functions for counting, converting, and formatting filter state
 * for the Advanced Filters redesign.
 */

import type { EventSettings, CustomField } from '@/components/EventSettingsForm/types';

/**
 * Text filter with operator
 */
export interface TextFilter {
  value: string;
  operator: string;
}

/**
 * Notes filter extends text filter with hasNotes flag
 */
export interface NotesFilter extends TextFilter {
  hasNotes: boolean;
}

/**
 * Custom field filter supporting single or multi-select values
 */
export interface CustomFieldFilter {
  value: string | string[];
  operator: string;
}

/**
 * Access control filters for date ranges and status
 */
export interface AccessControlFilters {
  accessStatus: 'all' | 'active' | 'inactive';
  validFromStart: string;
  validFromEnd: string;
  validUntilStart: string;
  validUntilEnd: string;
}

/**
 * Filter match mode - how multiple filters are combined
 */
export type FilterMatchMode = 'all' | 'any';

/**
 * Complete advanced search filters state
 */
export interface AdvancedSearchFilters {
  firstName: TextFilter;
  lastName: TextFilter;
  barcode: TextFilter;
  notes: NotesFilter;
  photoFilter: 'all' | 'with' | 'without';
  credentialFilter: 'all' | 'with' | 'without';
  customFields: Record<string, CustomFieldFilter>;
  accessControl: AccessControlFilters;
  matchMode: FilterMatchMode;
}

/**
 * Filter chip for display in Active Filters Bar
 */
export interface FilterChip {
  id: string;
  label: string;
  value: string;
  filterKey: string;
  customFieldId?: string;
}

/**
 * Section types for filter grouping
 */
export type FilterSection = 'basic' | 'notes' | 'access' | 'custom';

/**
 * Text operators that don't require a value
 */
const EMPTY_OPERATORS = ['isEmpty', 'isNotEmpty'];

/**
 * Operator display labels for formatting
 */
const OPERATOR_LABELS: Record<string, string> = {
  contains: 'contains',
  equals: 'equals',
  startsWith: 'starts with',
  endsWith: 'ends with',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
};

/**
 * Check if a text filter is active
 */
function isTextFilterActive(filter: TextFilter): boolean {
  return !!filter.value || EMPTY_OPERATORS.includes(filter.operator);
}

/**
 * Check if a custom field filter is active
 */
function isCustomFieldFilterActive(filter: CustomFieldFilter): boolean {
  const hasValue = Array.isArray(filter.value)
    ? filter.value.length > 0
    : !!filter.value;
  return hasValue || EMPTY_OPERATORS.includes(filter.operator);
}

/**
 * Count active filters in a specific section
 *
 * @param filters - Current filter state
 * @param section - Section to count filters for
 * @returns Number of active filters in the section
 *
 * Requirements: 1.3 - Section header badge showing count of active filters
 */
export function countSectionFilters(
  filters: AdvancedSearchFilters,
  section: FilterSection
): number {
  switch (section) {
    case 'basic': {
      let count = 0;
      if (isTextFilterActive(filters.firstName)) count++;
      if (isTextFilterActive(filters.lastName)) count++;
      if (isTextFilterActive(filters.barcode)) count++;
      if (filters.photoFilter !== 'all') count++;
      if (filters.credentialFilter !== 'all') count++;
      return count;
    }

    case 'notes': {
      let count = 0;
      if (isTextFilterActive(filters.notes)) count++;
      if (filters.notes.hasNotes) count++;
      return count;
    }

    case 'access': {
      let count = 0;
      const ac = filters.accessControl;
      if (ac.accessStatus !== 'all') count++;
      if (ac.validFromStart || ac.validFromEnd) count++;
      if (ac.validUntilStart || ac.validUntilEnd) count++;
      return count;
    }

    case 'custom': {
      let count = 0;
      Object.values(filters.customFields).forEach((filter) => {
        if (isCustomFieldFilterActive(filter)) count++;
      });
      return count;
    }

    default:
      return 0;
  }
}

/**
 * Format a filter value for display in a chip
 *
 * @param value - Filter value (string or array)
 * @param operator - Filter operator
 * @param fieldType - Optional field type for special formatting
 * @returns Formatted display string
 *
 * Requirements: 2.4 - Chip displays field name and current filter value in readable format
 */
export function formatFilterValue(
  value: string | string[],
  operator: string,
  fieldType?: string
): string {
  // Handle empty operators
  if (EMPTY_OPERATORS.includes(operator)) {
    return OPERATOR_LABELS[operator] || operator;
  }

  // Handle array values (multi-select)
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.length === 1) return value[0];
    return `${value[0]} +${value.length - 1}`;
  }

  // Handle boolean field type
  if (fieldType === 'boolean') {
    const normalizedValue = String(value).trim().toLowerCase();
    if (normalizedValue === 'yes' || normalizedValue === 'true') return 'Yes';
    if (normalizedValue === 'no' || normalizedValue === 'false') return 'No';
  }

  // Format with operator for text filters
  const operatorLabel = OPERATOR_LABELS[operator];
  if (operatorLabel && operator !== 'contains') {
    return `${operatorLabel} "${value}"`;
  }

  return value;
}

/**
 * Get custom field name by ID from event settings
 */
function getCustomFieldName(
  eventSettings: EventSettings | null,
  fieldId: string
): string {
  if (!eventSettings?.customFields) return fieldId;
  const field = eventSettings.customFields.find((f: CustomField) => f.id === fieldId);
  return field?.fieldName || fieldId;
}

/**
 * Get custom field type by ID from event settings
 */
function getCustomFieldType(
  eventSettings: EventSettings | null,
  fieldId: string
): string | undefined {
  if (!eventSettings?.customFields) return undefined;
  const field = eventSettings.customFields.find((f: CustomField) => f.id === fieldId);
  return field?.fieldType;
}

/**
 * Convert filter state to display chips for Active Filters Bar
 *
 * @param filters - Current filter state
 * @param eventSettings - Event settings for custom field names
 * @returns Array of filter chips for display
 *
 * Requirements: 2.1, 2.2, 2.4 - Active filters bar with removable chips
 */
export function filtersToChips(
  filters: AdvancedSearchFilters,
  eventSettings: EventSettings | null
): FilterChip[] {
  const chips: FilterChip[] = [];

  // Basic info filters
  if (isTextFilterActive(filters.firstName)) {
    chips.push({
      id: 'firstName',
      label: 'First Name',
      value: formatFilterValue(filters.firstName.value, filters.firstName.operator),
      filterKey: 'firstName',
    });
  }

  if (isTextFilterActive(filters.lastName)) {
    chips.push({
      id: 'lastName',
      label: 'Last Name',
      value: formatFilterValue(filters.lastName.value, filters.lastName.operator),
      filterKey: 'lastName',
    });
  }

  if (isTextFilterActive(filters.barcode)) {
    chips.push({
      id: 'barcode',
      label: 'Barcode',
      value: formatFilterValue(filters.barcode.value, filters.barcode.operator),
      filterKey: 'barcode',
    });
  }

  if (filters.photoFilter !== 'all') {
    chips.push({
      id: 'photoFilter',
      label: 'Photo',
      value: filters.photoFilter === 'with' ? 'With Photo' : 'Without Photo',
      filterKey: 'photoFilter',
    });
  }

  if (filters.credentialFilter !== 'all') {
    chips.push({
      id: 'credentialFilter',
      label: 'Credential',
      value: filters.credentialFilter === 'with' ? 'With Credential' : 'Without Credential',
      filterKey: 'credentialFilter',
    });
  }

  // Notes filters
  if (isTextFilterActive(filters.notes)) {
    chips.push({
      id: 'notes',
      label: 'Notes',
      value: formatFilterValue(filters.notes.value, filters.notes.operator),
      filterKey: 'notes',
    });
  }

  if (filters.notes.hasNotes) {
    chips.push({
      id: 'hasNotes',
      label: 'Has Notes',
      value: 'Yes',
      filterKey: 'hasNotes',
    });
  }

  // Access control filters
  const ac = filters.accessControl;
  if (ac.accessStatus !== 'all') {
    chips.push({
      id: 'accessStatus',
      label: 'Access Status',
      value: ac.accessStatus === 'active' ? 'Active' : 'Inactive',
      filterKey: 'accessStatus',
    });
  }

  if (ac.validFromStart || ac.validFromEnd) {
    const value = ac.validFromStart && ac.validFromEnd
      ? `${ac.validFromStart} - ${ac.validFromEnd}`
      : ac.validFromStart
        ? `from ${ac.validFromStart}`
        : `until ${ac.validFromEnd}`;
    chips.push({
      id: 'validFrom',
      label: 'Valid From',
      value,
      filterKey: 'validFrom',
    });
  }

  if (ac.validUntilStart || ac.validUntilEnd) {
    const value = ac.validUntilStart && ac.validUntilEnd
      ? `${ac.validUntilStart} - ${ac.validUntilEnd}`
      : ac.validUntilStart
        ? `from ${ac.validUntilStart}`
        : `until ${ac.validUntilEnd}`;
    chips.push({
      id: 'validUntil',
      label: 'Valid Until',
      value,
      filterKey: 'validUntil',
    });
  }

  // Custom field filters
  Object.entries(filters.customFields).forEach(([fieldId, filter]) => {
    if (isCustomFieldFilterActive(filter)) {
      const fieldName = getCustomFieldName(eventSettings, fieldId);
      const fieldType = getCustomFieldType(eventSettings, fieldId);
      chips.push({
        id: `custom-${fieldId}`,
        label: fieldName,
        value: formatFilterValue(filter.value, filter.operator, fieldType),
        filterKey: 'customField',
        customFieldId: fieldId,
      });
    }
  });

  return chips;
}

/**
 * Check if any filters are active
 *
 * @param filters - Current filter state
 * @returns True if at least one filter is active
 *
 * Requirements: 2.5 - Active filters bar hidden when no filters active
 */
export function hasActiveFilters(filters: AdvancedSearchFilters): boolean {
  // Check basic filters
  if (isTextFilterActive(filters.firstName)) return true;
  if (isTextFilterActive(filters.lastName)) return true;
  if (isTextFilterActive(filters.barcode)) return true;
  if (filters.photoFilter !== 'all') return true;
  if (filters.credentialFilter !== 'all') return true;

  // Check notes filters
  if (isTextFilterActive(filters.notes)) return true;
  if (filters.notes.hasNotes) return true;

  // Check access control filters
  const ac = filters.accessControl;
  if (ac.accessStatus !== 'all') return true;
  if (ac.validFromStart || ac.validFromEnd) return true;
  if (ac.validUntilStart || ac.validUntilEnd) return true;

  // Check custom field filters
  for (const filter of Object.values(filters.customFields)) {
    if (isCustomFieldFilterActive(filter)) return true;
  }

  return false;
}

/**
 * Create default/empty filter state
 *
 * @returns Empty filter state with default values
 */
export function createEmptyFilters(): AdvancedSearchFilters {
  return {
    firstName: { value: '', operator: 'contains' },
    lastName: { value: '', operator: 'contains' },
    barcode: { value: '', operator: 'contains' },
    notes: { value: '', operator: 'contains', hasNotes: false },
    photoFilter: 'all',
    credentialFilter: 'all',
    customFields: {},
    accessControl: {
      accessStatus: 'all',
      validFromStart: '',
      validFromEnd: '',
      validUntilStart: '',
      validUntilEnd: '',
    },
    matchMode: 'all',
  };
}

/**
 * Clean filter configuration for saving by removing empty custom fields.
 * This prevents stale parameter errors when loading reports that were saved
 * with empty custom field entries.
 *
 * @param filters - The filter configuration to clean
 * @returns A new filter configuration with empty custom fields removed
 */
export function cleanFilterConfigurationForSaving(
  filters: AdvancedSearchFilters
): AdvancedSearchFilters {
  // Create a copy of the filters
  const cleaned = { ...filters };

  // Remove empty custom fields
  const cleanedCustomFields: Record<string, CustomFieldFilter> = {};
  Object.entries(filters.customFields || {}).forEach(([fieldId, filter]) => {
    // Only include custom fields that have active filters
    if (isCustomFieldFilterActive(filter)) {
      cleanedCustomFields[fieldId] = filter;
    }
  });

  cleaned.customFields = cleanedCustomFields;

  return cleaned;
}

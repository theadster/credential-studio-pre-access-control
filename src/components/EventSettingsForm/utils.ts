// EventSettingsForm Utility Functions
// Helper functions for form operations and data transformation

import { 
  Type, Hash, Mail, Calendar, Link, List, 
  CheckSquare, ToggleLeft, FileText 
} from "lucide-react";
import { FieldMapping, CustomField, EventSettings } from './types';

/**
 * Format field mappings for display
 */
export function formatFieldMappings(mappings: FieldMapping[]): string {
  return mappings
    .map(m => `${m.fieldName} → ${m.jsonVariable}`)
    .join(', ');
}

/**
 * Get icon component for field type
 */
export function getFieldIcon(fieldType: string) {
  const icons = {
    text: Type,
    number: Hash,
    email: Mail,
    date: Calendar,
    url: Link,
    select: List,
    checkbox: CheckSquare,
    boolean: ToggleLeft,
    textarea: FileText
  };
  return icons[fieldType as keyof typeof icons] || Type;
}

/**
 * Get placeholder text for field type
 */
export function getFieldPlaceholder(fieldType: string): string {
  const placeholders = {
    text: "e.g., Company Name, Job Title",
    number: "e.g., Age, Years of Experience",
    email: "e.g., Work Email, Personal Email",
    date: "e.g., Birth Date, Start Date",
    url: "e.g., LinkedIn Profile, Website",
    select: "e.g., Department, T-Shirt Size",
    checkbox: "e.g., Newsletter Subscription, Terms Agreement",
    boolean: "e.g., VIP Status, First Time Attendee",
    textarea: "e.g., Bio, Special Requirements"
  };
  return placeholders[fieldType as keyof typeof placeholders] || "Enter field name";
}

/**
 * Validate field mapping structure
 */
export function validateFieldMapping(mapping: FieldMapping): { valid: boolean; error?: string } {
  if (!mapping.fieldId || !mapping.jsonVariable) {
    return { valid: false, error: "Field ID and JSON variable are required" };
  }

  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(mapping.jsonVariable)) {
    return { 
      valid: false, 
      error: "JSON variable must be a valid identifier (letters, numbers, underscores)" 
    };
  }

  return { valid: true };
}

/**
 * Parse event settings from API response
 */
export function parseEventSettings(settings: EventSettings): EventSettings {
  let parsedDate = "";
  let parsedTime = "";

  if (settings.eventDate) {
    if (typeof settings.eventDate === 'string' && settings.eventDate.includes('-') && !settings.eventDate.includes('T')) {
      parsedDate = settings.eventDate;
    } else {
      const eventDateTime = new Date(settings.eventDate);
      parsedDate = eventDateTime.toISOString().split('T')[0];
    }
  }

  if (settings.eventTime) {
    parsedTime = settings.eventTime;
  }

  return {
    ...settings,
    eventDate: parsedDate,
    eventTime: parsedTime
  };
}

/**
 * Extract printable flags from custom fields
 */
export function extractPrintableFlags(customFields: CustomField[]): Map<string, boolean> {
  const printableMap = new Map<string, boolean>();
  customFields.forEach(field => {
    if (field.id) {
      printableMap.set(field.id, field.printable === true);
    }
  });
  return printableMap;
}

/**
 * Check if printable flags have changed
 */
export function checkPrintableFlagChanges(
  customFields: CustomField[],
  originalFlags: Map<string, boolean>
): boolean {
  for (const field of customFields) {
    if (field.id) {
      const originalPrintable = originalFlags.get(field.id) === true;
      const currentPrintable = field.printable === true;
      
      if (originalPrintable !== currentPrintable) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Get initial form data for new event settings
 */
export function getInitialFormData(): EventSettings {
  return {
    eventName: "",
    eventDate: "",
    eventLocation: "",
    timeZone: "America/Los_Angeles",
    barcodeType: "alphanumerical",
    barcodeLength: 8,
    barcodeUnique: true,
    attendeeSortField: "lastName",
    attendeeSortDirection: "asc",
    customFields: []
  };
}

/**
 * Validate custom field structure
 */
export function validateCustomField(field: CustomField): { valid: boolean; error?: string } {
  if (!field.fieldName || field.fieldName.trim() === '') {
    return { valid: false, error: "Field name is required" };
  }

  if (!field.fieldType) {
    return { valid: false, error: "Field type is required" };
  }

  if (field.fieldType === 'select' && (!field.fieldOptions || field.fieldOptions.length === 0)) {
    return { valid: false, error: "Select fields must have at least one option" };
  }

  return { valid: true };
}

/**
 * Generate internal field name from display name
 */
export function generateInternalFieldName(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

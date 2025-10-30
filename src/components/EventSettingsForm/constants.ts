// EventSettingsForm Constants
// Extracted from monolithic component for better maintainability

export const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL/Link" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "boolean", label: "Yes/No Switch" },
  { value: "textarea", label: "Textarea" }
] as const;

export const TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "GMT" },
  { value: "Europe/Paris", label: "CET" },
  { value: "Asia/Tokyo", label: "JST" },
  { value: "Australia/Sydney", label: "AEST" }
] as const;

export const ASPECT_RATIOS = [
  { value: "1", label: "Square (1:1)" },
  { value: "1.33", label: "Landscape (4:3)" },
  { value: "0.75", label: "Portrait (3:4)" },
  { value: "1.78", label: "Widescreen (16:9)" },
  { value: "0.56", label: "Vertical (9:16)" },
  { value: "1.5", label: "Photo (3:2)" },
  { value: "0.67", label: "Photo Portrait (2:3)" },
  { value: "free", label: "Free Form" }
] as const;

export const AUTH_HEADER_TYPES = [
  { value: "Bearer", label: "Bearer" },
  { value: "API-Key", label: "API-Key" },
  { value: "Authorization", label: "Authorization" },
  { value: "X-API-Key", label: "X-API-Key" }
] as const;

// Validation constants
export const MIN_BARCODE_LENGTH = 4;
export const MAX_BARCODE_LENGTH = 20;
export const DEFAULT_BARCODE_LENGTH = 8;

// Custom field display
export const MIN_CUSTOM_FIELD_COLUMNS = 3;
export const MAX_CUSTOM_FIELD_COLUMNS = 10;
export const DEFAULT_CUSTOM_FIELD_COLUMNS = 7;

// Sort options
export const SORT_FIELDS = [
  { value: 'lastName', label: 'Last Name' },
  { value: 'firstName', label: 'First Name' },
  { value: 'createdAt', label: 'Upload Date' }
] as const;

export const SORT_DIRECTIONS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
] as const;

// Barcode types
export const BARCODE_TYPES = [
  { value: 'numerical', label: 'Numerical' },
  { value: 'alphanumerical', label: 'Alphanumerical' }
] as const;

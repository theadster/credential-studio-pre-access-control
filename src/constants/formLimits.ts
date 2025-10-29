/**
 * Form field limits and constraints
 * Centralized constants for consistent validation across the application
 */

export const FORM_LIMITS = {
  // Text field limits
  NOTES_MAX_LENGTH: 2000,
  NAME_MAX_LENGTH: 100,

  // Photo upload limits
  PHOTO_MAX_FILE_SIZE: 5_000_000, // 5MB in bytes
  PHOTO_MAX_DIMENSION: 800, // pixels
  PHOTO_ALLOWED_FORMATS: ['jpg', 'jpeg', 'png'] as const,

  // Barcode generation
  BARCODE_LENGTH_DEFAULT: 8,
  BARCODE_GENERATION_MAX_ATTEMPTS: 10,

  // Custom fields
  CUSTOM_FIELD_NAME_MAX_LENGTH: 100,
  CUSTOM_FIELD_VALUE_MAX_LENGTH: 1000,
} as const;

/**
 * Cloudinary upload widget configuration constants
 * Consistent styling and behavior across all upload widgets
 */
export const CLOUDINARY_CONFIG = {
  FOLDER: 'attendee-photos',
  THEME: 'minimal' as const,
  DEFAULT_CROP_ASPECT_RATIO: 1, // Square (1:1)

  // Upload sources
  SOURCES: ['local', 'url', 'camera'] as const,
  DEFAULT_SOURCE: 'local' as const,

  // Widget styling palette
  PALETTE: {
    window: "#FFFFFF",
    windowBorder: "#90A0B3",
    tabIcon: "#8B5CF6",
    menuIcons: "#5A616A",
    textDark: "#000000",
    textLight: "#FFFFFF",
    link: "#8B5CF6",
    action: "#8B5CF6",
    inactiveTabIcon: "#0E2F5A",
    error: "#F44235",
    inProgress: "#8B5CF6",
    complete: "#20B832",
    sourceBg: "#E4EBF1"
  }
} as const;

/**
 * Type exports for better type safety
 */
export type PhotoFormat = typeof FORM_LIMITS.PHOTO_ALLOWED_FORMATS[number];
export type CloudinarySource = typeof CLOUDINARY_CONFIG.SOURCES[number];

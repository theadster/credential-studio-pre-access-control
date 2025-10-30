/**
 * Application Constants
 * 
 * Centralized constants for validation, pagination, and other magic numbers.
 * Using constants improves maintainability and makes values easy to update.
 */

/**
 * Validation constants for user input
 */
export const VALIDATION_CONSTANTS = {
  /** Minimum password length (OWASP recommendation) */
  PASSWORD_MIN_LENGTH: 8,
  
  /** Maximum password length to prevent DoS attacks */
  PASSWORD_MAX_LENGTH: 128,
  
  /** Maximum email address length (RFC 5321) */
  EMAIL_MAX_LENGTH: 255,
  
  /** Maximum name length */
  NAME_MAX_LENGTH: 100,
  
  /** Minimum name length */
  NAME_MIN_LENGTH: 1,
} as const;

/**
 * Pagination constants
 */
export const PAGINATION_CONSTANTS = {
  /** Default number of users per page */
  USERS_PER_PAGE: 25,
  
  /** Default number of attendees per page */
  ATTENDEES_PER_PAGE: 50,
  
  /** Default number of roles per page */
  ROLES_PER_PAGE: 20,
  
  /** Maximum items per page */
  MAX_ITEMS_PER_PAGE: 100,
} as const;

/**
 * Rate limiting constants
 */
export const RATE_LIMIT_CONSTANTS = {
  /** Maximum password reset attempts per hour */
  PASSWORD_RESET_MAX_ATTEMPTS: 3,
  
  /** Password reset window in milliseconds (1 hour) */
  PASSWORD_RESET_WINDOW_MS: 60 * 60 * 1000,
  
  /** Maximum email verification attempts per hour */
  EMAIL_VERIFICATION_MAX_ATTEMPTS: 5,
  
  /** Email verification window in milliseconds (1 hour) */
  EMAIL_VERIFICATION_WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * UI constants
 */
export const UI_CONSTANTS = {
  /** Debounce delay for search inputs (ms) */
  SEARCH_DEBOUNCE_MS: 300,
  
  /** Toast notification duration (ms) */
  TOAST_DURATION_MS: 5000,
  
  /** Dialog animation duration (ms) */
  DIALOG_ANIMATION_MS: 200,
} as const;

/**
 * File upload constants
 */
export const FILE_CONSTANTS = {
  /** Maximum file size for photo uploads (5MB) */
  MAX_PHOTO_SIZE_BYTES: 5 * 1024 * 1024,
  
  /** Allowed image MIME types */
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  
  /** Maximum file name length */
  MAX_FILENAME_LENGTH: 255,
} as const;

/**
 * Type exports for better TypeScript support
 */
export type ValidationConstants = typeof VALIDATION_CONSTANTS;
export type PaginationConstants = typeof PAGINATION_CONSTANTS;
export type RateLimitConstants = typeof RATE_LIMIT_CONSTANTS;
export type UIConstants = typeof UI_CONSTANTS;
export type FileConstants = typeof FILE_CONSTANTS;

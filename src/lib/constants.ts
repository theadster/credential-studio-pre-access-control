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

  /** Maximum login attempts within the time window */
  LOGIN_ATTEMPTS_MAX_ATTEMPTS: 5,

  /** Login attempts window in milliseconds (15 minutes) */
  LOGIN_ATTEMPTS_WINDOW_MS: 15 * 60 * 1000,
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
 * Special sentinel value for bulk edit operations
 * Used to indicate that a field should be cleared/set to null
 */
export const CLEAR_SENTINEL = '__CLEAR_FIELD__' as const;

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
 * Connection health monitoring constants
 * Used for WebSocket connection health tracking and automatic reconnection
 */
export const CONNECTION_HEALTH = {
  /** Interval to check for heartbeat/activity (30 seconds) */
  HEARTBEAT_INTERVAL: 30000,
  /** Maximum number of automatic reconnection attempts */
  MAX_RECONNECT_ATTEMPTS: 10,
  /** Initial backoff delay for reconnection (1 second) */
  INITIAL_BACKOFF: 1000,
  /** Maximum backoff delay for reconnection (30 seconds) */
  MAX_BACKOFF: 30000,
  /** Multiplier for exponential backoff */
  BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Data freshness tracking constants
 * Used for tracking data staleness and polling fallback
 */
export const DATA_FRESHNESS = {
  /** Time after which data is considered stale (30 seconds) */
  STALENESS_THRESHOLD: 30000,
  /** Interval for polling fallback when real-time fails (30 seconds) */
  POLLING_INTERVAL: 30000,
  /** Delay before activating polling fallback after disconnect (60 seconds) */
  POLLING_ACTIVATION_DELAY: 60000,
  /** Brief disconnection threshold - don't notify for disconnections shorter than this (5 seconds) */
  BRIEF_DISCONNECT_THRESHOLD: 5000,
  /** Debounce window for visibility changes (500ms) */
  VISIBILITY_DEBOUNCE_MS: 500,
} as const;

/**
 * Type exports for better TypeScript support
 */
export type ValidationConstants = typeof VALIDATION_CONSTANTS;
export type PaginationConstants = typeof PAGINATION_CONSTANTS;
export type RateLimitConstants = typeof RATE_LIMIT_CONSTANTS;
export type UIConstants = typeof UI_CONSTANTS;
export type FileConstants = typeof FILE_CONSTANTS;
export type ConnectionHealthConstants = typeof CONNECTION_HEALTH;
export type DataFreshnessConstants = typeof DATA_FRESHNESS;

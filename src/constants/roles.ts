/**
 * Role Constants
 * 
 * Centralized definitions for all role names used throughout the application.
 * This ensures role names are single-sourced and prevents drift across the codebase.
 */

export const ROLE_NAMES = {
  SUPER_ADMIN: 'Super Administrator',
  EVENT_MANAGER: 'Event Manager',
  REGISTRATION_STAFF: 'Registration Staff',
  VIEWER: 'Viewer',
} as const;

// Type for role names
export type RoleName = (typeof ROLE_NAMES)[keyof typeof ROLE_NAMES];

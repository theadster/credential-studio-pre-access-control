/**
 * Access Control Type Definitions
 * 
 * This module provides TypeScript types and Zod validation schemas for the
 * mobile access control system. These types define the structure of access
 * control records that determine badge validity and access permissions.
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 */

import { z } from 'zod';

/**
 * Access Control record stored in Appwrite database
 * 
 * Represents the access control settings for a single attendee,
 * including validity window and enabled/disabled status.
 */
export interface AccessControl {
  /** Unique document ID from Appwrite */
  $id: string;
  /** Reference to the attendee this access control applies to */
  attendeeId: string;
  /** Whether access is enabled (default: true) */
  accessEnabled: boolean;
  /** ISO datetime when badge becomes valid (null = always valid from creation) */
  validFrom: string | null;
  /** ISO datetime when badge expires (null = never expires) */
  validUntil: string | null;
  /** Document creation timestamp */
  $createdAt: string;
  /** Document last update timestamp */
  $updatedAt: string;
}

/**
 * Input type for creating or updating access control records
 * Excludes Appwrite-managed fields ($id, $createdAt, $updatedAt)
 */
export interface AccessControlInput {
  /** Reference to the attendee this access control applies to */
  attendeeId: string;
  /** Whether access is enabled (default: true) */
  accessEnabled: boolean;
  /** ISO datetime when badge becomes valid (null = always valid from creation) */
  validFrom: string | null;
  /** ISO datetime when badge expires (null = never expires) */
  validUntil: string | null;
}

/**
 * Zod schema for validating ISO 8601 datetime strings in UTC format
 * Accepts null for optional datetime fields
 */
export const utcDatetimeSchema = z.string().nullable().refine(
  (val) => {
    if (val === null) return true;
    // Validate ISO 8601 format with UTC timezone (Z suffix)
    const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
    if (!isoRegex.test(val)) return false;
    // Validate it's a valid date
    const date = new Date(val);
    return !isNaN(date.getTime());
  },
  { message: 'Must be a valid ISO 8601 datetime string in UTC format (ending with Z)' }
);

/**
 * Zod schema for validating access control input
 * 
 * Validates:
 * - attendeeId is a non-empty string
 * - accessEnabled is a boolean
 * - validFrom and validUntil are valid UTC datetime strings or null
 * - validFrom must be before validUntil when both are provided
 */
export const accessControlInputSchema = z.object({
  attendeeId: z.string().min(1, 'Attendee ID is required'),
  accessEnabled: z.boolean().default(true),
  validFrom: utcDatetimeSchema,
  validUntil: utcDatetimeSchema,
}).refine(
  (data) => {
    // If both dates are provided, validFrom must be before validUntil
    if (data.validFrom && data.validUntil) {
      const from = new Date(data.validFrom);
      const until = new Date(data.validUntil);
      return from < until;
    }
    return true;
  },
  {
    message: 'validFrom must be before validUntil',
    path: ['validFrom'],
  }
);

/**
 * Zod schema for validating access control update input
 * All fields except attendeeId are optional for partial updates
 */
export const accessControlUpdateSchema = z.object({
  accessEnabled: z.boolean().optional(),
  validFrom: utcDatetimeSchema.optional(),
  validUntil: utcDatetimeSchema.optional(),
}).refine(
  (data) => {
    // If both dates are provided, validFrom must be before validUntil
    if (data.validFrom && data.validUntil) {
      const from = new Date(data.validFrom);
      const until = new Date(data.validUntil);
      return from < until;
    }
    return true;
  },
  {
    message: 'validFrom must be before validUntil',
    path: ['validFrom'],
  }
);

/**
 * Type inferred from the input schema
 */
export type AccessControlInputType = z.infer<typeof accessControlInputSchema>;

/**
 * Type inferred from the update schema
 */
export type AccessControlUpdateType = z.infer<typeof accessControlUpdateSchema>;

/**
 * Converts a datetime string to UTC format
 * If the input is already in UTC (ends with Z), returns as-is
 * Otherwise, parses and converts to UTC ISO string
 * 
 * @param datetime - The datetime string to convert
 * @returns UTC ISO datetime string or null
 */
export function toUtcDatetime(datetime: string | null | undefined): string | null {
  if (!datetime) return null;
  
  const date = new Date(datetime);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid datetime: ${datetime}`);
  }
  
  return date.toISOString();
}

/**
 * Validates that validFrom is before validUntil
 * 
 * @param validFrom - Start of validity window
 * @param validUntil - End of validity window
 * @returns true if valid, false otherwise
 */
export function validateDateRange(
  validFrom: string | null,
  validUntil: string | null
): boolean {
  if (!validFrom || !validUntil) return true;
  
  const from = new Date(validFrom);
  const until = new Date(validUntil);
  
  return from < until;
}

/**
 * Checks if the current time is within the validity window
 * 
 * @param validFrom - Start of validity window (null = always valid from start)
 * @param validUntil - End of validity window (null = never expires)
 * @returns true if current time is within validity window
 */
export function isWithinValidityWindow(
  validFrom: string | null,
  validUntil: string | null
): boolean {
  const now = new Date();
  
  if (validFrom) {
    const from = new Date(validFrom);
    if (now < from) return false;
  }
  
  if (validUntil) {
    const until = new Date(validUntil);
    if (now > until) return false;
  }
  
  return true;
}

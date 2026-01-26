/**
 * Field Update Service
 * 
 * Provides field-specific updates for attendee records to prevent
 * concurrent operations from overwriting each other's changes.
 * 
 * This service ensures that:
 * - Credential generation only updates credential fields
 * - Photo uploads only update photo fields
 * - Profile updates only update profile fields
 * 
 * @module fieldUpdate
 */

import { Databases } from 'node-appwrite';
import {
  updateWithLock,
  LockResult,
  OptimisticLockConfig,
  DEFAULT_LOCK_CONFIG,
} from './optimisticLock';

// ============================================================================
// Field Group Definitions
// ============================================================================

/**
 * Field groups that should be updated atomically together.
 * Each group represents a logical set of fields that are typically
 * modified by the same type of operation.
 */
export const FIELD_GROUPS = {
  /** Fields updated during credential generation */
  credential: [
    'credentialUrl',
    'credentialGeneratedAt',
    'credentialCount',
    'lastCredentialGenerated',
  ],
  /** Fields updated during photo upload/removal */
  photo: [
    'photoUrl',
    'photoUploadCount',
    'lastPhotoUploaded',
  ],
  /** Core profile fields */
  profile: [
    'firstName',
    'lastName',
    'barcodeNumber',
    'notes',
  ],
  /** Custom field values */
  customFields: [
    'customFieldValues',
  ],
  /** Access control fields */
  accessControl: [
    'accessEnabled',
    'validFrom',
    'validUntil',
  ],
  /** Tracking and metadata fields */
  tracking: [
    'lastSignificantUpdate',
    'version',
  ],
} as const;

/**
 * Type for field group names
 */
export type FieldGroupName = keyof typeof FIELD_GROUPS;

/**
 * All field names across all groups
 */
export type FieldName = typeof FIELD_GROUPS[FieldGroupName][number];

// ============================================================================
// Options and Configuration
// ============================================================================

/**
 * Options for field update operations
 */
export interface FieldUpdateOptions {
  /** Only update these specific fields */
  fields?: string[];
  /** Preserve all other fields (merge mode) - default: true */
  preserveOthers?: boolean;
  /** Update version field - default: true */
  incrementVersion?: boolean;
  /** Custom lock configuration */
  lockConfig?: Partial<OptimisticLockConfig>;
}

/**
 * Default options for field updates
 */
export const DEFAULT_FIELD_UPDATE_OPTIONS: Required<Omit<FieldUpdateOptions, 'fields' | 'lockConfig'>> = {
  preserveOthers: true,
  incrementVersion: true,
};

// ============================================================================
// Credential Field Types
// ============================================================================

/**
 * Data structure for credential field updates
 */
export interface CredentialFieldData {
  /** URL of the generated credential */
  credentialUrl: string;
  /** ISO timestamp when credential was generated */
  credentialGeneratedAt?: string;
  /** Total number of credentials generated (will be incremented if not provided) */
  credentialCount?: number;
  /** ISO timestamp of last credential generation */
  lastCredentialGenerated?: string;
}

// ============================================================================
// Photo Field Types
// ============================================================================

/**
 * Data structure for photo field updates
 */
export interface PhotoFieldData {
  /** URL of the uploaded photo, or null to remove */
  photoUrl: string | null;
  /** Total number of photo uploads */
  photoUploadCount?: number;
  /** ISO timestamp of last photo upload */
  lastPhotoUploaded?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get all fields in a specific group
 * @param groupName - Name of the field group
 * @returns Array of field names in the group
 */
export function getFieldGroup(groupName: FieldGroupName): readonly string[] {
  return FIELD_GROUPS[groupName];
}

/**
 * Check if a field belongs to a specific group
 * @param fieldName - Name of the field to check
 * @param groupName - Name of the group to check against
 * @returns True if the field belongs to the group
 */
export function isFieldInGroup(fieldName: string, groupName: FieldGroupName): boolean {
  return (FIELD_GROUPS[groupName] as readonly string[]).includes(fieldName);
}

/**
 * Get the group that a field belongs to
 * @param fieldName - Name of the field
 * @returns The group name, or undefined if not found
 */
export function getFieldGroupName(fieldName: string): FieldGroupName | undefined {
  for (const [groupName, fields] of Object.entries(FIELD_GROUPS)) {
    if ((fields as readonly string[]).includes(fieldName)) {
      return groupName as FieldGroupName;
    }
  }
  return undefined;
}

/**
 * Filter data to only include fields from specified groups
 * @param data - The data object to filter
 * @param groups - Array of group names to include
 * @returns Filtered data object
 */
export function filterToGroups(
  data: Record<string, unknown>,
  groups: FieldGroupName[]
): Record<string, unknown> {
  const allowedFields = new Set<string>();
  for (const group of groups) {
    for (const field of FIELD_GROUPS[group]) {
      allowedFields.add(field);
    }
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (allowedFields.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}

/**
 * Filter data to exclude fields from specified groups
 * @param data - The data object to filter
 * @param groups - Array of group names to exclude
 * @returns Filtered data object
 */
export function excludeGroups(
  data: Record<string, unknown>,
  groups: FieldGroupName[]
): Record<string, unknown> {
  const excludedFields = new Set<string>();
  for (const group of groups) {
    for (const field of FIELD_GROUPS[group]) {
      excludedFields.add(field);
    }
  }

  const filtered: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!excludedFields.has(key)) {
      filtered[key] = value;
    }
  }
  return filtered;
}


// ============================================================================
// Core Update Functions
// ============================================================================

/**
 * Update only credential-related fields on an attendee record.
 * 
 * This function ensures that credential generation does not overwrite
 * photo, profile, or other fields that may have been modified concurrently.
 * 
 * @param databases - Appwrite Databases instance
 * @param databaseId - Database ID
 * @param collectionId - Collection ID (attendees)
 * @param attendeeId - Attendee document ID
 * @param data - Credential field data to update
 * @param options - Optional configuration
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * const result = await updateCredentialFields(
 *   databases,
 *   dbId,
 *   attendeesCollectionId,
 *   'attendee-123',
 *   {
 *     credentialUrl: 'https://example.com/credential.pdf',
 *     credentialGeneratedAt: new Date().toISOString(),
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log('Credential updated successfully');
 * }
 * ```
 */
export async function updateCredentialFields<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  attendeeId: string,
  data: CredentialFieldData,
  options?: Pick<FieldUpdateOptions, 'lockConfig'>
): Promise<LockResult<T>> {
  const now = new Date().toISOString();
  
  return updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    attendeeId,
    (current) => {
      // Get current credential count, defaulting to 0
      const currentCount = typeof current.credentialCount === 'number'
        ? current.credentialCount
        : 0;

      // Build update with only credential fields
      const update: Record<string, unknown> = {
        credentialUrl: data.credentialUrl,
        credentialGeneratedAt: data.credentialGeneratedAt ?? now,
        credentialCount: data.credentialCount ?? currentCount + 1,
        lastCredentialGenerated: data.lastCredentialGenerated ?? now,
      };

      return update as Partial<T>;
    },
    options?.lockConfig ?? DEFAULT_LOCK_CONFIG
  );
}

/**
 * Update only photo-related fields on an attendee record.
 * 
 * This function ensures that photo uploads do not overwrite
 * credential, profile, or other fields that may have been modified concurrently.
 * 
 * @param databases - Appwrite Databases instance
 * @param databaseId - Database ID
 * @param collectionId - Collection ID (attendees)
 * @param attendeeId - Attendee document ID
 * @param data - Photo field data to update
 * @param options - Optional configuration
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * const result = await updatePhotoFields(
 *   databases,
 *   dbId,
 *   attendeesCollectionId,
 *   'attendee-123',
 *   {
 *     photoUrl: 'https://example.com/photo.jpg',
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log('Photo updated successfully');
 * }
 * ```
 */
export async function updatePhotoFields<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  attendeeId: string,
  data: PhotoFieldData,
  options?: Pick<FieldUpdateOptions, 'lockConfig'>
): Promise<LockResult<T>> {
  const now = new Date().toISOString();
  
  return updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    attendeeId,
    (current) => {
      // Determine if this is an add, remove, or replace operation
      // Use explicit checks for non-empty strings to handle falsy values correctly
      const hadPhoto = typeof current.photoUrl === 'string' && current.photoUrl.length > 0;
      const hasPhoto = typeof data.photoUrl === 'string' && data.photoUrl.length > 0;
      
      // Get current photo count, defaulting to 0
      const currentCount = typeof current.photoUploadCount === 'number'
        ? current.photoUploadCount
        : 0;

      // Build update with only photo fields
      const update: Record<string, unknown> = {
        photoUrl: data.photoUrl,
      };

      // Handle photo count and timestamp based on operation type
      if (data.photoUploadCount !== undefined) {
        // Explicit count provided - clamp to valid range [0, MAX_SAFE_INTEGER]
        update.photoUploadCount = Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, data.photoUploadCount));
      } else if (hasPhoto && !hadPhoto) {
        // Photo was added - increment count (clamped to MAX_SAFE_INTEGER)
        update.photoUploadCount = Math.min(Number.MAX_SAFE_INTEGER, currentCount + 1);
      } else if (!hasPhoto && hadPhoto) {
        // Photo was removed - decrement count (min 0)
        update.photoUploadCount = Math.max(0, currentCount - 1);
      }
      // If replacing photo (had and still has), don't change count

      // Handle timestamp
      if (data.lastPhotoUploaded !== undefined) {
        update.lastPhotoUploaded = data.lastPhotoUploaded;
      } else if (hasPhoto && !hadPhoto) {
        // Only set timestamp when adding a new photo
        update.lastPhotoUploaded = now;
      }

      return update as Partial<T>;
    },
    options?.lockConfig ?? DEFAULT_LOCK_CONFIG
  );
}

/**
 * Generic field-specific update function.
 * 
 * This function allows updating arbitrary fields while using optimistic locking.
 * It can be configured to only update specific fields or preserve others.
 * 
 * @param databases - Appwrite Databases instance
 * @param databaseId - Database ID
 * @param collectionId - Collection ID
 * @param documentId - Document ID
 * @param data - Fields to update
 * @param options - Update options
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * // Update only specific fields
 * const result = await updateFields(
 *   databases,
 *   dbId,
 *   collectionId,
 *   'doc-123',
 *   { firstName: 'John', lastName: 'Doe' },
 *   { fields: ['firstName', 'lastName'] }
 * );
 * 
 * // Update with field group filtering
 * const result = await updateFields(
 *   databases,
 *   dbId,
 *   collectionId,
 *   'doc-123',
 *   updateData,
 *   { fields: [...FIELD_GROUPS.profile] }
 * );
 * ```
 */
export async function updateFields<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  data: Record<string, unknown>,
  options?: FieldUpdateOptions
): Promise<LockResult<T>> {
  const mergedOptions = {
    ...DEFAULT_FIELD_UPDATE_OPTIONS,
    ...options,
  };

  return updateWithLock<T>(
    databases,
    databaseId,
    collectionId,
    documentId,
    (current) => {
      // Filter incoming data to only specified fields if provided
      let filteredData = { ...data };
      if (mergedOptions.fields && mergedOptions.fields.length > 0) {
        const allowedFields = new Set(mergedOptions.fields);
        filteredData = Object.fromEntries(
          Object.entries(filteredData).filter(([key]) => allowedFields.has(key))
        );
      }

      // Merge with current document if preserveOthers is true
      if (mergedOptions.preserveOthers) {
        return { ...current, ...filteredData } as Partial<T>;
      }

      return filteredData as Partial<T>;
    },
    options?.lockConfig ?? DEFAULT_LOCK_CONFIG
  );
}

/**
 * Update fields belonging to a specific field group.
 * 
 * This is a convenience function that filters the update data
 * to only include fields from the specified group.
 * 
 * @param databases - Appwrite Databases instance
 * @param databaseId - Database ID
 * @param collectionId - Collection ID
 * @param documentId - Document ID
 * @param groupName - Name of the field group
 * @param data - Fields to update (will be filtered to group)
 * @param options - Update options
 * @returns LockResult with success status and updated document
 * 
 * @example
 * ```typescript
 * const result = await updateFieldGroup(
 *   databases,
 *   dbId,
 *   collectionId,
 *   'doc-123',
 *   'profile',
 *   { firstName: 'John', lastName: 'Doe', photoUrl: 'ignored' }
 * );
 * // Only firstName and lastName will be updated
 * ```
 */
export async function updateFieldGroup<T extends Record<string, unknown>>(
  databases: Databases,
  databaseId: string,
  collectionId: string,
  documentId: string,
  groupName: FieldGroupName,
  data: Record<string, unknown>,
  options?: FieldUpdateOptions
): Promise<LockResult<T>> {
  const groupFields = FIELD_GROUPS[groupName] as readonly string[];
  const filteredData = filterToGroups(data, [groupName]);

  return updateFields<T>(
    databases,
    databaseId,
    collectionId,
    documentId,
    filteredData,
    {
      ...options,
      fields: [...groupFields],
    }
  );
}

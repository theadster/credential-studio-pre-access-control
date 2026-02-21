/**
 * Appwrite Type Helpers
 * 
 * This module provides Appwrite SDK-specific type guards and helpers for
 * working with Appwrite attribute types. These utilities enable safe access
 * to type-specific properties on attribute union types.
 */

/**
 * Base interface for all Appwrite attributes.
 */
interface BaseAttribute {
  key: string;
  type: string;
  status: string;
  error?: string;
  required: boolean;
  array?: boolean;
  [key: string]: unknown;
}

/**
 * Attributes that have a 'size' property.
 * In Appwrite, only string attributes have a size property.
 */
interface SizedAttribute extends BaseAttribute {
  type: 'string';
  size: number;
}

/**
 * Attributes that have a 'default' property.
 * These include most primitive attribute types.
 */
interface DefaultableAttribute extends BaseAttribute {
  type: 'string' | 'integer' | 'float' | 'boolean' | 'email' | 'datetime' | 'enum' | 'ip' | 'url';
  default?: string | number | boolean | null;
}

/**
 * Generic Appwrite attribute type.
 * This represents any attribute returned from the Appwrite API.
 */
type AppwriteAttribute = BaseAttribute;

/**
 * Type guard to check if an Appwrite attribute has a size property.
 * 
 * In Appwrite, only string attributes have a size property that represents
 * the maximum length of the string value.
 * 
 * @param attribute - The Appwrite attribute to check
 * @returns True if the attribute has a size property, false otherwise
 * 
 * @example
 * ```typescript
 * const attributes = await tablesDB.listColumns(databaseId, tableId);
 * 
 * for (const attribute of attributes.columns) {
 *   if (hasSizeProperty(attribute)) {
 *     console.log(`Attribute ${attribute.key} has size: ${attribute.size}`);
 *   }
 * }
 * ```
 */
export function hasSizeProperty(
  attribute: AppwriteAttribute
): attribute is SizedAttribute {
  return attribute.type === 'string';
}

/**
 * Type guard to check if an Appwrite attribute has a default property.
 * 
 * The default property is available on most primitive attribute types
 * and represents the default value for the attribute when not specified.
 * 
 * @param attribute - The Appwrite attribute to check
 * @returns True if the attribute has a default property, false otherwise
 * 
 * @example
 * ```typescript
 * const attributes = await databases.listAttributes(databaseId, tableId);
 * 
 * for (const attribute of attributes.attributes) {
 *   if (hasDefaultProperty(attribute)) {
 *     console.log(`Attribute ${attribute.key} default: ${attribute.default}`);
 *   }
 * }
 * ```
 */
export function hasDefaultProperty(
  attribute: AppwriteAttribute
): attribute is DefaultableAttribute {
  return (
    attribute.type === 'string' ||
    attribute.type === 'integer' ||
    attribute.type === 'float' ||
    attribute.type === 'boolean' ||
    attribute.type === 'email' ||
    attribute.type === 'datetime' ||
    attribute.type === 'enum' ||
    attribute.type === 'ip' ||
    attribute.type === 'url'
  );
}

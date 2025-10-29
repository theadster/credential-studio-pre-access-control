/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input before state updates
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes all HTML tags and dangerous content completely
 * Does NOT trim to allow spaces during typing
 */
export function sanitizeInput(value: string): string {
  if (!value) return '';
  
  return value
    // Remove script tags and their content first
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all remaining HTML tags (but keep their text content)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitizes user input with trimming
 * Removes all HTML tags and dangerous content completely
 * Use this on blur/submit to clean up leading/trailing whitespace
 */
export function sanitizeInputFinal(value: string): string {
  if (!value) return '';
  
  return value
    .trim()
    // Remove script tags and their content first
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all remaining HTML tags (but keep their text content)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitizes email input
 */
export function sanitizeEmail(value: string): string {
  if (!value) return '';
  return value.trim().toLowerCase();
}

/**
 * Sanitizes URL input
 */
export function sanitizeUrl(value: string): string {
  if (!value) return '';
  
  const trimmed = value.trim();
  
  // Only allow http/https URLs
  if (!trimmed.match(/^https?:\/\//i)) {
    return '';
  }
  
  return trimmed;
}

/**
 * Sanitizes notes/textarea input
 * Removes all HTML tags and event handlers to prevent XSS
 * Does NOT trim to allow spaces during typing
 */
export function sanitizeNotes(value: string): string {
  if (!value) return '';
  
  return value
    // Remove script tags and their content first
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all remaining HTML tags (but keep their text content)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitizes notes/textarea input with trimming
 * Removes all HTML tags and event handlers to prevent XSS
 * Use this on blur/submit to clean up leading/trailing whitespace
 */
export function sanitizeNotesFinal(value: string): string {
  if (!value) return '';
  
  return value
    .trim()
    // Remove script tags and their content first
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove all remaining HTML tags (but keep their text content)
    .replace(/<[^>]*>/g, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitizes barcode input
 * Only allows alphanumeric characters
 */
export function sanitizeBarcode(value: string): string {
  if (!value) return '';
  
  return value
    .trim()
    .toUpperCase()
    // Only allow alphanumeric characters
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by sanitizing user input before state updates
 */

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes potentially dangerous characters while preserving usability
 * Does NOT trim to allow spaces during typing
 */
export function sanitizeInput(value: string): string {
  if (!value) return '';
  
  return value
    // Remove script-like content first
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove angle brackets (this removes < and > completely)
    .replace(/[<>]/g, '');
}

/**
 * Sanitizes user input with trimming
 * Use this on blur/submit to clean up leading/trailing whitespace
 */
export function sanitizeInputFinal(value: string): string {
  if (!value) return '';
  
  return value
    .trim()
    // Remove script-like content first
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Remove angle brackets (this removes < and > completely)
    .replace(/[<>]/g, '');
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
 * More permissive but still safe
 * Does NOT trim to allow spaces during typing
 */
export function sanitizeNotes(value: string): string {
  if (!value) return '';
  
  return value
    // Remove script tags and event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Sanitizes notes/textarea input with trimming
 * Use this on blur/submit to clean up leading/trailing whitespace
 */
export function sanitizeNotesFinal(value: string): string {
  if (!value) return '';
  
  return value
    .trim()
    // Remove script tags and event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
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

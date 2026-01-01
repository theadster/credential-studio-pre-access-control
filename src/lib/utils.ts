import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Escape HTML special characters to prevent XSS attacks
 * Replaces &, <, >, ", ', and / with their HTML entity equivalents
 * 
 * @param text - The text to escape
 * @returns The escaped text safe for HTML interpolation
 * 
 * @example
 * escapeHtml('<script>alert("xss")</script>')
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 * 
 * escapeHtml('user@example.com')
 * // Returns: 'user@example.com'
 */
export function escapeHtml(text: string): string {
  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char]);
}

/**
 * Build a sliding-window pagination page array
 * 
 * Calculates which page numbers to display in pagination controls,
 * centering around the current page with a maximum visible pages limit.
 * Handles edge cases at the beginning and end of the page range.
 * 
 * @param currentPage - The current page number (1-indexed)
 * @param totalPages - The total number of pages available
 * @param maxVisiblePages - Maximum number of pages to display (default: 5)
 * @returns Array of page numbers to display
 * 
 * @example
 * buildPageWindow(5, 10, 5)
 * // Returns: [3, 4, 5, 6, 7]
 * 
 * buildPageWindow(1, 10, 5)
 * // Returns: [1, 2, 3, 4, 5]
 * 
 * buildPageWindow(10, 10, 5)
 * // Returns: [6, 7, 8, 9, 10]
 * 
 * buildPageWindow(2, 3, 5)
 * // Returns: [1, 2, 3]
 */
export function buildPageWindow(
  currentPage: number,
  totalPages: number,
  maxVisiblePages: number = 5
): number[] {
  const pages: number[] = [];
  totalPages = Math.floor(totalPages);
  
  // Return empty array if totalPages is invalid
  if (totalPages < 1) {
    return pages;
  }
  
  currentPage = Math.max(1, Math.min(totalPages, Math.floor(currentPage)));
  maxVisiblePages = Math.max(1, Math.floor(maxVisiblePages));
  
  const halfVisible = Math.floor(maxVisiblePages / 2);
  
  // Calculate initial window centered on current page
  let startPage = Math.max(1, currentPage - halfVisible);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  // Adjust start page if we're near the end and can't fill the window
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  // Build the page array
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return pages;
}

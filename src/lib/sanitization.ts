/**
 * HTML Sanitization Utilities
 * 
 * Provides secure HTML sanitization to prevent XSS attacks.
 * Used primarily for user-provided HTML templates in integrations.
 */

import * as DOMPurify from 'isomorphic-dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * 
 * @param html - Raw HTML string to sanitize
 * @returns Sanitized HTML string with dangerous content removed
 * 
 * @example
 * ```typescript
 * const userInput = '<div>Hello <script>alert("XSS")</script></div>';
 * const safe = sanitizeHTML(userInput);
 * // Result: '<div>Hello </div>'
 * ```
 */
export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  return DOMPurify.sanitize(html, {
    // Allow only safe HTML tags for templates
    ALLOWED_TAGS: [
      'html', 'head', 'body', 'title', 'style', 
      'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'img', 'br', 'hr', 'a', 'strong', 'em', 'u', 'b', 'i',
      'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th'
    ],
    // Allow only safe attributes
    ALLOWED_ATTR: [
      'class', 'id', 'src', 'alt', 'style', 'href', 'title',
      'width', 'height', 'colspan', 'rowspan'
    ],
    // Disallow data attributes to prevent data exfiltration
    ALLOW_DATA_ATTR: false,
    // Keep safe URLs only
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/**
 * Sanitizes HTML template with placeholder preservation
 * 
 * Preserves template placeholders like {{variable}} while sanitizing HTML
 * 
 * @param html - HTML template with placeholders
 * @returns Sanitized HTML with placeholders intact
 * 
 * @example
 * ```typescript
 * const template = '<div>{{firstName}} <script>alert()</script></div>';
 * const safe = sanitizeHTMLTemplate(template);
 * // Result: '<div>{{firstName}} </div>'
 * ```
 */
export function sanitizeHTMLTemplate(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // Temporarily replace placeholders with safe tokens
  const placeholderMap = new Map<string, string>();
  let counter = 0;
  
  const withTokens = html.replace(/\{\{([^}]+)\}\}/g, (match, variable) => {
    const token = `__PLACEHOLDER_${counter}__`;
    placeholderMap.set(token, match);
    counter++;
    return token;
  });

  // Sanitize HTML
  const sanitized = sanitizeHTML(withTokens);

  // Restore placeholders
  let result = sanitized;
  placeholderMap.forEach((placeholder, token) => {
    result = result.replace(token, placeholder);
  });

  return result;
}

/**
 * Validates that HTML doesn't contain dangerous patterns
 * 
 * @param html - HTML string to validate
 * @returns Validation result with error message if invalid
 */
export function validateHTMLSafety(html: string): { valid: boolean; error?: string } {
  if (!html || typeof html !== 'string') {
    return { valid: true };
  }

  // Check for common XSS patterns
  const dangerousPatterns = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi, // Event handlers
    /javascript:/gi,
    /data:text\/html/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(html)) {
      return {
        valid: false,
        error: 'HTML contains potentially dangerous content. Please remove script tags, event handlers, and embedded content.'
      };
    }
  }

  return { valid: true };
}

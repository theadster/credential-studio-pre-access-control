/**
 * Sanitization Utilities
 * 
 * Provides secure sanitization for various input types to prevent XSS attacks.
 * Used for user inputs, HTML templates, and form fields.
 */

// DOMPurify type for client-side usage
type DOMPurifyInstance = {
  sanitize: (source: string | Node, config?: any) => string;
};

// Cache for DOMPurify instance (client-side only)
let domPurifyInstance: DOMPurifyInstance | null = null;

/**
 * Server-side HTML sanitization using regex patterns
 * This is a fallback for server-side rendering where DOMPurify can't run
 */
function sanitizeHTMLServer(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let sanitized = html;

  // Remove script tags and their content
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol for potential data exfiltration
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Remove dangerous tags
  sanitized = sanitized.replace(/<iframe[^>]*>.*?<\/iframe>/gi, '');
  sanitized = sanitized.replace(/<object[^>]*>.*?<\/object>/gi, '');
  sanitized = sanitized.replace(/<embed[^>]*>/gi, '');
  sanitized = sanitized.replace(/<applet[^>]*>.*?<\/applet>/gi, '');
  
  // Remove style tags (can be used for CSS-based attacks)
  sanitized = sanitized.replace(/<style[^>]*>.*?<\/style>/gi, '');
  
  return sanitized;
}

/**
 * Get the appropriate sanitizer based on environment
 * Dynamically imports DOMPurify only on the client side
 */
async function getSanitizer(): Promise<DOMPurifyInstance | null> {
  if (typeof window === 'undefined') {
    // Server-side: return null, we'll use regex-based sanitization
    return null;
  }
  
  // Client-side: dynamically import DOMPurify if not already loaded
  if (!domPurifyInstance) {
    try {
      const DOMPurify = await import('dompurify');
      domPurifyInstance = DOMPurify.default;
    } catch (error) {
      console.error('Failed to load DOMPurify:', error);
      return null;
    }
  }
  
  return domPurifyInstance;
}

/**
 * Synchronous version for client-side only (assumes DOMPurify is already loaded)
 */
function getSanitizerSync(): DOMPurifyInstance | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return domPurifyInstance;
}

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

  const purify = getSanitizerSync();
  
  if (purify) {
    // Client-side: use DOMPurify
    return purify.sanitize(html, {
      // Allow only safe HTML tags for templates
      // Note: 'style' tag removed to prevent CSS-based attack vectors
      // Use inline style attribute instead for styling needs
      ALLOWED_TAGS: [
        'html', 'head', 'body', 'title',
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
  
  // Server-side or DOMPurify not loaded: use regex-based sanitization
  return sanitizeHTMLServer(html);
}

/**
 * Initializes DOMPurify on the client side
 * Call this early in your app lifecycle (e.g., in _app.tsx)
 */
export async function initializeSanitizer(): Promise<void> {
  if (typeof window !== 'undefined' && !domPurifyInstance) {
    await getSanitizer();
  }
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

/**
 * Sanitizes general text input (real-time, no trimming)
 * Uses DOMPurify to strip all HTML and scripts, returning text-only output
 * Preserves spaces for real-time input
 */
export function sanitizeInput(value: string): string {
  if (!value) return '';
  
  const purify = getSanitizerSync();
  
  if (purify) {
    // Client-side: use DOMPurify to strip all HTML tags and scripts
    return purify.sanitize(value, {
      ALLOWED_TAGS: [], // No HTML tags allowed - text only
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content when removing tags
    });
  }
  
  // Server-side or DOMPurify not loaded: strip HTML tags using regex
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '') // Remove all HTML tags
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
}

/**
 * Final sanitization for text input (trims whitespace)
 * Use on blur or submit
 */
export function sanitizeInputFinal(value: string): string {
  return sanitizeInput(value).trim();
}

/**
 * Sanitizes and validates email input
 * Uses DOMPurify to strip HTML, then validates email format
 * Returns sanitized email or empty string if invalid
 * 
 * @param value - Email string to sanitize
 * @returns Sanitized, lowercased, trimmed email or empty string if invalid
 * 
 * @example
 * ```typescript
 * sanitizeEmail('User@Example.com') // 'user@example.com'
 * sanitizeEmail('<script>alert()</script>test@example.com') // 'test@example.com'
 * sanitizeEmail('invalid-email') // ''
 * ```
 */
export function sanitizeEmail(value: string): string {
  if (!value) return '';
  
  const purify = getSanitizerSync();
  let stripped: string;
  
  if (purify) {
    // Client-side: use DOMPurify to strip all HTML and scripts
    stripped = purify.sanitize(value, {
      ALLOWED_TAGS: [], // No HTML tags allowed
      ALLOWED_ATTR: [], // No attributes allowed
      KEEP_CONTENT: true, // Keep text content
    });
  } else {
    // Server-side or DOMPurify not loaded: strip HTML tags using regex
    stripped = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]+>/g, '');
  }
  
  // Normalize: lowercase and trim
  const normalized = stripped.toLowerCase().trim();
  
  // Validate email format using a standard regex
  // RFC 5322 compliant basic email validation
  const emailRegex = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
  
  // Return sanitized email if valid, empty string if invalid
  return emailRegex.test(normalized) ? normalized : '';
}

/**
 * Sanitizes URL input
 */
export function sanitizeUrl(value: string): string {
  if (!value) return '';
  
  const sanitized = value
    .replace(/[<>'"]/g, '')
    .trim();
  
  if (!sanitized) return '';
  
  // Ensure URL has a protocol
  if (!/^https?:\/\//i.test(sanitized)) {
    return `https://${sanitized}`;
  }
  
  return sanitized;
}

/**
 * Sanitizes notes/textarea input (real-time, no trimming)
 * More permissive but still safe
 */
export function sanitizeNotes(value: string): string {
  if (!value) return '';
  
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
}

/**
 * Final sanitization for notes (trims whitespace)
 * Use on blur or submit
 */
export function sanitizeNotesFinal(value: string): string {
  return sanitizeNotes(value).trim();
}

/**
 * Sanitizes barcode input
 * Allows only alphanumeric characters
 */
export function sanitizeBarcode(value: string): string {
  if (!value) return '';
  
  return value
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

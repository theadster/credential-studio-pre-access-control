/**
 * API Fetch Helper
 * 
 * Provides a reusable fetch wrapper with:
 * - Automatic timeout handling (10s default)
 * - Content-Type validation
 * - Proper error handling
 * - AbortController cleanup
 */

export interface ApiFetchOptions extends Omit<RequestInit, 'signal'> {
  timeout?: number; // Timeout in milliseconds (default: 10000)
  validateContentType?: boolean; // Whether to validate JSON content-type (default: true)
}

export class ApiFetchError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ApiFetchError';
  }
}

/**
 * Fetch wrapper with timeout and content-type validation
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options with additional timeout and validation settings
 * @returns Parsed JSON response
 * @throws ApiFetchError on timeout, invalid content-type, or network errors
 * 
 * @example
 * ```typescript
 * try {
 *   const data = await apiFetch('/api/users', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ name: 'John' })
 *   });
 *   console.log(data);
 * } catch (error) {
 *   if (error instanceof ApiFetchError) {
 *     console.error(`API Error (${error.statusCode}):`, error.message);
 *   }
 * }
 * ```
 */
export async function apiFetch<T = any>(
  url: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const {
    timeout = 10000,
    validateContentType = true,
    ...fetchOptions
  } = options;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Perform fetch with abort signal
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    });

    // Clear timeout on successful response
    clearTimeout(timeoutId);

    // Validate content-type if requested
    if (validateContentType) {
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new ApiFetchError(
          `Expected JSON response but received ${contentType || 'unknown content-type'}`,
          response.status,
          response
        );
      }
    }

    // Parse JSON response
    let data: T;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new ApiFetchError(
        `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
        response.status,
        response
      );
    }

    // Check if response was successful
    if (!response.ok) {
      // Extract error message from response data if available
      const errorMessage = (data as any)?.error || 
                          (data as any)?.message || 
                          `Request failed with status ${response.status}`;
      throw new ApiFetchError(errorMessage, response.status, response);
    }

    return data;

  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Handle abort (timeout) errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiFetchError(
        `Request timeout after ${timeout}ms`,
        undefined,
        undefined
      );
    }

    // Re-throw ApiFetchError as-is
    if (error instanceof ApiFetchError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError) {
      throw new ApiFetchError(
        `Network error: ${error.message}`,
        undefined,
        undefined
      );
    }

    // Handle unknown errors
    throw new ApiFetchError(
      error instanceof Error ? error.message : 'Unknown error occurred',
      undefined,
      undefined
    );
  }
}

/**
 * Custom hook for handling API errors in frontend components
 * Provides consistent error parsing and display logic
 * 
 * Requirements: 7.2, 7.4, 7.6
 */

import { useToast } from '@/components/ui/use-toast';
import { useCallback } from 'react';

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: any;
  resetAt?: number;
}

export interface ParsedError {
  message: string;
  code: string;
  isNetworkError: boolean;
  isAuthError: boolean;
  isValidationError: boolean;
  resetAt?: number;
}

/**
 * Parse API error response
 */
export function parseApiError(error: any): ParsedError {
  // Handle fetch errors
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      message: 'Unable to connect to the server. Please check your connection.',
      code: 'NETWORK_ERROR',
      isNetworkError: true,
      isAuthError: false,
      isValidationError: false
    };
  }

  // Handle timeout errors
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return {
      message: 'Request timed out. Please try again.',
      code: 'TIMEOUT_ERROR',
      isNetworkError: true,
      isAuthError: false,
      isValidationError: false
    };
  }

  // Handle API error responses
  if (error.error || error.code) {
    const code = error.code || 'UNKNOWN_ERROR';
    const message = error.error || 'An unexpected error occurred';
    
    return {
      message,
      code,
      isNetworkError: false,
      isAuthError: code === 'AUTH_FAILED' || code === 'PERMISSION_DENIED',
      isValidationError: code === 'VALIDATION_ERROR' || code === 'INVALID_REQUEST',
      resetAt: error.resetAt
    };
  }

  // Handle generic errors
  return {
    message: error.message || 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
    isNetworkError: false,
    isAuthError: false,
    isValidationError: false
  };
}

/**
 * Format rate limit time remaining
 */
export function formatRateLimitTime(resetAt: number): string {
  const now = Date.now();
  const diff = resetAt - now;
  
  if (diff <= 0) {
    return 'now';
  }
  
  const minutes = Math.ceil(diff / 60000);
  
  if (minutes === 1) {
    return '1 minute';
  }
  
  return `${minutes} minutes`;
}

/**
 * Custom hook for API error handling
 */
export function useApiError() {
  const { toast } = useToast();

  /**
   * Handle API error and show appropriate toast
   */
  const handleError = useCallback((error: any, customMessage?: string) => {
    const parsed = parseApiError(error);
    
    // Use custom message if provided, otherwise use parsed message
    const message = customMessage || parsed.message;
    
    // Add rate limit info if available
    let description = message;
    if (parsed.resetAt) {
      description += ` Try again in ${formatRateLimitTime(parsed.resetAt)}.`;
    }
    
    // Show toast with appropriate variant
    toast({
      variant: 'destructive',
      title: parsed.isAuthError ? 'Permission Denied' : 'Error',
      description
    });
    
    return parsed;
  }, [toast]);

  /**
   * Handle API success and show toast
   */
  const handleSuccess = useCallback((message: string, description?: string) => {
    toast({
      title: message,
      description
    });
  }, [toast]);

  /**
   * Fetch with error handling and retry logic
   */
  const fetchWithRetry = useCallback(async <T = any>(
    url: string,
    options: RequestInit = {},
    maxRetries: number = 2
  ): Promise<T> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw data;
        }

        return data as T;
      } catch (error: any) {
        lastError = error;
        
        // Parse error to check if retryable
        const parsed = parseApiError(error);
        
        // Only retry network errors and timeouts
        const isRetryable = parsed.isNetworkError;
        
        // Don't retry if not retryable or if we've exhausted retries
        if (!isRetryable || attempt === maxRetries) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        console.log(`Retrying request (attempt ${attempt + 1}/${maxRetries})...`);
      }
    }

    throw lastError;
  }, []);

  return {
    handleError,
    handleSuccess,
    fetchWithRetry,
    parseApiError
  };
}

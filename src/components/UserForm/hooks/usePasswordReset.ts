/**
 * usePasswordReset Hook
 * 
 * Manages password reset functionality for users with auth accounts.
 * Handles API calls, loading states, and error handling.
 */

import { useState } from 'react';
import { useApiError } from '@/hooks/useApiError';
import { User } from '../types';

/**
 * Hook return type
 */
export interface UsePasswordResetReturn {
  /** Send password reset email */
  sendPasswordReset: (user: User) => Promise<void>;

  /** Whether password reset is being sent */
  sending: boolean;
}

/**
 * Custom hook for password reset functionality
 * 
 * @returns Password reset function and loading state
 * 
 * @example
 * ```typescript
 * const { sendPasswordReset, sending } = usePasswordReset();
 * 
 * // Send password reset
 * await sendPasswordReset(user);
 * ```
 */
export function usePasswordReset(): UsePasswordResetReturn {
  const { handleError, handleSuccess, fetchWithRetry } = useApiError();
  const [sending, setSending] = useState(false);

  /**
   * Send password reset email to user
   * 
   * @param user - User to send password reset to
   * @throws Error if user doesn't have an auth account
   */
  const sendPasswordReset = async (user: User) => {
    // Validate user has auth account
    if (!user.userId) {
      handleError(
        new Error('This user does not have an associated auth account. Password reset is only available for users with auth accounts.'),
        'Cannot send password reset'
      );
      return;
    }

    setSending(true);

    try {
      // Send password reset email using the user's auth ID
      await fetchWithRetry('/api/users/send-password-reset', {
        method: 'POST',
        body: JSON.stringify({
          authUserId: user.userId,
        }),
      });

      handleSuccess(
        'Password Reset Email Sent',
        `Password reset email sent to ${user.email}. User must click the link in their email to reset their password.`
      );
    } catch (err: unknown) {
      console.error('Error sending password reset email:', err);

      // Type guard for error with code property
      const hasErrorCode = (error: unknown): error is { code?: string; message?: string } => {
        return typeof error === 'object' && error !== null;
      };

      // Check for rate limiting error by code (preferred) or message (fallback)
      const isRateLimitError = hasErrorCode(err) && (
        err.code === 'VERIFICATION_RATE_LIMIT' ||
        (typeof err.message === 'string' && err.message.includes('Too many password reset'))
      );

      const error = err instanceof Error ? err : new Error(String(err));

      if (isRateLimitError) {
        handleError(error, 'Rate limit exceeded. Please wait before trying again.');
      } else {
        handleError(error, 'Failed to send password reset email');
      }
    } finally {
      setSending(false);
    }
  };

  return {
    sendPasswordReset,
    sending,
  };
}

/**
 * PasswordResetSection Component
 * 
 * Displays password reset functionality for users with auth accounts.
 * Shows appropriate messages for invited users without accounts.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, KeyRound, Mail } from 'lucide-react';
import { PasswordResetSectionProps } from './types';

/**
 * Password reset section component
 * 
 * @param props - Component props
 * @returns Password reset UI
 */
export default function PasswordResetSection({ user, sending, onSendReset }: PasswordResetSectionProps) {
  // User has auth account - show password reset button
  if (user.userId) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
        <KeyRound className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-1">
              Password Reset
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              Send a password reset email to help this user change their password.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onSendReset}
            disabled={sending}
            className="shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900/30"
          >
            {sending ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <KeyRound className="h-3 w-3 mr-1" />
                Send Reset Email
              </>
            )}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // User is invited but hasn't created account yet
  if (user.isInvited) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
        <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertDescription>
          <p className="text-sm text-blue-900 dark:text-blue-100">
            This user was invited but hasn't created their account yet. Password reset will be available after they complete signup.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // User has no auth account and wasn't invited - show nothing
  return null;
}

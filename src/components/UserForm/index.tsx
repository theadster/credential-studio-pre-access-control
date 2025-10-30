/**
 * UserForm Module
 * 
 * Modular user form component for creating and editing users.
 * Broken down into focused, testable components and hooks.
 * 
 * The default export is wrapped with ErrorBoundary for production safety.
 */

import React from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import UserFormContainerBase from './UserFormContainer';
import { UserFormProps } from './types';

/**
 * Error handler for UserForm component errors
 * 
 * Logs to console in development with full error details.
 * In production, emits structured console logs for server-side collection.
 * 
 * TODO: Integrate with error tracking service (e.g., Sentry) for production monitoring
 */
const handleUserFormError = (error: Error, errorInfo: React.ErrorInfo) => {
  // Always log to console in development for visibility
  if (process.env.NODE_ENV === 'development') {
    console.error('UserForm Error:', error, errorInfo);
  }

  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Replace with your error tracking service (e.g., Sentry)
    // Example: Sentry.captureException(error, { contexts: { react: errorInfo } });

    // For now, log structured error data for server logs
    console.error('UserForm Error [Production]:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }
};

// Main container component (unwrapped)
export { default as UserFormContainer } from './UserFormContainer';

// Default export wrapped with ErrorBoundary
const UserFormWithErrorBoundary = (props: UserFormProps) => (
  <ErrorBoundary
    showDetails={process.env.NODE_ENV === 'development'}
    onError={handleUserFormError}
  >
    <UserFormContainerBase {...props} />
  </ErrorBoundary>
);

export default UserFormWithErrorBoundary;

// Sub-components
export { default as UserFormFields } from './UserFormFields';
export { default as AuthUserSelector } from './AuthUserSelector';
export { default as RoleSelector } from './RoleSelector';
export { default as PasswordResetSection } from './PasswordResetSection';

// Hooks
export { useUserFormState } from './hooks/useUserFormState';
export { useUserFormValidation } from './hooks/useUserFormValidation';
export { usePasswordReset } from './hooks/usePasswordReset';

// Types
export * from './types';

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

// Main container component (unwrapped)
export { default as UserFormContainer } from './UserFormContainer';

// Default export wrapped with ErrorBoundary
const UserFormWithErrorBoundary = (props: UserFormProps) => (
  <ErrorBoundary
    showDetails={process.env.NODE_ENV === 'development'}
    onError={(error, errorInfo) => {
      // Log to error tracking service in production
      console.error('UserForm Error:', error, errorInfo);
    }}
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

// TODO: Once all components are created, uncomment the exports above
// and update the parent component to import from this index file

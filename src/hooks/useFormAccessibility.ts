import { useState, useRef, useCallback } from 'react';

interface ValidationError {
  field: string;
  message: string;
}

interface UseFormAccessibilityReturn {
  validationMessage: string;
  validationErrors: ValidationError[];
  firstErrorRef: React.RefObject<HTMLInputElement>;
  setValidationError: (field: string, message: string) => void;
  clearValidationErrors: () => void;
  announceValidation: (message: string) => void;
  focusFirstError: () => void;
  getFieldAriaProps: (fieldName: string, isRequired: boolean, hasError: boolean) => {
    'aria-label': string;
    'aria-required': string;
    'aria-invalid': string;
    'aria-describedby'?: string;
  };
}

/**
 * Hook for managing form accessibility features
 * Provides ARIA attributes, validation announcements, and focus management
 */
export function useFormAccessibility(): UseFormAccessibilityReturn {
  const [validationMessage, setValidationMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const firstErrorRef = useRef<HTMLInputElement>(null);

  const setValidationError = useCallback((field: string, message: string) => {
    setValidationErrors(prev => {
      const filtered = prev.filter(e => e.field !== field);
      return [...filtered, { field, message }];
    });
  }, []);

  const clearValidationErrors = useCallback(() => {
    setValidationErrors([]);
    setValidationMessage('');
  }, []);

  const announceValidation = useCallback((message: string) => {
    setValidationMessage(message);
    // Clear after announcement to allow re-announcement of same message
    setTimeout(() => setValidationMessage(''), 100);
  }, []);

  const focusFirstError = useCallback(() => {
    if (firstErrorRef.current) {
      firstErrorRef.current.focus();
    }
  }, []);

  const getFieldAriaProps = useCallback((
    fieldName: string,
    isRequired: boolean,
    hasError: boolean
  ) => {
    const errorId = `${fieldName}-error`;
    const error = validationErrors.find(e => e.field === fieldName);

    return {
      'aria-label': fieldName,
      'aria-required': isRequired ? 'true' : 'false',
      'aria-invalid': hasError ? 'true' : 'false',
      ...(error && { 'aria-describedby': errorId })
    };
  }, [validationErrors]);

  return {
    validationMessage,
    validationErrors,
    firstErrorRef,
    setValidationError,
    clearValidationErrors,
    announceValidation,
    focusFirstError,
    getFieldAriaProps
  };
}

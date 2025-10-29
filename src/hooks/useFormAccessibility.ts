import { useState, useRef, useCallback, useEffect } from 'react';

interface ValidationError {
  field: string;
  message: string;
}

/**
 * Converts camelCase or snake_case field names to human-readable labels
 * Examples: "firstName" -> "First Name", "barcode_number" -> "Barcode Number"
 */
function formatFieldLabel(fieldName: string): string {
  return fieldName
    // Handle snake_case: replace underscores with spaces
    .replace(/_/g, ' ')
    // Handle camelCase: insert space before capital letters
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Capitalize first letter of each word
    .replace(/\b\w/g, char => char.toUpperCase());
}

interface UseFormAccessibilityReturn {
  validationMessage: string;
  validationErrors: ValidationError[];
  firstErrorRef: React.RefObject<HTMLInputElement | null>;
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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    // Clear any existing timeout to prevent multiple timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setValidationMessage(message);
    // Clear after announcement to allow re-announcement of same message
    timeoutRef.current = setTimeout(() => {
      setValidationMessage('');
      timeoutRef.current = null;
    }, 100);
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
      'aria-label': formatFieldLabel(fieldName),
      'aria-required': isRequired ? 'true' : 'false',
      'aria-invalid': hasError ? 'true' : 'false',
      ...(error && { 'aria-describedby': errorId })
    };
  }, [validationErrors]);

  // Cleanup timeout on unmount to prevent state updates on unmounted component
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

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

/**
 * useUserFormValidation Hook
 * 
 * Provides validation logic for UserForm in both link and edit modes.
 * Returns structured validation results with field-specific errors.
 */

import { UserFormData, UserFormMode, User, ValidationError, ValidationResult, AppwriteAuthUser } from '../types';

/**
 * Validate form data in link mode
 * 
 * Requirements:
 * - Must have selected an auth user
 * - Must have selected a role
 */
const validateLinkMode = (
  formData: UserFormData,
  selectedAuthUser: AppwriteAuthUser | null
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Check if auth user is selected
  if (!selectedAuthUser) {
    errors.push({
      field: 'authUser',
      message: 'Please select a user to link',
    });
  }

  // Check if role is selected
  if (!formData.roleId) {
    errors.push({
      field: 'roleId',
      message: 'Please select a role for this user',
    });
  }

  return errors;
};

/**
 * Validate form data in edit mode
 * 
 * Requirements:
 * - Name must be provided
 * - Role must be selected
 * 
 * Note: Email is not validated in edit mode because it's disabled
 * Note: Password is not validated because UserForm doesn't create auth users
 */
const validateEditMode = (
  formData: UserFormData,
  user?: User | null
): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Check required fields
  if (!formData.name) {
    errors.push({
      field: 'name',
      message: 'Name is required',
    });
  }

  if (!formData.roleId) {
    errors.push({
      field: 'roleId',
      message: 'Please select a role for this user',
    });
  }

  // If both are missing, show general error
  if (!formData.name && !formData.roleId) {
    errors.push({
      field: 'general',
      message: 'Please fill in all required fields',
    });
  }

  return errors;
};

/**
 * Hook return type
 */
export interface UseUserFormValidationReturn {
  /** Validate form data based on mode */
  validate: (
    formData: UserFormData,
    mode: UserFormMode,
    user?: User | null,
    selectedAuthUser?: AppwriteAuthUser | null
  ) => ValidationResult;
}

/**
 * Custom hook for UserForm validation
 * 
 * @returns Validation function
 * 
 * @example
 * ```typescript
 * const { validate } = useUserFormValidation();
 * 
 * // Validate in link mode
 * const result = validate(formData, 'link', null, selectedAuthUser);
 * if (!result.isValid) {
 *   console.log('Errors:', result.errors);
 * }
 * 
 * // Validate in edit mode
 * const result = validate(formData, 'edit', user);
 * if (!result.isValid) {
 *   console.log('Errors:', result.errors);
 * }
 * ```
 */
export function useUserFormValidation(): UseUserFormValidationReturn {
  /**
   * Validate form data based on mode
   * 
   * @param formData - Form data to validate
   * @param mode - Operation mode ('link' or 'edit')
   * @param user - User being edited (edit mode only)
   * @param selectedAuthUser - Selected auth user (link mode only)
   * @returns Validation result with errors
   */
  const validate = (
    formData: UserFormData,
    mode: UserFormMode,
    user?: User | null,
    selectedAuthUser?: AppwriteAuthUser | null
  ): ValidationResult => {
    // Run appropriate validation based on mode
    const errors = mode === 'link'
      ? validateLinkMode(formData, selectedAuthUser || null)
      : validateEditMode(formData, user);

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  return { validate };
}

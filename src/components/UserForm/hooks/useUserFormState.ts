/**
 * useUserFormState Hook
 * 
 * Manages form state for the UserForm component using useReducer.
 * Handles initialization, updates, and resets based on mode and user data.
 * 
 * Refactored to use useReducer for better state management and predictability.
 */

import { useReducer, useEffect } from 'react';
import { UserFormData, User, UserFormMode } from '../types';

/**
 * Get initial form data based on user and mode
 */
const getInitialFormData = (
  user: User | null | undefined,
  mode: UserFormMode
): UserFormData => {
  // Edit mode: populate with existing user data
  if (user) {
    return {
      email: user.email,
      name: user.name || '',
      roleId: user.role?.id || undefined,
      authUserId: '',
      addToTeam: false,
    };
  }

  // Link mode: empty form with addToTeam defaulted based on mode
  return {
    email: '',
    name: '',
    roleId: undefined,
    authUserId: '',
    addToTeam: mode === 'link', // Default to true in link mode
  };
};

/**
 * Form action types for reducer
 * Using a generic type to ensure type safety between field and value
 */
type SetFieldAction<K extends keyof UserFormData = keyof UserFormData> = {
  type: 'SET_FIELD';
  field: K;
  value: UserFormData[K];
};

type FormAction =
  | SetFieldAction
  | { type: 'SET_FORM_DATA'; data: UserFormData }
  | { type: 'RESET_FORM'; user?: User | null; mode: UserFormMode };

/**
 * Form reducer for managing state updates
 * 
 * @param state - Current form state
 * @param action - Action to perform
 * @returns Updated form state
 */
function formReducer(state: UserFormData, action: FormAction): UserFormData {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };

    case 'SET_FORM_DATA':
      return action.data;

    case 'RESET_FORM':
      return getInitialFormData(action.user, action.mode);

    default:
      return state;
  }
}

/**
 * Hook return type
 */
export interface UseUserFormStateReturn {
  /** Current form data */
  formData: UserFormData;

  /** Update a single field with type-safe value */
  updateField: <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => void;

  /** Reset form to initial state */
  resetForm: () => void;

  /** Set entire form data (for advanced use cases) */
  setFormData: (data: UserFormData) => void;
}

/**
 * Custom hook for managing UserForm state with useReducer
 * 
 * Benefits of useReducer over useState:
 * - Predictable state updates through actions
 * - Easier to test reducer logic in isolation
 * - Better for complex state with multiple update patterns
 * - Clearer intent with named actions
 * 
 * @param user - User being edited (undefined for link mode)
 * @param mode - Operation mode ('link' or 'edit')
 * @param isOpen - Whether the dialog is open
 * @returns Form state and update functions
 * 
 * @example
 * ```typescript
 * const { formData, updateField, resetForm } = useUserFormState(user, 'edit', isOpen);
 * 
 * // Update a field
 * updateField('name', 'John Doe');
 * 
 * // Reset form
 * resetForm();
 * 
 * // Set entire form data
 * setFormData({ ...newData });
 * ```
 */
export function useUserFormState(
  user: User | null | undefined,
  mode: UserFormMode,
  isOpen: boolean
): UseUserFormStateReturn {
  const [formData, dispatch] = useReducer(
    formReducer,
    getInitialFormData(user, mode)
  );

  // Reset form when dialog opens/closes or user changes
  useEffect(() => {
    dispatch({ type: 'RESET_FORM', user, mode });
  }, [user, isOpen, mode]);

  /**
   * Update a single field in the form with type-safe value
   * 
   * @param field - Field name to update
   * @param value - New value for the field (type-checked against field type)
   */
  const updateField = <K extends keyof UserFormData>(field: K, value: UserFormData[K]) => {
    dispatch({ type: 'SET_FIELD', field, value });
  };

  /**
   * Reset form to initial state based on current user and mode
   */
  const resetForm = () => {
    dispatch({ type: 'RESET_FORM', user, mode });
  };

  /**
   * Set entire form data at once
   * Useful for bulk updates or when selecting an auth user
   * 
   * @param data - Complete form data object
   */
  const setFormData = (data: UserFormData) => {
    dispatch({ type: 'SET_FORM_DATA', data });
  };

  return {
    formData,
    updateField,
    resetForm,
    setFormData,
  };
}

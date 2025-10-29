import { useReducer, useEffect, useMemo, useCallback } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface CustomFieldValue {
  customFieldId: string;
  value: string;
}

interface CustomField {
  id: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: { uppercase?: boolean; options?: string[] };
  required: boolean;
  order: number;
}

interface Attendee {
  id?: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string;
  photoUrl?: string | null;
  customFieldValues?: CustomFieldValue[];
}

interface EventSettings {
  barcodeType?: string;
  barcodeLength?: number;
}

interface FormData {
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes: string;
  photoUrl: string;
  customFieldValues: Record<string, string>;
}

interface UseAttendeeFormProps {
  attendee?: Attendee;
  customFields: CustomField[];
  eventSettings?: EventSettings;
}

// Action types for the reducer
type FormAction =
  | { type: 'SET_FIELD'; field: keyof Omit<FormData, 'customFieldValues'>; value: string }
  | { type: 'SET_CUSTOM_FIELD'; fieldId: string; value: string }
  | { type: 'SET_PHOTO_URL'; url: string }
  | { type: 'REMOVE_PHOTO' }
  | { type: 'RESET_FORM' }
  | { type: 'INITIALIZE_FORM'; data: FormData }
  | { type: 'PRUNE_CUSTOM_FIELDS'; validFieldIds: Set<string> };

const initialFormState: FormData = {
  firstName: '',
  lastName: '',
  barcodeNumber: '',
  notes: '',
  photoUrl: '',
  customFieldValues: {}
};

function formReducer(state: FormData, action: FormAction): FormData {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    
    case 'SET_CUSTOM_FIELD':
      return {
        ...state,
        customFieldValues: {
          ...state.customFieldValues,
          [action.fieldId]: action.value
        }
      };
    
    case 'SET_PHOTO_URL':
      return { ...state, photoUrl: action.url };
    
    case 'REMOVE_PHOTO':
      return { ...state, photoUrl: '' };
    
    case 'RESET_FORM':
      return initialFormState;
    
    case 'INITIALIZE_FORM':
      return action.data;
    
    case 'PRUNE_CUSTOM_FIELDS': {
      const filteredCustomFieldValues = Object.entries(state.customFieldValues)
        .filter(([fieldId]) => action.validFieldIds.has(fieldId))
        .reduce((acc, [fieldId, value]) => {
          acc[fieldId] = value;
          return acc;
        }, {} as Record<string, string>);
      
      // Only update if something changed
      if (Object.keys(filteredCustomFieldValues).length !== Object.keys(state.customFieldValues).length) {
        return {
          ...state,
          customFieldValues: filteredCustomFieldValues
        };
      }
      return state;
    }
    
    default:
      return state;
  }
}

/**
 * Custom hook for managing attendee form state and operations
 * 
 * Provides form state management, validation, barcode generation, and data preparation
 * for creating or editing attendee records.
 * 
 * @param {UseAttendeeFormProps} props - Hook configuration
 * @param {Attendee} [props.attendee] - Existing attendee data for edit mode
 * @param {CustomField[]} props.customFields - Array of custom field definitions
 * @param {EventSettings} [props.eventSettings] - Event configuration including barcode settings
 * 
 * @returns {Object} Form state and operations
 * @returns {FormData} formData - Current form state
 * @returns {Function} updateField - Update a basic form field
 * @returns {Function} updateCustomField - Update a custom field value
 * @returns {Function} setPhotoUrl - Set the photo URL
 * @returns {Function} removePhoto - Remove the photo
 * @returns {Function} generateBarcode - Generate a unique barcode
 * @returns {Function} validateForm - Validate form data
 * @returns {Function} prepareAttendeeData - Prepare data for API submission
 * @returns {Function} resetForm - Reset form to initial state
 * 
 * @example
 * ```typescript
 * const {
 *   formData,
 *   updateField,
 *   validateForm,
 *   prepareAttendeeData
 * } = useAttendeeForm({ attendee, customFields, eventSettings });
 * ```
 */
export function useAttendeeForm({ attendee, customFields, eventSettings }: UseAttendeeFormProps) {
  const { error } = useSweetAlert();
  const [formData, dispatch] = useReducer(formReducer, initialFormState);

  const customFieldIds = useMemo(() =>
    customFields.map(cf => cf.id).join(','),
    [customFields]
  );

  // Memoized initialization logic
  const initializeFormData = useCallback(() => {
    if (attendee) {
      const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));
      const initialCustomFieldValues: Record<string, string> = {};

      if (Array.isArray(attendee.customFieldValues)) {
        attendee.customFieldValues.forEach((cfv: CustomFieldValue) => {
          if (currentCustomFieldIds.has(cfv.customFieldId)) {
            initialCustomFieldValues[cfv.customFieldId] = cfv.value;
          }
        });
      }

      customFields.forEach(field => {
        if (field.fieldType === 'boolean' && !initialCustomFieldValues[field.id]) {
          initialCustomFieldValues[field.id] = 'no';
        }
      });

      dispatch({
        type: 'INITIALIZE_FORM',
        data: {
          firstName: attendee.firstName || '',
          lastName: attendee.lastName || '',
          barcodeNumber: attendee.barcodeNumber || '',
          notes: attendee.notes || '',
          photoUrl: attendee.photoUrl || '',
          customFieldValues: initialCustomFieldValues
        }
      });
    } else {
      dispatch({ type: 'RESET_FORM' });
    }
  }, [attendee, customFields]);

  // Initialize/reset form when attendee or customFields changes
  useEffect(() => {
    initializeFormData();
  }, [initializeFormData]);

  // Prune deleted custom field values
  useEffect(() => {
    if (attendee) {
      const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));
      dispatch({ type: 'PRUNE_CUSTOM_FIELDS', validFieldIds: currentCustomFieldIds });
    }
  }, [customFieldIds, attendee, customFields]);

  /**
   * Generates a unique barcode for an attendee
   * 
   * Uses event settings to determine barcode type (numerical/alphanumeric) and length.
   * Checks for uniqueness against existing barcodes in the database.
   * 
   * @async
   * @throws {Error} If unable to generate unique barcode after max retries
   * 
   * @remarks
   * - Retries up to 10 times if barcode already exists
   * - Falls back to manual entry if generation fails
   * - Shows error message to user on failure
   */
  const generateBarcode = useCallback(async () => {
    if (!eventSettings) return;

    const barcodeType = eventSettings.barcodeType || 'alphanumeric';
    const barcodeLength = eventSettings.barcodeLength || 8;
    const maxRetries = 10;

    const generateRandomBarcode = () => {
      let barcode = '';
      if (barcodeType === 'numerical') {
        for (let i = 0; i < barcodeLength; i++) {
          barcode += Math.floor(Math.random() * 10);
        }
      } else {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        for (let i = 0; i < barcodeLength; i++) {
          barcode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      }
      return barcode;
    };

    const checkBarcodeUniqueness = async (barcode: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/attendees/check-barcode?barcode=${encodeURIComponent(barcode)}`);
        if (!response.ok) {
          console.error('Failed to check barcode uniqueness');
          return true;
        }
        const data = await response.json();
        return !data.exists;
      } catch (err) {
        console.error('Error checking barcode uniqueness:', err);
        return true;
      }
    };

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const barcode = generateRandomBarcode();
      const isUnique = await checkBarcodeUniqueness(barcode);
      
      if (isUnique) {
        dispatch({ type: 'SET_FIELD', field: 'barcodeNumber', value: barcode });
        return;
      }
    }

    error(
      "Barcode Generation Failed",
      `Unable to generate a unique barcode after ${maxRetries} attempts. Please try again or enter a barcode manually.`
    );
  }, [eventSettings, error]);

  /**
   * Validates form data including required fields and custom field requirements
   * 
   * Performs client-side validation for user experience. Also checks barcode uniqueness
   * against the database when barcode has changed.
   * 
   * @async
   * @param {Attendee} [attendee] - Existing attendee data (for edit mode)
   * @returns {Promise<boolean>} True if form passes client-side validation
   * 
   * @remarks
   * **SECURITY NOTE:** This is client-side validation for UX only and can be bypassed.
   * Server-side validation MUST be performed in the API handler.
   * Never trust client-side validation for security.
   * 
   * Validation checks:
   * - Required basic fields (firstName, lastName, barcodeNumber)
   * - Required custom fields
   * - Barcode uniqueness (only if barcode changed)
   */
  const validateForm = async (attendee?: Attendee) => {
    if (!formData.firstName || !formData.lastName || !formData.barcodeNumber) {
      error("Validation Error", "Please fill in all required fields.");
      return false;
    }

    for (const field of customFields) {
      if (field.required && !formData.customFieldValues[field.id]) {
        error("Validation Error", `${field.fieldName} is required.`);
        return false;
      }
    }

    if (!attendee || attendee.barcodeNumber !== formData.barcodeNumber) {
      try {
        const response = await fetch(`/api/attendees/check-barcode?barcode=${encodeURIComponent(formData.barcodeNumber)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.exists) {
            error("Validation Error", "This barcode number already exists. Please generate a new one or enter a different barcode.");
            return false;
          }
        }
      } catch (err) {
        console.error('Error checking barcode uniqueness:', err);
      }
    }

    return true;
  };

  /**
   * Prepares attendee data for API submission
   * 
   * Converts form state into the format expected by the API, including
   * transforming custom field values from object to array format.
   * 
   * @returns {Attendee} Formatted attendee object ready for API submission
   * 
   * @remarks
   * - Converts custom field values from Record<string, string> to CustomFieldValue[]
   * - Ensures all required fields are present
   * - Handles null/undefined values appropriately
   * - Empty strings are preserved for notes, converted to null for photoUrl
   */
  const prepareAttendeeData = () => {
    const customFieldValues = Object.entries(formData.customFieldValues)
      .map(([customFieldId, value]) => ({
        customFieldId,
        value: value || ''
      }));

    return {
      firstName: formData.firstName,
      lastName: formData.lastName,
      barcodeNumber: formData.barcodeNumber,
      notes: formData.notes || '',
      photoUrl: formData.photoUrl || null,
      customFieldValues
    };
  };

  const resetForm = () => {
    dispatch({ type: 'RESET_FORM' });
  };

  // Expose dispatch with typed actions for component use
  const updateField = useCallback((field: keyof Omit<FormData, 'customFieldValues'>, value: string) => {
    dispatch({ type: 'SET_FIELD', field, value });
  }, []);

  const updateCustomField = useCallback((fieldId: string, value: string) => {
    dispatch({ type: 'SET_CUSTOM_FIELD', fieldId, value });
  }, []);

  const setPhotoUrl = useCallback((url: string) => {
    dispatch({ type: 'SET_PHOTO_URL', url });
  }, []);

  const removePhoto = useCallback(() => {
    dispatch({ type: 'REMOVE_PHOTO' });
  }, []);

  return {
    formData,
    updateField,
    updateCustomField,
    setPhotoUrl,
    removePhoto,
    generateBarcode,
    validateForm,
    prepareAttendeeData,
    resetForm
  };
}

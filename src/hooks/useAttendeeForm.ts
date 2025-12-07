import { useCallback, useEffect, useReducer } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { FORM_LIMITS } from '@/constants/formLimits';

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
  // Access control fields
  validFrom?: string | null;
  validUntil?: string | null;
  accessEnabled?: boolean;
}

interface EventSettings {
  barcodeType?: string;
  barcodeLength?: number;
  // Access control settings
  accessControlEnabled?: boolean;
  accessControlTimeMode?: 'date_only' | 'date_time';
  timeZone?: string;
  accessControlDefaults?: {
    accessEnabled?: boolean;
    validFrom?: string | null;
    validUntil?: string | null;
    validFromUseToday?: boolean;
  };
}

interface FormData {
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes: string;
  photoUrl: string;
  customFieldValues: Record<string, string>;
  // Access control fields
  validFrom: string;
  validUntil: string;
  accessEnabled: boolean;
}

interface UseAttendeeFormProps {
  attendee?: Attendee;
  customFields: CustomField[];
  eventSettings?: EventSettings;
}

// Action types for the reducer
type FormAction =
  | { type: 'SET_FIELD'; field: keyof Omit<FormData, 'customFieldValues'>; value: string | boolean }
  | { type: 'SET_CUSTOM_FIELD'; fieldId: string; value: string }
  | { type: 'SET_PHOTO_URL'; url: string }
  | { type: 'REMOVE_PHOTO' }
  | { type: 'RESET_FORM'; eventSettings?: EventSettings; customFields?: CustomField[] }
  | { type: 'INITIALIZE_FORM'; data: FormData }
  | { type: 'PRUNE_CUSTOM_FIELDS'; validFieldIds: Set<string> };

const getInitialFormState = (eventSettings?: EventSettings, customFields: CustomField[] = []): FormData => {
  // Apply access control defaults if enabled
  let accessEnabled = true; // Default to active
  let validFrom = '';
  let validUntil = '';

  // Check if access control is enabled and defaults are available
  const defaults = eventSettings?.accessControlDefaults;
  const shouldApplyDefaults = !!(eventSettings?.accessControlEnabled && defaults);

  if (shouldApplyDefaults) {
    // Apply default access status
    if (defaults.accessEnabled !== undefined) {
      accessEnabled = defaults.accessEnabled;
    }

    // Apply default validFrom
    if (defaults.validFromUseToday) {
      // Use today's date in local timezone
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      if (eventSettings.accessControlTimeMode === 'date_time') {
        // For date_time mode, use current date and time in local timezone
        const hours = String(today.getHours()).padStart(2, '0');
        const minutes = String(today.getMinutes()).padStart(2, '0');
        validFrom = `${dateStr}T${hours}:${minutes}`; // Format: YYYY-MM-DDTHH:mm
      } else {
        // For date_only mode, use just the date
        validFrom = dateStr; // Format: YYYY-MM-DD
      }
    } else if (defaults.validFrom) {
      validFrom = defaults.validFrom;
    }

    // Apply default validUntil
    if (defaults.validUntil) {
      validUntil = defaults.validUntil;
    }
  }

  // Initialize custom field values with boolean defaults
  const customFieldValues: Record<string, string> = {};
  customFields.forEach(field => {
    if (field.fieldType === 'boolean') {
      customFieldValues[field.id] = 'no';
    }
  });

  return {
    firstName: '',
    lastName: '',
    barcodeNumber: '',
    notes: '',
    photoUrl: '',
    customFieldValues,
    validFrom,
    validUntil,
    accessEnabled,
  };
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
          [action.fieldId]: action.value,
        },
      };

    case 'SET_PHOTO_URL':
      return { ...state, photoUrl: action.url };

    case 'REMOVE_PHOTO':
      return { ...state, photoUrl: '' };

    case 'RESET_FORM':
      return getInitialFormState(action.eventSettings, action.customFields);

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
          customFieldValues: filteredCustomFieldValues,
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
  const [formData, dispatch] = useReducer(formReducer, getInitialFormState(eventSettings, customFields));

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

      // CRITICAL: Boolean custom fields default to 'no' (NOT 'false')
      // Boolean format: 'yes'/'no' (never 'true'/'false')
      // This ensures consistency across the application and Switchboard integration
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
          customFieldValues: initialCustomFieldValues,
          // Access control fields from existing attendee
          validFrom: attendee.validFrom || '',
          validUntil: attendee.validUntil || '',
          accessEnabled: attendee.accessEnabled !== undefined ? attendee.accessEnabled : true,
        },
      });
    } else {
      // New attendee - apply defaults from event settings
      dispatch({ type: 'RESET_FORM', eventSettings, customFields });
    }
  }, [attendee, customFields, eventSettings]);

  // Initialize/reset form when attendee, customFields, or eventSettings changes
  useEffect(() => {
    initializeFormData();
  }, [initializeFormData]);

  // Prune deleted custom field values
  useEffect(() => {
    if (attendee) {
      const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));
      dispatch({ type: 'PRUNE_CUSTOM_FIELDS', validFieldIds: currentCustomFieldIds });
    }
  }, [attendee, customFields]);

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
   * - Retries up to BARCODE_GENERATION_MAX_ATTEMPTS times if barcode already exists
   * - Falls back to manual entry if generation fails
   * - Shows error message to user on failure
   */
  const generateBarcode = useCallback(async () => {
    if (!eventSettings) return;

    const barcodeType = eventSettings.barcodeType || 'alphanumeric';
    const barcodeLength = eventSettings.barcodeLength || FORM_LIMITS.BARCODE_LENGTH_DEFAULT;
    const maxRetries = FORM_LIMITS.BARCODE_GENERATION_MAX_ATTEMPTS;

    /**
     * Generate cryptographically secure random barcode
     * Uses Web Crypto API for unbiased random generation
     */
    const generateRandomBarcode = () => {
      const charset = barcodeType === 'numerical'
        ? '0123456789'
        : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

      const charsetLength = charset.length;
      let barcode = '';

      // Generate random bytes using Web Crypto API
      const randomBytes = new Uint8Array(barcodeLength * 2); // Extra bytes for rejection sampling

      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        // Browser environment
        window.crypto.getRandomValues(randomBytes);
      } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
        // Node.js 15+ with Web Crypto API
        globalThis.crypto.getRandomValues(randomBytes);
      } else {
        // Fallback to Math.random (should not happen in modern environments)
        console.warn('Crypto API not available, falling back to Math.random');
        for (let i = 0; i < barcodeLength; i+=1) {
          barcode += charset.charAt(Math.floor(Math.random() * charsetLength));
        }
        return barcode;
      }

      // Use rejection sampling to avoid modulo bias
      let byteIndex = 0;
      for (let i = 0; i < barcodeLength; i+=1) {
        // Find a random byte that doesn't cause modulo bias
        let randomValue;
        do {
          if (byteIndex >= randomBytes.length) {
            // Need more random bytes
            if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
              window.crypto.getRandomValues(randomBytes);
            } else if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
              globalThis.crypto.getRandomValues(randomBytes);
            }
            byteIndex = 0;
          }
          randomValue = randomBytes[byteIndex++];
        } while (randomValue >= 256 - (256 % charsetLength)); // Reject biased values

        barcode += charset.charAt(randomValue % charsetLength);
      }

      return barcode;
    };

    const checkBarcodeUniqueness = async (barcode: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/attendees/check-barcode?barcode=${encodeURIComponent(barcode)}`);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Barcode uniqueness check failed:', response.status, errorText);
          error('Failed to verify barcode uniqueness. Please try again.');
          return false; // Treat server errors as not unique to prevent duplicates
        }
        const data = await response.json();
        return !data.exists;
      } catch (err) {
        console.error('Error checking barcode uniqueness:', err);
        error('Network error while checking barcode uniqueness. Please check your connection and try again.');
        return false; // Treat network errors as not unique to prevent duplicates
      }
    };

    for (let attempt = 0; attempt < maxRetries; attempt+=1) {
      const barcode = generateRandomBarcode();
      const isUnique = await checkBarcodeUniqueness(barcode);

      if (isUnique) {
        dispatch({ type: 'SET_FIELD', field: 'barcodeNumber', value: barcode });
        return;
      }
    }

    error(
      "Barcode Generation Failed",
      `Unable to generate a unique barcode after ${maxRetries} attempts. Please try again or enter a barcode manually.`,
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
        } else {
          const errorText = await response.text();
          console.error('Barcode uniqueness check failed:', response.status, errorText);
          error("Validation Error", "Unable to verify barcode uniqueness. Please try again.");
          return false;
        }
      } catch (err) {
        console.error('Error checking barcode uniqueness:', err);
        error("Validation Error", "Unable to verify barcode uniqueness. Please try again.");
        return false;
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
        value: value || '',
      }));

    return {
      firstName: formData.firstName,
      lastName: formData.lastName,
      barcodeNumber: formData.barcodeNumber,
      notes: formData.notes || '',
      photoUrl: formData.photoUrl || null,
      customFieldValues,
      // Access control fields
      validFrom: formData.validFrom || null,
      validUntil: formData.validUntil || null,
      accessEnabled: formData.accessEnabled,
    };
  };

  const resetForm = useCallback(() => {
    dispatch({ type: 'RESET_FORM', eventSettings, customFields });
  }, [eventSettings, customFields]);

  // Expose dispatch with typed actions for component use
  const updateField = useCallback((field: keyof Omit<FormData, 'customFieldValues'>, value: string | boolean) => {
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
    resetForm,
  };
}

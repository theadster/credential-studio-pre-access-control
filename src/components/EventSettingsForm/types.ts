// EventSettingsForm Types
// Extracted from monolithic component for better type safety and reusability

/**
 * Field options for select-type fields
 */
export interface SelectFieldOptions {
  /** Array of option values for select dropdown */
  options: string[];
}

/**
 * Field options for text-type fields
 */
export interface TextFieldOptions {
  /** Whether to force text to uppercase */
  uppercase?: boolean;
}

/**
 * Union type for all field option types
 * Different field types use different option structures
 */
export type FieldOptions = SelectFieldOptions | TextFieldOptions;

export interface CustomField {
  id?: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: FieldOptions;
  required: boolean;
  order: number;
  showOnMainPage?: boolean;
  printable?: boolean;
  /** Default value for this field when creating new attendees or importing */
  defaultValue?: string;
}

export interface FieldMapping {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  jsonVariable: string;
  valueMapping?: { [key: string]: string };
}

/**
 * Time mode for access control date interpretation
 * - 'date_only': Validity interpreted as full days (12:00 AM start, 11:59 PM end)
 * - 'date_time': Validity interpreted with exact timestamps down to the minute
 */
export type AccessControlTimeMode = 'date_only' | 'date_time';

export interface EventSettings {
  id?: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: string;
  timeZone: string;
  barcodeType: string;
  barcodeLength: number;
  barcodeUnique: boolean;
  forceFirstNameUppercase?: boolean;
  forceLastNameUppercase?: boolean;
  attendeeSortField?: string;
  attendeeSortDirection?: string;
  customFieldColumns?: number;
  /** Whether access control is enabled for this event */
  accessControlEnabled?: boolean;
  /** Time mode for access control date interpretation */
  accessControlTimeMode?: AccessControlTimeMode;
  /** Default access control values for new attendees */
  accessControlDefaults?: {
    /** Default access status (true = active, false = inactive) */
    accessEnabled?: boolean;
    /** Default Valid From date/datetime */
    validFrom?: string | null;
    /** Default Valid Until date/datetime */
    validUntil?: string | null;
    /** Whether to use today's date for Valid From (overrides validFrom) */
    validFromUseToday?: boolean;
  };
  /** 
   * 4-digit numerical passcode for mobile app settings protection.
   * When set, the mobile app will require this passcode to access the settings menu.
   * Set to null to disable passcode protection.
   */
  mobileSettingsPasscode?: string | null;
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryAutoOptimize?: boolean;
  cloudinaryGenerateThumbnails?: boolean;
  cloudinaryDisableSkipCrop?: boolean;
  cloudinaryCropAspectRatio?: string;
  switchboardEnabled?: boolean;
  switchboardApiEndpoint?: string;
  switchboardAuthHeaderType?: string;
  switchboardRequestBody?: string;
  switchboardTemplateId?: string;
  switchboardFieldMappings?: FieldMapping[];
  oneSimpleApiEnabled?: boolean;
  oneSimpleApiUrl?: string;
  oneSimpleApiFormDataKey?: string;
  oneSimpleApiFormDataValue?: string;
  oneSimpleApiRecordTemplate?: string;
  bannerImageUrl?: string | null;
  signInBannerUrl?: string | null;
  customFields?: CustomField[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IntegrationStatus {
  cloudinary: boolean;
  switchboard: boolean;
}

export interface EventSettingsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: EventSettings) => Promise<void>;
  eventSettings: EventSettings | null;
}

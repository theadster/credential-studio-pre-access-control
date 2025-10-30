// EventSettingsForm Types
// Extracted from monolithic component for better type safety and reusability

export interface CustomField {
  id?: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: any;
  required: boolean;
  order: number;
  showOnMainPage?: boolean;
  printable?: boolean;
}

export interface FieldMapping {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  jsonVariable: string;
  valueMapping?: { [key: string]: string };
}

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

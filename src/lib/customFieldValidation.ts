import { EventSettingsWithIntegrations } from './appwrite-integrations';

interface CustomFieldDependency {
  type: 'switchboard_template' | 'switchboard_mapping' | 'onesimpleapi_template' | 'onesimpleapi_record';
  location: string;
  fieldName: string;
  internalFieldName: string;
}

// Type for legacy event settings format (used in forms before saving)
interface LegacyEventSettings {
  switchboardRequestBody?: string;
  switchboardFieldMappings?: Array<{ fieldId: string }>;
  oneSimpleApiFormDataValue?: string;
  oneSimpleApiRecordTemplate?: string;
}

// Union type that accepts both formats
type EventSettingsInput = EventSettingsWithIntegrations | LegacyEventSettings;

export function findCustomFieldDependencies(
  fieldId: string,
  fieldName: string,
  internalFieldName: string,
  eventSettings: EventSettingsInput
): CustomFieldDependency[] {
  const dependencies: CustomFieldDependency[] = [];
  const placeholder = `{{${internalFieldName}}}`;

  // Type guard to check if this is EventSettingsWithIntegrations
  // Check for multiple distinctive properties to accurately discriminate from legacy settings
  const hasIntegrations = (settings: EventSettingsInput): settings is EventSettingsWithIntegrations => {
    if (typeof settings !== 'object' || settings === null || !('$id' in settings)) {
      return false;
    }

    // Verify it has core EventSettings properties that legacy settings wouldn't have
    const hasEventSettingsShape =
      'eventName' in settings && typeof (settings as any).eventName === 'string' &&
      'barcodeType' in settings && typeof (settings as any).barcodeType === 'string';

    // Check if integration objects (if present) have the expected Appwrite document shape
    const hasValidIntegrationShape =
      (!('switchboard' in settings) ||
        (typeof (settings as any).switchboard === 'object' &&
          (settings as any).switchboard !== null &&
          '$id' in (settings as any).switchboard &&
          'version' in (settings as any).switchboard)) &&
      (!('oneSimpleApi' in settings) ||
        (typeof (settings as any).oneSimpleApi === 'object' &&
          (settings as any).oneSimpleApi !== null &&
          '$id' in (settings as any).oneSimpleApi &&
          'version' in (settings as any).oneSimpleApi));

    return hasEventSettingsShape && hasValidIntegrationShape;
  };

  // Check Switchboard Canvas request body
  // Support both new format (eventSettings.switchboard.requestBody) and legacy format (eventSettings.switchboardRequestBody)
  const switchboardRequestBody = hasIntegrations(eventSettings)
    ? eventSettings.switchboard?.requestBody
    : (eventSettings as LegacyEventSettings).switchboardRequestBody;

  if (switchboardRequestBody && typeof switchboardRequestBody === 'string' && switchboardRequestBody.includes(placeholder)) {
    dependencies.push({
      type: 'switchboard_template',
      location: 'Switchboard Canvas Request Body',
      fieldName,
      internalFieldName
    });
  }

  // Check Switchboard Canvas field mappings
  // Support both new format (eventSettings.switchboard.fieldMappings as JSON string) and legacy format (eventSettings.switchboardFieldMappings as array)
  let switchboardFieldMappings: unknown = null;

  if (hasIntegrations(eventSettings) && eventSettings.switchboard?.fieldMappings) {
    try {
      switchboardFieldMappings = JSON.parse(eventSettings.switchboard.fieldMappings);
    } catch (error) {
      console.error('Failed to parse switchboard field mappings:', error);
    }
  } else {
    switchboardFieldMappings = (eventSettings as LegacyEventSettings).switchboardFieldMappings;
  }

  if (Array.isArray(switchboardFieldMappings)) {
    const hasMapping = switchboardFieldMappings.some((mapping: unknown) => {
      return typeof mapping === 'object' && mapping !== null && 'fieldId' in mapping && mapping.fieldId === fieldId;
    });
    if (hasMapping) {
      dependencies.push({
        type: 'switchboard_mapping',
        location: 'Switchboard Canvas Field Mappings',
        fieldName,
        internalFieldName
      });
    }
  }

  // Check OneSimpleAPI form data value
  const oneSimpleApiFormDataValue = hasIntegrations(eventSettings)
    ? eventSettings.oneSimpleApi?.formDataValue
    : (eventSettings as LegacyEventSettings).oneSimpleApiFormDataValue;

  if (oneSimpleApiFormDataValue && typeof oneSimpleApiFormDataValue === 'string' && oneSimpleApiFormDataValue.includes(placeholder)) {
    dependencies.push({
      type: 'onesimpleapi_template',
      location: 'OneSimpleAPI Form Data Template',
      fieldName,
      internalFieldName
    });
  }

  // Check OneSimpleAPI record template
  const oneSimpleApiRecordTemplate = hasIntegrations(eventSettings)
    ? eventSettings.oneSimpleApi?.recordTemplate
    : (eventSettings as LegacyEventSettings).oneSimpleApiRecordTemplate;

  if (oneSimpleApiRecordTemplate && typeof oneSimpleApiRecordTemplate === 'string' && oneSimpleApiRecordTemplate.includes(placeholder)) {
    dependencies.push({
      type: 'onesimpleapi_record',
      location: 'OneSimpleAPI Record Template',
      fieldName,
      internalFieldName
    });
  }

  return dependencies;
}

export function validateCustomFieldDeletion(
  fieldId: string,
  fieldName: string,
  internalFieldName: string,
  eventSettings: EventSettingsInput
): { canDelete: boolean; dependencies: CustomFieldDependency[]; warnings: string[] } {
  const dependencies = findCustomFieldDependencies(fieldId, fieldName, internalFieldName, eventSettings);
  const warnings: string[] = [];

  if (dependencies.length > 0) {
    warnings.push(`This field is referenced in ${dependencies.length} integration(s):`);
    dependencies.forEach(dep => {
      warnings.push(`• ${dep.location}`);
    });
    warnings.push('Deleting this field will remove these references and may cause integration errors.');
  }

  return {
    canDelete: true, // Allow deletion but show warnings
    dependencies,
    warnings
  };
}
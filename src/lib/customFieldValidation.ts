import { EventSettingsWithIntegrations } from './appwrite-integrations';

interface CustomFieldDependency {
  type: 'switchboard_template' | 'switchboard_mapping' | 'onesimpleapi_template' | 'onesimpleapi_record';
  location: string;
  fieldName: string;
  internalFieldName: string;
}

export function findCustomFieldDependencies(
  fieldId: string,
  fieldName: string,
  internalFieldName: string,
  eventSettings: EventSettingsWithIntegrations | any
): CustomFieldDependency[] {
  const dependencies: CustomFieldDependency[] = [];
  const placeholder = `{{${internalFieldName}}}`;

  // Check Switchboard Canvas request body
  const switchboardRequestBody = eventSettings.switchboard?.requestBody || eventSettings.switchboardRequestBody;
  if (switchboardRequestBody && switchboardRequestBody.includes(placeholder)) {
    dependencies.push({
      type: 'switchboard_template',
      location: 'Switchboard Canvas Request Body',
      fieldName,
      internalFieldName
    });
  }

  // Check Switchboard Canvas field mappings
  const switchboardFieldMappings = eventSettings.switchboard?.fieldMappings 
    ? JSON.parse(eventSettings.switchboard.fieldMappings)
    : eventSettings.switchboardFieldMappings;
    
  if (switchboardFieldMappings && Array.isArray(switchboardFieldMappings)) {
    const hasMapping = switchboardFieldMappings.some((mapping: any) => mapping.fieldId === fieldId);
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
  const oneSimpleApiFormDataValue = eventSettings.oneSimpleApi?.formDataValue || eventSettings.oneSimpleApiFormDataValue;
  if (oneSimpleApiFormDataValue && oneSimpleApiFormDataValue.includes(placeholder)) {
    dependencies.push({
      type: 'onesimpleapi_template',
      location: 'OneSimpleAPI Form Data Template',
      fieldName,
      internalFieldName
    });
  }

  // Check OneSimpleAPI record template
  const oneSimpleApiRecordTemplate = eventSettings.oneSimpleApi?.recordTemplate || eventSettings.oneSimpleApiRecordTemplate;
  if (oneSimpleApiRecordTemplate && oneSimpleApiRecordTemplate.includes(placeholder)) {
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
  eventSettings: EventSettingsWithIntegrations | any
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
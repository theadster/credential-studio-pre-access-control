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
  eventSettings: any
): CustomFieldDependency[] {
  const dependencies: CustomFieldDependency[] = [];
  const placeholder = `{{${internalFieldName}}}`;

  // Check Switchboard Canvas request body
  if (eventSettings.switchboardRequestBody && eventSettings.switchboardRequestBody.includes(placeholder)) {
    dependencies.push({
      type: 'switchboard_template',
      location: 'Switchboard Canvas Request Body',
      fieldName,
      internalFieldName
    });
  }

  // Check Switchboard Canvas field mappings
  if (eventSettings.switchboardFieldMappings && Array.isArray(eventSettings.switchboardFieldMappings)) {
    const hasMapping = eventSettings.switchboardFieldMappings.some((mapping: any) => mapping.fieldId === fieldId);
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
  if (eventSettings.oneSimpleApiFormDataValue && eventSettings.oneSimpleApiFormDataValue.includes(placeholder)) {
    dependencies.push({
      type: 'onesimpleapi_template',
      location: 'OneSimpleAPI Form Data Template',
      fieldName,
      internalFieldName
    });
  }

  // Check OneSimpleAPI record template
  if (eventSettings.oneSimpleApiRecordTemplate && eventSettings.oneSimpleApiRecordTemplate.includes(placeholder)) {
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
  eventSettings: any
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
// CustomFieldPlaceholders Component
// Reusable component for displaying custom field placeholders in template documentation

import { CustomField } from './types';

interface CustomFieldPlaceholdersProps {
  customFields: CustomField[];
  labelClass: string;
  listClass: string;
  codeBgClass: string;
}

export function CustomFieldPlaceholders({
  customFields,
  labelClass,
  listClass,
  codeBgClass
}: CustomFieldPlaceholdersProps) {
  if (customFields.length === 0) {
    return null;
  }

  return (
    <div>
      <p className={`font-medium ${labelClass} text-xs mb-1`}>Custom Fields:</p>
      <ul className={`space-y-1 ${listClass}`}>
        {customFields.map((field) => (
          <li key={field.id}>
            <code className={`${codeBgClass} px-1 rounded-sm`}>
              {`{{${field.internalFieldName || field.fieldName}}}`}
            </code>
            <span className="text-xs ml-1 opacity-75">({field.fieldType})</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

import React from 'react';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getCustomFieldIcon } from '@/utils/customFieldIcons';
import { CustomFieldInput } from './CustomFieldInput';

interface CustomFieldOptions {
  uppercase?: boolean;
  options?: string[];
}

interface CustomField {
  id: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: CustomFieldOptions;
  required: boolean;
  order: number;
}

interface CustomFieldsSectionProps {
  customFields: CustomField[];
  values: Record<string, string>;
  onChange: (fieldId: string, value: string) => void;
}



export function CustomFieldsSection({ customFields, values, onChange }: CustomFieldsSectionProps) {
  const visibleFields = customFields.filter(f => f.internalFieldName !== 'notes');

  if (visibleFields.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Additional Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {visibleFields
            .sort((a, b) => a.order - b.order)
            .map((field) => (
              <div
                key={field.id}
                className={`space-y-2 ${field.fieldType === 'textarea' ? 'col-span-2' : ''}`}
              >
                <Label htmlFor={field.id} className="flex items-center gap-2">
                  {getCustomFieldIcon(field.fieldType)}
                  {field.fieldName}
                  {field.required && ' *'}
                </Label>
                <CustomFieldInput
                  field={field}
                  value={values[field.id] || ''}
                  onChange={(value) => onChange(field.id, value)}
                />
              </div>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

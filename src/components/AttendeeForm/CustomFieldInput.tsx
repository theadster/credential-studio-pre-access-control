import React, { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { sanitizeInput, sanitizeEmail, sanitizeUrl, sanitizeNotes } from '@/lib/sanitization';

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

interface CustomFieldInputProps {
  field: CustomField;
  value: string;
  onChange: (value: string) => void;
}

/**
 * Memoized custom field input component to prevent unnecessary re-renders.
 * Each field type is handled with appropriate sanitization and validation.
 */
export const CustomFieldInput = memo(function CustomFieldInput({
  field,
  value,
  onChange
}: CustomFieldInputProps) {
  switch (field.fieldType) {
    case 'text':
      return (
        <Input
          value={value}
          onChange={(e) => {
            const sanitized = sanitizeInput(e.target.value);
            const processed = field.fieldOptions?.uppercase 
              ? sanitized.toUpperCase() 
              : sanitized;
            onChange(processed);
          }}
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(e) => {
            const sanitized = sanitizeInput(e.target.value);
            onChange(sanitized);
          }}
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
        />
      );

    case 'email':
      return (
        <Input
          type="email"
          value={value}
          onChange={(e) => {
            const sanitized = sanitizeEmail(e.target.value);
            onChange(sanitized);
          }}
          placeholder="Enter email address"
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
        />
      );

    case 'url':
      return (
        <Input
          type="url"
          value={value}
          onChange={(e) => {
            const sanitized = sanitizeUrl(e.target.value);
            onChange(sanitized);
          }}
          placeholder="https://example.com"
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
        />
      );

    case 'select':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label={field.fieldName} aria-required={field.required}>
            <SelectValue placeholder={`Select ${field.fieldName}`} />
          </SelectTrigger>
          <SelectContent>
            {field.fieldOptions?.options?.map((option: string, index: number) => (
              <SelectItem key={index} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );

    case 'checkbox':
      return (
        <div className="flex items-center space-x-2">
          <Checkbox
            checked={value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'true' : 'false')}
            aria-label={field.fieldName}
          />
          <Label>{field.fieldName}</Label>
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value === 'yes'}
            onCheckedChange={(checked) => onChange(checked ? 'yes' : 'no')}
            aria-label={field.fieldName}
          />
          <Label>{value === 'yes' ? 'Yes' : 'No'}</Label>
        </div>
      );

    default:
      return (
        <Textarea
          value={value}
          onChange={(e) => {
            const sanitized = sanitizeNotes(e.target.value);
            onChange(sanitized);
          }}
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
        />
      );
  }
});

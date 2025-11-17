/**
 * Custom Field Input Component
 * 
 * CRITICAL BOOLEAN FIELD FORMAT:
 * Boolean custom fields MUST use 'yes'/'no' format (NOT 'true'/'false')
 * - Default value: 'no'
 * - Checked state: 'yes'
 * - Unchecked state: 'no'
 * 
 * DO NOT change boolean format to 'true'/'false' - it will:
 * - Corrupt database data
 * - Break Switchboard integration field mappings
 * - Break import/export functionality
 * - Break bulk edit operations
 * - Cause inconsistencies across the application
 * 
 * See: docs/fixes/BOOLEAN_FIELD_DATA_CORRUPTION_FIX.md
 */

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
 * Custom comparison function for React.memo optimization.
 * 
 * Only re-renders when field identity, value, or onChange reference changes.
 * This prevents unnecessary re-renders when parent components update unrelated state.
 * 
 * @param prevProps - Previous props
 * @param nextProps - Next props
 * @returns true if props are equal (skip re-render), false if different (re-render)
 */
function arePropsEqual(
  prevProps: CustomFieldInputProps,
  nextProps: CustomFieldInputProps
): boolean {
  // Compare field identity (id is the unique identifier)
  if (prevProps.field.id !== nextProps.field.id) {
    return false;
  }

  // Compare field type (affects which input component renders)
  if (prevProps.field.fieldType !== nextProps.field.fieldType) {
    return false;
  }

  // Compare required flag (affects validation)
  if (prevProps.field.required !== nextProps.field.required) {
    return false;
  }

  // Compare field options (affects behavior like uppercase, dropdown options)
  const prevOptions = prevProps.field.fieldOptions;
  const nextOptions = nextProps.field.fieldOptions;

  if (prevOptions?.uppercase !== nextOptions?.uppercase) {
    return false;
  }

  // For select fields, compare options array
  if (prevProps.field.fieldType === 'select') {
    const prevSelectOptions = prevOptions?.options;
    const nextSelectOptions = nextOptions?.options;

    if (prevSelectOptions?.length !== nextSelectOptions?.length) {
      return false;
    }

    if (prevSelectOptions && nextSelectOptions) {
      for (let i = 0; i < prevSelectOptions.length; i++) {
        if (prevSelectOptions[i] !== nextSelectOptions[i]) {
          return false;
        }
      }
    }
  }

  // Compare value (the actual input value)
  if (prevProps.value !== nextProps.value) {
    return false;
  }

  // Compare onChange by reference
  // If parent wraps onChange with useCallback, this prevents unnecessary re-renders
  if (prevProps.onChange !== nextProps.onChange) {
    return false;
  }

  // All relevant props are equal - skip re-render
  return true;
}

/**
 * Memoized custom field input component to prevent unnecessary re-renders.
 * Each field type is handled with appropriate sanitization and validation.
 * 
 * Uses custom comparison (arePropsEqual) to optimize re-renders by only comparing
 * relevant field properties, value, and onChange reference.
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
          autoComplete="off"
          data-form-type="other"
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
          autoComplete="off"
          data-form-type="other"
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
          autoComplete="off"
          data-form-type="other"
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
          autoComplete="off"
          data-form-type="other"
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(e) => {
            const rawValue = e.target.value.trim();

            // If empty, pass empty string
            if (!rawValue) {
              onChange('');
              return;
            }

            // Validate YYYY-MM-DD format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(rawValue)) {
              onChange('');
              return;
            }

            // Validate it's a real date
            const date = new Date(rawValue);
            if (isNaN(date.getTime())) {
              onChange('');
              return;
            }

            // Pass the normalized ISO date string
            onChange(rawValue);
          }}
          required={field.required}
          aria-label={field.fieldName}
          aria-required={field.required}
          autoComplete="off"
          data-form-type="other"
        />
      );

    case 'select':
      return (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger aria-label={field.fieldName} aria-required={field.required}>
            <SelectValue placeholder={`Select ${field.fieldName}`} />
          </SelectTrigger>
          <SelectContent>
            {!field.fieldOptions?.options || field.fieldOptions.options.length === 0 ? (
              <SelectItem value="" disabled>
                No options available
              </SelectItem>
            ) : (
              field.fieldOptions.options.map((option: string, index: number) => (
                <SelectItem key={`${option}-${index}`} value={option}>
                  {option}
                </SelectItem>
              ))
            )}
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
      // CRITICAL: Boolean custom fields MUST use 'yes'/'no' format (NOT 'true'/'false')
      // - Default value: 'no'
      // - Checked state: 'yes'
      // - Unchecked state: 'no'
      // This format is required for:
      // - Database consistency
      // - Switchboard integration field mappings
      // - Import/export functionality
      // - Bulk edit operations
      // DO NOT change to 'true'/'false' - it will corrupt data and break integrations
      //
      // GRACEFUL HANDLING: For display/editing, accept both 'yes' and 'true' as checked
      // to handle any legacy values, but ALWAYS save as 'yes'/'no'
      return (
        <div className="flex items-center space-x-2">
          <Switch
            checked={value === 'yes' || value === 'true'}
            onCheckedChange={(checked) => onChange(checked ? 'yes' : 'no')}
            aria-label={field.fieldName}
          />
          <Label>{(value === 'yes' || value === 'true') ? 'Yes' : 'No'}</Label>
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
          autoComplete="off"
          data-form-type="other"
        />
      );
  }
}, arePropsEqual);

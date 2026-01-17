/**
 * CustomFieldsSection Component
 *
 * Filter section for custom fields defined in event settings.
 * Handles text, select, multi-select, and boolean field types.
 * Uses integrated filter inputs with operator selector inside the input container.
 *
 * Requirements:
 * - 1.9: Custom Fields section contains all custom fields defined in event settings
 * - 5.5: Select-type custom fields support multi-select with searchable dropdown
 * - 5.6: Boolean-type custom fields support options: All, Yes, No
 * - 8.3: Multi-select dropdowns use virtualization or lazy loading for large lists
 */

import * as React from 'react';
import { Settings, Check, ChevronsUpDown } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { IntegratedFilterInput } from '../components/IntegratedFilterInput';
import type { CustomField, SelectFieldOptions } from '@/components/EventSettingsForm/types';
import type { CustomFieldFilter } from '@/lib/filterUtils';

/**
 * Text operators for text-type custom fields
 */
const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
];

/**
 * Boolean filter options
 */
const BOOLEAN_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
];

export interface CustomFieldsSectionProps {
  /** Custom fields from event settings */
  customFields: CustomField[];
  /** Current custom field filter values */
  filters: Record<string, CustomFieldFilter>;
  /** Callback when filter changes */
  onFilterChange: (fieldId: string, value: string | string[], property?: string) => void;
}

/**
 * Get options from a select-type custom field
 */
function getFieldOptions(field: CustomField): string[] {
  if (field.fieldOptions && 'options' in field.fieldOptions) {
    return (field.fieldOptions as SelectFieldOptions).options || [];
  }
  return [];
}

/**
 * TextCustomFieldFilter - Filter for text-type custom fields
 */
interface TextCustomFieldFilterProps {
  field: CustomField;
  filter: CustomFieldFilter;
  onValueChange: (value: string) => void;
  onOperatorChange: (operator: string) => void;
}

function TextCustomFieldFilter({
  field,
  filter,
  onValueChange,
  onOperatorChange,
}: TextCustomFieldFilterProps) {
  const fieldId = field.id || field.fieldName;

  return (
    <IntegratedFilterInput
      id={`custom-${fieldId}`}
      label={field.fieldName}
      icon={Settings}
      operator={filter.operator}
      value={typeof filter.value === 'string' ? filter.value : ''}
      onOperatorChange={onOperatorChange}
      onValueChange={onValueChange}
      operators={TEXT_OPERATORS}
    />
  );
}

/**
 * BooleanCustomFieldFilter - Filter for boolean-type custom fields
 */
interface BooleanCustomFieldFilterProps {
  field: CustomField;
  filter: CustomFieldFilter;
  onValueChange: (value: string) => void;
}

function BooleanCustomFieldFilter({
  field,
  filter,
  onValueChange,
}: BooleanCustomFieldFilterProps) {
  const fieldId = field.id || field.fieldName;
  const selectId = `filter-custom-${fieldId}`;
  const currentValue = typeof filter.value === 'string' ? filter.value : 'all';

  return (
    <div className="space-y-2 min-w-0">
      <Label
        htmlFor={selectId}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="truncate">{field.fieldName}</span>
      </Label>
      <Select value={currentValue || 'all'} onValueChange={onValueChange}>
        <SelectTrigger 
          id={selectId} 
          className="w-full bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BOOLEAN_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * MultiSelectCustomFieldFilter - Filter for select/multi-select custom fields
 */
interface MultiSelectCustomFieldFilterProps {
  field: CustomField;
  filter: CustomFieldFilter;
  onValueChange: (value: string[]) => void;
}

function MultiSelectCustomFieldFilter({
  field,
  filter,
  onValueChange,
}: MultiSelectCustomFieldFilterProps) {
  const [open, setOpen] = React.useState(false);
  const fieldId = field.id || field.fieldName;
  const triggerId = `filter-custom-${fieldId}-trigger`;
  const options = getFieldOptions(field);
  const selectedValues = Array.isArray(filter.value) ? filter.value : [];

  const handleSelect = (option: string) => {
    const newValues = selectedValues.includes(option)
      ? selectedValues.filter((v) => v !== option)
      : [...selectedValues, option];
    onValueChange(newValues);
  };

  const handleClear = () => {
    onValueChange([]);
  };

  return (
    <div className="space-y-2 min-w-0">
      <Label
        htmlFor={triggerId}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Settings className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{field.fieldName}</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={`Select ${field.fieldName} values`}
            className="w-full justify-between font-normal bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 min-w-0"
          >
            <span className="truncate flex-1 text-left">
              {selectedValues.length === 0 ? (
                <span className="text-muted-foreground">Select values...</span>
              ) : selectedValues.length === 1 ? (
                selectedValues[0]
              ) : (
                <>{selectedValues[0]} +{selectedValues.length - 1}</>
              )}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${field.fieldName}...`} />
            <CommandList>
              <CommandEmpty>No options found.</CommandEmpty>
              <CommandGroup>
                <ScrollArea className="max-h-[200px]">
                  {options.map((option) => (
                    <CommandItem
                      key={option}
                      value={option}
                      onSelect={() => handleSelect(option)}
                    >
                      <Checkbox
                        checked={selectedValues.includes(option)}
                        className="mr-2 data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
                        aria-hidden="true"
                      />
                      <span className="truncate">{option}</span>
                      {selectedValues.includes(option) && (
                        <Check className="ml-auto h-4 w-4 text-violet-500" />
                      )}
                    </CommandItem>
                  ))}
                </ScrollArea>
              </CommandGroup>
            </CommandList>
          </Command>
          {selectedValues.length > 0 && (
            <div className="border-t p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="w-full"
              >
                Clear selection
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
      {/* Display selected values as badges - constrained width */}
      {selectedValues.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1 overflow-hidden">
          {selectedValues.slice(0, 3).map((value) => (
            <Badge
              key={value}
              variant="secondary"
              className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 max-w-full truncate"
            >
              <span className="truncate">{value}</span>
            </Badge>
          ))}
          {selectedValues.length > 3 && (
            <Badge 
              variant="secondary" 
              className="text-xs bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 shrink-0"
            >
              +{selectedValues.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CustomFieldsSection displays filter fields for all custom fields.
 */
export function CustomFieldsSection({
  customFields,
  filters,
  onFilterChange,
}: CustomFieldsSectionProps) {
  // Sort custom fields by order
  const sortedFields = React.useMemo(
    () => [...customFields].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [customFields]
  );

  // Get or create filter for a field
  const getFilter = (fieldId: string): CustomFieldFilter => {
    return filters[fieldId] || { value: '', operator: 'contains' };
  };

  if (sortedFields.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No custom fields configured for this event.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 min-w-0">
      {sortedFields.map((field) => {
        const fieldId = field.id || field.fieldName;
        const filter = getFilter(fieldId);

        // Render appropriate filter based on field type
        switch (field.fieldType) {
          case 'boolean':
          case 'checkbox':
            return (
              <BooleanCustomFieldFilter
                key={fieldId}
                field={field}
                filter={filter}
                onValueChange={(value) => onFilterChange(fieldId, value)}
              />
            );

          case 'select':
          case 'multi-select':
            return (
              <MultiSelectCustomFieldFilter
                key={fieldId}
                field={field}
                filter={filter}
                onValueChange={(value) => onFilterChange(fieldId, value)}
              />
            );

          case 'text':
          default:
            return (
              <TextCustomFieldFilter
                key={fieldId}
                field={field}
                filter={filter}
                onValueChange={(value) => onFilterChange(fieldId, value, 'value')}
                onOperatorChange={(operator) => onFilterChange(fieldId, operator, 'operator')}
              />
            );
        }
      })}
    </div>
  );
}

export default CustomFieldsSection;

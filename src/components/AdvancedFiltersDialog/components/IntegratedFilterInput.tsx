/**
 * IntegratedFilterInput Component
 *
 * A unified filter input that integrates the operator selector inside the input container.
 * Inspired by Linear, Notion, and Airtable filter UIs.
 *
 * Features:
 * - Operator dropdown integrated into the left side of the input
 * - Clean, minimal aesthetic with violet focus states
 * - Text labels (not icons) for accessibility
 * - Reduced visual clutter
 */

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

/**
 * Text operators for filter fields
 */
export const TEXT_OPERATORS = [
  { value: 'contains', label: 'Contains' },
  { value: 'equals', label: 'Equals' },
  { value: 'startsWith', label: 'Starts With' },
  { value: 'endsWith', label: 'Ends With' },
  { value: 'isEmpty', label: 'Is Empty' },
  { value: 'isNotEmpty', label: 'Is Not Empty' },
];

/**
 * Operators that don't require a value input
 */
export const EMPTY_OPERATORS = ['isEmpty', 'isNotEmpty'];

export interface IntegratedFilterInputProps {
  /** Unique identifier for the filter field */
  id: string;
  /** Label text for the filter */
  label: string;
  /** Icon component to display next to the label */
  icon: React.ElementType;
  /** Current operator value */
  operator: string;
  /** Current input value */
  value: string;
  /** Callback when operator changes */
  onOperatorChange: (operator: string) => void;
  /** Callback when value changes */
  onValueChange: (value: string) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Custom operators (defaults to TEXT_OPERATORS) */
  operators?: Array<{ value: string; label: string }>;
  /** Additional class names for the container */
  className?: string;
}

/**
 * IntegratedFilterInput - A filter input with integrated operator selector
 */
export function IntegratedFilterInput({
  id,
  label,
  icon: Icon,
  operator,
  value,
  onOperatorChange,
  onValueChange,
  placeholder = 'Value...',
  operators = TEXT_OPERATORS,
  className,
}: IntegratedFilterInputProps) {
  const inputId = `filter-${id}-value`;
  const operatorId = `filter-${id}-operator`;
  const isDisabled = EMPTY_OPERATORS.includes(operator);

  // Clear value when switching to EMPTY_OPERATORS
  React.useEffect(() => {
    if (isDisabled && value) {
      onValueChange('');
    }
  }, [isDisabled, value, onValueChange]);

  return (
    <div className={cn('space-y-2 min-w-0', className)}>
      <Label
        htmlFor={inputId}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </Label>
      
      {/* Integrated input container */}
      <div className="flex items-center rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-violet-500/20 focus-within:border-violet-500 transition-all">
        {/* Operator selector - integrated into the input */}
        <Select value={operator} onValueChange={onOperatorChange}>
          <SelectTrigger
            id={operatorId}
            className="w-[95px] border-0 bg-transparent rounded-r-none focus:ring-0 focus:ring-offset-0 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            aria-label={`${label} operator`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value} className="text-sm">
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {/* Divider */}
        <div className="h-5 w-px bg-border" />
        
        {/* Value input */}
        <Input
          id={inputId}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          disabled={isDisabled}
          placeholder={isDisabled ? '' : placeholder}
          className="flex-1 border-0 bg-transparent rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
          aria-describedby={isDisabled ? undefined : `${id}-hint`}
        />
      </div>
    </div>
  );
}

export default IntegratedFilterInput;

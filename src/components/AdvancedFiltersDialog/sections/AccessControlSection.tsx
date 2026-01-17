/**
 * AccessControlSection Component
 *
 * Filter section for access control: Access Status select and date range filters.
 * Uses violet focus states for interactive elements.
 *
 * Requirements:
 * - 1.8: Access Control section contains Access Status, Valid From Range, Valid Until Range
 * - 5.7: Access Control filters support Access Status (All/Active/Inactive) and date range filters
 */

import * as React from 'react';
import { Shield, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { AccessControlFilters } from '@/lib/filterUtils';

/**
 * Access status options
 */
const ACCESS_STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export interface AccessControlSectionProps {
  /** Access control filter state */
  accessControl: AccessControlFilters;
  /** Callback when filter changes */
  onFilterChange: (key: string, value: string) => void;
}

/**
 * DateRangeField - Reusable date range filter with start and end inputs
 */
interface DateRangeFieldProps {
  id: string;
  label: string;
  startValue: string;
  endValue: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}

function DateRangeField({
  id,
  label,
  startValue,
  endValue,
  onStartChange,
  onEndChange,
}: DateRangeFieldProps) {
  const startId = `filter-${id}-start`;
  const endId = `filter-${id}-end`;

  return (
    <div className="space-y-2">
      <Label
        htmlFor={startId}
        className="flex items-center gap-2 text-sm font-medium"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </Label>
      <div className="flex gap-2 items-center">
        <Input
          id={startId}
          type="date"
          value={startValue}
          onChange={(e) => onStartChange(e.target.value)}
          className="flex-1 bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          aria-label={`${label} start date`}
        />
        <span className="text-muted-foreground text-sm">to</span>
        <Input
          id={endId}
          type="date"
          value={endValue}
          onChange={(e) => onEndChange(e.target.value)}
          className="flex-1 bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          aria-label={`${label} end date`}
        />
      </div>
    </div>
  );
}

/**
 * AccessControlSection displays filter fields for access control.
 */
export function AccessControlSection({
  accessControl,
  onFilterChange,
}: AccessControlSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Access Status Filter */}
      <div className="space-y-2">
        <Label
          htmlFor="filter-accessStatus"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span>Access Status</span>
        </Label>
        <Select
          value={accessControl.accessStatus}
          onValueChange={(value) => onFilterChange('accessStatus', value)}
        >
          <SelectTrigger 
            id="filter-accessStatus" 
            className="bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACCESS_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Valid From Date Range */}
      <DateRangeField
        id="validFrom"
        label="Valid From"
        startValue={accessControl.validFromStart}
        endValue={accessControl.validFromEnd}
        onStartChange={(value) => onFilterChange('validFromStart', value)}
        onEndChange={(value) => onFilterChange('validFromEnd', value)}
      />

      {/* Valid Until Date Range */}
      <DateRangeField
        id="validUntil"
        label="Valid Until"
        startValue={accessControl.validUntilStart}
        endValue={accessControl.validUntilEnd}
        onStartChange={(value) => onFilterChange('validUntilStart', value)}
        onEndChange={(value) => onFilterChange('validUntilEnd', value)}
      />
    </div>
  );
}

export default AccessControlSection;

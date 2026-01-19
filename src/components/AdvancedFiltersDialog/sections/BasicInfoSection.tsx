/**
 * BasicInfoSection Component
 *
 * Filter section for basic attendee information: First Name, Last Name, Barcode, Photo Status, Credential Status.
 * Uses integrated filter inputs with operator selector inside the input container.
 *
 * Requirements:
 * - 1.6: Basic Information section contains First Name, Last Name, Barcode, Photo Status
 * - 3.1: Use muted, consistent icon colors (text-muted-foreground)
 * - 3.4: Filter field labels use consistent typography (font-medium, text-sm)
 * - 5.1: Text filter fields support operators: Contains, Equals, Starts With, Ends With, Is Empty, Is Not Empty
 * - 5.3: Photo Status filter supports options: All Attendees, With Photo, Without Photo
 * - 7.4: Form inputs have associated labels using htmlFor/id attributes
 */

import * as React from 'react';
import { User, Barcode, Camera, CreditCard } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IntegratedFilterInput } from '../components/IntegratedFilterInput';
import type { TextFilter } from '@/lib/filterUtils';

/**
 * Photo status options
 */
const PHOTO_STATUS_OPTIONS = [
  { value: 'all', label: 'All Attendees' },
  { value: 'with', label: 'With Photo' },
  { value: 'without', label: 'Without Photo' },
];

/**
 * Credential status options
 */
const CREDENTIAL_STATUS_OPTIONS = [
  { value: 'all', label: 'All Attendees' },
  { value: 'with', label: 'With Credential' },
  { value: 'without', label: 'Without Credential' },
];

export interface BasicInfoSectionProps {
  /** First name filter state */
  firstName: TextFilter;
  /** Last name filter state */
  lastName: TextFilter;
  /** Barcode filter state */
  barcode: TextFilter;
  /** Photo filter state */
  photoFilter: 'all' | 'with' | 'without';
  /** Credential filter state */
  credentialFilter: 'all' | 'with' | 'without';
  /** Callback when filter changes */
  onFilterChange: (key: string, value: string, property?: string) => void;
}

/**
 * BasicInfoSection displays filter fields for basic attendee information.
 */
export function BasicInfoSection({
  firstName,
  lastName,
  barcode,
  photoFilter,
  credentialFilter,
  onFilterChange,
}: BasicInfoSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* First Name Filter */}
      <IntegratedFilterInput
        id="firstName"
        label="First Name"
        icon={User}
        operator={firstName.operator}
        value={firstName.value}
        onOperatorChange={(operator) => onFilterChange('firstName', operator, 'operator')}
        onValueChange={(value) => onFilterChange('firstName', value, 'value')}
      />

      {/* Last Name Filter */}
      <IntegratedFilterInput
        id="lastName"
        label="Last Name"
        icon={User}
        operator={lastName.operator}
        value={lastName.value}
        onOperatorChange={(operator) => onFilterChange('lastName', operator, 'operator')}
        onValueChange={(value) => onFilterChange('lastName', value, 'value')}
      />

      {/* Barcode Filter */}
      <IntegratedFilterInput
        id="barcode"
        label="Barcode"
        icon={Barcode}
        operator={barcode.operator}
        value={barcode.value}
        onOperatorChange={(operator) => onFilterChange('barcode', operator, 'operator')}
        onValueChange={(value) => onFilterChange('barcode', value, 'value')}
      />

      {/* Photo Status Filter */}
      <div className="space-y-2">
        <Label
          htmlFor="filter-photoStatus"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <Camera className="h-4 w-4 text-muted-foreground" />
          <span>Photo Status</span>
        </Label>
        <Select
          value={photoFilter}
          onValueChange={(value) => onFilterChange('photoFilter', value)}
        >
          <SelectTrigger 
            id="filter-photoStatus" 
            className="bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHOTO_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Credential Status Filter */}
      <div className="space-y-2">
        <Label
          htmlFor="filter-credentialStatus"
          className="flex items-center gap-2 text-sm font-medium"
        >
          <CreditCard className="h-4 w-4 text-muted-foreground" />
          <span>Credential Status</span>
        </Label>
        <Select
          value={credentialFilter}
          onValueChange={(value) => onFilterChange('credentialFilter', value)}
        >
          <SelectTrigger 
            id="filter-credentialStatus" 
            className="bg-background border-input focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CREDENTIAL_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

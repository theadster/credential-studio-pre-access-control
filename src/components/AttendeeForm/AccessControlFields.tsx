/**
 * AccessControlFields Component
 * 
 * Renders access control fields (validFrom, validUntil, accessEnabled) in the attendee form.
 * Conditionally displays date-only or date-time pickers based on the event's time mode setting.
 * 
 * @see .kiro/specs/access-control-feature/design.md
 * @see Requirements 4.1, 4.2, 5.1, 8.1
 */

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Calendar, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import {
  AccessControlTimeMode,
  extractDateOnly,
  isValidDateRange,
  convertUtcToEventLocalForInput,
  convertEventLocalToUtcForStorage
} from '@/lib/accessControlDates';

/**
 * Props for the AccessControlFields component
 */
export interface AccessControlFieldsProps {
  /** Whether access control is enabled for the event */
  accessControlEnabled: boolean;
  /** Time mode setting from event settings */
  accessControlTimeMode: AccessControlTimeMode;
  /** Valid from date/datetime value (ISO string or null) */
  validFrom: string | null;
  /** Valid until date/datetime value (ISO string or null) */
  validUntil: string | null;
  /** Whether access is enabled for this attendee */
  accessEnabled: boolean;
  /** Callback when validFrom changes */
  onValidFromChange: (date: string | null) => void;
  /** Callback when validUntil changes */
  onValidUntilChange: (date: string | null) => void;
  /** Callback when accessEnabled changes */
  onAccessEnabledChange: (enabled: boolean) => void;
  /** Event timezone for date interpretation */
  eventTimezone: string;
  /** Whether the form is in read-only mode */
  readOnly?: boolean;
}

/**
 * AccessControlFields component for managing attendee access control settings
 * 
 * Features:
 * - Conditional date picker type based on time mode (date-only vs date-time)
 * - Date range validation (validFrom must be before validUntil)
 * - Access status toggle (Active/Inactive)
 * - Visual feedback for validation errors
 */
export function AccessControlFields({
  accessControlEnabled,
  accessControlTimeMode,
  validFrom,
  validUntil,
  accessEnabled,
  onValidFromChange,
  onValidUntilChange,
  onAccessEnabledChange,
  eventTimezone,
  readOnly = false
}: AccessControlFieldsProps) {
  const [validationError, setValidationError] = useState<string | null>(null);

  // Validate date range whenever dates change
  useEffect(() => {
    if (validFrom && validUntil) {
      if (!isValidDateRange(validFrom, validUntil)) {
        setValidationError('Valid From date must be before Valid Until date');
      } else {
        setValidationError(null);
      }
    } else {
      setValidationError(null);
    }
  }, [validFrom, validUntil]);

  // Don't render if access control is disabled
  if (!accessControlEnabled) {
    return null;
  }

  const isDateOnly = accessControlTimeMode === 'date_only';
  const inputType = isDateOnly ? 'date' : 'datetime-local';

  /**
   * Handle validFrom input change
   */
  const handleValidFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      onValidFromChange(null);
      return;
    }

    if (isDateOnly) {
      // For date-only mode, store as ISO string at start of day
      // The actual start-of-day conversion happens in the API
      onValidFromChange(value);
    } else {
      // For date-time mode, convert from event-local to UTC
      const utcValue = convertEventLocalToUtcForStorage(value, eventTimezone);
      onValidFromChange(utcValue);
    }
  };

  /**
   * Handle validUntil input change
   */
  const handleValidUntilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      onValidUntilChange(null);
      return;
    }

    if (isDateOnly) {
      // For date-only mode, store as ISO string at end of day
      // The actual end-of-day conversion happens in the API
      onValidUntilChange(value);
    } else {
      // For date-time mode, convert from event-local to UTC
      const utcValue = convertEventLocalToUtcForStorage(value, eventTimezone);
      onValidUntilChange(utcValue);
    }
  };

  /**
   * Get the display value for the date input
   */
  const getInputValue = (dateValue: string | null): string => {
    if (!dateValue) return '';

    if (isDateOnly) {
      // For date-only mode, extract just the date portion
      // Check if it's already a date-only string (YYYY-MM-DD)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // Otherwise extract from ISO string in event timezone
      return extractDateOnly(dateValue, eventTimezone);
    } else {
      // For date-time mode, convert UTC to event-local datetime format
      return convertUtcToEventLocalForInput(dateValue, eventTimezone);
    }
  };

  return (
    <Card data-testid="access-control-fields">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Access Control
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Access Status */}
          <div className="space-y-2">
            <Label htmlFor="access-enabled" className="flex items-center gap-2">
              {accessEnabled ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              Access Status
            </Label>
            <Select
              value={accessEnabled ? 'active' : 'inactive'}
              onValueChange={(value) => onAccessEnabledChange(value === 'active')}
              disabled={readOnly}
            >
              <SelectTrigger 
                id="access-enabled" 
                className="w-full"
                data-testid="access-enabled-select"
              >
                <SelectValue placeholder="Select access status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  <span className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Active
                  </span>
                </SelectItem>
                <SelectItem value="inactive">
                  <span className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Inactive
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              When inactive, all scan attempts will be denied
            </p>
          </div>

          {/* Validity Window */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Valid From */}
            <div className="space-y-2">
              <Label htmlFor="valid-from" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Valid From
              </Label>
              <Input
                id="valid-from"
                type={inputType}
                value={getInputValue(validFrom)}
                onChange={handleValidFromChange}
                disabled={readOnly}
                className="bg-background"
                data-testid="valid-from-input"
                aria-describedby="valid-from-help"
              />
              <p id="valid-from-help" className="text-xs text-muted-foreground">
                {isDateOnly 
                  ? 'Badge becomes valid at 12:00 AM on this date'
                  : 'Leave empty for immediate validity'
                }
              </p>
            </div>

            {/* Valid Until */}
            <div className="space-y-2">
              <Label htmlFor="valid-until" className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Valid Until
              </Label>
              <Input
                id="valid-until"
                type={inputType}
                value={getInputValue(validUntil)}
                onChange={handleValidUntilChange}
                disabled={readOnly}
                className="bg-background"
                data-testid="valid-until-input"
                aria-describedby="valid-until-help"
              />
              <p id="valid-until-help" className="text-xs text-muted-foreground">
                {isDateOnly 
                  ? 'Badge expires at 11:59 PM on this date'
                  : 'Leave empty for no expiration'
                }
              </p>
            </div>
          </div>

          {/* Validation Error */}
          {validationError && (
            <Alert variant="destructive" data-testid="date-validation-error">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default AccessControlFields;

import React, { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { User, Users, Hash, FileText } from 'lucide-react';
import { sanitizeInput, sanitizeNotes, sanitizeBarcode } from '@/lib/sanitization';
import { FORM_LIMITS } from '@/constants/formLimits';

interface EventSettings {
  forceFirstNameUppercase?: boolean;
  forceLastNameUppercase?: boolean;
}

interface BasicInformationSectionProps {
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes: string;
  isEditMode: boolean;
  eventSettings?: EventSettings;
  onFirstNameChange: (value: string) => void;
  onLastNameChange: (value: string) => void;
  onBarcodeChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onGenerateBarcode: () => void;
  firstNameRef?: React.RefObject<HTMLInputElement>;
  hasErrors?: boolean;
}

/**
 * Auto-expanding textarea component
 * Automatically adjusts height based on content
 */
function AutoExpandTextarea({
  value,
  onChange,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';
    
    // Set height to scrollHeight to fit content
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [value]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      className="resize-none overflow-hidden min-h-[60px]"
      {...props}
    />
  );
}

export function BasicInformationSection({
  firstName,
  lastName,
  barcodeNumber,
  notes,
  isEditMode,
  eventSettings,
  onFirstNameChange,
  onLastNameChange,
  onBarcodeChange,
  onNotesChange,
  onGenerateBarcode,
  firstNameRef,
  hasErrors = false
}: BasicInformationSectionProps) {
  /**
   * Creates a name change handler with optional uppercase transformation
   * 
   * Handles sanitization and optional uppercase transformation for name fields.
   * This eliminates code duplication between firstName and lastName handlers.
   * 
   * @param onChange - Callback to update the field value
   * @param forceUppercase - Whether to force uppercase transformation
   * @returns Event handler function
   */
  const createNameChangeHandler = (
    onChange: (value: string) => void,
    forceUppercase?: boolean
  ) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const sanitized = sanitizeInput(e.target.value);
      const processed = forceUppercase ? sanitized.toUpperCase() : sanitized;
      onChange(processed);
    };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-2 font-semibold text-primary uppercase">
              <User className="h-4 w-4" />
              First Name *
            </Label>
            <Input
              ref={firstNameRef}
              id="firstName"
              value={firstName}
              onChange={createNameChangeHandler(
                onFirstNameChange,
                eventSettings?.forceFirstNameUppercase
              )}
              required
              maxLength={FORM_LIMITS.NAME_MAX_LENGTH}
              autoComplete="off"
              data-form-type="other"
              aria-label="First name"
              aria-required="true"
              aria-invalid={hasErrors && !firstName ? 'true' : 'false'}
              className="h-12 text-base font-medium bg-slate-50 dark:bg-slate-800/50 border-2 border-primary/20 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="flex items-center gap-2 font-semibold text-primary uppercase">
              <Users className="h-4 w-4" />
              Last Name *
            </Label>
            <Input
              id="lastName"
              value={lastName}
              onChange={createNameChangeHandler(
                onLastNameChange,
                eventSettings?.forceLastNameUppercase
              )}
              required
              maxLength={FORM_LIMITS.NAME_MAX_LENGTH}
              autoComplete="off"
              data-form-type="other"
              aria-label="Last name"
              aria-required="true"
              aria-invalid={hasErrors && !lastName ? 'true' : 'false'}
              className="h-12 text-base font-medium bg-slate-50 dark:bg-slate-800/50 border-2 border-primary/20 focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Notes
            </Label>
            <AutoExpandTextarea
              id="notes"
              value={notes}
              onChange={(e) => {
                const sanitized = sanitizeNotes(e.target.value);
                onNotesChange(sanitized);
              }}
              placeholder="Add any additional notes about this attendee..."
              maxLength={FORM_LIMITS.NOTES_MAX_LENGTH}
              autoComplete="off"
              data-form-type="other"
              aria-label="Notes"
              aria-required="false"
            />
            <p className="text-xs text-muted-foreground">
              {notes.length} / {FORM_LIMITS.NOTES_MAX_LENGTH} characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcodeNumber" className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" />
              Barcode Number *
            </Label>
            <div className="flex space-x-2">
              <Input
                id="barcodeNumber"
                value={barcodeNumber}
                onChange={(e) => {
                  const sanitized = sanitizeBarcode(e.target.value);
                  onBarcodeChange(sanitized);
                }}
                required
                maxLength={64}
                pattern="^[0-9A-Za-z-]+$"
                title="Barcode must contain only letters, numbers, and hyphens"
                autoComplete="off"
                className="flex-1"
                aria-label="Barcode number"
                aria-required="true"
                aria-invalid={hasErrors && !barcodeNumber ? 'true' : 'false'}
              />
              {!isEditMode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onGenerateBarcode}
                  aria-label="Generate barcode number"
                >
                  Generate
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

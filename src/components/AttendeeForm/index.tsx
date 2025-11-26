import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useAttendeeForm } from '@/hooks/useAttendeeForm';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { useScrollLock } from '@/hooks/useScrollLock';
import { PhotoUploadSection } from './PhotoUploadSection';
import { BasicInformationSection } from './BasicInformationSection';
import { CustomFieldsSection } from './CustomFieldsSection';
import { FormActions } from './FormActions';

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

interface CustomFieldValue {
  customFieldId: string;
  value: string;
}

interface Attendee {
  id?: string;
  firstName: string;
  lastName: string;
  barcodeNumber: string;
  notes?: string;
  profileImageUrl?: string;
  photoUrl?: string | null;
  customFieldValues?: CustomFieldValue[];
}

interface EventSettings {
  id?: string;
  eventName?: string;
  eventDate?: string;
  barcodeType?: 'numerical' | 'alphanumeric';
  barcodeLength?: number;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryCropAspectRatio?: string;
  cloudinaryDisableSkipCrop?: boolean;
  forceFirstNameUppercase?: boolean;
  forceLastNameUppercase?: boolean;
}

/**
 * Props for the AttendeeForm component
 * 
 * @interface AttendeeFormProps
 */
interface AttendeeFormProps {
  /** Whether the form dialog is open */
  isOpen: boolean;

  /** Callback when dialog should close */
  onClose: () => void;

  /** Callback when form is saved */
  onSave: (attendee: Attendee) => void;

  /** Optional callback for save and generate credential action */
  onSaveAndGenerate?: (attendee: Attendee) => void;

  /** Existing attendee data for edit mode (undefined for create mode) */
  attendee?: Attendee;

  /** Array of custom fields to render */
  customFields: CustomField[];

  /** Event settings including barcode config and Cloudinary settings */
  eventSettings?: EventSettings;
}

/**
 * FocusTrap component to manage keyboard focus within the dialog
 * 
 * Provides focus trapping for keyboard users while respecting the Cloudinary widget.
 * When the Cloudinary widget is open, focus trapping is disabled to allow interaction
 * with the widget.
 */
interface FocusTrapProps {
  children: React.ReactNode;
  enabled: boolean;
  allowCloudinary: boolean;
}

function FocusTrap({ children, enabled, allowCloudinary }: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled || allowCloudinary) return;

    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [enabled, allowCloudinary]);

  return <div ref={containerRef}>{children}</div>;
}

const AttendeeForm = React.memo(function AttendeeForm({
  isOpen,
  onClose,
  onSave,
  onSaveAndGenerate,
  attendee,
  customFields,
  eventSettings
}: AttendeeFormProps) {
  const { error, confirm } = useSweetAlert();
  const [loading, setLoading] = useState(false);
  const [loadingAndGenerate, setLoadingAndGenerate] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const isClosingRef = React.useRef(false);

  const {
    formData,
    updateField,
    updateCustomField,
    setPhotoUrl,
    removePhoto,
    generateBarcode,
    validateForm,
    prepareAttendeeData,
    resetForm
  } = useAttendeeForm({ attendee, customFields, eventSettings });

  const { isCloudinaryOpen, openUploadWidget } = useCloudinaryUpload({
    eventSettings,
    onUploadSuccess: setPhotoUrl
  });

  // Prevent body scroll when dialog is open (with ref counting for multiple modals)
  useScrollLock(isOpen);

  // Generate barcode for new attendees
  useEffect(() => {
    if (!attendee && isOpen) {
      generateBarcode();
    }
  }, [attendee, isOpen, generateBarcode]);

  // Track unsaved changes
  useEffect(() => {
    if (!isOpen) {
      setHasUnsavedChanges(false);
      return;
    }

    // For edit mode: compare current data with original attendee data
    if (attendee) {
      const hasChanges =
        formData.firstName !== (attendee.firstName || '') ||
        formData.lastName !== (attendee.lastName || '') ||
        formData.notes !== (attendee.notes || '') ||
        formData.photoUrl !== (attendee.photoUrl || attendee.profileImageUrl || '');

      // Check custom field changes
      const customFieldsChanged = customFields.some(field => {
        const currentValue = formData.customFieldValues[field.id] || '';
        const originalValue = attendee.customFieldValues?.find(
          cfv => cfv.customFieldId === field.id
        )?.value || '';
        return currentValue !== originalValue;
      });

      setHasUnsavedChanges(hasChanges || customFieldsChanged);
    } else {
      // For create mode: check if any user-entered data exists
      const hasData =
        formData.firstName.trim() !== '' ||
        formData.lastName.trim() !== '' ||
        (formData.notes && formData.notes.trim() !== '') ||
        (formData.photoUrl && formData.photoUrl.trim() !== '') ||
        Object.values(formData.customFieldValues).some((value: string) => value.trim() !== '');

      setHasUnsavedChanges(hasData);
    }
  }, [isOpen, formData, attendee, customFields]);

  // Handle dialog close with confirmation if there are unsaved changes
  const handleCloseWithConfirmation = () => {
    // Prevent re-entry while already processing a close
    if (isClosingRef.current) {
      return;
    }

    // If no unsaved changes, close immediately
    if (!hasUnsavedChanges) {
      resetForm();
      onClose();
      return;
    }

    // Set flag to prevent re-entry
    isClosingRef.current = true;

    // Show confirmation dialog for unsaved changes
    confirm({
      title: 'Unsaved Changes',
      text: 'You have unsaved changes. Are you sure you want to close without saving?',
      icon: 'warning',
      confirmButtonText: 'Close Without Saving',
      cancelButtonText: 'Keep Editing',
    }).then((confirmed) => {
      if (confirmed) {
        resetForm();
        setHasUnsavedChanges(false);
        onClose();
      }
      // Reset flag after confirmation dialog closes
      isClosingRef.current = false;
    }).catch(() => {
      // Reset flag on error
      isClosingRef.current = false;
    });
  };

  // Handle Dialog onOpenChange event
  const handleDialogOpenChange = (open: boolean) => {
    // Only handle close events (when open becomes false)
    if (!open) {
      handleCloseWithConfirmation();
    }
  };

  // Reset closing flag when dialog opens
  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isValid = await validateForm(attendee);
      if (!isValid) {
        setLoading(false);
        return;
      }

      const attendeeData = prepareAttendeeData();

      // Mark as closing to prevent unsaved changes dialog
      isClosingRef.current = true;
      setHasUnsavedChanges(false);

      onSave(attendeeData);
      resetForm();
      onClose();
    } catch (err) {
      console.error('Form submission error:', err);
      error('Failed to submit attendee', err instanceof Error ? err.message : 'An unexpected error occurred');
      // Reset closing flag on error
      isClosingRef.current = false;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    setLoadingAndGenerate(true);

    try {
      const isValid = await validateForm(attendee);
      if (!isValid) {
        setLoadingAndGenerate(false);
        return;
      }

      const attendeeData = prepareAttendeeData();

      if (onSaveAndGenerate) {
        // Mark as closing to prevent unsaved changes dialog
        isClosingRef.current = true;
        setHasUnsavedChanges(false);

        onSaveAndGenerate(attendeeData);
        resetForm();
        onClose();
      }
    } catch (err) {
      console.error('Form submission error:', err);
      error('Failed to submit attendee', err instanceof Error ? err.message : 'An unexpected error occurred');
      // Reset closing flag on error
      isClosingRef.current = false;
    } finally {
      setLoadingAndGenerate(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange} modal={false}>
      {/* 
        IMPORTANT: modal={false} is required for Cloudinary widget interaction.
        
        Why modal={false} is necessary:
        - Even though Cloudinary widget has z-index: 200 (above dialog's z-index: 50),
          the dialog's backdrop overlay (when modal={true}) blocks pointer events
        - The backdrop has pointer-events: auto which intercepts all clicks
        - This prevents users from clicking buttons in the Cloudinary widget
        
        Trade-offs:
        - Loses some modal accessibility features (focus trapping)
        - But essential for Cloudinary widget functionality
        - onInteractOutside still prevents accidental dialog closure
      */}
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0"
        onInteractOutside={(e) => {
          // Prevent dialog from closing when Cloudinary widget is open
          if (isCloudinaryOpen) {
            e.preventDefault();
          }
        }}
      >
        <FocusTrap enabled={isOpen} allowCloudinary={isCloudinaryOpen}>
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              {attendee ? (
                <>
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Attendee
                </>
              ) : (
                <>
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Add New Attendee
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              {attendee ? 'Update attendee information and manage their profile' : 'Enter attendee details and upload a photo to create their profile'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="px-6 py-6" autoComplete="off" data-form-type="other" data-lpignore="true">
            <div className="grid grid-cols-12 gap-6 mb-6">
              {/* Photo Upload Section - Left Column */}
              <div className="col-span-3">
                <PhotoUploadSection
                  photoUrl={formData.photoUrl}
                  firstName={formData.firstName}
                  lastName={formData.lastName}
                  onUpload={openUploadWidget}
                  onRemove={removePhoto}
                />
              </div>

              {/* Form Fields - Right Columns */}
              <div className="col-span-9">
                <div className="space-y-6">
                  <BasicInformationSection
                    firstName={formData.firstName}
                    lastName={formData.lastName}
                    barcodeNumber={formData.barcodeNumber}
                    notes={formData.notes}
                    isEditMode={!!attendee}
                    eventSettings={eventSettings}
                    onFirstNameChange={(value) => updateField('firstName', value)}
                    onLastNameChange={(value) => updateField('lastName', value)}
                    onBarcodeChange={(value) => updateField('barcodeNumber', value)}
                    onNotesChange={(value) => updateField('notes', value)}
                    onGenerateBarcode={generateBarcode}
                  />

                  <CustomFieldsSection
                    customFields={customFields}
                    values={formData.customFieldValues}
                    onChange={updateCustomField}
                  />
                </div>
              </div>
            </div>

            <FormActions
              isEditMode={!!attendee}
              loading={loading}
              loadingAndGenerate={loadingAndGenerate}
              showGenerateButton={!!attendee && !!onSaveAndGenerate}
              onCancel={handleCloseWithConfirmation}
              onSaveAndGenerate={handleSaveAndGenerate}
            />
          </form>
        </FocusTrap>
      </DialogContent>
    </Dialog>
  );
});

export default AttendeeForm;

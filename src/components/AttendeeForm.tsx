import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Camera, X, Save, Loader2, User, Users, Hash, FileText, Link, ToggleLeft, Calendar, Mail, ChevronDown, Type, Hash as NumberIcon, Printer } from 'lucide-react';

interface CustomFieldOptions {
  uppercase?: boolean;
  options?: string[];
  [key: string]: unknown;
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
  [key: string]: unknown; // For custom fields
}

interface EventSettings {
  id?: string;
  eventName?: string;
  eventDate?: string;
  barcodeType?: string;
  barcodeLength?: number;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryCropAspectRatio?: string;
  cloudinaryDisableSkipCrop?: boolean;
  [key: string]: unknown;
}

interface AttendeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (attendee: Attendee) => void;
  onSaveAndGenerate?: (attendee: Attendee) => void;
  attendee?: Attendee;
  customFields: CustomField[];
  eventSettings?: EventSettings;
}

interface CloudinaryWidget {
  open: () => void;
  close: () => void;
  destroy: () => void;
}

interface CloudinaryInstance {
  createUploadWidget: (config: Record<string, unknown>, callback: (error: unknown, result: unknown) => void) => CloudinaryWidget;
}

declare global {
  interface Window {
    cloudinary: CloudinaryInstance;
  }
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
  const { success, error } = useSweetAlert();
  const [loading, setLoading] = useState(false);
  const [loadingAndGenerate, setLoadingAndGenerate] = useState(false);
  const [isCloudinaryOpen, setIsCloudinaryOpen] = useState(false);
  const cloudinaryRef = useRef<CloudinaryInstance | null>(null);
  const widgetRef = useRef<CloudinaryWidget | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    barcodeNumber: '',
    notes: '',
    photoUrl: '',
    customFieldValues: {} as Record<string, string>
  });

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      // Store original styles
      const originalOverflow = document.body.style.overflow;
      const originalPaddingRight = document.body.style.paddingRight;

      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Prevent body scroll and compensate for scrollbar
      document.body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Restore on cleanup
      return () => {
        document.body.style.overflow = originalOverflow;
        document.body.style.paddingRight = originalPaddingRight;
      };
    }
  }, [isOpen]);

  // Initialize Cloudinary widget
  useEffect(() => {
    if (typeof window !== 'undefined' && window.cloudinary && eventSettings?.cloudinaryCloudName && eventSettings?.cloudinaryUploadPreset) {
      cloudinaryRef.current = window.cloudinary;

      // Configure crop aspect ratio
      let croppingAspectRatio = 1; // Default to square
      if (eventSettings.cloudinaryCropAspectRatio && eventSettings.cloudinaryCropAspectRatio !== 'free') {
        croppingAspectRatio = parseFloat(eventSettings.cloudinaryCropAspectRatio);
      }

      // Build widget configuration
      const widgetConfig: any = {
        cloudName: eventSettings.cloudinaryCloudName,
        uploadPreset: eventSettings.cloudinaryUploadPreset,
        sources: ['local', 'url', 'camera'],
        defaultSource: 'local',
        multiple: false,
        cropping: true,
        croppingShowDimensions: true,
        croppingCoordinatesMode: 'custom',
        showSkipCropButton: false,
        folder: 'attendee-photos',
        clientAllowedFormats: ['jpg', 'jpeg', 'png'],
        maxFileSize: 5000000, // 5MB
        maxImageWidth: 800,
        maxImageHeight: 800,
        theme: 'minimal',
        styles: {
          palette: {
            window: "#FFFFFF",
            windowBorder: "#90A0B3",
            tabIcon: "#8B5CF6",
            menuIcons: "#5A616A",
            textDark: "#000000",
            textLight: "#FFFFFF",
            link: "#8B5CF6",
            action: "#8B5CF6",
            inactiveTabIcon: "#0E2F5A",
            error: "#F44235",
            inProgress: "#8B5CF6",
            complete: "#20B832",
            sourceBg: "#E4EBF1"
          }
        },
        showAdvancedOptions: false,
        showPoweredBy: false
      };

      // Set crop aspect ratio (only if not free form)
      if (eventSettings.cloudinaryCropAspectRatio !== 'free') {
        widgetConfig.croppingAspectRatio = croppingAspectRatio;
      }

      // Configure skip crop button behavior
      if (eventSettings.cloudinaryDisableSkipCrop) {
        widgetConfig.showSkipCropButton = false;
        widgetConfig.croppingValidateMinSize = true;
      } else {
        widgetConfig.showSkipCropButton = true;
      }

      widgetRef.current = cloudinaryRef.current.createUploadWidget(
        widgetConfig,
        (error: any, result: any) => {
          setIsCloudinaryOpen(false);
          if (!error && result && result.event === 'success') {
            setFormData(prev => ({ ...prev, photoUrl: result.info.secure_url }));
            success("Success", "Photo uploaded successfully!");
          } else if (error) {
            // Don't show an error toast if the user just closes the widget
            if (result && result.event !== 'close') {
              error("Upload Error", error?.message || "Failed to upload photo");
            }
          }
        }
      );
    }
  }, [eventSettings, success, error]);

  // Create a stable representation of custom field IDs
  const customFieldIds = useMemo(() =>
    customFields.map(cf => cf.id).join(','),
    [customFields]
  );

  // Effect 1: Initialize/reset form when attendee or eventSettings changes
  useEffect(() => {
    if (attendee) {
      // Get current custom field IDs to filter out deleted fields
      const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));

      // Initialize custom field values from attendee data
      const initialCustomFieldValues: Record<string, string> = {};

      // Load actual values from attendee
      if (Array.isArray(attendee.customFieldValues)) {
        attendee.customFieldValues.forEach((cfv: CustomFieldValue) => {
          if (currentCustomFieldIds.has(cfv.customFieldId)) {
            initialCustomFieldValues[cfv.customFieldId] = cfv.value;
          }
        });
      }

      // Set defaults ONLY for fields that don't have values yet
      customFields.forEach(field => {
        if (field.fieldType === 'boolean' && !initialCustomFieldValues[field.id]) {
          // Boolean fields without values default to 'no'
          initialCustomFieldValues[field.id] = 'no';
        }
      });

      setFormData({
        firstName: attendee.firstName || '',
        lastName: attendee.lastName || '',
        barcodeNumber: attendee.barcodeNumber || '',
        notes: attendee.notes || '',
        photoUrl: attendee.photoUrl || '',
        customFieldValues: initialCustomFieldValues
      });
    } else {
      // Reset form for new attendee
      setFormData({
        firstName: '',
        lastName: '',
        barcodeNumber: '',
        notes: '',
        photoUrl: '',
        customFieldValues: {}
      });
      // Generate barcode for new attendee
      generateBarcode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attendee, eventSettings]);

  // Effect 2: Prune deleted custom field values without re-initializing the form
  useEffect(() => {
    if (attendee) {
      // Only prune custom field values for fields that no longer exist
      const currentCustomFieldIds = new Set(customFields.map(cf => cf.id));

      setFormData(prev => {
        const filteredCustomFieldValues = Object.entries(prev.customFieldValues)
          .filter(([fieldId]) => currentCustomFieldIds.has(fieldId))
          .reduce((acc, [fieldId, value]) => {
            acc[fieldId] = value;
            return acc;
          }, {} as Record<string, string>);

        // Only update if something actually changed
        if (Object.keys(filteredCustomFieldValues).length !== Object.keys(prev.customFieldValues).length) {
          return {
            ...prev,
            customFieldValues: filteredCustomFieldValues
          };
        }
        return prev;
      });
    }
  }, [customFieldIds, attendee]);

  const generateBarcode = () => {
    if (!eventSettings) return;

    const barcodeType = eventSettings.barcodeType || 'alphanumeric';
    const barcodeLength = eventSettings.barcodeLength || 8;
    let barcode = '';

    if (barcodeType === 'numerical') {
      for (let i = 0; i < barcodeLength; i++) {
        barcode += Math.floor(Math.random() * 10);
      }
    } else {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      for (let i = 0; i < barcodeLength; i++) {
        barcode += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    }

    setFormData(prev => ({ ...prev, barcodeNumber: barcode }));
  };

  const handleCloudinaryUpload = () => {
    if (!eventSettings?.cloudinaryCloudName || !eventSettings?.cloudinaryUploadPreset) {
      error("Error", "Cloudinary not configured. Please check event settings.");
      return;
    }

    if (widgetRef.current) {
      setIsCloudinaryOpen(true);
      widgetRef.current.open();
    } else {
      error("Error", "Cloudinary widget not initialized. Please refresh the page.");
    }
  };

  // Helper function to get appropriate icon for custom field types
  const getCustomFieldIcon = (fieldType: string) => {
    switch (fieldType) {
      case 'text':
        return <Type className="h-4 w-4 text-muted-foreground" />;
      case 'number':
        return <NumberIcon className="h-4 w-4 text-muted-foreground" />;
      case 'email':
        return <Mail className="h-4 w-4 text-muted-foreground" />;
      case 'url':
        return <Link className="h-4 w-4 text-muted-foreground" />;
      case 'date':
        return <Calendar className="h-4 w-4 text-muted-foreground" />;
      case 'select':
        return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
      case 'boolean':
        return <ToggleLeft className="h-4 w-4 text-muted-foreground" />;
      case 'textarea':
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const validateForm = () => {
    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.barcodeNumber) {
      error("Validation Error", "Please fill in all required fields.");
      return false;
    }

    // Validate required custom fields
    for (const field of customFields) {
      if (field.required && !formData.customFieldValues[field.id]) {
        error("Validation Error", `${field.fieldName} is required.`);
        return false;
      }
    }

    return true;
  };

  const prepareAttendeeData = () => {
    // Prepare custom field values for API
    const customFieldValues = Object.entries(formData.customFieldValues)
      .map(([customFieldId, value]) => ({
        customFieldId,
        value: value || ''
      }));

    return {
      firstName: formData.firstName,
      lastName: formData.lastName,
      barcodeNumber: formData.barcodeNumber,
      notes: formData.notes || '',
      photoUrl: formData.photoUrl || null,
      customFieldValues
    };
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      barcodeNumber: '',
      notes: '',
      photoUrl: '',
      customFieldValues: {}
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!validateForm()) {
        setLoading(false);
        return;
      }

      const attendeeData = prepareAttendeeData();
      onSave(attendeeData);
      onClose();
      resetForm();
    } catch (err) {
      console.error('Form submission error:', err);
      error('Failed to submit attendee', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndGenerate = async () => {
    setLoadingAndGenerate(true);

    try {
      if (!validateForm()) {
        setLoadingAndGenerate(false);
        return;
      }

      const attendeeData = prepareAttendeeData();

      if (onSaveAndGenerate) {
        onSaveAndGenerate(attendeeData);
        onClose();
        resetForm();
      }
    } catch (err) {
      console.error('Form submission error:', err);
      error('Failed to submit attendee', err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoadingAndGenerate(false);
    }
  };

  const renderCustomField = (field: CustomField) => {
    const value = formData.customFieldValues[field.id] || '';

    switch (field.fieldType) {
      case 'text':
        return (
          <Input
            value={value}
            onChange={(e) => {
              let inputValue = e.target.value;
              // Apply uppercase transformation if enabled
              if (field.fieldOptions?.uppercase) {
                inputValue = inputValue.toUpperCase();
              }
              setFormData(prev => ({
                ...prev,
                customFieldValues: {
                  ...prev.customFieldValues,
                  [field.id]: inputValue
                }
              }));
            }}
            required={field.required}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customFieldValues: {
                ...prev.customFieldValues,
                [field.id]: e.target.value
              }
            }))}
            required={field.required}
          />
        );

      case 'email':
        return (
          <Input
            type="email"
            value={value}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customFieldValues: {
                ...prev.customFieldValues,
                [field.id]: e.target.value
              }
            }))}
            placeholder="Enter email address"
            required={field.required}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customFieldValues: {
                ...prev.customFieldValues,
                [field.id]: e.target.value
              }
            }))}
            placeholder="https://example.com"
            required={field.required}
          />
        );

      case 'date':
        return (
          <Input
            type="date"
            value={value}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customFieldValues: {
                ...prev.customFieldValues,
                [field.id]: e.target.value
              }
            }))}
            required={field.required}
          />
        );

      case 'select':
        return (
          <Select
            value={value}
            onValueChange={(newValue) => setFormData(prev => ({
              ...prev,
              customFieldValues: {
                ...prev.customFieldValues,
                [field.id]: newValue
              }
            }))}
          >
            <SelectTrigger>
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
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                customFieldValues: {
                  ...prev.customFieldValues,
                  [field.id]: checked ? 'true' : 'false'
                }
              }))}
            />
            <Label>{field.fieldName}</Label>
          </div>
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={value === 'yes'}
              onCheckedChange={(checked) => setFormData(prev => ({
                ...prev,
                customFieldValues: {
                  ...prev.customFieldValues,
                  [field.id]: checked ? 'yes' : 'no'
                }
              }))}
            />
            <Label>{value === 'yes' ? 'Yes' : 'No'}</Label>
          </div>
        );

      default:
        return (
          <Textarea
            value={value}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              customFieldValues: {
                ...prev.customFieldValues,
                [field.id]: e.target.value
              }
            }))}
            required={field.required}
          />
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose} modal={false}>
      <DialogContent
        className="max-w-5xl max-h-[90vh] overflow-y-auto bg-gray-50"
        onInteractOutside={(e) => {
          // Prevent closing the dialog when interacting with the Cloudinary widget
          if (isCloudinaryOpen) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>
            {attendee ? 'Edit Attendee' : 'Add New Attendee'}
          </DialogTitle>
          <DialogDescription>
            {attendee ? 'Update attendee information' : 'Enter attendee details and upload a photo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Photo Upload Section - Left Column */}
            <div className="col-span-3">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-center gap-2">
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    Photo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="w-full aspect-[3/4] bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                    {formData.photoUrl ? (
                      <img
                        src={formData.photoUrl}
                        alt="Attendee"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium text-lg">
                        {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCloudinaryUpload}
                      className="w-full"
                      size="sm"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      {formData.photoUrl ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                    {formData.photoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                        className="w-full"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Remove Photo
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Form Fields - Right Columns */}
            <div className="col-span-9">
              <div className="space-y-6">
                {/* Basic Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          First Name *
                        </Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => {
                            let inputValue = e.target.value;
                            // Apply uppercase transformation if enabled in event settings
                            if (eventSettings?.forceFirstNameUppercase) {
                              inputValue = inputValue.toUpperCase();
                            }
                            setFormData(prev => ({ ...prev, firstName: inputValue }));
                          }}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          Last Name *
                        </Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => {
                            let inputValue = e.target.value;
                            // Apply uppercase transformation if enabled in event settings
                            if (eventSettings?.forceLastNameUppercase) {
                              inputValue = inputValue.toUpperCase();
                            }
                            setFormData(prev => ({ ...prev, lastName: inputValue }));
                          }}
                          required
                        />
                      </div>

                      {/* Notes and Barcode - Side by Side */}
                      {/* Notes Field - Left Column */}
                      <div className="space-y-2">
                        <Label htmlFor="notes" className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          Notes
                        </Label>
                        <Textarea
                          id="notes"
                          value={formData.notes || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                          placeholder="Add any additional notes about this attendee..."
                          rows={2}
                          className="resize-y"
                          maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground">
                          {formData.notes?.length || 0} / 2000 characters
                        </p>
                      </div>

                      {/* Barcode Field - Right Column */}
                      <div className="space-y-2">
                        <Label htmlFor="barcodeNumber" className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          Barcode Number *
                        </Label>
                        <div className="flex space-x-2">
                          <Input
                            id="barcodeNumber"
                            value={formData.barcodeNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, barcodeNumber: e.target.value }))}
                            required
                            className="flex-1"
                          />
                          {!attendee && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={generateBarcode}
                            >
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom Fields */}
                {customFields.filter(f => f.internalFieldName !== 'notes').length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {customFields
                          .filter(f => f.internalFieldName !== 'notes') // Exclude notes - it's in Basic Information
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <div
                              key={field.id}
                              className={`space-y-2 ${field.fieldType === 'textarea' ? 'col-span-2' : ''
                                }`}
                            >
                              <Label htmlFor={field.id} className="flex items-center gap-2">
                                {getCustomFieldIcon(field.fieldType)}
                                {field.fieldName}
                                {field.required && ' *'}
                              </Label>
                              {renderCustomField(field)}
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || loadingAndGenerate}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {attendee ? 'Update' : 'Create'} Attendee
            </Button>
            {attendee && onSaveAndGenerate && (
              <Button
                type="button"
                onClick={handleSaveAndGenerate}
                disabled={loading || loadingAndGenerate}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {loadingAndGenerate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                <Printer className="mr-2 h-4 w-4" />
                Update & Generate Credential
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

export default AttendeeForm;
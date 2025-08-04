import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/components/ui/use-toast';
import { Upload, Camera, X, Save, Loader2 } from 'lucide-react';

interface CustomField {
  id: string;
  fieldName: string;
  fieldType: string;
  fieldOptions?: any;
  required: boolean;
  order: number;
}

interface AttendeeFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (attendee: any) => void;
  attendee?: any;
  customFields: CustomField[];
  eventSettings?: any;
}

declare global {
  interface Window {
    cloudinary: any;
  }
}

export default function AttendeeForm({ 
  isOpen, 
  onClose, 
  onSave, 
  attendee, 
  customFields,
  eventSettings 
}: AttendeeFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isCloudinaryOpen, setIsCloudinaryOpen] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    barcodeNumber: '',
    photoUrl: '',
    customFieldValues: {} as Record<string, string>
  });

  useEffect(() => {
    if (attendee) {
      setFormData({
        firstName: attendee.firstName || '',
        lastName: attendee.lastName || '',
        barcodeNumber: attendee.barcodeNumber || '',
        photoUrl: attendee.photoUrl || '',
        customFieldValues: attendee.customFieldValues?.reduce((acc: any, cfv: any) => {
          acc[cfv.customFieldId] = cfv.value;
          return acc;
        }, {}) || {}
      });
    } else {
      // Generate barcode for new attendee
      generateBarcode();
    }
  }, [attendee, eventSettings]);

  const generateBarcode = () => {
    if (!eventSettings) return;
    
    const { barcodeType, barcodeLength } = eventSettings;
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
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cloudinary not configured. Please check event settings.",
      });
      return;
    }

    if (window.cloudinary) {
      setIsCloudinaryOpen(true);
      // Configure crop aspect ratio
      let croppingAspectRatio = 1; // Default to square
      if (eventSettings.cloudinaryCropAspectRatio && eventSettings.cloudinaryCropAspectRatio !== 'free') {
        croppingAspectRatio = parseFloat(eventSettings.cloudinaryCropAspectRatio);
      }

      // Build widget configuration
      const widgetConfig: any = {
        cloudName: eventSettings.cloudinaryCloudName,
        uploadPreset: eventSettings.cloudinaryUploadPreset,
        sources: ['local', 'camera'],
        multiple: false,
        cropping: true,
        croppingShowDimensions: true,
        croppingCoordinatesMode: 'custom',
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

      // Configure skip crop button behavior according to Cloudinary documentation
      if (eventSettings.cloudinaryDisableSkipCrop) {
        // Disable the skip crop button and force cropping
        widgetConfig.showSkipCropButton = false;
        widgetConfig.croppingValidateMinSize = true;
      } else {
        // Allow skipping crop (default behavior)
        widgetConfig.showSkipCropButton = true;
      }

      window.cloudinary.openUploadWidget(
        widgetConfig,
        (error: any, result: any) => {
          setIsCloudinaryOpen(false);
          if (!error && result && result.event === 'success') {
            setFormData(prev => ({ ...prev, photoUrl: result.info.secure_url }));
            toast({
              title: "Success",
              description: "Photo uploaded successfully!",
            });
          } else if (error) {
            // Don't show an error toast if the user just closes the widget
            if (result && result.event !== 'close') {
              toast({
                variant: "destructive",
                title: "Upload Error",
                description: error?.message || "Failed to upload photo",
              });
            }
          }
        }
      );
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Cloudinary widget not loaded. Please refresh the page.",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.firstName || !formData.lastName || !formData.barcodeNumber) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please fill in all required fields.",
        });
        return;
      }

      // Validate required custom fields
      for (const field of customFields) {
        if (field.required && !formData.customFieldValues[field.id]) {
          toast({
            variant: "destructive",
            title: "Validation Error",
            description: `${field.fieldName} is required.`,
          });
          return;
        }
      }

      // Prepare custom field values for API
      const customFieldValues = Object.entries(formData.customFieldValues)
        .filter(([_, value]) => value)
        .map(([customFieldId, value]) => ({
          customFieldId,
          value
        }));

      const attendeeData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        barcodeNumber: formData.barcodeNumber,
        photoUrl: formData.photoUrl || null,
        customFieldValues
      };

      await onSave(attendeeData);
      onClose();
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        barcodeNumber: '',
        photoUrl: '',
        customFieldValues: {}
      });

    } catch (error) {
      console.error('Form submission error:', error);
    } finally {
      setLoading(false);
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
        className="max-w-5xl max-h-[90vh] overflow-y-auto"
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
                  <CardTitle className="text-base">Photo</CardTitle>
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
                        <Label htmlFor="firstName">First Name *</Label>
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
                        <Label htmlFor="lastName">Last Name *</Label>
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
                      <div className="col-span-2 space-y-2">
                        <Label htmlFor="barcodeNumber">Barcode Number *</Label>
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
                {customFields.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        {customFields
                          .sort((a, b) => a.order - b.order)
                          .map((field) => (
                            <div 
                              key={field.id} 
                              className={`space-y-2 ${
                                field.fieldType === 'textarea' ? 'col-span-2' : ''
                              }`}
                            >
                              <Label htmlFor={field.id}>
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
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              {attendee ? 'Update' : 'Create'} Attendee
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
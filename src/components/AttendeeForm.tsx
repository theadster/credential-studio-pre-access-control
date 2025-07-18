import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
      window.cloudinary.openUploadWidget(
        {
          cloudName: eventSettings.cloudinaryCloudName,
          uploadPreset: eventSettings.cloudinaryUploadPreset,
          sources: ['local', 'camera'],
          multiple: false,
          cropping: true,
          croppingAspectRatio: 1,
          croppingShowDimensions: true,
          croppingCoordinatesMode: 'custom',
          folder: 'attendee-photos',
          clientAllowedFormats: ['jpg', 'jpeg', 'png'],
          maxFileSize: 5000000, // 5MB
          maxImageWidth: 800,
          maxImageHeight: 800,
          theme: 'minimal'
        },
        (error: any, result: any) => {
          if (!error && result && result.event === 'success') {
            setFormData(prev => ({ ...prev, photoUrl: result.info.secure_url }));
            toast({
              title: "Success",
              description: "Photo uploaded successfully!",
            });
          } else if (error) {
            toast({
              variant: "destructive",
              title: "Upload Error",
              description: error.message || "Failed to upload photo",
            });
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
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {attendee ? 'Edit Attendee' : 'Add New Attendee'}
          </DialogTitle>
          <DialogDescription>
            {attendee ? 'Update attendee information' : 'Enter attendee details and upload a photo'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Photo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.photoUrl} />
                  <AvatarFallback>
                    {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloudinaryUpload}
                    className="w-full"
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
                    >
                      <X className="mr-2 h-4 w-4" />
                      Remove Photo
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="barcodeNumber">Barcode Number *</Label>
                <div className="flex space-x-2">
                  <Input
                    id="barcodeNumber"
                    value={formData.barcodeNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcodeNumber: e.target.value }))}
                    required
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
            </CardContent>
          </Card>

          {/* Custom Fields */}
          {customFields.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.id}>
                      {field.fieldName}
                      {field.required && ' *'}
                    </Label>
                    {renderCustomField(field)}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
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
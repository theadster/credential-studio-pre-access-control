import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Edit, Save, X, GripVertical, Type, Hash, Mail, Calendar, Link, List, CheckSquare, ToggleLeft, FileText, Settings } from "lucide-react";
import { generateInternalFieldName } from "@/util/string";
import { useToast } from "@/components/ui/use-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface CustomField {
  id?: string;
  fieldName: string;
  internalFieldName?: string;
  fieldType: string;
  fieldOptions?: any;
  required: boolean;
  order: number;
}

interface FieldMapping {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  jsonVariable: string;
  valueMapping?: { [key: string]: string }; // For boolean and select fields
}

interface EventSettings {
  id?: string;
  eventName: string;
  eventDate: string;
  eventTime?: string;
  eventLocation: string;
  timeZone: string;
  barcodeType: string;
  barcodeLength: number;
  barcodeUnique: boolean;
  forceFirstNameUppercase?: boolean;
  forceLastNameUppercase?: boolean;
  attendeeSortField?: string;
  attendeeSortDirection?: string;
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryAutoOptimize?: boolean;
  cloudinaryGenerateThumbnails?: boolean;
  cloudinaryDisableSkipCrop?: boolean;
  cloudinaryCropAspectRatio?: string;
  switchboardEnabled?: boolean;
  switchboardApiEndpoint?: string;
  switchboardAuthHeaderType?: string;
  switchboardApiKey?: string;
  switchboardRequestBody?: string;
  switchboardTemplateId?: string;
  switchboardFieldMappings?: FieldMapping[];
  oneSimpleApiEnabled?: boolean;
  oneSimpleApiUrl?: string;
  oneSimpleApiFormDataKey?: string;
  oneSimpleApiFormDataValue?: string;
  oneSimpleApiRecordTemplate?: string;
  bannerImageUrl?: string | null;
  signInBannerUrl?: string | null;
  customFields?: CustomField[];
  createdAt?: string;
  updatedAt?: string;
}

interface EventSettingsFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: EventSettings) => Promise<void>;
  eventSettings: EventSettings | null;
}

const FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "email", label: "Email" },
  { value: "date", label: "Date" },
  { value: "url", label: "URL/Link" },
  { value: "select", label: "Select" },
  { value: "checkbox", label: "Checkbox" },
  { value: "boolean", label: "Yes/No Switch" },
  { value: "textarea", label: "Textarea" }
];

const TIME_ZONES = [
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "UTC", label: "UTC" },
  { value: "Europe/London", label: "GMT" },
  { value: "Europe/Paris", label: "CET" },
  { value: "Asia/Tokyo", label: "JST" },
  { value: "Australia/Sydney", label: "AEST" }
];

// Sortable Custom Field Component
interface SortableCustomFieldProps {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onDelete: (fieldId: string) => void;
}

function SortableCustomField({ field, onEdit, onDelete }: SortableCustomFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id! });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border rounded-lg bg-background ${
        isDragging ? 'shadow-lg' : ''
      }`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{field.fieldName}</span>
            <Badge variant="outline">{field.fieldType}</Badge>
            {field.required && <Badge variant="secondary">Required</Badge>}
            {field.fieldType === "text" && field.fieldOptions?.uppercase && (
              <Badge variant="outline" className="text-xs">
                UPPERCASE
              </Badge>
            )}
          </div>
          {field.internalFieldName && (
            <div className="text-xs text-muted-foreground mt-1">
              Internal: {field.internalFieldName}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(field)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onDelete(field.id!)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function EventSettingsForm({ isOpen, onClose, onSave, eventSettings }: EventSettingsFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState<EventSettings>({
    eventName: "",
    eventDate: "",
    eventLocation: "",
    timeZone: "America/Los_Angeles",
    barcodeType: "alphanumerical",
    barcodeLength: 8,
    barcodeUnique: true,
    attendeeSortField: "lastName",
    attendeeSortDirection: "asc",
    customFields: []
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [editingFieldMapping, setEditingFieldMapping] = useState<FieldMapping | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (eventSettings) {
      // Parse the date more carefully to avoid timezone issues
      let parsedDate = "";
      let parsedTime = "";
      
      if (eventSettings.eventDate) {
        // If eventDate is already a date string (YYYY-MM-DD), use it directly
        if (typeof eventSettings.eventDate === 'string' && eventSettings.eventDate.includes('-') && !eventSettings.eventDate.includes('T')) {
          parsedDate = eventSettings.eventDate;
        } else {
          // Otherwise, parse as Date and extract date part
          const eventDateTime = new Date(eventSettings.eventDate);
          parsedDate = eventDateTime.toISOString().split('T')[0];
        }
      }
      
      // Handle time separately
      if (eventSettings.eventTime) {
        parsedTime = eventSettings.eventTime;
      }
      
      setFormData({
        ...eventSettings,
        eventDate: parsedDate,
        eventTime: parsedTime
      });
      setCustomFields(eventSettings.customFields || []);
      // Ensure fieldMappings is always an array, even if database value is malformed
      const mappings = eventSettings.switchboardFieldMappings;
      if (Array.isArray(mappings)) {
        setFieldMappings(mappings);
      } else {
        setFieldMappings([]);
      }
    } else {
      // Reset form for new event settings
      setFormData({
        eventName: "",
        eventDate: "",
        eventTime: "",
        eventLocation: "",
        timeZone: "America/Los_Angeles",
        barcodeType: "alphanumerical",
        barcodeLength: 8,
        barcodeUnique: true,
        attendeeSortField: "lastName",
        attendeeSortDirection: "asc",
        customFields: []
      });
      setCustomFields([]);
      setFieldMappings([]);
    }
  }, [eventSettings, isOpen]);

  const handleInputChange = (field: keyof EventSettings, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const settingsData = {
        ...formData,
        customFields,
        switchboardFieldMappings: fieldMappings
      };

      await onSave(settingsData);
      onClose();
      toast({
        title: "Success",
        description: eventSettings ? "Event settings updated successfully!" : "Event settings created successfully!",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save event settings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomField = () => {
    setEditingField({
      fieldName: "",
      fieldType: "text",
      required: false,
      order: customFields.length + 1
    });
    setShowFieldForm(true);
  };

  const handleEditCustomField = (field: CustomField) => {
    setEditingField(field);
    setShowFieldForm(true);
  };

  const handleSaveCustomField = (fieldData: CustomField) => {
    if (editingField?.id) {
      // Update existing field
      setCustomFields(prev => prev.map(f => f.id === editingField.id ? fieldData : f));
      
      // If this is a select field and we're editing an existing field, update field mappings
      if (fieldData.fieldType === 'select' && fieldData.fieldOptions?.options) {
        updateFieldMappingsForSelectField(fieldData, editingField);
      }
    } else {
      // Add new field
      const newField = {
        ...fieldData,
        id: `temp_${Date.now()}`,
        order: customFields.length + 1
      };
      setCustomFields(prev => [...prev, newField]);
    }
    setShowFieldForm(false);
    setEditingField(null);
  };

  // Helper function to update field mappings when select field options change
  const updateFieldMappingsForSelectField = (updatedField: CustomField, originalField: CustomField) => {
    if (updatedField.fieldType !== 'select' || !updatedField.fieldOptions?.options) {
      return;
    }

    // Find existing field mapping for this field
    const existingMappingIndex = fieldMappings.findIndex(mapping => mapping.fieldId === updatedField.id);
    
    if (existingMappingIndex === -1) {
      return; // No existing mapping, nothing to update
    }

    const existingMapping = fieldMappings[existingMappingIndex];
    const newOptions = updatedField.fieldOptions.options;
    const oldOptions = originalField.fieldOptions?.options || [];

    // Create updated value mapping
    const updatedValueMapping: { [key: string]: string } = {};

    // Keep existing mappings for options that still exist
    if (existingMapping.valueMapping) {
      newOptions.forEach((option: string) => {
        if (existingMapping.valueMapping![option]) {
          updatedValueMapping[option] = existingMapping.valueMapping![option];
        } else {
          // New option - initialize with empty mapping
          updatedValueMapping[option] = '';
        }
      });
    } else {
      // No existing value mapping, initialize all options with empty mappings
      newOptions.forEach((option: string) => {
        updatedValueMapping[option] = '';
      });
    }

    // Update the field mapping
    const updatedMapping: FieldMapping = {
      ...existingMapping,
      fieldName: updatedField.fieldName, // Update field name in case it changed
      valueMapping: updatedValueMapping
    };

    setFieldMappings(prev => prev.map((mapping, index) => 
      index === existingMappingIndex ? updatedMapping : mapping
    ));
  };

  const handleDeleteCustomField = (fieldId: string) => {
    setCustomFields(prev => prev.filter(f => f.id !== fieldId));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCustomFields((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        
        // Update order values
        const updatedItems = newItems.map((item, index) => ({
          ...item,
          order: index + 1
        }));

        // If all fields have real IDs (not temp IDs), save the reorder immediately
        const hasOnlyRealIds = updatedItems.every(item => item.id && !item.id.startsWith('temp_'));
        
        if (hasOnlyRealIds) {
          // Save the reorder to the database immediately
          const fieldOrders = updatedItems.map(item => ({
            id: item.id,
            order: item.order
          }));

          fetch('/api/custom-fields/reorder', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fieldOrders }),
          }).catch(error => {
            console.error('Error saving field order:', error);
            toast({
              variant: "destructive",
              title: "Error",
              description: "Failed to save field order. Please try again.",
            });
          });
        }

        return updatedItems;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {eventSettings ? "Edit Event Settings" : "Create Event Settings"}
          </DialogTitle>
          <DialogDescription>
            Configure your event details, barcode settings, and integrations.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
              <TabsTrigger value="barcode">Barcode</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Event Information</CardTitle>
                  <CardDescription>Basic details about your event</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventName">Event Name *</Label>
                      <Input
                        id="eventName"
                        value={formData.eventName}
                        onChange={(e) => handleInputChange("eventName", e.target.value)}
                        placeholder="Enter event name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="eventDate">Event Date *</Label>
                      <Input
                        id="eventDate"
                        type="date"
                        value={formData.eventDate}
                        onChange={(e) => handleInputChange("eventDate", e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="eventTime">Event Time</Label>
                      <Input
                        id="eventTime"
                        type="time"
                        value={formData.eventTime || ""}
                        onChange={(e) => handleInputChange("eventTime", e.target.value)}
                        placeholder="Select event time"
                      />
                    </div>
                    <div>
                      <Label htmlFor="timeZone">Time Zone</Label>
                      <Select value={formData.timeZone} onValueChange={(value) => handleInputChange("timeZone", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_ZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="eventLocation">Event Location *</Label>
                    <Input
                      id="eventLocation"
                      value={formData.eventLocation}
                      onChange={(e) => handleInputChange("eventLocation", e.target.value)}
                      placeholder="Enter event location"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="bannerImageUrl">Banner Image URL</Label>
                    <Input
                      id="bannerImageUrl"
                      value={formData.bannerImageUrl || ""}
                      onChange={(e) => handleInputChange("bannerImageUrl", e.target.value)}
                      placeholder="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    />
                  </div>
                  <div>
                    <Label htmlFor="signInBannerUrl">Sign In Banner URL</Label>
                    <Input
                      id="signInBannerUrl"
                      value={formData.signInBannerUrl || ""}
                      onChange={(e) => handleInputChange("signInBannerUrl", e.target.value)}
                      placeholder="https://images.unsplash.com/photo-1540575467063-178a50c2df87?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Name Field Settings</CardTitle>
                  <CardDescription>Configure how attendee names are handled</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Force First Name to Uppercase</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically convert first names to uppercase when entered
                      </p>
                    </div>
                    <Switch
                      checked={formData.forceFirstNameUppercase || false}
                      onCheckedChange={(checked) => handleInputChange("forceFirstNameUppercase", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="text-sm font-medium">Force Last Name to Uppercase</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically convert last names to uppercase when entered
                      </p>
                    </div>
                    <Switch
                      checked={formData.forceLastNameUppercase || false}
                      onCheckedChange={(checked) => handleInputChange("forceLastNameUppercase", checked)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Attendee List Settings</CardTitle>
                  <CardDescription>Configure default sorting for the attendee list</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="attendeeSortField">Sort By</Label>
                      <Select value={formData.attendeeSortField || 'lastName'} onValueChange={(value) => handleInputChange("attendeeSortField", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lastName">Last Name</SelectItem>
                          <SelectItem value="firstName">First Name</SelectItem>
                          <SelectItem value="createdAt">Upload Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="attendeeSortDirection">Sort Direction</Label>
                      <Select value={formData.attendeeSortDirection || 'asc'} onValueChange={(value) => handleInputChange("attendeeSortDirection", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="barcode" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Barcode Configuration</CardTitle>
                  <CardDescription>Configure how barcodes are generated for attendees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="barcodeType">Barcode Type</Label>
                      <Select value={formData.barcodeType} onValueChange={(value) => handleInputChange("barcodeType", value)}>
                        <SelectTrigger>
                          <SelectValue>
                            {formData.barcodeType === 'numerical'
                              ? 'Numerical (0-9)'
                              : 'Alphanumerical (A-Z, 0-9)'}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="numerical">Numerical (0-9)</SelectItem>
                          <SelectItem value="alphanumerical">Alphanumerical (A-Z, 0-9)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="barcodeLength">Barcode Length</Label>
                      <Input
                        id="barcodeLength"
                        type="number"
                        min="4"
                        max="20"
                        value={formData.barcodeLength}
                        onChange={(e) => handleInputChange("barcodeLength", parseInt(e.target.value))}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="barcodeUnique"
                      checked={formData.barcodeUnique}
                      onCheckedChange={(checked) => handleInputChange("barcodeUnique", checked)}
                    />
                    <Label htmlFor="barcodeUnique">Ensure unique barcodes</Label>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="integrations" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Cloudinary Integration
                  </CardTitle>
                  <CardDescription>Configure Cloudinary for image uploads and management</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enable Cloudinary Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <Label htmlFor="cloudinary-enabled" className="text-base font-medium">
                        Enable Cloudinary Integration
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow image uploads and management through Cloudinary
                      </p>
                    </div>
                    <Switch
                      id="cloudinary-enabled"
                      checked={formData.cloudinaryEnabled || false}
                      onCheckedChange={(checked) => handleInputChange("cloudinaryEnabled", checked)}
                    />
                  </div>
                  
                  {formData.cloudinaryEnabled && (
                    <div className="space-y-6">
                      {/* API Credentials Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">API Credentials</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cloudinaryCloudName" className="text-sm font-medium">
                              Cloud Name
                            </Label>
                            <Input
                              id="cloudinaryCloudName"
                              value={formData.cloudinaryCloudName || ""}
                              onChange={(e) => handleInputChange("cloudinaryCloudName", e.target.value)}
                              placeholder="your-cloud-name"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              Found in your Cloudinary dashboard
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="cloudinaryApiKey" className="text-sm font-medium">
                              API Key
                            </Label>
                            <Input
                              id="cloudinaryApiKey"
                              value={formData.cloudinaryApiKey || ""}
                              onChange={(e) => handleInputChange("cloudinaryApiKey", e.target.value)}
                              placeholder="123456789012345"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              Your Cloudinary API key
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cloudinaryApiSecret" className="text-sm font-medium">
                              API Secret
                            </Label>
                            <Input
                              id="cloudinaryApiSecret"
                              type="password"
                              value={formData.cloudinaryApiSecret || ""}
                              onChange={(e) => handleInputChange("cloudinaryApiSecret", e.target.value)}
                              placeholder="••••••••••••••••••••••••••••"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              Keep this secret secure and never share it publicly
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="cloudinaryUploadPreset" className="text-sm font-medium">
                              Upload Preset
                            </Label>
                            <Input
                              id="cloudinaryUploadPreset"
                              value={formData.cloudinaryUploadPreset || ""}
                              onChange={(e) => handleInputChange("cloudinaryUploadPreset", e.target.value)}
                              placeholder="your-upload-preset"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              Create an unsigned upload preset in Cloudinary settings
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Upload Settings Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">Upload Settings</h4>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Auto-optimize images</Label>
                              <p className="text-xs text-muted-foreground">
                                Automatically optimize uploaded images
                              </p>
                            </div>
                            <Switch
                              checked={formData.cloudinaryAutoOptimize || false}
                              onCheckedChange={(checked) => handleInputChange("cloudinaryAutoOptimize", checked)}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="space-y-1">
                              <Label className="text-sm font-medium">Generate thumbnails</Label>
                              <p className="text-xs text-muted-foreground">
                                Create thumbnail versions of images
                              </p>
                            </div>
                            <Switch
                              checked={formData.cloudinaryGenerateThumbnails || false}
                              onCheckedChange={(checked) => handleInputChange("cloudinaryGenerateThumbnails", checked)}
                            />
                          </div>
                        </div>
                        
                        {/* Crop Settings */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Settings className="h-4 w-4" />
                            <h4 className="text-sm font-semibold">Crop Settings</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="space-y-1">
                                <Label className="text-sm font-medium">Disable "Skip Crop" button</Label>
                                <p className="text-xs text-muted-foreground">
                                  Force users to crop their images before uploading
                                </p>
                              </div>
                              <Switch
                                checked={formData.cloudinaryDisableSkipCrop || false}
                                onCheckedChange={(checked) => handleInputChange("cloudinaryDisableSkipCrop", checked)}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="cloudinaryCropAspectRatio" className="text-sm font-medium">
                                Crop Aspect Ratio
                              </Label>
                              <Select 
                                value={formData.cloudinaryCropAspectRatio || "1"} 
                                onValueChange={(value) => handleInputChange("cloudinaryCropAspectRatio", value)}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">Square (1:1)</SelectItem>
                                  <SelectItem value="1.33">Landscape (4:3)</SelectItem>
                                  <SelectItem value="0.75">Portrait (3:4)</SelectItem>
                                  <SelectItem value="1.78">Widescreen (16:9)</SelectItem>
                                  <SelectItem value="0.56">Vertical (9:16)</SelectItem>
                                  <SelectItem value="1.5">Photo (3:2)</SelectItem>
                                  <SelectItem value="0.67">Photo Portrait (2:3)</SelectItem>
                                  <SelectItem value="free">Free Form</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                Set the required aspect ratio for cropped images
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Connection Status */}
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Connection Status
                          </span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                          {formData.cloudinaryCloudName && formData.cloudinaryApiKey && formData.cloudinaryApiSecret && formData.cloudinaryUploadPreset
                            ? "Ready to upload - all credentials provided"
                            : "Waiting for all credentials to be configured"
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Switchboard Canvas Integration
                  </CardTitle>
                  <CardDescription>Configure credential printing and generation through Switchboard Canvas</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enable Switchboard Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <Label htmlFor="switchboard-enabled" className="text-base font-medium">
                        Enable Switchboard Canvas Integration
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow credential generation and printing through Switchboard Canvas
                      </p>
                    </div>
                    <Switch
                      id="switchboard-enabled"
                      checked={formData.switchboardEnabled || false}
                      onCheckedChange={(checked) => handleInputChange("switchboardEnabled", checked)}
                    />
                  </div>
                  
                  {formData.switchboardEnabled && (
                    <div className="space-y-6">
                      {/* API Configuration Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">API Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="switchboardApiEndpoint" className="text-sm font-medium">
                              Switchboard API Endpoint *
                            </Label>
                            <Input
                              id="switchboardApiEndpoint"
                              value={formData.switchboardApiEndpoint || ""}
                              onChange={(e) => handleInputChange("switchboardApiEndpoint", e.target.value)}
                              placeholder="https://api.switchboard.ai/v1/generate"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              The full URL endpoint for the Switchboard Canvas API
                            </p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="switchboardAuthHeaderType" className="text-sm font-medium">
                                Authentication Header Type
                              </Label>
                              <Select 
                                value={formData.switchboardAuthHeaderType || "Bearer"} 
                                onValueChange={(value) => handleInputChange("switchboardAuthHeaderType", value)}
                              >
                                <SelectTrigger className="h-10">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Bearer">Bearer</SelectItem>
                                  <SelectItem value="API-Key">API-Key</SelectItem>
                                  <SelectItem value="Authorization">Authorization</SelectItem>
                                  <SelectItem value="X-API-Key">X-API-Key</SelectItem>
                                </SelectContent>
                              </Select>
                              <p className="text-xs text-muted-foreground">
                                The type of authentication header to use
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="switchboardApiKey" className="text-sm font-medium">
                                Authentication Value (API Key) *
                              </Label>
                              <Input
                                id="switchboardApiKey"
                                type="password"
                                value={formData.switchboardApiKey || ""}
                                onChange={(e) => handleInputChange("switchboardApiKey", e.target.value)}
                                placeholder="your-switchboard-api-key"
                                className="h-10"
                              />
                              <p className="text-xs text-muted-foreground">
                                Your Switchboard Canvas API key
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Request Configuration Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">Request Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="switchboardRequestBody" className="text-sm font-medium">
                              API Request Body (JSON) *
                            </Label>
                            <Textarea
                              id="switchboardRequestBody"
                              value={formData.switchboardRequestBody || ""}
                              onChange={(e) => handleInputChange("switchboardRequestBody", e.target.value)}
                              placeholder={`{
  "template_id": "{{template_id}}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "barcodeNumber": "{{barcodeNumber}}",
    "eventName": "{{eventName}}",
    "eventDate": "{{eventDate}}",
    "eventLocation": "{{eventLocation}}"
  }
}`}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              The JSON payload to send to the Switchboard API. Use placeholders for dynamic data.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Field Mappings Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Link className="h-4 w-4" />
                            <h4 className="text-sm font-semibold">Field Mappings</h4>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowMappingForm(true)}
                            disabled={customFields.length === 0}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Mapping
                          </Button>
                        </div>
                        
                        <div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
                          <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                            <strong>Field Mappings</strong> allow you to map custom field responses to different variable names in your JSON request. 
                            This is especially useful for boolean (Yes/No) and select fields where you want to transform the values.
                          </p>
                          
                          {fieldMappings.length === 0 ? (
                            <div className="text-center py-4 text-purple-600 dark:text-purple-400 text-sm">
                              {customFields.length === 0 
                                ? "Create custom fields first to add field mappings"
                                : "No field mappings configured. Click 'Add Mapping' to create one."
                              }
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {fieldMappings.map((mapping, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-background border rounded-lg">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-medium text-sm">{mapping.fieldName}</span>
                                      <Badge variant="outline" className="text-xs">{mapping.fieldType}</Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                      Maps to: <code className="bg-muted px-1 rounded">{mapping.jsonVariable}</code>
                                    </div>
                                    {mapping.valueMapping && Object.keys(mapping.valueMapping).length > 0 && (
                                      <div className="text-xs text-muted-foreground mt-1">
                                        Value mappings: {Object.entries(mapping.valueMapping).map(([key, value]) => (
                                          <span key={key} className="inline-block mr-2">
                                            <code className="bg-muted px-1 rounded">{key}</code> → <code className="bg-muted px-1 rounded">{value}</code>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingFieldMapping(mapping);
                                        setShowMappingForm(true);
                                      }}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => {
                                        setFieldMappings(prev => prev.filter((_, i) => i !== index));
                                      }}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Placeholders Documentation */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">Available Placeholders</h4>
                        </div>
                        
                        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                            <strong>Placeholders</strong> are dynamic values that get replaced with actual attendee data when generating credentials. 
                            Use the format <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">{"{{placeholder_name}}"}</code> in your JSON request body.
                          </p>
                          
                          <div className="space-y-3">
                            <div>
                              <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Standard Fields:</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{firstName}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{lastName}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{barcodeNumber}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{photoUrl}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{eventName}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{eventDate}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{eventTime}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{eventLocation}}"}</code>
                                <code className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">{"{{template_id}}"}</code>
                              </div>
                            </div>
                            
                            {customFields.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Custom Fields:</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                  {customFields
                                    .sort((a, b) => a.order - b.order)
                                    .map((field) => (
                                      <code key={field.id} className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                                        {`{{${field.internalFieldName || generateInternalFieldName(field.fieldName)}}}`}
                                      </code>
                                    ))}
                                </div>
                              </div>
                            )}
                            
                            {fieldMappings.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Mapped Fields:</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                  {fieldMappings.map((mapping, index) => (
                                    <code key={index} className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded">
                                      {`{{${mapping.jsonVariable}}}`}
                                    </code>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Connection Status and Test */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              Integration Status
                            </span>
                          </div>
                          <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                            {formData.switchboardApiEndpoint && formData.switchboardApiKey && formData.switchboardRequestBody
                              ? "Ready to generate credentials - all configuration provided"
                              : "Waiting for API endpoint, authentication, and request body configuration"
                            }
                          </p>
                        </div>
                        
                        {formData.switchboardApiEndpoint && formData.switchboardApiKey && (
                          <div className="p-4 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-medium">Test Connection</h5>
                                <p className="text-xs text-muted-foreground">
                                  Test your Switchboard Canvas API configuration
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const response = await fetch('/api/switchboard/test', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' }
                                    });
                                    const result = await response.json();
                                    
                                    if (result.success) {
                                      toast({
                                        title: "Connection Successful",
                                        description: "Switchboard Canvas API is responding correctly",
                                      });
                                    } else {
                                      toast({
                                        variant: "destructive",
                                        title: "Connection Failed",
                                        description: `API returned ${result.status}: ${JSON.stringify(result.response)}`,
                                      });
                                    }
                                  } catch (error) {
                                    toast({
                                      variant: "destructive",
                                      title: "Test Failed",
                                      description: "Failed to test Switchboard Canvas connection",
                                    });
                                  }
                                }}
                              >
                                Test Connection
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    OneSimpleAPI Integration
                  </CardTitle>
                  <CardDescription>Configure bulk PDF generation using existing credential URLs through OneSimpleAPI</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Enable OneSimpleAPI Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="space-y-1">
                      <Label htmlFor="onesimpleapi-enabled" className="text-base font-medium">
                        Enable OneSimpleAPI Integration
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow bulk PDF generation from credential URLs using OneSimpleAPI
                      </p>
                    </div>
                    <Switch
                      id="onesimpleapi-enabled"
                      checked={formData.oneSimpleApiEnabled || false}
                      onCheckedChange={(checked) => handleInputChange("oneSimpleApiEnabled", checked)}
                    />
                  </div>
                  
                  {formData.oneSimpleApiEnabled && (
                    <div className="space-y-6">
                      {/* API Configuration Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">API Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="oneSimpleApiUrl" className="text-sm font-medium">
                              API URL *
                            </Label>
                            <Input
                              id="oneSimpleApiUrl"
                              value={formData.oneSimpleApiUrl || ""}
                              onChange={(e) => handleInputChange("oneSimpleApiUrl", e.target.value)}
                              placeholder="https://api.onesimpleapi.com/pdf?token=your-token-here"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              The OneSimpleAPI endpoint URL with your authentication token included
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Form Data Section */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">Form Data Configuration</h4>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="oneSimpleApiFormDataKey" className="text-sm font-medium">
                              Form Data Key *
                            </Label>
                            <Input
                              id="oneSimpleApiFormDataKey"
                              value={formData.oneSimpleApiFormDataKey || ""}
                              onChange={(e) => handleInputChange("oneSimpleApiFormDataKey", e.target.value)}
                              placeholder="html"
                              className="h-10"
                            />
                            <p className="text-xs text-muted-foreground">
                              The key name for the form data field (e.g., "html", "content", "data")
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="oneSimpleApiFormDataValue" className="text-sm font-medium">
                              Main HTML Template *
                            </Label>
                            <Textarea
                              id="oneSimpleApiFormDataValue"
                              value={formData.oneSimpleApiFormDataValue || ""}
                              onChange={(e) => handleInputChange("oneSimpleApiFormDataValue", e.target.value)}
                              placeholder={`<!DOCTYPE html>
<html>
<head>
    <title>{{eventName}} - Credentials</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .credential { text-align: center; page-break-after: always; }
        .credential:last-child { page-break-after: avoid; }
        .credential img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    {{credentialRecords}}
</body>
</html>`}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              {`Main HTML structure. Use {{credentialRecords}} placeholder where individual records should be inserted.`}
                            </p>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="oneSimpleApiRecordTemplate" className="text-sm font-medium">
                              Record Template *
                            </Label>
                            <Textarea
                              id="oneSimpleApiRecordTemplate"
                              value={formData.oneSimpleApiRecordTemplate || ""}
                              onChange={(e) => handleInputChange("oneSimpleApiRecordTemplate", e.target.value)}
                              placeholder={`    <div class="credential">
        <h1>{{eventName}}</h1>
        <img src="{{credentialUrl}}" alt="Credential for {{firstName}} {{lastName}}" />
        <h2>{{firstName}} {{lastName}}</h2>
        <p>Barcode: {{barcodeNumber}}</p>
        <p>{{eventDate}} at {{eventLocation}}</p>
    </div>`}
                              className="min-h-[200px] font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              {`HTML template that will be repeated for each selected attendee record. Use placeholders like {{credentialUrl}}, {{firstName}}, {{lastName}}, etc.`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Available Placeholders */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <h4 className="text-sm font-semibold">Available Placeholders</h4>
                        </div>
                        
                        <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20">
                          <p className="text-sm text-orange-800 dark:text-orange-200 mb-3">
                            <strong>Placeholders</strong> are dynamic values that get replaced with actual attendee data when generating PDFs. 
                            Use the format <code className="bg-orange-100 dark:bg-orange-900 px-1 rounded">{"{{placeholder_name}}"}</code> in your HTML template.
                          </p>
                          
                          <div className="space-y-3">
                            <div>
                              <h5 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">Standard Fields:</h5>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{firstName}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{lastName}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{barcodeNumber}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{photoUrl}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{credentialUrl}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{eventName}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{eventDate}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{eventTime}}"}</code>
                                <code className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">{"{{eventLocation}}"}</code>
                              </div>
                            </div>
                            
                            {customFields.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">Custom Fields:</h5>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                                  {customFields
                                    .sort((a, b) => a.order - b.order)
                                    .map((field) => (
                                      <code key={field.id} className="bg-orange-100 dark:bg-orange-900 px-2 py-1 rounded">
                                        {`{{${field.internalFieldName || generateInternalFieldName(field.fieldName)}}}`}
                                      </code>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Usage Information */}
                      <div className="space-y-4">
                        <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              How it works
                            </span>
                          </div>
                          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                            <p>
                              1. <strong>API URL:</strong> Include your authentication token directly in the URL for secure access.
                            </p>
                            <p>
                              2. <strong>Form Data:</strong> The HTML template will be sent as form data using the specified key.
                            </p>
                            <p>
                              3. <strong>Bulk Processing:</strong> Generate PDFs for multiple attendees at once using their stored credential URLs.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Connection Status */}
                      <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            Integration Status
                          </span>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                          {formData.oneSimpleApiUrl && formData.oneSimpleApiFormDataKey && formData.oneSimpleApiFormDataValue && formData.oneSimpleApiRecordTemplate
                            ? "Ready to generate PDFs - all configuration provided"
                            : "Waiting for API URL, form data key, main template, and record template configuration"
                          }
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="custom-fields" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Custom Fields
                    <Button type="button" size="sm" onClick={handleAddCustomField}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Field
                    </Button>
                  </CardTitle>
                  <CardDescription>Add custom fields to collect additional attendee information</CardDescription>
                </CardHeader>
                <CardContent>
                  {customFields.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No custom fields configured. Click "Add Field" to create one.
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext
                        items={customFields.map(field => field.id!)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {customFields
                            .sort((a, b) => a.order - b.order)
                            .map((field) => (
                              <SortableCustomField
                                key={field.id}
                                field={field}
                                onEdit={handleEditCustomField}
                                onDelete={handleDeleteCustomField}
                              />
                            ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {eventSettings ? "Update Settings" : "Create Settings"}
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Custom Field Form Modal */}
        {showFieldForm && (
          <CustomFieldForm
            isOpen={showFieldForm}
            field={editingField}
            onSave={handleSaveCustomField}
            onCancel={() => {
              setShowFieldForm(false);
              setEditingField(null);
            }}
          />
        )}

        {/* Field Mapping Form Modal */}
        {showMappingForm && (
          <FieldMappingForm
            isOpen={showMappingForm}
            customFields={customFields}
            editingMapping={editingFieldMapping}
            onSave={(mapping) => {
              if (editingFieldMapping) {
                // Update existing mapping
                setFieldMappings(prev => prev.map(m => 
                  m.fieldId === editingFieldMapping.fieldId && m.jsonVariable === editingFieldMapping.jsonVariable 
                    ? mapping 
                    : m
                ));
              } else {
                // Add new mapping
                setFieldMappings(prev => [...prev, mapping]);
              }
              setShowMappingForm(false);
              setEditingFieldMapping(null);
            }}
            onCancel={() => {
              setShowMappingForm(false);
              setEditingFieldMapping(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Sortable Select Option Component
interface SortableSelectOptionProps {
  option: string;
  index: number;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

function SortableSelectOption({ option, index, onUpdate, onRemove }: SortableSelectOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-2">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        value={option}
        onChange={(e) => onUpdate(index, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="h-9"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Custom Field Form Component
interface CustomFieldFormProps {
  isOpen: boolean;
  field: CustomField | null;
  onSave: (field: CustomField) => void;
  onCancel: () => void;
}

function CustomFieldForm({ isOpen, field, onSave, onCancel }: CustomFieldFormProps) {
  const [fieldData, setFieldData] = useState<CustomField>({
    fieldName: "",
    fieldType: "text",
    required: false,
    order: 1,
  });
  const [selectOptions, setSelectOptions] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (field) {
      setFieldData(field);
      if (field.fieldType === "select" && Array.isArray(field.fieldOptions?.options)) {
        setSelectOptions(field.fieldOptions.options);
      } else {
        setSelectOptions([]);
      }
    } else {
      setFieldData({
        fieldName: "",
        fieldType: "text",
        required: false,
        order: 1,
      });
      setSelectOptions([]);
    }
  }, [field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let fieldOptions: any = {};
    
    if (fieldData.fieldType === "select") {
      fieldOptions.options = selectOptions;
    }
    
    if (fieldData.fieldType === "text") {
      fieldOptions.uppercase = fieldData.fieldOptions?.uppercase || false;
    }
    
    const finalFieldData = {
      ...fieldData,
      fieldOptions: Object.keys(fieldOptions).length > 0 ? fieldOptions : undefined
    };

    onSave(finalFieldData);
  };

  const addSelectOption = () => {
    setSelectOptions(prev => [...prev, ""]);
  };

  const updateSelectOption = (index: number, value: string) => {
    setSelectOptions(prev => prev.map((opt, i) => i === index ? value : opt));
  };

  const removeSelectOption = (index: number) => {
    setSelectOptions(prev => prev.filter((_, i) => i !== index));
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectOptions((items) => {
        const oldIndex = parseInt(String(active.id).replace('option-', ''));
        const newIndex = parseInt(String(over.id).replace('option-', ''));
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Get placeholder text based on field type
  const getPlaceholderText = (type: string) => {
    switch (type) {
      case "text":
        return "e.g., Company Name, Job Title";
      case "number":
        return "e.g., Age, Years of Experience";
      case "email":
        return "e.g., Work Email, Personal Email";
      case "date":
        return "e.g., Birth Date, Start Date";
      case "url":
        return "e.g., LinkedIn Profile, Website";
      case "select":
        return "e.g., Department, T-Shirt Size";
      case "checkbox":
        return "e.g., Newsletter Subscription, Terms Agreement";
      case "boolean":
        return "e.g., VIP Status, First Time Attendee";
      case "textarea":
        return "e.g., Bio, Special Requirements";
      default:
        return "Enter field name";
    }
  };

  // Get icon for field type
  const getFieldIcon = (type: string) => {
    switch (type) {
      case "text":
        return <Type className="h-4 w-4" />;
      case "number":
        return <Hash className="h-4 w-4" />;
      case "email":
        return <Mail className="h-4 w-4" />;
      case "date":
        return <Calendar className="h-4 w-4" />;
      case "url":
        return <Link className="h-4 w-4" />;
      case "select":
        return <List className="h-4 w-4" />;
      case "checkbox":
        return <CheckSquare className="h-4 w-4" />;
      case "boolean":
        return <ToggleLeft className="h-4 w-4" />;
      case "textarea":
        return <FileText className="h-4 w-4" />;
      default:
        return <Type className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {field?.id ? "Edit Custom Field" : "Add Custom Field"}
            </DialogTitle>
            <DialogDescription>
              Define a new piece of information to collect from attendees.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 py-6">
            <div>
              <Label htmlFor="fieldName" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Type className="h-4 w-4" />
                Field Name *
              </Label>
              <Input
                id="fieldName"
                value={fieldData.fieldName}
                onChange={(e) => setFieldData(prev => ({ ...prev, fieldName: e.target.value }))}
                placeholder={getPlaceholderText(fieldData.fieldType)}
                required
                className="h-10"
              />
              {fieldData.fieldName && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
                  <span className="font-medium">Internal name:</span> {generateInternalFieldName(fieldData.fieldName)}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="fieldType" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Settings className="h-4 w-4" />
                Field Type
              </Label>
              <Select 
                value={fieldData.fieldType} 
                onValueChange={(value) => setFieldData(prev => ({ ...prev, fieldType: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <span className="flex items-center gap-2">
                        {getFieldIcon(type.value)} {type.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {fieldData.fieldType === "select" && (
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                  <List className="h-4 w-4" />
                  Select Options
                </Label>
                <div className="space-y-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleOptionDragEnd}
                  >
                    <SortableContext
                      items={selectOptions.map((_, index) => `option-${index}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectOptions.map((option, index) => (
                        <SortableSelectOption
                          key={`option-${index}`}
                          index={index}
                          option={option}
                          onUpdate={updateSelectOption}
                          onRemove={removeSelectOption}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={addSelectOption}
                    className="h-9"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            {fieldData.fieldType === "text" && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Switch
                  id="uppercase"
                  checked={fieldData.fieldOptions?.uppercase || false}
                  onCheckedChange={(checked) => setFieldData(prev => ({ 
                    ...prev, 
                    fieldOptions: { 
                      ...prev.fieldOptions, 
                      uppercase: checked 
                    } 
                  }))}
                />
                <Label htmlFor="uppercase" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Type className="h-4 w-4" />
                  Convert to uppercase
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <Switch
                id="required"
                checked={fieldData.required}
                onCheckedChange={(checked) => setFieldData(prev => ({ ...prev, required: checked }))}
              />
              <Label htmlFor="required" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <CheckSquare className="h-4 w-4" />
                Required field
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              <Save className="mr-2 h-4 w-4" />
              {field?.id ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Field Mapping Form Component
interface FieldMappingFormProps {
  isOpen: boolean;
  customFields: CustomField[];
  editingMapping?: FieldMapping | null;
  onSave: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

function FieldMappingForm({ isOpen, customFields, editingMapping, onSave, onCancel }: FieldMappingFormProps) {
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [jsonVariable, setJsonVariable] = useState("");
  const [valueMapping, setValueMapping] = useState<{ [key: string]: string }>({});

  // Filter fields that support mapping (boolean and select)
  const mappableFields = customFields.filter(field => 
    field.fieldType === 'boolean' || field.fieldType === 'select'
  );

  // Initialize form with editing data
  useEffect(() => {
    if (editingMapping) {
      const field = customFields.find(f => f.id === editingMapping.fieldId);
      setSelectedField(field || null);
      setJsonVariable(editingMapping.jsonVariable);
      setValueMapping(editingMapping.valueMapping || {});
    } else {
      setSelectedField(null);
      setJsonVariable("");
      setValueMapping({});
    }
  }, [editingMapping, customFields]);

  useEffect(() => {
    if (selectedField && !editingMapping) {
      // Initialize value mapping based on field type (only for new mappings)
      if (selectedField.fieldType === 'boolean') {
        setValueMapping({
          'yes': '',
          'no': ''
        });
      } else if (selectedField.fieldType === 'select' && selectedField.fieldOptions?.options) {
        const mapping: { [key: string]: string } = {};
        selectedField.fieldOptions.options.forEach((option: string) => {
          mapping[option] = '';
        });
        setValueMapping(mapping);
      }
    }
  }, [selectedField, editingMapping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedField || !jsonVariable.trim()) {
      return;
    }

    // Clean up value mapping - remove empty values
    const cleanedValueMapping: { [key: string]: string } = {};
    Object.entries(valueMapping).forEach(([key, value]) => {
      if (value.trim()) {
        cleanedValueMapping[key] = value.trim();
      }
    });

    const mapping: FieldMapping = {
      fieldId: selectedField.id!,
      fieldName: selectedField.fieldName,
      fieldType: selectedField.fieldType,
      jsonVariable: jsonVariable.trim(),
      valueMapping: Object.keys(cleanedValueMapping).length > 0 ? cleanedValueMapping : undefined
    };

    onSave(mapping);
  };

  const updateValueMapping = (key: string, value: string) => {
    setValueMapping(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link className="h-5 w-5" />
              {editingMapping ? "Edit Field Mapping" : "Add Field Mapping"}
            </DialogTitle>
            <DialogDescription>
              Map custom field responses to specific variable names for your JSON request body.
            </DialogDescription>
          </DialogHeader>
        
          <div className="space-y-5 py-6">
            <div>
              <Label htmlFor="customField" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Settings className="h-4 w-4" />
                Custom Field *
              </Label>
              <Select 
                value={selectedField?.id || ""} 
                onValueChange={(value) => {
                  const field = mappableFields.find(f => f.id === value);
                  setSelectedField(field || null);
                  if (!editingMapping) {
                    setJsonVariable("");
                    setValueMapping({});
                  }
                }}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select a custom field to map" />
                </SelectTrigger>
                <SelectContent>
                  {mappableFields.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No boolean or select fields available
                    </SelectItem>
                  ) : (
                    mappableFields.map((field) => (
                      <SelectItem key={field.id} value={field.id!}>
                        <div className="flex items-center gap-2">
                          {field.fieldType === 'boolean' ? (
                            <ToggleLeft className="h-4 w-4" />
                          ) : (
                            <List className="h-4 w-4" />
                          )}
                          <span>{field.fieldName}</span>
                          <Badge variant="outline" className="text-xs">{field.fieldType}</Badge>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only boolean (Yes/No) and select fields can be mapped
              </p>
            </div>

            {selectedField && (
              <>
                <div>
                  <Label htmlFor="jsonVariable" className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Type className="h-4 w-4" />
                    JSON Variable Name *
                  </Label>
                  <Input
                    id="jsonVariable"
                    value={jsonVariable}
                    onChange={(e) => setJsonVariable(e.target.value)}
                    placeholder="e.g., vipStatus, membershipLevel"
                    required
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The variable name to use in your JSON request body
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Hash className="h-4 w-4" />
                    Value Mappings
                  </Label>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Map the field responses to specific values in your JSON:
                    </p>
                    
                    {Object.entries(valueMapping).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <code className="bg-muted px-2 py-1 rounded text-xs font-mono whitespace-nowrap">
                            {key}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <Input
                            value={value}
                            onChange={(e) => updateValueMapping(key, e.target.value)}
                            placeholder={`Value for "${key}"`}
                            className="h-9 flex-1"
                          />
                        </div>
                      </div>
                    ))}
                    
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Example:</strong> For a "VIP Status" boolean field, you might map:
                        <br />
                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">yes</code> → <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">1</code>
                        <br />
                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">no</code> → <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">0</code>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={!selectedField || !jsonVariable.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {editingMapping ? "Update Mapping" : "Add Mapping"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  cloudinaryEnabled?: boolean;
  cloudinaryCloudName?: string;
  cloudinaryApiKey?: string;
  cloudinaryApiSecret?: string;
  cloudinaryUploadPreset?: string;
  cloudinaryAutoOptimize?: boolean;
  cloudinaryGenerateThumbnails?: boolean;
  cloudinaryDisableSkipCrop?: boolean;
  cloudinaryCropAspectRatio?: string;
  switchboardApiKey?: string;
  switchboardTemplateId?: string;
  bannerImageUrl?: string | null;
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
    customFields: []
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showFieldForm, setShowFieldForm] = useState(false);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Function to get display text for barcode type
  const getBarcodeTypeDisplay = (value: string) => {
    switch (value) {
      case "numerical":
        return "Numerical (0-9)";
      case "alphanumerical":
        return "Alphanumerical (A-Z, 0-9)";
      default:
        return "Select barcode type";
    }
  };

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
        customFields: []
      });
      setCustomFields([]);
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
        customFields
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
              <TabsTrigger value="barcode">Barcode</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
              <TabsTrigger value="custom-fields">Custom Fields</TabsTrigger>
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
                          <SelectValue placeholder="Select barcode type" />
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
                  <CardTitle>Switchboard Canvas Settings</CardTitle>
                  <CardDescription>Configure credential printing integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="switchboardApiKey">API Key</Label>
                      <Input
                        id="switchboardApiKey"
                        type="password"
                        value={formData.switchboardApiKey || ""}
                        onChange={(e) => handleInputChange("switchboardApiKey", e.target.value)}
                        placeholder="your-switchboard-api-key"
                      />
                    </div>
                    <div>
                      <Label htmlFor="switchboardTemplateId">Template ID</Label>
                      <Input
                        id="switchboardTemplateId"
                        value={formData.switchboardTemplateId || ""}
                        onChange={(e) => handleInputChange("switchboardTemplateId", e.target.value)}
                        placeholder="your-template-id"
                      />
                    </div>
                  </div>
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
            field={editingField}
            onSave={handleSaveCustomField}
            onCancel={() => {
              setShowFieldForm(false);
              setEditingField(null);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// Custom Field Form Component
interface CustomFieldFormProps {
  field: CustomField | null;
  onSave: (field: CustomField) => void;
  onCancel: () => void;
}

function CustomFieldForm({ field, onSave, onCancel }: CustomFieldFormProps) {
  const [fieldData, setFieldData] = useState<CustomField>({
    fieldName: "",
    fieldType: "text",
    required: false,
    order: 1,
    ...field
  });
  const [selectOptions, setSelectOptions] = useState<string[]>([]);

  useEffect(() => {
    if (field?.fieldType === "select" && field.fieldOptions?.options) {
      setSelectOptions(field.fieldOptions.options);
    }
  }, [field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalFieldData = {
      ...fieldData,
      fieldOptions: fieldData.fieldType === "select" ? { options: selectOptions } : undefined
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background p-6 rounded-lg max-w-lg w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Settings className="h-5 w-5" />
            {field?.id ? "Edit Custom Field" : "Add Custom Field"}
          </h3>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
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
                {selectOptions.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      value={option}
                      onChange={(e) => updateSelectOption(index, e.target.value)}
                      placeholder={`Option ${index + 1} (e.g., ${index === 0 ? 'Small' : index === 1 ? 'Medium' : 'Large'})`}
                      className="h-9"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSelectOption(index)}
                      className="h-9 w-9 p-0 text-destructive hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
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

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="h-10">
              Cancel
            </Button>
            <Button type="submit" className="h-10">
              <Save className="mr-2 h-4 w-4" />
              {field?.id ? "Update Field" : "Add Field"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
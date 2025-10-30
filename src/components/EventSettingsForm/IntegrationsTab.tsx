// IntegrationsTab Component
// Handles all third-party integration configurations (Cloudinary, Switchboard, OneSimpleAPI)

import React, { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Link } from "lucide-react";
import { IntegrationSection } from './IntegrationSection';
import { ASPECT_RATIOS, AUTH_HEADER_TYPES } from './constants';
import { EventSettings, IntegrationStatus, FieldMapping, CustomField } from './types';

interface IntegrationsTabProps {
  formData: EventSettings;
  onInputChange: (field: keyof EventSettings, value: any) => void;
  integrationStatus: IntegrationStatus | null;
  customFields: CustomField[];
  fieldMappings: FieldMapping[];
  onAddFieldMapping: () => void;
  onEditFieldMapping: (mapping: FieldMapping) => void;
  onDeleteFieldMapping: (fieldId: string, jsonVariable: string) => void;
}

export const IntegrationsTab = memo(function IntegrationsTab({
  formData,
  onInputChange,
  integrationStatus,
  customFields,
  fieldMappings,
  onAddFieldMapping,
  onEditFieldMapping,
  onDeleteFieldMapping
}: IntegrationsTabProps) {
  return (
    <div className="space-y-4">
      {/* Cloudinary Integration */}
      <IntegrationSection
        title="Cloudinary Integration"
        description="Configure Cloudinary for image uploads and management"
        icon={<Settings className="h-5 w-5" />}
        enabled={formData.cloudinaryEnabled || false}
        onEnabledChange={(checked) => onInputChange("cloudinaryEnabled", checked)}
        statusIndicator={
          formData.cloudinaryEnabled
            ? {
                isReady: !!(formData.cloudinaryCloudName && formData.cloudinaryUploadPreset && integrationStatus?.cloudinary),
                message: !formData.cloudinaryCloudName || !formData.cloudinaryUploadPreset
                  ? "Waiting for Cloud Name and Upload Preset to be configured"
                  : integrationStatus === null
                    ? "Checking API credentials..."
                    : integrationStatus.cloudinary
                      ? "Ready to upload - configuration complete"
                      : "⚠️ API credentials missing in environment variables (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)"
              }
            : undefined
        }
      >
        <div className="space-y-6">
          {/* API Credentials */}
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
                  onChange={(e) => onInputChange("cloudinaryCloudName", e.target.value)}
                  placeholder="your-cloud-name"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Found in your Cloudinary dashboard
                </p>
              </div>

              <div className="col-span-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                      API Credentials Configured Securely
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Cloudinary API credentials (API Key and API Secret) are configured via environment variables for security.
                      Contact your system administrator to update credentials.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cloudinaryUploadPreset" className="text-sm font-medium">
                Upload Preset
              </Label>
              <Input
                id="cloudinaryUploadPreset"
                value={formData.cloudinaryUploadPreset || ""}
                onChange={(e) => onInputChange("cloudinaryUploadPreset", e.target.value)}
                placeholder="your-upload-preset"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                Create an unsigned upload preset in Cloudinary settings
              </p>
            </div>
          </div>

          {/* Upload Settings */}
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
                  onCheckedChange={(checked) => onInputChange("cloudinaryAutoOptimize", checked)}
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
                  onCheckedChange={(checked) => onInputChange("cloudinaryGenerateThumbnails", checked)}
                />
              </div>
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
                  <Label className="text-sm font-medium">Disable &quot;Skip Crop&quot; button</Label>
                  <p className="text-xs text-muted-foreground">
                    Force users to crop their images before uploading
                  </p>
                </div>
                <Switch
                  checked={formData.cloudinaryDisableSkipCrop || false}
                  onCheckedChange={(checked) => onInputChange("cloudinaryDisableSkipCrop", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cloudinaryCropAspectRatio" className="text-sm font-medium">
                  Crop Aspect Ratio
                </Label>
                <Select
                  value={formData.cloudinaryCropAspectRatio || "1"}
                  onValueChange={(value) => onInputChange("cloudinaryCropAspectRatio", value)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASPECT_RATIOS.map((ratio) => (
                      <SelectItem key={ratio.value} value={ratio.value}>
                        {ratio.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Set the required aspect ratio for cropped images
                </p>
              </div>
            </div>
          </div>
        </div>
      </IntegrationSection>

      {/* Switchboard Canvas Integration */}
      <IntegrationSection
        title="Switchboard Canvas Integration"
        description="Configure credential printing and generation through Switchboard Canvas"
        icon={<Settings className="h-5 w-5" />}
        enabled={formData.switchboardEnabled || false}
        onEnabledChange={(checked) => onInputChange("switchboardEnabled", checked)}
        statusIndicator={
          formData.switchboardEnabled
            ? {
                isReady: !!(formData.switchboardApiEndpoint && formData.switchboardTemplateId && integrationStatus?.switchboard),
                message: !formData.switchboardApiEndpoint || !formData.switchboardTemplateId
                  ? "Waiting for API Endpoint and Template ID to be configured"
                  : integrationStatus === null
                    ? "Checking API credentials..."
                    : integrationStatus.switchboard
                      ? "Ready to print - configuration complete"
                      : "⚠️ API key missing in environment variables (SWITCHBOARD_API_KEY)"
              }
            : undefined
        }
      >
        <div className="space-y-6">
          {/* API Configuration */}
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
                  onChange={(e) => onInputChange("switchboardApiEndpoint", e.target.value)}
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
                    onValueChange={(value) => onInputChange("switchboardAuthHeaderType", value)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUTH_HEADER_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The type of authentication header to use
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Authentication Value (API Key) *
                  </Label>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-md">
                    <div className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <p className="text-xs text-blue-700 dark:text-blue-300">
                        API key configured securely via environment variables. Contact your system administrator to update.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="switchboardTemplateId" className="text-sm font-medium">
                  Template ID *
                </Label>
                <Input
                  id="switchboardTemplateId"
                  value={formData.switchboardTemplateId || ""}
                  onChange={(e) => onInputChange("switchboardTemplateId", e.target.value)}
                  placeholder="template_abc123"
                  className="h-10"
                />
                <p className="text-xs text-muted-foreground">
                  Your Switchboard Canvas template ID (will replace {`{{template_id}}`} placeholder)
                </p>
              </div>
            </div>
          </div>

          {/* Request Configuration */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h4 className="text-sm font-semibold">Request Configuration</h4>
            </div>

            <div className="space-y-2">
              <Label htmlFor="switchboardRequestBody" className="text-sm font-medium">
                API Request Body (JSON) *
              </Label>
              <Textarea
                id="switchboardRequestBody"
                value={formData.switchboardRequestBody || ""}
                onChange={(e) => onInputChange("switchboardRequestBody", e.target.value)}
                placeholder={`{
  "template_id": "{{template_id}}",
  "data": {
    "firstName": "{{firstName}}",
    "lastName": "{{lastName}}",
    "barcodeNumber": "{{barcodeNumber}}"
  }
}`}
                className="min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The JSON payload to send to the Switchboard API. Use placeholders for dynamic data.
              </p>
            </div>
          </div>

          {/* Field Mappings */}
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
                onClick={onAddFieldMapping}
                disabled={customFields.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Mapping
              </Button>
            </div>

            {fieldMappings.length === 0 ? (
              <div className="text-center py-4 text-sm text-muted-foreground border rounded-lg">
                No field mappings configured. Click &quot;Add Mapping&quot; to map custom fields to JSON variables.
              </div>
            ) : (
              <div className="space-y-3">
                {fieldMappings.map((mapping) => {
                  // Find the custom field to get additional details
                  const customField = customFields.find(f => f.id === mapping.fieldId);
                  
                  return (
                    <div 
                      key={`${mapping.fieldId}-${mapping.jsonVariable}`} 
                      className="p-4 border rounded-lg bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 border-violet-200 dark:border-violet-800/50"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          {/* Field Name and Type */}
                          <div className="flex items-start gap-2">
                            <Link className="h-4 w-4 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground break-words">{mapping.fieldName}</p>
                              <p className="text-xs text-muted-foreground">
                                {mapping.fieldType.charAt(0).toUpperCase() + mapping.fieldType.slice(1)}
                                {customField?.required && <span className="ml-2 text-amber-600 dark:text-amber-400">• Required</span>}
                              </p>
                            </div>
                          </div>
                          
                          {/* Mapping Arrow and JSON Variable */}
                          <div className="flex items-center gap-2 pl-6 flex-wrap">
                            <span className="text-xs text-muted-foreground flex-shrink-0">→</span>
                            <code className="px-2 py-1 bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 rounded text-xs font-mono text-violet-700 dark:text-violet-300 break-all">
                              {`{{${mapping.jsonVariable}}}`}
                            </code>
                          </div>
                          
                          {/* Value Mapping if present */}
                          {mapping.valueMapping && Object.keys(mapping.valueMapping).length > 0 && (
                            <div className="pl-6 pt-1">
                              <p className="text-xs text-muted-foreground mb-1.5">Value mappings:</p>
                              <div className="space-y-1">
                                {Object.entries(mapping.valueMapping).slice(0, 3).map(([key, value]) => (
                                  <div key={key} className="flex items-center gap-2 text-xs flex-wrap">
                                    <code className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 rounded font-mono text-violet-700 dark:text-violet-300 break-all">{key}</code>
                                    <span className="text-muted-foreground flex-shrink-0">→</span>
                                    <code className="px-1.5 py-0.5 bg-white dark:bg-gray-900 border border-violet-200 dark:border-violet-800 rounded font-mono text-violet-700 dark:text-violet-300 break-all">{value}</code>
                                  </div>
                                ))}
                                {Object.keys(mapping.valueMapping).length > 3 && (
                                  <p className="text-xs text-muted-foreground italic">
                                    +{Object.keys(mapping.valueMapping).length - 3} more...
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditFieldMapping(mapping)}
                            className="hover:bg-violet-100 dark:hover:bg-violet-900/30 w-20"
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteFieldMapping(mapping.fieldId, mapping.jsonVariable)}
                            className="text-destructive hover:text-destructive hover:bg-red-100 dark:hover:bg-red-900/30 w-20"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </IntegrationSection>

      {/* OneSimpleAPI Integration */}
      <IntegrationSection
        title="OneSimpleAPI Integration"
        description="Configure webhook notifications to external systems"
        icon={<Settings className="h-5 w-5" />}
        enabled={formData.oneSimpleApiEnabled || false}
        onEnabledChange={(checked) => onInputChange("oneSimpleApiEnabled", checked)}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oneSimpleApiUrl" className="text-sm font-medium">
                Webhook URL *
              </Label>
              <Input
                id="oneSimpleApiUrl"
                value={formData.oneSimpleApiUrl || ""}
                onChange={(e) => onInputChange("oneSimpleApiUrl", e.target.value)}
                placeholder="https://api.example.com/webhook"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                The endpoint URL to send webhook notifications
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oneSimpleApiFormDataKey" className="text-sm font-medium">
                Form Data Key
              </Label>
              <Input
                id="oneSimpleApiFormDataKey"
                value={formData.oneSimpleApiFormDataKey || ""}
                onChange={(e) => onInputChange("oneSimpleApiFormDataKey", e.target.value)}
                placeholder="data"
                className="h-10"
              />
              <p className="text-xs text-muted-foreground">
                The key name for the form data payload
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oneSimpleApiFormDataValue" className="text-sm font-medium">
                Form Data Value Template (HTML)
              </Label>
              <Textarea
                id="oneSimpleApiFormDataValue"
                value={formData.oneSimpleApiFormDataValue || ""}
                onChange={(e) => onInputChange("oneSimpleApiFormDataValue", e.target.value)}
                placeholder="<div>{{firstName}} {{lastName}}</div>"
                className="min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                HTML template with placeholders for dynamic data
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="oneSimpleApiRecordTemplate" className="text-sm font-medium">
                Record Template (HTML)
              </Label>
              <Textarea
                id="oneSimpleApiRecordTemplate"
                value={formData.oneSimpleApiRecordTemplate || ""}
                onChange={(e) => onInputChange("oneSimpleApiRecordTemplate", e.target.value)}
                placeholder="<div>Record: {{barcodeNumber}}</div>"
                className="min-h-[100px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                HTML template for individual record formatting
              </p>
            </div>
          </div>
        </div>
      </IntegrationSection>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.formData.cloudinaryEnabled === nextProps.formData.cloudinaryEnabled &&
    prevProps.formData.switchboardEnabled === nextProps.formData.switchboardEnabled &&
    prevProps.formData.oneSimpleApiEnabled === nextProps.formData.oneSimpleApiEnabled &&
    prevProps.integrationStatus?.cloudinary === nextProps.integrationStatus?.cloudinary &&
    prevProps.integrationStatus?.switchboard === nextProps.integrationStatus?.switchboard &&
    prevProps.fieldMappings.length === nextProps.fieldMappings.length
  );
});

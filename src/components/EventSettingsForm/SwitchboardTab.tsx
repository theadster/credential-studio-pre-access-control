// SwitchboardTab Component
// Handles Switchboard Canvas integration configuration

import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Settings, Plus, Link, Edit, Trash2 } from "lucide-react";
import { IntegrationStatusIndicator } from '@/components/IntegrationStatusIndicator';
import { AUTH_HEADER_TYPES } from './constants';
import { EventSettings, IntegrationStatus, FieldMapping, CustomField } from './types';
import { Badge } from '@/components/ui/badge';

interface SwitchboardTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
  integrationStatus: IntegrationStatus | null;
  customFields: CustomField[];
  fieldMappings: FieldMapping[];
  onAddFieldMapping: () => void;
  onEditFieldMapping: (mapping: FieldMapping) => void;
  onDeleteFieldMapping: (fieldId: string, jsonVariable: string) => void;
}

export const SwitchboardTab = memo(function SwitchboardTab({
  formData,
  onInputChange,
  integrationStatus,
  customFields,
  fieldMappings,
  onAddFieldMapping,
  onEditFieldMapping,
  onDeleteFieldMapping
}: SwitchboardTabProps) {
  const isReady = !!(formData.switchboardApiEndpoint && formData.switchboardTemplateId && integrationStatus?.switchboard);
  const statusMessage = !formData.switchboardApiEndpoint || !formData.switchboardTemplateId
    ? "Waiting for API Endpoint and Template ID to be configured"
    : integrationStatus === null
      ? "Checking API credentials..."
      : integrationStatus.switchboard
        ? "Ready to print - configuration complete"
        : "⚠️ API key missing in environment variables (SWITCHBOARD_API_KEY)";

  return (
    <div className="space-y-6">
      <IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />

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

        {/* Available Placeholders */}
        <div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="text-xs space-y-2">
            <p className="font-medium text-green-900 dark:text-green-100 mb-2">Available Placeholders:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="font-medium text-green-900 dark:text-green-100 text-xs mb-1">Standard Fields:</p>
                <ul className="space-y-1 text-green-800 dark:text-green-200">
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{template_id}}'}</code> - Template ID</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{firstName}}'}</code> - First name</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{lastName}}'}</code> - Last name</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{barcodeNumber}}'}</code> - Barcode</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{photoUrl}}'}</code> - Photo URL</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{eventName}}'}</code> - Event name</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{eventDate}}'}</code> - Event date</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{eventTime}}'}</code> - Event time</li>
                  <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">{'{{eventLocation}}'}</code> - Event location</li>
                </ul>
              </div>
              {customFields.length > 0 && (
                <div>
                  <p className="font-medium text-green-900 dark:text-green-100 text-xs mb-1">Custom Fields:</p>
                  <ul className="space-y-1 text-green-800 dark:text-green-200">
                    {customFields.map((field) => (
                      <li key={field.id}>
                        <code className="bg-green-100 dark:bg-green-900 px-1 rounded-sm">
                          {`{{${field.internalFieldName || field.fieldName}}}`}
                        </code>
                        <span className="text-xs ml-1 opacity-75">({field.fieldType})</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
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

        <div className="p-4 border border-border rounded-lg bg-purple-50 dark:bg-purple-950/20">
          <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
            <strong>Field Mappings</strong> allow you to map custom field responses to different variable names in your JSON request.
            This is especially useful for boolean (Yes/No) and select fields where you want to transform the values.
          </p>

          {fieldMappings.length === 0 ? (
            <div className="text-center py-4 text-purple-600 dark:text-purple-400 text-sm">
              {customFields.length === 0
                ? "Create custom fields first to add field mappings"
                : "No field mappings configured. Click 'Add Mapping' to create one."}
            </div>
          ) : (
            <div className="space-y-3">
              {fieldMappings.map((mapping) => (
                <div 
                  key={`${mapping.fieldId}-${mapping.jsonVariable}`} 
                  className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{mapping.fieldName}</span>
                      <Badge variant="outline" className="text-xs">{mapping.fieldType}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Maps to: <code className="bg-muted px-1 rounded-sm">{mapping.jsonVariable}</code>
                    </div>
                    {mapping.valueMapping && Object.keys(mapping.valueMapping).length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Value mappings: {Object.entries(mapping.valueMapping).map(([key, value]) => (
                          <span key={key} className="inline-block mr-2">
                            <code className="bg-muted px-1 rounded-sm">{key}</code> → <code className="bg-muted px-1 rounded-sm">{value}</code>
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
                      onClick={() => onEditFieldMapping(mapping)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onDeleteFieldMapping(mapping.fieldId, mapping.jsonVariable)}
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
    </div>
  );
});

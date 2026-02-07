// OneSimpleApiTab Component
// Handles OneSimpleAPI webhook integration configuration

import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomFieldPlaceholders } from './CustomFieldPlaceholders';
import { EventSettings, CustomField } from './types';

interface OneSimpleApiTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
  customFields?: CustomField[];
}

export const OneSimpleApiTab = memo(function OneSimpleApiTab({
  formData,
  onInputChange,
  customFields = []
}: OneSimpleApiTabProps) {
  return (
    <div className="space-y-6">
      {/* Webhook Configuration */}
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
            Form Data Value Template (HTML) *
          </Label>
          <Textarea
            id="oneSimpleApiFormDataValue"
            value={formData.oneSimpleApiFormDataValue || ""}
            onChange={(e) => onInputChange("oneSimpleApiFormDataValue", e.target.value)}
            placeholder={`<html>
  <body>
    <h1>{{eventName}}</h1>
    <p>Date: {{eventDate}}</p>
    {{credentialRecords}}
  </body>
</html>`}
            className="min-h-[150px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mb-3">
            The main HTML wrapper template that contains all attendee records. This template is sent to the webhook endpoint.
          </p>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="text-xs space-y-2">
              <p className="font-medium text-amber-900 dark:text-amber-100 mb-2">Available Placeholders:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100 text-xs mb-1">Standard Fields:</p>
                  <ul className="space-y-1 text-amber-800 dark:text-amber-200">
                    <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded-sm">{'{{credentialRecords}}'}</code> - All records (required)</li>
                    <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded-sm">{'{{eventName}}'}</code> - Event name</li>
                    <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded-sm">{'{{eventDate}}'}</code> - Event date</li>
                    <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded-sm">{'{{eventTime}}'}</code> - Event time</li>
                    <li><code className="bg-amber-100 dark:bg-amber-900 px-1 rounded-sm">{'{{eventLocation}}'}</code> - Event location</li>
                  </ul>
                </div>
                <CustomFieldPlaceholders
                  customFields={customFields}
                  labelClass="text-amber-900 dark:text-amber-100"
                  listClass="text-amber-800 dark:text-amber-200"
                  codeBgClass="bg-amber-100 dark:bg-amber-900"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="oneSimpleApiRecordTemplate" className="text-sm font-medium">
            Record Template (HTML) *
          </Label>
          <Textarea
            id="oneSimpleApiRecordTemplate"
            value={formData.oneSimpleApiRecordTemplate || ""}
            onChange={(e) => onInputChange("oneSimpleApiRecordTemplate", e.target.value)}
            placeholder={`<div class="record">
  <h3>{{firstName}} {{lastName}}</h3>
  <p>Barcode: {{barcodeNumber}}</p>
  <img src="{{photoUrl}}" alt="Photo" />
  <a href="{{credentialUrl}}">View Credential</a>
</div>`}
            className="min-h-[150px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mb-3">
            The HTML template for each individual attendee record. This template is repeated for every attendee and inserted into the Form Data Value Template where <code className="bg-muted px-1 rounded-sm">{'{{credentialRecords}}'}</code> appears.
          </p>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-xs space-y-2">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-2">Available Placeholders:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <p className="font-medium text-blue-900 dark:text-blue-100 text-xs mb-1">Standard Fields:</p>
                  <ul className="space-y-1 text-blue-800 dark:text-blue-200">
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{firstName}}'}</code> - First name</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{lastName}}'}</code> - Last name</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{barcodeNumber}}'}</code> - Barcode</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{photoUrl}}'}</code> - Photo URL</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{credentialUrl}}'}</code> - Credential URL</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{eventName}}'}</code> - Event name</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{eventDate}}'}</code> - Event date</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{eventTime}}'}</code> - Event time</li>
                    <li><code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">{'{{eventLocation}}'}</code> - Event location</li>
                  </ul>
                </div>
                <CustomFieldPlaceholders
                  customFields={customFields}
                  labelClass="text-blue-900 dark:text-blue-100"
                  listClass="text-blue-800 dark:text-blue-200"
                  codeBgClass="bg-blue-100 dark:bg-blue-900"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

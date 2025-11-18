// CloudinaryTab Component
// Handles Cloudinary integration configuration

import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { IntegrationStatusIndicator } from '@/components/IntegrationStatusIndicator';
import { ASPECT_RATIOS } from './constants';
import { EventSettings, IntegrationStatus } from './types';

interface CloudinaryTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
  integrationStatus: IntegrationStatus | null;
}

function getStatusMessage(
  cloudName: string | undefined,
  uploadPreset: string | undefined,
  integrationStatus: IntegrationStatus | null
): string {
  if (!cloudName || !uploadPreset) {
    return "Waiting for Cloud Name and Upload Preset to be configured";
  }
  
  if (integrationStatus === null) {
    return "Checking API credentials...";
  }
  
  return integrationStatus.cloudinary
    ? "Ready to upload - configuration complete"
    : "⚠️ API credentials missing in environment variables (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)";
}

export const CloudinaryTab = memo(function CloudinaryTab({
  formData,
  onInputChange,
  integrationStatus
}: CloudinaryTabProps) {
  const isReady = !!(formData.cloudinaryCloudName && formData.cloudinaryUploadPreset && integrationStatus?.cloudinary);
  const statusMessage = getStatusMessage(
    formData.cloudinaryCloudName,
    formData.cloudinaryUploadPreset,
    integrationStatus
  );

  return (
    <div className="space-y-6">
      <IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />

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
  );
});

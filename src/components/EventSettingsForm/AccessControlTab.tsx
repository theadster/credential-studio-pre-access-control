// AccessControlTab Component
// Handles access control configuration for event settings

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Shield } from "lucide-react";
import { EventSettings, AccessControlTimeMode } from './types';

interface AccessControlTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
}

export const AccessControlTab = memo(function AccessControlTab({ 
  formData, 
  onInputChange 
}: AccessControlTabProps) {
  const accessControlEnabled = formData.accessControlEnabled ?? false;
  const accessControlTimeMode = formData.accessControlTimeMode ?? 'date_only';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Access Control Configuration
          </CardTitle>
          <CardDescription>
            Configure badge validity and access restrictions for attendees
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Access Control Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="accessControlEnabled" className="text-base font-medium">
                Enable Access Control
              </Label>
              <p id="access-control-description" className="text-sm text-muted-foreground">
                When enabled, attendees will have validity dates and access status fields
              </p>
            </div>
            <Switch
              id="accessControlEnabled"
              checked={accessControlEnabled}
              onCheckedChange={(checked) => onInputChange("accessControlEnabled", checked)}
              aria-describedby="access-control-description"
            />
          </div>

          {/* Warning Alert - Only visible when enabled */}
          {accessControlEnabled && (
            <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-amber-800 dark:text-amber-200">
                Advanced Feature
              </AlertTitle>
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                This feature is for advanced use only. Additional hardware (mobile scanning devices) 
                is required for the access control feature to work correctly.
              </AlertDescription>
            </Alert>
          )}

          {/* Time Mode Selection - Only visible when enabled */}
          {accessControlEnabled && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Time Mode</Label>
              <p className="text-sm text-muted-foreground">
                Choose how badge validity dates are interpreted
              </p>
              <RadioGroup
                value={accessControlTimeMode}
                onValueChange={(value) => onInputChange("accessControlTimeMode", value as AccessControlTimeMode)}
                className="grid gap-3"
              >
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="date_only" id="date_only" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="date_only" className="font-medium cursor-pointer">
                      Date only
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Badge validity is interpreted as full days (12:00 AM start, 11:59 PM end)
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <RadioGroupItem value="date_time" id="date_time" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="date_time" className="font-medium cursor-pointer">
                      Date and time
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Badge validity uses exact timestamps down to the minute
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.formData.accessControlEnabled === nextProps.formData.accessControlEnabled &&
    prevProps.formData.accessControlTimeMode === nextProps.formData.accessControlTimeMode
  );
});

// AccessControlTab Component
// Handles access control configuration for event settings

import { memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { AlertTriangle, Shield, Smartphone } from "lucide-react";
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

      {/* Mobile App Security Card - Only visible when access control is enabled */}
      {accessControlEnabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Mobile App Security
            </CardTitle>
            <CardDescription>
              Configure security settings for the mobile scanning app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobileSettingsPasscode" className="text-base font-medium">
                Settings Menu Passcode
              </Label>
              <Input
                id="mobileSettingsPasscode"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{4}"
                maxLength={4}
                value={formData.mobileSettingsPasscode || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                  onInputChange("mobileSettingsPasscode", value || null);
                }}
                placeholder="Enter 4-digit code"
                className="w-48"
              />
              <p className="text-sm text-muted-foreground">
                Set a 4-digit code to protect the mobile app settings menu. Leave empty to disable passcode protection.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Default Values Card - Only visible when access control is enabled */}
      {accessControlEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>Default Values for New Attendees</CardTitle>
            <CardDescription>
              Set default access control values that will be pre-filled when creating new attendees
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Default Access Status */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Default Access Status</Label>
              <RadioGroup
                value={formData.accessControlDefaults?.accessEnabled === false ? 'inactive' : 'active'}
                onValueChange={(value) => {
                  const defaults = formData.accessControlDefaults || {};
                  onInputChange("accessControlDefaults", {
                    ...defaults,
                    accessEnabled: value === 'active'
                  });
                }}
                className="grid gap-3"
              >
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="active" id="default_active" />
                  <Label htmlFor="default_active" className="font-normal cursor-pointer">
                    Active (default)
                  </Label>
                </div>
                <div className="flex items-center space-x-3">
                  <RadioGroupItem value="inactive" id="default_inactive" />
                  <Label htmlFor="default_inactive" className="font-normal cursor-pointer">
                    Inactive
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Default Valid From */}
            <div className="space-y-3">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="validFromUseToday"
                    checked={formData.accessControlDefaults?.validFromUseToday ?? false}
                    onCheckedChange={(checked) => {
                      const defaults = formData.accessControlDefaults || {};
                      onInputChange("accessControlDefaults", {
                        ...defaults,
                        validFromUseToday: checked,
                        // Clear the static date if using today
                        validFrom: checked ? null : defaults.validFrom
                      });
                    }}
                  />
                  <Label htmlFor="validFromUseToday" className="font-normal cursor-pointer">
                    Always use today's date (updates daily)
                  </Label>
                </div>
                {!formData.accessControlDefaults?.validFromUseToday && (
                  <div className="space-y-2">
                    <Label htmlFor="defaultValidFrom" className="text-base font-medium">
                      Default Valid From
                    </Label>
                    <input
                      type={accessControlTimeMode === 'date_time' ? 'datetime-local' : 'date'}
                      id="defaultValidFrom"
                      value={formData.accessControlDefaults?.validFrom || ''}
                      onChange={(e) => {
                        const defaults = formData.accessControlDefaults || {};
                        onInputChange("accessControlDefaults", {
                          ...defaults,
                          validFrom: e.target.value || null
                        });
                      }}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {formData.accessControlDefaults?.validFromUseToday 
                    ? "New attendees will automatically get today's date as their Valid From date"
                    : "Leave empty for no default value"}
                </p>
              </div>
            </div>

            {/* Default Valid Until */}
            <div className="space-y-3">
              <Label htmlFor="defaultValidUntil" className="text-base font-medium">
                Default Valid Until
              </Label>
              <input
                type={accessControlTimeMode === 'date_time' ? 'datetime-local' : 'date'}
                id="defaultValidUntil"
                value={formData.accessControlDefaults?.validUntil || ''}
                onChange={(e) => {
                  const defaults = formData.accessControlDefaults || {};
                  onInputChange("accessControlDefaults", {
                    ...defaults,
                    validUntil: e.target.value || null
                  });
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty for no default value
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.formData.accessControlEnabled === nextProps.formData.accessControlEnabled &&
    prevProps.formData.accessControlTimeMode === nextProps.formData.accessControlTimeMode &&
    prevProps.formData.mobileSettingsPasscode === nextProps.formData.mobileSettingsPasscode &&
    JSON.stringify(prevProps.formData.accessControlDefaults) === JSON.stringify(nextProps.formData.accessControlDefaults) &&
    prevProps.onInputChange === nextProps.onInputChange
  );
});

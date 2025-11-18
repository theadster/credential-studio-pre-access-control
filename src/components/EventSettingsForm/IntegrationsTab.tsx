// IntegrationsTab Component
// Handles all third-party integration configurations with nested sub-tabs

import { memo, useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Cloud, Zap, Bell } from "lucide-react";
import { IntegrationTabContent } from './IntegrationTabContent';
import { CloudinaryTab } from './CloudinaryTab';
import { SwitchboardTab } from './SwitchboardTab';
import { OneSimpleApiTab } from './OneSimpleApiTab';
import { EventSettings, IntegrationStatus, FieldMapping, CustomField } from './types';

interface IntegrationsTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
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
  const [activeIntegration, setActiveIntegration] = useState(() => {
    // Lazy initializer to avoid SSR issues
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('integrations-active-tab');
      if (saved && ['cloudinary', 'switchboard', 'onesimpleapi'].includes(saved)) {
        return saved;
      }
    }
    return 'cloudinary';
  });

  const handleTabChange = (value: string) => {
    setActiveIntegration(value);
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('integrations-active-tab', value);
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          Configure third-party integrations to extend credential.studio functionality. Each integration can be enabled or disabled independently.
        </p>
      </div>

      <Tabs value={activeIntegration} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cloudinary" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            <span className="hidden sm:inline">Cloudinary</span>
          </TabsTrigger>
          <TabsTrigger value="switchboard" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="hidden sm:inline">Switchboard</span>
          </TabsTrigger>
          <TabsTrigger value="onesimpleapi" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">OneSimpleAPI</span>
          </TabsTrigger>
        </TabsList>

        <IntegrationTabContent
          value="cloudinary"
          title="Cloudinary Integration"
          description="Configure Cloudinary for image uploads and management"
          icon={Cloud}
          enabled={formData.cloudinaryEnabled || false}
          onToggle={(checked) => onInputChange("cloudinaryEnabled", checked)}
          placeholderText="Enable Cloudinary integration to configure image uploads"
        >
          <CloudinaryTab
            formData={formData}
            onInputChange={onInputChange}
            integrationStatus={integrationStatus}
          />
        </IntegrationTabContent>

        <IntegrationTabContent
          value="switchboard"
          title="Switchboard Canvas Integration"
          description="Configure credential printing and generation through Switchboard Canvas"
          icon={Zap}
          enabled={formData.switchboardEnabled || false}
          onToggle={(checked) => onInputChange("switchboardEnabled", checked)}
          placeholderText="Enable Switchboard Canvas integration to configure credential printing"
        >
          <SwitchboardTab
            formData={formData}
            onInputChange={onInputChange}
            integrationStatus={integrationStatus}
            customFields={customFields}
            fieldMappings={fieldMappings}
            onAddFieldMapping={onAddFieldMapping}
            onEditFieldMapping={onEditFieldMapping}
            onDeleteFieldMapping={onDeleteFieldMapping}
          />
        </IntegrationTabContent>

        <IntegrationTabContent
          value="onesimpleapi"
          title="OneSimpleAPI Integration"
          description="Configure webhook notifications to external systems"
          icon={Bell}
          enabled={formData.oneSimpleApiEnabled || false}
          onToggle={(checked) => onInputChange("oneSimpleApiEnabled", checked)}
          placeholderText="Enable OneSimpleAPI integration to configure webhook notifications"
        >
          <OneSimpleApiTab
            formData={formData}
            onInputChange={onInputChange}
            customFields={customFields}
          />
        </IntegrationTabContent>
      </Tabs>
    </div>
  );
});

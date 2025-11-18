// IntegrationTabContent Component
// Reusable wrapper for integration tab content with header, toggle, and placeholder

import { ReactNode } from 'react';
import { TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { LucideIcon } from "lucide-react";

interface IntegrationTabContentProps {
  value: string;
  title: string;
  description: string;
  icon: LucideIcon;
  enabled: boolean;
  onToggle: (checked: boolean) => void;
  children: ReactNode;
  placeholderText: string;
}

export function IntegrationTabContent({
  value,
  title,
  description,
  icon: Icon,
  enabled,
  onToggle,
  children,
  placeholderText
}: IntegrationTabContentProps) {
  return (
    <TabsContent value={value} className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
        <div>
          <h3 className="font-semibold text-base">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {enabled ? 'Enabled' : 'Disabled'}
          </span>
          <Switch checked={enabled} onCheckedChange={onToggle} />
        </div>
      </div>

      {enabled && children}

      {!enabled && (
        <div className="p-8 text-center border rounded-lg border-dashed">
          <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
          <p className="text-muted-foreground">{placeholderText}</p>
        </div>
      )}
    </TabsContent>
  );
}

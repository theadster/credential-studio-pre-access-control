// IntegrationSection Component
// Reusable wrapper for integration configuration sections

import React, { ReactNode, memo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings } from "lucide-react";

interface IntegrationSectionProps {
  title: string;
  description: string;
  icon?: ReactNode;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  children: ReactNode;
  statusIndicator?: {
    isReady: boolean;
    message: string;
  };
}

export const IntegrationSection = memo(function IntegrationSection({
  title,
  description,
  icon = <Settings className="h-5 w-5" />,
  enabled,
  onEnabledChange,
  children,
  statusIndicator
}: IntegrationSectionProps) {
  // Sanitize title to valid HTML ID: lowercase, replace spaces/special chars with hyphens
  // Ensure title is a string before calling string methods
  const titleStr = typeof title === 'string' ? title : String(title || '');
  const sanitized = titleStr
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  // Fallback to hash if sanitization produces empty string (non-ASCII chars, etc.)
  const sanitizedId = sanitized || `integration-${Math.abs(titleStr.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0)).toString(36)}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/50">
          <div className="space-y-1">
            <Label htmlFor={`${sanitizedId}-enabled`} className="text-base font-medium">
              Enable {title}
            </Label>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Switch
            id={`${sanitizedId}-enabled`}
            checked={enabled}
            onCheckedChange={onEnabledChange}
          />
        </div>

        {/* Configuration Content */}
        {enabled && (
          <>
            {children}

            {/* Status Indicator */}
            {statusIndicator && (
              <div className={`p-4 border border-border rounded-lg ${statusIndicator.isReady
                  ? "bg-green-50 dark:bg-green-950/20"
                  : "bg-yellow-50 dark:bg-yellow-950/20"
                }`}>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusIndicator.isReady ? "bg-green-500" : "bg-yellow-500"
                    }`}></div>
                  <span className={`text-sm font-medium ${statusIndicator.isReady
                      ? "text-green-700 dark:text-green-400"
                      : "text-yellow-700 dark:text-yellow-400"
                    }`}>
                    Connection Status
                  </span>
                </div>
                <p className={`text-sm mt-1 ${statusIndicator.isReady
                    ? "text-green-600 dark:text-green-500"
                    : "text-yellow-600 dark:text-yellow-500"
                  }`}>
                  {statusIndicator.message}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

---
title: "Integration UI Patterns"
type: canonical
status: active
owner: "@team"
last_verified: 2025-12-31
review_interval_days: 90
related_code: ["src/components/"]
---

# Integration UI Patterns Guide

## Overview

This guide documents the UI patterns and components used for integration configuration in credential.studio. The integration UI system provides a consistent, accessible, and user-friendly interface for configuring third-party services like Cloudinary, Switchboard Canvas, and OneSimpleAPI.

## Table of Contents

1. [IntegrationsTab Component](#integrationstab-component)
2. [IntegrationTabContent Wrapper](#integrationtabcontent-wrapper)
3. [IntegrationStatusIndicator Component](#integrationstatusindicator-component)
4. [Tab State Management](#tab-state-management)
5. [Enable/Disable Toggle Pattern](#enabledisable-toggle-pattern)
6. [Section Grouping Pattern](#section-grouping-pattern)
7. [Form Field Organization](#form-field-organization)
8. [Placeholder Text Patterns](#placeholder-text-patterns)
9. [Responsive Design Patterns](#responsive-design-patterns)
10. [Accessibility Considerations](#accessibility-considerations)

---

## IntegrationsTab Component

### Purpose

The `IntegrationsTab` component serves as the main container for all integration configurations. It provides a tabbed interface where each tab represents a different integration service.

### Component Structure

```tsx
<IntegrationsTab
  formData={eventSettings}
  onInputChange={handleInputChange}
  integrationStatus={status}
  customFields={fields}
  fieldMappings={mappings}
  onAddFieldMapping={handleAdd}
  onEditFieldMapping={handleEdit}
  onDeleteFieldMapping={handleDelete}
/>
```

### Key Features

1. **Nested Tab System**: Uses shadcn/ui `Tabs` component for navigation
2. **State Persistence**: Saves active tab to localStorage
3. **Icon-Based Navigation**: Each tab has a distinctive icon
4. **Responsive Labels**: Tab labels hide on small screens, showing only icons


### Implementation Details

**File Location**: `src/components/EventSettingsForm/IntegrationsTab.tsx`

**Props Interface**:
```typescript
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
```

**Tab Structure**:
```tsx
<Tabs value={activeIntegration} onValueChange={handleTabChange}>
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="cloudinary">
      <Cloud className="h-4 w-4" />
      <span className="hidden sm:inline">Cloudinary</span>
    </TabsTrigger>
    <TabsTrigger value="switchboard">
      <Zap className="h-4 w-4" />
      <span className="hidden sm:inline">Switchboard</span>
    </TabsTrigger>
    <TabsTrigger value="onesimpleapi">
      <Bell className="h-4 w-4" />
      <span className="hidden sm:inline">OneSimpleAPI</span>
    </TabsTrigger>
  </TabsList>
  
  {/* Tab content components */}
</Tabs>
```

### Information Banner

The component includes an informational banner at the top:

```tsx
<div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
  <p className="text-sm text-blue-900 dark:text-blue-100">
    Configure third-party integrations to extend credential.studio functionality. 
    Each integration can be enabled or disabled independently.
  </p>
</div>
```

**Design Pattern**: Use colored background with matching border to draw attention without being intrusive.

---

## IntegrationTabContent Wrapper

### Purpose

The `IntegrationTabContent` component is a reusable wrapper that provides consistent structure for all integration tabs. It handles the enable/disable toggle, header display, and placeholder state.


### Component Structure

**File Location**: `src/components/EventSettingsForm/IntegrationTabContent.tsx`

**Props Interface**:
```typescript
interface IntegrationTabContentProps {
  value: string;              // Tab identifier
  title: string;              // Integration name
  description: string;        // Brief description
  icon: LucideIcon;          // Icon component
  enabled: boolean;           // Enable/disable state
  onToggle: (checked: boolean) => void;  // Toggle handler
  children: ReactNode;        // Configuration form
  placeholderText: string;    // Text shown when disabled
}
```

### Usage Pattern

```tsx
<IntegrationTabContent
  value="cloudinary"
  title="Cloudinary Integration"
  description="Configure Cloudinary for image uploads and management"
  icon={Cloud}
  enabled={formData.cloudinaryEnabled || false}
  onToggle={(checked) => onInputChange("cloudinaryEnabled", checked)}
  placeholderText="Enable Cloudinary integration to configure image uploads"
>
  <CloudinaryTab {...props} />
</IntegrationTabContent>
```

### Layout Structure

The wrapper provides three distinct sections:

1. **Header Section**: Title, description, and enable/disable toggle
2. **Content Section**: Configuration form (shown when enabled)
3. **Placeholder Section**: Informative message with icon (shown when disabled)

```tsx
<TabsContent value={value} className="space-y-4">
  {/* Header with toggle */}
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

  {/* Configuration form (conditional) */}
  {enabled && children}

  {/* Placeholder (conditional) */}
  {!enabled && (
    <div className="p-8 text-center border rounded-lg border-dashed">
      <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
      <p className="text-muted-foreground">{placeholderText}</p>
    </div>
  )}
</TabsContent>
```

### Design Principles

1. **Consistent Header**: All integrations have the same header layout
2. **Clear State**: Visual distinction between enabled and disabled states
3. **Helpful Placeholders**: Guide users on what to do next
4. **Conditional Rendering**: Only render configuration when enabled


---

## IntegrationStatusIndicator Component

### Purpose

The `IntegrationStatusIndicator` provides visual feedback about the integration's readiness state, showing whether all required configuration is complete and API credentials are properly set.

### Component Structure

**File Location**: `src/components/IntegrationStatusIndicator.tsx`

**Props Interface**:
```typescript
interface IntegrationStatusIndicatorProps {
  isReady: boolean;      // Whether integration is fully configured
  statusMessage: string; // Descriptive status message
}
```

### Usage Pattern

```tsx
<IntegrationStatusIndicator 
  isReady={isReady} 
  statusMessage={statusMessage} 
/>
```

### Visual Design

The component uses color-coding to indicate status:

- **Ready (Green)**: All configuration complete, API credentials valid
- **Not Ready (Red)**: Missing configuration or invalid credentials

```tsx
<div className="p-4 border rounded-lg" style={{
  backgroundColor: isReady ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)',
  borderColor: isReady ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'
}}>
  <div className="flex items-center gap-3">
    <div className={`w-3 h-3 rounded-full ${isReady ? 'bg-green-500' : 'bg-red-500'}`}></div>
    <div>
      <p className={`text-sm font-medium ${isReady ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
        {isReady ? 'Ready' : 'Not Ready'}
      </p>
      <p className={`text-xs ${isReady ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
        {statusMessage}
      </p>
    </div>
  </div>
</div>
```

### Status Message Examples

**Cloudinary**:
- ✅ Ready: "Ready to upload - configuration complete"
- ❌ Not Ready: "Waiting for Cloud Name and Upload Preset to be configured"
- ⚠️ Warning: "API credentials missing in environment variables (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)"

**Switchboard**:
- ✅ Ready: "Ready to print - configuration complete"
- ❌ Not Ready: "Waiting for API Endpoint and Template ID to be configured"
- ⚠️ Warning: "API key missing in environment variables (SWITCHBOARD_API_KEY)"

### Implementation Pattern

Calculate status in the parent component:

```typescript
const isReady = !!(
  formData.cloudinaryCloudName && 
  formData.cloudinaryUploadPreset && 
  integrationStatus?.cloudinary
);

const statusMessage = getStatusMessage(
  formData.cloudinaryCloudName,
  formData.cloudinaryUploadPreset,
  integrationStatus
);
```


---

## Tab State Management

### localStorage Persistence

The active tab selection is persisted to localStorage to maintain user preference across sessions.

### Implementation

```typescript
const [activeIntegration, setActiveIntegration] = useState(() => {
  // Lazy initializer to avoid SSR issues
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('integrations-active-tab');
    if (saved && ['cloudinary', 'switchboard', 'onesimpleapi'].includes(saved)) {
      return saved;
    }
  }
  return 'cloudinary'; // Default tab
});

const handleTabChange = (value: string) => {
  setActiveIntegration(value);
  // Persist to localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem('integrations-active-tab', value);
  }
};
```

### Key Considerations

1. **SSR Safety**: Check for `window` object before accessing localStorage
2. **Validation**: Verify saved value is a valid tab identifier
3. **Default Fallback**: Provide sensible default when no saved value exists
4. **Lazy Initialization**: Use function initializer to avoid running on every render

### Benefits

- **User Experience**: Users return to their last viewed tab
- **Workflow Efficiency**: Reduces clicks when working on specific integration
- **State Persistence**: Survives page refreshes and navigation

---

## Enable/Disable Toggle Pattern

### Switch Component Usage

All integrations use the shadcn/ui `Switch` component for enable/disable functionality.

### Implementation Pattern

```tsx
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
```

### Design Principles

1. **Clear Labeling**: Show current state ("Enabled" or "Disabled")
2. **Visual Hierarchy**: Toggle is prominent but not overwhelming
3. **Immediate Feedback**: State changes are instant
4. **Consistent Placement**: Always in the same location (top-right of header)

### State Management

```typescript
// In parent component
const handleToggle = (checked: boolean) => {
  onInputChange("cloudinaryEnabled", checked);
};

// Pass to wrapper
<IntegrationTabContent
  enabled={formData.cloudinaryEnabled || false}
  onToggle={handleToggle}
  // ... other props
/>
```


---

## Section Grouping Pattern

### Purpose

Configuration forms are organized into logical sections using the `Settings` icon and semantic headings.

### Implementation Pattern

```tsx
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <Settings className="h-4 w-4" />
    <h4 className="text-sm font-semibold">Section Title</h4>
  </div>
  
  {/* Section content */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    {/* Form fields */}
  </div>
</div>
```

### Common Section Types

#### 1. API Configuration
```tsx
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <Settings className="h-4 w-4" />
    <h4 className="text-sm font-semibold">API Configuration</h4>
  </div>
  {/* API endpoint, credentials, etc. */}
</div>
```

#### 2. Upload Settings
```tsx
<div className="space-y-4">
  <div className="flex items-center gap-2">
    <Settings className="h-4 w-4" />
    <h4 className="text-sm font-semibold">Upload Settings</h4>
  </div>
  {/* Upload-related toggles and options */}
</div>
```

#### 3. Field Mappings
```tsx
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <Link className="h-4 w-4" />
      <h4 className="text-sm font-semibold">Field Mappings</h4>
    </div>
    <Button variant="outline" size="sm">
      <Plus className="mr-2 h-4 w-4" />
      Add Mapping
    </Button>
  </div>
  {/* Field mapping list */}
</div>
```

### Visual Hierarchy

1. **Icon + Heading**: Creates clear visual separation
2. **Consistent Spacing**: `space-y-4` between sections, `space-y-6` for major divisions
3. **Icon Size**: `h-4 w-4` for section icons
4. **Font Weight**: `font-semibold` for section headings

### Benefits

- **Scanability**: Users can quickly find relevant sections
- **Organization**: Related fields are grouped together
- **Visual Consistency**: Same pattern across all integrations

---

## Form Field Organization

### Grid Layout Pattern

Form fields use responsive grid layouts that adapt to screen size:

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
    <Label htmlFor="field1">Field 1</Label>
    <Input id="field1" />
  </div>
  
  <div className="space-y-2">
    <Label htmlFor="field2">Field 2</Label>
    <Input id="field2" />
  </div>
</div>
```

### Field Structure

Each form field follows this pattern:

```tsx
<div className="space-y-2">
  <Label htmlFor="fieldId" className="text-sm font-medium">
    Field Label {required && '*'}
  </Label>
  <Input
    id="fieldId"
    value={value}
    onChange={handleChange}
    placeholder="Placeholder text"
    className="h-10"
  />
  <p className="text-xs text-muted-foreground">
    Helper text explaining the field
  </p>
</div>
```


### Field Types and Patterns

#### Text Input
```tsx
<Input
  id="fieldId"
  value={formData.field || ""}
  onChange={(e) => onInputChange("field", e.target.value)}
  placeholder="Enter value"
  className="h-10"
/>
```

#### Textarea (for JSON/HTML templates)
```tsx
<Textarea
  id="fieldId"
  value={formData.field || ""}
  onChange={(e) => onInputChange("field", e.target.value)}
  placeholder="Enter template"
  className="min-h-[200px] font-mono text-sm"
/>
```

#### Select Dropdown
```tsx
<Select
  value={formData.field || "default"}
  onValueChange={(value) => onInputChange("field", value)}
>
  <SelectTrigger className="h-10">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

#### Toggle Switch (for boolean settings)
```tsx
<div className="flex items-center justify-between p-3 border rounded-lg">
  <div className="space-y-1">
    <Label className="text-sm font-medium">Setting Name</Label>
    <p className="text-xs text-muted-foreground">
      Description of what this setting does
    </p>
  </div>
  <Switch
    checked={formData.setting || false}
    onCheckedChange={(checked) => onInputChange("setting", checked)}
  />
</div>
```

### Helper Text Guidelines

1. **Always Include**: Every field should have helper text
2. **Be Specific**: Explain what the field does and what format is expected
3. **Examples**: Provide example values when helpful
4. **Warnings**: Use colored backgrounds for important notices

### Required Field Indicators

Mark required fields with an asterisk:

```tsx
<Label htmlFor="fieldId" className="text-sm font-medium">
  Field Name *
</Label>
```

---

## Placeholder Text Patterns

### Disabled State Placeholder

When an integration is disabled, show a centered placeholder with icon:

```tsx
{!enabled && (
  <div className="p-8 text-center border rounded-lg border-dashed">
    <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
    <p className="text-muted-foreground">{placeholderText}</p>
  </div>
)}
```

### Placeholder Text Examples

- **Cloudinary**: "Enable Cloudinary integration to configure image uploads"
- **Switchboard**: "Enable Switchboard Canvas integration to configure credential printing"
- **OneSimpleAPI**: "Enable OneSimpleAPI integration to configure webhook notifications"

### Design Principles

1. **Large Icon**: `h-12 w-12` makes it visually prominent
2. **Reduced Opacity**: `opacity-50` indicates inactive state
3. **Centered Layout**: `text-center` and `mx-auto` for balanced appearance
4. **Dashed Border**: `border-dashed` suggests placeholder/empty state
5. **Generous Padding**: `p-8` provides breathing room


### Information Banners

Use colored banners to highlight important information:

#### Security Notice (Blue)
```tsx
<div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
  <div className="flex items-start gap-3">
    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <div className="flex-1">
      <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
        API Credentials Configured Securely
      </h4>
      <p className="text-sm text-blue-700 dark:text-blue-300">
        API credentials are configured via environment variables for security.
        Contact your system administrator to update credentials.
      </p>
    </div>
  </div>
</div>
```

#### Available Placeholders (Green)
```tsx
<div className="p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
  <div className="text-xs space-y-2">
    <p className="font-medium text-green-900 dark:text-green-100 mb-2">Available Placeholders:</p>
    <ul className="space-y-1 text-green-800 dark:text-green-200">
      <li><code className="bg-green-100 dark:bg-green-900 px-1 rounded">{'{{placeholder}}'}</code> - Description</li>
    </ul>
  </div>
</div>
```

#### Field Mapping Info (Purple)
```tsx
<div className="p-4 border rounded-lg bg-purple-50 dark:bg-purple-950/20">
  <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
    <strong>Field Mappings</strong> allow you to map custom field responses to different variable names.
  </p>
</div>
```

### Color Coding Guidelines

- **Blue**: Information, security notices, general help
- **Green**: Success states, available options, helpful tips
- **Purple**: Feature explanations, advanced options
- **Amber/Yellow**: Warnings, important notes
- **Red**: Errors, missing configuration

---

## Responsive Design Patterns

### Mobile-First Approach

All integration forms are designed mobile-first with progressive enhancement for larger screens.

### Grid Breakpoints

```tsx
// Single column on mobile, two columns on medium screens and up
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {/* Fields */}
</div>
```

### Tab Label Hiding

Tab labels hide on small screens to save space:

```tsx
<TabsTrigger value="cloudinary" className="flex items-center gap-2">
  <Cloud className="h-4 w-4" />
  <span className="hidden sm:inline">Cloudinary</span>
</TabsTrigger>
```

**Breakpoint**: `sm:inline` shows labels at 640px and above

### Responsive Spacing

```tsx
// Adjust spacing based on screen size
<div className="space-y-4 md:space-y-6">
  {/* Content */}
</div>
```


### Full-Width Elements

Some elements should span full width on all screens:

```tsx
// Security notice spans both columns
<div className="col-span-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
  {/* Content */}
</div>
```

### Testing Responsive Design

Test at these breakpoints:
- **Mobile**: 375px (iPhone SE)
- **Tablet**: 768px (iPad)
- **Desktop**: 1024px and above

---

## Accessibility Considerations

### Keyboard Navigation

All interactive elements are keyboard accessible:

1. **Tab Order**: Follows logical reading order
2. **Focus Indicators**: Visible focus rings on all interactive elements
3. **Enter/Space**: Activates buttons and toggles
4. **Arrow Keys**: Navigate through select dropdowns

### ARIA Labels

#### Form Fields
```tsx
<Label htmlFor="fieldId">Field Name</Label>
<Input id="fieldId" aria-describedby="fieldId-help" />
<p id="fieldId-help" className="text-xs text-muted-foreground">
  Helper text
</p>
```

#### Switch Components
```tsx
<Switch
  id="setting-toggle"
  checked={enabled}
  onCheckedChange={onToggle}
  aria-label="Enable integration"
/>
```

#### Status Indicators
```tsx
<div role="status" aria-live="polite">
  <IntegrationStatusIndicator isReady={isReady} statusMessage={message} />
</div>
```

### Color Contrast

All text meets WCAG AA standards:
- **Normal Text**: Minimum 4.5:1 contrast ratio
- **Large Text**: Minimum 3:1 contrast ratio
- **Interactive Elements**: Clear focus indicators

### Screen Reader Support

#### Descriptive Labels
```tsx
<Label htmlFor="cloudinaryCloudName">
  Cloud Name
</Label>
```

#### Helper Text Association
```tsx
<Input
  id="cloudinaryCloudName"
  aria-describedby="cloudinaryCloudName-help"
/>
<p id="cloudinaryCloudName-help">
  Found in your Cloudinary dashboard
</p>
```

#### Status Messages
```tsx
<div role="alert" aria-live="assertive">
  {error && <p>{error}</p>}
</div>
```

### Focus Management

#### Tab Trapping in Dialogs
When field mapping dialog opens, focus is trapped within the dialog until closed.

#### Focus Return
After closing a dialog, focus returns to the trigger button.


---

## Complete Integration Tab Example

Here's a complete example showing all patterns together:

```tsx
import { memo } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings } from "lucide-react";
import { IntegrationStatusIndicator } from '@/components/IntegrationStatusIndicator';
import { EventSettings, IntegrationStatus } from './types';

interface ExampleTabProps {
  formData: EventSettings;
  onInputChange: <K extends keyof EventSettings>(field: K, value: EventSettings[K]) => void;
  integrationStatus: IntegrationStatus | null;
}

export const ExampleTab = memo(function ExampleTab({
  formData,
  onInputChange,
  integrationStatus
}: ExampleTabProps) {
  // Calculate status
  const isReady = !!(
    formData.exampleApiKey && 
    formData.exampleEndpoint && 
    integrationStatus?.example
  );
  
  const statusMessage = !formData.exampleApiKey || !formData.exampleEndpoint
    ? "Waiting for API Key and Endpoint to be configured"
    : integrationStatus === null
      ? "Checking API credentials..."
      : integrationStatus.example
        ? "Ready - configuration complete"
        : "⚠️ API credentials missing in environment variables";

  return (
    <div className="space-y-6">
      {/* Status Indicator */}
      <IntegrationStatusIndicator isReady={isReady} statusMessage={statusMessage} />

      {/* API Configuration Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h4 className="text-sm font-semibold">API Configuration</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="exampleApiKey" className="text-sm font-medium">
              API Key *
            </Label>
            <Input
              id="exampleApiKey"
              value={formData.exampleApiKey || ""}
              onChange={(e) => onInputChange("exampleApiKey", e.target.value)}
              placeholder="your-api-key"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              Your API key from the service dashboard
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="exampleEndpoint" className="text-sm font-medium">
              API Endpoint *
            </Label>
            <Input
              id="exampleEndpoint"
              value={formData.exampleEndpoint || ""}
              onChange={(e) => onInputChange("exampleEndpoint", e.target.value)}
              placeholder="https://api.example.com"
              className="h-10"
            />
            <p className="text-xs text-muted-foreground">
              The base URL for API requests
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="col-span-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                Secure Configuration
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Sensitive credentials are stored securely in environment variables.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h4 className="text-sm font-semibold">Settings</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="space-y-1">
              <Label className="text-sm font-medium">Enable Feature</Label>
              <p className="text-xs text-muted-foreground">
                Turn on this optional feature
              </p>
            </div>
            <Switch
              checked={formData.exampleFeature || false}
              onCheckedChange={(checked) => onInputChange("exampleFeature", checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
```


---

## Best Practices Summary

### Component Organization

1. **Use IntegrationTabContent**: Always wrap integration tabs with this component
2. **Consistent Structure**: Follow the established section grouping pattern
3. **Status First**: Place IntegrationStatusIndicator at the top of each tab
4. **Logical Sections**: Group related fields under clear headings

### Visual Design

1. **Color Coding**: Use consistent colors for different message types
2. **Icon Usage**: Include icons for visual hierarchy and recognition
3. **Spacing**: Maintain consistent spacing (`space-y-4` for sections, `space-y-6` for major divisions)
4. **Dark Mode**: Always test both light and dark modes

### User Experience

1. **Helper Text**: Every field should have descriptive helper text
2. **Placeholders**: Provide example values in input placeholders
3. **Required Fields**: Mark required fields with asterisks
4. **State Persistence**: Save user preferences to localStorage when appropriate

### Accessibility

1. **Labels**: Associate all inputs with labels using `htmlFor` and `id`
2. **ARIA**: Use appropriate ARIA attributes for dynamic content
3. **Keyboard**: Ensure all functionality is keyboard accessible
4. **Contrast**: Verify color contrast meets WCAG AA standards

### Performance

1. **Memoization**: Use `memo()` for integration tab components
2. **Lazy Loading**: Only render configuration when integration is enabled
3. **Conditional Rendering**: Use `&&` for conditional content
4. **Event Handlers**: Define handlers outside render when possible

---

## Common Patterns Quick Reference

### Status Indicator
```tsx
<IntegrationStatusIndicator isReady={isReady} statusMessage={message} />
```

### Section Header
```tsx
<div className="flex items-center gap-2">
  <Settings className="h-4 w-4" />
  <h4 className="text-sm font-semibold">Section Title</h4>
</div>
```

### Text Input Field
```tsx
<div className="space-y-2">
  <Label htmlFor="fieldId">Field Name *</Label>
  <Input id="fieldId" value={value} onChange={onChange} placeholder="Example" className="h-10" />
  <p className="text-xs text-muted-foreground">Helper text</p>
</div>
```

### Toggle Setting
```tsx
<div className="flex items-center justify-between p-3 border rounded-lg">
  <div className="space-y-1">
    <Label className="text-sm font-medium">Setting Name</Label>
    <p className="text-xs text-muted-foreground">Description</p>
  </div>
  <Switch checked={value} onCheckedChange={onChange} />
</div>
```

### Information Banner
```tsx
<div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
  <p className="text-sm text-blue-900 dark:text-blue-100">Information message</p>
</div>
```

### Disabled Placeholder
```tsx
{!enabled && (
  <div className="p-8 text-center border rounded-lg border-dashed">
    <Icon className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
    <p className="text-muted-foreground">Enable integration to configure</p>
  </div>
)}
```

---

## Related Documentation

- [Integration Architecture Guide](./INTEGRATION_ARCHITECTURE_GUIDE.md) - System architecture overview
- [Adding New Integration Guide](./ADDING_NEW_INTEGRATION_GUIDE.md) - Step-by-step integration creation
- [Integration Patterns Reference](./INTEGRATION_PATTERNS_REFERENCE.md) - Code templates and patterns
- [Integration Security Guide](./INTEGRATION_SECURITY_GUIDE.md) - Security best practices
- [Visual Design System](../../.kiro/steering/visual-design.md) - Complete design system reference

---

## Conclusion

The integration UI patterns provide a consistent, accessible, and user-friendly interface for configuring third-party services. By following these patterns, you ensure:

- **Consistency**: All integrations look and behave the same way
- **Usability**: Users can easily understand and configure integrations
- **Accessibility**: All users can access and use the interface
- **Maintainability**: Code is organized and easy to update
- **Scalability**: New integrations can be added quickly

When creating new integration UIs, refer to this guide and the existing implementations (Cloudinary, Switchboard, OneSimpleAPI) as examples.


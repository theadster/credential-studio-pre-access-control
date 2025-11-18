// EventSettingsForm - Main Export
// Clean exports for the refactored EventSettingsForm component

// Main component - exported as default for backward compatibility
export { EventSettingsFormContainer as default } from './EventSettingsFormContainer';
export { EventSettingsFormContainer } from './EventSettingsFormContainer';

// Tab components
export { GeneralTab } from './GeneralTab';
export { BarcodeTab } from './BarcodeTab';
export { CustomFieldsTab } from './CustomFieldsTab';
export { IntegrationsTab } from './IntegrationsTab';

// Integration sub-tab components
export { CloudinaryTab } from './CloudinaryTab';
export { SwitchboardTab } from './SwitchboardTab';
export { OneSimpleApiTab } from './OneSimpleApiTab';

// Reusable components
export { IntegrationSection } from './IntegrationSection';
export { SortableCustomField } from './SortableCustomField';
export { CustomFieldForm } from './CustomFieldForm';
export { FieldMappingForm } from './FieldMappingForm';

// Custom hook
export { useEventSettingsForm } from './useEventSettingsForm';

// Types and constants
export * from './types';
export * from './constants';
export * from './utils';

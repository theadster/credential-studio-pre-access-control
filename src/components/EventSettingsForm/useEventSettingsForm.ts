// useEventSettingsForm Hook
// Custom hook containing all form logic for EventSettingsForm

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { sanitizeHTMLTemplate } from '@/lib/sanitization';
import { validateEventSettings, validateSwitchboardRequestBody } from '@/lib/validation';
import { validateCustomFieldDeletion } from '@/lib/customFieldValidation';
import { CustomField, EventSettings, FieldMapping, IntegrationStatus } from './types';
import { checkPrintableFlagChanges, extractPrintableFlags, getInitialFormData, parseEventSettings } from './utils';

interface UseEventSettingsFormProps {
  eventSettings: EventSettings | null;
  isOpen: boolean;
  onSave: (settings: EventSettings) => Promise<void>;
  onClose: () => void;
}

export function useEventSettingsForm({
  eventSettings,
  isOpen,
  onSave,
  onClose,
}: UseEventSettingsFormProps) {
  const { success, error, info } = useSweetAlert();

  // Form state
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState<EventSettings>(getInitialFormData());
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldMappings, setFieldMappings] = useState<FieldMapping[]>([]);
  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatus | null>(null);
  const [originalPrintableFlags, setOriginalPrintableFlags] = useState<Map<string, boolean>>(new Map());

  // Modal state
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [editingFieldMapping, setEditingFieldMapping] = useState<FieldMapping | null>(null);

  // Fetch integration status on mount
  useEffect(() => {
    const fetchIntegrationStatus = async () => {
      try {
        const response = await fetch('/api/integrations/status');
        if (response.ok) {
          const status = await response.json();
          setIntegrationStatus(status);
        } else {
          // Log error for debugging
          console.error('Failed to fetch integration status:', response.status, response.statusText);
          // Set safe default to prevent UI breakage
          setIntegrationStatus({ cloudinary: false, switchboard: false });
        }
      } catch (err) {
        // Log full error for debugging
        console.error('Failed to fetch integration status:', err);
        // Set safe default to prevent UI breakage
        setIntegrationStatus({ cloudinary: false, switchboard: false });
      }
    };

    fetchIntegrationStatus();
  }, []);

  // Initialize form data when eventSettings changes
  useEffect(() => {
    if (eventSettings) {
      console.log('[EventSettingsForm] Raw eventSettings:', eventSettings);
      console.log('[EventSettingsForm] accessControlDefaults type:', typeof eventSettings.accessControlDefaults);
      console.log('[EventSettingsForm] accessControlDefaults value:', eventSettings.accessControlDefaults);
      
      const parsed = parseEventSettings(eventSettings);
      console.log('[EventSettingsForm] Parsed eventSettings:', parsed);
      console.log('[EventSettingsForm] Parsed accessControlDefaults:', parsed.accessControlDefaults);
      
      setFormData(parsed);
      setCustomFields(eventSettings.customFields || []);
      setOriginalPrintableFlags(extractPrintableFlags(eventSettings.customFields || []));

      // Ensure fieldMappings is always an array
      const mappings = eventSettings.switchboardFieldMappings;
      setFieldMappings(Array.isArray(mappings) ? mappings : []);
    } else {
      // Reset form for new event settings
      setFormData(getInitialFormData());
      setCustomFields([]);
      setFieldMappings([]);
      setOriginalPrintableFlags(new Map());
    }
  }, [eventSettings, isOpen]);

  // Memoized handlers
  const handleInputChange = useCallback(<K extends keyof EventSettings>(field: K, value: EventSettings[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Prepare settings data
      const settingsData = {
        ...formData,
        customFields,
        switchboardFieldMappings: fieldMappings,
      };

      // Validate required fields (isUpdate=true for existing settings, false for new)
      const isUpdate = Boolean(eventSettings);
      const settingsValidation = validateEventSettings(settingsData, isUpdate);
      if (!settingsValidation.valid) {
        error("Validation Error", settingsValidation.error || "Please fill in all required fields");
        setLoading(false);
        return;
      }

      // Note: OneSimpleAPI templates are NOT sanitized because:
      // 1. They are sent to an external webhook, not rendered in our application
      // 2. They need to support full HTML including <style> tags and <!DOCTYPE>
      // 3. The external API is responsible for handling the HTML safely
      // 4. Sanitization would break legitimate use cases (CSS styling, full HTML documents)

      // Validate Switchboard JSON request body
      if (settingsData.switchboardEnabled && settingsData.switchboardRequestBody) {
        const validation = validateSwitchboardRequestBody(settingsData.switchboardRequestBody);
        if (!validation.valid) {
          error("Invalid JSON", validation.error || "Request body must be valid JSON");
          setLoading(false);
          return;
        }
      }

      // Check if any printable flags have changed
      const hasPrintableFlagChanges = checkPrintableFlagChanges(customFields, originalPrintableFlags);

      await onSave(settingsData);

      // Show info message if printable flags were changed
      if (hasPrintableFlagChanges) {
        info(
          "Printable Field Configuration Updated",
          "Existing credential statuses will not be affected until attendee records are updated. Only future changes to these fields will impact credential status.",
        );
      }

      onClose();
    } catch (err: any) {
      console.error('Failed to save event settings:', err);
      error(
        'Save Failed',
        err?.message || 'An error occurred while saving event settings. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [customFields, eventSettings, fieldMappings, formData, onClose, onSave, originalPrintableFlags, error, info]);

  // Memoized custom field handlers
  const handleAddCustomField = useCallback(() => {
    setEditingField({
      fieldName: "",
      fieldType: "text",
      required: false,
      order: customFields.length + 1,
    });
    setShowFieldForm(true);
  }, [customFields.length]);

  const handleEditCustomField = useCallback((field: CustomField) => {
    setEditingField(field);
    setShowFieldForm(true);
  }, []);

  const handleSaveCustomField = useCallback((fieldData: CustomField) => {
    if (editingField?.id) {
      // Update existing field
      setCustomFields(prev => prev.map(f => (f.id === editingField.id ? fieldData : f)));
    } else {
      // Add new field
      const newField = {
        ...fieldData,
        id: `temp_${Date.now()}`,
        order: customFields.length + 1,
      };
      setCustomFields(prev => [...prev, newField]);
    }
    setShowFieldForm(false);
    setEditingField(null);
  }, [editingField, customFields.length]);

  const handleDeleteCustomField = useCallback((fieldId: string) => {
    const field = customFields.find(f => f.id === fieldId);
    if (!field) return;

    // Validate deletion
    const validation = validateCustomFieldDeletion(
      fieldId,
      field.fieldName,
      field.internalFieldName || '',
      formData,
    );

    if (!validation.canDelete) {
      const warningMessage = validation.warnings.length > 0
        ? validation.warnings.join('\n')
        : "This field is in use and cannot be deleted";

      error("Cannot Delete Field", warningMessage);
      return;
    }

    setCustomFields(prev => prev.filter(f => f.id !== fieldId));

    // Remove any field mappings for this field
    setFieldMappings(prev => prev.filter(m => m.fieldId !== fieldId));
  }, [customFields, formData, error]);

  // Memoized field mapping handlers
  const handleAddFieldMapping = useCallback(() => {
    setEditingFieldMapping(null);
    setShowMappingForm(true);
  }, []);

  const handleEditFieldMapping = useCallback((mapping: FieldMapping) => {
    setEditingFieldMapping(mapping);
    setShowMappingForm(true);
  }, []);

  const handleSaveFieldMapping = useCallback((mapping: FieldMapping) => {
    if (editingFieldMapping) {
      // Update existing mapping
      setFieldMappings(prev => prev.map(m => (
        m.fieldId === editingFieldMapping.fieldId && m.jsonVariable === editingFieldMapping.jsonVariable
          ? mapping
          : m
      )));
    } else {
      // Add new mapping
      setFieldMappings(prev => [...prev, mapping]);
    }
    setShowMappingForm(false);
    setEditingFieldMapping(null);
  }, [editingFieldMapping]);

  const handleDeleteFieldMapping = useCallback((fieldId: string, jsonVariable: string) => {
    setFieldMappings(prev => prev.filter(m =>
      !(m.fieldId === fieldId && m.jsonVariable === jsonVariable),
    ));
  }, []);

  return {
    // State
    loading,
    activeTab,
    formData,
    customFields,
    fieldMappings,
    integrationStatus,

    // Modal state
    editingField,
    showFieldForm,
    showMappingForm,
    editingFieldMapping,

    // Handlers
    setActiveTab,
    handleInputChange,
    handleSubmit,
    setCustomFields,

    // Custom field handlers
    handleAddCustomField,
    handleEditCustomField,
    handleSaveCustomField,
    handleDeleteCustomField,
    setShowFieldForm,
    setEditingField,

    // Field mapping handlers
    handleAddFieldMapping,
    handleEditFieldMapping,
    handleSaveFieldMapping,
    handleDeleteFieldMapping,
    setShowMappingForm,
    setEditingFieldMapping,
  };
}

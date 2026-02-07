// FieldMappingForm Component
// Modal form for mapping custom fields to JSON variables

import React, { useState, useEffect, useRef, memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Link, Settings, Type, Hash, Save, ToggleLeft, List } from "lucide-react";
import { CustomField, FieldMapping } from './types';
import { useSweetAlert } from '@/hooks/useSweetAlert';

interface FieldMappingFormProps {
  isOpen: boolean;
  customFields: CustomField[];
  editingMapping?: FieldMapping | null;
  onSave: (mapping: FieldMapping) => void;
  onCancel: () => void;
}

// Type guard to ensure field has an id
function hasId<T extends { id?: string }>(field: T): field is T & { id: string } {
  return !!field.id;
}

export const FieldMappingForm = memo(function FieldMappingForm({
  isOpen,
  customFields,
  editingMapping,
  onSave,
  onCancel
}: FieldMappingFormProps) {
  const { error: showError } = useSweetAlert();
  const [selectedField, setSelectedField] = useState<CustomField | null>(null);
  const [jsonVariable, setJsonVariable] = useState("");
  const [valueMapping, setValueMapping] = useState<{ [key: string]: string }>({});

  // Focus management ref
  const firstSelectRef = useRef<HTMLButtonElement>(null);

  // Filter fields that support mapping (boolean and select)
  const mappableFields = customFields.filter(field =>
    field.fieldType === 'boolean' || field.fieldType === 'select'
  );

  // Handle dialog open/close for focus management
  const handleOpenChange = (open: boolean) => {
    if (open) {
      // Focus first select when dialog opens
      firstSelectRef.current?.focus();
    } else {
      onCancel();
    }
  };

  // Initialize form with editing data
  useEffect(() => {
    if (editingMapping) {
      const field = customFields.find(f => f.id === editingMapping.fieldId);
      setSelectedField(field || null);
      setJsonVariable(editingMapping.jsonVariable);
      setValueMapping(editingMapping.valueMapping || {});
    } else {
      setSelectedField(null);
      setJsonVariable("");
      setValueMapping({});
    }
  }, [editingMapping, customFields]);

  useEffect(() => {
    if (selectedField && !editingMapping) {
      // Initialize value mapping based on field type (only for new mappings)
      if (selectedField.fieldType === 'boolean') {
        setValueMapping({
          'yes': '',
          'no': ''
        });
      } else if (
        selectedField.fieldType === 'select' &&
        selectedField.fieldOptions &&
        'options' in selectedField.fieldOptions &&
        Array.isArray(selectedField.fieldOptions.options)
      ) {
        const mapping: { [key: string]: string } = {};
        selectedField.fieldOptions.options.forEach((option: string) => {
          mapping[option] = '';
        });
        setValueMapping(mapping);
      }
    }
  }, [selectedField, editingMapping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedField || !jsonVariable.trim()) {
      return;
    }

    // Validate that the selected field has an id
    if (!selectedField.id) {
      // Show user-facing error notification
      showError(
        'Cannot Save Mapping',
        'The selected field is missing an ID. This indicates a data integrity issue. Please try selecting a different field or contact support.'
      );
      // Also log for debugging purposes
      console.error('Cannot save mapping: selected field is missing an id', {
        fieldName: selectedField.fieldName,
        fieldType: selectedField.fieldType,
      });
      return;
    }

    // Keep ALL value mappings, including empty ones
    // This prevents data loss when users are still filling in mappings
    const cleanedValueMapping: { [key: string]: string } = {};
    Object.entries(valueMapping).forEach(([key, value]) => {
      // Trim the value but keep it even if empty
      cleanedValueMapping[key] = value.trim();
    });

    const mapping: FieldMapping = {
      fieldId: selectedField.id,
      fieldName: selectedField.fieldName,
      fieldType: selectedField.fieldType,
      jsonVariable: jsonVariable.trim(),
      valueMapping: Object.keys(cleanedValueMapping).length > 0 ? cleanedValueMapping : undefined
    };

    onSave(mapping);
  };

  const updateValueMapping = (key: string, value: string) => {
    setValueMapping(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
        <form onSubmit={handleSubmit} className="flex flex-col">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Link className="h-5 w-5" />
              {editingMapping ? "Edit Field Mapping" : "Add Field Mapping"}
            </DialogTitle>
            <DialogDescription>
              Map custom field responses to specific variable names for your JSON request body.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div>
              <Label htmlFor="customField" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Settings className="h-4 w-4" />
                Custom Field *
              </Label>
              <Select
                value={selectedField?.id || ""}
                onValueChange={(value) => {
                  const field = mappableFields.find(f => f.id === value);
                  setSelectedField(field || null);
                  if (!editingMapping) {
                    setJsonVariable("");
                    setValueMapping({});
                  }
                }}
              >
                <SelectTrigger
                  ref={(node) => {
                    if (node) {
                      firstSelectRef.current = node;
                    }
                  }}
                  className="h-10"
                  aria-required="true"
                >
                  <SelectValue placeholder="Select a custom field to map" />
                </SelectTrigger>
                <SelectContent>
                  {mappableFields.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No boolean or select fields available
                    </SelectItem>
                  ) : (
                    mappableFields
                      .filter(hasId) // Type guard ensures field.id is defined
                      .map((field) => (
                        <SelectItem key={field.id} value={field.id}>
                          <div className="flex items-center gap-2">
                            {field.fieldType === 'boolean' ? (
                              <ToggleLeft className="h-4 w-4" />
                            ) : (
                              <List className="h-4 w-4" />
                            )}
                            <span>{field.fieldName}</span>
                            <Badge variant="outline" className="text-xs">{field.fieldType}</Badge>
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Only boolean (Yes/No) and select fields can be mapped
              </p>
            </div>

            {selectedField && (
              <>
                <div>
                  <Label htmlFor="jsonVariable" className="flex items-center gap-2 text-sm font-medium mb-2">
                    <Type className="h-4 w-4" />
                    JSON Variable Name *
                  </Label>
                  <Input
                    id="jsonVariable"
                    value={jsonVariable}
                    onChange={(e) => setJsonVariable(e.target.value)}
                    placeholder="e.g., vipStatus, membershipLevel"
                    required
                    className="h-10"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The variable name to use in your JSON request body
                  </p>
                </div>

                <div>
                  <Label className="flex items-center gap-2 text-sm font-medium mb-3">
                    <Hash className="h-4 w-4" />
                    Value Mappings
                  </Label>
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Map the field responses to specific values in your JSON:
                    </p>

                    {Object.entries(valueMapping).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <code className="bg-muted px-2 py-1 rounded-sm text-xs font-mono whitespace-nowrap">
                            {key}
                          </code>
                          <span className="text-muted-foreground">→</span>
                          <Input
                            value={value}
                            onChange={(e) => updateValueMapping(key, e.target.value)}
                            placeholder={`Value for "${key}"`}
                            className="h-9 flex-1"
                          />
                        </div>
                      </div>
                    ))}

                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Example:</strong> For a &quot;VIP Status&quot; boolean field, you might map:
                        <br />
                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">yes</code> → <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">1</code>
                        <br />
                        <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">no</code> → <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded-sm">0</code>
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedField || !jsonVariable.trim()}
            >
              <Save className="mr-2 h-4 w-4" />
              {editingMapping ? "Update Mapping" : "Add Mapping"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.customFields.length === nextProps.customFields.length &&
    prevProps.editingMapping?.fieldId === nextProps.editingMapping?.fieldId &&
    prevProps.editingMapping?.jsonVariable === nextProps.editingMapping?.jsonVariable &&
    prevProps.onSave === nextProps.onSave &&
    prevProps.onCancel === nextProps.onCancel
  );
});

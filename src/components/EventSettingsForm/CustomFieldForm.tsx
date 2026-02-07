// CustomFieldForm Component
// Modal form for creating and editing custom fields

import React, { memo, useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CheckSquare, Eye, FileText, Plus, Printer, Save, Settings, Type, X } from "lucide-react";
import { generateInternalFieldName } from "@/util/string";
import { FIELD_TYPES } from './constants';
import { getFieldIcon, getFieldPlaceholder } from './utils';
import { CustomField, FieldOptions, SelectFieldOptions, TextFieldOptions } from './types';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";

interface CustomFieldFormProps {
  isOpen: boolean;
  field: CustomField | null;
  onSave: (field: CustomField) => void;
  onCancel: () => void;
}

/** Field types that use the generic Input component for default values */
const INPUT_FIELD_TYPES = ['text', 'number', 'email', 'date', 'url'] as const;

/**
 * Maps a custom field type to the appropriate HTML input type
 */
function getInputTypeForField(fieldType: string): 'number' | 'email' | 'date' | 'url' | 'text' {
  switch (fieldType) {
    case 'number':
      return 'number';
    case 'email':
      return 'email';
    case 'date':
      return 'date';
    case 'url':
      return 'url';
    case 'text':
      return 'text';
    default:
      // Log warning for unexpected field types reaching this function
      console.warn(`getInputTypeForField: unexpected fieldType "${fieldType}", defaulting to text`);
      return 'text';
  }
}

// Sortable Select Option Component
interface SortableSelectOptionProps {
  id: string;
  option: string;
  index: number;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}

const SortableSelectOption = memo(({ id, option, index, onUpdate, onRemove }: SortableSelectOptionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center space-x-2">
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded-sm"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        value={option}
        onChange={(e) => onUpdate(id, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="h-9"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(id)}
        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

export const CustomFieldForm = memo(({ isOpen, field, onSave, onCancel }: CustomFieldFormProps) => {
  const [fieldData, setFieldData] = useState<CustomField>({
    fieldName: "",
    fieldType: "text",
    required: false,
    order: 1,
    printable: false,
  });
  const [selectOptions, setSelectOptions] = useState<{id: string; value: string}[]>([]);
  const [validationError, setValidationError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const optionIdCounter = useRef(0);

  // Focus management refs
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const isSubmittingRef = useRef(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Focus management effect
  useEffect(() => {
    if (isOpen) {
      // Store current focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus first input after dialog opens
      const timeoutId = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);

      return () => clearTimeout(timeoutId);
    } else {
      // Restore focus on close
      previousFocusRef.current?.focus();
      // Reset submission state when dialog closes
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (field) {
      setFieldData({ ...field });
      // Reset counter when field changes to keep IDs predictable
      optionIdCounter.current = 0;
      // Type guard to check if fieldOptions is SelectFieldOptions
      if (field.fieldType === "select" &&
        field.fieldOptions &&
        'options' in field.fieldOptions &&
        Array.isArray(field.fieldOptions.options)) {
        setSelectOptions(field.fieldOptions.options.map(opt => ({
          id: `opt-${optionIdCounter.current++}`,
          value: opt
        })));
      } else {
        setSelectOptions([]);
      }
    } else {
      setFieldData({
        fieldName: "",
        fieldType: "text",
        required: false,
        order: 1,
        printable: false,
        defaultValue: "",
        internalFieldName: "",
      });
      optionIdCounter.current = 0;
      setSelectOptions([]);
    }
    // Only reset submitting state if not actively submitting
    if (!isSubmittingRef.current) {
      setIsSubmitting(false);
    }
  }, [field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Guard against double submission using ref for synchronous check
    if (isSubmittingRef.current) return;

    // Clear previous validation errors
    setValidationError("");

    // Validate select options
    if (fieldData.fieldType === "select") {
      const nonEmptyOptions = selectOptions.filter(opt => opt.value.trim());
      if (nonEmptyOptions.length === 0) {
        setValidationError("Select fields must have at least one non-empty option.");
        return;
      }
      // Validate default value exists in non-empty options
      if (fieldData.defaultValue && !nonEmptyOptions.some(opt => opt.value === fieldData.defaultValue)) {
        setValidationError("Default value must be one of the available options.");
        return;
      }
    }

    let fieldOptions: FieldOptions | undefined;

    if (fieldData.fieldType === "select") {
      const nonEmptyOptions = selectOptions.filter(opt => opt.value.trim());
      fieldOptions = { options: nonEmptyOptions.map(opt => opt.value) } as SelectFieldOptions;
    } else if (fieldData.fieldType === "text") {
      // Type guard to safely access uppercase property
      const uppercase = fieldData.fieldOptions && 'uppercase' in fieldData.fieldOptions
        ? fieldData.fieldOptions.uppercase
        : false;
      fieldOptions = { uppercase } as TextFieldOptions;
    }

    const finalFieldData = {
      ...fieldData,
      fieldOptions
    };

    setIsSubmitting(true);
    isSubmittingRef.current = true;
    onSave(finalFieldData);
  };

  const addSelectOption = () => {
    setSelectOptions(prev => [...prev, { id: `opt-${optionIdCounter.current++}`, value: "" }]);
    setValidationError(""); // Clear error when adding options
  };

  const updateSelectOption = (id: string, value: string) => {
    setSelectOptions(prev => prev.map(opt => opt.id === id ? { ...opt, value } : opt));
    setValidationError(""); // Clear error when updating options
  };

  const removeSelectOption = (id: string) => {
    setSelectOptions(prev => prev.filter(opt => opt.id !== id));
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectOptions((items) => {
        const oldIndex = items.findIndex(opt => opt.id === active.id);
        const newIndex = items.findIndex(opt => opt.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const FieldIcon = getFieldIcon(fieldData.fieldType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
        <form onSubmit={handleSubmit} className="flex flex-col" autoComplete="off" data-form-type="other">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Settings className="h-5 w-5" />
              {field?.id ? "Edit Custom Field" : "Add Custom Field"}
            </DialogTitle>
            <DialogDescription>
              Define a new piece of information to collect from attendees.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 px-6 py-6">
            <div>
              <Label htmlFor="fieldName" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Type className="h-4 w-4" />
                Field Name *
              </Label>
              <Input
                ref={firstInputRef}
                id="fieldName"
                value={fieldData.fieldName}
                onChange={(e) => setFieldData(prev => ({ ...prev, fieldName: e.target.value }))}
                placeholder={getFieldPlaceholder(fieldData.fieldType)}
                required
                className="h-10"
                autoComplete="off"
                data-form-type="other"
                aria-required="true"
              />
              {fieldData.fieldName && (
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded-sm">
                  <span className="font-medium">Internal name:</span> {generateInternalFieldName(fieldData.fieldName)}
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="fieldType" className="flex items-center gap-2 text-sm font-medium mb-2">
                <Settings className="h-4 w-4" />
                Field Type
              </Label>
              <Select
                value={fieldData.fieldType}
                onValueChange={(value) => setFieldData(prev => ({ ...prev, fieldType: value }))}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((type) => {
                    const Icon = getFieldIcon(type.value);
                    return (
                      <SelectItem key={type.value} value={type.value}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" /> {type.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {fieldData.fieldType === "select" && (
              <div>
                <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                  Select Options
                </Label>
                <div className="space-y-2">
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleOptionDragEnd}
                  >
                    <SortableContext
                      items={selectOptions.map(opt => opt.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectOptions.map((option, index) => (
                        <SortableSelectOption
                          key={option.id}
                          id={option.id}
                          index={index}
                          option={option.value}
                          onUpdate={updateSelectOption}
                          onRemove={removeSelectOption}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSelectOption}
                    className="h-9"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Option
                  </Button>
                  {validationError && fieldData.fieldType === "select" && (
                    <p className="text-sm text-destructive mt-2">
                      {validationError}
                    </p>
                  )}
                </div>
              </div>
            )}

            {fieldData.fieldType === "text" && (
              <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
                <Switch
                  id="uppercase"
                  checked={
                    fieldData.fieldOptions && 'uppercase' in fieldData.fieldOptions
                      ? fieldData.fieldOptions.uppercase || false
                      : false
                  }
                  onCheckedChange={(checked) => setFieldData(prev => ({
                    ...prev,
                    fieldOptions: {
                      uppercase: checked
                    } as TextFieldOptions
                  }))}
                />
                <Label htmlFor="uppercase" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Type className="h-4 w-4" />
                  Convert to uppercase
                </Label>
              </div>
            )}

            <div className="flex items-center space-x-3 p-3 bg-muted/30 rounded-lg">
              <Switch
                id="required"
                checked={fieldData.required}
                onCheckedChange={(checked) => setFieldData(prev => ({ ...prev, required: checked }))}
              />
              <Label htmlFor="required" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <CheckSquare className="h-4 w-4" />
                Required field
              </Label>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="showOnMainPage" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Eye className="h-4 w-4" />
                  Show on Main Page
                </Label>
                <div className="text-xs text-muted-foreground">
                  Display this field as a column in the attendees table
                </div>
              </div>
              <Switch
                id="showOnMainPage"
                checked={fieldData.showOnMainPage !== false}
                onCheckedChange={(checked) => setFieldData(prev => ({ ...prev, showOnMainPage: checked }))}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="printable" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Printer className="h-4 w-4" />
                  Printable Field
                </Label>
                <div className="text-xs text-muted-foreground">
                  Mark this field as printable if it appears on the credential. Changes to printable fields will mark credentials as outdated and require reprinting.
                </div>
              </div>
              <Switch
                id="printable"
                checked={fieldData.printable || false}
                onCheckedChange={(checked) => setFieldData(prev => ({ ...prev, printable: checked }))}
              />
            </div>

            {/* Default Value Section */}
            <div>
              <Label htmlFor="defaultValue" className="flex items-center gap-2 text-sm font-medium mb-2">
                <FileText className="h-4 w-4" />
                Default Value
              </Label>
              <div className="text-xs text-muted-foreground mb-2">
                This value will be pre-filled when adding new attendees or importing records without this field.
              </div>
              {fieldData.fieldType === "boolean" ? (
                <Select
                  value={fieldData.defaultValue || "no"}
                  onValueChange={(value) => setFieldData(prev => ({ ...prev, defaultValue: value }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no">No</SelectItem>
                    <SelectItem value="yes">Yes</SelectItem>
                  </SelectContent>
                </Select>
              ) : fieldData.fieldType === "checkbox" ? (
                <Select
                  value={fieldData.defaultValue || "__none__"}
                  onValueChange={(value) => setFieldData(prev => ({ ...prev, defaultValue: value === "__none__" ? "" : value }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="No default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No default</SelectItem>
                    <SelectItem value="unchecked">Unchecked</SelectItem>
                    <SelectItem value="checked">Checked</SelectItem>
                  </SelectContent>
                </Select>
              ) : fieldData.fieldType === "select" ? (
                <Select
                  value={fieldData.defaultValue || "__none__"}
                  onValueChange={(value) => setFieldData(prev => ({ ...prev, defaultValue: value === "__none__" ? "" : value }))}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="No default" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No default</SelectItem>
                    {selectOptions.filter(opt => opt.value.trim()).map((option) => (
                      <SelectItem key={option.id} value={option.value}>{option.value}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : fieldData.fieldType === "textarea" ? (
                <Textarea
                  id="defaultValue"
                  value={fieldData.defaultValue || ""}
                  onChange={(e) => setFieldData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="Enter default value (optional)"
                  className="min-h-[80px]"
                />
              ) : (
                <Input
                  id="defaultValue"
                  type={getInputTypeForField(fieldData.fieldType)}
                  value={fieldData.defaultValue || ""}
                  onChange={(e) => setFieldData(prev => ({ ...prev, defaultValue: e.target.value }))}
                  placeholder="Enter default value (optional)"
                  className="h-10"
                />
              )}
            </div>
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-2 h-4 w-4" />
              {field?.id ? "Update Field" : "Add Field"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
});

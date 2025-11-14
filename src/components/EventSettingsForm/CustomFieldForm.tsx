// CustomFieldForm Component
// Modal form for creating and editing custom fields

import React, { useState, useEffect, useRef, memo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, Save, Plus, Type, Eye, Printer, CheckSquare, X } from "lucide-react";
import { generateInternalFieldName } from "@/util/string";
import { FIELD_TYPES } from './constants';
import { getFieldIcon, getFieldPlaceholder } from './utils';
import { CustomField, FieldOptions, SelectFieldOptions, TextFieldOptions } from './types';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from "lucide-react";

interface CustomFieldFormProps {
  isOpen: boolean;
  field: CustomField | null;
  onSave: (field: CustomField) => void;
  onCancel: () => void;
}

// Sortable Select Option Component
interface SortableSelectOptionProps {
  option: string;
  index: number;
  onUpdate: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

const SortableSelectOption = memo(function SortableSelectOption({ option, index, onUpdate, onRemove }: SortableSelectOptionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `option-${index}` });

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
        className="cursor-grab active:cursor-grabbing p-2 hover:bg-muted rounded"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <Input
        value={option}
        onChange={(e) => onUpdate(index, e.target.value)}
        placeholder={`Option ${index + 1}`}
        className="h-9"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => onRemove(index)}
        className="h-9 w-9 p-0 text-destructive hover:text-destructive"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
});

export const CustomFieldForm = memo(function CustomFieldForm({ isOpen, field, onSave, onCancel }: CustomFieldFormProps) {
  const [fieldData, setFieldData] = useState<CustomField>({
    fieldName: "",
    fieldType: "text",
    required: false,
    order: 1,
    printable: false,
  });
  const [selectOptions, setSelectOptions] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string>("");

  // Focus management refs
  const firstInputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    } else {
      // Restore focus on close
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (field) {
      setFieldData(field);
      // Type guard to check if fieldOptions is SelectFieldOptions
      if (field.fieldType === "select" &&
        field.fieldOptions &&
        'options' in field.fieldOptions &&
        Array.isArray(field.fieldOptions.options)) {
        setSelectOptions(field.fieldOptions.options);
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
      });
      setSelectOptions([]);
    }
  }, [field]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous validation errors
    setValidationError("");

    // Validate select options
    if (fieldData.fieldType === "select") {
      const nonEmptyOptions = selectOptions.filter(opt => opt.trim());
      if (nonEmptyOptions.length === 0) {
        setValidationError("Select fields must have at least one non-empty option.");
        return;
      }
    }

    let fieldOptions: FieldOptions | undefined;

    if (fieldData.fieldType === "select") {
      fieldOptions = { options: selectOptions } as SelectFieldOptions;
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

    onSave(finalFieldData);
  };

  const addSelectOption = () => {
    setSelectOptions(prev => [...prev, ""]);
    setValidationError(""); // Clear error when adding options
  };

  const updateSelectOption = (index: number, value: string) => {
    setSelectOptions(prev => prev.map((opt, i) => i === index ? value : opt));
    setValidationError(""); // Clear error when updating options
  };

  const removeSelectOption = (index: number) => {
    setSelectOptions(prev => prev.filter((_, i) => i !== index));
  };

  // Helper functions for option ID management
  const getOptionId = (index: number): string => {
    return `option-${index}`;
  };

  const parseOptionId = (id: string | number): number => {
    const idStr = String(id);
    const prefix = 'option-';

    if (!idStr.startsWith(prefix)) {
      console.error(`Invalid option ID format: "${idStr}". Expected format: "${prefix}N"`);
      return 0; // Safe fallback
    }

    const indexStr = idStr.replace(prefix, '');
    const index = parseInt(indexStr, 10);

    if (isNaN(index) || index < 0) {
      console.error(`Invalid option index in ID: "${idStr}". Parsed as: ${indexStr}`);
      return 0; // Safe fallback
    }

    return index;
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSelectOptions((items) => {
        const oldIndex = parseOptionId(active.id);
        const newIndex = parseOptionId(over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const FieldIcon = getFieldIcon(fieldData.fieldType);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="flex flex-col max-h-[90vh]" autoComplete="off" data-form-type="other">
          <div className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {field?.id ? "Edit Custom Field" : "Add Custom Field"}
              </DialogTitle>
              <DialogDescription>
                Define a new piece of information to collect from attendees.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-4 overflow-y-auto flex-1">
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
                <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">
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
                      items={selectOptions.map((_, index) => getOptionId(index))}
                      strategy={verticalListSortingStrategy}
                    >
                      {selectOptions.map((option, index) => (
                        <SortableSelectOption
                          key={getOptionId(index)}
                          index={index}
                          option={option}
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
          </div>
          <div className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Save className="mr-2 h-4 w-4" />
                {field?.id ? "Update Field" : "Add Field"}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

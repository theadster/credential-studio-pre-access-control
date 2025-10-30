// CustomFieldsTab Component
// Handles custom field management with drag-and-drop reordering

import React, { useMemo, useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CustomField } from './types';

interface CustomFieldsTabProps {
  customFields: CustomField[];
  onFieldsChange: (fields: CustomField[]) => void;
  onAddField: () => void;
  onEditField: (field: CustomField) => void;
  onDeleteField: (fieldId: string) => void;
  SortableFieldComponent: React.ComponentType<{
    field: CustomField;
    onEdit: (field: CustomField) => void;
    onDelete: (fieldId: string) => void;
  }>;
}

export function CustomFieldsTab({
  customFields,
  onFieldsChange,
  onAddField,
  onEditField,
  onDeleteField,
  SortableFieldComponent
}: CustomFieldsTabProps) {
  // State for accessibility announcements
  const [announcement, setAnnouncement] = useState('');

  // Setup drag-and-drop sensors (must be at top level, not in useMemo)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Memoize sorted fields (filter out fields without IDs)
  const sortedFields = useMemo(() =>
    customFields
      .filter(field => field.id != null)
      .sort((a, b) => a.order - b.order),
    [customFields]
  );

  // Memoize field IDs for SortableContext (only include fields with valid IDs)
  const fieldIds = useMemo(() =>
    customFields
      .filter(field => field.id != null)
      .map(field => field.id!),
    [customFields]
  );

  // Memoize drag end handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = customFields.findIndex((field) => field.id === active.id);
      const newIndex = customFields.findIndex((field) => field.id === over.id);

      const activeField = customFields[oldIndex];
      const overField = customFields[newIndex];

      const reorderedFields = [...customFields];
      const [movedField] = reorderedFields.splice(oldIndex, 1);
      reorderedFields.splice(newIndex, 0, movedField);

      // Update order property
      const updatedFields = reorderedFields.map((field, index) => ({
        ...field,
        order: index,
      }));

      // Announce the move for screen readers
      setAnnouncement(
        `Moved ${activeField?.fieldName} ${oldIndex < newIndex ? 'after' : 'before'
        } ${overField?.fieldName}`
      );

      onFieldsChange(updatedFields);
    }
  }, [customFields, onFieldsChange]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Custom Fields
            <Button type="button" size="sm" onClick={onAddField}>
              <Plus className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </CardTitle>
          <CardDescription>Add custom fields to collect additional attendee information</CardDescription>
        </CardHeader>
        <CardContent>
          {customFields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No custom fields configured. Click &quot;Add Field&quot; to create one.
            </div>
          ) : (
            <>
              {/* Screen reader announcement for drag-and-drop */}
              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
              >
                {announcement}
              </div>

              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={fieldIds}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {sortedFields.map((field) => (
                      <SortableFieldComponent
                        key={field.id}
                        field={field}
                        onEdit={onEditField}
                        onDelete={onDeleteField}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

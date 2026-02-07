// SortableCustomField Component
// Displays a single custom field in the sortable list with drag-and-drop functionality

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GripVertical, Edit, Trash2, Eye, Printer } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CustomField } from './types';
import { hasProperty } from '@/lib/typeGuards';

interface SortableCustomFieldProps {
  field: CustomField;
  onEdit: (field: CustomField) => void;
  onDelete: (fieldId: string) => void;
}

export function SortableCustomField({ field, onEdit, onDelete }: SortableCustomFieldProps) {
  // Guard against missing field.id - render non-draggable fallback
  if (!field.id) {
    return (
      <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-background opacity-50">
        <div className="flex items-center space-x-3 flex-1">
          <div className="p-1">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-medium">{field.fieldName}</span>
              <Badge variant="outline">{field.fieldType}</Badge>
              <Badge variant="destructive" className="text-xs">No ID</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onEdit(field)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled
            title="Cannot delete field without ID"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Normal draggable version for fields with valid IDs
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between p-3 border border-border rounded-lg bg-background ${isDragging ? 'shadow-lg' : ''
        }`}
    >
      <div className="flex items-center space-x-3 flex-1">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded-sm"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium">{field.fieldName}</span>
            <Badge variant="outline">{field.fieldType}</Badge>
            {field.required && <Badge variant="secondary">Required</Badge>}
            {field.fieldType === "text" && hasProperty(field.fieldOptions, 'uppercase') && Boolean(field.fieldOptions.uppercase) && (
              <Badge variant="outline" className="text-xs">
                UPPERCASE
              </Badge>
            )}
            {field.showOnMainPage !== false && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Visible
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This field is visible on the main attendees page</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {field.printable && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Badge variant="outline" className="text-xs">
                        <Printer className="h-3 w-3 mr-1" />
                        Printable
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This field appears on printed credentials</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {field.internalFieldName && (
            <div className="text-xs text-muted-foreground mt-1">
              Internal: {field.internalFieldName}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(field)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => onDelete(field.id!)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

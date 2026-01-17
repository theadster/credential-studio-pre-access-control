/**
 * NotesContentSection Component
 *
 * Filter section for notes and content: Notes text filter with operators and Has Notes checkbox.
 * Uses integrated filter input with operator selector inside the input container.
 *
 * Requirements:
 * - 1.7: Notes & Content section contains Notes text filter and Has Notes checkbox
 * - 5.4: Notes filter supports both text search and "Has Notes" checkbox option
 */

import * as React from 'react';
import { FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { IntegratedFilterInput } from '../components/IntegratedFilterInput';
import type { NotesFilter } from '@/lib/filterUtils';

export interface NotesContentSectionProps {
  /** Notes filter state */
  notes: NotesFilter;
  /** Callback when filter changes */
  onFilterChange: (key: string, value: string | boolean, property?: string) => void;
}

/**
 * NotesContentSection displays filter fields for notes and content.
 */
export function NotesContentSection({
  notes,
  onFilterChange,
}: NotesContentSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Notes Text Filter */}
      <IntegratedFilterInput
        id="notes"
        label="Notes"
        icon={FileText}
        operator={notes.operator}
        value={notes.value}
        onOperatorChange={(operator) => onFilterChange('notes', operator, 'operator')}
        onValueChange={(value) => onFilterChange('notes', value, 'value')}
        placeholder="Search notes..."
      />

      {/* Has Notes Checkbox */}
      <div className="flex items-center h-full pt-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="filter-hasNotes"
            checked={notes.hasNotes}
            onCheckedChange={(checked) =>
              onFilterChange('notes', checked === true, 'hasNotes')
            }
            className="data-[state=checked]:bg-violet-500 data-[state=checked]:border-violet-500"
          />
          <Label
            htmlFor="filter-hasNotes"
            className="text-sm font-normal cursor-pointer"
          >
            Has Notes
          </Label>
        </div>
      </div>
    </div>
  );
}

export default NotesContentSection;

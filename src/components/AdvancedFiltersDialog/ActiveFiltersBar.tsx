/**
 * ActiveFiltersBar Component
 *
 * Displays active filters as removable chips with a Clear All button.
 * Uses horizontal ScrollArea for overflow handling.
 *
 * Requirements:
 * - 2.1: Display Active_Filters_Bar when one or more filters are active
 * - 2.2: Display each active filter as a removable Filter_Chip badge
 * - 2.3: Clear filter immediately when remove button clicked
 * - 2.5: Hide bar when all filters are cleared
 * - 2.6: Include Clear All button to remove all filters at once
 * - 2.7: Update immediately when filter value changes
 * - 2.8: Horizontally scrollable if chips exceed available width
 * - 7.6: Announce changes to screen readers using aria-live regions
 */

import * as React from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import {
  type AdvancedSearchFilters,
  type FilterChip,
  filtersToChips,
  hasActiveFilters,
} from '@/lib/filterUtils';
import type { EventSettings } from '@/components/EventSettingsForm/types';

export interface ActiveFiltersBarProps {
  /** Current filter state */
  filters: AdvancedSearchFilters;
  /** Event settings for custom field names */
  eventSettings: EventSettings | null;
  /** Callback to remove a specific filter */
  onRemoveFilter: (filterKey: string, customFieldId?: string) => void;
  /** Callback to clear all filters */
  onClearAll: () => void;
}

/**
 * ActiveFiltersBar displays currently applied filters as removable chips.
 * Hidden when no filters are active.
 */
export function ActiveFiltersBar({
  filters,
  eventSettings,
  onRemoveFilter,
  onClearAll,
}: ActiveFiltersBarProps) {
  // Convert filter state to display chips (Requirements 2.1, 2.2)
  const chips = filtersToChips(filters, eventSettings);

  // Don't render if no chips are active (Requirement 2.5)
  // This ensures visibility logic matches chip rendering logic
  if (chips.length === 0) {
    return null;
  }

  // Handle chip removal (Requirement 2.3)
  const handleRemoveChip = (chip: FilterChip) => {
    onRemoveFilter(chip.filterKey, chip.customFieldId);
  };

  return (
    <div className="border-b border-border pb-3 mb-4">
      {/* Aria-live region for screen reader announcements (Requirement 7.6) */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {chips.length} active filter{chips.length !== 1 ? 's' : ''}
      </div>

      <div className="flex items-center gap-2">
        {/* Horizontal scrollable area for chips (Requirement 2.8) */}
        <ScrollArea className="flex-1 whitespace-nowrap">
          <div className="flex items-center gap-2 py-1">
            {chips.map((chip) => (
              <Badge
                key={chip.id}
                variant="secondary"
                className="flex items-center gap-1 px-2 py-1 shrink-0"
              >
                <span className="text-xs font-medium">{chip.label}:</span>
                <span className="text-xs max-w-[150px] truncate">{chip.value}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChip(chip)}
                  className="ml-1 hover:bg-muted rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                  aria-label={`Remove ${chip.label} filter`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        {/* Clear All button (Requirement 2.6) */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearAll}
          className="shrink-0 text-muted-foreground hover:text-foreground"
        >
          Clear All
        </Button>
      </div>
    </div>
  );
}

export default ActiveFiltersBar;

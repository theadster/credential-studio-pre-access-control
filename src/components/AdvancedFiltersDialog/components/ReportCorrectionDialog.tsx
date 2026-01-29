/**
 * ReportCorrectionDialog Component
 *
 * Dialog for handling stale parameters in saved reports. When a report
 * contains references to deleted custom fields or removed dropdown values,
 * this dialog allows users to:
 * - View which parameters are stale and why
 * - Remove individual stale parameters
 * - Replace stale custom fields with valid alternatives
 * - Apply the report with only valid filters
 * - Save corrections to update the report
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.4
 */

import * as React from 'react';
import { AlertTriangle, ArrowRight, Check, RefreshCw, Trash2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import type { ReportValidationResult, SavedReport, StaleParameter } from '@/types/reports';
import type { CustomField, EventSettings } from '@/components/EventSettingsForm/types';
import type { AdvancedSearchFilters, CustomFieldFilter } from '@/lib/filterUtils';

export interface ReportCorrectionDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void;
  /** The report being corrected */
  report: SavedReport | null;
  /** Validation result containing stale parameters */
  validationResult: ReportValidationResult | null;
  /** Current event settings for field replacement options */
  eventSettings: EventSettings | null;
  /** Callback when user chooses to apply with stale parameters removed */
  onApplyWithRemoval: (validConfig: AdvancedSearchFilters) => void;
  /** Callback when user saves corrections to the report */
  onSaveCorrections: (correctedConfig: AdvancedSearchFilters) => Promise<void>;
}

/**
 * Format the original value for display
 */
function formatOriginalValue(value: string | string[] | undefined): string {
  if (!value) return '(empty)';
  if (Array.isArray(value)) {
    if (value.length === 0) return '(empty)';
    if (value.length === 1) return `"${value[0]}"`;
    return value.map((v) => `"${v}"`).join(', ');
  }
  return `"${value}"`;
}

/**
 * Get reason display text
 */
function getReasonText(reason: 'field_deleted' | 'value_deleted'): string {
  return reason === 'field_deleted'
    ? 'Field no longer exists'
    : 'Value no longer available';
}

/**
 * Get available custom fields for replacement (excluding already used ones)
 * Returns only fields with guaranteed id property
 */
function getAvailableReplacementFields(
  eventSettings: EventSettings | null,
  currentConfig: AdvancedSearchFilters,
  excludeFieldId: string,
): Array<CustomField & { id: string }> {
  if (!eventSettings?.customFields) return [];

  // Get IDs of fields already in use in the configuration
  const usedFieldIds = new Set(Object.keys(currentConfig?.customFields || {}));

  // Return fields that have id and are not already in use and not the stale field
  return eventSettings.customFields.filter(
    (field): field is CustomField & { id: string } =>
      field.id !== undefined &&
      !usedFieldIds.has(field.id) &&
      field.id !== excludeFieldId,
  );
}

/**
 * Individual stale parameter item
 */
interface StaleParameterItemProps {
  parameter: StaleParameter;
  eventSettings: EventSettings | null;
  currentConfig: AdvancedSearchFilters;
  onRemove: () => void;
  onReplace: (newFieldId: string) => void;
  replacementFieldId: string | null;
}

function StaleParameterItem({
  parameter,
  eventSettings,
  currentConfig,
  onRemove,
  onReplace,
  replacementFieldId,
}: StaleParameterItemProps) {
  const availableFields = React.useMemo(
    () => getAvailableReplacementFields(eventSettings, currentConfig, parameter.fieldId),
    [eventSettings, currentConfig, parameter.fieldId],
  );

  const canReplace = parameter.reason === 'field_deleted' && availableFields.length > 0;

  return (
    <div
      className="p-4 border border-amber-200 dark:border-amber-800/50 rounded-lg bg-amber-50/50 dark:bg-amber-950/20"
      data-testid={`stale-param-${parameter.fieldId}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Parameter Info */}
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <span
              className="font-medium text-foreground"
              data-testid={`stale-param-name-${parameter.fieldId}`}
            >
              {parameter.fieldName}
            </span>
            <Badge
              variant="outline"
              className="text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300"
            >
              {parameter.type === 'customField' ? 'Custom Field' : 'Field Value'}
            </Badge>
          </div>

          {/* Reason */}
          <p className="text-sm text-muted-foreground mb-2">
            {getReasonText(parameter.reason)}
          </p>

          {/* Original Value */}
          <div className="text-sm">
            <span className="text-muted-foreground">Original value: </span>
            <span
              className="font-mono text-foreground"
              data-testid={`stale-param-value-${parameter.fieldId}`}
            >
              {formatOriginalValue(parameter.originalValue)}
            </span>
          </div>

          {/* Replacement Dropdown (only for deleted fields) */}
          {canReplace && (
            <div className="mt-3 flex items-center gap-2">
              <Label
                htmlFor={`replace-${parameter.fieldId}`}
                className="text-sm text-muted-foreground whitespace-nowrap"
              >
                Replace with:
              </Label>
              <Select
                value={replacementFieldId || ''}
                onValueChange={onReplace}
              >
                <SelectTrigger
                  id={`replace-${parameter.fieldId}`}
                  className="w-[200px] h-8 text-sm"
                  data-testid={`stale-param-replace-${parameter.fieldId}`}
                >
                  <SelectValue placeholder="Select field..." />
                </SelectTrigger>
                <SelectContent>
                  {availableFields.map((field) => (
                    <SelectItem key={field.id} value={field.id}>
                      {field.fieldName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {replacementFieldId && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onReplace('')}
                  title="Clear replacement"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Remove Button */}
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
          onClick={onRemove}
          title="Remove this filter"
          data-testid={`stale-param-remove-${parameter.fieldId}`}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove</span>
        </Button>
      </div>
    </div>
  );
}

/**
 * ReportCorrectionDialog displays stale parameters and provides
 * options to fix or remove them before applying the report.
 *
 * Requirements: 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 7.4
 */
export function ReportCorrectionDialog({
  open,
  onOpenChange,
  report,
  validationResult,
  eventSettings,
  onApplyWithRemoval,
  onSaveCorrections,
}: ReportCorrectionDialogProps) {
  // Track which stale parameters have been removed
  const [removedParams, setRemovedParams] = React.useState<Set<string>>(new Set());
  // Track field replacements (staleFieldId -> newFieldId)
  const [replacements, setReplacements] = React.useState<Map<string, string>>(new Map());
  // Saving state
  const [isSaving, setIsSaving] = React.useState(false);
  // Track if original config failed to parse
  const [configParseError, setConfigParseError] = React.useState(false);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setRemovedParams(new Set());
      setReplacements(new Map());
      setIsSaving(false);
      setConfigParseError(false);
    }
  }, [open]);

  // Track parse errors when report filterConfiguration changes
  React.useEffect(() => {
    if (!report?.filterConfiguration) {
      setConfigParseError(false);
      return;
    }

    try {
      JSON.parse(report.filterConfiguration);
      setConfigParseError(false);
    } catch {
      setConfigParseError(true);
    }
  }, [report?.filterConfiguration]);

  // Get the current working configuration (with user's corrections applied)
  const workingConfig = React.useMemo((): AdvancedSearchFilters | null => {
    if (!validationResult) return null;

    // Start with the valid configuration
    const config: AdvancedSearchFilters = JSON.parse(
      JSON.stringify(validationResult.validConfiguration),
    );

    // Parse original configuration once (not in the loop)
    let originalConfig: AdvancedSearchFilters | null = null;
    let parseError = false;
    if (report?.filterConfiguration) {
      try {
        originalConfig = JSON.parse(report.filterConfiguration) as AdvancedSearchFilters;
      } catch (err) {
        console.error(
          `Failed to parse filter configuration for report "${report.name}":`,
          err instanceof Error ? err.message : String(err),
        );
        parseError = true;
        originalConfig = null;
      }
    }

    // Apply replacements only if original config was successfully parsed
    if (!parseError) {
      replacements.forEach((newFieldId, staleFieldId) => {
        if (originalConfig?.customFields[staleFieldId]) {
          // Copy the filter to the new field ID
          config.customFields[newFieldId] = { ...originalConfig.customFields[staleFieldId] };
          // Remove the stale field
          delete config.customFields[staleFieldId];
        }
      });
    }

    // Remove stale parameters that were marked for removal
    removedParams.forEach((fieldId) => {
      delete config.customFields[fieldId];
    });

    return config;
  }, [validationResult, replacements, removedParams, report]);

  // Filter out removed parameters from display
  const visibleStaleParams = React.useMemo(() => {
    if (!validationResult) return [];
    return validationResult.staleParameters.filter(
      (param) => !removedParams.has(param.fieldId),
    );
  }, [validationResult, removedParams]);

  // Check if there are any corrections to save
  const hasCorrections = removedParams.size > 0 || replacements.size > 0;

  // Handle removing a stale parameter
  const handleRemove = React.useCallback((fieldId: string) => {
    setRemovedParams((prev) => new Set([...prev, fieldId]));
    // Also clear any replacement for this field
    setReplacements((prev) => {
      const next = new Map(prev);
      next.delete(fieldId);
      return next;
    });
  }, []);

  // Handle replacing a stale field
  const handleReplace = React.useCallback((staleFieldId: string, newFieldId: string) => {
    setReplacements((prev) => {
      const next = new Map(prev);
      if (newFieldId) {
        next.set(staleFieldId, newFieldId);
      } else {
        next.delete(staleFieldId);
      }
      return next;
    });
  }, []);

  // Handle applying with valid filters only
  const handleApplyWithRemoval = React.useCallback(() => {
    if (!workingConfig) return;
    onApplyWithRemoval(workingConfig);
    onOpenChange(false);
  }, [workingConfig, onApplyWithRemoval, onOpenChange]);

  // Handle saving corrections
  const handleSaveCorrections = React.useCallback(async () => {
    if (!workingConfig) return;

    setIsSaving(true);
    try {
      try {
        await onSaveCorrections(workingConfig);
        // Only close dialog on successful save
        onOpenChange(false);
      } catch (error) {
        console.error(
          '[ReportCorrectionDialog] Error saving corrections:',
          error instanceof Error ? error.message : String(error),
        );
        // Show user-facing error message
        alert(
          'Failed to save corrections. Please try again or contact support if the problem persists.'
        );
      }
    } finally {
      setIsSaving(false);
    }
  }, [workingConfig, onSaveCorrections, onOpenChange]);

  // Don't render if no validation result
  if (!validationResult || !report) return null;

  const totalStaleParams = validationResult.staleParameters.length;
  const unresolvedParams = visibleStaleParams.filter(
    (p) => !replacements.has(p.fieldId),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            Report Needs Attention
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            The report &quot;{report.name}&quot; contains {totalStaleParams} filter
            {totalStaleParams === 1 ? '' : 's'} that reference{totalStaleParams === 1 ? 's' : ''}{' '}
            data that no longer exists. You can remove or replace these filters before applying.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Summary Badge */}
          {visibleStaleParams.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  unresolvedParams > 0
                    ? 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'
                    : 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
                }
              >
                {unresolvedParams > 0
                  ? `${unresolvedParams} unresolved`
                  : 'All issues addressed'}
              </Badge>
              {removedParams.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {removedParams.size} removed
                </Badge>
              )}
              {replacements.size > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {replacements.size} replaced
                </Badge>
              )}
            </div>
          )}

          {/* Stale Parameters List */}
          {visibleStaleParams.length > 0 ? (
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-3" data-testid="stale-params-list">
                {visibleStaleParams.map((param) => (
                  <StaleParameterItem
                    key={param.fieldId}
                    parameter={param}
                    eventSettings={eventSettings}
                    currentConfig={workingConfig || validationResult.validConfiguration}
                    onRemove={() => handleRemove(param.fieldId)}
                    onReplace={(newFieldId) => handleReplace(param.fieldId, newFieldId)}
                    replacementFieldId={replacements.get(param.fieldId) || null}
                  />
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Check className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-foreground font-medium">All issues resolved</p>
              <p className="text-sm text-muted-foreground mt-1">
                You can now apply or save the corrected report.
              </p>
            </div>
          )}

          {/* Info text */}
          <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <RefreshCw className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Apply with valid filters only</strong> will load the report without the
              stale filters. <strong>Save corrections</strong> will update the saved report
              with your changes.
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800 flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="secondary"
              onClick={handleApplyWithRemoval}
              disabled={isSaving}
              className="flex-1 sm:flex-none"
              data-testid="apply-with-removal-btn"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Apply with valid filters only
            </Button>
            {hasCorrections && (
              <Button
                onClick={handleSaveCorrections}
                disabled={isSaving}
                className="flex-1 sm:flex-none"
                data-testid="save-corrections-btn"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save corrections
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ReportCorrectionDialog;

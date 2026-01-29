/**
 * AdvancedFiltersDialog Component
 *
 * Main dialog component for advanced attendee filtering with collapsible accordion sections,
 * active filters summary bar, and simplified visual design.
 *
 * Requirements:
 * - 1.1: Display filter fields organized into collapsible accordion sections
 * - 1.2: Group filters into sections: Basic Information, Notes & Content, Access Control, Custom Fields
 * - 1.4: Expand section when user clicks collapsed section header
 * - 1.5: Collapse section when user clicks expanded section header
 * - 1.10: Basic Information section expanded by default
 * - 1.11: Allow multiple sections expanded simultaneously
 * - 2.1: Display Active_Filters_Bar when filters are active
 * - 2.3: Clear filter immediately when chip remove button clicked
 * - 2.6: Include Clear All button
 * - 5.8: Validate at least one filter is set before applying
 * - 7.1: Display "Save Report" and "Load Report" buttons in dialog footer
 * - 7.2: Disable "Save Report" when no filters are active
 */

import * as React from 'react';
import { Search, User, FileText, Shield, Settings, Info, Save, FolderOpen } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ActiveFiltersBar } from './ActiveFiltersBar';
import {
  BasicInfoSection,
  NotesContentSection,
  AccessControlSection,
  CustomFieldsSection,
} from './sections';
import {
  type AdvancedSearchFilters,
  type FilterMatchMode,
  type FilterSection,
  countSectionFilters,
  hasActiveFilters,
  createEmptyFilters,
  cleanFilterConfigurationForSaving,
} from '@/lib/filterUtils';
import { isAccessControlEnabledForEvent } from '@/lib/accessControlFeature';
import type { EventSettings } from '@/components/EventSettingsForm/types';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { useReports, type LoadReportResult } from '@/hooks/useReports';
import { SaveReportDialog } from './components/SaveReportDialog';
import { LoadReportDialog } from './components/LoadReportDialog';
import { ReportCorrectionDialog } from './components/ReportCorrectionDialog';
import type { SavedReport, ReportValidationResult } from '@/types/reports';

/**
 * Section configuration for accordion
 */
interface SectionConfig {
  id: FilterSection;
  title: string;
  icon: React.ElementType;
  defaultExpanded: boolean;
  condition?: (eventSettings: EventSettings | null) => boolean;
}

const SECTION_CONFIG: SectionConfig[] = [
  {
    id: 'basic',
    title: 'Basic Information',
    icon: User,
    defaultExpanded: true,
  },
  {
    id: 'notes',
    title: 'Notes & Content',
    icon: FileText,
    defaultExpanded: false,
  },
  {
    id: 'access',
    title: 'Access Control',
    icon: Shield,
    defaultExpanded: false,
    condition: (settings) => isAccessControlEnabledForEvent(settings?.accessControlEnabled),
  },
  {
    id: 'custom',
    title: 'Event Fields',
    icon: Settings,
    defaultExpanded: false,
  },
];

export interface AdvancedFiltersDialogProps {
  /** Event settings containing custom fields and access control config */
  eventSettings: EventSettings | null;
  /** Current filter state */
  filters: AdvancedSearchFilters;
  /** Callback when any filter value changes */
  onFiltersChange: (filters: AdvancedSearchFilters) => void;
  /** Callback when Apply Search is clicked */
  onApply: () => void;
  /** Callback when Clear All is clicked */
  onClear: () => void;
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void;
}

/**
 * AdvancedFiltersDialog provides a comprehensive filtering interface
 * with collapsible sections and an active filters summary bar.
 */
export function AdvancedFiltersDialog({
  eventSettings,
  filters,
  onFiltersChange,
  onApply,
  onClear,
  open,
  onOpenChange,
}: AdvancedFiltersDialogProps) {
  const { error: showError, success } = useSweetAlert();

  // Track expanded sections - Basic Information expanded by default (Requirement 1.10)
  const [expandedSections, setExpandedSections] = React.useState<string[]>(['basic']);

  // Reports integration state (Requirements 7.1, 7.2)
  const {
    reports,
    isLoading: isLoadingReports,
    error: reportsError,
    hasPermission: hasReportsPermission,
    createReport,
    updateReport,
    deleteReport,
    loadReport,
    refreshReports,
  } = useReports();

  // Dialog states for Save/Load/Correction dialogs
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = React.useState(false);
  const [correctionDialogOpen, setCorrectionDialogOpen] = React.useState(false);
  const [isSavingReport, setIsSavingReport] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // State for report correction flow
  const [pendingReport, setPendingReport] = React.useState<SavedReport | null>(null);
  const [pendingValidation, setPendingValidation] = React.useState<ReportValidationResult | null>(null);

  // Get visible sections based on conditions (Requirement 1.8 - Access Control conditional)
  const visibleSections = React.useMemo(
    () =>
      SECTION_CONFIG.filter(
        (section) => !section.condition || section.condition(eventSettings)
      ),
    [eventSettings]
  );

  // Handle filter changes for basic info section
  const handleBasicInfoChange = React.useCallback(
    (key: string, value: string, property?: string) => {
      const newFilters = { ...filters };

      if (key === 'photoFilter') {
        newFilters.photoFilter = value as 'all' | 'with' | 'without';
      } else if (key === 'credentialFilter') {
        newFilters.credentialFilter = value as 'all' | 'with' | 'without';
      } else if (property && (key === 'firstName' || key === 'lastName' || key === 'barcode')) {
        newFilters[key] = {
          ...newFilters[key],
          [property]: value,
        };
      }

      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Handle filter changes for notes section
  const handleNotesChange = React.useCallback(
    (key: string, value: string | boolean, property?: string) => {
      if (key === 'notes' && property) {
        const newFilters = {
          ...filters,
          notes: {
            ...filters.notes,
            [property]: value,
          },
        };
        onFiltersChange(newFilters);
      }
    },
    [filters, onFiltersChange]
  );

  // Handle filter changes for access control section
  const handleAccessControlChange = React.useCallback(
    (key: string, value: string) => {
      const newFilters = {
        ...filters,
        accessControl: {
          ...filters.accessControl,
          [key]: key === 'accessStatus' ? value as 'all' | 'active' | 'inactive' : value,
        },
      };
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Handle filter changes for custom fields section
  const handleCustomFieldChange = React.useCallback(
    (fieldId: string, value: string | string[], property?: string) => {
      const currentFilter = filters.customFields[fieldId] || { value: '', operator: 'contains' };
      const newFilters = {
        ...filters,
        customFields: {
          ...filters.customFields,
          [fieldId]: property
            ? { ...currentFilter, [property]: value }
            : { ...currentFilter, value },
        },
      };
      onFiltersChange(newFilters);
    },
    [filters, onFiltersChange]
  );

  // Handle removing a specific filter from the active filters bar
  const handleRemoveFilter = React.useCallback(
    (filterKey: string, customFieldId?: string) => {
      const newFilters = { ...filters };
      let hasChanged = false;

      switch (filterKey) {
        case 'firstName':
        case 'lastName':
        case 'barcode':
          newFilters[filterKey] = { value: '', operator: 'contains' };
          hasChanged = true;
          break;
        case 'photoFilter':
          newFilters.photoFilter = 'all';
          hasChanged = true;
          break;
        case 'credentialFilter':
          newFilters.credentialFilter = 'all';
          hasChanged = true;
          break;
        case 'notes':
          newFilters.notes = { ...(newFilters.notes || {}), value: '', operator: 'contains' };
          hasChanged = true;
          break;
        case 'hasNotes':
          newFilters.notes = { ...(newFilters.notes || {}), hasNotes: false };
          hasChanged = true;
          break;
        case 'accessStatus':
          newFilters.accessControl = { ...(newFilters.accessControl || {}), accessStatus: 'all' };
          hasChanged = true;
          break;
        case 'validFrom':
          newFilters.accessControl = {
            ...(newFilters.accessControl || {}),
            validFromStart: '',
            validFromEnd: '',
          };
          hasChanged = true;
          break;
        case 'validUntil':
          newFilters.accessControl = {
            ...(newFilters.accessControl || {}),
            validUntilStart: '',
            validUntilEnd: '',
          };
          hasChanged = true;
          break;
        case 'customField':
          if (customFieldId) {
            newFilters.customFields = {
              ...(newFilters.customFields || {}),
              [customFieldId]: {
                value: '',
                operator: 'contains'
              }
            };
            hasChanged = true;
          }
          break;
      }

      if (hasChanged) {
        onFiltersChange(newFilters);
      }
    },
    [filters, onFiltersChange]
  );

  // Handle Clear All - reset all filters
  const handleClearAll = React.useCallback(() => {
    onFiltersChange(createEmptyFilters());
    onClear();
  }, [onFiltersChange, onClear]);

  // Handle Apply Search with validation (Requirement 5.8)
  const handleApply = React.useCallback(() => {
    if (!hasActiveFilters(filters)) {
      showError('Please enter at least one search criterion');
      return;
    }
    onApply();
    onOpenChange(false);
  }, [filters, onApply, onOpenChange, showError]);

  // Handle Cancel
  const handleCancel = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Check if save button should be disabled (Requirement 7.2)
  const isSaveDisabled = !hasActiveFilters(filters);

  /**
   * Handle saving current filters as a report
   * Requirements: 1.1, 1.2, 7.6
   */
  const handleSaveReport = React.useCallback(
    async (name: string, description?: string) => {
      setIsSavingReport(true);
      setSaveError(null);
      
      // Clean the filter configuration to remove empty custom fields
      // This prevents stale parameter errors when loading the report
      const cleanedFilters = cleanFilterConfigurationForSaving(filters);
      
      const result = await createReport({
        name,
        description,
        filterConfiguration: cleanedFilters,
      });
      
      setIsSavingReport(false);
      
      if (result.success) {
        setSaveDialogOpen(false);
        success('Report Saved', `"${name}" has been saved successfully.`);
      } else {
        // Handle specific error codes
        if (result.errorCode === 'DUPLICATE_NAME') {
          setSaveError(`A report named "${name}" already exists. Please choose a different name.`);
        } else {
          showError('Save Failed', result.errorMessage || 'Failed to save report');
        }
      }
    },
    [filters, createReport, success, showError]
  );

  /**
   * Handle loading a report - initiates validation flow
   * Requirements: 2.2, 2.3, 4.3, 7.5
   */
  const handleLoadReport = React.useCallback(
    async (report: SavedReport) => {
      try {
        const result: LoadReportResult = await loadReport(report.$id);

        // Check if there are stale parameters
        if (!result.validation.isValid) {
          // Show correction dialog
          setPendingReport(result.report);
          setPendingValidation(result.validation);
          setLoadDialogOpen(false);
          setCorrectionDialogOpen(true);
          return;
        }

        // No stale parameters - load directly
        onFiltersChange(result.filterConfiguration);
        setLoadDialogOpen(false);
        success('Report Loaded', `"${report.name}" has been loaded.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load report';
        showError('Load Failed', message);
        // Refresh reports list in case the report was deleted
        refreshReports();
      }
    },
    [loadReport, onFiltersChange, success, showError, refreshReports]
  );

  /**
   * Handle editing a report's name/description
   * Requirements: 3.2
   */
  const handleEditReport = React.useCallback(
    async (id: string, name: string, description?: string) => {
      try {
        await updateReport(id, { name, description });
        success('Report Updated', `"${name}" has been updated.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update report';
        showError('Update Failed', message);
      }
    },
    [updateReport, success, showError]
  );

  /**
   * Handle deleting a report
   * Requirements: 3.4
   */
  const handleDeleteReport = React.useCallback(
    async (id: string) => {
      try {
        await deleteReport(id);
        success('Report Deleted', 'The report has been deleted.');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete report';
        showError('Delete Failed', message);
      }
    },
    [deleteReport, success, showError]
  );

  /**
   * Handle applying report with stale parameters removed
   * Requirements: 4.8
   */
  const handleApplyWithRemoval = React.useCallback(
    (validConfig: AdvancedSearchFilters) => {
      onFiltersChange(validConfig);
      setCorrectionDialogOpen(false);
      setPendingReport(null);
      setPendingValidation(null);
      success('Report Loaded', 'Report loaded with valid filters only.');
    },
    [onFiltersChange, success]
  );

  /**
   * Handle saving corrections to a report
   * Requirements: 4.7
   */
  const handleSaveCorrections = React.useCallback(
    async (correctedConfig: AdvancedSearchFilters) => {
      if (!pendingReport) return;

      try {
        await updateReport(pendingReport.$id, {
          filterConfiguration: correctedConfig,
        });
        onFiltersChange(correctedConfig);
        setCorrectionDialogOpen(false);
        setPendingReport(null);
        setPendingValidation(null);
        success('Report Updated', `"${pendingReport.name}" has been corrected and loaded.`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save corrections';
        showError('Save Failed', message);
      }
    },
    [pendingReport, updateReport, onFiltersChange, success, showError]
  );

  // Get filter count for a section
  const getSectionFilterCount = React.useCallback(
    (sectionId: FilterSection) => {
      return countSectionFilters(filters, sectionId);
    },
    [filters]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-4xl max-h-[90vh] overflow-hidden bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0 flex flex-col">
        {/* Dialog Header - Matches other dialogs like Edit Attendee */}
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <Search className="h-5 w-5" />
            Advanced Filters
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            Search attendees using multiple criteria across different categories.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content Area */}
        <div className="px-6 py-6 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Filter Match Mode Toggle */}
          <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Label htmlFor="filter-matchMode" className="text-sm font-medium">
                  Filter Match Mode
                </Label>
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">
                {filters.matchMode === 'all' 
                  ? 'Show attendees that match ALL of your filters. For example, if you filter by "First Name contains John" AND "Photo Status is Without Photo", only attendees named John without a photo will appear.' 
                  : 'Show attendees that match ANY of your filters. For example, if you filter by "First Name contains John" OR "Photo Status is Without Photo", attendees named John OR attendees without a photo will appear.'}
              </p>
            </div>
            <Select
              value={filters.matchMode || 'all'}
              onValueChange={(value: FilterMatchMode) => {
                onFiltersChange({ ...filters, matchMode: value });
              }}
            >
              <SelectTrigger id="filter-matchMode" className="w-32 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Match All</SelectItem>
                <SelectItem value="any">Match Any</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Bar (Requirements 2.1, 2.3, 2.6) */}
          <ActiveFiltersBar
            filters={filters}
            eventSettings={eventSettings}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAll}
          />

          {/* Accordion Sections (Requirements 1.1, 1.2, 1.4, 1.5, 1.10, 1.11) */}
          <Accordion
            type="multiple"
            value={expandedSections}
            onValueChange={setExpandedSections}
            className="space-y-3"
          >
            {visibleSections.map((section) => {
              const filterCount = getSectionFilterCount(section.id);
              const Icon = section.icon;

              return (
                <AccordionItem
                  key={section.id}
                  value={section.id}
                  className="border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800/50 overflow-hidden"
                >
                  <AccordionTrigger className="px-4 py-4 hover:bg-slate-50 dark:hover:bg-slate-800 hover:no-underline data-[state=open]:bg-slate-50 dark:data-[state=open]:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{section.title}</span>
                      {filterCount > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {filterCount} active
                        </Badge>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-slate-700">
                    {section.id === 'basic' && (
                      <BasicInfoSection
                        firstName={filters.firstName}
                        lastName={filters.lastName}
                        barcode={filters.barcode}
                        photoFilter={filters.photoFilter}
                        credentialFilter={filters.credentialFilter}
                        onFilterChange={handleBasicInfoChange}
                      />
                    )}
                    {section.id === 'notes' && (
                      <NotesContentSection
                        notes={filters.notes || { value: '', operator: 'contains', hasNotes: false }}
                        onFilterChange={handleNotesChange}
                      />
                    )}
                    {section.id === 'access' && (
                      <AccessControlSection
                        accessControl={filters.accessControl || { accessStatus: 'all', validFromStart: '', validFromEnd: '', validUntilStart: '', validUntilEnd: '' }}
                        onFilterChange={handleAccessControlChange}
                      />
                    )}
                    {section.id === 'custom' && (
                      <CustomFieldsSection
                        customFields={eventSettings?.customFields || []}
                        filters={filters.customFields || {}}
                        onFilterChange={handleCustomFieldChange}
                      />
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>

        {/* Action Footer - Matches other dialogs (Requirements 7.1, 7.2) */}
        <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
          <div className="flex w-full justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleClearAll}
                className="text-muted-foreground hover:text-foreground"
              >
                Clear All Filters
              </Button>
            </div>
            <div className="flex gap-2">
              {/* Save/Load Report Buttons (Requirement 7.1) - Only show if user has permission */}
              {hasReportsPermission && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLoadDialogOpen(true)}
                    data-testid="load-report-btn"
                  >
                    <FolderOpen className="h-4 w-4 mr-2" />
                    Load Report
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSaveDialogOpen(true)}
                    disabled={isSaveDisabled}
                    title={isSaveDisabled ? 'Add filters before saving a report' : 'Save current filters as a report'}
                    data-testid="save-report-btn"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Report
                  </Button>
                </>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleApply}
              >
                Apply Search
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Save Report Dialog (Requirement 1.1) */}
      <SaveReportDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveReport}
        isSaving={isSavingReport}
        error={saveError}
        onClearError={() => setSaveError(null)}
      />

      {/* Load Report Dialog (Requirement 2.1) */}
      <LoadReportDialog
        open={loadDialogOpen}
        onOpenChange={setLoadDialogOpen}
        reports={reports}
        isLoading={isLoadingReports}
        error={reportsError}
        onLoad={handleLoadReport}
        onEdit={handleEditReport}
        onDelete={handleDeleteReport}
      />

      {/* Report Correction Dialog (Requirement 4.3) */}
      <ReportCorrectionDialog
        open={correctionDialogOpen}
        onOpenChange={setCorrectionDialogOpen}
        report={pendingReport}
        validationResult={pendingValidation}
        eventSettings={eventSettings}
        onApplyWithRemoval={handleApplyWithRemoval}
        onSaveCorrections={handleSaveCorrections}
      />
    </Dialog>
  );
}

export default AdvancedFiltersDialog;

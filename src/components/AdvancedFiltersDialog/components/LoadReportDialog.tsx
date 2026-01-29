/**
 * LoadReportDialog Component
 *
 * Dialog for loading saved filter reports. Displays a list of reports
 * with name, description, and dates. Provides edit and delete actions
 * for each report.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * Requirements: 2.1, 3.1, 3.2, 3.3, 7.3
 */

import * as React from 'react';
import { FolderOpen, Pencil, Trash2, Calendar, Clock, FileText, Search, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { SavedReport } from '@/types/reports';

export interface LoadReportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void;
  /** List of available reports */
  reports: SavedReport[];
  /** Whether reports are loading */
  isLoading?: boolean;
  /** Error loading reports */
  error?: Error | null;
  /** Callback when a report is selected for loading */
  onLoad: (report: SavedReport) => void;
  /** Callback when a report is edited */
  onEdit: (id: string, name: string, description?: string) => Promise<void>;
  /** Callback when a report is deleted */
  onDelete: (id: string) => Promise<void>;
}

/**
 * Format a date string for display
 */
function formatDate(dateString: string | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    // Validate that the date is actually valid (new Date() doesn't throw for invalid dates)
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}

/**
 * Format a date string with time for display
 */
function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return 'Never';
  try {
    const date = new Date(dateString);
    // Validate that the date is actually valid (new Date() doesn't throw for invalid dates)
    if (isNaN(date.getTime())) return 'Never';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Never';
  }
}

/**
 * Individual report item in the list
 */
interface ReportItemProps {
  report: SavedReport;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ReportItem({ report, onSelect, onEdit, onDelete }: ReportItemProps) {
  return (
    <div
      className="group p-4 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        // Only trigger onSelect if the focused element is the report item itself
        if ((e.key === 'Enter' || e.key === ' ') && e.currentTarget === e.target) {
          e.preventDefault();
          onSelect();
        }
      }}
      data-testid={`report-item-${report.$id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Report Name */}
          <h4 
            className="font-medium text-foreground truncate"
            data-testid={`report-name-${report.$id}`}
          >
            {report.name}
          </h4>
          
          {/* Description */}
          {report.description && (
            <p 
              className="text-sm text-muted-foreground mt-1 line-clamp-2"
              data-testid={`report-description-${report.$id}`}
            >
              {report.description}
            </p>
          )}
          
          {/* Dates */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
            <span 
              className="flex items-center gap-1"
              data-testid={`report-created-${report.$id}`}
            >
              <Calendar className="h-3 w-3" />
              Created {formatDate(report.createdAt)}
            </span>
            {report.lastAccessedAt && (
              <span 
                className="flex items-center gap-1"
                data-testid={`report-accessed-${report.$id}`}
              >
                <Clock className="h-3 w-3" />
                Last used {formatDateTime(report.lastAccessedAt)}
              </span>
            )}
          </div>
        </div>
        
        {/* Action Buttons */}
        <div 
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Edit report"
            data-testid={`report-edit-${report.$id}`}
          >
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete report"
            data-testid={`report-delete-${report.$id}`}
          >
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Edit Report Dialog (inline)
 */
interface EditReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: SavedReport | null;
  onSave: (name: string, description?: string) => Promise<void>;
  isSaving: boolean;
}

function EditReportDialog({ open, onOpenChange, report, onSave, isSaving }: EditReportDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [nameError, setNameError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Reset form when dialog opens with report data
  React.useEffect(() => {
    if (open && report) {
      setName(report.name);
      setDescription(report.description || '');
      setNameError(null);
      setIsSubmitting(false);
    }
  }, [open, report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Guard against duplicate submissions using both local and parent state
    if (isSubmitting || isSaving) return;
    
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setNameError('Report name is required');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave(trimmedName, description.trim() || undefined);
    } catch (error) {
      console.error('Failed to save report:', error);
      // Display generic message to user, log actual error for debugging
      setNameError('Failed to save report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Pencil className="h-6 w-6" />
              Edit Report
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Update the report name and description.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-report-name" className="text-sm font-medium">
                Report Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="edit-report-name"
                type="text"
                placeholder="Enter a name for this report"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                disabled={isSaving}
                autoFocus
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-report-description" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="edit-report-description"
                placeholder="Add a description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSaving}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * LoadReportDialog displays a list of saved reports and allows
 * users to load, edit, or delete them.
 *
 * Requirements: 2.1, 3.1, 3.2, 3.3, 7.3
 */
export function LoadReportDialog({
  open,
  onOpenChange,
  reports,
  isLoading = false,
  error,
  onLoad,
  onEdit,
  onDelete,
}: LoadReportDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [editingReport, setEditingReport] = React.useState<SavedReport | null>(null);
  const [deletingReport, setDeletingReport] = React.useState<SavedReport | null>(null);
  const [isEditSaving, setIsEditSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setEditingReport(null);
      setDeletingReport(null);
      setDeleteError(null);
    }
  }, [open]);

  // Filter reports by search query
  const filteredReports = React.useMemo(() => {
    if (!searchQuery.trim()) return reports;
    
    const query = searchQuery.toLowerCase();
    return reports.filter(
      (report) =>
        report.name.toLowerCase().includes(query) ||
        (report.description && report.description.toLowerCase().includes(query))
    );
  }, [reports, searchQuery]);

  // Handle report selection
  const handleSelectReport = React.useCallback((report: SavedReport) => {
    onLoad(report);
    onOpenChange(false);
  }, [onLoad, onOpenChange]);

  // Handle edit save
  const handleEditSave = React.useCallback(async (name: string, description?: string) => {
    if (!editingReport) return;
    
    setIsEditSaving(true);
    try {
      await onEdit(editingReport.$id, name, description);
      setEditingReport(null);
    } finally {
      setIsEditSaving(false);
    }
  }, [editingReport, onEdit]);

  // Handle delete confirmation
  const handleDeleteConfirm = React.useCallback(async () => {
    if (!deletingReport) return;
    
    const reportId = deletingReport.$id;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await onDelete(reportId);
      setDeletingReport(null);
    } catch (error) {
      console.error('Failed to delete report:', error);
      setDeleteError('Failed to delete report. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  }, [deletingReport, onDelete]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <FolderOpen className="h-6 w-6" />
              Load Report
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Select a saved report to load its filter configuration.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search reports..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            {/* Reports List */}
            {error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <p className="text-destructive font-medium">Unable to load reports</p>
                <p className="text-sm text-destructive/80 mt-1">
                  {error.message || 'An error occurred while loading your saved reports.'}
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : reports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No saved reports yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Save your filter configurations to access them quickly later.
                </p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No reports match your search</p>
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2" data-testid="reports-list">
                  {filteredReports.map((report) => (
                    <ReportItem
                      key={report.$id}
                      report={report}
                      onSelect={() => handleSelectReport(report)}
                      onEdit={() => setEditingReport(report)}
                      onDelete={() => setDeletingReport(report)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Report Dialog */}
      <EditReportDialog
        open={editingReport !== null}
        onOpenChange={(open) => !open && setEditingReport(null)}
        report={editingReport}
        onSave={handleEditSave}
        isSaving={isEditSaving}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deletingReport !== null} 
        onOpenChange={(open) => !open && setDeletingReport(null)}
      >
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl">
          <AlertDialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
            <AlertDialogTitle className="text-xl font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Delete Report
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Are you sure you want to delete &quot;{deletingReport?.name}&quot;? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <div className="px-6 py-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{deleteError}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default LoadReportDialog;

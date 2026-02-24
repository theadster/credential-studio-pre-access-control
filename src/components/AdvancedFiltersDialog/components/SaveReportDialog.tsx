/**
 * SaveReportDialog Component
 *
 * Dialog for saving the current filter configuration as a named report.
 * Provides form fields for report name (required) and description (optional),
 * with validation for empty names.
 *
 * @see .kiro/specs/saved-reports/design.md
 * @see .kiro/specs/saved-reports/requirements.md
 *
 * Requirements: 1.1, 1.3, 7.3
 */

import * as React from 'react';
import { FileText, Save, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

export interface SaveReportDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to control dialog open state */
  onOpenChange: (open: boolean) => void;
  /** Callback when save is confirmed with name, optional description, and isGlobal flag */
  onSave: (name: string, description?: string, isGlobal?: boolean) => Promise<void>;
  /** Whether a save operation is in progress */
  isSaving?: boolean;
  /** Optional error message to display */
  error?: string | null;
  /** Callback to clear error message */
  onClearError?: () => void;
}

/**
 * Validates and cleans a report name
 * Returns an error message if invalid, or null if valid
 * Also returns the cleaned name for use in persistence
 *
 * Requirements: 1.3 - Empty name validation
 */
export function validateReportName(name: string): { error: string | null; cleanedName: string } {
  // Type guard: ensure name is a string
  if (typeof name !== 'string') {
    return { error: 'Report name must be a string', cleanedName: '' };
  }
  
  // Trim the name and remove invisible Unicode characters
  // This regex removes whitespace and zero-width characters
  const cleanedName = name.trim().replace(/[\p{Z}\p{C}]/gu, '');
  
  if (cleanedName.length === 0) {
    return { error: 'Report name is required', cleanedName: '' };
  }
  
  return { error: null, cleanedName };
}

/**
 * SaveReportDialog provides a form for saving the current filter
 * configuration as a named report with an optional description.
 *
 * Requirements: 1.1, 1.3, 7.3
 */
export function SaveReportDialog({
  open,
  onOpenChange,
  onSave,
  isSaving = false,
  error,
  onClearError,
}: SaveReportDialogProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isGlobal, setIsGlobal] = React.useState(false);
  const [nameError, setNameError] = React.useState<string | null>(null);

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setName('');
      setDescription('');
      setIsGlobal(false);
      setNameError(null);
    }
  }, [open]);

  // Validate name on change
  const handleNameChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    
    // Clear errors when user starts typing
    if (nameError) {
      setNameError(null);
    }
    if (error && onClearError) {
      onClearError();
    }
  }, [nameError, error, onClearError]);

  // Handle form submission
  const handleSubmit = React.useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate and clean name
    const { error: validationError, cleanedName } = validateReportName(name);
    if (validationError) {
      setNameError(validationError);
      return;
    }
    
    // Call onSave with cleaned name and trimmed description
    try {
      await onSave(cleanedName, description.trim() || undefined, isGlobal);
    } catch (error) {
      // Error is handled by parent component via error prop
      console.error('Failed to save report:', error);
    }
  }, [name, description, isGlobal, onSave]);

  // Handle cancel
  const handleCancel = React.useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-2xl p-0">
        <form onSubmit={handleSubmit}>
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-0 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
            <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
              <Save className="h-6 w-6" />
              Save This Report
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
              Save your current filter configuration as a report for quick access later.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Error message if present */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                  <svg className="h-4 w-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Report Name Field */}
            <div className="space-y-2">
              <Label htmlFor="report-name" className="text-sm font-medium">
                Report Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="report-name"
                type="text"
                placeholder="Enter a name for this report"
                value={name}
                onChange={handleNameChange}
                className={nameError ? 'border-destructive focus-visible:ring-destructive' : ''}
                disabled={isSaving}
                autoFocus
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <Label htmlFor="report-description" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="report-description"
                placeholder="Add a description to help you remember what this report filters for"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={isSaving}
                className="resize-none"
              />
            </div>

            {/* Global visibility toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-2">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Share globally</p>
                  <p className="text-xs text-muted-foreground">
                    All users can run this report. Only you can edit or delete it.
                  </p>
                </div>
              </div>
              <Switch
                id="report-global"
                checked={isGlobal}
                onCheckedChange={setIsGlobal}
                disabled={isSaving}
                aria-label="Share report globally"
              />
            </div>

            {/* Info text */}
            <div className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">
                Your current filter settings including all criteria and match mode will be saved with this report.
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 border-t border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save This Report
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SaveReportDialog;

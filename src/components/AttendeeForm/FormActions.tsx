import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, Loader2, Printer } from 'lucide-react';

interface FormActionsProps {
  isEditMode: boolean;
  loading: boolean;
  loadingAndGenerate: boolean;
  showGenerateButton: boolean;
  onCancel: () => void;
  onSaveAndGenerate?: () => void;
}

export function FormActions({
  isEditMode,
  loading,
  loadingAndGenerate,
  showGenerateButton,
  onCancel,
  onSaveAndGenerate
}: FormActionsProps) {
  return (
    <div className="pt-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800 -mx-6 -mb-6 px-6">
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
          <kbd className="px-2 py-1 text-xs font-semibold text-slate-800 bg-white border border-slate-300 rounded-sm dark:bg-slate-700 dark:text-slate-200 dark:border-slate-600">
            Enter
          </kbd>
          <span>to save</span>
        </div>
        <div className="flex space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            aria-label="Cancel and close form"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || loadingAndGenerate}
            aria-label={isEditMode ? 'Update attendee information' : 'Create new attendee'}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            <Save className="mr-2 h-4 w-4" aria-hidden="true" />
            {isEditMode ? 'Update' : 'Create'} Attendee
          </Button>
          {showGenerateButton && onSaveAndGenerate && (
            <Button
              type="button"
              onClick={onSaveAndGenerate}
              disabled={loading || loadingAndGenerate}
              className="bg-purple-600 hover:bg-purple-700"
              aria-label="Update attendee and generate credential"
            >
              {loadingAndGenerate ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Update & Generate Credential
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

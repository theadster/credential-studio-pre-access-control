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
    <div className="flex justify-end space-x-2 pt-4 border-t">
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
          {loadingAndGenerate && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          <Save className="mr-2 h-4 w-4" aria-hidden="true" />
          <Printer className="mr-2 h-4 w-4" aria-hidden="true" />
          Update & Generate Credential
        </Button>
      )}
    </div>
  );
}

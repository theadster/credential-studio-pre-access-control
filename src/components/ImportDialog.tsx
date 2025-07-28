import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface CustomField {
  id: string;
  fieldName: string;
  internalFieldName: string;
  fieldType: string;
}

interface ImportDialogProps {
  children: React.ReactNode;
  onImportSuccess: () => void;
  customFields: CustomField[];
}

export default function ImportDialog({ children, onImportSuccess, customFields }: ImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
    },
    multiple: false,
  });

  const handleImport = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'No file selected',
        description: 'Please select a CSV file to import.',
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/attendees/import', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import attendees');
      }

      toast({
        title: 'Import Successful',
        description: `${result.count} attendees were imported successfully.`,
      });
      onImportSuccess();
      setIsOpen(false);
      setFile(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Import Failed',
        description: error.message,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Define all columns with their internal names and descriptions
  const allColumns = [
    { internalName: 'firstName', description: 'First Name' },
    { internalName: 'lastName', description: 'Last Name' },
    { internalName: 'barcodeNumber', description: 'Barcode Number' },
    ...(customFields || []).map(field => ({
      internalName: field.internalFieldName,
      description: field.fieldName
    }))
  ];

  // Generate sample data
  const generateSampleData = () => {
    const sampleRow = allColumns.map(col => {
      switch (col.internalName) {
        case 'firstName':
          return 'John';
        case 'lastName':
          return 'Doe';
        case 'barcodeNumber':
          return '12345';
        default:
          // For custom fields, provide sample based on type
          const customField = customFields?.find(f => f.internalFieldName === col.internalName);
          if (customField) {
            switch (customField.fieldType) {
              case 'boolean':
                return 'Yes';
              case 'url':
                return 'https://example.com';
              default:
                return 'Sample Text';
            }
          }
          return 'Sample';
      }
    });
    return sampleRow;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Attendees</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import attendee data into your event.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* File Upload Area */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            {isDragActive ? (
              <p className="text-sm">Drop the CSV file here...</p>
            ) : (
              <div>
                <p className="text-sm mb-1">Drag & drop a CSV file here, or click to select</p>
                <p className="text-xs text-gray-500">Only CSV files are accepted</p>
              </div>
            )}
          </div>

          {file && (
            <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Remove
              </Button>
            </div>
          )}

          {/* Column List */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-blue-500" />
              <h3 className="font-medium text-sm">Available Columns</h3>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 gap-2">
                {allColumns.map((column, index) => (
                  <div key={column.internalName} className="flex justify-between items-center py-1 border-b border-gray-200 last:border-b-0">
                    <span className="font-mono text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">{column.internalName}</span>
                    <span className="text-xs text-gray-800 font-medium">{column.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sample CSV Format */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Sample CSV Format</h3>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="font-mono text-xs space-y-2">
                {/* Headers */}
                <div className="text-gray-600 font-semibold border-b border-gray-300 pb-2">
                  {allColumns.map(col => col.internalName).join(',')}
                </div>
                {/* Sample data */}
                <div className="text-gray-800">
                  {generateSampleData().join(',')}
                </div>
              </div>
            </div>
            
            <div className="text-xs text-gray-600 space-y-1 bg-blue-50 p-3 rounded-lg">
              <p><strong>Important Notes:</strong></p>
              <p>• First row must contain column headers (case-sensitive)</p>
              <p>• Required fields: firstName, lastName, barcodeNumber</p>
              <p>• Barcode numbers must be unique</p>
              <p>• Boolean fields accept: Yes/No, True/False, 1/0</p>
              <p>• URL fields should include full URLs (e.g., https://example.com)</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={!file || isUploading}>
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Import
                </>
              )}
            </Button>
          </div>

          {isUploading && (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm">Processing your file...</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
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
import { Upload, FileText, Download } from 'lucide-react';

interface CustomField {
  internalName: string;
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

  const handleDownloadTemplate = () => {
    const headers = ['firstName', 'lastName', 'barcodeNumber', ...customFields.map(cf => cf.internalName)];
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(',');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const requiredFields = ['firstName', 'lastName', 'barcodeNumber'];
  const customFieldNames = customFields.map(cf => cf.internalName);
  const allHeaders = [...requiredFields, ...customFieldNames];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Import Attendees</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import attendees in bulk.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Instructions</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1 mt-2">
              <li>Your CSV file must contain the following columns: <strong>{allHeaders.join(', ')}</strong>.</li>
              <li>The `firstName` and `lastName` columns are required.</li>
              <li>Column headers must match exactly, including case.</li>
              <li>Download the template to ensure your format is correct.</li>
            </ol>
          </div>

          <Button variant="outline" onClick={handleDownloadTemplate}>
            <Download className="mr-2 h-4 w-4" />
            Download CSV Template
          </Button>

          <div
            {...getRootProps()}
            className={`p-8 border-2 border-dashed rounded-lg text-center cursor-pointer
              ${isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/50'}`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            {isDragActive ? (
              <p className="mt-2">Drop the file here ...</p>
            ) : (
              <p className="mt-2">Drag & drop a CSV file here, or click to select a file</p>
            )}
          </div>
          {file && (
            <div className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5" />
                <span>{file.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setFile(null)}>
                Remove
              </Button>
            </div>
          )}
          <div className="flex justify-end space-x-2">
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
                'Import'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
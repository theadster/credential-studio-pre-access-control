import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { Download, FileSpreadsheet, Filter, Users } from 'lucide-react';

interface ExportDialogProps {
  children: React.ReactNode;
  totalAttendees: number;
  filteredAttendees: number;
  isFiltered: boolean;
  searchTerm?: string;
  photoFilter?: 'all' | 'with' | 'without';
  advancedFilters?: {
    firstName: string;
    lastName: string;
    barcode: string;
    photoFilter: 'all' | 'with' | 'without';
    customFields: { [key: string]: { value: string | string[]; searchEmpty: boolean } };
  } | null;
  eventSettings?: {
    customFields?: Array<{
      id: string;
      fieldName: string;
      fieldType: string;
      required?: boolean;
    }>;
  } | null;
}

interface ExportField {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'custom' | 'system';
  required?: boolean;
}

export default function ExportDialog({
  children,
  totalAttendees,
  filteredAttendees,
  isFiltered,
  searchTerm,
  photoFilter,
  advancedFilters,
  eventSettings,
}: ExportDialogProps) {
  const { success, error } = useSweetAlert();
  const [open, setOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered'>('all');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'firstName',
    'lastName',
    'barcodeNumber',
    'photoUrl',
    'createdAt',
  ]);
  const [isExporting, setIsExporting] = useState(false);

  // Define available export fields
  const exportFields: ExportField[] = [
    // Basic fields
    { id: 'firstName', name: 'First Name', description: 'Attendee first name', category: 'basic', required: true },
    { id: 'lastName', name: 'Last Name', description: 'Attendee last name', category: 'basic', required: true },
    { id: 'barcodeNumber', name: 'Barcode', description: 'Unique barcode identifier', category: 'basic' },
    { id: 'photoUrl', name: 'Photo URL', description: 'Link to attendee photo', category: 'basic' },
    { id: 'credentialUrl', name: 'Credential URL', description: 'Link to generated credential', category: 'basic' },
    
    // System fields
    { id: 'createdAt', name: 'Created Date', description: 'When the record was created', category: 'system' },
    { id: 'updatedAt', name: 'Updated Date', description: 'When the record was last modified', category: 'system' },
    { id: 'credentialGeneratedAt', name: 'Credential Generated', description: 'When the credential was generated', category: 'system' },
  ];

  // Get custom fields from event settings
  const customFields: ExportField[] = eventSettings?.customFields?.map(field => ({
    id: `custom_${field.id}`,
    name: field.fieldName,
    description: `Custom field: ${field.fieldName} (${field.fieldType})`,
    category: 'custom' as const,
    required: field.required,
  })) || [];

  const allFields = [...exportFields, ...customFields];

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const field = allFields.find(f => f.id === fieldId);
    if (field?.required && !checked) {
      return; // Don't allow unchecking required fields
    }

    if (checked) {
      setSelectedFields(prev => [...prev, fieldId]);
    } else {
      setSelectedFields(prev => prev.filter(id => id !== fieldId));
    }
  };

  const handleSelectAll = (category?: string) => {
    const fieldsToSelect = category 
      ? allFields.filter(f => f.category === category).map(f => f.id)
      : allFields.map(f => f.id);
    
    setSelectedFields(prev => {
      const newFields = [...new Set([...prev, ...fieldsToSelect])];
      return newFields;
    });
  };

  const handleDeselectAll = (category?: string) => {
    const fieldsToDeselect = category 
      ? allFields.filter(f => f.category === category && !f.required).map(f => f.id)
      : allFields.filter(f => !f.required).map(f => f.id);
    
    setSelectedFields(prev => prev.filter(id => !fieldsToDeselect.includes(id)));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build export parameters
      const exportParams = {
        scope: exportScope,
        fields: selectedFields,
        ...(exportScope === 'filtered' && isFiltered && {
          filters: {
            searchTerm,
            photoFilter,
            advancedFilters,
          },
        }),
      };

      // Make API call to export endpoint
      const response = await fetch('/api/attendees/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportParams),
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the CSV data
      const csvData = await response.text();
      
      // Create and download the file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendees-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      success("Export Complete", `Successfully exported ${exportScope === 'all' ? totalAttendees : filteredAttendees} attendee records.`);

      setOpen(false);
    } catch (err: any) {
      error("Export Failed", err.message || "An error occurred while exporting data.");
    } finally {
      setIsExporting(false);
    }
  };

  const getActiveFiltersDescription = () => {
    const filters = [];
    
    if (searchTerm) {
      filters.push(`Search: "${searchTerm}"`);
    }
    
    if (photoFilter && photoFilter !== 'all') {
      filters.push(`Photo: ${photoFilter === 'with' ? 'With Photo' : 'Without Photo'}`);
    }
    
    if (advancedFilters) {
      if (advancedFilters.firstName) filters.push(`First Name: "${advancedFilters.firstName}"`);
      if (advancedFilters.lastName) filters.push(`Last Name: "${advancedFilters.lastName}"`);
      if (advancedFilters.barcode) filters.push(`Barcode: "${advancedFilters.barcode}"`);
      if (advancedFilters.photoFilter && advancedFilters.photoFilter !== 'all') {
        filters.push(`Photo: ${advancedFilters.photoFilter === 'with' ? 'With Photo' : 'Without Photo'}`);
      }
      
      // Add custom field filters
      if (advancedFilters.customFields) {
        Object.entries(advancedFilters.customFields).forEach(([fieldId, filter]) => {
          const fieldName = eventSettings?.customFields?.find(f => f.id === fieldId)?.fieldName || fieldId;
          if (filter.value) {
            // Handle array values (multi-select)
            if (Array.isArray(filter.value)) {
              if (filter.value.length > 0) {
                filters.push(`${fieldName}: "${filter.value.join(', ')}"`);
              }
            } else {
              filters.push(`${fieldName}: "${filter.value}"`);
            }
          }
          if (filter.searchEmpty) {
            filters.push(`${fieldName}: Empty`);
          }
        });
      }
    }
    
    return filters;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0"
        onWheel={(e) => {
          // Prevent scroll chaining to the page behind the dialog
          const target = e.currentTarget;
          const isAtTop = target.scrollTop === 0;
          const isAtBottom = target.scrollTop + target.clientHeight >= target.scrollHeight;
          
          if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 bg-[#F1F5F9] dark:bg-slate-800 px-6 pt-6">
          <DialogTitle className="text-2xl font-bold text-primary flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            Export Attendees
          </DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-slate-400 mt-2">
            Export attendee data to CSV format with customizable field selection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 px-6 pt-6 pb-0">
          {/* Export Scope Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-4 w-4" />
                Export Scope
              </CardTitle>
              <CardDescription>
                Choose which attendees to include in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={exportScope} onValueChange={(value: 'all' | 'filtered') => setExportScope(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">All Attendees</div>
                        <div className="text-sm text-muted-foreground">Export all {totalAttendees} attendees</div>
                      </div>
                      <Badge variant="secondary">{totalAttendees} records</Badge>
                    </div>
                  </Label>
                </div>
                
                {isFiltered && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="filtered" id="filtered" />
                    <Label htmlFor="filtered" className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            Current Search Results
                            <Filter className="h-3 w-3" />
                          </div>
                          <div className="text-sm text-muted-foreground">Export only filtered results</div>
                          {getActiveFiltersDescription().length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Active filters: {getActiveFiltersDescription().join(', ')}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">{filteredAttendees} records</Badge>
                      </div>
                    </Label>
                  </div>
                )}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Field Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Field Selection</CardTitle>
              <CardDescription>
                Choose which data fields to include in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll()}
                  >
                    Select All
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeselectAll()}
                  >
                    Deselect All
                  </Button>
                  <Separator orientation="vertical" className="h-4" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll('basic')}
                  >
                    Select Basic
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll('system')}
                  >
                    Select System
                  </Button>
                </div>

                <Separator />

                {/* Basic Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Basic Information</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll('basic')}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeselectAll('basic')}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allFields.filter(f => f.category === 'basic').map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                          disabled={field.required}
                        />
                        <Label htmlFor={field.id} className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{field.name}</span>
                            {field.required && <Badge variant="secondary" className="text-xs">Required</Badge>}
                          </div>
                          <div className="text-sm text-muted-foreground">{field.description}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* System Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">System Information</h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll('system')}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeselectAll('system')}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {allFields.filter(f => f.category === 'system').map((field) => (
                      <div key={field.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={field.id}
                          checked={selectedFields.includes(field.id)}
                          onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                        />
                        <Label htmlFor={field.id} className="flex-1">
                          <div className="font-medium">{field.name}</div>
                          <div className="text-sm text-muted-foreground">{field.description}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Custom Fields Section (if any) */}
                {customFields.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium">Custom Fields</h4>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSelectAll('custom')}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeselectAll('custom')}
                          >
                            Deselect All
                          </Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customFields.map((field) => (
                          <div key={field.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={field.id}
                              checked={selectedFields.includes(field.id)}
                              onCheckedChange={(checked) => handleFieldToggle(field.id, checked as boolean)}
                            />
                            <Label htmlFor={field.id} className="flex-1">
                              <div className="font-medium">{field.name}</div>
                              <div className="text-sm text-muted-foreground">{field.description}</div>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Records to export:</span>
                  <Badge variant="outline">
                    {exportScope === 'all' ? totalAttendees : filteredAttendees} attendees
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Fields to include:</span>
                  <Badge variant="outline">
                    {selectedFields.length} fields
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Export format:</span>
                  <Badge variant="outline">CSV</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-2 pt-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700 bg-[#F1F5F9] dark:bg-slate-800 px-6 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleExport} 
            disabled={isExporting || selectedFields.length === 0}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
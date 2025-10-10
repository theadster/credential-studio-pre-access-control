import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Download, FileSpreadsheet, Activity, Filter, Calendar, Users, Clock } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
}

interface LogsExportDialogProps {
  children: React.ReactNode;
  users: User[];
  totalLogs: number;
  currentFilters?: {
    action: string;
    userId: string;
  };
}

interface ExportField {
  id: string;
  name: string;
  description: string;
  category: 'basic' | 'user' | 'target' | 'system';
  required?: boolean;
}

export default function LogsExportDialog({
  children,
  users,
  totalLogs,
  currentFilters
}: LogsExportDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'custom'>('all');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'createdAt',
    'action',
    'userName',
    'userEmail',
    'targetName',
    'details'
  ]);
  const [isExporting, setIsExporting] = useState(false);
  
  // Custom filter options
  const [customFilters, setCustomFilters] = useState({
    dateFrom: '',
    dateTo: '',
    action: 'all',
    userId: 'all',
    targetType: 'all'
  });
  
  // Timezone selection
  const [timezone, setTimezone] = useState('UTC');

  // Initialize timezone to user's local timezone when dialog opens
  useEffect(() => {
    if (open) {
      setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
    }
  }, [open]);

  // Define available export fields
  const exportFields: ExportField[] = [
    // Basic fields
    { id: 'createdAt', name: 'Date & Time', description: 'When the activity occurred', category: 'basic', required: true },
    { id: 'action', name: 'Action', description: 'Type of action performed', category: 'basic', required: true },
    { id: 'details', name: 'Details', description: 'Additional activity details', category: 'basic' },
    
    // User fields
    { id: 'userName', name: 'User Name', description: 'Name of the user who performed the action', category: 'user' },
    { id: 'userEmail', name: 'User Email', description: 'Email of the user who performed the action', category: 'user' },
    { id: 'userId', name: 'User ID', description: 'Unique identifier of the user', category: 'user' },
    
    // Target fields
    { id: 'targetName', name: 'Target Name', description: 'Name of the target (attendee, user, etc.)', category: 'target' },
    { id: 'targetType', name: 'Target Type', description: 'Type of target (attendee, user, system)', category: 'target' },
    { id: 'attendeeId', name: 'Attendee ID', description: 'ID of the affected attendee (if applicable)', category: 'target' },
    
    // System fields
    { id: 'logId', name: 'Log ID', description: 'Unique identifier of the log entry', category: 'system' },
    { id: 'changes', name: 'Changes Made', description: 'Specific fields that were changed', category: 'system' }
  ];

  const actionTypes = [
    { value: 'all', label: 'All Actions' },
    { value: 'create', label: 'Create' },
    { value: 'update', label: 'Update' },
    { value: 'delete', label: 'Delete' },
    { value: 'view', label: 'View' },
    { value: 'print', label: 'Print' },
    { value: 'login', label: 'Login' },
    { value: 'logout', label: 'Logout' },
    { value: 'export', label: 'Export' },
    { value: 'import', label: 'Import' }
  ];

  const targetTypes = [
    { value: 'all', label: 'All Targets' },
    { value: 'attendee', label: 'Attendee' },
    { value: 'user', label: 'User' },
    { value: 'role', label: 'Role' },
    { value: 'settings', label: 'Settings' },
    { value: 'system', label: 'System' }
  ];

  const handleFieldToggle = (fieldId: string, checked: boolean) => {
    const field = exportFields.find(f => f.id === fieldId);
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
      ? exportFields.filter(f => f.category === category).map(f => f.id)
      : exportFields.map(f => f.id);
    
    setSelectedFields(prev => {
      const newFields = [...new Set([...prev, ...fieldsToSelect])];
      return newFields;
    });
  };

  const handleDeselectAll = (category?: string) => {
    const fieldsToDeselect = category 
      ? exportFields.filter(f => f.category === category && !f.required).map(f => f.id)
      : exportFields.filter(f => !f.required).map(f => f.id);
    
    setSelectedFields(prev => prev.filter(id => !fieldsToDeselect.includes(id)));
  };

  const handleCustomFilterChange = (key: string, value: string) => {
    setCustomFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Build export parameters
      const exportParams = {
        scope: exportScope,
        fields: selectedFields,
        timezone: timezone,
        filters: exportScope === 'custom' ? customFilters : 
                exportScope === 'filtered' ? currentFilters : 
                undefined
      };

      // Make API call to export endpoint
      const response = await fetch('/api/logs/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportParams),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }

      // Get the CSV data
      const csvData = await response.text();
      
      // Create and download the file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate filename with timestamp and scope
      const timestamp = new Date().toISOString().split('T')[0];
      const scopeLabel = exportScope === 'all' ? 'all' : 
                       exportScope === 'filtered' ? 'filtered' : 
                       'custom';
      a.download = `activity-logs-${scopeLabel}-${timestamp}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported activity logs to CSV format.`,
      });

      setOpen(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: error.message || "An error occurred while exporting data.",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getActiveFiltersDescription = () => {
    const filters = [];
    
    if (exportScope === 'filtered' && currentFilters) {
      if (currentFilters.action !== 'all') {
        filters.push(`Action: ${currentFilters.action}`);
      }
      if (currentFilters.userId !== 'all') {
        const user = users.find(u => u.id === currentFilters.userId);
        filters.push(`User: ${user?.name || user?.email || 'Unknown'}`);
      }
    } else if (exportScope === 'custom') {
      if (customFilters.dateFrom) filters.push(`From: ${customFilters.dateFrom}`);
      if (customFilters.dateTo) filters.push(`To: ${customFilters.dateTo}`);
      if (customFilters.action !== 'all') filters.push(`Action: ${customFilters.action}`);
      if (customFilters.userId !== 'all') {
        const user = users.find(u => u.id === customFilters.userId);
        filters.push(`User: ${user?.name || user?.email || 'Unknown'}`);
      }
      if (customFilters.targetType !== 'all') filters.push(`Target: ${customFilters.targetType}`);
    }
    
    return filters;
  };

  const hasCurrentFilters = currentFilters && (currentFilters.action !== 'all' || currentFilters.userId !== 'all');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export Activity Logs
          </DialogTitle>
          <DialogDescription>
            Export activity logs to CSV format with comprehensive filtering and field selection options.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Export Scope Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Export Scope
              </CardTitle>
              <CardDescription>
                Choose which activity logs to include in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup value={exportScope} onValueChange={(value: 'all' | 'filtered' | 'custom') => setExportScope(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">All Activity Logs</div>
                        <div className="text-sm text-muted-foreground">Export all recorded activities</div>
                      </div>
                      <Badge variant="secondary">{totalLogs} records</Badge>
                    </div>
                  </Label>
                </div>
                
                {hasCurrentFilters && (
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="filtered" id="filtered" />
                    <Label htmlFor="filtered" className="flex-1">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            Current Filter Results
                            <Filter className="h-3 w-3" />
                          </div>
                          <div className="text-sm text-muted-foreground">Export logs matching current page filters</div>
                          {getActiveFiltersDescription().length > 0 && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Active filters: {getActiveFiltersDescription().join(', ')}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">Filtered results</Badge>
                      </div>
                    </Label>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          Custom Date Range & Filters
                          <Calendar className="h-3 w-3" />
                        </div>
                        <div className="text-sm text-muted-foreground">Define specific criteria for export</div>
                      </div>
                      <Badge variant="outline">Custom</Badge>
                    </div>
                  </Label>
                </div>
              </RadioGroup>

              {/* Custom Filters Section */}
              {exportScope === 'custom' && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/20">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Custom Export Filters
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Date Range */}
                    <div className="space-y-2">
                      <Label htmlFor="dateFrom">From Date</Label>
                      <Input
                        id="dateFrom"
                        type="date"
                        value={customFilters.dateFrom}
                        onChange={(e) => handleCustomFilterChange('dateFrom', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateTo">To Date</Label>
                      <Input
                        id="dateTo"
                        type="date"
                        value={customFilters.dateTo}
                        onChange={(e) => handleCustomFilterChange('dateTo', e.target.value)}
                      />
                    </div>

                    {/* Action Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="actionFilter">Action Type</Label>
                      <Select value={customFilters.action} onValueChange={(value) => handleCustomFilterChange('action', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select action type" />
                        </SelectTrigger>
                        <SelectContent>
                          {actionTypes.map((action) => (
                            <SelectItem key={action.value} value={action.value}>
                              {action.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* User Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="userFilter">User</Label>
                      <Select value={customFilters.userId} onValueChange={(value) => handleCustomFilterChange('userId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email.split('@')[0]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Target Type Filter */}
                    <div className="space-y-2">
                      <Label htmlFor="targetFilter">Target Type</Label>
                      <Select value={customFilters.targetType} onValueChange={(value) => handleCustomFilterChange('targetType', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select target type" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetTypes.map((target) => (
                            <SelectItem key={target.value} value={target.value}>
                              {target.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
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
                    onClick={() => handleSelectAll('user')}
                  >
                    Select User Info
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAll('system')}
                  >
                    Select System Info
                  </Button>
                </div>

                <Separator />

                {/* Basic Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Basic Information
                    </h4>
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
                    {exportFields.filter(f => f.category === 'basic').map((field) => (
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

                {/* User Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      User Information
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll('user')}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeselectAll('user')}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exportFields.filter(f => f.category === 'user').map((field) => (
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

                <Separator />

                {/* Target Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Target Information
                    </h4>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll('target')}
                      >
                        Select All
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeselectAll('target')}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exportFields.filter(f => f.category === 'target').map((field) => (
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

                <Separator />

                {/* System Fields */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      System Information
                    </h4>
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
                    {exportFields.filter(f => f.category === 'system').map((field) => (
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
              </div>
            </CardContent>
          </Card>

          {/* Timezone Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone Settings
              </CardTitle>
              <CardDescription>
                Choose the timezone for displaying dates and times in the export
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="timezone">Export Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
                    <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
                    <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
                    <SelectItem value="America/Phoenix">Arizona Time (MST)</SelectItem>
                    <SelectItem value="America/Anchorage">Alaska Time (AKST)</SelectItem>
                    <SelectItem value="Pacific/Honolulu">Hawaii Time (HST)</SelectItem>
                    <SelectItem value="Europe/London">London (GMT/BST)</SelectItem>
                    <SelectItem value="Europe/Paris">Paris (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Berlin">Berlin (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Rome">Rome (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Madrid">Madrid (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Amsterdam">Amsterdam (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Stockholm">Stockholm (CET/CEST)</SelectItem>
                    <SelectItem value="Europe/Moscow">Moscow (MSK)</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
                    <SelectItem value="Asia/Shanghai">Shanghai (CST)</SelectItem>
                    <SelectItem value="Asia/Hong_Kong">Hong Kong (HKT)</SelectItem>
                    <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
                    <SelectItem value="Asia/Seoul">Seoul (KST)</SelectItem>
                    <SelectItem value="Asia/Kolkata">India (IST)</SelectItem>
                    <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
                    <SelectItem value="Australia/Sydney">Sydney (AEDT/AEST)</SelectItem>
                    <SelectItem value="Australia/Melbourne">Melbourne (AEDT/AEST)</SelectItem>
                    <SelectItem value="Australia/Perth">Perth (AWST)</SelectItem>
                    <SelectItem value="Pacific/Auckland">Auckland (NZDT/NZST)</SelectItem>
                    <SelectItem value="America/Toronto">Toronto (ET)</SelectItem>
                    <SelectItem value="America/Vancouver">Vancouver (PT)</SelectItem>
                    <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                    <SelectItem value="America/Mexico_City">Mexico City (CST)</SelectItem>
                    <SelectItem value="Africa/Cairo">Cairo (EET)</SelectItem>
                    <SelectItem value="Africa/Johannesburg">Johannesburg (SAST)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">
                  All timestamps in the exported CSV will be displayed in the selected timezone.
                </div>
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
                  <span>Export scope:</span>
                  <Badge variant="outline">
                    {exportScope === 'all' ? 'All logs' : 
                     exportScope === 'filtered' ? 'Current filters' : 
                     'Custom filters'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Fields to include:</span>
                  <Badge variant="outline">
                    {selectedFields.length} fields
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Timezone:</span>
                  <Badge variant="outline">{timezone}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Export format:</span>
                  <Badge variant="outline">CSV</Badge>
                </div>
                {getActiveFiltersDescription().length > 0 && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      <strong>Active filters:</strong> {getActiveFiltersDescription().join(', ')}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
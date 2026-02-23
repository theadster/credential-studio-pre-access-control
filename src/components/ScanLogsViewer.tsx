/**
 * ScanLogsViewer Component
 * 
 * A component for viewing and filtering scan logs from mobile devices including:
 * - Filterable log table
 * - Device/operator/date filters
 * - Export button
 * - Result (approved/denied) filter
 * 
 * @see .kiro/specs/mobile-access-control/design.md
 * @see Requirements 10.3, 10.4
 */

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Search, 
  Download, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Smartphone,
  User,
  Calendar,
  QrCode,
  Shield,
  Trash2
} from 'lucide-react';
import { useSweetAlert } from '@/hooks/useSweetAlert';
import { ConfigErrorBanner } from '@/components/ui/ConfigErrorBanner';
import ScanLogsDeleteDialog from '@/components/ScanLogsDeleteDialog';

interface ScanLog {
  id: string;
  localId: string;
  attendeeId: string | null;
  barcodeScanned: string;
  result: 'approved' | 'denied';
  denialReason: string | null;
  profileId: string | null;
  profileVersion: number | null;
  deviceId: string;
  operatorId: string;
  scannedAt: string;
  uploadedAt: string | null;
  createdAt: string;
  // Snapshot fields - stored at scan time to avoid N+1 attendee lookups
  attendeeFirstName: string | null;
  attendeeLastName: string | null;
  attendeePhotoUrl: string | null;
}

interface Pagination {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface Filters {
  deviceId: string;
  operatorId: string;
  result: string;
  profileId: string;
  dateFrom: string;
  dateTo: string;
}

const DEFAULT_FILTERS: Filters = {
  deviceId: '',
  operatorId: '',
  result: 'all',
  profileId: '',
  dateFrom: '',
  dateTo: '',
};

export default function ScanLogsViewer() {
  const { success, error: showError } = useSweetAlert();
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [configError, setConfigError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    total: 0,
    limit: 50,
    offset: 0,
    hasMore: false,
  });
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [profiles, setProfiles] = useState<{ id: string; name: string }[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, string>>({});
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  // Load profiles and users for filter dropdown and name mapping
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const response = await fetch('/api/approval-profiles');
        if (!response.ok) {
          console.error('Failed to load profiles:', response.status, response.statusText);
          return;
        }
        const data = await response.json();
        const profileList = (data.data || []).map((p: any) => ({ id: p.$id, name: p.name }));
        setProfiles(profileList);
        // Create profile map for quick lookup
        const map: Record<string, string> = {};
        profileList.forEach((p: { id: string; name: string }) => {
          map[p.id] = p.name;
        });
        setProfileMap(map);
      } catch (err) {
        console.error('Error loading profiles:', err);
      }
    };
    
    const loadUsers = async () => {
      try {
        const response = await fetch('/api/users');
        if (!response.ok) {
          console.error('Failed to load users:', response.status, response.statusText);
          return;
        }
        const data = await response.json();
        const users = data.users || [];
        const map: Record<string, string> = {};
        users.forEach((user: any) => {
          // Map both the profile ID and the auth userId to the name
          // operatorId could be either the auth userId or the profile id
          if (user.userId) {
            map[user.userId] = user.name || user.email || user.userId;
          }
          if (user.id) {
            map[user.id] = user.name || user.email || user.id;
          }
        });
        setUserMap(map);
      } catch (err) {
        console.error('Error loading users:', err);
      }
    };
    
    loadProfiles();
    loadUsers();
  }, []);

  // Load scan logs
  const loadLogs = useCallback(async (offset = 0, currentFilters: Filters = DEFAULT_FILTERS) => {
    setLoading(true);
    setConfigError(null);
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      params.set('offset', String(offset));
      
      if (currentFilters.deviceId) params.set('deviceId', currentFilters.deviceId);
      if (currentFilters.operatorId) params.set('operatorId', currentFilters.operatorId);
      if (currentFilters.result && currentFilters.result !== 'all') params.set('result', currentFilters.result);
      if (currentFilters.profileId) params.set('profileId', currentFilters.profileId);
      if (currentFilters.dateFrom) params.set('dateFrom', currentFilters.dateFrom);
      if (currentFilters.dateTo) params.set('dateTo', currentFilters.dateTo);

      const response = await fetch(`/api/scan-logs?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data?.logs || []);
        setPagination(data.data?.pagination || { total: 0, limit: 50, offset: 0, hasMore: false });
      } else {
        const errorData = await response.json();
        if (errorData.error?.code === 'CONFIG_ERROR') {
          setConfigError(errorData.error.message || 'Scan logs table is not configured.');
        } else {
          showError('Error', errorData.error?.message || 'Failed to load scan logs');
        }
      }
    } catch (err) {
      console.error('Error loading scan logs:', err);
      showError('Error', 'Failed to load scan logs');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    loadLogs(0, filters);
  }, [loadLogs, filters]);

  // Handle filter change
  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Apply filters
  const applyFilters = () => {
    loadLogs(0, filters);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  // Handle export
  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (filters.deviceId) params.set('deviceId', filters.deviceId);
      if (filters.operatorId) params.set('operatorId', filters.operatorId);
      if (filters.result && filters.result !== 'all') params.set('result', filters.result);
      if (filters.profileId) params.set('profileId', filters.profileId);
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.set('dateTo', filters.dateTo);

      const response = await fetch(`/api/scan-logs/export?${params}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scan-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        success('Success', 'Scan logs exported successfully');
      } else {
        const errorData = await response.json();
        showError('Error', errorData.error?.message || 'Failed to export scan logs');
      }
    } catch (err) {
      console.error('Error exporting scan logs:', err);
      showError('Error', 'Failed to export scan logs');
    } finally {
      setExporting(false);
    }
  };

  // Check if any filters are active
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'result') return value !== 'all' && value !== '';
    return value !== '';
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Scan Logs
            </CardTitle>
            <CardDescription>
              View and export badge scan activity from mobile devices
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => loadLogs(pagination.offset, filters)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={handleExport} disabled={exporting || loading}>
              {exporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </>
              )}
            </Button>
            <ScanLogsDeleteDialog 
              profiles={profiles} 
              onDeleteSuccess={() => loadLogs(0, filters)}
            >
              <Button variant="outline" className="text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Logs
              </Button>
            </ScanLogsDeleteDialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {configError && (
          <ConfigErrorBanner
            title="Scan Logs Unavailable"
            message={configError}
          />
        )}
        {/* Filters */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters} className="mb-4">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge variant="secondary" className="ml-2">Active</Badge>
                )}
                {showFilters ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear Filters
              </Button>
            )}
          </div>
          
          <CollapsibleContent className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="filter-result" className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Result
                </Label>
                <Select
                  value={filters.result}
                  onValueChange={(value) => handleFilterChange('result', value)}
                >
                  <SelectTrigger id="filter-result">
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Results</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="denied">Denied</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-device" className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  Device ID
                </Label>
                <Input
                  id="filter-device"
                  value={filters.deviceId}
                  onChange={(e) => handleFilterChange('deviceId', e.target.value)}
                  placeholder="Enter device ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-operator" className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Operator
                </Label>
                <Input
                  id="filter-operator"
                  value={filters.operatorId}
                  onChange={(e) => handleFilterChange('operatorId', e.target.value)}
                  placeholder="Enter operator name or ID"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-profile" className="flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Profile
                </Label>
                <Select
                  value={filters.profileId || 'all'}
                  onValueChange={(value) => handleFilterChange('profileId', value === 'all' ? '' : value)}
                >
                  <SelectTrigger id="filter-profile">
                    <SelectValue placeholder="All Profiles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Profiles</SelectItem>
                    {profiles.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-date-from" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  From Date
                </Label>
                <Input
                  id="filter-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-date-to" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  To Date
                </Label>
                <Input
                  id="filter-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button onClick={applyFilters} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                Apply Filters
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            Showing {logs.length} of {pagination.total} scan logs
          </p>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading scan logs...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <QrCode className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
            <p>No scan logs found</p>
            {hasActiveFilters && (
              <p className="text-sm mt-1">Try adjusting your filters</p>
            )}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Time</TableHead>
                  <TableHead className="w-[100px]">Barcode</TableHead>
                  <TableHead>Attendee</TableHead>
                  <TableHead className="text-center w-[100px]">Result</TableHead>
                  <TableHead>Denial Reason</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Operator</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const attendeeName = log.attendeeFirstName || log.attendeeLastName
                    ? `${log.attendeeFirstName ?? ''} ${log.attendeeLastName ?? ''}`.trim()
                    : null;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="text-sm">
                          <div>{new Date(log.scannedAt).toLocaleDateString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(log.scannedAt).toLocaleTimeString()}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell 
                        className="font-mono text-xs max-w-[100px] truncate" 
                        title={log.barcodeScanned || undefined}
                      >
                        {log.barcodeScanned && log.barcodeScanned.length > 10 
                          ? log.barcodeScanned.substring(0, 10) + '…' 
                          : log.barcodeScanned || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {attendeeName || (log.attendeeId ? <span className="text-muted-foreground italic">Unknown</span> : '-')}
                      </TableCell>
                      <TableCell className="text-center">
                        {log.result === 'approved' ? (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Approved
                          </Badge>
                        ) : log.result === 'denied' ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Denied
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Unknown</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                        {log.denialReason || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.profileId ? (profileMap[log.profileId] || <span className="text-muted-foreground italic">Unknown</span>) : '-'}
                      </TableCell>
                      <TableCell className="text-sm" title={log.operatorId || undefined}>
                        {log.operatorId ? (userMap[log.operatorId] || (log.operatorId.length > 12 ? log.operatorId.substring(0, 12) + '...' : log.operatorId)) : '-'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Page {Math.floor(pagination.offset / pagination.limit) + 1} of{' '}
                {Math.ceil(pagination.total / pagination.limit)}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLogs(Math.max(0, pagination.offset - pagination.limit), filters)}
                  disabled={pagination.offset === 0 || loading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadLogs(pagination.offset + pagination.limit, filters)}
                  disabled={!pagination.hasMore || loading}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
